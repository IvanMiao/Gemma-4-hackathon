export type NetworkMode = 'off' | 'on'

export type DiagnosticPhase =
  | 'idle'
  | 'analyzing'
  | 'decision-ready'
  | 'inspecting'
  | 'resolved'
  | 'error'

export type EvidenceTrust = 'local-verified' | 'authoritative-public' | 'untrusted'

export interface EvidenceRecord {
  id: string
  kind: 'telemetry' | 'alarm' | 'maintenance' | 'topology' | 'manual' | 'inspection' | 'public'
  title: string
  detail: string
  timestamp?: string
  source: string
  trust: EvidenceTrust
  url?: string
}

export interface ActionOption {
  id: string
  label: string
  description: string
  requiresConfirmation: boolean
}

export interface IncidentCapsule {
  id: string
  incidentId: string
  version: number
  parentVersion: string | null
  createdAt: string
  summary: string
  evidence: EvidenceRecord[]
  allowedActions: ActionOption[]
  forbiddenActions: string[]
  missingInformation: string[]
  tokenBudget: {
    used: number
    maximum: number
  }
}

export interface DecisionOutput {
  actionId: string
  actionLabel: string
  confidence: number
  rationale: string
  citedEvidenceIds: string[]
  safetyNote: string
}

export interface RunMetrics {
  runtime: string
  model: string
  quantization: string
  device: string
  timeToFirstTokenMs: number
  totalLatencyMs: number
  peakMemoryGb: number
  inputTokens: number
  outputTokens: number
}

export interface InspectionResult {
  id: string
  actionId: string
  finding: string
  observedAt: string
  evidence: EvidenceRecord
}

export interface TimelineEvent {
  id: string
  time: string
  label: string
  detail: string
  tone: 'neutral' | 'warning' | 'critical' | 'info'
}

export interface IncidentFixture {
  id: string
  assetId: string
  assetType: string
  location: string
  severity: 'critical' | 'high' | 'medium'
  headline: string
  description: string
  startedAt: string
  timeline: TimelineEvent[]
  capsuleV1: IncidentCapsule
}

export interface InferenceResult {
  decision: DecisionOutput
  metrics: RunMetrics
}

export interface InspectionRunResult {
  inspection: InspectionResult
  nextCapsule: IncidentCapsule
}

export interface InformationNeed {
  reason: string
  deviceType: string
  publicErrorCode: string
  approvedDomains: string[]
}

export interface EvidenceSearchResult {
  records: EvidenceRecord[]
  sentFields: string[]
  provider: 'serpapi'
  retrievedAt: string
}

export interface DiagnosticGateway {
  loadIncident(signal?: AbortSignal): Promise<IncidentFixture>
  infer(capsule: IncidentCapsule, signal?: AbortSignal): Promise<InferenceResult>
  runInspection(
    incidentId: string,
    actionId: string,
    signal?: AbortSignal,
  ): Promise<InspectionRunResult>
  searchPublicEvidence(
    need: InformationNeed,
    signal?: AbortSignal,
  ): Promise<EvidenceSearchResult>
}
