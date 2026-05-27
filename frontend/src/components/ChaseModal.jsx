import { useState, useEffect } from 'react'
import { payments, users } from '../api'
import '../pages/StudentsPage.css'

function buildFriendlyReminder(name, amount) {
  return `Hi ${name}, just a friendly reminder that you have an outstanding balance of $${parseFloat(amount).toFixed(2)} with Duality Pole Studio. When you get a chance, could you please arrange payment? Feel free to reply if you have any questions. Thanks!`
}

function buildOverdueReminder(name, amount) {
  return `Hi ${name}, your outstanding balance of $${parseFloat(amount).toFixed(2)} is now overdue. Please arrange payment at your earliest convenience. If you're having any difficulties, don't hesitate to reach out and we can work something out. Thanks!`
}

export default function ChaseModal({ student, amount, description, onClose, onSuccess }) {
  const name = student.first_name
  const [message, setMessage] = useState(buildFriendlyReminder(name, amount))
  const [saving, setSaving] = useState(false)
  const [sendingPopup, setSendingPopup] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)
  const [popupSent, setPopupSent] = useState(false)
  const [chaseHistory, setChaseHistory] = useState([])

  useEffect(() => {
    payments.chases({ student_id: student.id }).then(r => setChaseHistory(r.data || [])).catch(() => {})
  }, [student.id])

  async function handleSendReminder() {
    setSaving(true)
    setError(null)
    try {
      await payments.sendChase({ student_id: student.id, message })
      setChaseHistory(h => [...h, { step: h.length + 1, sent_at: new Date().toISOString() }])
      setSent(true)
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to send chase')
    } finally {
      setSaving(false)
    }
  }

  async function handleSendPopup() {
    setSendingPopup(true)
    setError(null)
    try {
      await users.bulkNotify({
        target: 'specific',
        user_ids: [student.id],
        title: 'Outstanding balance on your account',
        body: `You have an outstanding balance of $${parseFloat(amount).toFixed(2)}. Please action this before your next booking.`,
        show_as_modal: true,
        action_label: 'View Payments',
        action_url: '/my-account/payments',
      })
      setPopupSent(true)
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to send popup')
    } finally {
      setSendingPopup(false)
    }
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

  const chaseCount = chaseHistory.length

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 540 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>
            Chase Payment
            {chaseCount > 0 && (
              <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 400, color: 'var(--amber)', background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 20, padding: '2px 8px' }}>
                {chaseCount} chase{chaseCount !== 1 ? 's' : ''} sent
              </span>
            )}
          </div>
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

          {/* Send popup to account */}
          <div style={{ background: 'rgba(204,255,0,0.05)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Send popup to account</div>
                <div style={{ fontSize: 12, color: 'var(--grey)' }}>Student must dismiss and respond before continuing. They can request extension, bank transfer, or cash payment.</div>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                style={{ flexShrink: 0, background: popupSent ? 'rgba(204,255,0,0.12)' : 'rgba(204,255,0,0.08)', color: 'var(--lime)', border: '1px solid rgba(204,255,0,0.25)' }}
                onClick={handleSendPopup}
                disabled={sendingPopup || popupSent}
              >
                {popupSent ? 'Popup sent ✓' : sendingPopup ? 'Sending…' : 'Send Popup'}
              </button>
            </div>
          </div>

          {/* Quick template buttons */}
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 8, fontWeight: 600 }}>
            Chase Email
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-xs" style={{ background: 'rgba(176,160,255,0.12)', color: 'var(--lav)', border: '1px solid rgba(176,160,255,0.25)' }}
              onClick={() => setMessage(buildFriendlyReminder(name, amount))}>
              Friendly reminder
            </button>
            <button type="button" className="btn btn-xs" style={{ background: 'rgba(255,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(255,68,68,0.25)' }}
              onClick={() => setMessage(buildOverdueReminder(name, amount))}>
              Overdue notice
            </button>
          </div>

          {sent && (
            <div style={{ background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--lime)', marginBottom: 14 }}>
              Chase sent! Email and in-app notification delivered.
            </div>
          )}

          <div className="field">
            <label>Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-sm" style={{ background: 'rgba(176,160,255,0.15)', color: 'var(--lav)', border: '1px solid rgba(176,160,255,0.3)' }}
              onClick={handleMarkPaid} disabled={saving}>
              {saving ? 'Saving…' : 'Mark as Paid'}
            </button>
            <button type="button" className="btn btn-lime btn-sm" onClick={handleSendReminder} disabled={sent || saving}>
              {sent ? 'Sent ✓' : 'Send Chase'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
