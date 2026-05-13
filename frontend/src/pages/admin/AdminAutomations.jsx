import { useState } from 'react'

const AUTOMATIONS = [
  {
    id: 'noshow_fee',
    icon: '⚠️',
    name: 'No-show Fee Charge',
    desc: 'Automatically charges a $20 fee when a student misses a class without cancelling.',
    trigger: 'Class marked: no-show',
    action: 'Charge $20 + send email',
    enabled: true,
    category: 'billing',
    lastRun: '2 days ago',
    runCount: 12,
  },
  {
    id: 'reengagement',
    icon: '💬',
    name: 'Re-engagement Email',
    desc: 'Sends a check-in email to students who haven\'t attended in 3+ weeks.',
    trigger: '21 days no attendance',
    action: 'Send re-engagement email via Gmail',
    enabled: true,
    category: 'comms',
    lastRun: '5 days ago',
    runCount: 4,
  },
  {
    id: 'waitlist_notify',
    icon: '🔔',
    name: 'Waitlist Spot Notification',
    desc: 'Notifies the next student on the waitlist when a spot opens up.',
    trigger: 'Enrolment cancelled or dropped',
    action: 'Send email + 12h response window',
    enabled: true,
    category: 'bookings',
    lastRun: '1 week ago',
    runCount: 3,
  },
  {
    id: 'parq_reminder',
    icon: '📋',
    name: 'PAR-Q Form Reminder',
    desc: 'Reminds new students to complete their health questionnaire before their first class.',
    trigger: 'Trial class booked + PAR-Q not submitted',
    action: 'Send reminder email 48h before class',
    enabled: true,
    category: 'forms',
    lastRun: '3 days ago',
    runCount: 8,
  },
  {
    id: 'season_enrol_open',
    icon: '📅',
    name: 'Season Enrolment Open Alert',
    desc: 'Notifies all active students when a new season opens for enrolment.',
    trigger: 'Season status → Upcoming',
    action: 'Bulk email all active students',
    enabled: false,
    category: 'comms',
    lastRun: '2 months ago',
    runCount: 2,
  },
  {
    id: 'payment_overdue',
    icon: '💳',
    name: 'Overdue Payment Reminder',
    desc: 'Sends a friendly reminder to students with outstanding balances over $30.',
    trigger: 'Balance owing > $30 for 7+ days',
    action: 'Send payment reminder email',
    enabled: true,
    category: 'billing',
    lastRun: '4 days ago',
    runCount: 6,
  },
  {
    id: 'welfare_checkin',
    icon: '💚',
    name: 'Welfare Check-in',
    desc: 'Sends a personal check-in to students showing concerning attendance patterns.',
    trigger: 'Attendance < 50% over 4 classes',
    action: 'Send welfare email from Mimi',
    enabled: false,
    category: 'comms',
    lastRun: 'Never',
    runCount: 0,
  },
  {
    id: 'birthday',
    icon: '🎂',
    name: 'Birthday Message',
    desc: 'Sends a personalised birthday message to students on their birthday.',
    trigger: 'Student birthday (date of birth)',
    action: 'Send birthday email',
    enabled: false,
    category: 'comms',
    lastRun: 'Never',
    runCount: 0,
  },
]

const CATEGORY_LABELS = { billing: 'Billing', comms: 'Communications', bookings: 'Bookings', forms: 'Forms' }

function Toggle({ on, onChange }) {
  const [val, setVal] = useState(on)
  return (
    <div onClick={() => { setVal(v => !v); onChange && onChange(!val) }} style={{ width: 40, height: 22, borderRadius: 11, background: val ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: val ? 21 : 3, transition: 'left 0.2s' }} />
    </div>
  )
}

export default function AdminAutomations() {
  const [filter, setFilter] = useState('all')

  const gmailConnected = true

  const shown = AUTOMATIONS.filter(a => filter === 'all' || a.category === filter)
  const enabledCount = AUTOMATIONS.filter(a => a.enabled).length

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Automations</div>
          <div className="page-sub">Automated workflows and triggers</div>
        </div>
        <button className="btn btn-lime btn-sm">+ New Automation</button>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {[
          ['Active', enabledCount, 'kpi-lime'],
          ['Inactive', AUTOMATIONS.length - enabledCount, 'kpi-grey'],
          ['Runs This Month', 35, 'kpi-lav'],
          ['Emails Sent', 89, 'kpi-amber'],
        ].map(([label, val, cls]) => (
          <div key={label} className={`kpi ${cls}`}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: gmailConnected ? 'rgba(204,255,0,0.06)' : 'rgba(255,170,0,0.06)', border: `1px solid ${gmailConnected ? 'rgba(204,255,0,0.2)' : 'rgba(255,170,0,0.3)'}`, borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, fontSize: 13 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: gmailConnected ? 'var(--lime)' : 'var(--amber)', flexShrink: 0 }} />
        {gmailConnected ? (
          <span>Gmail connected — <b>mimi@dualitypole.com.au</b>. All email automations are active.</span>
        ) : (
          <span style={{ color: 'var(--amber)' }}>Gmail not connected — email automations are paused. <button className="btn btn-ghost btn-xs" style={{ marginLeft: 8 }}>Connect Gmail</button></span>
        )}
      </div>

      <div className="filter-bar" style={{ marginBottom: 20 }}>
        {[['all', 'All'], ['billing', 'Billing'], ['comms', 'Communications'], ['bookings', 'Bookings'], ['forms', 'Forms']].map(([key, label]) => (
          <span key={key} className={`filter-tag ${filter === key ? 'active-tag' : ''}`} onClick={() => setFilter(key)}>{label}</span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {shown.map(a => (
          <div key={a.id} style={{ background: 'var(--card)', border: `1px solid ${a.enabled ? 'var(--border)' : '#111'}`, borderRadius: 12, padding: '16px 18px', opacity: a.enabled ? 1 : 0.65 }}>
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
                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--grey)', marginTop: 6 }}>
                  <span>Last run: {a.lastRun}</span>
                  <span>Runs: {a.runCount}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <button className="btn btn-ghost btn-xs">Edit</button>
                <Toggle on={a.enabled} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
