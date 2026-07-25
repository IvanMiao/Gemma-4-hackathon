"""Translation layer between the backend schemas and the React dashboard's
domain contract (src/types/domain.ts)."""
from __future__ import annotations

from .schemas import (
    ActionSpec,
    DecisionOutput,
    EvidenceKind,
    EvidenceRecord,
    IncidentCapsule,
    IncidentFixture,
    InspectionOutcome,
    RunMetrics,
    TrustClass,
)

_KIND_MAP = {
    EvidenceKind.safety_rule: "manual",
    EvidenceKind.web: "public",
}
_TRUST_MAP = {
    TrustClass.site: "local-verified",
    TrustClass.vendor: "authoritative-public",
    TrustClass.public: "untrusted",
}
_TONE_BY_KIND = {
    EvidenceKind.alarm: "critical",
    EvidenceKind.maintenance: "warning",
    EvidenceKind.inspection: "info",
}


def evidence_to_ui(rec: EvidenceRecord) -> dict:
    return {
        "id": rec.id,
        "kind": _KIND_MAP.get(rec.kind, rec.kind.value),
        "title": f"{rec.kind.value.replace('_', ' ').title()} — {rec.source}",
        "detail": rec.summary,
        "timestamp": rec.timestamp,
        "source": rec.source,
        "trust": _TRUST_MAP[rec.trust],
        "url": rec.source if rec.source.startswith("http") else None,
    }


def action_to_ui(act: ActionSpec) -> dict:
    return {
        "id": act.id,
        "label": act.label,
        "description": act.label,
        "requiresConfirmation": act.kind == "escalate",
    }


def capsule_to_ui(capsule: IncidentCapsule, created_at: str) -> dict:
    return {
        "id": f"{capsule.incident_id}-v{capsule.version}",
        "incidentId": capsule.incident_id,
        "version": capsule.version,
        "parentVersion": f"{capsule.incident_id}-v{capsule.parent_version}" if capsule.parent_version else None,
        "createdAt": created_at,
        "summary": capsule.headline,
        "evidence": [evidence_to_ui(rec) for rec in capsule.evidence],
        "allowedActions": [action_to_ui(act) for act in capsule.allowed_actions],
        "forbiddenActions": [n.split(" (")[0] for n in capsule.forbidden_note.removeprefix(
            "FORBIDDEN (never select, never suggest): ").split(", ")],
        "missingInformation": capsule.dropped_evidence_ids,
        "tokenBudget": {"used": capsule.approx_tokens, "maximum": capsule.token_budget},
    }


def fixture_to_ui(fixture: IncidentFixture, capsule_v1: IncidentCapsule) -> dict:
    timeline = [
        {
            "id": rec.id,
            "time": rec.timestamp,
            "label": rec.kind.value.replace("_", " ").title(),
            "detail": rec.summary[:140],
            "tone": _TONE_BY_KIND.get(rec.kind, "neutral"),
        }
        for rec in sorted(fixture.evidence, key=lambda r: r.timestamp or "")
        if rec.timestamp
    ]
    return {
        "id": fixture.id,
        "assetId": fixture.asset.split(",")[0].replace("Point machine ", ""),
        "assetType": "point-machine",
        "location": fixture.asset.split(",")[-1].strip(),
        "severity": "high",
        "headline": fixture.title,
        "description": fixture.description,
        "startedAt": fixture.reported,
        "timeline": timeline,
        "capsuleV1": capsule_to_ui(capsule_v1, fixture.reported),
    }


def decision_to_ui(decision: DecisionOutput, capsule: IncidentCapsule, metrics: RunMetrics) -> dict:
    abstained = decision.status != "decision"
    labels = {a.id: a.label for a in capsule.allowed_actions}
    return {
        "decision": {
            "actionId": decision.action_id or "insufficient_evidence",
            "actionLabel": "Abstained — insufficient evidence" if abstained else labels.get(decision.action_id, decision.action_id),
            "confidence": decision.confidence,
            "rationale": decision.rationale,
            "citedEvidenceIds": decision.cited_evidence_ids,
            "safetyNote": "Forbidden actions excluded from this decision: "
            + capsule.forbidden_note.removeprefix("FORBIDDEN (never select, never suggest): "),
        },
        "metrics": {
            "runtime": metrics.provider,
            "model": metrics.model,
            "quantization": "Q4_K_M" if "GGUF" in metrics.model else "none",
            "device": "local",
            "timeToFirstTokenMs": metrics.latency_ms,
            "totalLatencyMs": metrics.latency_ms,
            "peakMemoryGb": 0.0,
            "inputTokens": metrics.input_tokens,
            "outputTokens": metrics.output_tokens,
        },
    }


def inspection_to_ui(obs: InspectionOutcome, next_capsule: IncidentCapsule, observed_at: str) -> dict:
    evidence = obs.new_evidence[0] if obs.new_evidence else None
    return {
        "inspection": {
            "id": f"insp-{obs.action_id}",
            "actionId": obs.action_id,
            "finding": obs.summary,
            "observedAt": (evidence.timestamp if evidence else None) or observed_at,
            "evidence": evidence_to_ui(evidence) if evidence else None,
        },
        "nextCapsule": capsule_to_ui(next_capsule, observed_at),
    }
