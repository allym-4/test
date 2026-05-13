import { useState } from 'react'
import { payments } from '../api'
import '../pages/StudentsPage.css'

const CHARGE_TYPES = [
  { value: 'season_fee',           label: 'Season Fee',             description: 'Season fee' },
  { value: 'no_show_fee',          label: 'No-show Fee',            description: 'No-show fee' },
  { value: 'late_cancellation',    label: 'Late Cancellation Fee',  description: 'Late cancellation fee' },
  { value: 'workshop_fee',         label: 'Workshop Fee',           description: 'Workshop fee' },
  { value: 'other',                label: 'Other',                  description: '' },
]

export default function AddChargeModal({ student, onClose, onSuccess }) {
  const [form, setForm] = useState({
    charge_type: 'season_fee',
    amount: '',
    description: 'Season fee',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleTypeChange(value) {
    const found = CHARGE_TYPES.find(t => t.value === value)
    setForm(f => ({
      ...f,
      charge_type: value,
      description: found?.description || '',
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await payments.create({
        student: student.id,
        payment_type: 'charge',
        amount: parseFloat(form.amount),
        description: form.description || form.notes,
      })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to add charge')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 480 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>Add Charge</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit}>

          {/* Student info strip */}
          <div style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{student.first_name} {student.last_name}</div>
            <div style={{ fontSize: 12, color: 'var(--grey)' }}>{student.email}</div>
          </div>

          {error && (
            <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>
              {error}
            </div>
          )}

          <div className="field">
            <label>Charge Type</label>
            <select value={form.charge_type} onChange={e => handleTypeChange(e.target.value)}>
              {CHARGE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

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
            <label>Description</label>
            <input
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Description for this charge"
            />
          </div>

          <div className="field">
            <label>Notes</label>
            <input
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any additional notes (optional)"
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-sm" style={{ background: 'var(--amber)', color: '#000' }} disabled={saving}>
              {saving ? 'Saving…' : 'Add Charge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
