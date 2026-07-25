import { Cpu, Menu, Wifi, WifiOff } from 'lucide-react'
import type { NetworkMode, RunMetrics } from '../types/domain'

interface StatusHeaderProps {
  networkMode: NetworkMode
  outboundRequests: number
  metrics: RunMetrics | null
  onNetworkModeChange: (mode: NetworkMode) => void
}

function BrandMark() {
  return (
    <div className="brand" aria-label="Fault Capsule">
      <span className="brand-mark" aria-hidden="true"><i /><i /></span>
      <span className="brand-copy">
        <strong>FAULT<span>/</span>CAPSULE</strong>
        <small>ON-DEVICE INCIDENT AI</small>
      </span>
    </div>
  )
}

export function StatusHeader({
  networkMode,
  outboundRequests,
  metrics,
  onNetworkModeChange,
}: StatusHeaderProps) {
  const isOnline = networkMode === 'on'

  return (
    <header className="status-header">
      <BrandMark />
      <nav className="header-context" aria-label="Demo context">
        <span>INCIDENT LAB</span><i /><strong>PM-18</strong>
      </nav>
      <div className="system-status" aria-label="System status">
        <div className="local-status">
          <Cpu size={15} aria-hidden="true" />
          <span>
            <strong>GEMMA 4 · LOCAL</strong>
            <small>{metrics?.runtime ?? 'RUNTIME READY'}</small>
          </span>
        </div>
        <button
          className={`network-toggle ${isOnline ? 'network-toggle--on' : ''}`}
          type="button"
          role="switch"
          aria-checked={isOnline}
          aria-label={`Network is ${isOnline ? 'on' : 'off'}. Activate to switch modes.`}
          onClick={() => onNetworkModeChange(isOnline ? 'off' : 'on')}
        >
          {isOnline ? <Wifi size={16} aria-hidden="true" /> : <WifiOff size={16} aria-hidden="true" />}
          <span className="network-toggle-copy">
            <strong>NETWORK {isOnline ? 'ON' : 'OFF'}</strong>
            <small>{outboundRequests} OUTBOUND</small>
          </span>
          <i aria-hidden="true" />
        </button>
        <button className="header-menu" type="button" aria-label="Open demo menu">
          <Menu size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
