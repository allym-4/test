import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import { classes, homework } from '../api'
import { Link } from 'react-router-dom'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: sessionsData, loading: loadingSessions } = useApi(() => classes.list({ active: 'true' }))
  const { data: hwData, loading: loadingHw } = useApi(() => homework.list({ status: 'active' }))

  const sessions = sessionsData?.results || []
  const assignments = hwData?.results || []

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Hey {user?.first_name} 👋</div>
          <div className="page-sub">Here's what's on today</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <StatCard label="Active Classes" value={sessions.length} loading={loadingSessions} />
        <StatCard label="Active Homework" value={assignments.length} loading={loadingHw} />
        <StatCard label="Pending Review" value={assignments.filter(a => a.submission_count > 0).length} loading={loadingHw} color="var(--amber)" />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: '12px', fontWeight: 500 }}>
          Your Classes
        </div>
        {loadingSessions ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><div className="spinner" /></div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">No active classes</div>
        ) : (
          <div className="list-card">
            {sessions.map(s => (
              <Link key={s.id} to={`/classes/${s.id}/attendance`} className="list-row clickable">
                <div style={{ width: 40, flexShrink: 0, textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, color: 'var(--lime)' }}>
                    {DAYS[s.day_of_week]}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--grey)' }}>
                    {s.start_time?.slice(0, 5)}
                  </div>
                </div>
                <div className="list-body">
                  <div className="list-title">{s.name} · {s.studio_detail?.name}</div>
                  <div className="list-sub">{s.enrolled_count}/{s.capacity} enrolled</div>
                </div>
                <span className="tag tag-lav" style={{ fontSize: 10 }}>{s.session_type}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {assignments.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: '12px', fontWeight: 500 }}>
            Active Homework
          </div>
          <div className="list-card">
            {assignments.map(a => {
              const pct = a.enrolled_count ? Math.round(a.submission_count / a.enrolled_count * 100) : 0
              return (
                <Link key={a.id} to="/homework" className="list-row clickable">
                  <div className="list-body">
                    <div className="list-title">{a.title}</div>
                    <div className="list-sub">
                      {a.class_session_detail?.name} — {DAYS[a.class_session_detail?.day_of_week]} {a.class_session_detail?.start_time?.slice(0, 5)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{ width: 60 }}>
                      <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--grey)', width: 28, textAlign: 'right' }}>{pct}%</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, loading, color = 'var(--lime)' }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color }}>
        {loading ? '—' : value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>{label}</div>
    </div>
  )
}
