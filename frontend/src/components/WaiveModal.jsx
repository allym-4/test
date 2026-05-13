import { useState } from 'react'
import { payments } from '../api'
import '../pages/StudentsPage.css'

const WAIVE_REASONS = [
  { value: 'financial_hardship', label: 'Financial hardship' },
  { value: 'error_mistake',      label: 'Error / mistake' },
  { value: 'goodwill_gesture',   label: 'Goodwill gesture' },
  { value: 'other',              label: 'Other' },
]

export default function WaiveModal({ student, amount, description, onClose, onSuccess }) {
  const [form, setForm] = useState({
    reason: 'financial_hardship',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleConfirm(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await payments.create({
        student: student.id,
        payment_type: 'credit',
        amount: parseFloat(amount),
        description: 'Waived: ' + description,
      })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to waive charge')
    } finally {
      setSaving(false)
    }
  }

  const reasonLabel = WAIVE_REASONS.find(r => r.value === form.reason)?.label ?? form.reason

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 460 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>Waive Charge</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleConfirm}>

          {/* What's being waived */}
          <div style={{ background: 'rgba(176,160,255,0.08)', border: '1px solid rgba(176,160,255,0.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 18 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--grey)', marginBottom: 6 }}>Waiving</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{student.first_name} {student.last_name}</div>
                <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 2 }}>{description}</div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--lav)' }}>
                ${parseFloat(amount).toFixed(2)}
              </div>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>
              {error}
            </div>
          )}

          <div className="field">
            <label>Reason *</label>
            <select value={form.reason} onChange={e => set('reason', e.target.value)} required>
              {WAIVE_REASONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Any additional context for the record…"
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Confirmation callout */}
          <div style={{ background: 'rgba(204,255,0,0.05)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--grey)', marginBottom: 16 }}>
            This will post a <span style={{ color: 'var(--lime)' }}>credit of ${parseFloat(amount).toFixed(2)}</span> to {student.first_name}&apos;s account
            with the note &quot;Waived: {description}&quot; and reason: <em>{reasonLabel}</em>.
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>
              {saving ? 'Saving…' : 'Confirm Waiver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
