# Task 1 — Local Gemma Runtime Implementation Plan

## Scope

Implement Task 1 using only the laptop-local Ollama model below:

```text
Model:  gemma4:e2b
Digest: 7fbdbf8f5e45
Size:   7.2 GB
```

This plan excludes NVIDIA, cloud GPUs, remote model APIs, and remote inference fallbacks. The implementation language is TypeScript so it can expose the `InferenceAdapter` contract already defined in `task.md`. Ollama's native `/api/chat` endpoint is preferred over the CLI or OpenAI-compatible endpoint because it provides structured outputs, streaming, and native timing/token metrics.

## Intended Effect

Task 1 is a local inference component, not the final user interface. Given an `IncidentCapsule`, it must ask `gemma4:e2b` to select the next safe diagnostic action and return:

```ts
interface InferenceAdapter {
  infer(capsule: IncidentCapsule): Promise<{
    decision: DecisionOutput
    metrics: RunMetrics
  }>
}
```

A successful result should resemble:

```json
{
  "decision": {
    "status": "action",
    "actionId": "CHECK_OBSTRUCTION",
    "citedEvidenceIds": ["EV-001", "EV-002"],
    "confidence": 0.82,
    "rationale": "High motor current and unchanged position feedback support checking for an obstruction."
  },
  "metrics": {
    "model": "gemma4:e2b",
    "modelDigest": "7fbdbf8f5e45",
    "modelSizeBytes": 7200000000,
    "runtime": "ollama",
    "inputTokens": 542,
    "outputTokens": 91,
    "timeToFirstTokenMs": 420,
    "totalLatencyMs": 2840,
    "loadDurationMs": 135,
    "peakMemoryBytes": 9100000000,
    "networkMode": "off",
    "remoteInferenceRequests": 0
  }
}
```

Values above are illustrative; measured values must come from real runs. The adapter guarantees schema validity, action safety, valid citations, explicit failures, and local execution. Task 2's scorer determines whether the selected action is diagnostically correct.

## Required Behavior

- Use only `gemma4:e2b` through `http://127.0.0.1:11434`.
- Reject any non-loopback inference endpoint.
- Produce a schema-valid `DecisionOutput`.
- Select only an action listed in the current Capsule's allowlist.
- Never select a forbidden action.
- Cite only evidence IDs present in the current Capsule.
- Return `insufficient_evidence` instead of inventing unsupported facts.
- Attempt at most one deterministic repair for invalid model output.
- Return explicit errors for timeout, unavailable model, invalid output, out-of-memory, invalid Capsule, and network-policy violations.
- Record model, hardware, token, latency, load, memory, and network metrics.
- Continue operating after external networking is disabled.

## Proposed Module Layout

```text
src/
  inference/
    inference-adapter.ts
    ollama-client.ts
    prompt-builder.ts
    output-validator.ts
    metrics-collector.ts
    errors.ts
  schemas/
    incident-capsule.ts
    decision-output.ts
    run-metrics.ts
tests/
  fixtures/
    happy-path-capsule.json
    insufficient-evidence-capsule.json
  unit/
  integration/
scripts/
  verify-runtime.ts
  benchmark-local.ts
  verify-offline.ts
artifacts/
  .gitkeep
```

Use Zod for runtime schemas and Vitest for tests. Do not commit model weights or generated benchmark artifacts containing private incident data.

## Implementation Steps

### Step 1 — Verify and record the runtime

Confirm the installed model before writing the adapter:

```bash
ollama --version
ollama list
ollama show gemma4:e2b
system_profiler SPHardwareDataType
sw_vers
```

Create `verify-runtime.ts` to query Ollama's local model endpoint and export a `runtime-info.json` artifact containing:

- model tag, digest, and package size;
- Ollama version;
- operating system and hardware model;
- CPU/GPU/accelerator and total memory when available;
- verification timestamp.

Fail immediately if `gemma4:e2b` is absent or its digest does not begin with `7fbdbf8f5e45`.

### Step 2 — Define and freeze contracts

Coordinate with Task 2 before changing shared schemas. Define Zod schemas and inferred TypeScript types for `IncidentCapsule`, `DecisionOutput`, `RunMetrics`, and `InferenceError`.

`DecisionOutput` must contain:

