# Fault Capsule — Kaggle Writeup (draft)

> **Title:** Fault Capsule
> **Subtitle:** Versioned, auditable evidence capsules that turn Gemma 4 into a safe industrial maintenance decision-maker
> **Track:** Context Engineering for SLMs
> ⚠️ Draft — fill `[REPO_URL]` / `[DEMO_URL_OR_VIDEO]` before submitting. Must stay under 1,500 words (currently ~850).

## The problem

When an industrial asset fails, maintenance staff reconstruct "what is actually going on" across half a dozen systems: telemetry, alarm logs, work orders, asset topology, vendor manuals and safety rules. The information is scattered *and temporal* — and more context is not better. A raw dump of device history buries the single recent change that explains the fault (yesterday's tamping works, a motor swap three days ago, a lighting bank connected to the same feeder last month).

For a small language model this is fatal: feed it everything and it anchors on noise; feed it a naive top-k retrieval and it misses cross-source links (the alarm on machine A explained by a load added to machine B's shared feeder). Sites with unstable networks, non-exportable OT data or strict response-time budgets need small local models — so the question becomes: **how must context be engineered for an SLM to make reliable, safe maintenance decisions?**

## Our answer: the Incident Capsule

Fault Capsule is built around a deterministic, label-blind, LLM-free **Local Evidence Compiler**. For each incident it:

1. **slices time** around the alarm and associates *recent changes* (work orders, config/firmware updates) with the failing asset;
2. **expands topology one hop** (shared feeders, adjacent machines) so cross-asset causes are visible;
3. **ranks evidence deterministically** — safety rules always first (never budget-dropped), then alarms/inspections, telemetry, maintenance, topology, manuals — with keyword relevance against the live alarms as tie-breaker;
4. **budgets tokens** (~1,600), recording exactly which evidence was dropped;
5. emits an immutable, **versioned `IncidentCapsule`** carrying its parent-version reference.

Gemma 4 never sees raw data. It sees Capsule vN, a whitelist of allowed actions, and an explicit forbidden-action note, and must return strict JSON: one action id from the whitelist (or an explicit `insufficient_evidence` abstention), a rationale, and **evidence citations that must resolve inside that exact capsule version** — making every decision fully auditable and replayable.

The loop is closed by a deterministic inspection simulator: Gemma picks an inspection, the simulator returns findings, the compiler recompiles Capsule V2 (parent: V1), and the same model decides again — context *updating*, not just context selection.

## How Gemma 4 is used

- `google/gemma-4-E2B-it` via an OpenAI-compatible `InferenceAdapter` (OpenRouter / Google AI Studio; the adapter is backend-agnostic, so a local Ollama/llama.cpp runtime drops in unchanged).
- Constrained decision-making: whitelist action selection, mandatory evidence citations, explicit abstention channel, strict JSON schema with one deterministic repair retry.
- Low temperature, fixed budgets, and honest failure accounting: schema-invalid outputs are scored as failures, never silently retried into success.

Gemma is the *only* reasoning component. Everything around it — compilation, ranking, budgeting, safety policy, simulation, scoring — is deterministic code, so the benchmark isolates exactly one variable: **how the context is engineered.**

## The benchmark

Six synthetic railway point-machine incidents (obstruction after tamping, worn detection contacts after a motor swap, cold-snap lubrication failure, cable strike by civil works, shared-feeder undervoltage, and an undocumented post-firmware alarm requiring abstention). Root-cause labels are visible only to the scorer — the compiler and model never read them.

Four input strategies run under the same model, token budget, output schema and tool budget:

Results with **Gemma 4 E2B IT (Q4_K_M) running fully on-device via Ollama** on a laptop, network OFF, zero outbound requests, ~935 input tokens and ~4.5 s per decision:

| Strategy | Description | Next-action accuracy | Unsafe rate | Citation validity |
|---|---|---|---|---|
| Rule baseline (no LLM) | first pending inspection in list order | 41.7% | 0% | — |
| BM25 retrieval | top-k against alarm text | 45.5% | 0% | 100% |
| Raw dump | storage-order evidence, truncated at budget | 50.0% | 0% | 100% |
| **Capsule (ours)** | compiled, ranked, versioned | **90.9%** | **0%** | **100%** |

Same model, same token budget, same schema: engineered context **doubles** the small model's decision accuracy over a raw dump. Schema-failure rate is 0% across all strategies (one repair retry allowed); failed and abstained runs are scored, never dropped. The single Capsule miss is the abstention case (INC-006): the model inspects instead of abstaining on an undocumented alarm — a measured illustration of small-model under-abstention.

**NVIDIA deployment.** The identical benchmark also runs against Gemma 4 E2B IT served by **vLLM 0.26 on an NVIDIA L40S**, swapped in through the same adapter (`OPENAI_BASE_URL`). The strategy ranking is preserved (Capsule 83.3% > raw 58.3% > BM25 50%) while mean decision latency drops from ~4.5 s on the laptop to **~950 ms — a 4.7× speedup** — showing the same auditable pipeline scaling from a field laptop to GPU-served fleet operation. Both raw result files are in `results/`.

## Safety and network model

Startup default is **Network OFF**, enforced at the transport boundary with a live outbound-request counter (a configured API key cannot bypass it). The optional **SerpAPI add-on** loads only when the network is ON, the user opts in, and a key exists. A deterministic router sends *minimized* queries only (device type + public error code — never telemetry, work orders or site identifiers); results come back trust-classed `public`, injection-filtered, and marked `UNTRUSTED PUBLIC SOURCE` inside the next capsule version. Incident 6 demonstrates the full arc: Gemma abstains on an undocumented alarm code, external vendor-bulletin evidence arrives, and the same model then makes a confident, cited decision.

## Challenges & decisions

- **Small-model JSON discipline:** solved with a strict schema, low temperature and a single deterministic repair retry — then *measured* (schema-failure rate is a first-class metric) rather than hidden.
- **Making abstention a feature:** SLMs guess when uncertain; we made `insufficient_evidence` a schema-level citizen and built an incident where abstaining *is* the correct answer.
- **Keeping the comparison honest:** all strategies share model, budgets and scoring; the compiler is label-blind by construction.
- **One-day scope:** a deterministic mock adapter let all modules integrate and the benchmark run end-to-end before any API key existed.

## Repository & demo

- Code: `[REPO_URL]` (MIT)
- Demo: FastAPI UI — pick an incident, watch the two-round capsule loop with citations, metrics, network state and the SerpAPI add-on. `[DEMO_URL_OR_VIDEO]`
