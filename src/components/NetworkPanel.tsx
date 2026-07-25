import {
  CheckCircle2,
  CloudOff,
  ExternalLink,
  LoaderCircle,
  PlugZap,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { EvidenceSearchResult, NetworkMode } from '../types/domain'

interface NetworkPanelProps {
  mode: NetworkMode
  pluginEnabled: boolean
  isEnriching: boolean
  enrichment: EvidenceSearchResult | null
  onPluginChange: (enabled: boolean) => void
  onEnrich: () => void
}

export function NetworkPanel({
  mode,
  pluginEnabled,
  isEnriching,
  enrichment,
  onPluginChange,
  onEnrich,
}: NetworkPanelProps) {
  const isOnline = mode === 'on'

  return (
    <section className="panel network-panel" aria-labelledby="network-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">OPTIONAL EVIDENCE</span>
          <h2 id="network-title">Network boundary</h2>
        </div>
        {isOnline ? <PlugZap size={20} aria-hidden="true" /> : <CloudOff size={20} aria-hidden="true" />}
      </div>

      <div className={`network-state ${isOnline ? 'network-state--on' : ''}`}>
        <span className="network-state-icon">
          {isOnline ? <Search size={20} aria-hidden="true" /> : <ShieldCheck size={20} aria-hidden="true" />}
        </span>
        <div>
          <strong>{isOnline ? 'Connected evidence channel open' : 'Offline core protected'}</strong>
          <p>
            {isOnline
              ? 'Only the SerpAPI evidence plugin is available. Gemma inference and incident data stay on-device.'
              : 'SerpAPI is unloaded. The application gateway rejects non-local requests.'}
          </p>
        </div>
      </div>

      <label className={`plugin-switch ${isOnline ? '' : 'plugin-switch--disabled'}`}>
        <span>
          <strong>SerpAPI add-on</strong>
          <small>{pluginEnabled ? 'ready · domain allowlist active' : 'unloaded by policy'}</small>
        </span>
        <input
          type="checkbox"
          checked={pluginEnabled}
          disabled={!isOnline}
          onChange={(event) => onPluginChange(event.target.checked)}
        />
        <i aria-hidden="true" />
      </label>

      <div className="query-envelope">
        <span>MINIMIZED QUERY ENVELOPE</span>
        <dl>
          <div><dt>DEVICE</dt><dd>electric point machine</dd></div>
          <div><dt>CODE</dt><dd>POSITION_INDICATION_LOSS</dd></div>
          <div><dt>SITE ID</dt><dd className="redacted">REDACTED</dd></div>
        </dl>
      </div>

      <button
        className="network-action"
        type="button"
        disabled={!pluginEnabled || isEnriching}
        onClick={onEnrich}
      >
        {isEnriching ? <LoaderCircle className="spinner" size={17} aria-hidden="true" /> : <Search size={17} aria-hidden="true" />}
        {isEnriching ? 'Retrieving and sanitizing evidence' : enrichment ? 'Refresh public evidence' : 'Retrieve public maintenance evidence'}
      </button>

      <AnimatePresence>
        {enrichment ? (
          <motion.div
            className="external-result"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <CheckCircle2 size={16} aria-hidden="true" />
            <div>
              <span>NORMALIZED · AUTHORITATIVE PUBLIC</span>
              <strong>{enrichment.records[0]?.title}</strong>
              <a href={enrichment.records[0]?.url} target="_blank" rel="noreferrer">
                View source <ExternalLink size={12} aria-hidden="true" />
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}
