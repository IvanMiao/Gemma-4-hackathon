import { AnimatePresence, motion, type Variants } from 'motion/react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Box,
  ChevronDown,
  ChevronUp,
  CircuitBoard,
  Cpu,
  GitBranch,
  Plus,
  Play,
  PlugZap,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  Zap,
} from 'lucide-react'
import { BrandMark } from '@/components/BrandMark'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getTwinPart, twinParts } from '@/features/digitalTwin/model'
import type { TwinPartId } from '@/features/digitalTwin/model'
import type { DiagnosticPhase } from '@/types/domain'

const PointMachineScene = lazy(() => import('@/components/PointMachineScene'))
const CabinetScene = lazy(() => import('@/components/scenes/CabinetScene'))
const CrossingScene = lazy(() => import('@/components/scenes/CrossingScene'))

type SceneKind = 'turnout' | 'cabinet' | 'crossing'

function pickSceneKind(text: string): SceneKind {
  const t = text.toLowerCase()
  if (/signal box|relay|interface|firmware|breaker|supply|fire|smoke|cabinet|correspondence|correlated/.test(t)) return 'cabinet'
  if (/point machine|blade|throw|motor|obstruction|lubrication|turnout/.test(t)) return 'turnout'
  return 'crossing'
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

const PART_ICONS: Record<TwinPartId, typeof Box> = {
  'point-machine': Box,
  'switch-blade': GitBranch,
  'x3-connector': PlugZap,
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.05, ease: [0.21, 0.6, 0.35, 1] },
  }),
}

interface IncidentSummary {
  id: string
  title: string
  asset: string
  impact?: string
}

interface EvidenceRecord {
  id: string
  kind: string
  summary: string
  source: string
  timestamp: string | null
  trust: string
}

interface ActionSpec {
  id: string
  label: string
  kind: string
}

interface Capsule {
  incident_id: string
  version: number
  parent_version: number | null
  headline: string
  evidence: EvidenceRecord[]
  allowed_actions: ActionSpec[]
  forbidden_note: string
  token_budget: number
  approx_tokens: number
  dropped_evidence_ids: string[]
  performed_actions: string[]
}

interface Decision {
  status: 'decision' | 'insufficient_evidence'
  action_id: string | null
  rationale: string
  cited_evidence_ids: string[]
  confidence: number
}

interface Metrics {
  provider: string
  model: string
  input_tokens: number
  output_tokens: number
  latency_ms: number
  attempts: number
  schema_ok: boolean
  peak_memory_gb: number
}

interface InspectionOutcome {
  action_id: string
  summary: string
  new_evidence: EvidenceRecord[]
}

interface RoundEntry {
  round: number
  capsule: Capsule
  decision: Decision
  metrics: Metrics
  inspection: InspectionOutcome | null
}

interface RunResponse {
  incident: { id: string; title: string; asset: string; description: string; reported: string; impact?: string }
  forbidden_actions: ActionSpec[]
  rounds: RoundEntry[]
  outbound_requests: number
  network_on: boolean
}

interface EvidenceRow {
  kind: string
  summary: string
  trust: string
}

interface ActionRow {
  id: string
  label: string
  outcomeSummary: string
  newEvidenceSummary: string
}

interface ForbiddenRow {
  id: string
  label: string
}

const EVIDENCE_KINDS = ['telemetry', 'alarm', 'maintenance', 'topology', 'manual', 'safety_rule'] as const

interface TraceState {
  seq: number
  active: boolean
  phase: string
  text: string
}

type RunState = 'idle' | 'running' | 'done' | 'error'

const STRATEGIES = [
  { key: 'raw', label: 'Raw dump', blurb: 'Every record, unranked, storage order' },
  { key: 'bm25', label: 'BM25 retrieval', blurb: 'Classic keyword search, top-k' },
  { key: 'capsule', label: 'Fault Capsule', blurb: 'Ranked, budgeted evidence capsule' },
] as const

const KIND_COLOR: Record<string, string> = {
  safety_rule: 'text-red-400',
  alarm: 'text-orange-300',
  telemetry: 'text-sky-300',
  maintenance: 'text-fg-soft',
  topology: 'text-fg-soft',
  manual: 'text-violet-300',
  inspection: 'text-lime',
  web: 'text-fg-muted',
}

