import { motion, type Variants } from 'motion/react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, FileDown, ShieldAlert, XCircle } from 'lucide-react'
import { BrandMark } from '@/components/BrandMark'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.06, ease: [0.21, 0.6, 0.35, 1] },
  }),
}

const STEPS = [
  {
    time: '05:42 · 0:00',
    capsule: 'Capsule v1',
    title: 'Incident lands in the console',
    decision: null,
    rationale:
      'PM-207 at the terminus crossover fails Normal → Reverse during pre-service ramp-up. The interlocking drops the route. The compiler assembles ~15 evidence items — alarms, telemetry, maintenance history, topology, safety rules — into Capsule v1, under budget, with the action whitelist and the forbidden list.',
    finding: null,
    eliminated: null,
  },
  {
    time: '0:10',
    capsule: 'Capsule v1 → v2',
    title: 'Round 1 — eliminate the mechanical hypothesis',
    decision: { action: 'inspect_motor_current_trace', confidence: '86%' },
    rationale:
      '“No throw completion and no obstruction alarm — the current trace distinguishes a stalled motor from a dead one.”',
    finding: 'No current at all during the command window — a stall would show a spike.',
    eliminated: 'Mechanical obstruction eliminated. The fault is electrical or control-side.',
  },
  {
    time: '1:00',
    capsule: 'Capsule v2 → v3',
    title: 'Round 2 — localize within the control chain',
    decision: { action: 'inspect_command_relay_output', confidence: '81%' },
    rationale:
      '“Motor receives no current; the next split point is whether the command leaves the controller at all (E-201, manual 7.2.4).”',
    finding: 'Command relay picks up — 110 V present at the controller output terminals.',
    eliminated: 'Controller and upstream logic cleared. Fault sits between controller and machine.',
  },
  {
    time: '2:00',
    capsule: 'Capsule v3 → v4',
    title: 'Round 3 — pinpoint the segment',
    decision: { action: 'inspect_junction_box_jb4', confidence: '84%' },
    rationale:
      '“E-201 + E-202 point to the cable run; topology places JB-4 in a drainage sump area. SR-31: make the area safe first.”',
    finding: 'Water ingress in JB-4, corroded terminal block, intermittent open circuit reproduced.',
    eliminated: 'Root cause confirmed: JB-4 terminal block.',
  },
  {
    time: '3:00',
    capsule: 'Capsule v4',
    title: 'Round 4 — hand over, safely',
    decision: { action: 'escalate_to_human', confidence: '93%' },
    rationale:
      '“Fault mechanism confirmed by the evidence chain E-201 → E-203. Do not re-energize before the insulation test passes; JB-4 requires drying and terminal replacement.”',
    finding: 'Run trace exported: 4 capsule versions, 4 cited decisions, latencies — outbound requests: 0.',
    eliminated: null,
  },
]

export default function Journey() {
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
            <Link to="/simulator">
              <Button variant="ghost" size="sm">
                Live simulator
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

      {/* Header */}
      <header className="mx-auto max-w-3xl px-6 pt-16 pb-10 text-center">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <Badge>Scenario walkthrough · synthetic incident</Badge>
        </motion.div>
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
          className="mt-6 text-4xl font-bold tracking-tight text-balance md:text-5xl"
        >
          How a diagnosis runs, <span className="text-lime">round by round</span>
        </motion.h1>
        <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2} className="mt-5 text-lg leading-relaxed text-fg-soft">
          Nadia, technical operator, 05:42 — point machine PM-207 refuses to move and the first trains of the day cannot
          turn back. Four possible fault families. Here is how the capsule loop narrows them down to one.
        </motion.p>
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="mt-6 flex flex-wrap justify-center gap-2">
          {['Network OFF', 'Outbound requests: 0', 'Gemma 4 E2B · on-device', '~4 minutes total'].map((chip) => (
            <span key={chip} className="rounded-full border border-line bg-card px-3.5 py-1 text-xs font-medium text-fg-soft">
              {chip}
            </span>
          ))}
        </motion.div>
      </header>

      {/* Timeline */}
      <section className="mx-auto max-w-3xl px-6 pb-16">
        <div className="relative flex flex-col gap-8 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:border-l before:border-dashed before:border-line-strong md:before:left-[19px]">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={fadeUp}
              custom={i % 2}
              className="relative flex gap-5 md:gap-7"
            >
              <span className="z-1 mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-lime/40 bg-bg font-mono text-xs font-bold text-lime md:size-10 md:text-sm">
                {i}
              </span>
              <div className="flex-1 rounded-2xl border border-line bg-card p-5 md:p-6">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-[11px] text-fg-muted">{step.time}</span>
                  <span className="rounded-md border border-line-strong px-2 py-0.5 font-mono text-[11px] text-fg-soft">{step.capsule}</span>
                </div>
                <h2 className="mt-2.5 text-[17px] font-semibold text-fg">{step.title}</h2>
                {step.decision && (
                  <p className="mt-3 flex flex-wrap items-center gap-2.5">
                    <span className="rounded-md bg-lime/10 px-2.5 py-1 font-mono text-[13px] font-semibold text-lime">
                      → {step.decision.action}
                    </span>
                    <span className="text-xs text-fg-muted">{step.decision.confidence} confidence</span>
                  </p>
                )}
                <p className="mt-3 text-sm leading-relaxed text-fg-soft italic">{step.rationale}</p>
                {step.finding && (
                  <p className="mt-3 flex items-start gap-2 rounded-lg bg-bg px-3.5 py-2.5 text-sm text-fg">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-lime" /> {step.finding}
                  </p>
                )}
                {step.eliminated && (
                  <p className="mt-2 flex items-start gap-2 text-[13px] text-fg-muted">
                    <XCircle size={15} className="mt-0.5 shrink-0 text-fg-muted" /> {step.eliminated}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Abstention branch */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
          className="mt-10 flex gap-4 rounded-2xl border border-line bg-card/60 p-5 md:p-6"
        >
          <ShieldAlert size={20} className="mt-0.5 shrink-0 text-fg-soft" />
          <p className="text-sm leading-relaxed text-fg-soft">
            <span className="font-semibold text-fg">The abstention branch.</span> If at any round the findings contradict
            each other — current present <em>and</em> relay dead — Gemma returns{' '}
            <span className="font-mono text-[13px] text-lime">insufficient_evidence</span> and the console proposes the
            escalation path directly. Guessing is never an option, and abstentions are scored in the benchmark like any
            other outcome.
          </p>
        </motion.div>

        {/* Handover + CTA */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
          className="mt-10 flex flex-col items-center gap-5 rounded-2xl border border-lime/25 bg-lime/6 p-8 text-center"
        >
          <FileDown size={22} className="text-lime" />
          <p className="max-w-xl text-[15px] leading-relaxed text-fg">
            The operator ends with a handover pack: every capsule version, every decision, every citation and latency —
            and an outbound counter still at zero. Total elapsed: about four minutes, without waking a signalling engineer
            for the wrong reason.
          </p>
          <Link to="/dashboard">
            <Button size="lg">
              Run it yourself in the console <ArrowRight size={16} />
            </Button>
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-line px-6 py-10 text-center text-xs text-fg-muted">
        Synthetic scenario — PM-207 and its findings are demo data · The console runs the same loop on the live local model
      </footer>
    </div>
  )
}
