import { motion, type Variants } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowLeft, ArrowRight, Cpu, Globe, Server } from 'lucide-react'
import { BrandMark } from '@/components/BrandMark'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import laptopRun from '../../results/laptop-ollama-gemma4-e2b.json'
import gpuRun from '../../results/nvidia-l40s-vllm-gemma4-e2b.json'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.06, ease: [0.21, 0.6, 0.35, 1] },
  }),
}

interface StrategySummary {
  rounds_scored: number
  next_action_accuracy: number
  unsafe_action_rate: number
  citation_validity: number
  schema_failure_rate: number
  abstention_rate: number
  mean_latency_ms: number
  mean_input_tokens: number
}

interface RunFile {
  adapter: { provider: string; model: string }
  outbound_requests: number
  summary: Record<string, StrategySummary>
  per_round: {
    round: number
    strategy: string
    incident_id: string
    chosen_action: string | null
    expected_action: string
    correct: boolean
    unsafe: boolean
  }[]
}

interface LiveState {
  network_on: boolean
  outbound_requests: number
  adapter: { provider: string; model: string }
  serpapi: { loaded: boolean; key_configured: boolean }
}

const STRATEGY_LABELS: Record<string, string> = {
  rule: 'Rule baseline',
  raw: 'Raw dump',
  bm25: 'BM25 retrieval',
  capsule: 'Fault Capsule',
}

function pct(v: number) {
  return `${Math.round(v * 1000) / 10}%`
}

