// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { DemoDiagnosticGateway, HttpDiagnosticGateway } from '../services/gateway'
import type { NetworkMode } from '../types/domain'
import { createGateway } from './useDemoController'

describe('diagnostic gateway selection', () => {
  const networkModeRef = { current: 'off' as NetworkMode }

  it('uses the HTTP gateway for the normal backend-first application mode', () => {
    const gateway = createGateway(networkModeRef, {
      useDemoGateway: false,
      baseUrl: 'http://127.0.0.1:8000',
    })

    expect(gateway).toBeInstanceOf(HttpDiagnosticGateway)
  })

  it('uses the deterministic gateway only when explicitly requested', () => {
    const gateway = createGateway(networkModeRef, {
      useDemoGateway: true,
    })

    expect(gateway).toBeInstanceOf(DemoDiagnosticGateway)
  })
})
