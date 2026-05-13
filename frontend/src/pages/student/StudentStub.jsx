import { useLocation } from 'react-router-dom'

const LABELS = {
  book: 'Book a Class',
  community: 'Community',
  chat: 'Chat',
  support: 'Help & Support',
  notifications: 'Notifications',
  forms: 'Forms',
  'studio-info': 'Studio Info',
}

export default function StudentStub() {
  const { pathname } = useLocation()
  const key = pathname.split('/').pop()
  const label = LABELS[key] || 'Coming Soon'

  return (
    <div>
      <div className="page-header">
        <div className="page-title">{label}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🚧</div>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, marginBottom: 10 }}>{label}</div>
        <div style={{ color: 'var(--grey)', fontSize: 14, maxWidth: 300 }}>
          This section is being built. Check back soon.
        </div>
      </div>
    </div>
  )
}
