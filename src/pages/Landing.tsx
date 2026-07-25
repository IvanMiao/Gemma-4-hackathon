import { AnimatePresence, animate, motion, useInView, type Variants } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CircuitBoard,
  FileSearch,
  Layers,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const REPO_URL = 'https://github.com/IvanMiao/Gemma-4-hackathon'

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.66.41.36.78 1.05.78 2.13v3.16c0 .3.21.67.8.55A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.09, ease: [0.21, 0.6, 0.35, 1] },
  }),
}

function Stat({ value, suffix, label, decimals = 0 }: { value: number; suffix: string; label: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v.toFixed(decimals)),
    })
    return () => controls.stop()
  }, [inView, value, decimals])

  return (
    <div className="flex flex-col items-center gap-1.5 px-8 py-7">
      <span ref={ref} className="text-5xl font-bold tracking-tight text-fg tabular-nums">
        {display}
        <span className="text-3xl text-lime">{suffix}</span>
      </span>
      <span className="text-center text-xs font-medium text-fg-muted">{label}</span>
    </div>
  )
}

/* --- Hero collage (qount-style product preview) --- */

const ALERTS = [
  {
    risk: 'SW-FAIL-02',
    title: 'PM-104 · Junction K12',
    sub: 'Incomplete throw, current spike 9.8 A',
    tag: 'Throw aborted at 62%',
    decision: 'inspect_blade_area',
    analysis: ['Tamping works closed yesterday (WO-7741)', 'Current spike at mid-stroke, motor healthy', 'Manual 4.7.2: obstruction — inspect blades'],
  },
  {
    risk: 'PWR-TRIP-07',
    title: 'PM-311 · Freight loop F2',
    sub: 'Breaker C-311 tripped on earth fault',
    tag: 'Insulation collapsed at 11:31',
    decision: 'inspect_insulation_resistance',
    analysis: ['Trenching works on cable route CR-9', 'Insulation 12 MΩ → 0.1 MΩ', 'SR-30: never reset before IR test passes'],
  },
]

const SOURCES = [
  { group: 'Signals', items: 'Telemetry · Alarms' },
  { group: 'Records', items: 'Maintenance · Topology' },
  { group: 'Rules', items: 'Manuals · Safety rules' },
]

function HeroCollage() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx((v) => (v + 1) % ALERTS.length), 4200)
    return () => clearInterval(t)
  }, [])
  const alert = ALERTS[idx]

  return (
    <div className="relative hidden items-center gap-5 lg:flex">
      {/* Source lists */}
      <div className="flex w-44 shrink-0 flex-col gap-4">
        {SOURCES.map((s, i) => (
          <motion.div
            key={s.group}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.15, duration: 0.5 }}
          >
            <p className="mb-1.5 text-xs text-fg-muted">{s.group}</p>
            <div className="rounded-xl border border-line bg-card px-4 py-3">
              <p className="text-[13px] font-medium text-fg">{s.items}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Dashed connector + node */}
      <div className="relative flex h-full w-10 shrink-0 items-center justify-center">
        <svg className="absolute h-64 w-10" viewBox="0 0 40 256" fill="none" aria-hidden="true">
          <path d="M0 40 C24 40 16 128 40 128 M0 128 H40 M0 216 C24 216 16 128 40 128" stroke="#3a3a3a" strokeWidth="1.5" strokeDasharray="3 4" />
        </svg>
        <motion.span
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative z-1 size-3 rotate-45 rounded-[3px] bg-lime shadow-[0_0_16px_rgb(214_242_66/60%)]"
        />
      </div>

      {/* Console preview */}
      <div className="flex w-90 shrink-0 flex-col gap-3">
        {/* White alert card */}
        <div className="relative">
          <div className="absolute -top-2 right-2 left-2 h-full rounded-2xl bg-card-raised" />
          <AnimatePresence mode="wait">
            <motion.div
              key={alert.risk}
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.985 }}
              transition={{ duration: 0.45, ease: [0.21, 0.6, 0.35, 1] }}
              className="relative rounded-2xl bg-paper p-4 text-ink shadow-xl"
            >
              <div className="flex items-center justify-between">
                <Badge variant="paper">{alert.risk}</Badge>
                <Bell size={14} className="text-ink/50" />
              </div>
              <p className="mt-2.5 text-[15px] font-bold">{alert.title}</p>
              <p className="text-[13px] text-ink/60">{alert.sub}</p>
              <div className="mt-2.5 rounded-lg border border-ink/10 px-3 py-1.5 text-xs text-ink/70">{alert.tag}</div>
              <div className="mt-2.5 flex items-center justify-between text-xs">
                <span className="rounded-md bg-ink/6 px-2 py-1 font-mono text-[11px] text-ink/70">Capsule v1</span>
                <span className="inline-flex items-center gap-1 font-medium text-ink/70">
                  Review <ArrowUpRight size={12} />
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Analysis card */}
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-fg">
            <Sparkles size={14} className="text-lime" /> Gemma 4 analysis
          </p>
          <div className="mt-2.5 flex flex-col gap-1.5">
            <AnimatePresence mode="wait">
              <motion.div
                key={alert.risk}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col gap-1.5"
              >
                {alert.analysis.map((line) => (
                  <p key={line} className="flex items-start gap-2 text-xs text-fg-soft">
                    <span className="mt-1 size-1.5 shrink-0 rotate-45 bg-lime/70" /> {line}
                  </p>
                ))}
                <p className="mt-1.5 inline-flex items-center gap-2 font-mono text-xs text-lime">
                  → {alert.decision}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { v: '90.9%', l: 'Accuracy' },
            { v: '0', l: 'Unsafe' },
            { v: '0', l: 'Outbound' },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-line bg-card px-3 py-2.5">
              <p className="text-lg font-bold text-fg tabular-nums">{s.v}</p>
              <p className="text-[11px] text-fg-muted">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const PIPELINE = ['Incident data', 'Evidence Compiler', 'Capsule V1', 'Gemma 4 decision', 'Field inspection', 'Capsule V2', 'Escalate or stop']

