# Fault Capsule

**An auditable maintenance decision assistant for railway point machines, powered by Gemma 4.**

A deterministic, label-blind *Local Evidence Compiler* turns scattered incident data (telemetry, alarms, maintenance history, topology, manuals, safety rules) into a compact, versioned, token-budgeted **Incident Capsule**. Gemma 4 then performs constrained reasoning over the capsule: it picks the single next *safe* inspection action from a whitelist, cites its evidence, or explicitly abstains.

Built in one day at the **Paris Gemma 4 Hackathon** (July 25, 2026, 42 Paris).

```text
On-site incident data
  → deterministic Local Evidence Compiler
  → Incident Capsule V1
  → Gemma 4 constrained decision (action from whitelist + evidence citations)
  → deterministic inspection simulator
  → Incident Capsule V2
  → next decision, or stop and hand over to a human
```

## Why

After an industrial failure, maintenance staff reconstruct "what is going on" across telemetry, alarm logs, work orders, asset topology, manuals and safety rules. More context is not better: a long raw history buries the one recent change that matters. Fault Capsule shows that a **small language model + engineered context beats raw context dumps** — with every recommendation auditable: each decision cites evidence IDs that resolve in the exact capsule version the model saw.

## Quickstart

Requires [uv](https://docs.astral.sh/uv/) and Python ≥ 3.12.

```bash
uv sync

# Demo UI (starts in Network OFF with a deterministic mock adapter)
uv run uvicorn faultcapsule.app:app --port 8080
# open http://localhost:8080

# Benchmark: 6 incidents × 4 strategies × 2 rounds, offline
uv run python -m faultcapsule.benchmark --mock
```

### Using Gemma 4 (API)

```bash
cp .env.example .env   # add OPENROUTER_API_KEY or GOOGLE_API_KEY
uv run python -m faultcapsule.benchmark --network-on
```

Provider selection: `OPENROUTER_API_KEY` → OpenRouter, else `GOOGLE_API_KEY` → Google AI Studio (OpenAI-compat endpoint), else deterministic mock. Model set by `GEMMA_MODEL` (default `google/gemma-4-E2B-it`). The adapter interface is backend-agnostic so a local runtime (Ollama / llama.cpp) drops in without touching the rest of the system.

## Architecture

| Module | Role |
|---|---|
| `faultcapsule/schemas.py` | Frozen Pydantic contracts shared by all modules |
| `faultcapsule/fixtures/` | 6 synthetic railway point-machine incidents with scorer-only labels |
| `faultcapsule/compiler.py` | Deterministic, label-blind, LLM-free evidence compiler → versioned Capsules |
| `faultcapsule/simulator.py` | Deterministic two-round inspection simulator |
| `faultcapsule/inference.py` | `InferenceAdapter` (OpenRouter / AI Studio / mock), strict JSON + 1 repair retry |
| `faultcapsule/strategies.py` | Benchmark inputs: rule baseline, raw dump, BM25 retrieval, Capsule |
| `faultcapsule/benchmark.py` | Scoring: action accuracy, unsafe rate, citation validity, schema failures, abstention, latency/tokens |
| `faultcapsule/network.py` | Network guard: startup default OFF, blocks + counts every outbound request |
| `faultcapsule/serpapi_plugin.py` | Optional SerpAPI evidence add-on (network ON + opt-in + key), minimized queries, trust-classed results |
| `faultcapsule/app.py` + `web/` | FastAPI demo UI: capsule view, decision, citations, metrics, network state |

## Safety model

- Actions come only from a per-incident whitelist; forbidden actions are never executable and choosing one is scored *unsafe*.
- The compiler never reads root-cause labels and never calls a model.
- Safety rules are always injected into the capsule, above the token budget.
- The model must cite evidence IDs that resolve in its capsule, and may abstain (`insufficient_evidence`) instead of guessing.
- Startup default is **Network OFF**: a configured API key does not bypass the transport-level guard, and the UI shows a live outbound-request counter.
- Web evidence (SerpAPI add-on) is trust-classed `public`, injection-filtered, and clearly marked `UNTRUSTED PUBLIC SOURCE` inside the capsule.

This is a maintenance decision-support prototype, **not** a safety-certified controller.

## License

[MIT](LICENSE)
