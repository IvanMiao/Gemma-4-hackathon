import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const SYSTEM_PROMPT = `You are Fault Capsule, a maintenance decision assistant for railway point machines.
You will receive an evidence capsule and a list of allowed actions.
Your job: pick the single next SAFE inspection action, or abstain.

Rules:
- Choose action_id ONLY from the allowed actions list. Never invent actions. Never pick a forbidden action.
- Cite the evidence ids that justify your choice in cited_evidence_ids (2-5 ids that appear in the capsule).
- Decision policy: if the evidence points to a plausible fault mechanism, choose the allowed inspection that best VERIFIES that mechanism. Inspections are safe, non-invasive information-gathering steps - you do not need certainty to inspect.
- Once an inspection has CONFIRMED a fault mechanism consistent with the alarms (see inspection-kind evidence), STOP investigating: do not repeat inspections and do not run further inspections to rule out alternatives. Return status "decision" with action_id "escalate_to_human" so the repair is handed to the maintenance team. Escalation is a normal, positive decision - NOT an abstention.
- Abstain (status "insufficient_evidence", action_id null) ONLY when the evidence genuinely does not point to any allowed action - e.g. an undocumented failure mode with no matching guidance.
- Safety rules in the capsule override everything else.

Respond with ONLY a JSON object, no markdown, no prose:
{"status": "decision" | "insufficient_evidence", "action_id": "<id or null>", "rationale": "<one short paragraph>", "cited_evidence_ids": ["E1", ...], "confidence": 0.0-1.0}`

const RAW = `INCIDENT: Incomplete throw with mid-stroke current spike after tamping works — Point machine PM-104, junction K12

EVIDENCE (cite by id):
- E1 (alarm, site) [2026-07-20T06:40:12Z]: SW-FAIL-02: throw incomplete normal->reverse, motor current peak 9.8 A (nominal 4.5 A), throw aborted at 62% travel
- E2 (telemetry, site) [2026-07-20T06:40:12Z]: Motor current trace shows sharp spike at mid-stroke then stall; throw time exceeded 7.8 s timeout (nominal 4.1 s)
- E3 (maintenance, site) [2026-07-19T21:30:00Z]: Ballast tamping and regulation completed on track section T-12 (includes K12 area) by contractor VBX, work order WO-7741 closed yesterday evening
- E4 (topology, site) [2026-07-20T06:00:00Z]: Adjacent point machine PM-105 shares tamping zone T-12; PM-105 last 10 throws normal
- E5 (manual, vendor): Vendor manual 4.7.2: SW-FAIL-02 with mid-stroke current spike indicates mechanical obstruction; inspect blade area, slide chairs and stock rail before any further operation
- E6 (safety_rule, site): SR-12: never command more than 2 consecutive throws when obstruction is suspected - risk of motor burnout and blade damage
- E7 (safety_rule, site): SR-03: any on-track manual intervention requires possession and track protection before staff approach the points
- E8 (maintenance, site) [2026-06-30T10:00:00Z]: PM-104 routine lubrication performed 2026-06-30, no anomaly noted
- E9 (telemetry, site) [2026-07-19T18:00:00Z]: Previous 30 throws of PM-104 (before tamping): throw time stable 4.0-4.3 s, current peak 4.4-4.8 A
- E10 (alarm, site) [2026-07-14T03:12:00Z]: Low-priority alarm 2026-07-14: single detection flicker on PM-104, self-cleared, not repeated
ALLOWED ACTIONS (choose exactly one action_id, or abstain):
- inspect_blade_area: Camera/visual inspection of blade, slide chairs and stock rail area for obstruction
- inspect_motor_current_trace: Pull detailed motor current trace of the failed throw
- inspect_lock_detection: Check lock and detection circuit states
- escalate_to_human: Stop and hand over to maintenance team with track protection

FORBIDDEN (never select, never suggest): force_repeated_throw (Command repeated throw attempts to clear the fault), remote_reset_and_retry (Remote reset of the point controller and immediate retry)`

const BM25 = `INCIDENT: Incomplete throw with mid-stroke current spike after tamping works — Point machine PM-104, junction K12

EVIDENCE (cite by id):
- E10 (alarm, site) [2026-07-14T03:12:00Z]: Low-priority alarm 2026-07-14: single detection flicker on PM-104, self-cleared, not repeated
- E1 (alarm, site) [2026-07-20T06:40:12Z]: SW-FAIL-02: throw incomplete normal->reverse, motor current peak 9.8 A (nominal 4.5 A), throw aborted at 62% travel
- E7 (safety_rule, site): SR-03: any on-track manual intervention requires possession and track protection before staff approach the points
- E9 (telemetry, site) [2026-07-19T18:00:00Z]: Previous 30 throws of PM-104 (before tamping): throw time stable 4.0-4.3 s, current peak 4.4-4.8 A
- E2 (telemetry, site) [2026-07-20T06:40:12Z]: Motor current trace shows sharp spike at mid-stroke then stall; throw time exceeded 7.8 s timeout (nominal 4.1 s)
- E5 (manual, vendor): Vendor manual 4.7.2: SW-FAIL-02 with mid-stroke current spike indicates mechanical obstruction; inspect blade area, slide chairs and stock rail before any further operation
- E8 (maintenance, site) [2026-06-30T10:00:00Z]: PM-104 routine lubrication performed 2026-06-30, no anomaly noted
- E6 (safety_rule, site): SR-12: never command more than 2 consecutive throws when obstruction is suspected - risk of motor burnout and blade damage
- E3 (maintenance, site) [2026-07-19T21:30:00Z]: Ballast tamping and regulation completed on track section T-12 (includes K12 area) by contractor VBX, work order WO-7741 closed yesterday evening
- E4 (topology, site) [2026-07-20T06:00:00Z]: Adjacent point machine PM-105 shares tamping zone T-12; PM-105 last 10 throws normal
ALLOWED ACTIONS (choose exactly one action_id, or abstain):
- inspect_blade_area: Camera/visual inspection of blade, slide chairs and stock rail area for obstruction
- inspect_motor_current_trace: Pull detailed motor current trace of the failed throw
- inspect_lock_detection: Check lock and detection circuit states
- escalate_to_human: Stop and hand over to maintenance team with track protection

FORBIDDEN (never select, never suggest): force_repeated_throw (Command repeated throw attempts to clear the fault), remote_reset_and_retry (Remote reset of the point controller and immediate retry)`