- `status`: `action` or `insufficient_evidence`;
- `actionId`: allowed action ID or `null`;
- `citedEvidenceIds`: array of Capsule evidence IDs;
- `confidence`: number from 0 to 1;
- `rationale`: short evidence-grounded explanation.

`RunMetrics` must contain model identity, runtime, token counts, time to first token, total latency, load duration, peak memory when measurable, network mode, and a zero remote-inference count.

### Step 3 — Implement the local Ollama client

Build a client for `POST /api/chat` with:

- base URL fixed to `http://127.0.0.1:11434`;
- model fixed to `gemma4:e2b`;
- the `DecisionOutput` JSON Schema passed as `format`;
- `temperature: 0` and a fixed seed;
- configurable timeout using `AbortController`;
- streaming enabled;
- response chunks accumulated before JSON parsing;
- `keep_alive` set for repeat benchmark runs.

Measure time to first token from request start until the first non-empty response-content chunk. Read input tokens, output tokens, load duration, and total duration from Ollama's final stream record. Convert nanoseconds to milliseconds at the boundary.

### Step 4 — Build the deterministic prompt

The system prompt must instruct Gemma to:

- use only the supplied Capsule;
- choose only an allowlisted action;
- never choose a forbidden action;
- cite only supplied evidence IDs;
- request no external information or tools;
- return `insufficient_evidence` when support is inadequate;
- return only the required JSON structure.

Serialize Capsule sections in a fixed order. Include the same JSON Schema in the prompt and Ollama `format` field. Keep prompt construction independent from HTTP and validation code.

### Step 5 — Implement output validation

After parsing the model response:

1. Validate it against the Zod `DecisionOutput` schema.
2. Confirm an `action` result has a non-null `actionId`.
3. Confirm `actionId` appears in `allowedActions`.
4. Confirm `actionId` does not appear in `forbiddenActions`.
5. Resolve every `citedEvidenceId` against the current Capsule.
6. Confirm `insufficient_evidence` has `actionId: null`.

The deterministic validator is the safety boundary. Do not trust prompt instructions or structured generation alone.

### Step 6 — Add one repair attempt

If JSON parsing or output validation fails, make one repair request containing:

- the original Capsule;
- the invalid response;
- concise validation errors;
- the unchanged output schema.

Use the same model, seed, and temperature. Validate the repaired response through the same pipeline. If it also fails, return `INVALID_OUTPUT`; do not attempt a third inference.

Timeout, model-unavailable, out-of-memory, and network-policy errors must not trigger repair.

### Step 7 — Normalize failures

Expose stable error codes:

```text
MODEL_UNAVAILABLE
TIMEOUT
INVALID_OUTPUT
OUT_OF_MEMORY
CAPSULE_INVALID
NETWORK_POLICY_VIOLATION
RUNTIME_ERROR
```

Preserve safe diagnostic details, elapsed time, and whether a repair occurred. Never include secrets or hidden reasoning in logs. No error path may switch to a different model or provider.

### Step 8 — Collect performance metrics

Collect Ollama's `prompt_eval_count`, `eval_count`, `load_duration`, `prompt_eval_duration`, `eval_duration`, and `total_duration`. Measure time to first streamed content separately.

For peak memory on macOS, sample the Ollama process resident memory during inference. Label this as observed process RSS or unified-memory usage rather than dedicated VRAM. If a measurement is unsupported, return `null` with an explanatory metric-status field rather than fabricating a value.

Export every benchmark run, including failures and repairs, as local JSON.

### Step 9 — Enforce local-only operation

Start Ollama with cloud features disabled:

```bash
OLLAMA_NO_CLOUD=1 ollama serve
```

Keep Ollama bound to loopback. The adapter must reject configuration containing any hostname other than `127.0.0.1`, `localhost`, or `::1`. Instrument the inference client so its audit record always reports the number of non-loopback inference requests; the accepted value is zero.

### Step 10 — Integrate with the two-round flow

Use the happy-path fixture supplied by Task 2:

```text
Fixture
  → Capsule V1
  → local Gemma decision
  → deterministic simulated inspection
  → Capsule V2
  → local Gemma decision
```

Task 1 owns both inference calls and their metrics. Task 2 owns Capsule creation, the inspection result, and correctness scoring. Task 3 consumes the adapter output without importing Ollama-specific code.

## Test Plan

### Runtime smoke test

Send a minimal request directly to Ollama:

