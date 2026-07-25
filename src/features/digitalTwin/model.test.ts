import { describe, expect, it } from 'vitest'
import { getTwinPartState, twinParts } from './model'

describe('digital twin interaction model', () => {
  it('exposes the three inspectable point-machine subsystems', () => {
    expect(twinParts.map((part) => part.id)).toEqual([
      'point-machine',
      'switch-blade',
      'x3-connector',
    ])
  })

  it('maps the X3 connector to the allowlisted field inspection', () => {
    const connector = twinParts.find((part) => part.id === 'x3-connector')
    expect(connector?.actionId).toBe('ACT-02')
    expect(connector?.evidenceIds).toContain('E-103')
  })

  it('changes the X3 connector from suspect to isolated after round two', () => {
    expect(getTwinPartState('x3-connector', 'decision-ready').tone).toBe('critical')
    expect(getTwinPartState('x3-connector', 'resolved')).toEqual({
      label: 'FAULT ISOLATED',
      tone: 'safe',
    })
  })
})
