import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { enrolments, attendance, classes } from '../../api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function MarkAwayModal({ occurrence, cancellationWindowHours, onClose, onDone }) {
  const [confirming, setConfirming] = useState(false)

  const occDate = new Date(occurrence.date + 'T' + (occurrence.session_detail?.start_time || '00:00'))
  const hoursUntil = (occDate - new Date()) / (1000 * 60 * 60)
  const windowHours = cancellationWindowHours || 24
  const isLate = hoursUntil < windowHours && hoursUntil > 0

  async function confirm() {
    setConfirming(true)
    try {
      await attendance.markAway(occurrence.id)
      onDone()
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 420, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>Mark Away</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: '18px 20px' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{occurrence.session_detail?.name || occurrence.session_name}</div>
            <div style={{ fontSize: 13, color: 'var(--grey)' }}>
              {new Date(occurrence.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
              {occurrence.session_detail?.start_time ? ` · ${occurrence.session_detail.start_time.slice(0, 5)}` : ''}
            </div>
          </div>

          {isLate ? (
            <div style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: 'var(--amber)', lineHeight: 1.6 }}>
              <strong>Late cancellation notice:</strong> This class is within the {windowHours}-hour cancellation window. A late cancel fee may apply. You can still mark away — just be aware.
            </div>
          ) : (
            <div style={{ background: 'rgba(204,255,0,0.05)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
              You're marking yourself as unable to attend this class. This helps your instructor plan accordingly. No late cancel fee applies.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button className="btn btn-lime btn-sm" style={{ flex: 1 }} onClick={confirm} disabled={confirming}>
              {confirming ? 'Saving…' : 'Confirm Away'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StudentMyClasses() {
  const { user } = useAuth()
  const { data: enrolData, loading } = useApi(() => enrolments.list({ student: user?.id }), [user?.id])
  const { data: attData, refetch: refetchAtt } = useApi(() => attendance.list({ student: user?.id }), [user?.id])
  const { data: upcomingData, refetch: refetchUpcoming } = useApi(
    () => classes.occurrences({ student: user?.id, upcoming: true }),
    [user?.id]
  )

  const [markAwayOcc, setMarkAwayOcc] = useState(null)

  const enrolments_ = enrolData?.results || []
  const attHistory = attData?.results || []
  const upcomingOccs = upcomingData?.results || upcomingData || []

  const active = enrolments_.filter(e => e.status === 'active')
  const past = enrolments_.filter(e => e.status !== 'active')

  function attendanceForSession(sessionId) {
    return attHistory.filter(a => a.occurrence_detail?.session_detail?.id === sessionId)
  }

  function alreadyMarkedAway(occId) {
    return attHistory.some(a => a.occurrence === occId && a.status === 'absent')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcoming = upcomingOccs.filter(o => {
    const d = new Date(o.date + 'T00:00')
    return d >= today
  }).slice(0, 10)

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
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Upcoming Classes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcoming.map(o => {
                  const markedAway = alreadyMarkedAway(o.id)
                  return (
                    <div key={o.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{o.session_detail?.name || o.session_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--grey)' }}>
                          {new Date(o.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {o.session_detail?.start_time ? ` · ${o.session_detail.start_time.slice(0, 5)}` : ''}
                        </div>
                      </div>
                      {markedAway ? (
                        <span className="tag tag-amber" style={{ fontSize: 10 }}>Away marked</span>
                      ) : (
                        <button
                          className="btn btn-ghost btn-xs"
                          style={{ flexShrink: 0, fontSize: 11 }}
                          onClick={() => setMarkAwayOcc(o)}
                        >
                          Mark Away
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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

      {markAwayOcc && (
        <MarkAwayModal
          occurrence={markAwayOcc}
          cancellationWindowHours={24}
          onClose={() => setMarkAwayOcc(null)}
          onDone={() => {
            setMarkAwayOcc(null)
            refetchAtt()
            refetchUpcoming()
          }}
        />
      )}
    </div>
  )
}
