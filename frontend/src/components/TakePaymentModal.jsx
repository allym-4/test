import { useState } from 'react'
import { payments } from '../api'
import '../pages/StudentsPage.css'

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash',          label: 'Cash' },
  { value: 'card',          label: 'Card' },
  { value: 'other',         label: 'Other' },
]

export default function TakePaymentModal({ student, onClose, onSuccess }) {
  const [form, setForm] = useState({
    amount: '',
    method: 'bank_transfer',
    description: 'Payment received',
    reference: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await payments.create({
        student: student.id,
        payment_type: 'payment',
        amount: parseFloat(form.amount),
        description: form.description || 'Payment received',
        reference: form.reference,
      })
      setDone(true)
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="sd-modal" style={{ maxWidth: 440 }}>
          <div className="sd-header">
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>Payment Recorded</div>
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="sd-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <div style={{ color: 'var(--lime)', fontSize: 20, fontFamily: "'Archivo Black', sans-serif", marginBottom: 8 }}>
              ${parseFloat(form.amount).toFixed(2)} received
            </div>
            <div style={{ color: 'var(--grey)', fontSize: 14, marginBottom: 24 }}>
              Payment recorded for {student.first_name} {student.last_name}
            </div>
            <button className="btn btn-lime btn-sm" onClick={() => { onSuccess(); onClose() }}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 480 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>Take Payment</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit}>

          {/* Student info strip */}
          <div style={{ background: 'rgba(176,160,255,0.08)', border: '1px solid rgba(176,160,255,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{student.first_name} {student.last_name}</div>
              <div style={{ fontSize: 12, color: 'var(--grey)' }}>{student.email}</div>
            </div>
            {student.balance !== undefined && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Balance</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: student.balance < 0 ? 'var(--red)' : 'var(--lime)' }}>
                  ${Math.abs(student.balance ?? 0).toFixed(2)}
                  {student.balance < 0 ? ' owing' : ' credit'}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>
              {error}
            </div>
          )}

          <div className="field">
            <label>Amount *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              placeholder="0.00"
              required
              autoFocus
            />
          </div>

          <div className="field">
            <label>Payment Method</label>
            <select value={form.method} onChange={e => set('method', e.target.value)}>
              {PAYMENT_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Description</label>
            <input
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Payment received"
            />
          </div>

          <div className="field">
            <label>Reference / Notes</label>
            <input
              value={form.reference}
              onChange={e => set('reference', e.target.value)}
              placeholder="Transaction ID, receipt number, etc."
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>
              {saving ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