function EvidenceLine({ rec, cited, index }: { rec: EvidenceRecord; cited: boolean; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className={`rounded-lg border px-3 py-2 text-[12.5px] leading-relaxed ${
        cited ? 'border-lime/40 bg-lime/5' : 'border-line bg-bg'
      }`}
    >
      <span className="font-mono text-[11px] font-semibold text-fg-muted">{rec.id}</span>{' '}
      <span className={`font-mono text-[10px] uppercase ${KIND_COLOR[rec.kind] ?? 'text-fg-muted'}`}>{rec.kind}</span>
      {cited && <span className="ml-1.5 font-mono text-[10px] text-lime">cited</span>}
      <p className="mt-0.5 text-fg-soft">{rec.summary}</p>
    </motion.li>
  )
}

function LiveTracePanel({ trace }: { trace: TraceState }) {
  const boxRef = useRef<HTMLPreElement>(null)
  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [trace.text])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="relative overflow-hidden rounded-2xl border border-violet-400/30 bg-card p-6 text-center"
    >
      <motion.div
        className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent"
        style={{ boxShadow: '0 0 16px #8f7cff', top: '10%' }}
        animate={{ opacity: [0, 1, 1, 0], y: [0, 60, 120, 170] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative mx-auto flex size-16 items-center justify-center rounded-full border border-violet-400/40" style={{ background: 'radial-gradient(circle, rgba(143,124,255,0.18), transparent 70%)', boxShadow: '0 0 50px rgba(143,124,255,0.14)' }}>
        <span className="pointer-events-none absolute -inset-2.5 rounded-full border border-violet-400/15" />
        <span className="pointer-events-none absolute -inset-5 rounded-full border border-violet-400/10" />
        <BrainCircuit size={26} className="text-violet-300" />
      </div>

      <p className="mt-4 font-mono text-[11px] tracking-[0.1em] text-violet-300 uppercase">
        {trace.phase === 'thinking' ? 'reasoning on-device' : 'composing the decision'}
      </p>
      <strong className="mt-1 block text-[15px] font-semibold text-fg">Gemma 4 is working, live</strong>
      <p className="mx-auto mt-1.5 max-w-[36ch] text-[12.5px] leading-relaxed text-fg-muted">
        Tracing the fault locally, on-device — nothing leaves the site. Every token below is the real model output.
      </p>

      <pre
        ref={boxRef}
        className="mt-4 h-32 overflow-y-auto rounded-xl bg-bg p-3 text-left font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-fg-soft"
      >
        {trace.text || '…'}
        <span className="animate-pulse text-violet-300">▍</span>
      </pre>
    </motion.div>
  )
}

function buildLog(result: RunResponse): string[] {
  const lines: string[] = [`[incident] ${result.incident.id} reported — ${result.incident.title}`]
  for (const entry of result.rounds) {
    const cited = entry.decision.cited_evidence_ids.join(', ') || 'none'
    lines.push(`[round ${entry.round}] capsule v${entry.capsule.version} compiled — ${entry.capsule.evidence.length} evidence, ~${entry.capsule.approx_tokens} tokens`)
    lines.push(`[round ${entry.round}] inference — ${entry.metrics.provider}/${entry.metrics.model} — ${entry.metrics.latency_ms} ms, ${entry.metrics.input_tokens} in / ${entry.metrics.output_tokens} out`)
    lines.push(
      `[round ${entry.round}] decision — ${
        entry.decision.status === 'insufficient_evidence' ? 'insufficient_evidence (abstained)' : entry.decision.action_id
      } — confidence ${Math.round(entry.decision.confidence * 100)}% — cites ${cited}`,
    )
    if (entry.inspection) {
      lines.push(`[round ${entry.round}] field inspection — ${entry.inspection.summary}`)
      if (entry.inspection.new_evidence.length > 0) {
        lines.push(`[round ${entry.round}] +${entry.inspection.new_evidence.length} new evidence record(s) queued for round ${entry.round + 1}`)
      }
    }
  }
  lines.push(`[run] complete — ${result.outbound_requests} outbound request(s) · network ${result.network_on ? 'ON' : 'OFF'}`)
  return lines
}

