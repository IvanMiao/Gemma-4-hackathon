"""Shared frozen schemas for Fault Capsule (contract between all modules)."""
from __future__ import annotations

from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field


class EvidenceKind(str, Enum):
    telemetry = "telemetry"
    alarm = "alarm"
    maintenance = "maintenance"
    topology = "topology"
    manual = "manual"
    safety_rule = "safety_rule"
    inspection = "inspection"
    web = "web"


class TrustClass(str, Enum):
    site = "site"          # local OT data
    vendor = "vendor"      # manufacturer docs
    public = "public"      # web-retrieved, untrusted until reviewed


class EvidenceRecord(BaseModel):
    id: str
    kind: EvidenceKind
    summary: str
    source: str
    timestamp: Optional[str] = None  # ISO 8601, incident-relative ordering
    trust: TrustClass = TrustClass.site


class ActionSpec(BaseModel):
    id: str
    label: str
    kind: Literal["inspection", "escalate"] = "inspection"


class InspectionOutcome(BaseModel):
    action_id: str
    summary: str
    new_evidence: list[EvidenceRecord] = Field(default_factory=list)


class ExpectedOutcome(BaseModel):
    """Scorer-only labels. The compiler and model must never read these."""
    root_cause: str
    expected_action_round1: str
    expected_action_round2: str
    unsafe_actions: list[str] = Field(default_factory=list)


class IncidentFixture(BaseModel):
    id: str
    title: str
    asset: str
    reported: str
    description: str
    evidence: list[EvidenceRecord]
    allowed_actions: list[ActionSpec]
    forbidden_actions: list[ActionSpec]
    inspections: dict[str, InspectionOutcome]
    labels: ExpectedOutcome


class IncidentCapsule(BaseModel):
    incident_id: str
    version: int
    parent_version: Optional[int] = None
    headline: str
    evidence: list[EvidenceRecord]
    allowed_actions: list[ActionSpec]
    forbidden_note: str
    token_budget: int
    approx_tokens: int
    dropped_evidence_ids: list[str] = Field(default_factory=list)


class DecisionOutput(BaseModel):
    """Strict model output schema."""
    status: Literal["decision", "insufficient_evidence"]
    action_id: Optional[str] = None
    rationale: str = ""
    cited_evidence_ids: list[str] = Field(default_factory=list)
    confidence: float = Field(0.5, ge=0.0, le=1.0)


class RunMetrics(BaseModel):
    provider: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: int = 0
    attempts: int = 1
    schema_ok: bool = True


class RoundScore(BaseModel):
    round: int
    strategy: str
    incident_id: str
    chosen_action: Optional[str]
    expected_action: str
    correct: bool
    unsafe: bool
    abstained: bool
    citations_valid: bool
    schema_ok: bool
    latency_ms: int
    input_tokens: int
    output_tokens: int


class InformationNeed(BaseModel):
    """Structured request Gemma may emit; the router minimizes what is sent out."""
    device_type: str
    public_error_code: Optional[str] = None
    question: str
