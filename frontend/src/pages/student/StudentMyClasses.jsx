import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { enrolments as enrolmentsApi, attendance, classes as classesApi, helpdesk as helpdeskApi, attendance as attendanceApi, settings as settingsApi } from '../../api'

function WaitlistOfferBanner({ enrolment, onClaimed }) {
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState('')
  const expiresAt = enrolment.waitlist_expires_at ? new Date(enrolment.waitlist_expires_at) : null
  const now = new Date()
  const minutesLeft = expiresAt ? Math.max(0, Math.round((expiresAt - now) / 60000)) : null
  const session = enrolment.class_session_detail

  async function claim() {
    setClaiming(true)
    setError('')
    try {
      await enrolmentsApi.claimSpot(enrolment.id)
      onClaimed()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to claim spot. Please try again.')
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div style={{ background: 'rgba(204,255,0,0.08)', border: '2px solid var(--lime)', borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: 'var(--lime)', marginBottom: 4 }}>
            🎉 A spot opened up!
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{session?.name}</div>
          {enrolment.waitlist_urgent ? (
            <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.5 }}>
              Class starts soon — all waitlisted students were notified. First to confirm gets it!
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.5 }}>
              {minutesLeft !== null ? (
                minutesLeft > 60
                  ? `You have ${Math.round(minutesLeft / 60)}h ${minutesLeft % 60}m to claim your spot.`
                  : minutesLeft > 0
                    ? `⏰ Only ${minutesLeft} minutes left to claim!`
                    : 'Your offer may have expired — try claiming and we\'ll check.'
              ) : 'Claim your spot before it\'s offered to the next person.'}
            </div>
          )}
          {error && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{error}</div>}
        </div>
        <button className="btn btn-lime btn-sm" onClick={claim} disabled={claiming} style={{ flexShrink: 0, fontWeight: 700 }}>
          {claiming ? 'Claiming…' : 'Claim My Spot →'}
        </button>
      </div>
    </div>
  )
}

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

