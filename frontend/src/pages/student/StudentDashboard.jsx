import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { enrolments, attendance, payments } from '../../api'
import { Link } from 'react-router-dom'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const { data: enrolData, loading: loadingEnrol } = useApi(() => enrolments.list({ student: user?.id, status: 'active' }), [user?.id])
  const { data: attData, loading: loadingAtt } = useApi(() => attendance.list({ student: user?.id }), [user?.id])
  const { data: balData } = useApi(() => payments.balance(user?.id), [user?.id])

  const enrolments_ = enrolData?.results || []
  const attHistory = attData?.results || []
  const bal = balData ? parseFloat(balData.balance) : 0

  const presentCount = attHistory.filter(a => a.status === 'present').length
  const noShowCount = attHistory.filter(a => a.status === 'no_show').length
  const isOwing = bal < 0

  const todayDow = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  const todayClasses = enrolments_.filter(e => e.class_session_detail?.day_of_week === todayDow)
  const upcomingClasses = enrolments_.filter(e => e.class_session_detail?.day_of_week !== todayDow)
    .sort((a, b) => {
      const dow = d => ((d.class_session_detail?.day_of_week - todayDow + 7) % 7) || 7
      return dow(a) - dow(b)
    })

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{greeting()}, {user?.first_name} 👋</div>
          <div className="page-sub">{new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      {/* Balance alert */}
      {isOwing && (
        <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--red)', marginBottom: 4 }}>Outstanding Balance</div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: '#ff6b6b' }}>${Math.abs(bal).toFixed(2)}</div>
          </div>
          <Link to="/portal/billing"><button className="btn btn-lime btn-sm">Pay now</button></Link>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lime)' }}>{loadingEnrol ? '—' : enrolments_.length}</div>
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>Enrolled Classes</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lav)' }}>{loadingAtt ? '—' : attHistory.length}</div>
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>Classes Attended</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lime)' }}>{loadingAtt ? '—' : presentCount}</div>
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>Times Present</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: isOwing ? 'var(--red)' : 'var(--lime)' }}>
            {isOwing ? `-$${Math.abs(bal).toFixed(0)}` : bal > 0 ? `$${bal.toFixed(0)} cr` : '$0'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>Account Balance</div>
        </div>
      </div>

      {/* Today's classes */}
      {todayClasses.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="section-title" style={{ fontSize: 15, marginBottom: 12 }}>Today</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {todayClasses.map(e => {
              const s = e.class_session_detail
              return (
                <div key={e.id} className="class-card-today" style={{ cursor: 'default' }}>
                  <div className="class-time-block">
                    <div className="class-day-label">{DAYS[s?.day_of_week]}</div>
                    <div className="class-time-label">{s?.start_time?.slice(0, 5)}</div>
                  </div>
                  <div className="class-info">
                    <div className="class-name-large">{s?.name}</div>
                    <div className="class-meta-row">{s?.studio_detail?.name}</div>
                    <div style={{ marginTop: 6 }}>
                      <span className="tag tag-lime" style={{ fontSize: 10 }}>Enrolled</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--lime)', fontWeight: 600 }}>Today ✓</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upcoming */}
      <div>
        <div className="section-title" style={{ fontSize: 15, marginBottom: 12 }}>
          {todayClasses.length > 0 ? 'Upcoming This Week' : 'Your Classes'}
        </div>
        {loadingEnrol ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
        ) : enrolments_.length === 0 ? (
          <div className="empty-state">
            <div style={{ marginBottom: 8 }}>No classes enrolled yet</div>
            <div style={{ fontSize: 12 }}>Contact your studio to get set up</div>
          </div>
        ) : (
          <div className="list-card">
            {(todayClasses.length > 0 ? upcomingClasses : enrolments_).map(e => {
              const s = e.class_session_detail
              return (
                <Link key={e.id} to="/portal/classes" className="list-row clickable" style={{ textDecoration: 'none' }}>
                  <div className="list-time">
                    <div className="list-time-val">{s?.start_time?.slice(0, 5)}</div>
                    <div className="list-time-day">{DAYS[s?.day_of_week]}</div>
                  </div>
                  <div className="list-body">
                    <div className="list-title">{s?.name} · {s?.studio_detail?.name}</div>
                    <div className="list-sub">{DAYS_FULL[s?.day_of_week]} recurring</div>
                  </div>
                  <span className="tag tag-lav" style={{ fontSize: 10 }}>{e.enrolment_type}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
