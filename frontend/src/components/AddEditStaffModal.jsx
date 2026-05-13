import { useState } from 'react'
import client from '../api/client'
import '../pages/StudentsPage.css'

export default function AddEditStaffModal({ staff, onClose, onSaved }) {
  const isEdit = !!staff
  const [form, setForm] = useState({
    first_name: staff?.first_name || '',
    last_name: staff?.last_name || '',
    email: staff?.email || '',
    phone: staff?.phone || '',
    pronouns: staff?.pronouns || '',
    role: staff?.role || 'instructor',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      let res
      if (isEdit) {
        res = await client.patch(`/api/users/${staff.id}/`, form)
      } else {
        const username = (form.first_name + form.last_name).toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 999)
        res = await client.post('/api/users/', { ...form, username, password: 'Welcome1!' })
      }
      onSaved(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 480 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>{isEdit ? 'Edit Staff' : 'Add Staff Member'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit}>
          {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>First Name *</label><input value={form.first_name} onChange={e => set('first_name', e.target.value)} required autoFocus /></div>
            <div className="field"><label>Last Name *</label><input value={form.last_name} onChange={e => set('last_name', e.target.value)} required /></div>
          </div>
          <div className="field"><label>Email *</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} required /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Phone</label><input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
            <div className="field"><label>Pronouns</label><input value={form.pronouns} onChange={e => set('pronouns', e.target.value)} placeholder="she/her" /></div>
          </div>
          <div className="field">
            <label>Role</label>
            <select value={form.role} onChange={e => set('role', e.target.value)}>
              <option value="instructor">Instructor</option>
              <option value="admin">Admin / Founder</option>
            </select>
          </div>

          {!isEdit && (
            <div style={{ background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--grey)', marginBottom: 12 }}>
              Temporary password: <b style={{ color: 'var(--white)' }}>Welcome1!</b> — ask them to change it on first login.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={loading}>{loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Staff Member'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