function RunCard({ title, icon: Icon, run, custom }: { title: string; icon: typeof Cpu; run: RunFile; custom: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={fadeUp}
      custom={custom}
      className="rounded-2xl border border-line bg-card p-6"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-lime/10">
          <Icon size={17} className="text-lime" />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-fg">{title}</p>
          <p className="font-mono text-[11px] text-fg-muted">
            {run.adapter.provider} · {run.adapter.model} · outbound {run.outbound_requests}
          </p>
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-[11px] tracking-wide text-fg-muted uppercase">
              <th className="py-2 pr-3 font-medium">Strategy</th>
              <th className="py-2 pr-3 font-medium">Accuracy</th>
              <th className="py-2 pr-3 font-medium">Unsafe</th>
              <th className="py-2 pr-3 font-medium">Citations</th>
              <th className="py-2 pr-3 font-medium">Schema fails</th>
              <th className="py-2 font-medium">Latency</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(run.summary).map(([key, s]) => {
              const highlight = key === 'capsule'
              return (
                <tr key={key} className={`border-b border-line/60 ${highlight ? 'text-fg' : 'text-fg-soft'}`}>
                  <td className={`py-2.5 pr-3 font-medium ${highlight ? 'text-lime' : ''}`}>{STRATEGY_LABELS[key] ?? key}</td>
                  <td className={`py-2.5 pr-3 font-mono tabular-nums ${highlight ? 'font-bold text-lime' : ''}`}>{pct(s.next_action_accuracy)}</td>
                  <td className="py-2.5 pr-3 font-mono tabular-nums">{pct(s.unsafe_action_rate)}</td>
                  <td className="py-2.5 pr-3 font-mono tabular-nums">{key === 'rule' ? '—' : pct(s.citation_validity)}</td>
                  <td className="py-2.5 pr-3 font-mono tabular-nums">{pct(s.schema_failure_rate)}</td>
                  <td className="py-2.5 font-mono tabular-nums">{key === 'rule' ? '—' : `${s.mean_latency_ms} ms`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

export default function Observability() {
  const [live, setLive] = useState<LiveState | null>(null)
  const [liveError, setLiveError] = useState(false)

  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL
    if (!base) {
      setLiveError(true)
      return
    }
    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch(new URL('/api/state', base))
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as LiveState
        if (!cancelled) {
          setLive(data)
          setLiveError(false)
        }
      } catch {
        if (!cancelled) setLiveError(true)
      }
    }
    poll()
    const t = setInterval(poll, 5000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  const gpuCapsule = (gpuRun as RunFile).summary.capsule
  const laptopCapsule = (laptopRun as RunFile).summary.capsule
  const speedup = laptopCapsule && gpuCapsule ? (laptopCapsule.mean_latency_ms / gpuCapsule.mean_latency_ms).toFixed(1) : '—'
  const perRound = (laptopRun as RunFile).per_round.filter((r) => r.strategy === 'capsule')

  return (
    <div className="min-h-screen bg-bg text-fg" style={{ fontFamily: "Inter, -apple-system, 'Segoe UI', system-ui, sans-serif" }}>
      {/* Nav */}
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
            <Link to="/simulator">
              <Button variant="ghost" size="sm">
                Live simulator
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

      {/* Header */}
      <header className="mx-auto max-w-3xl px-6 pt-16 pb-10 text-center">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <Badge>Observability · real runs, honest scoring</Badge>
        </motion.div>
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
          className="mt-6 text-4xl font-bold tracking-tight text-balance md:text-5xl"
        >
          Every decision <span className="text-lime">measured</span>
        </motion.h1>
        <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2} className="mt-5 text-lg leading-relaxed text-fg-soft">
          Live runtime state, and the committed benchmark results behind every number on the landing page — including the
          runs that failed or abstained.
        </motion.p>
      </header>

      <section className="mx-auto flex max-w-5xl flex-col gap-6 px-6 pb-16">
        {/* Live runtime */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
          className="rounded-2xl border border-line bg-card p-6"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex size-9 items-center justify-center rounded-full bg-lime/10">
              <Activity size={17} className="text-lime" />
              {live && <span className="absolute -top-0.5 -right-0.5 size-2.5 animate-pulse rounded-full bg-lime" />}
            </span>
            <p className="text-[15px] font-semibold text-fg">Live runtime</p>
          </div>
          {live ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Inference backend', value: `${live.adapter.provider}` },
                { label: 'Model', value: live.adapter.model.split('/').pop() ?? live.adapter.model },
                { label: 'Network mode', value: live.network_on ? 'ON' : 'OFF' },
                { label: 'Outbound requests', value: String(live.outbound_requests) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-bg px-4 py-3">
                  <p className="text-[11px] tracking-wide text-fg-muted uppercase">{item.label}</p>
                  <p className="mt-1 truncate font-mono text-sm font-semibold text-fg" title={item.value}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-fg-soft">
              {liveError
                ? 'Backend unreachable — start it with `uv run uvicorn faultcapsule.app:app --port 8000` to see live state.'
                : 'Connecting…'}
            </p>
          )}
        </motion.div>

        {/* Benchmarks */}
        <RunCard title="On-device · MacBook (Ollama, Q4_K_M)" icon={Cpu} run={laptopRun as RunFile} custom={0} />
        <RunCard title="NVIDIA L40S (vLLM 0.26, bf16)" icon={Server} run={gpuRun as RunFile} custom={1} />

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
          className="text-center text-sm text-fg-soft"
        >
          Same adapter, same capsules, same scoring — the GPU serves the same model <span className="font-semibold text-lime">{speedup}× faster</span>.
          Raw files: <span className="font-mono text-[12px]">results/*.json</span> in the repository.
        </motion.p>

        {/* Per-round detail */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
          className="rounded-2xl border border-line bg-card p-6"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-lime/10">
              <Globe size={17} className="text-lime" />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-fg">Per-round detail — Capsule strategy, on-device run</p>
              <p className="text-[12px] text-fg-muted">Nothing dropped: the one miss (the INC-006 abstention case) is right there.</p>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] tracking-wide text-fg-muted uppercase">
                  <th className="py-2 pr-3 font-medium">Incident</th>
                  <th className="py-2 pr-3 font-medium">Round</th>
                  <th className="py-2 pr-3 font-medium">Model chose</th>
                  <th className="py-2 pr-3 font-medium">Expected</th>
                  <th className="py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {perRound.map((r) => (
                  <tr key={`${r.incident_id}-${r.round}`} className="border-b border-line/60 text-fg-soft">
                    <td className="py-2 pr-3 font-mono">{r.incident_id}</td>
                    <td className="py-2 pr-3 font-mono">{r.round}</td>
                    <td className="py-2 pr-3 font-mono">{r.chosen_action ?? 'insufficient_evidence'}</td>
                    <td className="py-2 pr-3 font-mono">{r.expected_action}</td>
                    <td className={`py-2 font-semibold ${r.correct ? 'text-lime' : 'text-fg-muted'}`}>
                      {r.correct ? 'correct' : r.unsafe ? 'UNSAFE' : 'miss'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-line px-6 py-10 text-center text-xs text-fg-muted">
        Benchmark: 6 synthetic incidents × 4 strategies × 2 rounds · abstentions and schema failures scored, never dropped
      </footer>
    </div>
  )
}
