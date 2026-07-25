import type {
  DecisionOutput,
  EvidenceRecord,
  IncidentCapsule,
  IncidentFixture,
  InspectionResult,
  RunMetrics,
} from '../types/domain'

const capsuleOneEvidence: EvidenceRecord[] = [
  {
    id: 'E-101',
    kind: 'alarm',
    title: 'Position indication lost',
    detail: 'Reverse indication was still not established 6.2 seconds after the switch command.',
    timestamp: '14:32:18',
    source: 'Interlocking event recorder · Local',
    trust: 'local-verified',
  },
  {
    id: 'E-102',
    kind: 'telemetry',
    title: 'Abnormal operating current',
    detail: 'Peak current reached 8.7 A, above the P95 of the previous 30 operations (6.1 A).',
    timestamp: '14:32:12',
    source: 'Edge telemetry cache · Local',
    trust: 'local-verified',
  },
  {
    id: 'E-103',
    kind: 'maintenance',
    title: 'Recent maintenance change',
    detail: 'The indication rod was adjusted and X3 terminals retightened two hours earlier, followed by one unloaded test.',
    timestamp: '12:11:40',
    source: 'Work order WO-2841 · Local',
    trust: 'local-verified',
  },
  {
    id: 'E-104',
    kind: 'topology',
    title: 'Adjacent topology healthy',
    detail: 'PM-17 on the same supply branch operated and indicated normally, suggesting a fault local to PM-18.',
    timestamp: '14:32:20',
    source: 'Yard topology snapshot · Local',
    trust: 'local-verified',
  },
  {
    id: 'E-105',
    kind: 'manual',
    title: 'Safety rule SR-04',
    detail: 'Repeated remote commands are prohibited after an indication failure. Isolation must be confirmed before inspection.',
    source: 'Maintenance manual 7.3.2 · Local',
    trust: 'local-verified',
  },
]

export const demoCapsuleV1: IncidentCapsule = {
  id: 'CAP-PM18-001-V1',
  incidentId: 'INC-PM18-0725',
  version: 1,
  parentVersion: null,
  createdAt: '2026-07-25T14:32:24+02:00',
  summary:
    'PM-18 drew high operating current after a reverse command and failed to establish position indication. Adjacent equipment is healthy, and the indication rod and terminals were serviced shortly before the incident.',
  evidence: capsuleOneEvidence,
  allowedActions: [
    {
      id: 'ACT-02',
      label: 'Inspect indication circuit under isolation',
      description: 'Confirm isolation, then inspect the indication rod, X3 terminals, and detection contacts.',
      requiresConfirmation: true,
    },
    {
      id: 'ACT-05',
      label: 'Request field engineer review',
      description: 'Stop the automated flow and hand the Capsule to the duty engineer.',
      requiresConfirmation: true,
    },
  ],
  forbiddenActions: ['Repeat remote command', 'Bypass position indication', 'Restore power automatically'],
  missingInformation: ['Observed condition of the X3 terminals and detection contacts'],
  tokenBudget: { used: 864, maximum: 1536 },
}

const inspectionEvidence: EvidenceRecord = {
  id: 'E-201',
  kind: 'inspection',
  title: 'X3 connector not fully seated',
  detail: 'The isolated inspection found the X3-4 connector latch open; light contact changed circuit continuity.',
  timestamp: '14:38:09',
  source: 'Simulated field inspection · Local',
  trust: 'local-verified',
}

export const demoInspection: InspectionResult = {
  id: 'INSP-PM18-001',
  actionId: 'ACT-02',
  finding: 'The X3-4 connector was not fully seated, causing an intermittent open circuit in the indication path.',
  observedAt: '2026-07-25T14:38:09+02:00',
  evidence: inspectionEvidence,
}

