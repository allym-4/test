import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { enrolments as enrolmentsApi, attendance, classes as classesApi } from '../../api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function ClassRoster({ sessionId }) {
  const [names, setNames] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open || names !== null) return
    classesApi.roster(sessionId).then(r => setNames(r.data.names || [])).catch(() => setNames([]))
  }, [open, sessionId, names])

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11, color: 'var(--grey)', textDecoration: 'underline', textDecorationStyle: 'dotted', marginTop: 6 }}>
        Who's coming?
      </button>
    )
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Who's coming</div>
      {names === null ? (
        <div style={{ fontSize: 11, color: 'var(--grey)' }}>…</div>
      ) : names.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--grey)' }}>No one's opted in yet</div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--white)', display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
          {names.map((n, i) => <span key={i}>{n}</span>)}
        </div>
      )}
    </div>
  )
}

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
              <strong>Late cancellation notice:</strong> This class is within the {windowHours}-hour cancellation window. A late cancel fee may apply.
            </div>
          ) : (
            <div style={{ background: 'rgba(204,255,0,0.05)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
              You're marking yourself as unable to attend this class. No late cancel fee applies.
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

function CancelAwayDialog({ occurrence, onClose, onDone }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  async function confirm() {
    setLoading(true)
    try {
      const res = await attendance.cancelAway(occurrence.id)
      setResult(res.data)
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    const isWaitlisted = result.status === 'waitlisted'
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 400, width: '100%', padding: '28px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{isWaitlisted ? '😬' : '🎉'}</div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 10 }}>
            {isWaitlisted ? 'Spot Taken' : 'You\'re Back In!'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6, marginBottom: 20 }}>{result.message}</div>
          <button className="btn btn-lime btn-sm" onClick={onDone}>Got it</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 400, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>I can make it!</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{occurrence.session_detail?.name}</div>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16 }}>
            {new Date(occurrence.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
            {occurrence.session_detail?.start_time ? ` · ${occurrence.session_detail.start_time.slice(0, 5)}` : ''}
          </div>
          <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6, marginBottom: 20 }}>
            Changed your mind? We'll check if your spot is still available.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button className="btn btn-lime btn-sm" style={{ flex: 1 }} onClick={confirm} disabled={loading}>
              {loading ? 'Checking…' : 'Yes, I\'m coming!'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StudentMyClasses() {
  const { user } = useAuth()
  const { data: enrolData, loading, refetch: refetchEnrol } = useApi(() => enrolmentsApi.list({ student: user?.id }), [user?.id])
  const { data: attData, refetch: refetchAtt } = useApi(() => attendance.list({ student: user?.id }), [user?.id])
  const { data: upcomingData, refetch: refetchUpcoming } = useApi(() => classesApi.occurrences({ student: user?.id, upcoming: true }), [user?.id])

  const [markAwayOcc, setMarkAwayOcc] = useState(null)
  const [cancelAwayOcc, setCancelAwayOcc] = useState(null)
  const [topTab, setTopTab] = useState('active')
  const [activeSubTab, setActiveSubTab] = useState('enrolled')
  const [cancelling, setCancelling] = useState(null)
  const [confirmCancelEnrolId, setConfirmCancelEnrolId] = useState(null)

  async function cancelEnrolment(enrolId) {
    setCancelling(enrolId)
    try {
      await enrolmentsApi.update(enrolId, { status: 'cancelled' })
      refetchEnrol()
    } finally {
      setCancelling(null)
    }
  }

  const enrolments_ = enrolData?.results || enrolData || []
  const attHistory = attData?.results || attData || []
  const upcomingOccurrences = upcomingData?.results || upcomingData || []

  // Upcoming occurrences where student marked away
  const today = new Date().toISOString().slice(0, 10)
  const absentUpcoming = upcomingOccurrences.filter(occ =>
    occ.date >= today && attHistory.some(a => a.occurrence === occ.id && a.status === 'absent')
  )

  const active = enrolments_.filter(e => e.status === 'active')
  const waitlisted = enrolments_.filter(e => e.status === 'waitlisted')
  const casual = enrolments_.filter(e => ['casual', 'catchup', 'catch_up'].includes(e.enrolment_type) || ['casual', 'catchup'].includes(e.status))
  const past = enrolments_.filter(e => ['completed', 'cancelled', 'expired'].includes(e.status))

  // Pricing summary
  const totalPrice = active.reduce((sum, e) => sum + (parseFloat(e.price || e.amount || 0)), 0)

  function alreadyMarkedAway(occId) {
    return attHistory.some(a => a.occurrence === occId && a.status === 'absent')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">My Classes</div>
          <div className="page-sub">{active.length} active enrolment{active.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Top-level tabs */}
      <div className="subtabs" style={{ marginBottom: 20 }}>
        {[['active', 'Active Season'], ['future', 'Future Season'], ['past', 'Past Seasons']].map(([key, label]) => (
          <button key={key} className={`subtab${topTab === key ? ' active' : ''}`} onClick={() => setTopTab(key)}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : (
        <>
          {/* Active Season */}
          {topTab === 'active' && (
            <div>
              {/* Marked Away — can undo */}
              {absentUpcoming.length > 0 && (
                <div style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>Marked Away</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {absentUpcoming.map(occ => (
                      <div key={occ.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{occ.session_detail?.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                            {new Date(occ.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {occ.session_detail?.start_time ? ` · ${occ.session_detail.start_time.slice(0, 5)}` : ''}
                          </div>
                        </div>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--lime)', borderColor: 'rgba(204,255,0,0.3)', flexShrink: 0 }} onClick={() => setCancelAwayOcc(occ)}>
                          I can make it!
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-tabs */}
              <div className="subtabs" style={{ marginBottom: 18 }}>
                {[['enrolled', 'Enrolled Classes'], ['casuals', 'Casual & Catch-ups']].map(([key, label]) => (
                  <button key={key} className={`subtab${activeSubTab === key ? ' active' : ''}`} onClick={() => setActiveSubTab(key)}>{label}</button>
                ))}
              </div>

              {activeSubTab === 'enrolled' && (
                <div>
                  {active.length === 0 ? (
                    <div className="empty-state">
                      <div style={{ marginBottom: 8 }}>No active enrolments</div>
                      <div style={{ fontSize: 12 }}>Contact your studio to get enrolled</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                        {active.map(e => {
                          const s = e.class_session_detail
                          const instructorName = s?.instructor_detail
                            ? `${s.instructor_detail.first_name || ''} ${s.instructor_detail.last_name || ''}`.trim()
                            : (s?.instructor_name || '—')
                          return (
                            <div key={e.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 2 }}>
                                    {DAYS[s?.day_of_week]} · {s?.start_time?.slice(0, 5)}
                                  </div>
                                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{s?.name} · {s?.studio_detail?.name}</div>
                                  <div style={{ fontSize: 12, color: 'var(--grey)' }}>with {instructorName}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                  <span className="tag tag-lime" style={{ fontSize: 10 }}>Active</span>
                                  {confirmCancelEnrolId === e.id ? (
                                    <span style={{ display: 'flex', gap: 4 }}>
                                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={() => { setConfirmCancelEnrolId(null); cancelEnrolment(e.id) }}>Confirm</button>
                                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setConfirmCancelEnrolId(null)}>No</button>
                                    </span>
                                  ) : (
                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} disabled={cancelling === e.id} onClick={() => setConfirmCancelEnrolId(e.id)}>
                                      {cancelling === e.id ? '…' : 'Cancel'}
                                    </button>
                                  )}
                                </div>
                              </div>
                              {e.class_session && <ClassRoster sessionId={e.class_session} />}
                            </div>
                          )
                        })}
                      </div>

                      {/* Pricing summary strip */}
                      <div style={{ background: 'rgba(176,160,255,0.08)', border: '1px solid rgba(176,160,255,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: active.length === 1 ? 8 : 0 }}>
                          {active.length} class{active.length !== 1 ? 'es' : ''} · Season{totalPrice > 0 ? ` — $${totalPrice.toFixed(0)} total` : ''}
                        </div>
                        {active.length === 1 && (
                          <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                            Add a 2nd class for a better rate →{' '}
                            <Link to="/portal/book" style={{ color: 'var(--lav)', textDecoration: 'none', fontWeight: 600 }}>Browse classes</Link>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Waitlisted classes */}
                  {waitlisted.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--grey)' }}>Waitlisted</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {waitlisted.map(e => {
                          const s = e.class_session_detail
                          return (
                            <div key={e.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{s?.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--grey)' }}>{DAYS[s?.day_of_week]} · {s?.studio_detail?.name}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                {e.waitlist_position != null && (
                                  <span className="tag tag-lav" style={{ fontSize: 10 }}>Waitlist position: #{e.waitlist_position}</span>
                                )}
                                {confirmCancelEnrolId === e.id ? (
                                  <span style={{ display: 'flex', gap: 4 }}>
                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={() => { setConfirmCancelEnrolId(null); cancelEnrolment(e.id) }}>Confirm</button>
                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setConfirmCancelEnrolId(null)}>No</button>
                                  </span>
                                ) : (
                                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} disabled={cancelling === e.id} onClick={() => setConfirmCancelEnrolId(e.id)}>
                                    {cancelling === e.id ? '…' : 'Leave Waitlist'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSubTab === 'casuals' && (
                <div>
                  {casual.length === 0 ? (
                    <div className="empty-state">
                      <div style={{ marginBottom: 8 }}>No casual bookings yet</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {casual.map(e => {
                        const s = e.class_session_detail
                        return (
                          <div key={e.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{s?.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--grey)' }}>{DAYS[s?.day_of_week]} · {s?.studio_detail?.name}</div>
                            </div>
                            <span className="tag tag-lav" style={{ fontSize: 10 }}>{e.enrolment_type || 'casual'}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div style={{ marginTop: 16 }}>
                    <Link to="/portal/book">
                      <button className="btn btn-lav btn-sm" style={{ background: 'var(--lav)', color: '#000' }}>Book a casual or catch-up →</button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Future Season */}
          {topTab === 'future' && (
            <div className="empty-state">
              <div style={{ marginBottom: 8 }}>Your next season classes will appear here once booked</div>
              <Link to="/portal/book">
                <button className="btn btn-lime btn-sm" style={{ marginTop: 8 }}>Browse Classes →</button>
              </Link>
            </div>
          )}

          {/* Past Seasons */}
          {topTab === 'past' && (
            <div>
              {past.length === 0 ? (
                <div className="empty-state">
                  <div>No past season records</div>
                </div>
              ) : (
                <div className="list-card">
                  {past.map(e => {
                    const s = e.class_session_detail
                    return (
                      <div key={e.id} className="list-row" style={{ opacity: 0.7 }}>
                        <div className="list-body">
                          <div className="list-title">{s?.name}</div>
                          <div className="list-sub">{DAYS[s?.day_of_week]} · {s?.studio_detail?.name}</div>
                        </div>
                        <span className="tag tag-grey" style={{ fontSize: 10 }}>{e.status}</span>
                      </div>
                    )
                  })}
                </div>
              )}
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
          }}
        />
      )}

      {cancelAwayOcc && (
        <CancelAwayDialog
          occurrence={cancelAwayOcc}
          onClose={() => setCancelAwayOcc(null)}
          onDone={() => {
            setCancelAwayOcc(null)
            refetchAtt()
            refetchEnrol()
            refetchUpcoming()
          }}
        />
      )}
    </div>
  )
}
