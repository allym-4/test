import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { auth } from '../api'

export default function InstructorProfile() {
  const { user, setUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [photoPreview, setPhotoPreview] = useState(user?.profile_photo || null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileRef = useRef()
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    pronouns: user?.pronouns || '',
  })

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
    setUploadingPhoto(true)
    try {
      const res = await auth.uploadPhoto(file)
      if (setUser) setUser(u => ({ ...u, profile_photo: res.data.profile_photo }))
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await auth.updateMe(form)
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  function Field({ label, field, type = 'text' }) {
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', marginBottom: 6 }}>{label}</div>
        {editing ? (
          <input
            className="input"
            type={type}
            value={form[field]}
            onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
            style={{ width: '100%', maxWidth: 360 }}
          />
        ) : (
          <div style={{ fontSize: 14, color: form[field] ? 'inherit' : 'var(--grey)' }}>
            {form[field] || '—'}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>My Profile</div>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>Personal details, qualifications and preferences</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
          {photoPreview ? (
            <img src={photoPreview} alt="Profile" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
          ) : (
            <div className="avatar" style={{ background: 'var(--lav)', width: 56, height: 56, fontSize: 20 }}>
              {user?.first_name?.[0] || '?'}
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: '50%', background: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#000' }}>
            {uploadingPhoto ? '…' : '+'}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
        </div>
        <div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>{user?.display_name}</div>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 2 }}>Senior Instructor</div>
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>Click photo to update</div>
        </div>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 18 }}>Personal Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <Field label="First Name" field="first_name" />
          <Field label="Last Name" field="last_name" />
          <Field label="Email" field="email" type="email" />
          <Field label="Phone" field="phone" />
          <Field label="Pronouns" field="pronouns" />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {editing ? (
            <>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            </>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
          )}
          {saved && <span style={{ fontSize: 12, color: 'var(--lime)', alignSelf: 'center' }}>✓ Saved</span>}
        </div>
      </div>
    </div>
  )
}
