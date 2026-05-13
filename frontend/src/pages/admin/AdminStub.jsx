import { useLocation } from 'react-router-dom'

const LABELS = {
  messages: 'Messages',
  community: 'Community',
  automations: 'Automations',
  recommendations: 'Recommendations',
  leads: 'Leads',
  retail: 'Retail',
  waitlist: 'Waitlist',
  lockers: 'Lockers',
  helpdesk: 'Helpdesk',
  settings: 'Settings',
}

export default function AdminStub() {
  const { pathname } = useLocation()
  const key = pathname.split('/').pop()
  const label = LABELS[key] || 'This screen'

  return (
    <div>
      <div className="page-header">
        <div className="page-title">{LABELS[key] || 'Coming Soon'}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🚧</div>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, marginBottom: 10 }}>{label}</div>
        <div style={{ color: 'var(--grey)', fontSize: 14, maxWidth: 320 }}>
          This section is being built. Check back soon — it'll be here.
        </div>
      </div>
    </div>
  )
}
