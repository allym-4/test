import { useState } from 'react'
import { users } from '../api'

export default function AddStudentModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    pronouns: '', date_of_birth: '',
    emergency_contact_name: '', emergency_contact_phone: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const username = (form.first_name + form.last_name).toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 999)
      const { data } = await users.create({
        ...form,
        username,
        password: 'Welcome1!',
        role: 'student',
        date_of_birth: form.date_of_birth || null,
      })
      onCreated(data)
      onClose()
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to create student')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 520 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>Add Student</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit}>
          {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>First Name *</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} required autoFocus />
            </div>
            <div className="field">
              <label>Last Name *</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} required />
            </div>
          </div>

          <div className="field">
            <label>Email *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Phone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="field">
              <label>Pronouns</label>
              <input value={form.pronouns} onChange={e => set('pronouns', e.target.value)} placeholder="she/her" />
            </div>
          </div>

          <div className="field">
            <label>Date of Birth</label>
            <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
          </div>

          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', margin: '14px 0 10px', fontWeight: 600 }}>Emergency Contact</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Name</label>
              <input value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input type="tel" value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} />
            </div>
          </div>

          <div style={{ background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--grey)', marginBottom: 16 }}>
            A temporary password of <b style={{ color: 'var(--white)' }}>Welcome1!</b> will be set. The student should change it on first login.
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>
              {saving ? 'Creating…' : 'Create Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
