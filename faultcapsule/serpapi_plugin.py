"""SerpAPI evidence provider — an optional, dynamically loaded network add-on.

Loaded only when: network is ON + user enabled the add-on + SERPAPI_API_KEY set.
Sends minimized fields only (device type + public error code), never raw
telemetry, maintenance records or site identifiers. Results are normalized,
trust-classed as public/untrusted and sanitized before entering a Capsule.
"""
from __future__ import annotations

import os
import re

from .network import GUARD
from .schemas import EvidenceKind, EvidenceRecord, InformationNeed, TrustClass

APPROVED_DOMAINS = ("vendor", "manufacturer", "gov", "railway", "signalling", "docs")
MAX_RESULTS = 3
_INJECTION = re.compile(r"(ignore (all|previous|above)|system prompt|you are now|disregard)", re.IGNORECASE)


class SerpApiProvider:
    def __init__(self) -> None:
        self.api_key = os.environ.get("SERPAPI_API_KEY", "")
        self.last_query: dict | None = None

    def is_available(self) -> bool:
        return bool(self.api_key) and GUARD.network_on

    def search(self, need: InformationNeed) -> list[EvidenceRecord]:
        if not self.is_available():
            return []
        # Deterministic router: minimized query, no free-form model text.
        query = f"{need.device_type} {need.public_error_code or ''} documentation".strip()
        self.last_query = {"q": query, "fields_sent": ["device_type", "public_error_code"], "reason": need.question}
        with GUARD.client(timeout=20.0) as client:
            resp = client.get(
                "https://serpapi.com/search",
                params={"engine": "google", "q": query, "num": 5, "api_key": self.api_key},
            )
            resp.raise_for_status()
            organic = resp.json().get("organic_results", [])
        records: list[EvidenceRecord] = []
        for idx, item in enumerate(organic[:MAX_RESULTS]):
            snippet = (item.get("snippet") or "")[:400]
            if _INJECTION.search(snippet):
                continue  # drop prompt-injection-looking snippets entirely
            records.append(EvidenceRecord(
                id=f"W{idx + 1}",
                kind=EvidenceKind.web,
                summary=f"UNTRUSTED PUBLIC SOURCE — {item.get('title', 'untitled')[:120]}: {snippet}",
                source=item.get("link", "unknown"),
                trust=TrustClass.public,
            ))
        return records


def offline_bulletin_fixture() -> list[EvidenceRecord]:
    """Recorded copy of the vendor bulletin (used when no SerpAPI key is
    configured, so the INC-006 demo path stays demonstrable offline)."""
    return [EvidenceRecord(
        id="W1",
        kind=EvidenceKind.web,
        summary="UNTRUSTED PUBLIC SOURCE — Vendor service bulletin SB-2026-114 (recorded copy): alarm IFX-31 on interface hardware rev C running firmware v2.4.1 is a benign telemetry-buffer overflow; fixed in v2.4.2; verify via module diagnostic log; no operational restriction required",
        source="recorded://vendor-bulletin/SB-2026-114",
        trust=TrustClass.public,
    )]