export const demoCapsuleV2: IncidentCapsule = {
  ...demoCapsuleV1,
  id: 'CAP-PM18-001-V2',
  version: 2,
  parentVersion: demoCapsuleV1.id,
  createdAt: '2026-07-25T14:38:12+02:00',
  summary:
    'The isolated field inspection confirmed that an unseated X3-4 connector caused an intermittent open circuit. Evidence supports maintaining isolation and handing off for authorized repair and verification.',
  evidence: [...capsuleOneEvidence, inspectionEvidence],
  allowedActions: [
    {
      id: 'ACT-07',
      label: 'Maintain isolation and hand off for repair',
      description: 'An authorized technician must reseat the connector and complete continuity and hand-crank verification before restoration.',
      requiresConfirmation: true,
    },
  ],
  missingInformation: [],
  tokenBudget: { used: 1012, maximum: 1536 },
}

export const demoIncident: IncidentFixture = {
  id: 'INC-PM18-0725',
  assetId: 'PM-18',
  assetType: 'Electric point machine',
  location: 'Synthetic railway yard · Throat zone A',
  severity: 'critical',
  headline: 'Switch command completed; position indication not established',
  description:
    'This demonstration uses synthetic incident data. Fault Capsule does not connect to or control real railway equipment.',
  startedAt: '2026-07-25T14:32:12+02:00',
  timeline: [
    {
      id: 'T-1',
      time: '12:11',
      label: 'Maintenance change',
      detail: 'Indication rod adjusted; X3 terminals retightened',
      tone: 'neutral',
    },
    {
      id: 'T-2',
      time: '14:32:12',
      label: 'Switch command',
      detail: 'Normal → reverse',
      tone: 'info',
    },
    {
      id: 'T-3',
      time: '14:32:18',
      label: 'Indication lost',
      detail: 'Reverse indication not established within 6.2 seconds',
      tone: 'critical',
    },
    {
      id: 'T-4',
      time: '14:32:20',
      label: 'Safety lock',
      detail: 'Repeat remote command blocked by policy',
      tone: 'warning',
    },
  ],
  capsuleV1: demoCapsuleV1,
}

export const firstDecision: DecisionOutput = {
  actionId: 'ACT-02',
  actionLabel: 'Inspect indication circuit under isolation',
  confidence: 0.89,
  rationale:
    'High operating current coincides with lost indication. Adjacent equipment is healthy, and recent work touched the indication rod and X3 terminals, so the local indication circuit should be inspected under isolation first.',
  citedEvidenceIds: ['E-101', 'E-102', 'E-103', 'E-104', 'E-105'],
  safetyNote: 'Do not repeat the remote command. Field personnel must confirm isolation before inspection.',
}

export const finalDecision: DecisionOutput = {
  actionId: 'ACT-07',
  actionLabel: 'Maintain isolation and hand off for repair',
  confidence: 0.97,
  rationale:
    'The field inspection reproduced an intermittent open circuit at the X3-4 connector, consistent with the indication alarm. Repair and restoration must be completed by authorized personnel under procedure.',
  citedEvidenceIds: ['E-101', 'E-103', 'E-105', 'E-201'],
  safetyNote: 'This system provides decision support only. It sends no control commands and does not replace authorized confirmation.',
}

export const baseMetrics: RunMetrics = {
  runtime: 'llama.cpp · local',
  model: 'Gemma 4 · demo adapter',
  quantization: 'Q4_K_M',
  device: 'Edge workstation',
  timeToFirstTokenMs: 418,
  totalLatencyMs: 1842,
  peakMemoryGb: 4.7,
  inputTokens: 864,
  outputTokens: 126,
}

export const publicEvidence: EvidenceRecord = {
  id: 'WEB-301',
  kind: 'public',
  title: 'Manufacturer bulletin: connector-latch inspection',
  detail:
    'Public maintenance guidance recommends checking connector-latch integrity during intermittent indication faults. External content cannot override local safety rules.',
  source: 'Manufacturer technical bulletin · SerpAPI normalized',
  trust: 'authoritative-public',
  url: 'https://manufacturer.example/technical-bulletin',
}
