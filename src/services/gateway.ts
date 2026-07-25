import {
  baseMetrics,
  demoCapsuleV2,
  demoIncident,
  demoInspection,
  finalDecision,
  firstDecision,
  publicEvidence,
} from '../data/demoIncident'
import type {
  DiagnosticGateway,
  EvidenceSearchResult,
  IncidentCapsule,
  IncidentFixture,
  InferenceResult,
  InformationNeed,
  InspectionRunResult,
  NetworkMode,
} from '../types/domain'

function pause(duration: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(resolve, duration)
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeout)
        reject(new DOMException('Request aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

export class DemoDiagnosticGateway implements DiagnosticGateway {
  async loadIncident(signal?: AbortSignal): Promise<IncidentFixture> {
    await pause(180, signal)
    return demoIncident
  }

  async infer(capsule: IncidentCapsule, signal?: AbortSignal): Promise<InferenceResult> {
    await pause(1100, signal)
    const isSecondRound = capsule.version > 1

    return {
      decision: isSecondRound ? finalDecision : firstDecision,
      metrics: {
        ...baseMetrics,
        totalLatencyMs: isSecondRound ? 1618 : baseMetrics.totalLatencyMs,
        inputTokens: capsule.tokenBudget.used,
      },
    }
  }

  async runInspection(
    _incidentId: string,
    _actionId: string,
    signal?: AbortSignal,
  ): Promise<InspectionRunResult> {
    await pause(900, signal)
    return { inspection: demoInspection, nextCapsule: demoCapsuleV2 }
  }

  async searchPublicEvidence(
    _need: InformationNeed,
    signal?: AbortSignal,
  ): Promise<EvidenceSearchResult> {
    await pause(950, signal)
    return {
      records: [publicEvidence],
      sentFields: ['device_type', 'public_error_code', 'information_need'],
      provider: 'serpapi',
      retrievedAt: '2026-07-25T14:41:06+02:00',
    }
  }
}

interface HttpGatewayOptions {
  baseUrl: string
  getNetworkMode: () => NetworkMode
}

export class HttpDiagnosticGateway implements DiagnosticGateway {
  constructor(private readonly options: HttpGatewayOptions) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const target = new URL(path, this.options.baseUrl)
    const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)

    if (this.options.getNetworkMode() === 'off' && !isLocal) {
      throw new Error('Network OFF policy blocked a non-local request')
    }

    const response = await fetch(target, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`)
    }

    return response.json() as Promise<T>
  }

  loadIncident(signal?: AbortSignal): Promise<IncidentFixture> {
    return this.request('/api/incidents/active', { signal })
  }

  infer(capsule: IncidentCapsule, signal?: AbortSignal): Promise<InferenceResult> {
    return this.request('/api/inference', {
      method: 'POST',
      body: JSON.stringify({ capsule }),
      signal,
    })
  }

  runInspection(
    incidentId: string,
    actionId: string,
    signal?: AbortSignal,
  ): Promise<InspectionRunResult> {
    return this.request(`/api/incidents/${incidentId}/inspections`, {
      method: 'POST',
      body: JSON.stringify({ actionId }),
      signal,
    })
  }

  searchPublicEvidence(
    need: InformationNeed,
    signal?: AbortSignal,
  ): Promise<EvidenceSearchResult> {
    if (this.options.getNetworkMode() === 'off') {
      return Promise.reject(new Error('SerpAPI is unavailable while Network OFF'))
    }

    return this.request('/api/evidence/serpapi', {
      method: 'POST',
      body: JSON.stringify(need),
      signal,
    })
  }
}
