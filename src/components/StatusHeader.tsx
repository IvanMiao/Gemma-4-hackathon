import { Cpu, Menu, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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

function SiteNav() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="header-nav" ref={rootRef}>
      <button
        className="header-menu"
        type="button"
        aria-label="Site navigation"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Menu size={18} aria-hidden="true" />
      </button>
      {open && (
        <nav className="header-nav-panel" aria-label="Site navigation">
          <Link to="/" onClick={() => setOpen(false)}>Home</Link>
          <Link to="/journey" onClick={() => setOpen(false)}>How it works</Link>
          <Link to="/simulator" onClick={() => setOpen(false)}>Live simulator</Link>
          <Link to="/observability" onClick={() => setOpen(false)}>Observability</Link>
        </nav>
      )}
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
        <SiteNav />
      </div>
    </header>
  )
}
