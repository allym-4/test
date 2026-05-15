import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import { classes, homework, attendance } from '../api'
import { Link } from 'react-router-dom'
import client from '../api/client'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayLabel() {
  return new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: sessionsData, loading: loadingSessions } = useApi(() => classes.list({ active: 'true' }))
  const { data: hwData, loading: loadingHw } = useApi(() => homework.list({ status: 'active' }))
  const { data: unreadData, loading: loadingUnread } = useApi(() => client.get('/api/helpdesk/conversations/', { params: { unread: true } }))
  const { data: allSessionsData, loading: loadingAllSessions } = useApi(() => client.get('/api/classes/sessions/', { params: { active: true } }))

  // No-shows this week
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const { data: noShowData, loading: loadingNoShows } = useApi(() =>
    attendance.list({ status: 'no_show', date_after: oneWeekAgo.toISOString().slice(0, 10) })
  )

  const sessions = sessionsData?.results || []
  const assignments = hwData?.results || []
  const unreadCount = unreadData?.count ?? (unreadData?.results?.length ?? 0)
  const noShowCount = noShowData?.count ?? (noShowData?.results?.length ?? 0)

  const todayDow = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  // All sessions today (all instructors)
  const allSessions = allSessionsData?.results || allSessionsData?.data?.results || []
  const allSessionsToday = allSessions.filter(s => s.day_of_week === todayDow)

  const todaySessions = sessions.filter(s => s.day_of_week === todayDow)
  const pendingReview = assignments.filter(a => a.submission_count > 0).length

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{greeting()}, {user?.first_name}</div>
          <div className="page-sub">{todayLabel()}</div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="kpi-grid">
        <Link to="/classes" className="kpi kpi-lime" style={{ textDecoration: 'none' }}>
          <div className="kpi-label">Students Today</div>
          <div className="kpi-value">
            {loadingSessions ? '—' : todaySessions.reduce((s, c) => s + (c.enrolled_count || 0), 0)}
          </div>
          <div className="kpi-sub">Across {todaySessions.length} class{todaySessions.length !== 1 ? 'es' : ''} →</div>
        </Link>
        <Link to="/homework" className="kpi kpi-lav" style={{ textDecoration: 'none' }}>
          <div className="kpi-label">Homework Pending</div>
          <div className="kpi-value">{loadingHw ? '—' : pendingReview}</div>
          <div className="kpi-sub">Submissions to review →</div>
        </Link>
        <Link to="/messages" className="kpi kpi-lav" style={{ textDecoration: 'none' }}>
          <div className="kpi-label">Unread Messages</div>
          <div className="kpi-value">{loadingUnread ? '—' : unreadCount}</div>
          <div className="kpi-sub">In your inbox →</div>
        </Link>
        <div className="kpi kpi-red">
          <div className="kpi-label">No-shows This Week</div>
          <div className="kpi-value">{loadingNoShows ? '—' : noShowCount}</div>
          <div className="kpi-sub">Past 7 days</div>
        </div>
      </div>

      {/* Today's classes */}
      {!loadingSessions && todaySessions.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div className="section-title" style={{ fontSize: 15, marginBottom: 14 }}>Your Classes Today</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {todaySessions.map(s => {
              const isFull = s.enrolled_count >= s.capacity
              return (
                <Link key={s.id} to={`/classes/${s.id}/attendance`} className="class-card-today" style={{ textDecoration: 'none' }}>
                  <div className="class-time-block">
                    <div className="class-day-label">{DAYS[s.day_of_week]}</div>
                    <div className="class-time-label">{s.start_time?.slice(0, 5)}</div>
                  </div>
                  <div className="class-info">
                    <div className="class-name-large">{s.name}</div>
                    <div className="class-meta-row">{s.studio_detail?.name} · {s.enrolled_count}/{s.capacity} enrolled</div>
                    <div style={{ marginTop: 6 }}>
                      <span className={`tag ${isFull ? 'tag-amber' : 'tag-lime'}`}>{isFull ? 'Full' : 'Active'}</span>
                      <span style={{ fontSize: 12, color: 'var(--grey)', marginLeft: 8 }}>Register not yet saved</span>
                    </div>
                  </div>
                  <div className="class-go-btn">Take Attendance →</div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* All Classes Today (all instructors) */}
      <div style={{ marginBottom: 28 }}>
        <div className="section-title" style={{ fontSize: 15, marginBottom: 14 }}>All Classes Today</div>
        {loadingAllSessions ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
        ) : allSessionsToday.length === 0 ? (
          <div className="empty-state">No classes scheduled today</div>
        ) : (
          <div className="list-card">
            {allSessionsToday.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')).map(s => {
              const isOwn = s.instructor === user?.id || s.instructor_detail?.id === user?.id
              return (
                <div key={s.id} className="list-row" style={{ opacity: isOwn ? 1 : 0.7 }}>
                  <div className="list-time">
                    <div className="list-time-val">{s.start_time?.slice(0, 5)}</div>
                    <div className="list-time-day">{DAYS[s.day_of_week]}</div>
                  </div>
                  <div className="list-body">
                    <div className="list-title" style={{ color: isOwn ? 'inherit' : 'var(--grey)' }}>
                      {s.name} · {s.studio_detail?.name}
                      {isOwn && (
                        <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--lime)', color: '#000', fontWeight: 700, borderRadius: 4, padding: '1px 6px', verticalAlign: 'middle' }}>YOURS</span>
                      )}
                    </div>
                    <div className="list-sub">{s.instructor_detail?.display_name || s.instructor_name || '—'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* All classes this week */}
      <div style={{ marginBottom: 28 }}>
        <div className="section-title" style={{ fontSize: 15, marginBottom: 14 }}>Your Upcoming This Week</div>
        {loadingSessions ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">No classes this week</div>
        ) : (
          <div className="list-card">
            {sessions.map(s => {
              const isFull = s.enrolled_count >= s.capacity
              return (
                <Link key={s.id} to={`/classes/${s.id}/attendance`} className="list-row clickable" style={{ textDecoration: 'none' }}>
                  <div className="list-time">
                    <div className="list-time-val">{s.start_time?.slice(0, 5)}</div>
                    <div className="list-time-day">{DAYS[s.day_of_week]}</div>
                  </div>
                  <div className="list-body">
                    <div className="list-title">{s.name} · {s.studio_detail?.name}</div>
                    <div className="list-sub">{s.enrolled_count}/{s.capacity} enrolled</div>
                  </div>
                  <div className="list-end">
                    <span className={`tag ${isFull ? 'tag-amber' : 'tag-lime'}`} style={{ fontSize: 10 }}>
                      {isFull ? 'Full' : 'Active'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--grey)' }}>›</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Homework section */}
      {!loadingHw && assignments.length > 0 && (
        <div>
          <div className="section-title" style={{ fontSize: 15, marginBottom: 14 }}>Active Homework</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {assignments.map(a => {
              const pct = a.enrolled_count ? Math.round(a.submission_count / a.enrolled_count * 100) : 0
              const s = a.class_session_detail
              const pctColor = pct === 100 ? 'var(--lime)' : pct > 50 ? 'var(--amber)' : 'var(--grey)'
              return (
                <Link key={a.id} to="/homework" className="hw-card" style={{ textDecoration: 'none' }}>
                  <div className="hw-card-header">
                    <div>
                      <div className="hw-card-title">{a.title}</div>
                      <div className="hw-card-meta">
                        {s?.name} — {DAYS[s?.day_of_week]} {s?.start_time?.slice(0, 5)} · {s?.studio_detail?.name} · Assigned {a.assigned_date ? new Date(a.assigned_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </div>
                    </div>
                    <span className="tag tag-lime" style={{ fontSize: 10, flexShrink: 0 }}>Active</span>
                  </div>
                  <div className="hw-card-progress">
                    <span>{a.submission_count}/{a.enrolled_count} submitted</span>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%`, background: pctColor }} /></div>
                    <span style={{ color: pctColor, minWidth: 28, textAlign: 'right' }}>{pct}%</span>
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
