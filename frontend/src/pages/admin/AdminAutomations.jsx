import { useState, useEffect } from 'react'
import { automations } from '../../api'

const AUTOMATION_DEFS = [
  { slug: 'noshow_fee', icon: '⚠️', name: 'No-show Fee Charge', desc: "Automatically charges a $20 fee when a student misses a class without cancelling.", trigger: 'Class marked: no-show', action: 'Charge $20 + send email', category: 'billing', defaultEnabled: true },
  { slug: 'reengagement', icon: '💬', name: 'Re-engagement Email', desc: "Sends a check-in email to students who haven't attended in 3+ weeks.", trigger: '21 days no attendance', action: 'Send re-engagement email via Gmail', category: 'comms', defaultEnabled: true },
  { slug: 'waitlist_notify', icon: '🔔', name: 'Waitlist Spot Notification', desc: 'Notifies the next student on the waitlist when a spot opens up.', trigger: 'Enrolment cancelled or dropped', action: 'Send email + 12h response window', category: 'bookings', defaultEnabled: true },
  { slug: 'parq_reminder', icon: '📋', name: 'PAR-Q Form Reminder', desc: 'Reminds new students to complete their health questionnaire before their first class.', trigger: 'Trial class booked + PAR-Q not submitted', action: 'Send reminder email 48h before class', category: 'forms', defaultEnabled: true },
  { slug: 'season_enrol_open', icon: '📅', name: 'Season Enrolment Open Alert', desc: 'Notifies all active students when a new season opens for enrolment.', trigger: 'Season status → Upcoming', action: 'Bulk email all active students', category: 'comms', defaultEnabled: false },
  { slug: 'payment_overdue', icon: '💳', name: 'Overdue Payment Reminder', desc: 'Sends a friendly reminder to students with outstanding balances over $30.', trigger: 'Balance owing > $30 for 7+ days', action: 'Send payment reminder email', category: 'billing', defaultEnabled: true },
  { slug: 'welfare_checkin', icon: '💚', name: 'Welfare Check-in', desc: 'Sends a personal check-in to students showing concerning attendance patterns.', trigger: 'Attendance < 50% over 4 classes', action: 'Send welfare email from Mimi', category: 'comms', defaultEnabled: false },
  { slug: 'birthday', icon: '🎂', name: 'Birthday Message', desc: 'Sends a personalised birthday message to students on their birthday.', trigger: 'Student birthday (date of birth)', action: 'Send birthday email', category: 'comms', defaultEnabled: false },
]

const CATEGORY_LABELS = { billing: 'Billing', comms: 'Communications', bookings: 'Bookings', forms: 'Forms' }

function Toggle({ checked, onChange }) {
  return (
    <div onClick={onChange} style={{ width: 40, height: 22, borderRadius: 11, background: checked ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: checked ? 21 : 3, transition: 'left 0.2s' }} />
    </div>
  )
}

export default function AdminAutomations() {
  const [filter, setFilter] = useState('all')
  const [enabledMap, setEnabledMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    automations.list().then(r => {
      const stored = r.data.results || r.data
      const map = {}
      AUTOMATION_DEFS.forEach(def => {
        const found = stored.find(s => s.slug === def.slug)
        map[def.slug] = found ? found.enabled : def.defaultEnabled
      })
      setEnabledMap(map)
    }).finally(() => setLoading(false))
  }, [])

  async function toggle(slug) {
    const newVal = !enabledMap[slug]
    setEnabledMap(prev => ({ ...prev, [slug]: newVal }))
    try {
      await automations.toggle(slug, newVal)
    } catch {
      setEnabledMap(prev => ({ ...prev, [slug]: !newVal }))
    }
  }

  const shown = AUTOMATION_DEFS.filter(a => filter === 'all' || a.category === filter)
  const enabledCount = AUTOMATION_DEFS.filter(a => enabledMap[a.slug]).length

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Automations</div>
          <div className="page-sub">Automated workflows and triggers</div>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {[
          ['Active', loading ? '…' : enabledCount, 'kpi-lime'],
          ['Inactive', loading ? '…' : AUTOMATION_DEFS.length - enabledCount, 'kpi-grey'],
          ['Runs This Month', 35, 'kpi-lav'],
          ['Emails Sent', 89, 'kpi-amber'],
        ].map(([label, val, cls]) => (
          <div key={label} className={`kpi ${cls}`}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.2)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, fontSize: 13 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)', flexShrink: 0 }} />
        <span>Gmail connected — <b>mimi@dualitypole.com.au</b>. All email automations are active.</span>
      </div>

      <div className="filter-bar" style={{ marginBottom: 20 }}>
        {[['all', 'All'], ['billing', 'Billing'], ['comms', 'Communications'], ['bookings', 'Bookings'], ['forms', 'Forms']].map(([key, label]) => (
          <span key={key} className={`filter-tag ${filter === key ? 'active-tag' : ''}`} onClick={() => setFilter(key)}>{label}</span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {shown.map(a => {
          const enabled = loading ? a.defaultEnabled : (enabledMap[a.slug] ?? a.defaultEnabled)
          return (
            <div key={a.slug} style={{ background: 'var(--card)', border: `1px solid ${enabled ? 'var(--border)' : '#111'}`, borderRadius: 12, padding: '16px 18px', opacity: enabled ? 1 : 0.65 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                    <span className={`tag ${a.category === 'billing' ? 'tag-amber' : a.category === 'comms' ? 'tag-lav' : a.category === 'bookings' ? 'tag-lime' : 'tag-grey'}`} style={{ fontSize: 9 }}>{CATEGORY_LABELS[a.category]}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10, lineHeight: 1.5 }}>{a.desc}</div>
                  <div style={{ display: 'flex', gap: 20, fontSize: 11 }}>
                    <div><span style={{ color: 'var(--grey)' }}>Trigger: </span><span>{a.trigger}</span></div>
                    <div><span style={{ color: 'var(--grey)' }}>Action: </span><span>{a.action}</span></div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <Toggle checked={enabled} onChange={() => toggle(a.slug)} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
