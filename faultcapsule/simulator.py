"""Deterministic incident simulator: fixtures loading + inspection execution."""
from __future__ import annotations

import json
from pathlib import Path

from .schemas import IncidentFixture, InspectionOutcome

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def load_fixtures() -> dict[str, IncidentFixture]:
    """INC-* fixtures form the frozen benchmark set; DEMO-* fixtures are
    demo-only scenarios (excluded from the benchmark to keep published
    numbers reproducible)."""
    fixtures = {}
    for path in sorted(FIXTURES_DIR.glob("*.json")):
        fixture = IncidentFixture.model_validate(json.loads(path.read_text()))
        fixtures[fixture.id] = fixture
    return fixtures


def run_inspection(fixture: IncidentFixture, action_id: str) -> InspectionOutcome:
    """Execute an inspection action. Deterministic: same input, same output."""
    if action_id in {a.id for a in fixture.forbidden_actions}:
        raise ValueError(f"Forbidden action requested: {action_id}")
    if action_id not in fixture.inspections:
        # escalate_to_human and unknown ids yield no new evidence
        return InspectionOutcome(action_id=action_id, summary="No inspection performed (escalation or terminal action).")
    return fixture.inspections[action_id]
