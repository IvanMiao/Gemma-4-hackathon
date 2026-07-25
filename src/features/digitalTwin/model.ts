import type { DiagnosticPhase } from '../../types/domain'

export type TwinPartId = 'point-machine' | 'switch-blade' | 'x3-connector'

export type TwinPartTone = 'neutral' | 'warning' | 'critical' | 'safe'

export interface TwinPart {
  id: TwinPartId
  label: string
  shortLabel: string
  subsystem: string
  description: string
  metricLabel: string
  metricValue: string
  evidenceIds: string[]
  actionId?: string
}

export interface TwinPartState {
  label: string
  tone: TwinPartTone
}

export const twinParts: readonly TwinPart[] = [
  {
    id: 'point-machine',
    label: 'PM-18 point machine',
    shortLabel: 'Point machine',
    subsystem: 'Drive assembly',
    description:
      'Electric drive housing and actuator rod. The current spike indicates elevated mechanical or circuit load during movement.',
    metricLabel: 'Current peak',
    metricValue: '8.7 A',
    evidenceIds: ['E-102', 'E-104'],
  },
  {
    id: 'switch-blade',
    label: 'Switch blade and detection rod',
    shortLabel: 'Switch blade',
    subsystem: 'Position detection',
    description:
      'The blade received a reverse command, but the interlocking never received a valid reverse-position indication.',
    metricLabel: 'Position feedback',
    metricValue: 'UNKNOWN',
    evidenceIds: ['E-101', 'E-105'],
  },
  {
    id: 'x3-connector',
    label: 'X3-4 indication connector',
    shortLabel: 'X3 connector',
    subsystem: 'Indication circuit',
    description:
      'The connector was touched during recent maintenance and is the highest-priority inspection point after isolation.',
    metricLabel: 'Circuit continuity',
    metricValue: 'INTERMITTENT',
    evidenceIds: ['E-103', 'E-105'],
    actionId: 'ACT-02',
  },
] as const

const partsById = new Map(twinParts.map((part) => [part.id, part]))

export function getTwinPart(id: TwinPartId): TwinPart {
  const part = partsById.get(id)
  if (!part) throw new Error(`Unknown digital twin part: ${id}`)
  return part
}

export function getTwinPartState(id: TwinPartId, phase: DiagnosticPhase): TwinPartState {
  if (id === 'x3-connector') {
    return phase === 'resolved'
      ? { label: 'FAULT ISOLATED', tone: 'safe' }
      : { label: 'INSPECTION REQUIRED', tone: 'critical' }
  }

  if (id === 'switch-blade') {
    return phase === 'resolved'
      ? { label: 'ISOLATED · POSITION UNKNOWN', tone: 'neutral' }
      : { label: 'INDICATION LOST', tone: 'critical' }
  }

  if (phase === 'analyzing' || phase === 'inspecting') {
    return { label: 'DIAGNOSTIC ACTIVE', tone: 'warning' }
  }

  return phase === 'resolved'
    ? { label: 'CONTAINED', tone: 'safe' }
    : { label: 'CURRENT ANOMALY', tone: 'warning' }
}
