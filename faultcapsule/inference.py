"""InferenceAdapter: one stable interface, three backends (OpenRouter, Google AI
Studio, deterministic mock). Strict JSON output, one repair retry."""
from __future__ import annotations

import json
import os
import re
import time

from dotenv import load_dotenv
from pydantic import ValidationError

load_dotenv()

from .compiler import _relevance, _tokens, approx_token_count
from .network import GUARD
from .schemas import ActionSpec, DecisionOutput, EvidenceRecord, RunMetrics

SYSTEM_PROMPT = """You are Fault Capsule, a maintenance decision assistant for railway point machines.
You will receive an evidence capsule and a list of allowed actions.
Your job: pick the single next SAFE inspection action, or abstain.

Rules:
- Choose action_id ONLY from the allowed actions list. Never invent actions. Never pick a forbidden action.
- Cite the evidence ids that justify your choice in cited_evidence_ids (2-5 ids that appear in the capsule).
- Decision policy: if the evidence points to a plausible fault mechanism, choose the allowed inspection that best VERIFIES that mechanism. Inspections are safe, non-invasive information-gathering steps - you do not need certainty to inspect.
- Once an inspection has CONFIRMED a fault mechanism consistent with the alarms (see inspection-kind evidence), STOP investigating: do not repeat inspections and do not run further inspections to rule out alternatives. Return status "decision" with action_id "escalate_to_human" so the repair is handed to the maintenance team. Escalation is a normal, positive decision - NOT an abstention.
- Abstain (status "insufficient_evidence", action_id null) ONLY when the evidence genuinely does not point to any allowed action - e.g. an undocumented failure mode with no matching guidance.
- Safety rules in the capsule override everything else.

Respond with ONLY a JSON object, no markdown, no prose:
{"status": "decision" | "insufficient_evidence", "action_id": "<id or null>", "rationale": "<one short paragraph>", "cited_evidence_ids": ["E1", ...], "confidence": 0.0-1.0}"""

_JSON_RE = re.compile(r"\{.*\}", re.DOTALL)


def extract_json(text: str) -> dict:
    match = _JSON_RE.search(text)
    if not match:
        raise ValueError(f"no JSON object in model output: {text[:200]!r}")
    return json.loads(match.group(0))


class InferenceAdapter:
    provider = "base"

    def __init__(self, model: str) -> None:
        self.model = model

    def _complete(self, messages: list[dict]) -> str:
        raise NotImplementedError

    def infer(self, context: str) -> tuple[DecisionOutput, RunMetrics]:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": context + "\n\nDecide now. JSON only."},
        ]
        start = time.monotonic()
        attempts = 0
        last_err = ""
        raw = ""
        while attempts < 2:  # one deterministic repair retry
            attempts += 1
            raw = self._complete(messages)
            try:
                decision = DecisionOutput.model_validate(extract_json(raw))
                metrics = RunMetrics(
                    provider=self.provider,
                    model=self.model,
                    input_tokens=sum(approx_token_count(m["content"]) for m in messages),
                    output_tokens=approx_token_count(raw),
                    latency_ms=int((time.monotonic() - start) * 1000),
                    attempts=attempts,
                    schema_ok=True,
                )
                return decision, metrics
            except (ValueError, ValidationError, json.JSONDecodeError) as err:
                last_err = str(err)
                messages.append({"role": "assistant", "content": raw})
                messages.append({
                    "role": "user",
                    "content": f"Your previous output was invalid ({last_err[:200]}). "
                    "Reply again with ONLY the JSON object matching the required schema.",
                })
        # explicit failure: schema-invalid, surfaced (never silently retried elsewhere)
        decision = DecisionOutput(status="insufficient_evidence", rationale=f"SCHEMA_FAILURE: {last_err[:200]}")
        metrics = RunMetrics(
            provider=self.provider, model=self.model,
            latency_ms=int((time.monotonic() - start) * 1000),
            attempts=attempts, schema_ok=False,
            output_tokens=approx_token_count(raw),
        )
        return decision, metrics


class OpenAICompatAdapter(InferenceAdapter):
    """Any OpenAI-compatible chat endpoint (OpenRouter, AI Studio compat mode)."""

    def __init__(self, model: str, base_url: str, api_key: str, provider: str) -> None:
        super().__init__(model)
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.provider = provider

    def _complete(self, messages: list[dict]) -> str:
        with GUARD.client() as client:
            resp = client.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"model": self.model, "messages": messages, "temperature": 0.1, "max_tokens": 600},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]


