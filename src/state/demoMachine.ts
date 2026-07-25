import type {
  DecisionOutput,
  DiagnosticPhase,
  EvidenceSearchResult,
  IncidentCapsule,
  IncidentFixture,
  InspectionResult,
  NetworkMode,
  RunMetrics,
} from '../types/domain'

export interface DiagnosticRound {
  round: number
  decision: DecisionOutput
  inspection: InspectionResult
}

/** Actions that end the diagnostic loop instead of triggering another inspection. */
export const TERMINAL_ACTIONS = new Set(['escalate_to_human', 'insufficient_evidence', 'ACT-07'])
export const MAX_ROUNDS = 4

export function isTerminalDecision(decision: DecisionOutput, completedRounds: number): boolean {
  return TERMINAL_ACTIONS.has(decision.actionId) || completedRounds >= MAX_ROUNDS
}

export interface DemoState {
  incident: IncidentFixture | null
  capsule: IncidentCapsule | null
  decision: DecisionOutput | null
  inspection: InspectionResult | null
  history: DiagnosticRound[]
  metrics: RunMetrics | null
  phase: DiagnosticPhase
  networkMode: NetworkMode
  pluginEnabled: boolean
  enrichment: EvidenceSearchResult | null
  outboundRequests: number
  error: string | null
}

export type DemoEvent =
  | { type: 'INCIDENT_LOADED'; incident: IncidentFixture }
  | { type: 'ANALYSIS_STARTED' }
  | { type: 'DECISION_RECEIVED'; decision: DecisionOutput; metrics: RunMetrics }
  | { type: 'INSPECTION_STARTED' }
  | {
      type: 'INSPECTION_RECEIVED'
      inspection: InspectionResult
      capsule: IncidentCapsule
      decision: DecisionOutput
      metrics: RunMetrics
    }
  | { type: 'NETWORK_MODE_CHANGED'; mode: NetworkMode }
  | { type: 'PLUGIN_CHANGED'; enabled: boolean }
  | { type: 'ENRICHMENT_RECEIVED'; result: EvidenceSearchResult }
  | { type: 'FAILED'; message: string }
  | { type: 'RESET' }

export const initialDemoState: DemoState = {
  incident: null,
  capsule: null,
  decision: null,
  inspection: null,
  history: [],
  metrics: null,
  phase: 'idle',
  networkMode: 'off',
  pluginEnabled: false,
  enrichment: null,
  outboundRequests: 0,
  error: null,
}

export function demoReducer(state: DemoState, event: DemoEvent): DemoState {
  switch (event.type) {
    case 'INCIDENT_LOADED':
      return { ...state, incident: event.incident, capsule: event.incident.capsuleV1 }
    case 'ANALYSIS_STARTED':
      return { ...state, phase: 'analyzing', error: null }
    case 'DECISION_RECEIVED':
      return {
        ...state,
        phase: 'decision-ready',
        decision: event.decision,
        metrics: event.metrics,
      }
    case 'INSPECTION_STARTED':
      return { ...state, phase: 'inspecting', error: null }
    case 'INSPECTION_RECEIVED': {
      const history = state.decision
        ? [...state.history, { round: state.history.length + 1, decision: state.decision, inspection: event.inspection }]
        : state.history
      return {
        ...state,
        phase: isTerminalDecision(event.decision, history.length) ? 'resolved' : 'decision-ready',
        inspection: event.inspection,
        capsule: event.capsule,
        decision: event.decision,
        history,
        metrics: event.metrics,
      }
    }
    case 'NETWORK_MODE_CHANGED':
      return {
        ...state,
        networkMode: event.mode,
        pluginEnabled: event.mode === 'off' ? false : state.pluginEnabled,
      }
    case 'PLUGIN_CHANGED':
      if (state.networkMode === 'off') return state
      return { ...state, pluginEnabled: event.enabled }
    case 'ENRICHMENT_RECEIVED':
      return {
        ...state,
        enrichment: event.result,
        outboundRequests: state.outboundRequests + 1,
      }
    case 'FAILED':
      return { ...state, phase: 'error', error: event.message }
    case 'RESET':
      return {
        ...initialDemoState,
        incident: state.incident,
        capsule: state.incident?.capsuleV1 ?? null,
        networkMode: state.networkMode,
        pluginEnabled: state.pluginEnabled,
        enrichment: state.enrichment,
        outboundRequests: state.outboundRequests,
      }
  }
}
