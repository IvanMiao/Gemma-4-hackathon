# Fault Capsule — 2-Minute Pitch

*(~290 words, spoken at a natural pace ≈ 2 minutes)*

---

**[0:00 — The pain]**

When a railway switch fails at 6 AM, the maintenance operator doesn't have a data problem — they have a *scattered* data problem. The answer is spread across telemetry curves, alarm logs, last week's work orders, the asset next to it, a vendor manual, and a safety rulebook. And here's the trap: dumping all of it into an AI makes things *worse*. The one signal that matters — yesterday's tamping works — drowns in a thousand lines of history. Meanwhile, these sites can't ship OT data to the cloud, and the wrong action — like forcing the mechanism again — destroys equipment.

**[0:40 — The solution]**

Fault Capsule fixes the context, not the model. A deterministic compiler slices time around the alarm, links recent changes, pulls in neighbouring assets, and always keeps the safety rules — producing a compact, versioned **Incident Capsule**. A small Gemma 4 — just 2B parameters, running entirely on this laptop — then picks the next safe inspection from a whitelist, cites its evidence, or abstains. Network off. Zero outbound requests. Every decision auditable and replayable.

**[1:10 — The proof]**

We benchmarked it honestly: same model, same token budget, four context strategies. Classic BM25 retrieval: 45% correct next actions. Raw data dump: 50%. Our Capsule: **91%** — with zero unsafe actions and 100% valid citations. Context engineering literally doubled a small model's decision quality. And the same adapter runs on an NVIDIA L40S with vLLM: identical decisions, five times faster.

**[1:40 — The close]**

This is what the edge needs: not a bigger model, but a smarter capsule around a small one. Fault Capsule — auditable maintenance intelligence, offline by default. Let us show you the live console.

---

## Delivery notes

- Open the dashboard **before** the pitch, Network OFF visible, INC-001 loaded.
- At "let us show you", click **Start local diagnosis** — the ~5 s of real local inference is the demo.
- If asked about INC-006: it's our abstention case — the model must say "insufficient evidence" on an undocumented alarm code, and the SerpAPI add-on (Network ON, opt-in) fetches the vendor bulletin that unblocks it.
- Backup numbers: laptop ~4.5 s/decision, L40S ~950 ms; 6 incidents × 2 rounds; 0 schema failures.
