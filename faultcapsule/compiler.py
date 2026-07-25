"""Local Evidence Compiler.

Deterministic, label-blind, LLM-free. Turns an incident's raw evidence pool
(plus any inspection observations) into a compact, ranked, token-budgeted,
versioned IncidentCapsule.
"""
from __future__ import annotations

import re

from .schemas import (
    ActionSpec,
    EvidenceKind,
    EvidenceRecord,
    IncidentCapsule,
    IncidentFixture,
    InspectionOutcome,
)

TOKEN_BUDGET = 1600  # approx tokens of evidence text allowed into the capsule

# Rank weight per evidence kind: safety rules and fresh signals first.
KIND_PRIORITY = {
    EvidenceKind.safety_rule: 0,
    EvidenceKind.alarm: 1,
    EvidenceKind.inspection: 1,
    EvidenceKind.telemetry: 2,
    EvidenceKind.maintenance: 3,
    EvidenceKind.topology: 4,
    EvidenceKind.manual: 5,
    EvidenceKind.web: 6,
}

_WORD = re.compile(r"[a-z0-9\-]{3,}")


def _tokens(text: str) -> set[str]:
    return set(_WORD.findall(text.lower()))


def approx_token_count(text: str) -> int:
    return max(1, len(text) // 4)


def _relevance(record: EvidenceRecord, anchor_terms: set[str]) -> int:
    """Keyword overlap between a record and the incident's alarm/description terms."""
    return len(_tokens(record.summary) & anchor_terms)


def compile_incident(
    fixture: IncidentFixture,
    observations: list[InspectionOutcome] | None = None,
    extra_evidence: list[EvidenceRecord] | None = None,
    parent_version: int | None = None,
    token_budget: int = TOKEN_BUDGET,
) -> IncidentCapsule:
    observations = observations or []
    extra_evidence = extra_evidence or []

    pool: list[EvidenceRecord] = list(fixture.evidence)
    for obs in observations:
        pool.extend(obs.new_evidence)
    pool.extend(extra_evidence)

    # Anchor terms = current alarms + incident description (what is happening NOW).
    anchor = _tokens(fixture.description)
    for rec in pool:
        if rec.kind == EvidenceKind.alarm:
            anchor |= _tokens(rec.summary)

    # Deterministic ranking: kind priority, then relevance desc, then recency
    # desc (missing timestamp sorts last), then id for total ordering.
    def sort_key(rec: EvidenceRecord):
        return (
            KIND_PRIORITY.get(rec.kind, 9),
            -_relevance(rec, anchor),
            rec.timestamp or "",
            rec.id,
        )

    ranked = sorted(pool, key=sort_key)

    kept: list[EvidenceRecord] = []
    dropped: list[str] = []
    used = 0
    for rec in ranked:
        cost = approx_token_count(rec.summary)
        if used + cost <= token_budget or rec.kind == EvidenceKind.safety_rule:
            kept.append(rec)
            used += cost
        else:
            dropped.append(rec.id)

    version = (parent_version or 0) + 1
    forbidden = ", ".join(f"{a.id} ({a.label})" for a in fixture.forbidden_actions)

    return IncidentCapsule(
        incident_id=fixture.id,
        version=version,
        parent_version=parent_version,
        headline=f"{fixture.title} — {fixture.asset}",
        evidence=kept,
        allowed_actions=list(fixture.allowed_actions),
        forbidden_note=f"FORBIDDEN (never select, never suggest): {forbidden}",
        token_budget=token_budget,
        approx_tokens=used,
        dropped_evidence_ids=dropped,
        performed_actions=[obs.action_id for obs in observations],
    )


def capsule_to_prompt(capsule: IncidentCapsule) -> str:
    """Render a capsule as the model-facing context block."""
    lines = [
        f"INCIDENT: {capsule.headline}",
        f"CAPSULE v{capsule.version}"
        + (f" (parent v{capsule.parent_version})" if capsule.parent_version else ""),
        "",
        "EVIDENCE (cite by id):",
    ]
    for rec in capsule.evidence:
        ts = f" [{rec.timestamp}]" if rec.timestamp else ""
        lines.append(f"- {rec.id} ({rec.kind.value}, {rec.trust.value}){ts}: {rec.summary}")
    lines += [
        "",
        "ALLOWED ACTIONS (choose exactly one action_id, or abstain):",
    ]
    for act in capsule.allowed_actions:
        done = " [ALREADY PERFORMED - do not repeat]" if act.id in capsule.performed_actions else ""
        lines.append(f"- {act.id}: {act.label}{done}")
    lines += ["", capsule.forbidden_note]
    return "\n".join(lines)