const FEATURES = [
  {
    icon: WifiOff,
    title: 'Fully on-device',
    body: 'Gemma 4 E2B runs locally via Ollama. Network OFF by default, transport-level guard, live outbound-request counter stuck at zero. OT data never leaves the site.',
  },
  {
    icon: Layers,
    title: 'Incident Capsules',
    body: 'A deterministic, label-blind compiler ranks telemetry, alarms, maintenance history, topology and safety rules into a compact, versioned, token-budgeted capsule.',
  },
  {
    icon: ShieldCheck,
    title: 'Safe by construction',
    body: 'Actions come from a whitelist only. Forbidden actions are never executable. Safety rules always survive the token budget. The model may abstain instead of guessing.',
  },
  {
    icon: FileSearch,
    title: 'Auditable decisions',
    body: 'Every decision cites evidence IDs that resolve in the exact capsule version the model saw. Each run is replayable, each capsule immutable.',
  },
  {
    icon: CircuitBoard,
    title: 'Laptop to GPU fleet',
    body: 'The same adapter serves Ollama on a MacBook and vLLM on an NVIDIA L40S: identical decisions, 4.7× faster on GPU (~950 ms per decision).',
  },
]

const BENCH = [
  { name: 'Rule baseline', acc: 41.7, note: 'no LLM' },
  { name: 'Raw dump', acc: 45.5, note: 'same Gemma 4' },
  { name: 'BM25 retrieval', acc: 50.0, note: 'same Gemma 4' },
  { name: 'Fault Capsule', acc: 90.9, note: 'same Gemma 4', highlight: true },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg text-fg" style={{ fontFamily: "Inter, -apple-system, 'Segoe UI', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-lime text-[26px] leading-none text-ink">⚙</span>
            Fault Capsule
          </span>
          <div className="flex items-center gap-2.5">
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm">
                <GithubIcon size={14} /> GitHub
              </Button>
            </a>
            <a href={REPO_URL + '/blob/main/WRITEUP.md'} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="sm">
                Writeup
              </Button>
            </a>
            <Link to="/dashboard">
              <Button size="sm">
                Open console <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto grid max-w-6xl items-center gap-14 px-6 pt-20 pb-20 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <Badge>Paris Gemma 4 Hackathon · Context Engineering for SLMs</Badge>
          </motion.div>
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="mt-7 text-[2.6rem] leading-[1.07] font-bold tracking-tight text-balance md:text-[3.6rem]"
          >
            Maintenance Intelligence That Turns Incident Noise into <span className="text-lime">Safe Decisions</span>
          </motion.h1>
          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="mt-6 max-w-xl text-lg leading-relaxed text-fg-soft"
          >
            Fault Capsule compiles scattered railway incident data into compact, versioned evidence capsules — so an
            on-device Gemma 4 can pick the next safe inspection, cite its evidence, or abstain. Offline. Auditable. Measured.
          </motion.p>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="mt-9 flex flex-wrap gap-3">
            <Link to="/dashboard">
              <Button size="lg">
                Launch the live console <ArrowRight size={17} />
              </Button>
            </Link>
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="lg">
                <GithubIcon size={17} /> Read the code
              </Button>
            </a>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35, duration: 0.7 }}>
          <HeroCollage />
        </motion.div>
      </header>

      {/* Sponsors marquee */}
      <section className="pb-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center gap-7"
        >
          <p className="text-xs font-semibold tracking-[0.18em] text-fg-muted uppercase">Powered by</p>
          <div className="relative w-full overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)' }}>
            <motion.div
              animate={{ x: ['0%', '-50%'] }}
              transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
              className="flex w-max items-center gap-5 pr-5"
            >
              {[0, 1].map((copy) => (
                <div key={copy} aria-hidden={copy === 1} className="flex items-center gap-5">
                  {[
                    { src: '/sponsors/gemma4.png', alt: 'Gemma 4' },
                    { src: '/sponsors/nvidia.webp', alt: 'NVIDIA' },
                    { src: '/sponsors/serpapi.png', alt: 'SerpApi' },
                    { src: '/sponsors/42ai.png', alt: '42AI' },
                  ].map((logo) => (
                    <span key={logo.alt} className="flex h-16 shrink-0 items-center justify-center rounded-2xl bg-paper px-8">
                      <img src={logo.src} alt={logo.alt} className="h-9 w-auto object-contain" />
                    </span>
                  ))}
                  <span className="flex h-16 shrink-0 items-center rounded-2xl bg-paper px-8 text-lg font-bold tracking-tight text-ink">
                    Paris Python &amp; ML Group
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Stats band */}
      <section className="border-y border-line bg-card/40">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7 }}
          className="mx-auto grid max-w-5xl grid-cols-2 md:grid-cols-4 md:divide-x md:divide-line"
        >
          <Stat value={90.9} suffix="%" label="Next-action accuracy" decimals={1} />
          <Stat value={0} suffix="" label="Unsafe actions across all runs" />
          <Stat value={100} suffix="%" label="Valid evidence citations" />
          <Stat value={4.7} suffix="×" label="Faster on NVIDIA L40S" decimals={1} />
        </motion.div>
      </section>

      {/* Pipeline */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          className="text-center text-xs font-semibold tracking-[0.18em] text-fg-muted uppercase"
        >
          Two-round diagnostic loop
        </motion.p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          {PIPELINE.map((step, i) => (
            <motion.div
              key={step}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={fadeUp}
              custom={i}
              className="flex items-center gap-2.5"
            >
              <span
                className={`rounded-full border px-4 py-1.5 text-[13px] font-medium ${
                  step.includes('Gemma') ? 'border-lime/30 bg-lime/10 text-lime' : 'border-line bg-card text-fg-soft'
                }`}
              >
                {step}
              </span>
              {i < PIPELINE.length - 1 && <ArrowRight size={13} className="text-line-strong" />}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benchmark */}
      <section className="border-y border-line bg-card/40 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            className="text-center text-3xl font-bold tracking-tight md:text-4xl"
          >
            Same model. Same budget. <span className="text-lime">Better context.</span>
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            custom={1}
            className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-fg-soft"
          >
            6 synthetic point-machine incidents × 2 rounds, Gemma 4 E2B IT on-device, honest scoring — abstentions and
            failures counted, never dropped.
          </motion.p>
          <div className="mt-12 flex flex-col gap-4">
            {BENCH.map((row, i) => (
              <motion.div
                key={row.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                variants={fadeUp}
                custom={i}
                className="flex items-center gap-4"
              >
                <span className={`w-36 shrink-0 text-right text-[13px] font-medium ${row.highlight ? 'text-lime' : 'text-fg-muted'}`}>
                  {row.name}
                </span>
                <div className="h-9 flex-1 overflow-hidden rounded-full border border-line bg-bg">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${row.acc}%` }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 1.2, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex h-full items-center justify-end rounded-full px-3 text-xs font-bold tabular-nums ${
                      row.highlight ? 'bg-lime text-ink' : 'bg-line-strong text-fg'
                    }`}
                  >
                    {row.acc}%
                  </motion.div>
                </div>
                <span className="w-24 shrink-0 text-xs text-fg-muted">{row.note}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={fadeUp}
              custom={i}
            >
              <Card className="h-full">
                <CardHeader>
                  <span className="flex size-9 items-center justify-center rounded-full bg-lime/10">
                    <f.icon size={17} className="text-lime" />
                  </span>
                  <CardTitle>{f.title}</CardTitle>
                </CardHeader>
                <CardContent>{f.body}</CardContent>
              </Card>
            </motion.div>
          ))}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={fadeUp}
            custom={FEATURES.length}
          >
            <Card className="flex h-full flex-col justify-center border-lime/25 bg-lime/6">
              <CardContent className="flex flex-col items-start gap-5 pt-6">
                <p className="text-[15px] font-medium text-fg">
                  See the two-round loop live, with a 3D digital twin of the point machine.
                </p>
                <Link to="/dashboard">
                  <Button>
                    Open console <ArrowRight size={15} />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-line px-6 py-10 text-center text-xs text-fg-muted">
        Built in one day at 42 Paris · Gemma 4 E2B IT · MIT license · Not a safety-certified controller
      </footer>
    </div>
  )
}
