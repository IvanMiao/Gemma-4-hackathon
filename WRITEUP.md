# Fault Capsule — Kaggle Writeup (draft)

> **Title:** Fault Capsule
> **Subtitle:** A fully offline, auditable maintenance decision assistant running Gemma 4 on a laptop at the trackside
> **Track:** Edge / On-Device
> ⚠️ Draft — fill `[REPO_URL]` / `[DEMO_URL_OR_VIDEO]` before submitting. Must stay under 1,500 words (body is ~1,260).

## The problem

When a railway point machine fails, the technician on site has minutes to decide what to inspect first — and the wrong move (forcing the mechanism again, energising a suspect cable) damages equipment or endangers people. The information needed to decide well is scattered across telemetry, alarm logs, work orders, asset topology, vendor manuals and safety rulebooks.

A cloud assistant cannot solve this, for three reasons that are structural rather than budgetary:

- **The data cannot leave.** Operational-technology telemetry, work orders and site identifiers are contractually and often legally non-exportable. Sending them to a hosted model is not an option a rail operator will sign off.
- **The network is not there.** Trackside cabinets, tunnels and remote depots have intermittent or no connectivity, exactly when an incident is happening.
- **The latency budget is real.** A decision that arrives after the technician has already acted is worthless.

So the model has to run on the hardware the technician already carries. That forces a **2-billion-parameter model on a laptop** — and a small model handed raw incident data is not trustworthy enough to advise on safety-relevant actions. We measured it: fed a truncated raw dump, on-device Gemma 4 picks the correct next inspection **50%** of the time.

**The engineering problem of this project is therefore: what has to be built around a 4.1 GB on-device model to make it reliable enough to be useful in the field?**

## Our answer: the Incident Capsule

Fault Capsule runs entirely on the technician's machine. Between the raw site data and Gemma sits a deterministic, label-blind, **LLM-free Local Evidence Compiler** — plain Python, no inference, no network. For each incident it:

1. **slices time** around the alarm and associates *recent changes* (work orders, config and firmware updates) with the failing asset;
2. **expands topology one hop** (shared feeders, adjacent machines) so cross-asset causes are visible;
3. **ranks evidence deterministically** — safety rules always first and never budget-dropped, then alarms and inspections, telemetry, maintenance, topology, manuals — with keyword relevance against the live alarms as tie-breaker;
4. **budgets tokens** (~1,600), recording exactly which evidence was dropped;
5. emits an immutable, **versioned `IncidentCapsule`** carrying its parent-version reference.

Gemma 4 never sees raw data. It sees Capsule vN, a whitelist of allowed actions and an explicit forbidden-action note, and must return strict JSON: one action id from the whitelist (or an explicit `insufficient_evidence` abstention), a rationale, and **evidence citations that must resolve inside that exact capsule version** — so every recommendation is auditable and replayable offline, months later, without the original data source.

The loop closes with a deterministic inspection simulator: Gemma picks an inspection, the simulator returns findings, the compiler recompiles Capsule V2 (parent: V1), and the same local model decides again — context *updating*, not just context selection.

## Running on-device

Measured configuration, network physically off:

| | |
|---|---|
| Device | MacBook Pro (Apple M1 Pro, 16 GB unified memory) |
| Model | `gemma-4-E2B-it`, GGUF **Q4_K_M** — **4.1 GB on disk** |
| Runtime | Ollama, `num_ctx` 8192, temperature 0.1 |
| Per decision | ~935 input tokens, **~4.5 s** end to end |
| Outbound requests | **0** |

Every edge benefit the track asks for is enforced in code rather than asserted:

- **Privacy.** Startup default is **Network OFF**, enforced at the transport boundary with a live outbound-request counter. A configured API key cannot bypass it — we test this. Telemetry, work orders and site identifiers never leave the laptop.
- **Offline access.** The complete two-round loop (Capsule V1 → decision → inspection → Capsule V2 → decision) runs with Wi-Fi disabled. There is no remote-inference fallback path in the code; an unavailable local model is an explicit error, never a silent cloud call.
- **Low latency & efficiency.** 4.1 GB and ~4.5 s per decision on a three-year-old laptop, alongside the browser and the UI. No accelerator required.
- **Accessibility.** `uv sync`, one command, no account, no key, no quota.

