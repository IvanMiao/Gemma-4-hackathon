"""Network-mode guard: single chokepoint for every outbound request.

Startup default is Network OFF. While OFF, any outbound HTTP attempt raises —
a configured API key must never bypass the guard.
"""
from __future__ import annotations

import httpx


class NetworkGuard:
    def __init__(self) -> None:
        self.network_on = False
        self.outbound_requests = 0

    def set_mode(self, on: bool) -> None:
        self.network_on = on

    def client(self, timeout: float = 60.0) -> httpx.Client:
        if not self.network_on:
            raise NetworkOffError("Network is OFF: outbound request blocked at transport boundary")

        def _count(request: httpx.Request) -> None:
            self.outbound_requests += 1

        return httpx.Client(timeout=timeout, event_hooks={"request": [_count]})


class NetworkOffError(RuntimeError):
    pass


GUARD = NetworkGuard()
