import { describe, expect, it } from 'vitest'
import { demoIncident, firstDecision, baseMetrics, publicEvidence } from '../data/demoIncident'
import { demoReducer, initialDemoState } from './demoMachine'

describe('demoReducer network boundary', () => {
  it('starts offline with the plugin unloaded and zero outbound requests', () => {
    expect(initialDemoState.networkMode).toBe('off')
    expect(initialDemoState.pluginEnabled).toBe(false)
    expect(initialDemoState.outboundRequests).toBe(0)
  })

  it('refuses to enable the evidence plugin while offline', () => {
    const state = demoReducer(initialDemoState, { type: 'PLUGIN_CHANGED', enabled: true })
    expect(state.pluginEnabled).toBe(false)
  })

  it('unloads the evidence plugin when returning offline', () => {
    const online = demoReducer(initialDemoState, { type: 'NETWORK_MODE_CHANGED', mode: 'on' })
    const enabled = demoReducer(online, { type: 'PLUGIN_CHANGED', enabled: true })
    const offline = demoReducer(enabled, { type: 'NETWORK_MODE_CHANGED', mode: 'off' })
    expect(offline.pluginEnabled).toBe(false)
  })

  it('counts a normalized external evidence result as one outbound request', () => {
    const state = demoReducer(initialDemoState, {
      type: 'ENRICHMENT_RECEIVED',
      result: {
        records: [publicEvidence],
        sentFields: ['device_type'],
        provider: 'serpapi',
        retrievedAt: '2026-07-25T14:41:06+02:00',
      },
    })
    expect(state.outboundRequests).toBe(1)
    expect(state.enrichment?.records[0]?.trust).toBe('authoritative-public')
  })
})

describe('demoReducer diagnostic flow', () => {
  it('loads Capsule V1 and exposes a decision only after inference completes', () => {
    const loaded = demoReducer(initialDemoState, {
      type: 'INCIDENT_LOADED',
      incident: demoIncident,
    })
    const analyzing = demoReducer(loaded, { type: 'ANALYSIS_STARTED' })
    const decided = demoReducer(analyzing, {
      type: 'DECISION_RECEIVED',
      decision: firstDecision,
      metrics: baseMetrics,
    })

    expect(loaded.capsule?.version).toBe(1)
    expect(analyzing.phase).toBe('analyzing')
    expect(decided.phase).toBe('decision-ready')
    expect(decided.decision?.actionId).toBe('ACT-02')
  })
})