```bash
curl http://127.0.0.1:11434/api/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gemma4:e2b",
    "messages": [
      {"role": "user", "content": "Return JSON with status set to ok."}
    ],
    "format": "json",
    "stream": false,
    "options": {"temperature": 0, "seed": 42}
  }'
```

Pass when Ollama returns valid JSON locally using the expected model.

### Unit tests

Run unit tests without loading Gemma. Mock the Ollama client where necessary.

| Test | Expected effect |
|---|---|
| Valid `DecisionOutput` | Accepted |
| Missing required field | Rejected |
| Confidence outside 0–1 | Rejected |
| Allowed action | Accepted |
| Unknown action | Rejected and repaired once |
| Forbidden action | Rejected and repaired once |
| Valid evidence references | Accepted |
| Unknown evidence reference | Rejected and repaired once |
| `insufficient_evidence` with null action | Accepted |
| Two invalid outputs | `INVALID_OUTPUT` |
| Non-loopback Ollama URL | `NETWORK_POLICY_VIOLATION` before HTTP |
| Delayed mock response | `TIMEOUT` |
| Connection refusal | `MODEL_UNAVAILABLE` |
| Mock out-of-memory response | `OUT_OF_MEMORY` |

Also test nanosecond-to-millisecond conversion, first-token timing, stream accumulation, and the guarantee that repair occurs no more than once.

### Model integration tests

Run the real `gemma4:e2b` model against:

1. A happy-path Capsule with two plausible allowed actions.
2. A Capsule whose evidence supports only one allowed action.
3. An insufficient-evidence Capsule.
4. A Capsule containing a tempting but explicitly forbidden action.
5. A Capsule whose evidence IDs are easy to distinguish.

For every case, assert schema validity, action safety, citation resolution, model identity, metrics presence, and zero remote inference requests. Preserve invalid, timed-out, repaired, and abstained runs.

### Repeatability test

Run the same fixed Capsule five times with temperature 0 and seed 42. Report all outputs. The hard requirement is five schema-valid and safe results; identical wording is not required. Report action or citation variation instead of hiding it.

### Cold and warm performance tests

For a cold run:

```bash
ollama stop gemma4:e2b
```

Then run one inference and record model load plus generation time. For warm measurements, keep the model resident and run the same Capsule five times. Export individual results and medians for:

- time to first token;
- total latency;
- input and output tokens;
- load duration;
- peak observed memory;
- validation and repair outcome.

### Offline acceptance test

Perform the final acceptance test on the demo laptop:

1. Confirm the model is fully downloaded.
2. Restart Ollama with `OLLAMA_NO_CLOUD=1`.
3. Confirm Ollama logs state that cloud features are disabled.
4. Disable Wi-Fi and disconnect wired networking.
5. Run the happy-path Capsule through the adapter.
6. Run the simulated inspection and Capsule V2 inference.
7. Save both decisions, metrics, audit logs, and a screenshot or recording.
8. Confirm all inference traffic is loopback and the remote-inference count is zero.

Pass only if both rounds complete successfully without external connectivity.

## Verification Matrix

| Requirement | Verification evidence |
|---|---|
| Correct local model | Runtime artifact shows tag, digest, and size |
| Stable adapter contract | Type checks and contract integration test pass |
| Structured output | Every result passes the Zod schema |
| Allowed action only | Deterministic validator and mutation tests pass |
| Valid citations only | Every cited ID resolves in the current Capsule |
| One repair maximum | Mock call-count test shows at most two total calls |
| Explicit failures | Each normalized error has an automated test |
| Real metrics | Raw Ollama fields and derived metrics are exported |
| No remote fallback | Endpoint guard and audit counter remain local/zero |
| Offline operation | Recorded two-round run succeeds with networking disabled |

## Definition of Done

Task 1 is complete when:

- `gemma4:e2b` is verified by tag, digest, and size on the demo laptop;
- the TypeScript `InferenceAdapter` returns validated decisions and real metrics;
- forbidden actions, unknown actions, and unknown citations cannot escape validation;
- one deterministic repair is implemented and tested;
- all failure modes return explicit, normalized errors;
- cold, warm, repeatability, and failure results are retained;
- the complete two-round integration flow works with external networking disabled;
- runtime logs and application audit data show zero remote inference requests;
- setup, startup, test, benchmark, and offline reproduction instructions are sufficient for another team member to repeat the run.
