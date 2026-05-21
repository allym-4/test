import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import { classes, homework, attendance, actionItems } from '../api'
import { Link } from 'react-router-dom'
import client from '../api/client'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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
  const todayDow = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  // My sessions (instructor-filtered by API)
  const { data: sessionsData, loading: loadingSessions } = useApi(() => classes.list({ active: 'true' }))
  // All sessions today (all instructors)
  const { data: allSessionsData, loading: loadingAllSessions } = useApi(() =>
    client.get('/api/classes/sessions/', { params: { active: true } })
  )
  const { data: hwData } = useApi(() => homework.list({ status: 'active' }))
  const { data: unreadData } = useApi(() => client.get('/api/helpdesk/conversations/', { params: { unread: true } }))
  const { data: actionItemsData, refetch: refetchActions } = useApi(() => actionItems.list({ done: 'false' }))

  // No-shows this week — instructor's classes only
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const { data: noShowData } = useApi(() =>
    attendance.list({ status: 'no_show', date_after: oneWeekAgo.toISOString().slice(0, 10), instructor: user?.id })
  )

  const sessions = sessionsData?.results || []
  const allSessions = allSessionsData?.results || allSessionsData?.data?.results || []
  const assignments = hwData?.results || []
  const unreadCount = unreadData?.count ?? (unreadData?.results?.length ?? 0)
  const noShows = noShowData?.results || []
  const noShowCount = noShowData?.count ?? noShows.length
  const items = actionItemsData?.results || actionItemsData || []

  const todaySessions = sessions.filter(s => s.day_of_week === todayDow)
  const allSessionsToday = allSessions
    .filter(s => s.day_of_week === todayDow)
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))

  const pendingHw = assignments.filter(a => a.submission_count > 0).length

  const firstNoShow = noShows[0]
  const noShowSub = firstNoShow
    ? `${firstNoShow.student_detail?.first_name || ''} ${(firstNoShow.student_detail?.last_name || '')[0] || ''}. — ${firstNoShow.session_detail?.name || ''} →`
    : 'Past 7 days'

  async function toggleActionItem(item) {
    await actionItems.update(item.id, { is_done: !item.is_done })
    refetchActions()
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, marginBottom: 2 }}>
          {greeting()}, {user?.first_name}
        </div>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>{todayLabel()}</div>
      </div>

      {/* Action Items */}
      {items.length > 0 && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 14, padding: '18px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15 }}>Today's Action Items</div>
            <span style={{ fontSize: 12, color: 'var(--grey)' }}>{items.length} pending</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {items.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 12px', borderRadius: 10,
                  background: item.is_urgent ? 'rgba(255,68,68,0.07)' : 'transparent',
                  border: item.is_urgent ? '1px solid rgba(255,68,68,0.2)' : '1px solid transparent',
                }}
              >
                <button
                  onClick={() => toggleActionItem(item)}
                  style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 2,
                    border: '2px solid #444', background: 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: item.is_urgent ? '#ff6b6b' : '#fff', marginBottom: 2 }}>
                    {item.title}
                  </div>
                  {item.body && (
                    <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.5 }}>{item.body}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        <Link to="/classes" style={{ textDecoration: 'none', background: '#111', border: '1px solid #222', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Students Today</div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, color: 'var(--lime)', marginBottom: 4 }}>
            {loadingSessions ? '—' : todaySessions.reduce((s, c) => s + (c.enrolled_count || 0), 0)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--grey)' }}>Across {todaySessions.length} class{todaySessions.length !== 1 ? 'es' : ''} →</div>
        </Link>
        <Link to="/homework" style={{ textDecoration: 'none', background: '#111', border: '1px solid #222', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Homework Pending</div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, color: '#b0a0ff', marginBottom: 4 }}>{pendingHw}</div>
          <div style={{ fontSize: 12, color: 'var(--grey)' }}>Submissions to review →</div>
        </Link>
        <Link to="/messages" style={{ textDecoration: 'none', background: '#111', border: '1px solid #222', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Unread Messages</div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, color: '#b0a0ff', marginBottom: 4 }}>{unreadCount}</div>
          <div style={{ fontSize: 12, color: 'var(--grey)' }}>{unreadCount === 1 ? '1 message request' : `${unreadCount} message requests`} →</div>
        </Link>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>No-shows This Week</div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, color: noShowCount > 0 ? '#ff6b6b' : 'var(--grey)', marginBottom: 4 }}>{noShowCount}</div>
          <div style={{ fontSize: 12, color: 'var(--grey)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{noShowSub}</div>
        </div>
      </div>

      {/* Your Classes Today */}
      {!loadingSessions && todaySessions.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, marginBottom: 14 }}>Your Classes Today</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {todaySessions.map(s => {
              const isFull = s.enrolled_count >= s.capacity
              return (
                <Link key={s.id} to={`/classes/${s.id}/attendance`} style={{ textDecoration: 'none', background: '#111', border: '1px solid #222', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ textAlign: 'center', minWidth: 52, flexShrink: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{DAYS[s.day_of_week]}</div>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26, color: 'var(--lime)', lineHeight: 1 }}>{s.start_time?.slice(0, 5)}</div>
                    <div style={{ fontSize: 10, color: 'var(--grey)' }}>pm</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, marginBottom: 4 }}>{s.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 8 }}>{s.studio_detail?.name} · {s.enrolled_count}/{s.capacity} enrolled</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.5px', padding: '3px 10px', borderRadius: 20, background: isFull ? 'rgba(255,170,0,0.15)' : 'rgba(204,255,0,0.1)', color: isFull ? 'var(--amber)' : 'var(--lime)', border: `1px solid ${isFull ? 'rgba(255,170,0,0.3)' : 'rgba(204,255,0,0.3)'}` }}>
                        {isFull ? 'FULL' : 'ACTIVE'}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--grey)' }}>Register not yet saved</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--lime)', fontWeight: 600, flexShrink: 0 }}>Take Attendance →</div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* All Classes Today */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, marginBottom: 14 }}>All Classes Today</div>
        {loadingAllSessions ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
        ) : allSessionsToday.length === 0 ? (
          <div style={{ color: 'var(--grey)', fontSize: 13, padding: '20px 0' }}>No classes scheduled today</div>
        ) : (
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 14, overflow: 'hidden' }}>
            {allSessionsToday.map((s, i) => {
              const isOwn = s.instructor === user?.id || s.instructor_detail?.id === user?.id
              const isFull = s.enrolled_count >= s.capacity
              return (
                <div
                  key={s.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderBottom: i < allSessionsToday.length - 1 ? '1px solid #1a1a1a' : 'none', opacity: isOwn ? 1 : 0.6 }}
                >
                  <div style={{ minWidth: 52, flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: isOwn ? 'var(--lime)' : '#fff' }}>{s.start_time?.slice(0, 5)}</div>
                    <div style={{ fontSize: 10, color: 'var(--grey)', textTransform: 'uppercase' }}>PM</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {s.name}
                      {isOwn && <span style={{ fontSize: 9, fontWeight: 800, background: 'var(--lime)', color: '#000', borderRadius: 4, padding: '1px 6px', letterSpacing: '0.5px' }}>YOURS</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--grey)' }}>{s.studio_detail?.name} · {s.instructor_detail?.display_name || s.instructor_detail?.first_name} · {s.enrolled_count}/{s.capacity}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.5px', padding: '3px 10px', borderRadius: 20, background: isFull ? 'rgba(255,170,0,0.15)' : 'rgba(204,255,0,0.1)', color: isFull ? 'var(--amber)' : 'var(--lime)', border: `1px solid ${isFull ? 'rgba(255,170,0,0.3)' : 'rgba(204,255,0,0.3)'}`, flexShrink: 0 }}>
                    {isFull ? 'FULL' : 'ACTIVE'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Active Homework */}
      {assignments.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, marginBottom: 14 }}>Active Homework</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {assignments.map(a => {
              const pct = a.enrolled_count ? Math.round(a.submission_count / a.enrolled_count * 100) : 0
              const s = a.class_session_detail
              const pctColor = pct === 100 ? 'var(--lime)' : pct > 50 ? 'var(--amber)' : 'var(--grey)'
              return (
                <Link key={a.id} to="/homework" style={{ textDecoration: 'none', background: '#111', border: '1px solid #222', borderRadius: 12, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{a.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                        {s?.name} — {DAYS[s?.day_of_week]} {s?.start_time?.slice(0, 5)} · {s?.studio_detail?.name}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(204,255,0,0.1)', color: 'var(--lime)', border: '1px solid rgba(204,255,0,0.3)', borderRadius: 20, padding: '3px 10px', flexShrink: 0, marginLeft: 12 }}>ACTIVE</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--grey)' }}>
                    <span>{a.submission_count}/{a.enrolled_count} submitted</span>
                    <div style={{ flex: 1, height: 4, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pctColor, borderRadius: 2, transition: 'width 0.3s' }} />
                    </div>
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
