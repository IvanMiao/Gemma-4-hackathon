import {
  Activity,
  AlertTriangle,
  Box,
  ChevronRight,
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
      <strong>INITIALIZING DIGITAL TWIN</strong>
    </div>
  )
}

function PhaseIndicator({ phase }: { phase: ReturnType<typeof useDemoController>['state']['phase'] }) {
  const content = {
    idle: 'Awaiting local diagnosis',
    analyzing: 'Analyzing evidence locally',
    'decision-ready': 'Action ready for confirmation',
    inspecting: 'Simulating field inspection',
    resolved: 'Fault isolated · repair pending',
    error: 'Diagnosis paused',
  }[phase]

  return <span className={`phase-indicator phase-indicator--${phase}`}><i /> {content}</span>
}

const partIcons = {
  'point-machine': Box,
  'switch-blade': GitBranch,
  'x3-connector': PlugZap,
}

const twinStageContent = {
  idle: { label: 'ANOMALY MAP', detail: '3 SIGNALS ACTIVE', tone: 'critical' },
  analyzing: { label: 'TRACING EVIDENCE', detail: 'LOCAL SIGNAL PATH', tone: 'warning' },
  'decision-ready': { label: 'FAULT VECTOR LOCKED', detail: 'X3-4 PRIORITY', tone: 'critical' },
  inspecting: { label: 'ISOLATED INSPECTION', detail: 'SIMULATION REPLAY', tone: 'warning' },
  resolved: { label: 'CAUSE CONFIRMED', detail: 'REPAIR PENDING', tone: 'safe' },
  error: { label: 'TWIN PAUSED', detail: 'DIAGNOSIS ERROR', tone: 'critical' },
} as const