## The benchmark

Six synthetic railway point-machine incidents (obstruction after tamping, worn detection contacts after a motor swap, cold-snap lubrication failure, cable strike by civil works, shared-feeder undervoltage, and an undocumented post-firmware alarm requiring abstention). Root-cause labels are visible only to the scorer — the compiler and the model never read them.

Four input strategies run under the **same on-device model, token budget, output schema and tool budget**, so the benchmark isolates exactly one variable: what we build around the small model.

| Strategy | Description | Next-action accuracy | Unsafe rate | Citation validity |
|---|---|---|---|---|
| Rule baseline (no LLM) | first pending inspection in list order | 41.7% | 0% | — |
| BM25 retrieval | top-k against alarm text | 45.5% | 0% | 100% |
| Raw dump | storage-order evidence, truncated at budget | 50.0% | 0% | 100% |
| **Capsule (ours)** | compiled, ranked, versioned | **90.9%** | **0%** | **100%** |

The capsule **doubles** the on-device model's decision accuracy over a raw dump, at the same token cost and the same ~4.5 s. That is the result that makes edge deployment viable here: you do not need a bigger model, you need a better capsule around a small one.

Schema-failure rate is 0% across all strategies (one repair retry allowed); failed and abstained runs are scored, never dropped. The single Capsule miss is the abstention case (INC-006): the model inspects instead of abstaining on an undocumented alarm — a measured illustration of small-model under-abstention, reported rather than hidden.

**Scaling the same binary to a depot GPU.** The identical benchmark runs against Gemma 4 E2B IT served by **vLLM 0.26 on an NVIDIA L40S**, swapped in through the same `InferenceAdapter` via `OPENAI_BASE_URL` — no other code changes. The strategy ranking is preserved (Capsule 83.3% > raw 58.3% > BM25 50%) while mean decision latency drops from ~4.5 s to **~0.96 s, a 4.6× speedup**. Same auditable pipeline, from the technician's laptop to an on-premises GPU serving a fleet — still no public cloud in the path. Both raw result files are in `results/`.

## The optional connected add-on

Field work is offline *by default*, not offline *only*. When the technician has connectivity and opts in, a **SerpAPI** evidence add-on loads dynamically — and only then (network ON **and** user opt-in **and** a key present). A deterministic router sends *minimized* queries: device type plus public error code, never telemetry, work orders or site identifiers. Results return trust-classed `public`, injection-filtered, and marked `UNTRUSTED PUBLIC SOURCE` inside the next capsule version. Inference stays local throughout — Network ON never enables remote model calls.

Incident 6 demonstrates the arc: the local model abstains on an undocumented alarm code, a vendor bulletin arrives, and the *same on-device* Gemma then decides with citations. Switching back to Network OFF unloads the plugin.

## Challenges & decisions

- **Making a 2B model produce disciplined JSON.** Strict schema, temperature 0.1, one deterministic repair retry — then *measured* (schema-failure rate is a first-class metric) rather than hidden behind silent retries.
- **Proving "offline" instead of claiming it.** The guard sits at the transport boundary with a counter the UI displays live, so a judge can watch the count stay at 0 through a full diagnosis.
- **Making abstention a feature.** Small models guess when uncertain; `insufficient_evidence` is a schema-level citizen, and one incident is built so that abstaining *is* the correct answer.
- **Keeping the comparison honest.** All four strategies share model, budgets and scoring; the compiler is label-blind by construction and never calls a model.
- **One-day scope.** A deterministic mock adapter let all three workstreams integrate and run the benchmark end to end before any model was downloaded.

## Repository & demo

- Code: `[REPO_URL]` (MIT)
- Demo: local FastAPI + React console — pick an incident, watch the two-round capsule loop with live token trace, citations, device metrics, network state and the SerpAPI add-on. `[DEMO_URL_OR_VIDEO]`
