import {
  ArrowRight,
  BrainCircuit,
  Check,
  CircleGauge,
  LoaderCircle,
  RefreshCcw,
  ShieldAlert,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { DecisionOutput, DiagnosticPhase, RunMetrics } from '../types/domain'

interface DecisionPanelProps {
  phase: DiagnosticPhase
  decision: DecisionOutput | null
  metrics: RunMetrics | null
  onAnalyze: () => void
  onInspect: () => void
  onReset: () => void
}

function ActionButton({
  phase,
  onAnalyze,
  onInspect,
  onReset,
}: Pick<DecisionPanelProps, 'phase' | 'onAnalyze' | 'onInspect' | 'onReset'>) {
  if (phase === 'analyzing' || phase === 'inspecting') {
    return (
      <button className="primary-action" type="button" disabled>
        <LoaderCircle className="spinner" size={18} aria-hidden="true" />
        {phase === 'analyzing' ? 'Gemma is reasoning locally' : 'Reassessing with new evidence'}
      </button>
    )
  }

  if (phase === 'decision-ready') {
    return (
      <button className="primary-action" type="button" onClick={onInspect}>
        <span>Confirm field inspection</span>
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    )
  }

  if (phase === 'resolved') {
    return (
      <button className="secondary-action" type="button" onClick={onReset}>
        <RefreshCcw size={17} aria-hidden="true" />
        Replay diagnosis
      </button>
    )
  }

  return (
    <button className="primary-action" type="button" onClick={onAnalyze}>
      Start local diagnosis
      <ArrowRight size={18} aria-hidden="true" />
    </button>
  )
}

export function DecisionPanel({
  phase,
  decision,
  metrics,
  onAnalyze,
  onInspect,
  onReset,
}: DecisionPanelProps) {
  const isLoading = phase === 'analyzing' || phase === 'inspecting'

  return (
    <section className="panel decision-panel" aria-labelledby="decision-title" aria-busy={isLoading}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">GEMMA 4 · ON-DEVICE</span>
          <h2 id="decision-title">{decision ? 'Recommended inspection' : 'Awaiting analysis'}</h2>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {decision ? (
          <motion.div
            key={`${decision.actionId}-${phase}`}
            className="decision-content"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <div className="confidence-row">
              <span className="action-code">{decision.actionId}</span>
              <span className="confidence"><CircleGauge size={15} aria-hidden="true" /> {(decision.confidence * 100).toFixed(0)}% CONFIDENCE</span>
            </div>
            <h3>{decision.actionLabel}</h3>
            <p className="decision-rationale">{decision.rationale}</p>
            <div className="citation-row" aria-label="Cited evidence">
              {decision.citedEvidenceIds.map((id) => <span key={id}>{id}</span>)}
            </div>
            <div className="safety-note">
              <ShieldAlert size={17} aria-hidden="true" />
              <p><strong>Safety locked.</strong> {decision.safetyNote}</p>
            </div>
          </motion.div>
        ) : isLoading ? (
          <motion.div key="loading" className="decision-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="scan-line" />
            <span>READING 5 VERIFIED SIGNALS</span>
            <strong>Reasoning on-device</strong>
            <p>Gemma is tracing the fault without sending incident data anywhere.</p>
          </motion.div>
        ) : (
          <motion.div key="empty" className="decision-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <span className="decision-orbit"><BrainCircuit size={26} aria-hidden="true" /></span>
            <strong>Establish the next safe action</strong>
            <p>Five verified signals are ready for private, on-device analysis.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {metrics ? (
        <dl className="metric-strip">
          <div><dt>TTFT</dt><dd>{metrics.timeToFirstTokenMs} ms</dd></div>
          <div><dt>LOCAL</dt><dd>{(metrics.totalLatencyMs / 1000).toFixed(1)} s</dd></div>
          <div><dt>MEMORY</dt><dd>{metrics.peakMemoryGb} GB</dd></div>
        </dl>
      ) : null}

      {phase === 'resolved' ? (
        <div className="resolved-banner"><Check size={16} aria-hidden="true" /> Two-round diagnostic loop complete</div>
      ) : null}

      <ActionButton phase={phase} onAnalyze={onAnalyze} onInspect={onInspect} onReset={onReset} />
    </section>
  )
}
