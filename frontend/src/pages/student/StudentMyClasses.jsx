import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { enrolments as enrolmentsApi, attendance, classes as classesApi, helpdesk as helpdeskApi, attendance as attendanceApi, settings as settingsApi } from '../../api'

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

// ─── MarkAwayModal ────────────────────────────────────────────────────────────

function MarkAwayModal({ occurrence, cancellationWindowHours, noShowFee, onClose, onDone }) {
  const [confirming, setConfirming] = useState(false)

  const occDate = new Date(occurrence.date + 'T' + (occurrence.session_detail?.start_time || '00:00'))
  const hoursUntil = (occDate - new Date()) / (1000 * 60 * 60)
  const windowHours = cancellationWindowHours || 4
  const isLate = hoursUntil > 0 && hoursUntil < windowHours
  const feeAmount = noShowFee ? `$${parseFloat(noShowFee).toFixed(0)}` : '$20'

  const sessionName = occurrence.session_detail?.name || occurrence.session_name
  const dateLabel = new Date(occurrence.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeLabel = occurrence.session_detail?.start_time ? occurrence.session_detail.start_time.slice(0, 5) : ''

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
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, maxWidth: 440, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 12px' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20 }}>Mark Away — {sessionName}</div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '6px 12px', letterSpacing: 0.5 }}>CLOSE</button>
        </div>

        <div style={{ fontSize: 14, color: 'var(--grey)', padding: '0 24px 16px' }}>
          {dateLabel}{timeLabel ? `, ${timeLabel}` : ''}
        </div>

        <div style={{ padding: '0 24px 20px' }}>
          {isLate ? (
            <div style={{ background: 'rgba(180,80,0,0.25)', border: '1px solid var(--amber)', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
              <div style={{ fontWeight: 800, color: 'var(--amber)', marginBottom: 8, fontSize: 15 }}>No catch-up credit for this one</div>
              <div style={{ fontSize: 14, color: 'var(--white)', lineHeight: 1.6 }}>
                This is within <strong>{windowHours} hours</strong> of your class — the cancellation window has passed. You can still mark away so we know you're not coming, but no credit will be issued. If you don't mark away and don't attend, a <strong style={{ color: 'var(--amber)' }}>{feeAmount} no-show fee</strong> will be charged.
              </div>
            </div>
          ) : (
            <div style={{ background: 'rgba(204,255,0,0.07)', border: '1.5px solid var(--lime)', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
              <div style={{ fontWeight: 800, color: 'var(--lime)', marginBottom: 8, fontSize: 15 }}>You'll receive a catch-up credit</div>
              <div style={{ fontSize: 14, color: 'var(--white)', lineHeight: 1.6 }}>
                This is more than <strong>{windowHours} hours</strong> before your class — you're within the cancellation window. A catch-up credit will be added to your account to use within this season.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isLate ? (
              <button className="btn btn-ghost btn-sm" onClick={confirm} disabled={confirming} style={{ fontWeight: 900, letterSpacing: 0.5 }}>
                {confirming ? 'Saving…' : 'MARK AWAY ANYWAY'}
              </button>
            ) : (
              <button className="btn btn-lime btn-sm" onClick={confirm} disabled={confirming} style={{ fontWeight: 900, letterSpacing: 0.5 }}>
                {confirming ? 'Saving…' : 'CONFIRM — MARK ME AWAY'}
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ color: 'var(--grey)' }}>CANCEL</button>
          </div>
        </div>
      </div>
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

  async function submitTransfer() {
    setSubmitting(true)
    setError('')
    try {
      await helpdeskApi.submitTicket({
        subject: `Transfer Request — ${s?.name || 'Class'}`,
        body: `Student requests a transfer from ${s?.name || 'their class'}.${notes ? '\n\nNotes: ' + notes : ''}`,
      })
      setStep('success')
    } catch {
      setError('Failed to submit — please try again.')
    } finally {
      setSubmitting(false)
    }
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
                    <button className="btn btn-lime btn-sm" style={{ flex: 1 }} onClick={() => setStep('transfer')}>Contact Us →</button>
                  </div>
                </>
              )}
            </>
          )}
          {step === 'transfer' && (
            <>
              <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 12, lineHeight: 1.6 }}>
                Tell us a little about your situation and we'll get back to you as soon as possible.
              </div>
              <textarea
                className="input"
                placeholder="Optional: what's changed? Any preferred days/times for the transfer?"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                style={{ width: '100%', resize: 'vertical', marginBottom: 12, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              {error && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setStep('policy')}>Back</button>
                <button className="btn btn-lime btn-sm" style={{ flex: 1 }} onClick={submitTransfer} disabled={submitting}>
                  {submitting ? 'Sending…' : 'Submit Request'}
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
  const { data: enrolData, loading, refetch: refetchEnrol } = useApi(() => enrolmentsApi.list({ student: user?.id }), [user?.id])
  const { data: casualBookingsData, refetch: refetchCasual } = useApi(() => classesApi.casual.myBookings(), [])
  const { data: workshopsData } = useApi(() => classesApi.workshops.list(), [])
  const { data: creditsData } = useApi(() => user?.id ? attendanceApi.makeupCredits.list({ student: user.id, status: 'available' }) : null, [user?.id])
  const { data: studioSettings } = useApi(() => settingsApi.get(), [])

  const [tab, setTab] = useState('active')
  const [activeSubTab, setActiveSubTab] = useState('enrolled')
  const [cancelPolicyEnrol, setCancelPolicyEnrol] = useState(null)
  const [classWaitlistLeaveEnrol, setClassWaitlistLeaveEnrol] = useState(null)
  const [displacementPopup, setDisplacementPopup] = useState(null)

  useEffect(() => {
    const items = casualBookingsData?.results || casualBookingsData || []
    const displaced = items.find(b => b.status === 'confirmed' && b.displacement_offered_at)
    if (displaced) setDisplacementPopup(displaced)
  }, [casualBookingsData])

  const enrolments_ = enrolData?.results || enrolData || []
  const casualItems = casualBookingsData?.results || casualBookingsData || []
  const availableCredits = creditsData?.results || creditsData || []
  const workshops = workshopsData?.results || workshopsData || []

  const today = new Date().toISOString().slice(0, 10)
  const active = enrolments_.filter(e => e.status === 'active')
  const pendingDisplacement = enrolments_.filter(e => e.status === 'pending_displacement')
  const waitlisted = enrolments_.filter(e => e.status === 'waitlisted')
  const seasonWaitlisted = waitlisted.filter(e => e.enrolment_type === 'course')
  const classWaitlisted = waitlisted.filter(e => e.enrolment_type !== 'course')
  const pastEnrolments = enrolments_.filter(e => ['completed', 'cancelled', 'expired'].includes(e.status))

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
    const instructor = s?.instructor_detail?.display_name || s?.instructor_detail?.first_name || ''
    const studio = s?.studio_detail?.name || ''
    const badgeColor = badge === 'ACTIVE' || badge === 'BOOKED' ? 'var(--lime)' : badge === 'WAITLISTED' ? 'var(--lav)' : 'var(--grey)'
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
        {(day || time) && (
          <div style={{ textAlign: 'center', minWidth: 52, flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{day}</div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: 'var(--lime)', lineHeight: 1 }}>{time}</div>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{s?.name}</div>
          <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
            {[studio, instructor, 'Weeks 1–8'].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: badgeColor, border: `1px solid ${badgeColor}`, borderRadius: 20, padding: '2px 10px', marginBottom: showCancel ? 4 : 0, display: 'inline-block' }}>{badge}</div>
          {showCancel && (
            <div>
              <button onClick={() => setCancelPolicyEnrol(enr)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 10, color: 'var(--red)', display: 'block', marginTop: 2 }}>CANCEL</button>
            </div>
          )}
        </div>
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
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22 }}>${total}</div>
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

  async function cancelCasual(booking) {
    if (!window.confirm(booking.status === 'waitlisted' ? 'Leave the waitlist for this class?' : 'Cancel this booking?')) return
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
      <div className="page-header">
        <div>
          <div className="page-title">My Classes</div>
          <div className="page-sub">{active.length} active enrolment{active.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link to="/portal/upcoming-classes">
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>View upcoming →</button>
          </Link>
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 12 }}
            onClick={async () => {
              try {
                const token = localStorage.getItem('access_token')
                const baseUrl = import.meta.env.VITE_API_URL || ''
                const res = await fetch(`${baseUrl}/api/enrolments/calendar.ics`, { headers: { Authorization: `Bearer ${token}` } })
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = 'duality-pole-classes.ics'; a.click()
                URL.revokeObjectURL(url)
              } catch { alert('Failed to download calendar file.') }
            }}
          >
            📅 Add to Calendar
          </button>
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
                      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: 'var(--lime)', lineHeight: 1 }}>Week {currentWeek}</div>
                      <div style={{ fontSize: 11, color: 'var(--grey)' }}>of 8</div>
                    </div>
                  )}
                </div>
              )}

              {/* Catch-up credits */}
              {availableCredits.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(176,160,255,0.06)', border: '1px solid rgba(176,160,255,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26, color: 'var(--lav)', lineHeight: 1 }}>{availableCredits.length}</div>
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

              {/* Sub-tabs: Enrolled / Casual & catch-ups */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#0d0d0d', borderRadius: 10, padding: 3, marginBottom: 16, border: '1px solid var(--border)' }}>
                {[['enrolled', 'Enrolled classes'], ['casual', 'Casual & catch-ups']].map(([key, label]) => (
                  <button key={key} onClick={() => setActiveSubTab(key)} style={{ background: activeSubTab === key ? 'var(--card)' : 'transparent', color: activeSubTab === key ? 'var(--white)' : 'var(--grey)', border: 'none', borderRadius: 8, padding: '8px 4px', cursor: 'pointer', fontWeight: activeSubTab === key ? 600 : 400, fontSize: 12, transition: 'all 0.15s' }}>
                    {label}
                  </button>
                ))}
              </div>

              {activeSubTab === 'enrolled' && (
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
              )}

              {activeSubTab === 'casual' && (
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
                          <div key={b.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
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
    </div>
  )
}