function MarkAwayModal({ occurrence, cancellationWindowHours, noShowFee, onClose, onDone }) {
  const [confirming, setConfirming] = useState(false)

  const occDate = new Date(occurrence.date + 'T' + (occurrence.session_detail?.start_time || '00:00'))
  const hoursUntil = (occDate - new Date()) / (1000 * 60 * 60)
  const windowHours = cancellationWindowHours || 24
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
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ flex: 1, color: 'var(--red)' }}
                      onClick={leaveWaitlist}
                      disabled={submitting}
                    >
                      {submitting ? '…' : 'Leave Waitlist'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background: 'rgba(255,68,68,0.07)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: 'var(--white)', lineHeight: 1.7 }}>
                    <strong style={{ color: 'var(--red)' }}>Non-refundable enrolment</strong><br /><br />
                    When you enrolled, we reserved a pole and planned the season around you. As a small studio, every confirmed booking directly supports our ability to keep classes running — which is why season enrolments are non-refundable once the season begins, in line with our terms and conditions.
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

function ClassWaitlistLeaveModal({ enrolment, onClose, onDone }) {
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState('')
  const s = enrolment.class_session_detail

  // day_of_week model: 0=Mon…6=Sun; JS getDay(): 0=Sun…6=Sat
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
      await enrolmentsApi.create({
        session: enrolment.class_session,
        status: 'waitlisted',
        enrolment_type: 'course',
      })
      await enrolmentsApi.delete(enrolment.id)
      onDone()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed — please try again.')
    } finally {
      setJoining(false)
    }
  }

  async function leaveWaitlist() {
    setLeaving(true)
    setError('')
    try {
      await enrolmentsApi.delete(enrolment.id)
      onDone()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed — please try again.')
    } finally {
      setLeaving(false)
    }
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
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(176,160,255,0.15)', border: '1px solid rgba(176,160,255,0.3)', color: 'var(--lav)', fontWeight: 600 }}
              onClick={joinSeasonWaitlist}
              disabled={joining || leaving}
            >
              {joining ? 'Moving…' : 'Join Season Waitlist Instead'}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ flex: 1, color: 'var(--red)' }}
                onClick={leaveWaitlist}
                disabled={leaving || joining}
              >
                {leaving ? '…' : 'Leave Class Waitlist'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DisplacementPopupModal({ booking, onClose, onAction }) {
  const [actioning, setActioning] = useState(null)
  const [messageSent, setMessageSent] = useState(false)
  const [error, setError] = useState('')

  const d = booking.occurrence_detail
  const dateLabel = d?.date ? new Date(d.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) : '—'
  const expiresAt = booking.displacement_expires_at ? new Date(booking.displacement_expires_at) : null
  const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt - new Date()) / 3600000)) : null

  async function upgrade() {
    setActioning('upgrade')
    setError('')
    try {
      await classesApi.casual.upgrade(booking.id)
      onAction()
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not upgrade — please try again.')
    } finally { setActioning(null) }
  }

  async function release() {
    setActioning('release')
    setError('')
    try {
      await classesApi.casual.release(booking.id)
      onAction()
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not release — please try again.')
    } finally { setActioning(null) }
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
            {hoursLeft !== null ? <strong style={{ color: 'var(--white)' }}> within {hoursLeft} hour{hoursLeft !== 1 ? 's' : ''}</strong> : ''}, or your spot will be released and your account credited with the amount paid.
            Have questions? Message us below.
          </div>

          {error && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-lime btn-sm" onClick={upgrade} disabled={busy} style={{ fontWeight: 700, fontSize: 14 }}>
              {actioning === 'upgrade' ? '…' : 'Upgrade to Full Season'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={release} disabled={busy} style={{ color: 'var(--red)', fontSize: 13 }}>
              {actioning === 'release' ? '…' : 'Release Spot'}
            </button>
            {messageSent ? (
              <div style={{ fontSize: 12, color: 'var(--lime)', textAlign: 'center', paddingTop: 4 }}>Message sent — we'll be in touch!</div>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={messageDuality} disabled={busy} style={{ fontSize: 13 }}>
                {actioning === 'message' ? '…' : 'Message Duality'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PendingDisplacementBanner({ enrolment }) {
  const s = enrolment.class_session_detail
  const expiresAt = enrolment.displacement_expires_at ? new Date(enrolment.displacement_expires_at) : null
  const now = new Date()
  const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt - now) / 3600000)) : null
  return (
    <div style={{ background: 'rgba(255,170,0,0.06)', border: '2px solid rgba(255,170,0,0.25)', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, color: '#f59e0b', marginBottom: 5 }}>Spot Pending Confirmation</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{s?.name}</div>
      <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
        There is a spot in the season, however a casual is taking up one of those spots. We've given the casual
        {hoursLeft !== null ? ` ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}` : ' some time'} to upgrade to a full season enrolment — and if they don't, the spot is yours! We'll confirm your enrolment as soon as it's resolved.
      </div>
    </div>
  )
}

function CasualBookingsTab({ bookings, credits, refetch }) {
  const [cancellingId, setCancellingId] = useState(null)
  const [actioningId, setActioningId] = useState(null)
  const [messageSentId, setMessageSentId] = useState(null)
  const [error, setError] = useState('')

  const items = bookings?.results || bookings || []

  async function cancel(booking) {
    setCancellingId(booking.id)
    setError('')
    try {
      await classesApi.casual.cancel(booking.occurrence)
      refetch()
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not cancel — please try again.')
    } finally {
      setCancellingId(null)
    }
  }

  async function upgrade(booking) {
    setActioningId(booking.id)
    setError('')
    try {
      await classesApi.casual.upgrade(booking.id)
      refetch()
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not upgrade — please try again.')
    } finally {
      setActioningId(null)
    }
  }

  async function release(booking) {
    setActioningId(booking.id)
    setError('')
    try {
      await classesApi.casual.release(booking.id)
      refetch()
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not release — please try again.')
    } finally {
      setActioningId(null)
    }
  }

  async function messageDuality(booking) {
    setActioningId(booking.id)
    try {
      await helpdeskApi.submitTicket({
        subject: `Displacement Offer Question — ${booking.occurrence_detail?.session_name || 'Class'}`,
        body: `Student has a question about their casual spot displacement offer for ${booking.occurrence_detail?.session_name || 'class'} on ${booking.occurrence_detail?.date || 'upcoming date'}.`,
      })
      setMessageSentId(booking.id)
    } catch { } finally {
      setActioningId(null)
    }
  }

  const displaced = items.filter(b => b.status === 'confirmed' && b.displacement_offered_at)
  const confirmed = items.filter(b => b.status === 'confirmed' && !b.displacement_offered_at)
  const waitlisted = items.filter(b => b.status === 'waitlisted')

  const availableCredits = credits?.results || credits || []

  return (
    <div>
      {availableCredits.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(176,160,255,0.06)', border: '1px solid rgba(176,160,255,0.25)', borderRadius: 12, padding: '14px 18px', marginBottom: 18 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lav)', lineHeight: 1 }}>{availableCredits.length}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>Catch-up credit{availableCredits.length !== 1 ? 's' : ''} available</div>
            <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
              Use in the <Link to="/book" style={{ color: 'var(--lav)', textDecoration: 'none' }}>Book</Link> tab to join any eligible casual class at no charge
            </div>
          </div>
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{error}</div>}

      {displaced.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Action Required</div>
          {displaced.map(b => {
            const d = b.occurrence_detail
            const dateLabel = d?.date ? new Date(d.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'
            const expiresAt = b.displacement_expires_at ? new Date(b.displacement_expires_at) : null
            const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt - new Date()) / 3600000)) : null
            const isActioning = actioningId === b.id
            return (
              <div key={b.id} style={{ background: 'rgba(255,170,0,0.05)', border: '2px solid rgba(255,170,0,0.25)', borderRadius: 14, padding: '16px 18px', marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{d?.session_name}</div>
                <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 12 }}>
                  {[dateLabel, d?.start_time ? d.start_time.slice(0, 5) : null, d?.studio_name].filter(Boolean).join(' · ')}
                </div>
                <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6, marginBottom: 14 }}>
                  A student wants to enrol for the full season of {d?.session_name || 'this class'}. Upgrade your casual booking to a full season enrolment
                  {hoursLeft !== null ? ` within ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}` : ''}, or your spot will be released and your account credited with the amount paid.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button className="btn btn-lime btn-sm" onClick={() => upgrade(b)} disabled={isActioning} style={{ fontWeight: 700 }}>
                    {isActioning ? '…' : 'Upgrade to Full Season'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => release(b)} disabled={isActioning} style={{ color: 'var(--red)' }}>
                    {isActioning ? '…' : 'Release Spot'}
                  </button>
                  {messageSentId === b.id ? (
                    <div style={{ fontSize: 12, color: 'var(--lime)', textAlign: 'center', paddingTop: 4 }}>Message sent — we'll be in touch!</div>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => messageDuality(b)} disabled={isActioning}>
                      Message Duality
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {items.length === displaced.length ? (
        <div className="empty-state">
          <div style={{ marginBottom: 8 }}>No other casual or catch-up bookings</div>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div style={{ marginBottom: 8 }}>No casual or catch-up bookings yet</div>
        </div>
      ) : (
        <>
          {confirmed.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Booked</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {confirmed.map(b => {
                  const d = b.occurrence_detail
                  const dateLabel = d?.date ? new Date(d.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'
                  const isCancelling = cancellingId === b.id
                  return (
                    <div key={b.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{d?.session_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
                          {dateLabel}
                          {d?.start_time ? ` · ${d.start_time.slice(0, 5)}` : ''}
                          {d?.studio_name ? ` · ${d.studio_name}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span className="tag tag-lime" style={{ fontSize: 10 }}>{b.enrolment_type === 'catchup' ? 'Catch-up' : 'Casual'}</span>
                        <button
                          className="btn btn-ghost btn-xs"
                          style={{ fontSize: 11, color: 'var(--red)' }}
                          onClick={() => cancel(b)}
                          disabled={isCancelling}
                        >
                          {isCancelling ? '…' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {waitlisted.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Waitlisted</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {waitlisted.map(b => {
                  const d = b.occurrence_detail
                  const dateLabel = d?.date ? new Date(d.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'
                  const hasOffer = !!b.waitlist_offered_at
                  const isCancelling = cancellingId === b.id
                  return (
                    <div key={b.id} style={{ background: 'var(--card)', border: `1px solid ${hasOffer ? 'var(--lime)' : 'var(--border)'}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{d?.session_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
                          {dateLabel}
                          {d?.start_time ? ` · ${d.start_time.slice(0, 5)}` : ''}
                          {d?.studio_name ? ` · ${d.studio_name}` : ''}
                        </div>
                        {hasOffer && <div style={{ fontSize: 11, color: 'var(--lime)', marginTop: 4 }}>🎉 A spot opened — claim it!</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span className="tag tag-amber" style={{ fontSize: 10 }}>Waitlist</span>
                        {!hasOffer && (
                          <button
                            className="btn btn-ghost btn-xs"
                            style={{ fontSize: 11, color: 'var(--red)' }}
                            onClick={() => cancel(b)}
                            disabled={isCancelling}
                          >
                            {isCancelling ? '…' : 'Leave'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 4 }}>
        <Link to="/portal/book">
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>+ Book a casual or catch-up</button>
        </Link>
      </div>
    </div>
  )
}

export default function StudentMyClasses() {
  const { user } = useAuth()
  const { data: enrolData, loading, refetch: refetchEnrol } = useApi(() => enrolmentsApi.list({ student: user?.id }), [user?.id])
  const { data: attData, refetch: refetchAtt } = useApi(() => attendance.list({ student: user?.id }), [user?.id])
  const { data: upcomingData, refetch: refetchUpcoming } = useApi(() => classesApi.occurrences({ student: user?.id, upcoming: true }), [user?.id])
  const { data: casualBookingsData, refetch: refetchCasual } = useApi(() => classesApi.casual.myBookings(), [])
  const { data: creditsData, refetch: refetchCredits } = useApi(() => user?.id ? attendanceApi.makeupCredits.list({ student: user.id, status: 'available' }) : null, [user?.id])
  const { data: studioSettings } = useApi(() => settingsApi.get(), [])

  const [markAwayOcc, setMarkAwayOcc] = useState(null)
  const [cancelAwayOcc, setCancelAwayOcc] = useState(null)
  const [topTab, setTopTab] = useState('active')
  const [activeSubTab, setActiveSubTab] = useState('enrolled')
  const [cancelPolicyEnrol, setCancelPolicyEnrol] = useState(null)
  const [classWaitlistLeaveEnrol, setClassWaitlistLeaveEnrol] = useState(null)
  const [displacementPopup, setDisplacementPopup] = useState(null)

  // Auto-show popup when a displacement offer is waiting
  useEffect(() => {
    const items = casualBookingsData?.results || casualBookingsData || []
    const displaced = items.find(b => b.status === 'confirmed' && b.displacement_offered_at)
    if (displaced) setDisplacementPopup(displaced)
  }, [casualBookingsData])

  const enrolments_ = enrolData?.results || enrolData || []
  const attHistory = attData?.results || attData || []
  const upcomingOccurrences = upcomingData?.results || upcomingData || []

  // Upcoming occurrences where student marked away
  const today = new Date().toISOString().slice(0, 10)
  const absentUpcoming = upcomingOccurrences.filter(occ =>
    occ.date >= today && attHistory.some(a => a.occurrence === occ.id && a.status === 'absent')
  )

  const active = enrolments_.filter(e => e.status === 'active')
  const pendingDisplacement = enrolments_.filter(e => e.status === 'pending_displacement')
  const waitlisted = enrolments_.filter(e => e.status === 'waitlisted')
  const seasonWaitlisted = waitlisted.filter(e => e.enrolment_type === 'course')
  const classWaitlisted = waitlisted.filter(e => e.enrolment_type !== 'course')
  const casual = enrolments_.filter(e => ['casual', 'catchup', 'catch_up'].includes(e.enrolment_type) || ['casual', 'catchup'].includes(e.status))
  const past = enrolments_.filter(e => ['completed', 'cancelled', 'expired'].includes(e.status))

  // Pricing summary
  const totalPrice = active.reduce((sum, e) => sum + (parseFloat(e.price || e.amount || 0)), 0)

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
              const res = await fetch(`${baseUrl}/api/enrolments/calendar.ics`, {
                headers: { Authorization: `Bearer ${token}` }
              })
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

      {/* View all upcoming link */}
      <div style={{ marginBottom: 16 }}>
        <Link to="/portal/upcoming-classes" style={{ fontSize: 13, color: 'var(--lav)', textDecoration: 'none', fontWeight: 600 }}>
          View all upcoming →
        </Link>
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
                  {/* Waitlist offer banners */}
                  {waitlisted.filter(e => e.waitlist_offered_at).map(e => (
                    <WaitlistOfferBanner key={e.id} enrolment={e} onClaimed={refetchEnrol} />
                  ))}

                  {/* Pending displacement banners */}
                  {pendingDisplacement.map(e => (
                    <PendingDisplacementBanner key={e.id} enrolment={e} />
                  ))}

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
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ fontSize: 11, color: 'var(--red)' }}
                                    onClick={() => setCancelPolicyEnrol(e)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                              {/* Upcoming occurrences — mark away / can make it */}
                              {(() => {
                                const cardOccs = e.upcoming_occurrences || []
                                if (!cardOccs.length) return null
                                return (
                                  <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Upcoming</div>
                                    {cardOccs.map(occ => {
                                      const isAway = occ.marked_away
                                      const dateStr = new Date(occ.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
                                      const timeStr = occ.start_time ? ` · ${occ.start_time.slice(0, 5)}` : ''
                                      const occWithSession = { ...occ, session_detail: e.class_session_detail }
                                      return (
                                        <div key={occ.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                          <div style={{ fontSize: 12, color: isAway ? 'var(--amber)' : 'var(--grey)' }}>
                                            {dateStr}{timeStr}
                                            {isAway && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--amber)', fontWeight: 600 }}>AWAY</span>}
                                          </div>
                                          {isAway ? (
                                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, color: 'var(--lime)', borderColor: 'rgba(204,255,0,0.3)', flexShrink: 0 }} onClick={() => setCancelAwayOcc(occWithSession)}>
                                              I can make it!
                                            </button>
                                          ) : (
                                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, flexShrink: 0 }} onClick={() => setMarkAwayOcc(occWithSession)}>
                                              Mark away
                                            </button>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )
                              })()}
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

                  {/* Season Waitlist */}
                  {seasonWaitlisted.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--lav)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Season Waitlist</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {seasonWaitlisted.map(e => {
                          const s = e.class_session_detail
                          return (
                            <div key={e.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{s?.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--grey)' }}>{DAYS[s?.day_of_week]} · {s?.studio_detail?.name}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                {e.waitlist_position != null && (
                                  <span className="tag tag-lav" style={{ fontSize: 10 }}>#{e.waitlist_position}</span>
                                )}
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ fontSize: 11, color: 'var(--red)' }}
                                  onClick={() => setCancelPolicyEnrol({ ...e, _isWaitlist: true })}
                                >
                                  Leave
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Class Waitlist */}
                  {classWaitlisted.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Class Waitlist</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {classWaitlisted.map(e => {
                          const s = e.class_session_detail
                          return (
                            <div key={e.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{s?.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--grey)' }}>{DAYS[s?.day_of_week]} · {s?.studio_detail?.name}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                {e.waitlist_position != null && (
                                  <span className="tag tag-grey" style={{ fontSize: 10 }}>#{e.waitlist_position}</span>
                                )}
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ fontSize: 11, color: 'var(--red)' }}
                                  onClick={() => setClassWaitlistLeaveEnrol(e)}
                                >
                                  Leave
                                </button>
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
                <CasualBookingsTab bookings={casualBookingsData} credits={creditsData} refetch={() => { refetchCasual(); refetchEnrol(); refetchCredits() }} />
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
          cancellationWindowHours={studioSettings?.cancellation_window_hours ?? 24}
          noShowFee={studioSettings?.no_show_fee ?? 20}
          onClose={() => setMarkAwayOcc(null)}
          onDone={() => {
            setMarkAwayOcc(null)
            refetchAtt()
            refetchEnrol()
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

      {cancelPolicyEnrol && (
        <CancelPolicyModal
          enrolment={cancelPolicyEnrol}
          isWaitlist={!!cancelPolicyEnrol._isWaitlist}
          onClose={() => setCancelPolicyEnrol(null)}
          onDone={() => {
            setCancelPolicyEnrol(null)
            refetchEnrol()
          }}
        />
      )}

      {classWaitlistLeaveEnrol && (
        <ClassWaitlistLeaveModal
          enrolment={classWaitlistLeaveEnrol}
          onClose={() => setClassWaitlistLeaveEnrol(null)}
          onDone={() => {
            setClassWaitlistLeaveEnrol(null)
            refetchEnrol()
          }}
        />
      )}

      {displacementPopup && (
        <DisplacementPopupModal
          booking={displacementPopup}
          onClose={() => setDisplacementPopup(null)}
          onAction={() => {
            setDisplacementPopup(null)
            refetchCasual()
            refetchEnrol()
          }}
        />
      )}
    </div>
  )
}
