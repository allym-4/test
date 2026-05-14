import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { auth } from '../../api'

export default function StudentAccount() {
  const { user } = useAuth()
  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [pronouns, setPronouns] = useState(user?.pronouns || '')
  const [ecName, setEcName] = useState(user?.emergency_contact_name || '')
  const [ecPhone, setEcPhone] = useState(user?.emergency_contact_phone || '')
  const [saved, setSaved] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    try {
      await auth.updateMe({
        first_name: firstName,
        last_name: lastName,
        phone,
        pronouns,
        emergency_contact_name: ecName,
        emergency_contact_phone: ecPhone,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      alert('Failed to save. Please try again.')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Account</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 820 }}>
        {/* Left column */}
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 16, fontWeight: 500 }}>Profile</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div className="avatar" style={{ width: 64, height: 64, fontSize: 24, background: 'var(--lav)' }}>
              {user?.first_name?.[0] || '?'}
            </div>
            <div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>{user?.display_name}</div>
              <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>Student</div>
            </div>
          </div>

          <form onSubmit={handleSave}>
            {[
              ['First name', firstName, setFirstName, 'text'],
              ['Last name', lastName, setLastName, 'text'],
              ['Pronouns', pronouns, setPronouns, 'text'],
              ['Phone', phone, setPhone, 'tel'],
            ].map(([label, val, setter, type]) => (
              <div key={label} className="field">
                <label>{label}</label>
                <input type={type} value={val} onChange={e => setter(e.target.value)} />
              </div>
            ))}

            <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 16, fontWeight: 500 }}>Emergency Contact</div>

            <div className="field">
              <label>Contact name</label>
              <input type="text" value={ecName} onChange={e => setEcName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="field">
              <label>Contact phone</label>
              <input type="tel" value={ecPhone} onChange={e => setEcPhone(e.target.value)} placeholder="Phone number" />
            </div>

            <button type="submit" className={`btn btn-sm ${saved ? 'btn-ghost' : 'btn-lime'}`} style={{ marginTop: 8 }}>
              {saved ? '✓ Saved' : 'Save changes'}
            </button>
          </form>
        </div>

        {/* Right column */}
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 16, fontWeight: 500 }}>Account Details</div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 8 }}>Email</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{user?.email || '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>Contact your studio to change your email address</div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 16, fontWeight: 500 }}>Notifications</div>
          {[
            ['Class reminders', 'Get notified 24hrs before each class', true],
            ['Homework updates', 'Notified when new homework is assigned', true],
            ['Billing alerts', 'Payment receipts and balance reminders', true],
            ['Studio announcements', 'News and updates from the studio', false],
          ].map(([label, desc, defaultOn]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid #1a1a1a' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{desc}</div>
              </div>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: defaultOn ? 'var(--lime)' : '#333', flexShrink: 0, cursor: 'pointer', position: 'relative' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, transition: 'left 0.15s', left: defaultOn ? 19 : 3 }} />
              </div>
            </div>
          ))}

          <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 16, fontWeight: 500 }}>Password</div>
          <button className="btn btn-ghost btn-sm">Change password</button>
        </div>
      </div>
    </div>
  )
}
