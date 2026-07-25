import {
  Activity,
  AlertTriangle,
  Box,
  CircuitBoard,
  Crosshair,
  DatabaseZap,
  Gauge,
  GitBranch,
  LockKeyhole,
  MousePointer2,
  PlugZap,
  Radio,
  ShieldCheck,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { CapsulePanel } from './components/CapsulePanel'
import { DecisionPanel } from './components/DecisionPanel'
import { IncidentTimeline } from './components/IncidentTimeline'
import { NetworkPanel } from './components/NetworkPanel'
import { StatusHeader } from './components/StatusHeader'
import {
  getTwinPart,
  getTwinPartState,
  twinParts,
} from './features/digitalTwin/model'
import type { TwinPartId } from './features/digitalTwin/model'
import { useDemoController } from './hooks/useDemoController'
import type { DiagnosticPhase } from './types/domain'

const PointMachineScene = lazy(() => import('./components/PointMachineScene'))

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function SceneFallback() {
  return (
    <div className="scene-fallback" aria-label="Loading 3D asset view">
      <span />
      <strong>BUILDING LIVE TWIN</strong>
    </div>
  )
}

const phaseCopy: Record<DiagnosticPhase, { label: string; note: string }> = {
  idle: { label: 'Ready to diagnose', note: 'All evidence is sealed on-device' },
  analyzing: { label: 'Gemma is reasoning', note: 'Tracing the local signal path' },
  'decision-ready': { label: 'Inspection ready', note: 'X3-4 is the priority target' },
  inspecting: { label: 'Inspecting X3-4', note: 'Simulating an isolated field check' },
  resolved: { label: 'Cause confirmed', note: 'Repair handoff is ready' },
  error: { label: 'Diagnosis paused', note: 'Review the error and retry' },
}

const workflowSteps = [
  { number: '01', label: 'Detect', detail: 'Anomaly captured' },
  { number: '02', label: 'Reason', detail: 'Gemma · on-device' },
  { number: '03', label: 'Inspect', detail: 'Human confirmation' },
  { number: '04', label: 'Resolve', detail: 'Evidence locked' },
] as const

function getWorkflowIndex(phase: DiagnosticPhase) {
  if (phase === 'idle' || phase === 'analyzing' || phase === 'error') return 1
  if (phase === 'decision-ready' || phase === 'inspecting') return 2
  return 3
}

function WorkflowRail({ phase }: { phase: DiagnosticPhase }) {
  const activeIndex = getWorkflowIndex(phase)

  return (
    <section className="workflow-rail" aria-labelledby="workflow-title">
      <div className="workflow-intro">
        <span>DIAGNOSTIC PROGRESS</span>
        <h2 id="workflow-title">Step {activeIndex + 1} of {workflowSteps.length}</h2>
      </div>
      <ol className="workflow-steps">
        <motion.i
          className="workflow-progress"
          aria-hidden="true"
          animate={{ scaleX: activeIndex / 3 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
        {workflowSteps.map((step, index) => {
          const status = index < activeIndex ? 'complete' : index === activeIndex ? 'active' : 'locked'
          return (
            <li key={step.number} className={`workflow-step workflow-step--${status}`}>
              <span className="workflow-node">{index < activeIndex ? '✓' : step.number}</span>
              <span className="workflow-copy">
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

const partIcons = {
  'point-machine': Box,
  'switch-blade': GitBranch,
  'x3-connector': PlugZap,
}

const twinStageContent = {
  idle: { label: 'ANOMALY LIVE', detail: '3 signals mapped', tone: 'critical' },
  analyzing: { label: 'EVIDENCE TRACE', detail: 'Local reasoning active', tone: 'warning' },
  'decision-ready': { label: 'TARGET LOCKED', detail: 'X3-4 priority', tone: 'critical' },
  inspecting: { label: 'FIELD REPLAY', detail: 'Isolated inspection', tone: 'warning' },
  resolved: { label: 'CAUSE CONFIRMED', detail: 'Repair pending', tone: 'safe' },
  error: { label: 'TWIN PAUSED', detail: 'Diagnosis error', tone: 'critical' },
} as const

export default function App() {
  const { state, isEnriching, actions } = useDemoController()
  const canRender3d = useMemo(supportsWebGL, [])
  const [selectedPart, setSelectedPart] = useState<TwinPartId | null>(null)
  const incident = state.incident
  const selectedTwinPart = selectedPart ? getTwinPart(selectedPart) : null
  const selectedPartState = selectedPart ? getTwinPartState(selectedPart, state.phase) : null
  const twinStage = twinStageContent[state.phase]
  const currentPhase = phaseCopy[state.phase]

  useEffect(() => {
    if (state.phase === 'idle') {
      setSelectedPart(null)
      return
    }

    if (state.phase === 'analyzing') {
      setSelectedPart('point-machine')
      return
    }

    if (state.phase === 'decision-ready' || state.phase === 'inspecting' || state.phase === 'resolved') {
      setSelectedPart('x3-connector')
    }
  }, [state.phase])

  if (!incident || !state.capsule) {
    return (
      <div className="app-loading">
        <div className="loading-mark"><DatabaseZap size={28} aria-hidden="true" /></div>
        <strong>{state.error ?? 'Loading local incident Capsule'}</strong>
        <span>NO EXTERNAL CONNECTION REQUIRED</span>
      </div>
    )
  }

  return (
    <div className={`app-shell app-shell--${state.phase}`}>
      <StatusHeader
        networkMode={state.networkMode}
        outboundRequests={state.outboundRequests}
        metrics={state.metrics}
        onNetworkModeChange={actions.setNetworkMode}
      />

      <main id="main-content" className="console-main">
        <section className="incident-intro" aria-labelledby="incident-title">
          <div className="incident-title-block">
            <div className="incident-kicker">
              <span className="severity-badge"><AlertTriangle size={13} aria-hidden="true" /> SEV-1 · LIVE DEMO</span>
              <span className={`phase-indicator phase-indicator--${state.phase}`}><i /> {currentPhase.label}</span>
            </div>
            <h1 id="incident-title" aria-label={incident.headline}>Position indication lost.</h1>
            <p>{incident.assetId} · {incident.assetType} · Throat zone A</p>
          </div>

          <div className="incident-spotlight" aria-label="Current incident status">
            <span className="spotlight-icon"><Activity size={18} aria-hidden="true" /></span>
            <div>
              <span>CURRENT STATUS</span>
              <strong>{currentPhase.note}</strong>
            </div>
          </div>
        </section>

        <WorkflowRail phase={state.phase} />

        <section className="twin-workspace" aria-label="Digital twin diagnosis workspace">
          <section
            className={`asset-viewport asset-viewport--${state.phase}`}
            aria-labelledby="asset-view-title"
          >
            <div className="viewport-topline">
              <div className="viewport-title">
                <span className="eyebrow">LIVE DIGITAL TWIN</span>
                <h2 id="asset-view-title">PM-18 / Point machine</h2>
              </div>
              <span className={`twin-stage-chip twin-stage-chip--${twinStage.tone}`}>
                <i />
                <span>{twinStage.label}<small>{twinStage.detail}</small></span>
              </span>
            </div>

            <div className="viewport-canvas">
              <div className="viewport-glow" aria-hidden="true" />
              <svg className="track-blueprint" viewBox="0 0 800 460" aria-hidden="true">
                <defs>
                  <pattern id="blueprint-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M40 0H0V40" fill="none" stroke="currentColor" strokeWidth="0.6" />
                  </pattern>
                  <linearGradient id="rail-fade" x1="0" x2="1">
                    <stop offset="0" stopColor="currentColor" stopOpacity="0" />
                    <stop offset="0.5" stopColor="currentColor" stopOpacity="0.5" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <rect width="800" height="460" fill="url(#blueprint-grid)" />
                <g className="blueprint-sleepers">
                  {Array.from({ length: 13 }, (_, index) => (
                    <path key={index} d={`M${92 + index * 50} 158L${62 + index * 50} 316`} />
                  ))}
                </g>
                <g className="blueprint-rails">
                  <path d="M45 188 C300 202 555 208 770 196" />
                  <path d="M42 266 C300 278 555 284 772 274" />
                  <path d="M280 276 C430 266 575 217 770 116" />
                  <path d="M282 252 C438 246 579 202 754 120" />
                </g>
                <path className="blueprint-scan" d="M40 360H760" stroke="url(#rail-fade)" />
              </svg>

              {canRender3d ? (
                <Suspense fallback={<SceneFallback />}>
                  <PointMachineScene
                    phase={state.phase}
                    selectedPart={selectedPart}
                    onSelectPart={setSelectedPart}
                  />
                </Suspense>
              ) : null}

              <div className="twin-scan-volume" aria-hidden="true" />

              {selectedPart === null ? (
                <>
                  <div className="twin-interaction-hint">
                    <MousePointer2 size={15} aria-hidden="true" />
                    <span>{canRender3d ? 'Select a component · drag to orbit' : 'Select a component in the schematic'}</span>
                  </div>
                  <div className="reticle reticle--motor" aria-hidden="true"><i /><span>PM-18<small>DRIVE ASSEMBLY</small></span></div>
                  <div className="reticle reticle--fault" aria-hidden="true"><i /><span>X3-4<small>{state.phase === 'resolved' ? 'CAUSE CONFIRMED' : 'SIGNAL LOSS'}</small></span></div>
                </>
              ) : null}

              <div className="part-selector" role="toolbar" aria-label="Digital twin components">
                {twinParts.map((part) => {
                  const Icon = partIcons[part.id]
                  const partState = getTwinPartState(part.id, state.phase)
                  return (
                    <button
                      key={part.id}
                      type="button"
                      className={selectedPart === part.id ? 'part-selector-button part-selector-button--active' : 'part-selector-button'}
                      aria-pressed={selectedPart === part.id}
                      onClick={() => setSelectedPart(part.id)}
                    >
                      <Icon size={16} aria-hidden="true" />
                      <span>{part.shortLabel}<small className={`tone-${partState.tone}`}>{partState.label}</small></span>
                    </button>
                  )
                })}
              </div>

              <AnimatePresence>
                {selectedTwinPart && selectedPartState ? (
                  <motion.aside
                    key={selectedTwinPart.id}
                    className="part-inspector"
                    aria-label={`${selectedTwinPart.label} inspection details`}
                    initial={{ opacity: 0, x: 24, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="part-inspector-heading">
                      <div>
                        <span>{selectedTwinPart.subsystem}</span>
                        <h3>{selectedTwinPart.label}</h3>
                      </div>
                      <button type="button" aria-label="Close component details" onClick={() => setSelectedPart(null)}>
                        <X size={15} aria-hidden="true" />
                      </button>
                    </div>
                    <span className={`part-state part-state--${selectedPartState.tone}`}><i /> {selectedPartState.label}</span>
                    <p>{selectedTwinPart.description}</p>
                    <dl>
                      <div><dt>{selectedTwinPart.metricLabel}</dt><dd>{selectedTwinPart.metricValue}</dd></div>
                      <div><dt>Evidence</dt><dd>{selectedTwinPart.evidenceIds.join(' · ')}</dd></div>
                    </dl>
                    {selectedTwinPart.actionId ? (
                      <button
                        className="part-inspection-action"
                        type="button"
                        disabled={state.phase !== 'decision-ready'}
                        onClick={actions.inspect}
                      >
                        {state.phase === 'resolved' ? <ShieldCheck size={15} aria-hidden="true" /> : <CircuitBoard size={15} aria-hidden="true" />}
                        {state.phase === 'decision-ready'
                          ? 'Review and confirm inspection'
                          : state.phase === 'inspecting'
                            ? 'Inspection in progress'
                            : state.phase === 'resolved'
                              ? 'Inspection captured in E-201'
                              : 'Run diagnosis to unlock inspection'}
                      </button>
                    ) : null}
                  </motion.aside>
                ) : null}
              </AnimatePresence>

              <div className="viewport-coordinate"><Crosshair size={13} aria-hidden="true" /> SYNTHETIC TWIN · SAFE TO EXPLORE</div>
              <div className="signal-trace" aria-label="Evidence E-102, operating current trace with a peak of 8.7 amperes">
                <span><i /> E-102 · CURRENT</span>
                <svg className="signal-wave" viewBox="0 0 280 42" role="img" aria-label="Operating current trend with a peak of 8.7 amperes">
                  <path className="signal-grid" d="M0 34H280M0 20H280M0 6H280" />
                  <path className="signal-path" d="M0 34 L42 34 L56 30 L68 6 L76 28 L94 22 L116 31 L132 25 L150 33 L280 34" />
                </svg>
              </div>
            </div>

            <div className="viewport-footer">
              <div><Activity size={15} aria-hidden="true" /><span>PEAK CURRENT</span><strong>8.7 A</strong></div>
              <div><Gauge size={15} aria-hidden="true" /><span>TIMEOUT</span><strong>6.2 s</strong></div>
              <div><Radio size={15} aria-hidden="true" /><span>POSITION</span><strong>UNKNOWN</strong></div>
              <div><LockKeyhole size={15} aria-hidden="true" /><span>REMOTE CONTROL</span><strong>BLOCKED</strong></div>
            </div>
          </section>

          <aside className="decision-stage" aria-label="Current workflow decision">
            <div className="decision-stage-label"><i aria-hidden="true" /> NEXT ACTION</div>
            <DecisionPanel
              phase={state.phase}
              decision={state.decision}
              metrics={state.metrics}
              onAnalyze={actions.analyze}
              onInspect={actions.inspect}
              onReset={actions.reset}
            />
          </aside>
        </section>

        {state.error ? <div className="error-banner" role="alert">{state.error}</div> : null}

        {state.history.length > 0 ? (
          <section className="event-section" aria-label="Diagnostic rounds log">
            <div className="support-heading" style={{ marginBottom: '0.75rem' }}>
              <span>DIAGNOSTIC LOG</span>
              <h2 style={{ fontSize: '1rem', margin: 0 }}>
                {state.history.length} inspection round{state.history.length > 1 ? 's' : ''} completed
                {state.phase === 'resolved' ? ' · resolved' : ' · in progress'}
              </h2>
            </div>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.5rem' }}>
              {state.history.map((round) => (
                <li
                  key={round.round}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'baseline',
                    gap: '0.6rem',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    padding: '0.55rem 0.8rem',
                    background: 'var(--surface)',
                  }}
                >
                  <strong style={{ fontFamily: 'var(--font-data)', fontSize: '0.75rem', color: 'var(--cyan)' }}>
                    R{round.round}
                  </strong>
                  <code style={{ fontSize: '0.75rem' }}>{round.decision.actionId}</code>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{round.inspection.finding}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section className="event-section" aria-label="Incident event stream">
          <IncidentTimeline events={incident.timeline} inspection={state.inspection} />
        </section>

        <section className="support-section" aria-labelledby="support-title">
          <div className="support-heading">
            <span>UNDER THE HOOD</span>
            <h2 id="support-title">Deep evidence, only when you need it.</h2>
          </div>
          <div className="lower-grid">
            <details className="support-drawer">
              <summary>
                <span><DatabaseZap size={18} aria-hidden="true" /> Incident Capsule</span>
                <small>{state.capsule.evidence.length} verified records · v{state.capsule.version}</small>
              </summary>
              <CapsulePanel capsule={state.capsule} />
            </details>
            <details className="support-drawer">
              <summary>
                <span><ShieldCheck size={18} aria-hidden="true" /> Network boundary</span>
                <small>{state.networkMode === 'off' ? 'Offline by default · 0 exposure' : 'Optional evidence channel'}</small>
              </summary>
              <NetworkPanel
                mode={state.networkMode}
                pluginEnabled={state.pluginEnabled}
                isEnriching={isEnriching}
                enrichment={state.enrichment}
                onPluginChange={actions.setPluginEnabled}
                onEnrich={actions.enrich}
              />
            </details>
          </div>
        </section>
      </main>

      <footer className="console-footer">
        <span>FAULT CAPSULE / GEMMA 4</span>
        <p>Decision support only · no real equipment is connected or controlled</p>
        <span>DEMO FC-0725</span>
      </footer>
      <div className="sr-announcer" aria-live="polite">
        {state.phase === 'resolved' ? 'Two-round diagnostic loop complete' : ''}
      </div>
    </div>
  )
}
