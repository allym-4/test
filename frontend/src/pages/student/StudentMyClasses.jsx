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
      <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11, color: 'var(--grey)', textDecoration: 'underline', textDecorationStyle: 'dotted', marginTop: 8 }}>
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

export default function StudentMyClasses() {
  const { user } = useAuth()
  const { data: enrolData, loading, refetch: refetchEnrol } = useApi(() => enrolmentsApi.list({ student: user?.id }), [user?.id])
  const { data: attData, refetch: refetchAtt } = useApi(() => attendance.list({ student: user?.id }), [user?.id])
  const { data: upcomingData, refetch: refetchUpcoming } = useApi(() => classesApi.occurrences({ student: user?.id, upcoming: true }), [user?.id])
  const { data: casualBookingsData, refetch: refetchCasual } = useApi(() => classesApi.casual.myBookings(), [])
  const { data: creditsData } = useApi(() => user?.id ? attendanceApi.makeupCredits.list({ student: user.id, status: 'available' }) : null, [user?.id])
  const { data: studioSettings } = useApi(() => settingsApi.get(), [])

  const [markAwayOcc, setMarkAwayOcc] = useState(null)
  const [cancelAwayOcc, setCancelAwayOcc] = useState(null)
  const [tab, setTab] = useState('current')
  const [cancelPolicyEnrol, setCancelPolicyEnrol] = useState(null)
  const [classWaitlistLeaveEnrol, setClassWaitlistLeaveEnrol] = useState(null)
  const [displacementPopup, setDisplacementPopup] = useState(null)

  useEffect(() => {
    const items = casualBookingsData?.results || casualBookingsData || []
    const displaced = items.find(b => b.status === 'confirmed' && b.displacement_offered_at)
    if (displaced) setDisplacementPopup(displaced)
  }, [casualBookingsData])

  const enrolments_ = enrolData?.results || enrolData || []
  const attHistory = attData?.results || attData || []
  const upcomingOccurrences = upcomingData?.results || upcomingData || []
  const casualItems = casualBookingsData?.results || casualBookingsData || []
  const availableCredits = creditsData?.results || creditsData || []

  const today = new Date().toISOString().slice(0, 10)
  const active = enrolments_.filter(e => e.status === 'active')
  const pendingDisplacement = enrolments_.filter(e => e.status === 'pending_displacement')
  const waitlisted = enrolments_.filter(e => e.status === 'waitlisted')
  const seasonWaitlisted = waitlisted.filter(e => e.enrolment_type === 'course')
  const classWaitlisted = waitlisted.filter(e => e.enrolment_type !== 'course')
  const past = enrolments_.filter(e => ['completed', 'cancelled', 'expired'].includes(e.status))

  // Split active into current-season vs future-season
  const currentEnrolments = active.filter(e => {
    const start = e.class_session_detail?.season_start_date
    return !start || start <= today
  })
  const futureEnrolments = active.filter(e => {
    const start = e.class_session_detail?.season_start_date
    return start && start > today
  })

  // Season info from first current enrolment
  const seasonInfo = useMemo(() => {
    const enr = currentEnrolments[0]
    if (!enr) return null
    const sess = enr.class_session_detail
    const name = enr.season_detail?.name ?? sess?.season_name ?? null
    const start = sess?.season_start_date ?? null
    const end = sess?.season_end_date ?? null
    if (!name && !start) return null
    const fmt = d => d ? new Date(d + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : null
    return { name, start: fmt(start), end: fmt(end) }
  }, [currentEnrolments])

  // Build unified chronological list for Current tab
  const currentItems = useMemo(() => {
    const list = []
    // Add upcoming occurrences from enrolled classes
    currentEnrolments.forEach(enr => {
      const sess = enr.class_session_detail
      const occurrences = enr.upcoming_occurrences || []
      occurrences.forEach(occ => {
        list.push({
          key: `enr-${enr.id}-${occ.id}`,
          type: 'enrolled',
          date: occ.date,
          time: occ.start_time || sess?.start_time || '',
          sessionName: sess?.name || enr.class_name || 'Class',
          studio: sess?.studio_detail?.name || null,
          sessionId: enr.class_session,
          enrolment: enr,
          occurrence: { ...occ, session_detail: sess },
          isAway: occ.marked_away || occ.my_status === 'absent',
        })
      })
    })
    // Add casual/catch-up bookings (non-displaced)
    casualItems
      .filter(b => b.status === 'confirmed' && !b.displacement_offered_at)
      .forEach(b => {
        const d = b.occurrence_detail
        if (!d?.date) return
        list.push({
          key: `casual-${b.id}`,
          type: b.enrolment_type === 'catchup' ? 'catchup' : 'casual',
          date: d.date,
          time: d.start_time || '',
          sessionName: d.session_name || 'Class',
          studio: d.studio_name || null,
          sessionId: d.session_id || d.session || null,
          booking: b,
        })
      })
    list.sort((a, b) => {
      const da = `${a.date}T${a.time || '00:00'}`
      const db = `${b.date}T${b.time || '00:00'}`
      return da < db ? -1 : da > db ? 1 : 0
    })
    return list
  }, [currentEnrolments, casualItems])

  // Group by date
  const groupedItems = useMemo(() => {
    const groups = []
    let lastDate = null
    currentItems.forEach(item => {
      if (item.date !== lastDate) { groups.push({ date: item.date, items: [] }); lastDate = item.date }
      groups[groups.length - 1].items.push(item)
    })
    return groups
  }, [currentItems])

  const displacedCasuals = casualItems.filter(b => b.status === 'confirmed' && b.displacement_offered_at)
  const waitlistedCasuals = casualItems.filter(b => b.status === 'waitlisted')

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
      <div className="page-header">
        <div>
          <div className="page-title">My Classes</div>
          <div className="page-sub">{active.length} active enrolment{active.length !== 1 ? 's' : ''}</div>
        </div>
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

      <div style={{ marginBottom: 16 }}>
        <Link to="/portal/upcoming-classes" style={{ fontSize: 13, color: 'var(--lav)', textDecoration: 'none', fontWeight: 600 }}>
          View all upcoming →
        </Link>
      </div>

      {/* Tabs */}
      <div className="subtabs" style={{ marginBottom: 20 }}>
        {[['current', 'Current'], ['future', 'Future'], ['past', 'Past']].map(([key, label]) => (
          <button key={key} className={`subtab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : (
        <>
          {/* ── Current tab ── */}
          {tab === 'current' && (
            <div>
              {/* Season header */}
              {seasonInfo && (
                <div style={{ background: 'rgba(204,255,0,0.05)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{seasonInfo.name ?? 'Current Season'}</div>
                  {seasonInfo.start && seasonInfo.end && (
                    <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{seasonInfo.start} — {seasonInfo.end}</div>
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

              {/* Waitlist claim banners */}
              {waitlisted.filter(e => e.waitlist_offered_at).map(e => (
                <WaitlistOfferBanner key={e.id} enrolment={e} onClaimed={refetchEnrol} />
              ))}

              {/* Pending displacement banners */}
              {pendingDisplacement.map(e => (
                <PendingDisplacementBanner key={e.id} enrolment={e} />
              ))}

              {/* Displaced casual action cards */}
              {displacedCasuals.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Action Required</div>
                  {displacedCasuals.map(b => {
                    const d = b.occurrence_detail
                    const dateLabel = d?.date ? new Date(d.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'
                    const expiresAt = b.displacement_expires_at ? new Date(b.displacement_expires_at) : null
                    const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt - new Date()) / 3600000)) : null
                    return (
                      <div key={b.id}
                        onClick={() => setDisplacementPopup(b)}
                        style={{ background: 'rgba(255,170,0,0.05)', border: '2px solid rgba(255,170,0,0.25)', borderRadius: 14, padding: '14px 16px', marginBottom: 10, cursor: 'pointer' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{d?.session_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 6 }}>
                          {[dateLabel, d?.start_time?.slice(0, 5), d?.studio_name].filter(Boolean).join(' · ')}
                        </div>
                        <div style={{ fontSize: 12, color: '#f59e0b' }}>Season enrolment offer — {hoursLeft !== null ? `respond within ${hoursLeft}h` : 'respond now'}</div>
                        <div style={{ fontSize: 11, color: 'var(--lime)', marginTop: 2 }}>Click to upgrade or release →</div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Empty state */}
              {currentItems.length === 0 && displacedCasuals.length === 0 && (
                <div className="empty-state">
                  <div style={{ marginBottom: 8 }}>No upcoming classes this season</div>
                  <Link to="/portal/book"><button className="btn btn-lime btn-sm" style={{ marginTop: 8 }}>Book a class →</button></Link>
                </div>
              )}

              {/* Chronological list grouped by date */}
              {groupedItems.map(group => (
                <div key={group.date} style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '16px 0 8px' }}>
                    {new Date(group.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {group.items.map(item => {
                      const isEnrolled = item.type === 'enrolled'
                      const isCatchup = item.type === 'catchup'
                      const isCasual = item.type === 'casual'
                      return (
                        <div key={item.key} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600, fontSize: 14 }}>{item.sessionName}</span>
                                {(isCasual || isCatchup) && (
                                  <span className={`tag ${isCatchup ? 'tag-lav' : 'tag-lime'}`} style={{ fontSize: 10 }}>
                                    {isCatchup ? 'Catch-up' : 'Casual'}
                                  </span>
                                )}
                                {item.isAway && (
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: 'rgba(255,170,0,0.1)', borderRadius: 4, padding: '1px 6px' }}>AWAY</span>
                                )}
                              </div>
                              {(item.time || item.studio) && (
                                <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
                                  {[item.time ? item.time.slice(0, 5) : null, item.studio].filter(Boolean).join(' · ')}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                              {isEnrolled && !item.isAway && (
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setMarkAwayOcc(item.occurrence)}>
                                  Mark away
                                </button>
                              )}
                              {isEnrolled && item.isAway && (
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--lime)', borderColor: 'rgba(204,255,0,0.3)' }} onClick={() => setCancelAwayOcc(item.occurrence)}>
                                  I can make it!
                                </button>
                              )}
                              {(isCasual || isCatchup) && (
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={() => cancelCasual(item.booking)}>
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Who's coming */}
                          <ClassRoster sessionId={item.sessionId} />

                          {/* Cancel enrolment link */}
                          {isEnrolled && (
                            <button onClick={() => setCancelPolicyEnrol(item.enrolment)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11, color: 'var(--grey)', marginTop: 8, textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                              Cancel enrolment
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Waitlisted casuals */}
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
                            <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>
                              {[dateLabel, d?.start_time?.slice(0, 5), d?.studio_name].filter(Boolean).join(' · ')}
                            </div>
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

              {currentItems.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <Link to="/portal/book">
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>+ Book a casual or catch-up</button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* ── Future tab ── */}
          {tab === 'future' && (
            <div>
              {/* Waitlist claim banners for future season */}
              {waitlisted.filter(e => e.waitlist_offered_at).map(e => (
                <WaitlistOfferBanner key={e.id} enrolment={e} onClaimed={refetchEnrol} />
              ))}

              {futureEnrolments.length === 0 && seasonWaitlisted.length === 0 && classWaitlisted.length === 0 && (
                <div className="empty-state">
                  <div style={{ marginBottom: 8 }}>Your next season classes will appear here once booked</div>
                  <Link to="/portal/book"><button className="btn btn-lime btn-sm" style={{ marginTop: 8 }}>Browse Classes →</button></Link>
                </div>
              )}

              {futureEnrolments.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Enrolled — Upcoming Season</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {futureEnrolments.map(e => {
                      const s = e.class_session_detail
                      const seasonName = e.season_detail?.name ?? s?.season_name ?? null
                      return (
                        <div key={e.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{s?.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{DAYS[s?.day_of_week]} · {s?.start_time?.slice(0, 5)} · {s?.studio_detail?.name}</div>
                            {seasonName && <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 3 }}>{seasonName}</div>}
                          </div>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)', flexShrink: 0 }} onClick={() => setCancelPolicyEnrol(e)}>Cancel</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {seasonWaitlisted.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--lav)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Season Waitlist</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {seasonWaitlisted.map(e => {
                      const s = e.class_session_detail
                      return (
                        <div key={e.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{s?.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--grey)' }}>{DAYS[s?.day_of_week]} · {s?.studio_detail?.name}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            {e.waitlist_position != null && <span className="tag tag-lav" style={{ fontSize: 10 }}>#{e.waitlist_position}</span>}
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={() => setCancelPolicyEnrol({ ...e, _isWaitlist: true })}>Leave</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {classWaitlisted.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Class Waitlist</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {classWaitlisted.map(e => {
                      const s = e.class_session_detail
                      return (
                        <div key={e.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{s?.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--grey)' }}>{DAYS[s?.day_of_week]} · {s?.studio_detail?.name}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            {e.waitlist_position != null && <span className="tag tag-grey" style={{ fontSize: 10 }}>#{e.waitlist_position}</span>}
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={() => setClassWaitlistLeaveEnrol(e)}>Leave</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Past tab ── */}
          {tab === 'past' && (
            <div>
              {attHistory.length === 0 && past.length === 0 && (
                <div className="empty-state"><div>No history yet</div></div>
              )}

              {attHistory.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Attendance</div>
                  <div className="list-card">
                    {attHistory.map(rec => (
                      <div key={rec.id} className="list-row">
                        <div className="list-body">
                          <div className="list-title">{rec.occurrence?.session?.name ?? 'Class'}</div>
                          <div className="list-sub">
                            {rec.occurrence?.date ? new Date(rec.occurrence.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                          </div>
                        </div>
                        <span className={`tag tag-${rec.status === 'present' ? 'lime' : rec.status === 'absent' ? 'amber' : 'grey'}`} style={{ fontSize: 10, textTransform: 'capitalize' }}>
                          {rec.status?.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {past.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Previous Seasons</div>
                  <div className="list-card">
                    {past.map(e => {
                      const s = e.class_session_detail
                      return (
                        <div key={e.id} className="list-row" style={{ opacity: 0.7 }}>
                          <div className="list-body">
                            <div className="list-title">{s?.name}</div>
                            <div className="list-sub">{DAYS[s?.day_of_week]} · {s?.studio_detail?.name}{e.season_detail?.name ? ` · ${e.season_detail.name}` : ''}</div>
                          </div>
                          <span className="tag tag-grey" style={{ fontSize: 10 }}>Completed</span>
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
          cancellationWindowHours={studioSettings?.cancellation_window_hours ?? 4}
          noShowFee={studioSettings?.no_show_fee ?? 20}
          onClose={() => setMarkAwayOcc(null)}
          onDone={() => { setMarkAwayOcc(null); refetchAtt(); refetchEnrol() }}
        />
      )}

      {cancelAwayOcc && (
        <CancelAwayDialog
          occurrence={cancelAwayOcc}
          onClose={() => setCancelAwayOcc(null)}
          onDone={() => { setCancelAwayOcc(null); refetchAtt(); refetchEnrol(); refetchUpcoming() }}
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
    </div>
  )
}
