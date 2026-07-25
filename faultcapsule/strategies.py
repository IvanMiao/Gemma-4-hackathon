"""Benchmark input strategies. All LLM strategies share the same model, output
schema and budget — only the context construction differs. This is the Capsule
value proof: same small model, better context, better decisions."""
from __future__ import annotations

from rank_bm25 import BM25Okapi

from .compiler import TOKEN_BUDGET, _tokens, approx_token_count, capsule_to_prompt, compile_incident
from .schemas import DecisionOutput, EvidenceKind, IncidentFixture, InspectionOutcome

STRATEGIES = ["rule", "raw", "bm25", "capsule"]


def _actions_block(fixture: IncidentFixture) -> str:
    lines = ["", "ALLOWED ACTIONS (choose exactly one action_id, or abstain):"]
    lines += [f"- {a.id}: {a.label}" for a in fixture.allowed_actions]
    forbidden = ", ".join(f"{a.id} ({a.label})" for a in fixture.forbidden_actions)
    lines += ["", f"FORBIDDEN (never select, never suggest): {forbidden}"]
    return "\n".join(lines)


def _pool(fixture: IncidentFixture, observations: list[InspectionOutcome]):
    pool = list(fixture.evidence)
    for obs in observations:
        pool.extend(obs.new_evidence)
    return pool


def build_raw_context(fixture: IncidentFixture, observations: list[InspectionOutcome]) -> str:
    """Everything, unranked, in storage order — truncated only by the budget."""
    lines = [f"INCIDENT: {fixture.title} — {fixture.asset}", "", "EVIDENCE (cite by id):"]
    used = 0
    for rec in _pool(fixture, observations):
        cost = approx_token_count(rec.summary)
        if used + cost > TOKEN_BUDGET:
            break
        used += cost
        ts = f" [{rec.timestamp}]" if rec.timestamp else ""
        lines.append(f"- {rec.id} ({rec.kind.value}, {rec.trust.value}){ts}: {rec.summary}")
    return "\n".join(lines) + _actions_block(fixture)


def build_bm25_context(fixture: IncidentFixture, observations: list[InspectionOutcome]) -> str:
    """Classic retrieval: BM25 against the alarm text, top-k under budget."""
    pool = _pool(fixture, observations)
    corpus = [sorted(_tokens(rec.summary)) for rec in pool]
    query_text = fixture.description + " " + " ".join(
        rec.summary for rec in pool if rec.kind == EvidenceKind.alarm
    )
    scores = BM25Okapi(corpus).get_scores(sorted(_tokens(query_text)))
    ranked = sorted(zip(pool, scores), key=lambda pair: (-pair[1], pair[0].id))
    lines = [f"INCIDENT: {fixture.title} — {fixture.asset}", "", "EVIDENCE (cite by id):"]
    used = 0
    for rec, _score in ranked:
        cost = approx_token_count(rec.summary)
        if used + cost > TOKEN_BUDGET:
            continue
        used += cost
        ts = f" [{rec.timestamp}]" if rec.timestamp else ""
        lines.append(f"- {rec.id} ({rec.kind.value}, {rec.trust.value}){ts}: {rec.summary}")
    return "\n".join(lines) + _actions_block(fixture)


def build_capsule_context(fixture: IncidentFixture, observations: list[InspectionOutcome]) -> str:
    parent = len(observations) or None  # v1 for round 1, v2 for round 2
    capsule = compile_incident(fixture, observations=observations, parent_version=parent)
    return capsule_to_prompt(capsule)


def rule_baseline(fixture: IncidentFixture, observations: list[InspectionOutcome]) -> DecisionOutput:
    """No-LLM deterministic baseline: always run the first not-yet-done allowed
    inspection in listed order; escalate once all inspections are done."""
    done = {obs.action_id for obs in observations}
    for act in fixture.allowed_actions:
        if act.kind == "inspection" and act.id in fixture.inspections and act.id not in done:
            return DecisionOutput(status="decision", action_id=act.id, rationale="Rule baseline: first pending inspection in list order.", cited_evidence_ids=[], confidence=1.0)
    return DecisionOutput(status="decision", action_id="escalate_to_human", rationale="Rule baseline: all inspections done.", cited_evidence_ids=[], confidence=1.0)


CONTEXT_BUILDERS = {
    "raw": build_raw_context,
    "bm25": build_bm25_context,
    "capsule": build_capsule_context,
}
