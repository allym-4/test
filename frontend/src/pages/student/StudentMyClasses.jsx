import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { enrolments, attendance } from '../../api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function StudentMyClasses() {
  const { user } = useAuth()
  const { data: enrolData, loading } = useApi(() => enrolments.list({ student: user?.id }), [user?.id])
  const { data: attData } = useApi(() => attendance.list({ student: user?.id }), [user?.id])

  const enrolments_ = enrolData?.results || []
  const attHistory = attData?.results || []

  const active = enrolments_.filter(e => e.status === 'active')
  const past = enrolments_.filter(e => e.status !== 'active')

  function attendanceForSession(sessionId) {
    return attHistory.filter(a => a.occurrence_detail?.session_detail?.id === sessionId)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">My Classes</div>
          <div className="page-sub">{active.length} active enrolment{active.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : (
        <>
          {active.length === 0 ? (
            <div className="empty-state">
              <div style={{ marginBottom: 8 }}>No active enrolments</div>
              <div style={{ fontSize: 12 }}>Contact your studio to get enrolled</div>
            </div>
          ) : (
            <div>
              <div className="section-title" style={{ fontSize: 13, marginBottom: 12 }}>Active Enrolments</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                {active.map(e => {
                  const s = e.class_session_detail
                  const sessAtt = attendanceForSession(s?.id)
                  const presentCount = sessAtt.filter(a => a.status === 'present').length
                  const totalCount = sessAtt.length
                  const pct = totalCount ? Math.round(presentCount / totalCount * 100) : null
                  const recentAtt = [...sessAtt].sort((a, b) => new Date(b.occurrence_detail?.date) - new Date(a.occurrence_detail?.date)).slice(0, 5)

                  return (
                    <div key={e.id} className="card">
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                        <div>
                          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 4 }}>{s?.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                            {DAYS[s?.day_of_week]} · {s?.start_time?.slice(0, 5)} · {s?.studio_detail?.name}
                          </div>
                        </div>
                        <span className="tag tag-lav" style={{ fontSize: 10, flexShrink: 0 }}>{e.enrolment_type}</span>
                      </div>

                      {pct !== null && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, color: 'var(--grey)' }}>{presentCount}/{totalCount} classes attended</span>
                            <span style={{ fontSize: 11, color: 'var(--lime)' }}>{pct}%</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--lime)' : pct >= 50 ? 'var(--amber)' : 'var(--red)' }} />
                          </div>
                        </div>
                      )}

                      {recentAtt.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', marginBottom: 8 }}>Recent</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {recentAtt.map(a => (
                              <span key={a.id} className={`tag ${a.status === 'present' ? 'tag-lime' : a.status === 'late' ? 'tag-amber' : a.status === 'no_show' ? 'tag-red' : 'tag-grey'}`} style={{ fontSize: 10 }}>
                                {a.occurrence_detail?.date ? new Date(a.occurrence_detail.date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''}
                                {' '}·{' '}
                                {a.status === 'present' ? 'Present' : a.status === 'late' ? 'Late' : a.status === 'no_show' ? 'No-show' : a.status}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <div className="section-title" style={{ fontSize: 13, marginBottom: 12 }}>Past Enrolments</div>
              <div className="list-card">
                {past.map(e => {
                  const s = e.class_session_detail
                  return (
                    <div key={e.id} className="list-row" style={{ opacity: 0.6 }}>
                      <div className="list-body">
                        <div className="list-title">{s?.name}</div>
                        <div className="list-sub">{DAYS[s?.day_of_week]} · {s?.studio_detail?.name}</div>
                      </div>
                      <span className="tag tag-grey" style={{ fontSize: 10 }}>{e.status}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