function LogPanel({ lines }: { lines: string[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-line bg-card p-5">
      <p className="mb-3 flex items-center gap-1.5 font-mono text-[11px] tracking-wide text-fg-muted uppercase">
        <Terminal size={13} /> Run log
      </p>
      <pre className="max-h-56 overflow-y-auto rounded-xl bg-bg p-3 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap text-fg-soft">
        {lines.map((l, i) => `${String(i + 1).padStart(2, '0')}  ${l}`).join('\n')}
      </pre>
    </motion.div>
  )
}

function RoundCard({ entry, forbiddenIds, custom }: { entry: RoundEntry; forbiddenIds: Set<string>; custom: number }) {
  const [showRaw, setShowRaw] = useState(false)
  const cited = new Set(entry.decision.cited_evidence_ids)
  const evidenceIds = new Set(entry.capsule.evidence.map((e) => e.id))
  const citationsValid = cited.size > 0 && [...cited].every((id) => evidenceIds.has(id))
  const unsafe = entry.decision.action_id !== null && forbiddenIds.has(entry.decision.action_id)
  const abstained = entry.decision.status === 'insufficient_evidence'

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={fadeUp}
      custom={custom}
      className="rounded-2xl border border-line bg-card p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-full bg-lime/10 font-mono text-[12px] font-bold text-lime">
            {entry.round}
          </span>
          <p className="text-[13px] font-semibold text-fg">
            Round {entry.round} · Capsule v{entry.capsule.version}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unsafe ? (
            <Badge className="border-red-500/30 bg-red-500/10 text-red-400">
              <ShieldAlert size={12} /> UNSAFE
            </Badge>
          ) : (
            <Badge>
              <ShieldCheck size={12} /> Safe
            </Badge>
          )}
          <Badge variant="outline">{entry.metrics.latency_ms} ms</Badge>
          <Badge variant="outline">{entry.metrics.input_tokens} in / {entry.metrics.output_tokens} out</Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="mb-2 text-[11px] tracking-wide text-fg-muted uppercase">
            Evidence in this capsule ({entry.capsule.evidence.length})
          </p>
          <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1">
            {entry.capsule.evidence.map((rec, i) => (
              <EvidenceLine key={rec.id} rec={rec} cited={cited.has(rec.id)} index={i} />
            ))}
          </ul>
          {entry.capsule.dropped_evidence_ids.length > 0 && (
            <p className="mt-2 font-mono text-[10.5px] text-fg-muted">
              dropped by budget: {entry.capsule.dropped_evidence_ids.join(', ')}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className={`rounded-xl border p-4 ${abstained ? 'border-fg-muted/30 bg-bg' : unsafe ? 'border-red-500/30 bg-red-500/5' : 'border-lime/30 bg-lime/5'}`}>
            <p className="font-mono text-[11px] tracking-wide text-fg-muted uppercase">Decision</p>
            <p className={`mt-1 text-[15px] font-bold ${abstained ? 'text-fg-soft' : unsafe ? 'text-red-400' : 'text-lime'}`}>
              {abstained ? 'insufficient_evidence — abstained' : entry.decision.action_id}
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-fg-soft">{entry.decision.rationale}</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <motion.div
                  className="h-full bg-lime"
                  initial={{ width: 0 }}
                  animate={{ width: `${entry.decision.confidence * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <span className="font-mono text-[11px] text-fg-muted">{Math.round(entry.decision.confidence * 100)}%</span>
            </div>
            <p className="mt-2 font-mono text-[10.5px] text-fg-muted">
              citations: {citationsValid ? 'valid' : cited.size === 0 ? 'none' : 'invalid'} ·{' '}
              {[...cited].join(', ') || '—'}
            </p>
          </div>

          {entry.inspection && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-violet-400/25 bg-violet-400/5 p-4"
            >
              <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-wide text-violet-300 uppercase">
                <Zap size={12} /> Field inspection executed
              </p>
              <p className="mt-1 text-[12.5px] text-fg-soft">{entry.inspection.summary}</p>
              <p className="mt-1.5 font-mono text-[10.5px] text-fg-muted">
                +{entry.inspection.new_evidence.length} new evidence record(s) feed into round {entry.round + 1}
              </p>
            </motion.div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowRaw((v) => !v)}
        className="mt-4 flex items-center gap-1.5 font-mono text-[11px] text-fg-muted hover:text-fg"
      >
        {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />} raw output (capsule + decision + metrics)
      </button>
      {showRaw && (
        <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-bg p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-fg-soft">
          {JSON.stringify({ capsule: entry.capsule, decision: entry.decision, metrics: entry.metrics, inspection: entry.inspection }, null, 2)}
        </pre>
      )}
    </motion.div>
  )
}

export default function Simulator() {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined
  const [incidents, setIncidents] = useState<IncidentSummary[]>([])
  const [selectedIncident, setSelectedIncident] = useState<string>('')
  const [strategy, setStrategy] = useState<(typeof STRATEGIES)[number]['key']>('capsule')
  const [runState, setRunState] = useState<RunState>('idle')
  const [trace, setTrace] = useState<TraceState>({ seq: 0, active: false, phase: '', text: '' })
  const [result, setResult] = useState<RunResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const pollRef = useRef<number | null>(null)

  const [selectedPart, setSelectedPart] = useState<TwinPartId | null>(null)
  const canRender3d = useMemo(supportsWebGL, [])

  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [title, setTitle] = useState('')
  const [asset, setAsset] = useState('')
  const [description, setDescription] = useState('')
  const [impact, setImpact] = useState('')
  const [evidenceRows, setEvidenceRows] = useState<EvidenceRow[]>([{ kind: 'alarm', summary: '', trust: 'site' }])
  const [actionRows, setActionRows] = useState<ActionRow[]>([{ id: '', label: '', outcomeSummary: '', newEvidenceSummary: '' }])
  const [forbiddenRows, setForbiddenRows] = useState<ForbiddenRow[]>([])

  const fetchIncidents = (base: string) =>
    fetch(new URL('/api/state', base))
      .then((r) => r.json())
      .then((d) => {
        setIncidents(d.incidents ?? [])
        if (d.incidents?.[0]) setSelectedIncident((cur) => cur || d.incidents[0].id)
        return d.incidents as IncidentSummary[]
      })

  useEffect(() => {
    if (!base) return
    fetchIncidents(base).catch(() => {})
  }, [base])

  useEffect(() => () => {
    if (pollRef.current) window.clearInterval(pollRef.current)
  }, [])

  const addEvidenceRow = () => setEvidenceRows((r) => [...r, { kind: 'alarm', summary: '', trust: 'site' }])
  const removeEvidenceRow = (i: number) => setEvidenceRows((r) => r.filter((_, idx) => idx !== i))
  const updateEvidenceRow = (i: number, patch: Partial<EvidenceRow>) =>
    setEvidenceRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))

  const addActionRow = () => setActionRows((r) => [...r, { id: '', label: '', outcomeSummary: '', newEvidenceSummary: '' }])
  const removeActionRow = (i: number) => setActionRows((r) => r.filter((_, idx) => idx !== i))
  const updateActionRow = (i: number, patch: Partial<ActionRow>) =>
    setActionRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))

  const addForbiddenRow = () => setForbiddenRows((r) => [...r, { id: '', label: '' }])
  const removeForbiddenRow = (i: number) => setForbiddenRows((r) => r.filter((_, idx) => idx !== i))
  const updateForbiddenRow = (i: number, patch: Partial<ForbiddenRow>) =>
    setForbiddenRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))

  const submitCustomIncident = async () => {
    if (!base) return
    setCreateError('')
    if (!title.trim() || !asset.trim() || !description.trim()) {
      setCreateError('Title, asset and description are required.')
      return
    }
    const cleanEvidence = evidenceRows.filter((e) => e.summary.trim())
    if (cleanEvidence.length === 0) {
      setCreateError('Add at least one piece of evidence.')
      return
    }
    const cleanActions = actionRows.filter((a) => a.id.trim() && a.label.trim())
    if (cleanActions.length === 0) {
      setCreateError('Add at least one allowed inspection action.')
      return
    }

    setCreating(true)
    try {
      const res = await fetch(new URL('/api/incidents/custom', base), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          asset,
          description,
          impact,
          evidence: cleanEvidence,
          allowed_actions: cleanActions.map((a) => ({
            id: a.id,
            label: a.label,
            outcome_summary: a.outcomeSummary,
            new_evidence_summary: a.newEvidenceSummary,
          })),
          forbidden_actions: forbiddenRows.filter((f) => f.id.trim() && f.label.trim()),
        }),
      })
      if (!res.ok) throw new Error(`Backend returned ${res.status}`)
      const data = (await res.json()) as { id: string }
      await fetchIncidents(base)
      setSelectedIncident(data.id)
      setShowCreate(false)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not create the incident')
    } finally {
      setCreating(false)
    }
  }

  const runSimulation = async () => {
    if (!base || !selectedIncident) return
    setRunState('running')
    setResult(null)
    setErrorMsg('')
    setTrace({ seq: 0, active: true, phase: '', text: '' })

    pollRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(new URL('/api/trace', base))
        const data = (await res.json()) as TraceState
        setTrace(data)
      } catch {
        // keep last known trace
      }
    }, 350)

    try {
      const res = await fetch(new URL('/api/run', base), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident_id: selectedIncident, strategy, with_web_evidence: false }),
      })
      if (!res.ok) throw new Error(`Backend returned ${res.status}`)
      const data = (await res.json()) as RunResponse
      setResult(data)
      setRunState('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Simulation failed')
      setRunState('error')
    } finally {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }

  const reset = () => {
    setRunState('idle')
    setResult(null)
    setErrorMsg('')
  }

  const forbiddenIds = useMemo(() => new Set((result?.forbidden_actions ?? []).map((a) => a.id)), [result])
  const isRunning = runState === 'running'

  const isResolved = result
    ? (() => {
        const last = result.rounds[result.rounds.length - 1]
        return last.decision.action_id === 'escalate_to_human' || last.decision.status === 'insufficient_evidence'
      })()
    : false

  const twinPhase: DiagnosticPhase =
    runState === 'error' ? 'error' : isRunning ? 'analyzing' : result ? (isResolved ? 'resolved' : 'decision-ready') : 'idle'

  const selectedIncidentObj = incidents.find((inc) => inc.id === selectedIncident)
  const sceneKind: SceneKind = useMemo(() => {
    const source = result ? `${result.incident.title} ${result.incident.asset}` : `${selectedIncidentObj?.title ?? ''} ${selectedIncidentObj?.asset ?? ''}`
    return pickSceneKind(source)
  }, [result, selectedIncidentObj])

  useEffect(() => {
    if (twinPhase === 'idle') {
      setSelectedPart(null)
      return
    }
    if (twinPhase === 'analyzing') {
      setSelectedPart('point-machine')
      return
    }
    if (twinPhase === 'decision-ready' || twinPhase === 'resolved') {
      setSelectedPart('x3-connector')
    }
  }, [twinPhase])

  return (
    <div className="min-h-screen bg-bg text-fg" style={{ fontFamily: "Inter, -apple-system, 'Segoe UI', system-ui, sans-serif" }}>
      <nav className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-fg no-underline">
            <BrandMark />
            Fault Capsule
          </Link>
          <div className="flex items-center gap-2.5">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft size={14} /> Home
              </Button>
            </Link>
            <Link to="/journey">
              <Button variant="ghost" size="sm">
                How it works
              </Button>
            </Link>
            <Link to="/observability">
              <Button variant="ghost" size="sm">
                Observability
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="sm">
                Open console <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <header className="mx-auto max-w-3xl px-6 pt-14 pb-8 text-center">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <Badge>
            <Activity size={12} /> Live simulator · real local Gemma 4, real incidents
          </Badge>
        </motion.div>
        <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1} className="mt-5 text-4xl font-bold tracking-tight text-balance">
          Simulate an incident. <span className="text-lime">Watch it think.</span>
        </motion.h1>
        <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2} className="mt-4 text-[15px] leading-relaxed text-fg-soft">
          Pick a real incident and a context strategy, then run it against the actual on-device Gemma 4 E2B model —
          live token stream, real capsule, real decision. Nothing here is precomputed.
        </motion.p>
      </header>

      <div className="mx-auto max-w-5xl px-6 pb-6">
        <div className="relative h-[420px] overflow-hidden rounded-2xl border border-line bg-card">
          {canRender3d ? (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center font-mono text-xs text-fg-muted">
                  building live twin…
                </div>
              }
            >
              {sceneKind === 'turnout' && (
                <PointMachineScene phase={twinPhase} selectedPart={selectedPart} onSelectPart={setSelectedPart} />
              )}
              {sceneKind === 'cabinet' && <CabinetScene phase={twinPhase} />}
              {sceneKind === 'crossing' && <CrossingScene phase={twinPhase} />}
            </Suspense>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-fg-muted">
              3D view unavailable — this browser doesn't support WebGL.
            </div>
          )}

          <div className="pointer-events-none absolute top-4 left-4 flex items-center gap-2 rounded-full border border-line bg-bg/80 px-3 py-1.5 backdrop-blur-sm">
            <span
              className={`size-1.5 rounded-full ${
                twinPhase === 'resolved'
                  ? 'bg-lime'
                  : twinPhase === 'analyzing'
                    ? 'animate-pulse bg-orange-300'
                    : twinPhase === 'error'
                      ? 'bg-red-400'
                      : 'bg-fg-muted'
              }`}
            />
            <span className="font-mono text-[10.5px] tracking-wide text-fg-soft uppercase">
              {sceneKind === 'cabinet' ? 'relay cabinet' : sceneKind === 'crossing' ? 'track sensor' : 'digital twin'} ·{' '}
              {twinPhase === 'idle' && 'standing by'}
              {twinPhase === 'analyzing' && 'gemma reasoning'}
              {twinPhase === 'decision-ready' && 'awaiting escalation'}
              {twinPhase === 'resolved' && 'resolved'}
              {twinPhase === 'error' && 'error'}
            </span>
          </div>

          {sceneKind === 'turnout' && (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
              {twinParts.map((part) => {
                const Icon = PART_ICONS[part.id]
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => setSelectedPart(part.id)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10.5px] backdrop-blur-sm transition-colors ${
                      selectedPart === part.id
                        ? 'border-lime/50 bg-lime/10 text-lime'
                        : 'border-line bg-bg/80 text-fg-soft hover:border-line-strong'
                    }`}
                  >
                    <Icon size={12} /> {getTwinPart(part.id).shortLabel}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        {!base ? (
          <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-fg-soft">
            Backend unreachable — start it with{' '}
            <span className="font-mono text-xs text-lime">uv run uvicorn faultcapsule.app:app --port 8000</span> and set{' '}
            <span className="font-mono text-xs text-lime">VITE_API_BASE_URL</span>.
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-line bg-card p-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] tracking-wide text-fg-muted uppercase">1. Pick an incident to simulate</p>
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={() => setShowCreate((v) => !v)}
                  className="flex items-center gap-1.5 font-mono text-[11px] text-lime hover:text-lime-strong disabled:opacity-50"
                >
                  <Plus size={13} /> {showCreate ? 'cancel' : 'create your own accident'}
                </button>
              </div>

              {showCreate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-5 overflow-hidden rounded-xl border border-violet-400/30 bg-violet-400/5 p-4"
                >
                  <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold text-violet-300">
                    <AlertOctagon size={14} /> Author a new incident — it runs through the exact same pipeline
                  </p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <input
                      placeholder="Title — what happened"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="rounded-lg border border-line bg-bg px-3 py-2 text-[12.5px] text-fg outline-none focus:border-lime/50"
                    />
                    <input
                      placeholder="Asset — e.g. Point machine PM-900, yard Z2"
                      value={asset}
                      onChange={(e) => setAsset(e.target.value)}
                      className="rounded-lg border border-line bg-bg px-3 py-2 text-[12.5px] text-fg outline-none focus:border-lime/50"
                    />
                  </div>
                  <textarea
                    placeholder="Description — what the incident is"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="mt-2.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-[12.5px] text-fg outline-none focus:border-lime/50"
                  />
                  <textarea
                    placeholder="Impact if unresolved — e.g. blocks 14 trains/hour, throat closed"
                    value={impact}
                    onChange={(e) => setImpact(e.target.value)}
                    rows={2}
                    className="mt-2.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-[12.5px] text-fg outline-none focus:border-lime/50"
                  />

                  <p className="mt-4 mb-2 text-[11px] tracking-wide text-fg-muted uppercase">Evidence</p>
                  <div className="flex flex-col gap-2">
                    {evidenceRows.map((row, i) => (
                      <div key={i} className="flex gap-2">
                        <select
                          value={row.kind}
                          onChange={(e) => updateEvidenceRow(i, { kind: e.target.value })}
                          className="rounded-lg border border-line bg-bg px-2 py-2 text-[11.5px] text-fg-soft outline-none"
                        >
                          {EVIDENCE_KINDS.map((k) => (
                            <option key={k} value={k}>
                              {k}
                            </option>
                          ))}
                        </select>
                        <input
                          placeholder="Evidence summary — e.g. alarm code, telemetry reading..."
                          value={row.summary}
                          onChange={(e) => updateEvidenceRow(i, { summary: e.target.value })}
                          className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-[12.5px] text-fg outline-none focus:border-lime/50"
                        />
                        <button type="button" onClick={() => removeEvidenceRow(i)} className="px-2 text-fg-muted hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addEvidenceRow} className="flex w-fit items-center gap-1 font-mono text-[11px] text-fg-muted hover:text-fg">
                      <Plus size={12} /> add evidence
                    </button>
                  </div>

                  <p className="mt-4 mb-2 text-[11px] tracking-wide text-fg-muted uppercase">
                    Allowed inspection actions — what each one reveals for round 2
                  </p>
                  <div className="flex flex-col gap-2">
                    {actionRows.map((row, i) => (
                      <div key={i} className="rounded-lg border border-line bg-bg p-2.5">
                        <div className="flex gap-2">
                          <input
                            placeholder="action_id — e.g. inspect_relay_cabinet"
                            value={row.id}
                            onChange={(e) => updateActionRow(i, { id: e.target.value })}
                            className="w-1/2 rounded-lg border border-line bg-card px-2.5 py-1.5 font-mono text-[11.5px] text-fg outline-none focus:border-lime/50"
                          />
                          <input
                            placeholder="Label — e.g. Inspect relay cabinet"
                            value={row.label}
                            onChange={(e) => updateActionRow(i, { label: e.target.value })}
                            className="flex-1 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[11.5px] text-fg outline-none focus:border-lime/50"
                          />
                          <button type="button" onClick={() => removeActionRow(i)} className="px-1.5 text-fg-muted hover:text-red-400">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <input
                          placeholder="What the inspection finds (outcome summary)"
                          value={row.outcomeSummary}
                          onChange={(e) => updateActionRow(i, { outcomeSummary: e.target.value })}
                          className="mt-1.5 w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-[11.5px] text-fg-soft outline-none focus:border-lime/50"
                        />
                        <input
                          placeholder="New evidence it adds for round 2 (optional)"
                          value={row.newEvidenceSummary}
                          onChange={(e) => updateActionRow(i, { newEvidenceSummary: e.target.value })}
                          className="mt-1.5 w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-[11.5px] text-fg-soft outline-none focus:border-lime/50"
                        />
                      </div>
                    ))}
                    <button type="button" onClick={addActionRow} className="flex w-fit items-center gap-1 font-mono text-[11px] text-fg-muted hover:text-fg">
                      <Plus size={12} /> add action
                    </button>
                  </div>

                  <p className="mt-4 mb-2 text-[11px] tracking-wide text-fg-muted uppercase">Forbidden actions (optional)</p>
                  <div className="flex flex-col gap-2">
                    {forbiddenRows.map((row, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          placeholder="action_id"
                          value={row.id}
                          onChange={(e) => updateForbiddenRow(i, { id: e.target.value })}
                          className="w-1/3 rounded-lg border border-line bg-bg px-2.5 py-1.5 font-mono text-[11.5px] text-fg outline-none focus:border-lime/50"
                        />
                        <input
                          placeholder="label"
                          value={row.label}
                          onChange={(e) => updateForbiddenRow(i, { label: e.target.value })}
                          className="flex-1 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-[11.5px] text-fg outline-none focus:border-lime/50"
                        />
                        <button type="button" onClick={() => removeForbiddenRow(i)} className="px-1.5 text-fg-muted hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addForbiddenRow} className="flex w-fit items-center gap-1 font-mono text-[11px] text-fg-muted hover:text-fg">
                      <Plus size={12} /> add forbidden action
                    </button>
                  </div>

                  {createError && <p className="mt-3 text-[12px] text-red-400">{createError}</p>}
                  <Button onClick={submitCustomIncident} disabled={creating} className="mt-4">
                    {creating ? 'Creating…' : 'Create & select this incident'}
                  </Button>
                </motion.div>
              )}

              <div className="grid gap-2.5 sm:grid-cols-2">
                {incidents.map((inc) => (
                  <button
                    key={inc.id}
                    type="button"
                    disabled={isRunning}
                    onClick={() => setSelectedIncident(inc.id)}
                    className={`rounded-xl border px-4 py-3 text-left text-[12.5px] transition-colors ${
                      selectedIncident === inc.id
                        ? 'border-lime/50 bg-lime/10 text-fg'
                        : 'border-line bg-bg text-fg-soft hover:border-line-strong'
                    } disabled:opacity-50`}
                  >
                    <span className="font-mono text-[10.5px] text-fg-muted">{inc.id}</span>
                    {inc.id.startsWith('CUSTOM-') && (
                      <span className="ml-1.5 font-mono text-[10px] text-violet-300">operator-authored</span>
                    )}
                    <p className="mt-0.5 font-medium">{inc.title}</p>
                    <p className="mt-0.5 text-[11px] text-fg-muted">{inc.asset}</p>
                    {inc.impact && <p className="mt-1 text-[11px] text-orange-300">impact: {inc.impact}</p>}
                  </button>
                ))}
              </div>

              <p className="mt-6 mb-3 text-[11px] tracking-wide text-fg-muted uppercase">2. Pick the context strategy — different input, same model</p>
              <div className="flex flex-wrap gap-2.5">
                {STRATEGIES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    disabled={isRunning}
                    onClick={() => setStrategy(s.key)}
                    className={`rounded-xl border px-4 py-2.5 text-left text-[12.5px] transition-colors disabled:opacity-50 ${
                      strategy === s.key ? 'border-lime/50 bg-lime/10 text-lime' : 'border-line bg-bg text-fg-soft hover:border-line-strong'
                    }`}
                  >
                    <p className="font-semibold">{s.label}</p>
                    <p className="text-[10.5px] text-fg-muted">{s.blurb}</p>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Button onClick={runSimulation} disabled={isRunning || !selectedIncident} size="lg">
                  {isRunning ? (
                    <>
                      <CircuitBoard size={16} className="animate-spin" /> Running on-device…
                    </>
                  ) : (
                    <>
                      <Play size={16} /> Run live diagnosis
                    </>
                  )}
                </Button>
                {(runState === 'done' || runState === 'error') && (
                  <Button variant="outline" size="lg" onClick={reset}>
                    <RotateCcw size={14} /> Reset
                  </Button>
                )}
                <span className="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-fg-muted">
                  <Cpu size={13} /> hf.co/unsloth/gemma-4-E2B-it · Ollama · local
                </span>
              </div>
            </div>

            <AnimatePresence>
              {isRunning && trace.active && (
                <div className="mt-6">
                  <LiveTracePanel trace={trace} />
                </div>
              )}
            </AnimatePresence>

            {errorMsg && (
              <div className="mt-6 flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
                <AlertTriangle size={15} /> {errorMsg}
              </div>
            )}

            {result && (
              <div className="mt-6 flex flex-col gap-5">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-line bg-card p-5">
                  <p className="text-[13px] font-semibold text-fg">{result.incident.title}</p>
                  <p className="mt-1 text-[12.5px] text-fg-soft">{result.incident.description}</p>
                  <p className="mt-2 font-mono text-[11px] text-fg-muted">{result.incident.asset} · reported {result.incident.reported}</p>
                  {result.incident.impact && (
                    <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-orange-400/25 bg-orange-400/5 px-3 py-2 text-[12px] text-orange-300">
                      <AlertOctagon size={14} className="mt-0.5 shrink-0" /> Impact if unresolved: {result.incident.impact}
                    </p>
                  )}
                </motion.div>

                {result.rounds.map((entry, i) => (
                  <RoundCard key={entry.round} entry={entry} forbiddenIds={forbiddenIds} custom={i} />
                ))}

                {(() => {
                  const last = result.rounds[result.rounds.length - 1]
                  const resolved = last.decision.action_id === 'escalate_to_human' || last.decision.status === 'insufficient_evidence'
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-2xl border p-5 text-center ${resolved ? 'border-lime/30 bg-lime/5' : 'border-orange-400/30 bg-orange-400/5'}`}
                    >
                      <p className={`text-[13px] font-semibold ${resolved ? 'text-lime' : 'text-orange-300'}`}>
                        {resolved ? 'Impact contained — handed to maintenance' : 'Impact ongoing — still under diagnosis'}
                      </p>
                      <p className="mt-1 text-[12px] text-fg-soft">
                        {result.rounds.length} round(s) · {result.outbound_requests} outbound request(s) · network{' '}
                        {result.network_on ? 'ON' : 'OFF'}
                      </p>
                    </motion.div>
                  )
                })()}

                <LogPanel lines={buildLog(result)} />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
