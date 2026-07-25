import { Ban, Database, FileCheck2, Link2, LockKeyhole } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { IncidentCapsule } from '../types/domain'

interface CapsulePanelProps {
  capsule: IncidentCapsule
}

const evidenceLabels = {
  telemetry: 'Telemetry',
  alarm: 'Alarm',
  maintenance: 'Maintenance',
  topology: 'Topology',
  manual: 'Manual',
  inspection: 'Inspection',
  public: 'Public source',
}

export function CapsulePanel({ capsule }: CapsulePanelProps) {
  const [activeId, setActiveId] = useState(capsule.evidence[0]?.id ?? '')

  useEffect(() => {
    if (!capsule.evidence.some((record) => record.id === activeId)) {
      setActiveId(capsule.evidence[0]?.id ?? '')
    }
  }, [activeId, capsule])

  const activeEvidence = capsule.evidence.find((record) => record.id === activeId)
  const budgetPercent = Math.round((capsule.tokenBudget.used / capsule.tokenBudget.maximum) * 100)

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return

    event.preventDefault()
    const lastIndex = capsule.evidence.length - 1
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? lastIndex
        : event.key === 'ArrowRight'
          ? (currentIndex + 1) % capsule.evidence.length
          : (currentIndex - 1 + capsule.evidence.length) % capsule.evidence.length
    const nextRecord = capsule.evidence[nextIndex]

    if (nextRecord) {
      setActiveId(nextRecord.id)
      document.getElementById(`evidence-tab-${nextRecord.id}`)?.focus()
    }
  }

  return (
    <section className="panel capsule-panel" aria-labelledby="capsule-title">
      <div className="panel-heading capsule-heading">
        <div>
          <span className="eyebrow">IMMUTABLE CONTEXT</span>
          <h2 id="capsule-title">Incident Capsule</h2>
        </div>
        <div className="capsule-version">
          <FileCheck2 size={16} aria-hidden="true" />
          <span>VERSION {capsule.version}</span>
          <strong>{capsule.id}</strong>
        </div>
      </div>

      <p className="capsule-summary">{capsule.summary}</p>

      <div className="evidence-tabs" role="tablist" aria-label="Capsule evidence">
        {capsule.evidence.map((record, index) => (
          <button
            key={record.id}
            id={`evidence-tab-${record.id}`}
            type="button"
            role="tab"
            aria-selected={record.id === activeId}
            aria-controls={`evidence-panel-${record.id}`}
            tabIndex={record.id === activeId ? 0 : -1}
            className={record.id === activeId ? 'evidence-tab evidence-tab--active' : 'evidence-tab'}
            onClick={() => setActiveId(record.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            <span>{record.id}</span>
            <strong>{evidenceLabels[record.kind]}</strong>
          </button>
        ))}
      </div>

      {activeEvidence ? (
        <article
          id={`evidence-panel-${activeEvidence.id}`}
          className="evidence-detail"
          role="tabpanel"
          aria-labelledby={`evidence-tab-${activeEvidence.id}`}
          tabIndex={0}
        >
          <span className="evidence-detail-icon"><Database size={18} aria-hidden="true" /></span>
          <div>
            <div className="evidence-title-row">
              <h3>{activeEvidence.title}</h3>
              <span className="trust-badge"><LockKeyhole size={12} aria-hidden="true" /> VERIFIED LOCAL</span>
            </div>
            <p>{activeEvidence.detail}</p>
            <small><Link2 size={12} aria-hidden="true" /> {activeEvidence.source}</small>
          </div>
        </article>
      ) : null}

      <div className="capsule-footer">
        <div className="token-budget">
          <div><span>TOKEN BUDGET</span><strong>{capsule.tokenBudget.used} / {capsule.tokenBudget.maximum}</strong></div>
          <div className="budget-track" aria-label={`${budgetPercent}% of token budget used`}>
            <i style={{ transform: `scaleX(${budgetPercent / 100})` }} />
          </div>
        </div>
        <div className="forbidden-actions">
          <span><Ban size={13} aria-hidden="true" /> POLICY BLOCKED</span>
          <div>{capsule.forbiddenActions.map((action) => <small key={action}>{action}</small>)}</div>
        </div>
      </div>
    </section>
  )
}