export default function App() {
  const { state, isEnriching, actions } = useDemoController()
  const canRender3d = useMemo(supportsWebGL, [])
  const [selectedPart, setSelectedPart] = useState<TwinPartId | null>(null)
  const incident = state.incident
  const selectedTwinPart = selectedPart ? getTwinPart(selectedPart) : null
  const selectedPartState = selectedPart ? getTwinPartState(selectedPart, state.phase) : null
  const twinStage = twinStageContent[state.phase]

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
    <div className="app-shell">
      <StatusHeader
        networkMode={state.networkMode}
        outboundRequests={state.outboundRequests}
        metrics={state.metrics}
        onNetworkModeChange={actions.setNetworkMode}
      />

      <main id="main-content" className="console-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <span>OPERATIONS</span><ChevronRight size={13} aria-hidden="true" />
          <span>INCIDENTS</span><ChevronRight size={13} aria-hidden="true" />
          <strong>{incident.id}</strong>
        </nav>

        <section className="incident-intro" aria-labelledby="incident-title">
          <div className="incident-title-block">
            <div className="incident-kicker">
              <span className="severity-badge"><AlertTriangle size={14} aria-hidden="true" /> SEV-1</span>
              <PhaseIndicator phase={state.phase} />
            </div>
            <h1 id="incident-title">{incident.headline}</h1>
            <p>
              {incident.assetId} · {incident.assetType} · {incident.location}
              <span className="incident-data-label">SIMULATED DATA</span>
            </p>
          </div>
          <div className="incident-meta" aria-label="Incident summary metrics">
            <div><Activity size={17} aria-hidden="true" /><span>Current peak</span><strong>8.7 A</strong><small>+42% vs P95</small></div>
            <div><Gauge size={17} aria-hidden="true" /><span>Indication timeout</span><strong>6.2 s</strong><small>limit 4.0 s</small></div>
            <div><LockKeyhole size={17} aria-hidden="true" /><span>Safety policy</span><strong>LOCKED</strong><small>remote retry blocked</small></div>
          </div>
        </section>

        <section className="hero-grid" aria-label="Incident diagnosis console">
          <DecisionPanel
            phase={state.phase}
            decision={state.decision}
            metrics={state.metrics}
            onAnalyze={actions.analyze}
            onInspect={actions.inspect}
            onReset={actions.reset}
          />

          <IncidentTimeline events={incident.timeline} inspection={state.inspection} />

          <section
            className={`asset-viewport asset-viewport--${state.phase}`}
            aria-labelledby="asset-view-title"
          >
            <div className="viewport-topline">
              <div><Box size={15} aria-hidden="true" /><span id="asset-view-title">ASSET DIGITAL TWIN</span></div>
              <span className={`twin-stage-chip twin-stage-chip--${twinStage.tone}`}>
                <i />
                <span>{twinStage.label}<small>{twinStage.detail}</small></span>
              </span>
            </div>
            <div className="viewport-canvas">
              <svg className="track-blueprint" viewBox="0 0 800 460" aria-hidden="true">
                <defs>
                  <pattern id="blueprint-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                    <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="0.6" />
                  </pattern>
                  <linearGradient id="rail-fade" x1="0" x2="1">
                    <stop offset="0" stopColor="currentColor" stopOpacity="0.08" />
                    <stop offset="0.5" stopColor="currentColor" stopOpacity="0.42" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0.08" />
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
                <g className="blueprint-machine">
                  <rect x="486" y="289" width="122" height="52" rx="3" />
                  <path d="M458 315H486M608 315H662" />
                  <circle cx="588" cy="304" r="7" />
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
                    <MousePointer2 size={16} aria-hidden="true" />
                    <span>
                      {canRender3d
                        ? 'Select a component · drag to orbit · scroll to zoom'
                        : 'Select a component in the schematic'}
                    </span>
                  </div>
                  <div className="reticle reticle--motor" aria-hidden="true"><i /><span>PM-18<br /><b>POINT MACHINE</b></span></div>
                  <div className="reticle reticle--fault" aria-hidden="true"><i /><span>X3-4<br /><b>{state.phase === 'resolved' ? 'CAUSE CONFIRMED' : 'SIGNAL LOSS'}</b></span></div>
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
                      <Icon size={15} aria-hidden="true" />
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
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
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
                    <span className={`part-state part-state--${selectedPartState.tone}`}>
                      <i /> {selectedPartState.label}
                    </span>
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
              <div className="viewport-coordinate"><Crosshair size={13} aria-hidden="true" /> SYNTHETIC SCENE · NOT TO SCALE</div>
              <div className="signal-trace" aria-label="Evidence E-102, operating current trace with a peak of 8.7 amperes">
                <span><i /> E-102 · CURRENT TRACE</span>
                <svg className="signal-wave" viewBox="0 0 280 42" role="img" aria-label="Operating current trend with a peak of 8.7 amperes">
                  <path className="signal-grid" d="M0 34H280M0 20H280M0 6H280" />
                  <path className="signal-path" d="M0 34 L42 34 L56 30 L68 6 L76 28 L94 22 L116 31 L132 25 L150 33 L280 34" />
                </svg>
              </div>
            </div>
            <div className="viewport-footer">
              <div><Radio size={14} aria-hidden="true" /><span>POSITION FEEDBACK</span><strong>UNKNOWN</strong></div>
              <div><span>COMMAND</span><strong>NORMAL → REVERSE</strong></div>
              <div><span>CONTROL OUTPUT</span><strong>DISABLED</strong></div>
            </div>
          </section>

        </section>

        {state.error ? <div className="error-banner" role="alert">{state.error}</div> : null}

        <section className="lower-grid">
          <CapsulePanel capsule={state.capsule} />
          <NetworkPanel
            mode={state.networkMode}
            pluginEnabled={state.pluginEnabled}
            isEnriching={isEnriching}
            enrichment={state.enrichment}
            onPluginChange={actions.setPluginEnabled}
            onEnrich={actions.enrich}
          />
        </section>
      </main>

      <footer className="console-footer">
        <span>FAULT CAPSULE / PERSON 3 DEMO SURFACE</span>
        <p>{incident.description}</p>
        <span>RUN · FC-0725-1432-A</span>
      </footer>
      <div className="sr-announcer" aria-live="polite">
        {state.phase === 'resolved' ? 'Two-round diagnostic loop complete' : ''}
      </div>
    </div>
  )
}
