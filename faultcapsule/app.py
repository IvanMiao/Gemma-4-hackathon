"""Fault Capsule demo UI. Run: uv run uvicorn faultcapsule.app:app --port 8080"""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .compiler import capsule_to_prompt, compile_incident
from .inference import make_adapter
from .network import GUARD
from .schemas import InformationNeed, InspectionOutcome
from .serpapi_plugin import SerpApiProvider, offline_bulletin_fixture
from .simulator import load_fixtures, run_inspection
from .strategies import CONTEXT_BUILDERS

app = FastAPI(title="Fault Capsule")
FIXTURES = load_fixtures()
WEB_DIR = Path(__file__).parent / "web"

serp = SerpApiProvider()
serp_enabled = False  # user opt-in, independent from network mode


class NetworkReq(BaseModel):
    on: bool


class PluginReq(BaseModel):
    enabled: bool


class RunReq(BaseModel):
    incident_id: str
    strategy: str = "capsule"
    with_web_evidence: bool = False


@app.get("/")
def index():
    return FileResponse(WEB_DIR / "index.html")


@app.get("/api/state")
def state():
    adapter = make_adapter()
    return {
        "network_on": GUARD.network_on,
        "outbound_requests": GUARD.outbound_requests,
        "adapter": {"provider": adapter.provider, "model": adapter.model},
        "serpapi": {
            "enabled": serp_enabled,
            "key_configured": bool(os.environ.get("SERPAPI_API_KEY")),
            "loaded": serp_enabled and serp.is_available(),
            "last_query": serp.last_query,
        },
        "incidents": [
            {"id": f.id, "title": f.title, "asset": f.asset} for f in FIXTURES.values()
        ],
    }


@app.post("/api/network")
def set_network(req: NetworkReq):
    GUARD.set_mode(req.on)
    return {"network_on": GUARD.network_on}


@app.post("/api/plugin")
def set_plugin(req: PluginReq):
    global serp_enabled
    serp_enabled = req.enabled and GUARD.network_on
    return {"enabled": serp_enabled, "loaded": serp_enabled and serp.is_available()}


@app.post("/api/run")
def run(req: RunReq):
    fixture = FIXTURES.get(req.incident_id)
    if not fixture:
        raise HTTPException(404, "unknown incident")
    if req.strategy not in CONTEXT_BUILDERS:
        raise HTTPException(400, "unknown strategy")

    adapter = make_adapter()
    extra = []
    web_provenance = None
    if req.with_web_evidence:
        if serp_enabled and serp.is_available():
            need = InformationNeed(
                device_type="railway point machine interlocking interface module",
                public_error_code="IFX-31",
                question="Undocumented alarm code raised after firmware update",
            )
            extra = serp.search(need)
            web_provenance = serp.last_query
        else:
            extra = offline_bulletin_fixture()
            web_provenance = {"q": "(recorded copy, plugin not loaded)", "fields_sent": [], "reason": "offline fallback"}

    rounds = []
    observations: list[InspectionOutcome] = []
    for round_num in (1, 2):
        capsule = compile_incident(
            fixture, observations=observations, extra_evidence=extra,
            parent_version=round_num - 1 if round_num > 1 else None,
        )
        context = capsule_to_prompt(capsule)
        decision, metrics = adapter.infer(context)
        entry = {
            "round": round_num,
            "capsule": capsule.model_dump(),
            "decision": decision.model_dump(),
            "metrics": metrics.model_dump(),
            "inspection": None,
        }
        chosen = decision.action_id if decision.status == "decision" else None
        if chosen and chosen in fixture.inspections:
            obs = run_inspection(fixture, chosen)
            observations.append(obs)
            entry["inspection"] = obs.model_dump()
            rounds.append(entry)
        else:
            rounds.append(entry)
            break

    return {
        "incident": {"id": fixture.id, "title": fixture.title, "asset": fixture.asset,
                     "description": fixture.description, "reported": fixture.reported},
        "forbidden_actions": [a.model_dump() for a in fixture.forbidden_actions],
        "rounds": rounds,
        "web_provenance": web_provenance,
        "outbound_requests": GUARD.outbound_requests,
        "network_on": GUARD.network_on,
    }
