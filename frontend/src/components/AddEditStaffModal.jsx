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
    pay_rate: staff?.pay_rate || '',
    instructor_tagline: staff?.instructor_tagline || '',
    bio: staff?.bio || '',
    instructor_instagram: staff?.instructor_instagram || '',
    perm_billing: staff?.perm_billing || false,
    perm_edit_profiles: staff?.perm_edit_profiles || false,
    perm_approve_plans: staff?.perm_approve_plans || false,
    perm_bulk_email: staff?.perm_bulk_email || false,
    perm_reports: staff?.perm_reports || false,
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
          <div className="field">
            <label>Pay Rate ($/class)</label>
            <input type="number" step="0.01" min="0" value={form.pay_rate} onChange={e => set('pay_rate', e.target.value)} placeholder="e.g. 45.00" />
          </div>

          {form.role === 'instructor' && (
            <div style={{ background: 'rgba(204,255,0,0.04)', border: '1px solid rgba(204,255,0,0.12)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--lime)', fontWeight: 600, marginBottom: 10 }}>Public Profile</div>
              <div className="field">
                <label>Tagline</label>
                <input value={form.instructor_tagline} onChange={e => set('instructor_tagline', e.target.value)} placeholder="e.g. Co-Founder & Head of Mischief" maxLength={200} />
              </div>
              <div className="field">
                <label>Bio</label>
                <textarea value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Public bio shown on the Team page…" rows={4} style={{ resize: 'vertical' }} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Instagram Handle</label>
                <input value={form.instructor_instagram} onChange={e => set('instructor_instagram', e.target.value)} placeholder="dualitypole (without @)" maxLength={100} />
              </div>
            </div>
          )}

          {form.role === 'instructor' && (
            <div style={{ background: 'rgba(176,160,255,0.06)', border: '1px solid rgba(176,160,255,0.15)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--lav)', fontWeight: 600, marginBottom: 10 }}>Extra Permissions</div>
              {[
                ['perm_billing', 'Billing & payments'],
                ['perm_edit_profiles', 'Edit student profiles'],
                ['perm_approve_plans', 'Approve payment plans'],
                ['perm_bulk_email', 'Send bulk emails'],
                ['perm_reports', 'View reports'],
              ].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 6 }}>
                  <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          )}

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
