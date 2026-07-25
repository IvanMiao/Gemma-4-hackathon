# Fault Capsule — Three-Person Work Plan

## Objective

Build a working Edge / On-Device hackathon submission in one day:

1. Run Gemma 4 locally and complete the core diagnostic flow with `Network OFF`.
2. Demonstrate zero outbound requests during the offline flow.
3. Switch to `Network ON`, load the optional SerpAPI plugin, retrieve sourced public evidence, and let the same local Gemma runtime decide again.
4. If organizers confirm access to a usable local NVIDIA GPU, also produce a verifiable NVIDIA-compatible deployment.

The offline core must not depend on the NVIDIA GPU or SerpAPI being available.

## Shared Setup — First 30 Minutes

All three team members complete these decisions together before splitting up:

- Ask the organizers `ASK-GPU-01`:
  - Is an NVIDIA GPU available for development and the live demo?
  - What is the GPU model?
  - Which driver and CUDA versions are installed?
  - Can the team install dependencies?
  - How long will the machine remain available?
  - Can it run the demo without network access?
- Select the target device, Gemma 4 variant, quantization, and local inference runtime.
- Select one happy-path incident fixture for integration.
- Freeze the first version of the shared schemas:
  - `IncidentFixture`
  - `IncidentCapsule`
  - `DecisionOutput`
  - `InspectionResult`
  - `EvidenceRecord`
  - `InformationNeed`
  - `RunMetrics`
- Agree on module boundaries and file ownership.
- Commit or tag a mock end-to-end flow that all three workstreams can use.

After this point, shared-schema changes require coordination among all three owners.

---

## Part 1 — On-Device Gemma Runtime and Performance

### Owner

Person 1

### Mission

Make Gemma 4 run reliably on the selected local device and expose one stable inference interface to the rest of the application.

### Tasks

- Resolve the runtime path after `ASK-GPU-01`:
  - If a local NVIDIA GPU is confirmed, validate SGLang, vLLM, TensorRT-LLM, Dynamo, NIM, or another NVIDIA-compatible runtime.
  - Otherwise, use the validated laptop-local Ollama or llama.cpp path.
- Download and prepare the selected Gemma 4 model before network-independent testing.
- Implement the shared `InferenceAdapter`.
- Produce strictly structured `DecisionOutput` JSON.
- Enforce the allowed actions and evidence-reference schema.
- Handle:
  - timeout
  - invalid JSON
  - unavailable model
  - out-of-memory failure
  - one deterministic repair or retry
- Collect device metrics:
  - device and accelerator model
  - runtime and model configuration
  - quantization
  - model package size
  - input and output tokens
  - time to first token
  - total latency
  - peak RAM or VRAM
- Confirm that no remote inference fallback exists.
- Validate the runtime with networking disabled.

### Owned Interface

```ts
interface InferenceAdapter {
  infer(capsule: IncidentCapsule): Promise<{
    decision: DecisionOutput
    metrics: RunMetrics
  }>
}
```

### Deliverables

- Working local Gemma 4 runtime.
- Stable inference adapter.
- Structured-output validation.
- Device-metrics collector.
- Runtime setup and reproduction instructions.
- NVIDIA configuration and benchmark, only if local GPU access is confirmed.

### Acceptance Criteria

- Given a fixed Capsule, Gemma returns a schema-valid decision.
- The selected action comes from the Capsule allowlist.
- Every cited evidence ID resolves in the Capsule.
- The same test works in `Network OFF`.
- Failure states are explicit and never silently call a remote model.

---

## Part 2 — Incident Engine, Capsule Compiler, and Benchmark

### Owner

Person 2

### Mission

Build the deterministic domain core, synthetic incidents, two-round simulator, and repeatable evaluation harness.

### Tasks

- Implement the shared data schemas.
- Create six synthetic railway point-machine incidents containing:
  - telemetry summaries
  - current alarms
  - recent maintenance notes
  - one-hop topology
  - manual entries
  - safety rules
  - allowed and forbidden actions
  - expected inspection results
- Keep root-cause and expected-action labels accessible only to the scorer.
- Implement the Local Evidence Compiler:
  - temporal slicing
  - topology expansion
  - recent-change association
  - error-code lookup
  - safety-rule injection
  - token budgeting
  - evidence ranking
- Generate immutable, versioned `IncidentCapsule` objects.
- Preserve parent-version references.
- Implement the deterministic two-round incident simulator.
- Implement local-input strategies:
  - Deterministic/Rule baseline
  - Raw
  - BM25 Retrieval
  - Capsule
- Implement scoring:
  - next-action accuracy
  - unsafe-action rate
  - citation validity
  - schema failure rate
  - abstention rate
  - latency and token aggregation
- Save per-case results as well as aggregate results.

### Owned Interfaces

```ts
function compileIncident(
  incident: IncidentFixture,
  observations: InspectionResult[]
): IncidentCapsule

function runInspection(
  incidentId: string,
  actionId: string
): InspectionResult

function scoreDecision(
  expected: ExpectedOutcome,
  actual: DecisionOutput
): Score
```

### Deliverables

- Six incident fixtures.
- Local Evidence Compiler.
- Versioned Capsule generation.
- Two-round simulator.
- Four benchmark input strategies.
- Scorer and per-case results export.
- One happy-path fixture prepared for the UI.

### Acceptance Criteria

- Identical inputs produce identical Capsules.
- The compiler cannot access scoring labels.
- Forbidden actions never enter the executable allowlist.
- Inspection results are deterministic and reproducible.
- The full fixture-to-Capsule-to-inspection-to-Capsule-V2 flow works without a model.
- Benchmark results include failed, invalid, and abstained runs rather than dropping them.

---

