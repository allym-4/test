import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { enrolments as enrolmentsApi, attendance, classes as classesApi, helpdesk as helpdeskApi, settings as settingsApi, payments as paymentsApi } from '../../api'
import MarkAwayModal from '../../components/MarkAwayModal'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// ─── ClassRoster ──────────────────────────────────────────────────────────────

function ClassRoster({ sessionId }) {
  const [names, setNames] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open || names !== null || !sessionId) return
    classesApi.roster(sessionId).then(r => setNames(r.data.names || [])).catch(() => setNames([]))
  }, [open, sessionId, names])

  if (!sessionId) return null

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11, color: 'var(--lav)', textDecoration: 'underline', textDecorationStyle: 'dotted', marginTop: 8 }}>
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



// ─── CancelAwayDialog ─────────────────────────────────────────────────────────

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

// ─── CancelPolicyModal ────────────────────────────────────────────────────────

function CancelPolicyModal({ enrolment, isWaitlist, onClose, onDone }) {
  const [step, setStep] = useState('policy')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [allSessions, setAllSessions] = useState(null)
  const [selectedClassName, setSelectedClassName] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const s = enrolment.class_session_detail

  async function leaveWaitlist() {
    setSubmitting(true)
    setError('')
    try {
      await enrolmentsApi.delete(enrolment.id)
      onDone()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function loadSessions() {
    if (allSessions) return
    try {
      // Filter to same season as current enrolment — transfers are season-to-season only
      const seasonId = enrolment.season_detail?.id || enrolment.class_session_detail?.season
      const params = { active: true }
      if (seasonId) params.season = seasonId
      const res = await classesApi.list(params)
      const sessions = res.data?.results || res.data || []
      // Exclude the class they're already in
      setAllSessions(sessions.filter(s2 => s2.id !== enrolment.class_session))
    } catch {
      setAllSessions([])
    }
  }

  function goToTransfer() {
    setStep('transfer')
    loadSessions()
  }

  async function submitTransfer() {
    if (!selectedSessionId) { setError('Please select a class to transfer to.'); return }
    setSubmitting(true)
    setError('')
    try {
      await enrolmentsApi.changeRequests.create({
        current_enrolment: enrolment.id,
        requested_session: selectedSessionId,
        request_type: 'transfer',
        notes,
      })
      setStep('success')
    } catch (e) {
      setError(e.response?.data?.detail || e.response?.data?.non_field_errors?.[0] || 'Failed to submit — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Derived: unique class names sorted, and sessions for selected name
  const classNames = allSessions
    ? [...new Set(allSessions.map(s2 => s2.name))].sort()
    : []
  const sessionsForName = selectedClassName
    ? (allSessions || []).filter(s2 => s2.name === selectedClassName)
    : []

  const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  function fmtTime(t) {
    if (!t) return ''
    const [h, m] = t.split(':').map(Number)
    const h12 = h % 12 || 12
    return `${h12}:${String(m).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 440, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>
            {step === 'success' ? 'Request Sent' : isWaitlist ? 'Leave Season Waitlist' : 'Enrolment Policy'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: '18px 20px' }}>
          {step === 'policy' && (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{s?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 16 }}>{DAYS[s?.day_of_week]} · {s?.studio_detail?.name}</div>
              {isWaitlist ? (
                <>
                  <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6, marginBottom: 20 }}>
                    You're on the season waitlist for this class. Leaving means you'll lose your position in the queue.
                  </div>
                  {error && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{error}</div>}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose}>Keep My Spot</button>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1, color: 'var(--red)' }} onClick={leaveWaitlist} disabled={submitting}>
                      {submitting ? '…' : 'Leave Waitlist'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background: 'rgba(255,68,68,0.07)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: 'var(--white)', lineHeight: 1.7 }}>
                    <strong style={{ color: 'var(--red)' }}>Non-refundable enrolment</strong><br /><br />
                    When you enrolled, we reserved a pole and planned the season around you. As a small studio, every confirmed booking directly supports our ability to keep classes running — which is why season enrolments are non-refundable once you've committed to your class through enrolling, in line with our terms and conditions.
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6, marginBottom: 20 }}>
                    If your circumstances have changed, we'd love to find a solution which works for you.
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose}>Close</button>
                    <button className="btn btn-lime btn-sm" style={{ flex: 1 }} onClick={goToTransfer}>Request Transfer →</button>
                  </div>
                </>
              )}
            </>
          )}
          {step === 'transfer' && (
            <>
              <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 14, lineHeight: 1.6 }}>
                Which class would you like to transfer to?
              </div>

              {/* Step 1: class name */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Class</div>
                {!allSessions ? (
                  <div style={{ fontSize: 13, color: 'var(--grey)' }}>Loading…</div>
                ) : (
                  <select
                    value={selectedClassName}
                    onChange={e => { setSelectedClassName(e.target.value); setSelectedSessionId('') }}
                    style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', color: selectedClassName ? 'var(--white)' : 'var(--grey)', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit' }}
                  >
                    <option value=''>Select a class…</option>
                    {classNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Step 2: session picker */}
              {selectedClassName && sessionsForName.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Available times</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {sessionsForName.map(sess => {
                      const day = DAYS_FULL[sess.day_of_week] ?? ''
                      const time = fmtTime(sess.start_time)
                      const instructor = sess.instructor_detail?.display_name || sess.instructor_name || ''
                      const isFull = sess.enrolled_count >= sess.capacity
                      const isSelected = selectedSessionId === String(sess.id)
                      return (
                        <button
                          key={sess.id}
                          type='button'
                          onClick={() => setSelectedSessionId(String(sess.id))}
                          style={{
                            background: isSelected ? 'rgba(204,255,0,0.08)' : '#1a1a1a',
                            border: `1px solid ${isSelected ? 'var(--lime)' : 'var(--border)'}`,
                            borderRadius: 8,
                            padding: '10px 14px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? 'var(--lime)' : 'var(--white)' }}>
                              {day} {time}
                            </div>
                            {instructor && (
                              <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>with {instructor}</div>
                            )}
                          </div>
                          {isFull && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.3)', borderRadius: 10, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                              FULL
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Optional notes */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Notes (optional)</div>
                <textarea
                  placeholder="Any context that might help us process your request…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              {error && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setStep('policy')}>Back</button>
                <button className="btn btn-lime btn-sm" style={{ flex: 1 }} onClick={submitTransfer} disabled={submitting || !selectedSessionId}>
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </>
          )}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Request received</div>
              <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6, marginBottom: 20 }}>
                Our team will review your request and reach out within 1–2 business days.
              </div>
              <button className="btn btn-lime btn-sm" onClick={onDone}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ClassWaitlistLeaveModal ──────────────────────────────────────────────────

function ClassWaitlistLeaveModal({ enrolment, onClose, onDone }) {
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState('')
  const s = enrolment.class_session_detail

  const jsDay = s?.day_of_week != null ? (s.day_of_week + 1) % 7 : null
  let hoursUntil = null
  if (jsDay !== null && s?.start_time) {
    const now = new Date()
    const today = now.getDay()
    let daysAhead = (jsDay - today + 7) % 7
    if (daysAhead === 0) {
      const [h, m] = s.start_time.split(':').map(Number)
      const classToday = new Date(now)
      classToday.setHours(h, m, 0, 0)
      if (classToday <= now) daysAhead = 7
    }
    const nextClass = new Date(now)
    nextClass.setDate(now.getDate() + daysAhead)
    const [h, m] = s.start_time.split(':').map(Number)
    nextClass.setHours(h, m, 0, 0)
    hoursUntil = (nextClass - now) / (1000 * 60 * 60)
  }
  const withinWindow = hoursUntil !== null && hoursUntil < 4

  async function joinSeasonWaitlist() {
    setJoining(true)
    setError('')
    try {
      await enrolmentsApi.create({ session: enrolment.class_session, status: 'waitlisted', enrolment_type: 'course' })
      await enrolmentsApi.delete(enrolment.id)
      onDone()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed — please try again.')
    } finally { setJoining(false) }
  }

  async function leaveWaitlist() {
    setLeaving(true)
    setError('')
    try {
      await enrolmentsApi.delete(enrolment.id)
      onDone()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed — please try again.')
    } finally { setLeaving(false) }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 440, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>Leave Class Waitlist</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{s?.name}</div>
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 16 }}>{DAYS[s?.day_of_week]} · {s?.studio_detail?.name}</div>
          {withinWindow ? (
            <div style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: 'var(--amber)', lineHeight: 1.6 }}>
              <strong>Heads up:</strong> The next class is less than 4 hours away. If you leave now, you may lose your spot to the next person on the list.
            </div>
          ) : (
            <div style={{ background: 'rgba(204,255,0,0.05)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
              You can freely leave the class waitlist or upgrade to the season waitlist instead.
            </div>
          )}
          <div style={{ background: 'rgba(176,160,255,0.08)', border: '1px solid rgba(176,160,255,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 13, lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--lav)' }}>Want to join the season instead?</strong><br />
            <span style={{ color: 'var(--grey)' }}>Season waitlist gives you priority for a full-term reserved spot when one becomes available.</span>
          </div>
          {error && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-sm" style={{ background: 'rgba(176,160,255,0.15)', border: '1px solid rgba(176,160,255,0.3)', color: 'var(--lav)', fontWeight: 600 }} onClick={joinSeasonWaitlist} disabled={joining || leaving}>
              {joining ? 'Moving…' : 'Join Season Waitlist Instead'}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1, color: 'var(--red)' }} onClick={leaveWaitlist} disabled={leaving || joining}>
                {leaving ? '…' : 'Leave Class Waitlist'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── DisplacementPopupModal ───────────────────────────────────────────────────

function DisplacementPopupModal({ booking, onClose, onAction }) {
  const [actioning, setActioning] = useState(null)
  const [messageSent, setMessageSent] = useState(false)
  const [error, setError] = useState('')

  const d = booking.occurrence_detail
  const dateLabel = d?.date ? new Date(d.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) : '—'
  const expiresAt = booking.displacement_expires_at ? new Date(booking.displacement_expires_at) : null
  const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt - new Date()) / 3600000)) : null

  async function upgrade() {
    setActioning('upgrade'); setError('')
    try { await classesApi.casual.upgrade(booking.id); onAction() }
    catch (e) { setError(e.response?.data?.detail || 'Could not upgrade — please try again.') }
    finally { setActioning(null) }
  }

  async function release() {
    setActioning('release'); setError('')
    try { await classesApi.casual.release(booking.id); onAction() }
    catch (e) { setError(e.response?.data?.detail || 'Could not release — please try again.') }
    finally { setActioning(null) }
  }

  async function messageDuality() {
    setActioning('message')
    try {
      await helpdeskApi.submitTicket({
        subject: `Displacement Offer Question — ${d?.session_name || 'Class'}`,
        body: `Student has a question about their casual spot displacement offer for ${d?.session_name || 'class'} on ${d?.date || 'upcoming date'}.`,
      })
      setMessageSent(true)
    } catch { } finally { setActioning(null) }
  }

  const busy = !!actioning

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--card)', border: '2px solid rgba(255,170,0,0.4)', borderRadius: 18, maxWidth: 460, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: '#f59e0b' }}>Action Required</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: '20px 20px 22px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>{d?.session_name}</div>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16 }}>
            {[dateLabel, d?.start_time ? d.start_time.slice(0, 5) : null, d?.studio_name].filter(Boolean).join(' · ')}
          </div>
          <div style={{ background: 'rgba(255,170,0,0.07)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 18, fontSize: 13, color: 'var(--grey)', lineHeight: 1.7 }}>
            A student wants to enrol for the full season of {d?.session_name || 'this class'}.
            Upgrade your casual booking to a full season enrolment
            {hoursLeft !== null ? <strong style={{ color: 'var(--white)' }}> within {hoursLeft} hour{hoursLeft !== 1 ? 's' : ''}</strong> : ''}, or your spot will be released and your account credited.
          </div>
          {error && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-lime btn-sm" onClick={upgrade} disabled={busy} style={{ fontWeight: 700 }}>
              {actioning === 'upgrade' ? '…' : 'Upgrade to Full Season'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={release} disabled={busy} style={{ color: 'var(--red)' }}>
              {actioning === 'release' ? '…' : 'Release Spot'}
            </button>
            {messageSent ? (
              <div style={{ fontSize: 12, color: 'var(--lime)', textAlign: 'center', paddingTop: 4 }}>Message sent — we'll be in touch!</div>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={messageDuality} disabled={busy}>
                {actioning === 'message' ? '…' : 'Message Duality'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PendingDisplacementBanner ────────────────────────────────────────────────

function PendingDisplacementBanner({ enrolment }) {
  const s = enrolment.class_session_detail
  const expiresAt = enrolment.displacement_expires_at ? new Date(enrolment.displacement_expires_at) : null
  const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt - new Date()) / 3600000)) : null
  return (
    <div style={{ background: 'rgba(255,170,0,0.06)', border: '2px solid rgba(255,170,0,0.25)', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, color: '#f59e0b', marginBottom: 5 }}>Spot Pending Confirmation</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{s?.name}</div>
      <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
        A casual is taking up one of the available spots. We've given them
        {hoursLeft !== null ? ` ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}` : ' some time'} to upgrade — if they don't, the spot is yours!
      </div>
    </div>
  )
}

// ─── WaitlistOfferBanner ──────────────────────────────────────────────────────

function WaitlistOfferBanner({ enrolment, onClaimed }) {
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState('')
  const expiresAt = enrolment.waitlist_expires_at ? new Date(enrolment.waitlist_expires_at) : null
  const minutesLeft = expiresAt ? Math.max(0, Math.round((expiresAt - new Date()) / 60000)) : null
  const session = enrolment.class_session_detail

  async function claim() {
    setClaiming(true); setError('')
    try { await enrolmentsApi.claimSpot(enrolment.id); onClaimed() }
    catch (e) { setError(e.response?.data?.detail || 'Failed to claim spot. Please try again.') }
    finally { setClaiming(false) }
  }

  return (
    <div style={{ background: 'rgba(204,255,0,0.08)', border: '2px solid var(--lime)', borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: 'var(--lime)', marginBottom: 4 }}>🎉 A spot opened up!</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{session?.name}</div>
          <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.5 }}>
            {enrolment.waitlist_urgent ? 'Class starts soon — first to confirm gets it!' :
              minutesLeft !== null ? (
                minutesLeft > 60 ? `You have ${Math.round(minutesLeft / 60)}h ${minutesLeft % 60}m to claim your spot.` :
                  minutesLeft > 0 ? `⏰ Only ${minutesLeft} minutes left to claim!` :
                    'Your offer may have expired — try claiming and we\'ll check.'
              ) : 'Claim your spot before it\'s offered to the next person.'}
          </div>
          {error && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{error}</div>}
        </div>
        <button className="btn btn-lime btn-sm" onClick={claim} disabled={claiming} style={{ flexShrink: 0, fontWeight: 700 }}>
          {claiming ? 'Claiming…' : 'Claim My Spot →'}
        </button>
      </div>
    </div>
  )
}

// ─── CancelCasualModal ───────────────────────────────────────────────────────

function CancelCasualModal({ booking, onClose, onConfirm }) {
  const d = booking.occurrence_detail
  const isWaitlisted = booking.status === 'waitlisted'

  // Calculate hours until class
  let hoursUntil = null
  if (d?.date && d?.start_time) {
    const classDateTime = new Date(`${d.date}T${d.start_time}`)
    hoursUntil = (classDateTime - new Date()) / (1000 * 60 * 60)
  }
  const withinWindow = hoursUntil !== null && hoursUntil < 4

  const dateLabel = d?.date ? new Date(d.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) : '—'
  const timeLabel = d?.start_time ? d.start_time.slice(0, 5) : ''

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 420, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>
            {isWaitlisted ? 'Leave Waitlist?' : 'Cancel Booking?'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{d?.session_name}</div>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16 }}>
            {dateLabel}{timeLabel ? ` · ${timeLabel}` : ''}
          </div>
          {isWaitlisted ? (
            <div style={{ background: 'rgba(204,255,0,0.05)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
              You'll be removed from the waitlist. If a spot opens up later, you'd need to re-join.
            </div>
          ) : withinWindow ? (
            <div style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ color: '#f59e0b', fontWeight: 600, marginBottom: 4 }}>Less than 4 hours to class</div>
              <div style={{ color: 'var(--grey)' }}>Your spot will be released but no credit will be issued — it's too close to class time.</div>
            </div>
          ) : (
            <div style={{ background: 'rgba(204,255,0,0.05)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
              Your spot will be released and you'll receive a <span style={{ color: 'var(--lime)', fontWeight: 600 }}>catch-up credit</span> to use within this season.
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose}>Keep it</button>
            <button className="btn btn-sm" style={{ flex: 1, background: 'rgba(255,68,68,0.12)', border: '1px solid rgba(255,68,68,0.3)', color: 'var(--red)', fontWeight: 600 }} onClick={onConfirm}>
              {isWaitlisted ? 'Leave waitlist' : 'Cancel booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr > 12 ? hr - 12 : hr || 12}:${m}${hr >= 12 ? 'pm' : 'am'}`
}

export default function StudentMyClasses() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: enrolData, loading, refetch: refetchEnrol } = useApi(() => enrolmentsApi.list({ student: user?.id }), [user?.id])
  const { data: casualBookingsData, refetch: refetchCasual } = useApi(() => classesApi.casual.myBookings(), [])
  const { data: workshopsData } = useApi(() => classesApi.workshops.list(), [])
  const { data: creditsData } = useApi(() => user?.id ? attendance.makeupCredits.list({ student: user.id, status: 'available' }) : null, [user?.id])
  const { data: studioSettings } = useApi(() => settingsApi.get(), [])
  const { data: balanceData } = useApi(() => user?.id ? paymentsApi.balance(user.id) : null, [user?.id])
  // Fetch upcoming occurrences for all enrolled sessions to detect cover teachers
  const { data: upcomingOccData } = useApi(() => user?.id ? classesApi.occurrences({ student: user.id, upcoming: 'true' }) : null, [user?.id])
  const isBlocked = balanceData?.booking_blocked === true
  const owingAmount = balanceData && parseFloat(balanceData.balance) < 0 ? Math.abs(parseFloat(balanceData.balance)) : null

  const [tab, setTab] = useState('active')
  const [showBlockedBanner, setShowBlockedBanner] = useState(false)
  const [cancelPolicyEnrol, setCancelPolicyEnrol] = useState(null)
  const [classWaitlistLeaveEnrol, setClassWaitlistLeaveEnrol] = useState(null)
  const [displacementPopup, setDisplacementPopup] = useState(null)
  const [markAwayOcc, setMarkAwayOcc] = useState(null)
  const [cancelCasualBooking, setCancelCasualBooking] = useState(null)

  useEffect(() => {
    const items = casualBookingsData?.results || casualBookingsData || []
    const displaced = items.find(b => b.status === 'confirmed' && b.displacement_offered_at)
    if (displaced) setDisplacementPopup(displaced)
  }, [casualBookingsData])

  const enrolments_ = enrolData?.results || enrolData || []
  const casualItems = casualBookingsData?.results || casualBookingsData || []
  const availableCredits = creditsData?.results || creditsData || []
  const workshops = workshopsData?.results || workshopsData || []

  // Map sessionId → next cover occurrence (substitute instructor set)
  const coverBySession = {}
  for (const occ of (upcomingOccData?.results || upcomingOccData?.data?.results || upcomingOccData || [])) {
    if (occ.substitute_instructor && occ.session) {
      const existing = coverBySession[occ.session]
      if (!existing || occ.date < existing.date) coverBySession[occ.session] = occ
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const active = enrolments_.filter(e => e.status === 'active')
  const pendingDisplacement = enrolments_.filter(e => e.status === 'pending_displacement')
  const waitlisted = enrolments_.filter(e => e.status === 'waitlisted')
  const seasonWaitlisted = waitlisted.filter(e => e.enrolment_type === 'course')
  const classWaitlisted = waitlisted.filter(e => e.enrolment_type !== 'course')
  const pastEnrolments = enrolments_.filter(e => ['completed', 'cancelled'].includes(e.status))

  const currentEnrolments = active.filter(e => {
    const start = e.class_session_detail?.season_start_date
    return !start || start <= today
  })
  const futureEnrolments = active.filter(e => {
    const start = e.class_session_detail?.season_start_date
    return start && start > today
  })

  // Pricing helpers
  const priceSeason = parseFloat(studioSettings?.price_season || 270)
  const discountTiers = studioSettings?.season_discount_tiers || {2:100,3:130,4:150,5:170,6:170}
  function getIncrementalPrice(position) {
    const discount = parseFloat(discountTiers[position] ?? discountTiers[String(position)] ?? 0)
    return Math.max(0, priceSeason - discount)
  }
  function getSeasonTotal(count) {
    let total = 0
    for (let i = 1; i <= count; i++) total += getIncrementalPrice(i)
    return total
  }

  // Season info
  const currentSeasonEnr = currentEnrolments[0]
  const currentSeasonStart = currentSeasonEnr?.class_session_detail?.season_start_date
  const currentSeasonEnd = currentSeasonEnr?.class_session_detail?.season_end_date
  const currentSeasonName = currentSeasonEnr?.season_detail?.name || currentSeasonEnr?.class_session_detail?.season_name || 'Current Season'
  const currentWeek = currentSeasonStart
    ? Math.min(8, Math.max(1, Math.floor((new Date() - new Date(currentSeasonStart + 'T00:00')) / (7 * 86400000)) + 1))
    : null

  const futureSeasonEnr = futureEnrolments[0]
  const futureSeasonStart = futureSeasonEnr?.class_session_detail?.season_start_date
  const futureSeasonEnd = futureSeasonEnr?.class_session_detail?.season_end_date
  const futureSeasonName = futureSeasonEnr?.season_detail?.name || futureSeasonEnr?.class_session_detail?.season_name || 'Future Season'

  const fmtShortDate = d => d ? new Date(d + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''

  // Casual bookings for current vs future season
  const confirmedCasuals = casualItems.filter(b => b.status === 'confirmed' && !b.displacement_offered_at)
  const waitlistedCasuals = casualItems.filter(b => b.status === 'waitlisted')
  const displacedCasuals = casualItems.filter(b => b.status === 'confirmed' && b.displacement_offered_at)

  // Workshops (booked by user)
  const bookedWorkshops = workshops.filter(w => w.is_booked)

  // Past seasons grouped by season
  const pastBySeasonId = useMemo(() => {
    const map = {}
    for (const enr of pastEnrolments) {
      const sid = enr.season_detail?.id || enr.class_session_detail?.season_id || 'unknown'
      if (!map[sid]) map[sid] = {
        id: sid,
        name: enr.season_detail?.name || enr.class_session_detail?.season_name || 'Past Season',
        start: enr.class_session_detail?.season_start_date || enr.season_detail?.start_date,
        end: enr.class_session_detail?.season_end_date || enr.season_detail?.end_date,
        enrolments: [],
      }
      map[sid].enrolments.push(enr)
    }
    return Object.values(map).sort((a, b) => (b.start || '').localeCompare(a.start || ''))
  }, [pastEnrolments])

  // Past casuals grouped by season date range
  const pastCasuals = casualItems.filter(b => b.occurrence_detail?.date && b.occurrence_detail.date < today)
  function getCasualSeason(casual) {
    const d = casual.occurrence_detail?.date
    if (!d) return null
    for (const s of pastBySeasonId) {
      if (s.start && s.end && d >= s.start && d <= s.end) return s.id
    }
    return null
  }

  // EnrolCard component
  function EnrolCard({ enr, badge = 'ACTIVE', showCancel = true }) {
    const s = enr.class_session_detail
    const day = s?.day_of_week != null ? DAY_SHORT[s.day_of_week] : ''
    const time = s?.start_time ? fmtTime(s.start_time) : ''
    const instructorName = s?.instructor_detail?.display_name || s?.instructor_detail?.first_name || ''
    const instructorId = s?.instructor_detail?.id
    const studio = s?.studio_detail?.name || ''
    const badgeColor = badge === 'ACTIVE' || badge === 'BOOKED' ? 'var(--lime)' : badge === 'WAITLISTED' ? 'var(--lav)' : 'var(--grey)'
    const coverOcc = s?.id ? coverBySession[s.id] : null
    const coverName = coverOcc?.substitute_instructor_detail?.display_name || coverOcc?.substitute_instructor_detail?.first_name || null

    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {(day || time) && (
            <div style={{ textAlign: 'center', minWidth: 52, flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{day}</div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(16px, 4.5vw, 20px)', color: 'var(--lime)', lineHeight: 1 }}>{time}</div>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{s?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
              {[studio, 'Weeks 1–8'].filter(Boolean).join(' · ')}
            </div>
            {coverName ? (
              <div style={{ fontSize: 12, marginTop: 2 }}>
                <span style={{ color: '#ffaa00', fontWeight: 600 }}>COVER</span>
                <span style={{ color: 'var(--grey)' }}> — {coverName}</span>
              </div>
            ) : instructorName ? (
              <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{instructorName}</div>
            ) : null}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: badgeColor, border: `1px solid ${badgeColor}`, borderRadius: 20, padding: '2px 10px', marginBottom: showCancel ? 4 : 0, display: 'inline-block' }}>{badge}</div>
            {showCancel && (
              <button onClick={() => setCancelPolicyEnrol(enr)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 10, color: 'var(--red)', display: 'block', marginTop: 2 }}>CANCEL</button>
            )}
          </div>
        </div>
        {badge === 'ACTIVE' && instructorId && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => navigate(`/portal/chat?instructor=${instructorId}&name=${encodeURIComponent(instructorName || 'your teacher')}`)}
              style={{ background: 'none', border: '1px solid rgba(204,255,0,0.25)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--lime)', letterSpacing: '0.3px' }}
            >
              💬 Message {coverName ? coverName : (instructorName || 'my teacher')}
            </button>
          </div>
        )}
        {badge === 'ACTIVE' && s?.id && (
          <ClassRoster sessionId={s.id} />
        )}
        {badge === 'ACTIVE' && enr.upcoming_occurrences?.length > 0 && (
          <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            {enr.upcoming_occurrences.map((occ, idx) => {
              const occDateLabel = new Date(occ.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
              const occTimeLabel = occ.start_time ? fmtTime(occ.start_time) : ''
              const isLast = idx === enr.upcoming_occurrences.length - 1
              const isInlineOpen = markAwayInlineId === occ.id
              const windowHours = studioSettings?.cancellation_window_hours || 4
              const noShowFee = studioSettings?.no_show_fee ? `$${parseFloat(studioSettings.no_show_fee).toFixed(0)}` : '$20'
              const classDateTime = occ.start_time ? new Date(`${occ.date}T${occ.start_time}`) : null
              const hoursUntil = classDateTime ? (classDateTime - new Date()) / (1000 * 60 * 60) : null
              const isLate = hoursUntil !== null && hoursUntil > 0 && hoursUntil < windowHours
              return (
                <div key={occ.id} style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                    <span style={{ fontSize: 12, color: 'var(--grey)' }}>{occDateLabel}{occTimeLabel ? ` · ${occTimeLabel}` : ''}</span>
                    {occ.marked_away ? (
                      <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>Away</span>
                    ) : (
                      <button
                        onClick={() => isBlocked ? setShowBlockedBanner(true) : setMarkAwayOcc({ ...occ, session_detail: { name: enr.class_session_detail?.name, start_time: occ.start_time } })}
                        style={{ background: 'none', border: `1px solid ${isBlocked ? 'rgba(255,68,68,0.35)' : 'rgba(255,170,0,0.35)'}`, borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontSize: 10, fontWeight: 700, color: isBlocked ? 'var(--red)' : 'var(--amber)', letterSpacing: '0.3px' }}
                      >
                        MARK AWAY
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // PricingSummary component
  function PricingSummary({ count, seasonName, isFuture }) {
    if (count === 0) return null
    const total = getSeasonTotal(count)
    const perClass = Math.round(total / count)
    const nextPos = count + 1
    const nextIncremental = nextPos <= 6 ? getIncrementalPrice(nextPos) : null
    const nextPerSession = nextIncremental !== null ? (nextIncremental / 8).toFixed(2) : null
    const freePerks = nextPos === 3 ? '+ 1 free practice session/week' : nextPos >= 4 ? '+ unlimited free practice' : ''
    const ordinal = ['', '2nd', '3rd', '4th', '5th', '6th'][nextPos] || `${nextPos}th`
    return (
      <div style={{ background: '#0d0d0d', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', marginTop: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--grey)' }}>{count} class{count !== 1 ? 'es' : ''} · {seasonName}</div>
            <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>${perClass}/class · 8 weeks{isFuture ? ' · payment plan available' : ''}</div>
          </div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(16px, 4.5vw, 20px)' }}>${total}</div>
        </div>
        {nextPerSession && (
          <div style={{ fontSize: 12, color: 'var(--grey)', margin: '10px 0 12px', lineHeight: 1.5 }}>
            Add a {ordinal} class → just <span style={{ color: 'var(--lime)', fontWeight: 700 }}>${nextPerSession}/session</span>{freePerks ? ` ${freePerks}` : ''}
          </div>
        )}
        <Link to="/portal/book">
          <button className="btn btn-lime btn-sm" style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.06em' }}>
            {isFuture ? `ADD A CLASS TO ${(seasonName || '').toUpperCase()}` : 'BROWSE CLASSES TO ADD'}
          </button>
        </Link>
      </div>
    )
  }

  function cancelCasual(booking) {
    setCancelCasualBooking(booking)
  }

  async function confirmCancelCasual() {
    const booking = cancelCasualBooking
    setCancelCasualBooking(null)
    try {
      await classesApi.casual.cancel(booking.occurrence)
      refetchCasual()
    } catch (e) {
      alert(e.response?.data?.detail || 'Could not cancel — please try again.')
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div className="page-title">My Classes</div>
            <div className="page-sub">{active.length} active enrolment{active.length !== 1 ? 's' : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <Link to="/portal/upcoming-classes">
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>View upcoming →</button>
            </Link>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 12 }}
              onClick={async () => {
                try {
                  const res = await classesApi.downloadIcal()
                  const url = URL.createObjectURL(new Blob([res.data], { type: 'text/calendar' }))
                  const a = document.createElement('a')
                  a.href = url; a.download = 'duality-schedule.ics'; a.click()
                  URL.revokeObjectURL(url)
                } catch { alert('Failed to download calendar file.') }
              }}
            >
              📅 Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Season tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'var(--card)', borderRadius: 12, padding: 4, marginBottom: 24, border: '1px solid var(--border)' }}>
        {[['active', 'Active Season'], ['future', 'Future Season'], ['past', 'Past Seasons']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ background: tab === key ? '#fff' : 'transparent', color: tab === key ? '#000' : 'var(--grey)', border: 'none', borderRadius: 9, padding: '10px 8px', cursor: 'pointer', fontWeight: tab === key ? 700 : 400, fontSize: 13, transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : (
        <>
          {/* ── Active Season tab ── */}
          {tab === 'active' && (
            <div>
              {/* Season header */}
              {currentSeasonName && (
                <div style={{ background: 'rgba(204,255,0,0.05)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{currentSeasonName}</div>
                    {currentSeasonStart && currentSeasonEnd && (
                      <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{fmtShortDate(currentSeasonStart)} — {fmtShortDate(currentSeasonEnd)}</div>
                    )}
                  </div>
                  {currentWeek && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(16px, 4.5vw, 20px)', color: 'var(--lime)', lineHeight: 1 }}>Week {currentWeek}</div>
                      <div style={{ fontSize: 11, color: 'var(--grey)' }}>of 8</div>
                    </div>
                  )}
                </div>
              )}

              {/* Catch-up credits */}
              {availableCredits.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(176,160,255,0.06)', border: '1px solid rgba(176,160,255,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(18px, 5vw, 22px)', color: 'var(--lav)', lineHeight: 1 }}>{availableCredits.length}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Catch-up credit{availableCredits.length !== 1 ? 's' : ''} available</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 1 }}>
                      Use in <Link to="/portal/book" style={{ color: 'var(--lav)', textDecoration: 'none' }}>Book a Class</Link> to join any eligible class at no charge
                    </div>
                  </div>
                </div>
              )}

              {/* Waitlist offer banners */}
              {waitlisted.filter(e => e.waitlist_offered_at).map(e => (
                <WaitlistOfferBanner key={e.id} enrolment={e} onClaimed={refetchEnrol} />
              ))}

              {/* Pending displacement banners */}
              {pendingDisplacement.map(e => (
                <PendingDisplacementBanner key={e.id} enrolment={e} />
              ))}

              {/* Displacement action cards */}
              {displacedCasuals.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Action Required</div>
                  {displacedCasuals.map(b => {
                    const d = b.occurrence_detail
                    const dateLabel = d?.date ? new Date(d.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'
                    const expiresAt = b.displacement_expires_at ? new Date(b.displacement_expires_at) : null
                    const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt - new Date()) / 3600000)) : null
                    return (
                      <div key={b.id} onClick={() => setDisplacementPopup(b)} style={{ background: 'rgba(255,170,0,0.05)', border: '2px solid rgba(255,170,0,0.25)', borderRadius: 14, padding: '14px 16px', marginBottom: 10, cursor: 'pointer' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{d?.session_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 6 }}>{[dateLabel, d?.start_time?.slice(0, 5), d?.studio_name].filter(Boolean).join(' · ')}</div>
                        <div style={{ fontSize: 12, color: '#f59e0b' }}>Season enrolment offer — {hoursLeft !== null ? `respond within ${hoursLeft}h` : 'respond now'}</div>
                        <div style={{ fontSize: 11, color: 'var(--lime)', marginTop: 2 }}>Tap to upgrade or release →</div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div>
                  {currentEnrolments.length === 0 ? (
                    <div className="empty-state">
                      <div style={{ marginBottom: 8 }}>No classes enrolled this season</div>
                      <Link to="/portal/book"><button className="btn btn-lime btn-sm" style={{ marginTop: 8 }}>Browse Classes →</button></Link>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {currentEnrolments.map(enr => <EnrolCard key={enr.id} enr={enr} badge="ACTIVE" />)}
                    </div>
                  )}
                  {currentEnrolments.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <PricingSummary count={currentEnrolments.length} seasonName={currentSeasonName} isFuture={false} />
                    </div>
                  )}

                  {/* Season waitlist (current) */}
                  {seasonWaitlisted.filter(e => { const s = e.class_session_detail?.season_start_date; return !s || s <= today }).length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--lav)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Season Waitlist</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {seasonWaitlisted.filter(e => { const s = e.class_session_detail?.season_start_date; return !s || s <= today }).map(e => (
                          <EnrolCard key={e.id} enr={e} badge="WAITLISTED" showCancel={false} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Class waitlist (current) */}
                  {classWaitlisted.filter(e => { const s = e.class_session_detail?.season_start_date; return !s || s <= today }).length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Class Waitlist</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {classWaitlisted.filter(e => { const s = e.class_session_detail?.season_start_date; return !s || s <= today }).map(e => (
                          <div key={e.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 15 }}>{e.class_session_detail?.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{DAYS[e.class_session_detail?.day_of_week]} · {e.class_session_detail?.studio_detail?.name}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {e.waitlist_position != null && <span className="tag tag-grey" style={{ fontSize: 10 }}>#{e.waitlist_position}</span>}
                              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={() => setClassWaitlistLeaveEnrol(e)}>Leave</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              {/* Casual & catch-ups — inline below enrolled */}
              {(confirmedCasuals.filter(b => { const d = b.occurrence_detail?.date; return d && d >= today }).length > 0 || waitlistedCasuals.length > 0) && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Casual & catch-ups</div>
                <div>
                  {confirmedCasuals.filter(b => { const d = b.occurrence_detail?.date; return d && d >= today }).length === 0 && waitlistedCasuals.length === 0 ? (
                    <div className="empty-state">
                      <div style={{ marginBottom: 8 }}>No upcoming casual or catch-up bookings</div>
                      <Link to="/portal/book"><button className="btn btn-lime btn-sm" style={{ marginTop: 8 }}>Book a casual →</button></Link>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {confirmedCasuals.filter(b => { const d = b.occurrence_detail?.date; return d && d >= today }).map(b => {
                        const d = b.occurrence_detail
                        const isCatchup = b.enrolment_type === 'catchup'
                        const dayStr = d?.date ? new Date(d.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short' }) : ''
                        const dayNum = d?.date ? new Date(d.date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric' }) : ''
                        const monStr = d?.date ? new Date(d.date + 'T00:00').toLocaleDateString('en-AU', { month: 'short' }) : ''
                        return (
                          <div key={b.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                              <div style={{ textAlign: 'center', minWidth: 52, flexShrink: 0 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase' }}>{dayStr}</div>
                                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: isCatchup ? 'var(--lav)' : 'var(--lime)', lineHeight: 1 }}>{dayNum}</div>
                                <div style={{ fontSize: 10, color: 'var(--grey)' }}>{monStr}</div>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{d?.session_name}</div>
                                <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{[d?.start_time?.slice(0, 5), d?.studio_name].filter(Boolean).join(' · ')}</div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: isCatchup ? 'var(--lav)' : 'var(--lime)', border: `1px solid ${isCatchup ? 'var(--lav)' : 'var(--lime)'}`, borderRadius: 20, padding: '2px 10px', marginBottom: 4, display: 'inline-block' }}>{isCatchup ? 'CATCH-UP' : 'CASUAL'}</div>
                                <div><button onClick={() => cancelCasual(b)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 10, color: 'var(--red)', display: 'block', marginTop: 2 }}>CANCEL</button></div>
                              </div>
                            </div>
                            {d?.session_id && <ClassRoster sessionId={d.session_id} />}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {waitlistedCasuals.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>On Waitlist</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {waitlistedCasuals.map(b => {
                          const d = b.occurrence_detail
                          const dateLabel = d?.date ? new Date(d.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'
                          return (
                            <div key={b.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{d?.session_name}</div>
                                <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{[dateLabel, d?.start_time?.slice(0, 5), d?.studio_name].filter(Boolean).join(' · ')}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="tag tag-amber" style={{ fontSize: 10 }}>Waitlist</span>
                                <button className="btn btn-ghost btn-xs" style={{ fontSize: 11, color: 'var(--red)' }} onClick={() => cancelCasual(b)}>Leave</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
                </div>
              )}
            </div>
          )}

          {/* ── Future Season tab ── */}
          {tab === 'future' && (
            <div>
              {/* Season header */}
              {futureSeasonName && futureEnrolments.length > 0 && (
                <div style={{ background: 'rgba(204,255,0,0.05)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{futureSeasonName}</div>
                    {futureSeasonStart && futureSeasonEnd && (
                      <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>Starts {fmtShortDate(futureSeasonStart)} · Ends {fmtShortDate(futureSeasonEnd)}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--lime)', border: '1px solid var(--lime)', borderRadius: 20, padding: '3px 10px' }}>UPCOMING</div>
                </div>
              )}

              {/* Waitlist offer banners (future) */}
              {waitlisted.filter(e => e.waitlist_offered_at && e.class_session_detail?.season_start_date > today).map(e => (
                <WaitlistOfferBanner key={e.id} enrolment={e} onClaimed={refetchEnrol} />
              ))}

              {futureEnrolments.length === 0 && seasonWaitlisted.filter(e => e.class_session_detail?.season_start_date > today).length === 0 && classWaitlisted.filter(e => e.class_session_detail?.season_start_date > today).length === 0 ? (
                <div className="empty-state">
                  <div style={{ marginBottom: 8 }}>Nothing booked for next season yet</div>
                  <Link to="/portal/book"><button className="btn btn-lime btn-sm" style={{ marginTop: 8 }}>Browse Classes →</button></Link>
                </div>
              ) : (
                <>
                  {futureEnrolments.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Enrolled Classes</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {futureEnrolments.map(enr => <EnrolCard key={enr.id} enr={enr} badge="BOOKED" />)}
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <PricingSummary count={futureEnrolments.length} seasonName={futureSeasonName} isFuture={true} />
                      </div>
                    </div>
                  )}

                  {/* Booked workshops */}
                  {bookedWorkshops.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Workshops Booked</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {bookedWorkshops.map(w => (
                          <div key={w.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 15 }}>{w.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
                                {[w.date ? new Date(w.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : null, w.instructor_detail?.display_name || w.instructor_detail?.first_name].filter(Boolean).join(' · ')}
                              </div>
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--lime)', border: '1px solid var(--lime)', borderRadius: 20, padding: '2px 10px' }}>BOOKED</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Season waitlist (future) */}
                  {seasonWaitlisted.filter(e => e.class_session_detail?.season_start_date > today).length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--lav)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Season Waitlist</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {seasonWaitlisted.filter(e => e.class_session_detail?.season_start_date > today).map(e => (
                          <div key={e.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 15 }}>{e.class_session_detail?.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{DAYS[e.class_session_detail?.day_of_week]} · {e.class_session_detail?.studio_detail?.name}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {e.waitlist_position != null && <span className="tag tag-lav" style={{ fontSize: 10 }}>#{e.waitlist_position}</span>}
                              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={() => setCancelPolicyEnrol({ ...e, _isWaitlist: true })}>Leave</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Class waitlist (future) */}
                  {classWaitlisted.filter(e => e.class_session_detail?.season_start_date > today).length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Class Waitlist</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {classWaitlisted.filter(e => e.class_session_detail?.season_start_date > today).map(e => (
                          <div key={e.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 15 }}>{e.class_session_detail?.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--grey)' }}>{DAYS[e.class_session_detail?.day_of_week]} · {e.class_session_detail?.studio_detail?.name}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {e.waitlist_position != null && <span className="tag tag-grey" style={{ fontSize: 10 }}>#{e.waitlist_position}</span>}
                              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={() => setClassWaitlistLeaveEnrol(e)}>Leave</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Past Seasons tab ── */}
          {tab === 'past' && (
            <div>
              {pastBySeasonId.length === 0 && pastCasuals.length === 0 ? (
                <div className="empty-state"><div>No history yet</div></div>
              ) : (
                pastBySeasonId.map(season => {
                  const seasonCasuals = pastCasuals.filter(b => getCasualSeason(b) === season.id)
                  return (
                    <div key={season.id} style={{ marginBottom: 32 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>{season.name}</div>
                          {season.start && season.end && (
                            <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{fmtShortDate(season.start)} — {fmtShortDate(season.end)}</div>
                          )}
                        </div>
                      </div>

                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Enrolled</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: seasonCasuals.length > 0 ? 16 : 0 }}>
                        {season.enrolments.map(enr => <EnrolCard key={enr.id} enr={enr} badge="COMPLETED" showCancel={false} />)}
                      </div>

                      {seasonCasuals.length > 0 && (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8, marginTop: 4 }}>Casual & Catch-ups</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {seasonCasuals.map(b => {
                              const d = b.occurrence_detail
                              const dateLabel = d?.date ? new Date(d.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'
                              const isCatchup = b.enrolment_type === 'catchup'
                              return (
                                <div key={b.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 15 }}>{d?.session_name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{[dateLabel, d?.start_time?.slice(0, 5), d?.studio_name].filter(Boolean).join(' · ')}</div>
                                  </div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--grey)', border: '1px solid var(--grey)', borderRadius: 20, padding: '2px 10px' }}>{isCatchup ? 'CATCH-UP' : 'ATTENDED'}</div>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })
              )}

              {pastCasuals.filter(b => getCasualSeason(b) === null).length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Past Casual & Catch-ups</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pastCasuals.filter(b => getCasualSeason(b) === null).map(b => {
                      const d = b.occurrence_detail
                      const dateLabel = d?.date ? new Date(d.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'
                      const isCatchup = b.enrolment_type === 'catchup'
                      return (
                        <div key={b.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{d?.session_name}</div>
                            <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{[dateLabel, d?.start_time?.slice(0, 5), d?.studio_name].filter(Boolean).join(' · ')}</div>
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--grey)', border: '1px solid var(--grey)', borderRadius: 20, padding: '2px 10px' }}>{isCatchup ? 'CATCH-UP' : 'ATTENDED'}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {markAwayOcc && (
        <MarkAwayModal
          occurrence={markAwayOcc}
          cancellationWindowHours={studioSettings?.cancellation_window_hours || 4}
          noShowFee={studioSettings?.no_show_fee}
          onClose={() => setMarkAwayOcc(null)}
          onDone={() => { setMarkAwayOcc(null); refetchEnrol() }}
        />
      )}

      {cancelPolicyEnrol && (
        <CancelPolicyModal
          enrolment={cancelPolicyEnrol}
          isWaitlist={!!cancelPolicyEnrol._isWaitlist}
          onClose={() => setCancelPolicyEnrol(null)}
          onDone={() => { setCancelPolicyEnrol(null); refetchEnrol() }}
        />
      )}

      {classWaitlistLeaveEnrol && (
        <ClassWaitlistLeaveModal
          enrolment={classWaitlistLeaveEnrol}
          onClose={() => setClassWaitlistLeaveEnrol(null)}
          onDone={() => { setClassWaitlistLeaveEnrol(null); refetchEnrol() }}
        />
      )}

      {displacementPopup && (
        <DisplacementPopupModal
          booking={displacementPopup}
          onClose={() => setDisplacementPopup(null)}
          onAction={() => { setDisplacementPopup(null); refetchCasual(); refetchEnrol() }}
        />
      )}

      {cancelCasualBooking && (
        <CancelCasualModal
          booking={cancelCasualBooking}
          onClose={() => setCancelCasualBooking(null)}
          onConfirm={confirmCancelCasual}
        />
      )}

      {showBlockedBanner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowBlockedBanner(false)}>
          <div style={{ background: 'var(--card)', border: '1px solid rgba(255,68,68,0.35)', borderRadius: 14, padding: '32px 24px', maxWidth: 400, width: '100%', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 14 }}>🔒</div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 10 }}>Account on hold</div>
            <div style={{ fontSize: 14, color: 'var(--grey)', marginBottom: 8, lineHeight: 1.7 }}>
              You have a pending charge on your account that needs to be paid.
            </div>
            {owingAmount && (
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: 'var(--red)', marginBottom: 8 }}>
                ${owingAmount.toFixed(2)} owing
              </div>
            )}
            <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 24, lineHeight: 1.6 }}>
              Please pay the amount to be able to enrol, mark absent, and book catch-ups.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/portal/billing" style={{ display: 'inline-block', background: 'var(--lime)', color: '#000', fontWeight: 700, borderRadius: 8, padding: '11px 24px', textDecoration: 'none', fontSize: 14 }}>
                Pay balance now
              </a>
              <a href="/portal/chat" style={{ display: 'inline-block', background: 'transparent', color: 'var(--white)', fontWeight: 600, borderRadius: 8, padding: '11px 24px', textDecoration: 'none', fontSize: 14, border: '1px solid var(--border)' }}>
                Contact us
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