class OllamaAdapter(InferenceAdapter):
    """Local on-device inference. localhost is not outbound traffic, so this
    backend works with Network OFF — the edge deployment path."""

    provider = "ollama-local"

    def __init__(self, model: str, base_url: str = "http://localhost:11434") -> None:
        super().__init__(model)
        self.base_url = base_url.rstrip("/")
        # Gemma 4 thinking mode: better reasoning, slower. Off by default for demo latency.
        self.think = os.environ.get("GEMMA_THINKING", "0") == "1"

    def _complete(self, messages: list[dict]) -> str:
        import httpx

        resp = httpx.post(
            f"{self.base_url}/api/chat",
            json={
                "model": self.model, "messages": messages, "stream": False,
                "think": self.think,
                "options": {"temperature": 0.1, "num_predict": 900, "num_ctx": 8192},
            },
            timeout=600.0,
        )
        resp.raise_for_status()
        return resp.json()["message"]["content"]

    @staticmethod
    def available(model: str) -> bool:
        import httpx

        try:
            resp = httpx.get("http://localhost:11434/api/tags", timeout=2.0)
            names = [m["name"] for m in resp.json().get("models", [])]
            return any(n == model or n.startswith(model + ":") for n in names)
        except Exception:
            return False


class MockAdapter(InferenceAdapter):
    """Deterministic, label-blind heuristic. Lets the whole pipeline run with
    zero network and stands in until the real model is wired."""

    provider = "mock"

    def __init__(self) -> None:
        super().__init__(model="mock-heuristic")

    def _pick(self, context: str) -> DecisionOutput:
        # Parse evidence lines and action lines back out of the context block.
        evidence = re.findall(r"^- ([EW]\d+) \((\w+), \w+\)(?: \[[^\]]*\])?: (.+)$", context, re.MULTILINE)
        actions = re.findall(r"^- ([a-z0-9_]+): (.+)$", context, re.MULTILINE)
        signal = " ".join(s for _, kind, s in evidence if kind in ("alarm", "inspection", "telemetry", "manual"))
        anchor = _tokens(signal)
        # After an inspection produced findings, the safe next step is handover.
        if any(kind == "inspection" for _, kind, _ in evidence):
            cited = [eid for eid, kind, _ in evidence if kind in ("inspection", "safety_rule")][:3]
            return DecisionOutput(status="decision", action_id="escalate_to_human", rationale="Mock heuristic: inspection findings present, hand over to maintenance.", cited_evidence_ids=cited, confidence=0.6)
        best, best_score = None, -1
        for action_id, label in actions:
            if action_id == "escalate_to_human":
                continue
            score = len(_tokens(label) & anchor)
            if score > best_score:
                best, best_score = action_id, score
        cited = [eid for eid, kind, _ in evidence if kind in ("alarm", "manual")][:3]
        if best is None or best_score < 1:
            return DecisionOutput(status="insufficient_evidence", rationale="Mock: no action matches the evidence signal.", cited_evidence_ids=cited, confidence=0.3)
        return DecisionOutput(status="decision", action_id=best, rationale="Mock heuristic: highest keyword overlap between action and alarm/manual evidence.", cited_evidence_ids=cited, confidence=0.55)

    def _complete(self, messages: list[dict]) -> str:
        return self._pick(messages[-1]["content"] if len(messages) == 2 else messages[1]["content"]).model_dump_json()


def make_adapter() -> InferenceAdapter:
    """Provider selection. GEMMA_PROVIDER forces one of: openrouter, aistudio,
    ollama, mock. Otherwise: OpenRouter > AI Studio > local Ollama > mock."""
    model = os.environ.get("GEMMA_MODEL", "google/gemma-4-E2B-it")
    ollama_model = os.environ.get("OLLAMA_MODEL", "gemma4:e2b")
    forced = os.environ.get("GEMMA_PROVIDER", "").lower()

    if forced == "mock":
        return MockAdapter()
    if forced == "ollama":
        return OllamaAdapter(ollama_model)
    if (forced in ("", "openrouter")) and (key := os.environ.get("OPENROUTER_API_KEY")):
        return OpenAICompatAdapter(model, "https://openrouter.ai/api/v1", key, "openrouter")
    if (forced in ("", "aistudio")) and (key := os.environ.get("GOOGLE_API_KEY")):
        return OpenAICompatAdapter(
            model.removeprefix("google/"),
            "https://generativelanguage.googleapis.com/v1beta/openai",
            key,
            "aistudio",
        )
    if forced == "" and OllamaAdapter.available(ollama_model):
        return OllamaAdapter(ollama_model)
    return MockAdapter()
