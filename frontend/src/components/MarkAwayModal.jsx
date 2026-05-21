import { useState } from 'react'
import { attendance } from '../api'

export default function MarkAwayModal({ occurrence, cancellationWindowHours, noShowFee, onClose, onDone }) {
  const [confirming, setConfirming] = useState(false)

  const startTime = occurrence.session_detail?.start_time || occurrence.start_time || '00:00'
  const occDate = new Date(occurrence.date + 'T' + startTime)
  const hoursUntil = (occDate - new Date()) / (1000 * 60 * 60)
  const windowHours = cancellationWindowHours || 4
  const isLate = hoursUntil > 0 && hoursUntil < windowHours
  const feeAmount = noShowFee ? `$${parseFloat(noShowFee).toFixed(0)}` : '$20'

  const sessionName = occurrence.session_detail?.name || occurrence.session_name
  const dateLabel = new Date(occurrence.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeLabel = startTime !== '00:00' ? startTime.slice(0, 5) : ''

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