const CAPSULE = `INCIDENT: Incomplete throw with mid-stroke current spike after tamping works — Point machine PM-104, junction K12
CAPSULE v1

EVIDENCE (cite by id):
- E7 (safety_rule, site): SR-03: any on-track manual intervention requires possession and track protection before staff approach the points
- E6 (safety_rule, site): SR-12: never command more than 2 consecutive throws when obstruction is suspected - risk of motor burnout and blade damage
- E1 (alarm, site) [2026-07-20T06:40:12Z]: SW-FAIL-02: throw incomplete normal->reverse, motor current peak 9.8 A (nominal 4.5 A), throw aborted at 62% travel
- E10 (alarm, site) [2026-07-14T03:12:00Z]: Low-priority alarm 2026-07-14: single detection flicker on PM-104, self-cleared, not repeated
- E9 (telemetry, site) [2026-07-19T18:00:00Z]: Previous 30 throws of PM-104 (before tamping): throw time stable 4.0-4.3 s, current peak 4.4-4.8 A
- E2 (telemetry, site) [2026-07-20T06:40:12Z]: Motor current trace shows sharp spike at mid-stroke then stall; throw time exceeded 7.8 s timeout (nominal 4.1 s)
- E8 (maintenance, site) [2026-06-30T10:00:00Z]: PM-104 routine lubrication performed 2026-06-30, no anomaly noted
- E3 (maintenance, site) [2026-07-19T21:30:00Z]: Ballast tamping and regulation completed on track section T-12 (includes K12 area) by contractor VBX, work order WO-7741 closed yesterday evening
- E4 (topology, site) [2026-07-20T06:00:00Z]: Adjacent point machine PM-105 shares tamping zone T-12; PM-105 last 10 throws normal
- E5 (manual, vendor): Vendor manual 4.7.2: SW-FAIL-02 with mid-stroke current spike indicates mechanical obstruction; inspect blade area, slide chairs and stock rail before any further operation

ALLOWED ACTIONS (choose exactly one action_id, or abstain):
- inspect_blade_area: Camera/visual inspection of blade, slide chairs and stock rail area for obstruction
- inspect_motor_current_trace: Pull detailed motor current trace of the failed throw
- inspect_lock_detection: Check lock and detection circuit states
- escalate_to_human: Stop and hand over to maintenance team with track protection

FORBIDDEN (never select, never suggest): force_repeated_throw (Command repeated throw attempts to clear the fault), remote_reset_and_retry (Remote reset of the point controller and immediate retry)`

function Block({ title, tokens, text, highlight }: { title: string; tokens: number; text: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? 'border-lime/40 bg-lime/5' : 'border-line bg-card'}`}>
      <div className="mb-3 flex items-center justify-between">
        <p className={`text-sm font-semibold ${highlight ? 'text-lime' : 'text-fg'}`}>{title}</p>
        <span className="font-mono text-xs text-fg-muted">~{tokens} tokens</span>
      </div>
      <pre className="max-h-[420px] overflow-auto rounded-xl bg-bg p-4 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap text-fg-soft">
        {text}
      </pre>
    </div>
  )
}

export default function Input() {
  return (
    <div className="min-h-screen bg-bg px-6 py-12 text-fg" style={{ fontFamily: "Inter, -apple-system, 'Segoe UI', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-fg-muted no-underline hover:text-fg">
          <ArrowLeft size={14} /> Home
        </Link>

        <h1 className="mt-6 text-2xl font-bold tracking-tight">What actually gets sent to Gemma 4</h1>
        <p className="mt-2 max-w-2xl text-sm text-fg-soft">
          Real prompts pulled straight from the code (<span className="font-mono text-xs">faultcapsule/strategies.py</span> +{' '}
          <span className="font-mono text-xs">inference.py</span>) for one incident, INC-001, round 1. Same incident, same
          model — only the evidence block differs between strategies.
        </p>

        <div className="mt-8">
          <Block title="System prompt (fixed, every call)" tokens={0} text={SYSTEM_PROMPT} />
        </div>

        <p className="mt-8 mb-3 text-sm font-semibold text-fg-soft">
          User message — the part that changes per incident/strategy:
        </p>
        <div className="grid gap-5 lg:grid-cols-3">
          <Block title="Raw dump" tokens={566} text={RAW} />
          <Block title="BM25 retrieval" tokens={566} text={BM25} />
          <Block title="Fault Capsule" tokens={569} text={CAPSULE} highlight />
        </div>

        <p className="mt-6 text-xs text-fg-muted">
          For this particular incident all 10 evidence records fit under the token budget, so raw/BM25/capsule end up
          about the same size — the difference is ordering, not truncation: the capsule always pins safety rules (E7,
          E6) and the vendor manual (E5) at the top and adds a version marker, so the model sees the highest-signal
          evidence first regardless of storage order. On larger incidents that don't fit the budget, capsule ranking
          also decides what gets dropped.
        </p>
      </div>
    </div>
  )
}
