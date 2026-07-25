import { AlertTriangle, CheckCircle2, Clock3, Wrench } from 'lucide-react'
import type { InspectionResult, TimelineEvent } from '../types/domain'

interface IncidentTimelineProps {
  events: TimelineEvent[]
  inspection: InspectionResult | null
}

const eventIcons = {
  neutral: Wrench,
  info: Clock3,
  warning: AlertTriangle,
  critical: AlertTriangle,
}

export function IncidentTimeline({ events, inspection }: IncidentTimelineProps) {
  return (
    <section className="panel timeline-panel" aria-labelledby="timeline-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">EVENT STREAM</span>
          <h2 id="timeline-title">Incident timeline</h2>
        </div>
        <span className="live-label"><i /> LIVE</span>
      </div>
      <ol className="timeline-list">
        {events.map((event) => {
          const Icon = eventIcons[event.tone]
          return (
            <li key={event.id} className={`timeline-item timeline-item--${event.tone}`}>
              <span className="timeline-icon"><Icon size={15} aria-hidden="true" /></span>
              <div>
                <time>{event.time}</time>
                <strong>{event.label}</strong>
                <p>{event.detail}</p>
              </div>
            </li>
          )
        })}
        {inspection ? (
          <li className="timeline-item timeline-item--success timeline-item--new">
            <span className="timeline-icon"><CheckCircle2 size={15} aria-hidden="true" /></span>
            <div>
              <time>14:38:09</time>
              <strong>Inspection result added</strong>
              <p>{inspection.finding}</p>
            </div>
          </li>
        ) : null}
      </ol>
    </section>
  )
}
