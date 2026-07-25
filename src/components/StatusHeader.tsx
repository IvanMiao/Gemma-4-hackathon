import { Cpu, PlugZap, ShieldCheck, Wifi, WifiOff } from 'lucide-react'
import type { NetworkMode, RunMetrics } from '../types/domain'

interface StatusHeaderProps {
  networkMode: NetworkMode
  pluginEnabled: boolean
  outboundRequests: number
  metrics: RunMetrics | null
  onNetworkModeChange: (mode: NetworkMode) => void
}

function BrandMark() {
  return (
    <div className="brand" aria-label="Fault Capsule">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="brand-copy">
        <strong>FAULT CAPSULE</strong>
        <small>ON-DEVICE INCIDENT INTELLIGENCE</small>
      </span>
    </div>
  )
}

export function StatusHeader({
  networkMode,
  pluginEnabled,
  outboundRequests,
  metrics,
  onNetworkModeChange,
}: StatusHeaderProps) {
  const isOnline = networkMode === 'on'

  return (
    <header className="status-header">
      <BrandMark />
      <div className="system-status" aria-label="System status">
        <div className="status-pill status-pill--safe">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>ON-DEVICE</span>
        </div>
        <div className="status-pill status-pill--neutral status-runtime">
          <Cpu size={15} aria-hidden="true" />
          <span>{metrics?.runtime ?? 'LOCAL RUNTIME'}</span>
        </div>
        <div className="status-pill status-pill--neutral status-plugin">
          <PlugZap size={15} aria-hidden="true" />
          <span>SERPAPI {pluginEnabled ? 'READY' : 'UNLOADED'}</span>
        </div>
        <span className="outbound-count" title="Outbound requests in this session">
          OUTBOUND <strong>{outboundRequests}</strong>
        </span>
        <button
          className={`network-toggle ${isOnline ? 'network-toggle--on' : ''}`}
          type="button"
          role="switch"
          aria-checked={isOnline}
          aria-label={`Network is ${isOnline ? 'on' : 'off'}. Activate to switch modes.`}
          onClick={() => onNetworkModeChange(isOnline ? 'off' : 'on')}
        >
          {isOnline ? <Wifi size={16} aria-hidden="true" /> : <WifiOff size={16} aria-hidden="true" />}
          <span>NETWORK {isOnline ? 'ON' : 'OFF'}</span>
          <i aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