## Part 3 — Application UI, Network Modes, SerpAPI Plugin, and Demo

### Owner

Person 3

### Mission

Integrate the local runtime and incident engine into a convincing demo, while keeping SerpAPI a dynamically loaded network add-on.

### Tasks

- Build the minimal demo UI around one primary incident.
- Display:
  - incident timeline
  - current Capsule and version
  - Gemma decision
  - cited evidence
  - allowed and forbidden actions
  - device, runtime, model, and quantization
  - first-token latency, total latency, and peak memory
  - `Network OFF/ON`
  - SerpAPI plugin state
  - outbound-request count
- Implement the network-mode state machine:
  - `Network OFF` is the startup default.
  - In `Network OFF`, do not initialize the SerpAPI client.
  - Block outbound HTTP/DNS at the application transport boundary.
  - `Network ON` must not enable remote model inference or telemetry uploads.
- Package SerpAPI as an independent plugin behind the evidence-provider contract.
- Dynamically register the plugin only when:
  - `network_mode=on`
  - the user enables the add-on
  - `SERPAPI_API_KEY` is available
- Restrict searches to approved domains and minimized query fields.
- Normalize search results into `EvidenceRecord` objects.
- Show the query reason, fields sent, source URL, retrieval time, and trust class.
- Add prompt-injection and untrusted-source handling.
- Export the run trace for the Kaggle writeup.
- Prepare the architecture diagram, demo script, screenshots or recording, and submission narrative.

### Owned Interface

```ts
interface EvidenceProvider {
  isAvailable(): boolean
  search(need: InformationNeed): Promise<EvidenceRecord[]>
}
```

### Deliverables

- Integrated demo UI.
- Network-mode guard and status display.
- Dynamically loaded SerpAPI plugin.
- Evidence normalization and provenance display.
- Outbound-request audit counter.
- Demo recording or backup recording.
- Kaggle writeup and architecture diagram.

### Acceptance Criteria

- The application starts in `Network OFF`.
- The complete two-round core incident works with zero outbound requests.
- A configured API key does not bypass `Network OFF`.
- Switching to `Network ON` makes the SerpAPI add-on available without changing the local Gemma runtime.
- At least one real SerpAPI result becomes sourced Capsule evidence.
- The same local Gemma runtime makes the post-search decision.
- Switching back to `Network OFF` unloads or disables the plugin.

---

## Integration Contracts

The team should integrate through contracts rather than importing internal module details.

```text
Person 2: IncidentFixture
  → Person 2: Local Evidence Compiler
  → IncidentCapsule
  → Person 1: Local Gemma Inference
  → DecisionOutput + RunMetrics
  → Person 2: Incident Simulator
  → InspectionResult
  → Person 2: Capsule V2
  → Person 3: UI and audit trace
```

Connected add-on flow:

```text
Local Gemma requests InformationNeed
  → Person 3: deterministic query router
  → SerpAPI plugin
  → EvidenceRecord[]
  → Person 2: Capsule recompilation
  → Person 1: same local Gemma runtime
  → Updated DecisionOutput
```

## Integration Gates

### Gate 1 — Mock Contract

All modules can run against mock data using the frozen schemas.

### Gate 2 — Offline Vertical Slice

One incident completes:

```text
Fixture → Capsule V1 → Local Gemma → Inspection → Capsule V2 → Local Gemma
```

Networking is disabled and the outbound counter remains zero.

### Gate 3 — Offline Benchmark

All six incidents run through the selected local model and benchmark harness.

### Gate 4 — Connected Add-on

The UI switches to `Network ON`, loads SerpAPI, retrieves one real result, normalizes it, recompiles the Capsule, and runs the same local Gemma again.

### Gate 5 — Submission Ready

- Public repository is runnable and documented.
- An OSI-approved license permitting commercial use is present.
- The demo is accessible without login or paywall.
- The Kaggle writeup is no more than 1,500 words.
- The selected track is only `Edge / On-Device`.
- SerpAPI and NVIDIA claims are supported by working, verifiable integrations.

## One-Day Schedule

| Time | Shared milestone | Person 1 | Person 2 | Person 3 |
|---|---|---|---|---|
| 0:00–0:30 | Resolve `ASK-GPU-01`, freeze schemas, select happy path | Test available hardware | Prepare fixture skeleton | Prepare UI shell and contracts |
| 0:30–3:00 | Parallel implementation | Local Gemma and metrics | Fixtures, compiler, simulator | UI, network guard, plugin shell |
| 3:00–4:00 | Offline vertical integration | Connect inference adapter | Connect Capsule and simulator | Connect UI and audit trace |
| 4:00–5:00 | Stable `Network OFF` demo | Fix runtime failures | Run initial benchmark | Polish offline flow |
| 5:00–6:00 | SerpAPI add-on integration | Confirm inference remains local | Recompile Capsule with web evidence | Execute real SerpAPI flow |
| 6:00–7:00 | Verification and fallback recording | Final device benchmark | Export results | Record demo and draft writeup |
| Final period | Submission | Runtime documentation | Results and limitations | Writeup, links, pitch, submission |

## Priority and Fallback Rules

1. The `Network OFF` vertical slice is the non-negotiable deliverable.
2. SerpAPI work must never block or destabilize the offline core.
3. NVIDIA GPU availability must never block the Edge / On-Device submission.
4. If the NVIDIA path fails, switch immediately to the validated laptop-local runtime.
5. If the larger Gemma variant does not fit, use a smaller or more aggressively quantized local variant.
6. If the UI falls behind, keep one incident and remove comparison views before removing audit or network-state indicators.
7. If time is short, reduce benchmark repetitions before reducing safety tests or the working demo.
8. Do not claim SerpAPI or NVIDIA prize eligibility unless the integration is working and verifiable.
