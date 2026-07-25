import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { DemoDiagnosticGateway, HttpDiagnosticGateway } from '../services/gateway'
import { demoReducer, initialDemoState } from '../state/demoMachine'
import type { DiagnosticGateway, NetworkMode } from '../types/domain'

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error. Please try again.'
}

interface GatewayEnvironment {
  useDemoGateway: boolean
  baseUrl?: string
}

export function createGateway(
  networkModeRef: React.RefObject<NetworkMode>,
  environment: GatewayEnvironment = {
    useDemoGateway: import.meta.env.VITE_USE_DEMO_GATEWAY === 'true',
    baseUrl: import.meta.env.VITE_API_BASE_URL as string | undefined,
  },
): DiagnosticGateway {
  if (environment.useDemoGateway) return new DemoDiagnosticGateway()

  return new HttpDiagnosticGateway({
    baseUrl: environment.baseUrl || window.location.origin,
    getNetworkMode: () => networkModeRef.current ?? 'off',
  })
}

export function useDemoController() {
  const [state, dispatch] = useReducer(demoReducer, initialDemoState)
  const [isEnriching, setIsEnriching] = useState(false)
  const networkModeRef = useRef<NetworkMode>('off')
  const gateway = useMemo(() => createGateway(networkModeRef), [networkModeRef])

  useEffect(() => {
    const controller = new AbortController()

    gateway
      .loadIncident(controller.signal)
      .then((incident) => dispatch({ type: 'INCIDENT_LOADED', incident }))
      .catch((error: unknown) => {
        if ((error as DOMException).name !== 'AbortError') {
          dispatch({ type: 'FAILED', message: toMessage(error) })
        }
      })

    return () => controller.abort()
  }, [gateway])

  const analyze = useCallback(async () => {
    if (!state.capsule || state.phase === 'analyzing') return
    dispatch({ type: 'ANALYSIS_STARTED' })

    try {
      const result = await gateway.infer(state.capsule)
      dispatch({ type: 'DECISION_RECEIVED', ...result })
    } catch (error) {
      dispatch({ type: 'FAILED', message: toMessage(error) })
    }
  }, [gateway, state.capsule, state.phase])

  const inspect = useCallback(async () => {
    if (!state.incident || !state.decision || state.phase !== 'decision-ready') return
    dispatch({ type: 'INSPECTION_STARTED' })

    try {
      const inspectionResult = await gateway.runInspection(
        state.incident.id,
        state.decision.actionId,
      )
      const inferenceResult = await gateway.infer(inspectionResult.nextCapsule)
      dispatch({
        type: 'INSPECTION_RECEIVED',
        inspection: inspectionResult.inspection,
        capsule: inspectionResult.nextCapsule,
        ...inferenceResult,
      })
    } catch (error) {
      dispatch({ type: 'FAILED', message: toMessage(error) })
    }
  }, [gateway, state.decision, state.incident, state.phase])

  const setNetworkMode = useCallback((mode: NetworkMode) => {
    networkModeRef.current = mode
    dispatch({ type: 'NETWORK_MODE_CHANGED', mode })
  }, [])

  const setPluginEnabled = useCallback((enabled: boolean) => {
    dispatch({ type: 'PLUGIN_CHANGED', enabled })
  }, [])

  const enrich = useCallback(async () => {
    if (state.networkMode !== 'on' || !state.pluginEnabled || isEnriching) return
    setIsEnriching(true)

    try {
      const result = await gateway.searchPublicEvidence({
        reason: 'Confirm whether public maintenance guidance requires a connector-latch inspection',
        deviceType: 'electric point machine',
        publicErrorCode: 'POSITION_INDICATION_LOSS',
        approvedDomains: ['manufacturer.example', 'era.europa.eu'],
      })
      dispatch({ type: 'ENRICHMENT_RECEIVED', result })
    } catch (error) {
      dispatch({ type: 'FAILED', message: toMessage(error) })
    } finally {
      setIsEnriching(false)
    }
  }, [gateway, isEnriching, state.networkMode, state.pluginEnabled])

  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  return {
    state,
    isEnriching,
    actions: { analyze, inspect, reset, setNetworkMode, setPluginEnabled, enrich },
  }
}
