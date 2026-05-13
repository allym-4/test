import { useState } from 'react'
import { payments } from '../api'
import '../pages/StudentsPage.css'

function buildFriendlyReminder(name, amount) {
  return `Hi ${name}, just a friendly reminder that you have an outstanding balance of $${parseFloat(amount).toFixed(2)} with Duality Pole Studio. When you get a chance, could you please arrange payment? Feel free to reply if you have any questions. Thanks!`
}

function buildOverdueReminder(name, amount, description) {
  return `Hi ${name}, your ${description} of $${parseFloat(amount).toFixed(2)} is now overdue. Please arrange payment at your earliest convenience. If you're having any difficulties, don't hesitate to reach out and we can work something out. Thanks!`
}

export default function ChaseModal({ student, amount, description, onClose, onSuccess }) {
  const name = student.first_name

  const [message, setMessage] = useState(buildFriendlyReminder(name, amount))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  async function handleSendReminder() {
    // Email not wired to backend yet — just surface a success toast
    setSent(true)
    setTimeout(() => {
      onSuccess()
      onClose()
    }, 1500)
  }

  async function handleMarkPaid() {
    setSaving(true)
    setError(null)
    try {
      await payments.create({
        student: student.id,
        payment_type: 'payment',
        amount: parseFloat(amount),
        description: 'Payment received — ' + description,
      })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 520 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>Chase Payment</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">

          {/* Outstanding amount banner */}
          <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: 8, padding: '12px 16px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{student.first_name} {student.last_name}</div>
              <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{description}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Outstanding</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--red)' }}>${parseFloat(amount).toFixed(2)}</div>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>
              {error}
            </div>
          )}

          {sent && (
            <div style={{ background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--lime)', marginBottom: 14 }}>
              Reminder queued — email sending will be available soon.
            </div>
          )}

          {/* Quick template buttons */}
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 8, fontWeight: 600 }}>
            Quick Templates
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-xs"
              style={{ background: 'rgba(176,160,255,0.12)', color: 'var(--lav)', border: '1px solid rgba(176,160,255,0.25)' }}
              onClick={() => setMessage(buildFriendlyReminder(name, amount))}
            >
              Friendly reminder
            </button>
            <button
              type="button"
              className="btn btn-xs"
              style={{ background: 'rgba(255,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(255,68,68,0.25)' }}
              onClick={() => setMessage(buildOverdueReminder(name, amount, description))}
            >
              Overdue notice
            </button>
          </div>

          <div className="field">
            <label>Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: 'rgba(176,160,255,0.15)', color: 'var(--lav)', border: '1px solid rgba(176,160,255,0.3)' }}
              onClick={handleMarkPaid}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Mark as Paid'}
            </button>
            <button
              type="button"
              className="btn btn-lime btn-sm"
              onClick={handleSendReminder}
              disabled={sent || saving}
            >
              {sent ? 'Sent!' : 'Send Reminder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
