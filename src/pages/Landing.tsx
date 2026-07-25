import { animate, motion, useInView, type Variants } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CircuitBoard,
  FileSearch,
  Layers,
  ShieldCheck,
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
  hidden: { opacity: 0, y: 28 },
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
    <div className="flex flex-col items-center gap-1.5 px-8 py-6">
      <span ref={ref} className="text-5xl font-bold tracking-tight text-ink tabular-nums">
        {display}
        <span className="text-3xl text-accent">{suffix}</span>
      </span>
      <span className="text-center text-xs font-medium tracking-wide text-ink-muted">{label}</span>
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
    <div className="min-h-screen bg-paper text-ink" style={{ fontFamily: "Inter, -apple-system, 'Segoe UI', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <span className="text-[15px] font-bold tracking-tight">
            ⚙ Fault <span className="text-accent">Capsule</span>
          </span>
          <div className="flex items-center gap-2">
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm">
                <GithubIcon size={14} /> GitHub
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
      <header className="mx-auto flex max-w-4xl flex-col items-center px-6 pt-24 pb-16 text-center">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <Badge>Paris Gemma 4 Hackathon · Context Engineering for SLMs</Badge>
        </motion.div>
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
          className="mt-7 text-[2.75rem] leading-[1.08] font-bold tracking-tight text-balance md:text-[4.25rem]"
        >
          The right context turns a <span className="text-accent">2B model</span> into a maintenance expert
        </motion.h1>
        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
          className="mt-7 max-w-2xl text-lg leading-relaxed text-ink-soft"
        >
          Fault Capsule compiles scattered railway incident data into compact, versioned evidence capsules — then lets an
          on-device Gemma 4 pick the next safe inspection, cite its evidence, or abstain. Offline. Auditable. Measured.
        </motion.p>
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/dashboard">
            <Button variant="accent" size="lg">
              Launch the live console <ArrowRight size={17} />
            </Button>
          </Link>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="lg">
              <GithubIcon size={17} /> Read the code
            </Button>
          </a>
        </motion.div>
      </header>

      {/* Stats band */}
      <section className="border-y border-line bg-paper-soft">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7 }}
          className="mx-auto grid max-w-5xl grid-cols-2 divide-line md:grid-cols-4 md:divide-x"
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
          className="text-center text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase"
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
                  step.includes('Gemma')
                    ? 'border-accent/30 bg-accent-soft text-accent-strong'
                    : 'border-line bg-paper text-ink-soft'
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
      <section className="border-y border-line bg-paper-soft py-20">
        <div className="mx-auto max-w-4xl px-6">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            className="text-center text-3xl font-bold tracking-tight md:text-4xl"
          >
            Same model. Same budget. <span className="text-accent">Better context.</span>
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            custom={1}
            className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-ink-soft"
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
                <span className={`w-36 shrink-0 text-right text-[13px] font-medium ${row.highlight ? 'text-accent-strong' : 'text-ink-muted'}`}>
                  {row.name}
                </span>
                <div className="h-9 flex-1 overflow-hidden rounded-full bg-paper shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${row.acc}%` }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 1.2, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex h-full items-center justify-end rounded-full px-3 text-xs font-bold tabular-nums ${
                      row.highlight ? 'bg-accent text-paper' : 'bg-line-strong text-ink'
                    }`}
                  >
                    {row.acc}%
                  </motion.div>
                </div>
                <span className="w-24 shrink-0 text-xs text-ink-muted">{row.note}</span>
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
                  <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft">
                    <f.icon size={17} className="text-accent-strong" />
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
            <Card className="flex h-full flex-col justify-center border-accent/25 bg-accent-soft/60">
              <CardContent className="flex flex-col items-start gap-5 pt-6">
                <p className="text-[15px] font-medium text-ink">
                  See the two-round loop live, with a 3D digital twin of the point machine.
                </p>
                <Link to="/dashboard">
                  <Button variant="accent">
                    Open console <ArrowRight size={15} />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-line px-6 py-10 text-center text-xs text-ink-muted">
        Built in one day at 42 Paris · Gemma 4 E2B IT · MIT license · Not a safety-certified controller
      </footer>
    </div>
  )
}
