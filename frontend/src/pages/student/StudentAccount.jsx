import { useState, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { auth, giftCards as giftCardsApi } from '../../api'

export default function StudentAccount() {
  const { user, setUser } = useAuth()
  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [pronouns, setPronouns] = useState(user?.pronouns || '')
  const [ecName, setEcName] = useState(user?.emergency_contact_name || '')
  const [ecPhone, setEcPhone] = useState(user?.emergency_contact_phone || '')
  const [saved, setSaved] = useState(false)
  const [photoPreview, setPhotoPreview] = useState(user?.profile_photo || null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileRef = useRef()

  // New profile fields
  const [preferredName, setPreferredName] = useState(user?.preferred_name || '')
  const [address, setAddress] = useState(user?.address || '')
  const [dob, setDob] = useState(user?.date_of_birth || '')
  const [experienceLevel, setExperienceLevel] = useState(user?.experience_level || '')
  const [referralSource, setReferralSource] = useState(user?.referral_source || '')
  const [medicalNotes, setMedicalNotes] = useState(user?.medical_notes || '')
  const [photoConsent, setPhotoConsent] = useState(user?.photo_consent || false)

  // Notification preferences
  const prefs = user?.notification_preferences || {}
  const [classReminders, setClassReminders] = useState(prefs.class_reminders ?? true)
  const [waitlistAlerts, setWaitlistAlerts] = useState(prefs.waitlist_alerts ?? true)
  const [studioUpdates, setStudioUpdates] = useState(prefs.studio_updates ?? false)
  const [homework, setHomework] = useState(prefs.homework ?? true)
  const [notifSaved, setNotifSaved] = useState(false)

  // Gift card modal
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [giftCode, setGiftCode] = useState('')
  const [giftMsg, setGiftMsg] = useState('')

  // Referral code
  const referralCode = user?.referral_code || `SHARE${user?.id || ''}`
  const [codeCopied, setCodeCopied] = useState(false)

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
        preferred_name: preferredName,
        address,
        date_of_birth: dob || null,
        experience_level: experienceLevel,
        referral_source: referralSource,
        medical_notes: medicalNotes,
        photo_consent: photoConsent,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      alert('Failed to save. Please try again.')
    }
  }

  async function handleNotifToggle(key, value) {
    const updated = {
      class_reminders: classReminders,
      waitlist_alerts: waitlistAlerts,
      studio_updates: studioUpdates,
      homework,
      [key]: value,
    }
    // Update local state
    if (key === 'class_reminders') setClassReminders(value)
    if (key === 'waitlist_alerts') setWaitlistAlerts(value)
    if (key === 'studio_updates') setStudioUpdates(value)
    if (key === 'homework') setHomework(value)
    try {
      await auth.updateMe({ notification_preferences: updated })
      setNotifSaved(true)
      setTimeout(() => setNotifSaved(false), 2000)
    } catch {
      // revert on error
      if (key === 'class_reminders') setClassReminders(!value)
      if (key === 'waitlist_alerts') setWaitlistAlerts(!value)
      if (key === 'studio_updates') setStudioUpdates(!value)
      if (key === 'homework') setHomework(!value)
    }
  }

  function Toggle({ value, onChange }) {
    return (
      <div
        onClick={() => onChange(!value)}
        style={{ width: 36, height: 20, borderRadius: 10, background: value ? 'var(--lime)' : '#333', flexShrink: 0, cursor: 'pointer', position: 'relative' }}
      >
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, transition: 'left 0.15s', left: value ? 19 : 3 }} />
      </div>
    )
  }

  const notifRows = [
    { label: 'Class reminders', desc: 'Get notified 24hrs before each class', key: 'class_reminders', value: classReminders },
    { label: 'Waitlist alerts', desc: 'Notified when a spot opens for you', key: 'waitlist_alerts', value: waitlistAlerts },
    { label: 'Studio updates', desc: 'News and updates from the studio', key: 'studio_updates', value: studioUpdates },
    { label: 'Homework', desc: 'Notified when new homework is assigned', key: 'homework', value: homework },
  ]

  const waiverSigned = user?.waiver_signed || user?.forms_completed?.includes('waiver')

  async function handleRedeemGiftCard() {
    if (!giftCode.trim()) return
    try {
      const res = await giftCardsApi.redeem(giftCode.trim().toUpperCase())
      setGiftMsg(res.data?.detail || 'Gift card redeemed successfully!')
      setGiftCode('')
    } catch (err) {
      setGiftMsg(err.response?.data?.detail || 'Could not redeem gift card. Please check the code and try again.')
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
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
              ) : (
                <div className="avatar" style={{ width: 64, height: 64, fontSize: 24, background: 'var(--lav)' }}>
                  {user?.first_name?.[0] || '?'}
                </div>
              )}
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: '50%', background: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#000' }}>
                {uploadingPhoto ? '…' : '+'}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            </div>
            <div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>{user?.display_name}</div>
              <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>Student</div>
              <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>Click photo to update</div>
            </div>
          </div>

          <form onSubmit={handleSave}>
            {[
              ['First name', firstName, setFirstName, 'text'],
              ['Last name', lastName, setLastName, 'text'],
              ['Preferred name', preferredName, setPreferredName, 'text'],
              ['Pronouns', pronouns, setPronouns, 'text'],
              ['Phone', phone, setPhone, 'tel'],
              ['Address', address, setAddress, 'text'],
            ].map(([label, val, setter, type]) => (
              <div key={label} className="field">
                <label>{label}</label>
                <input type={type} value={val} onChange={e => setter(e.target.value)} />
              </div>
            ))}

            <div className="field">
              <label>Date of birth</label>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} />
            </div>

            <div className="field">
              <label>Experience level</label>
              <select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}>
                <option value="">Select…</option>
                <option value="beginner">Beginner</option>
                <option value="some_experience">Some experience</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="field">
              <label>How did you hear about us?</label>
              <select value={referralSource} onChange={e => setReferralSource(e.target.value)}>
                <option value="">Select…</option>
                <option value="instagram">Instagram</option>
                <option value="google">Google</option>
                <option value="friend_referral">Friend referral</option>
                <option value="walk_in">Walk-in</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="field">
              <label>Medical / injury notes</label>
              <textarea
                value={medicalNotes}
                onChange={e => setMedicalNotes(e.target.value)}
                rows={3}
                placeholder="Any injuries or medical conditions we should know about…"
                style={{ width: '100%', background: 'var(--input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '9px 12px', fontSize: 13, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
              <input
                type="checkbox"
                id="photoConsent"
                checked={photoConsent}
                onChange={e => setPhotoConsent(e.target.checked)}
                style={{ marginTop: 2, accentColor: 'var(--lime)' }}
              />
              <label htmlFor="photoConsent" style={{ fontSize: 13, cursor: 'pointer', lineHeight: 1.4 }}>
                I consent to photos/videos being taken for studio use
              </label>
            </div>

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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', fontWeight: 500 }}>Notifications</div>
            {notifSaved && <span style={{ fontSize: 11, color: 'var(--lime)' }}>Saved</span>}
          </div>
          {notifRows.map(({ label, desc, key, value }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid #1a1a1a' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{desc}</div>
              </div>
              <Toggle value={value} onChange={v => handleNotifToggle(key, v)} />
            </div>
          ))}

          <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

          {/* Waiver & Terms */}
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 16, fontWeight: 500 }}>Waiver &amp; Terms</div>
          <div className="card" style={{ marginBottom: 4 }}>
            {waiverSigned ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--lime)', fontSize: 16 }}>✓</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Waiver accepted</div>
                  {user?.waiver_signed_at && (
                    <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>
                      Signed {new Date(user.waiver_signed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>
                <span className="tag tag-lime" style={{ fontSize: 10 }}>Active</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--amber)', fontSize: 16 }}>⚠</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Waiver required</div>
                  <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>Please sign before attending classes</div>
                </div>
                <a href="/portal/forms" style={{ fontSize: 12, color: 'var(--lime)', textDecoration: 'none', whiteSpace: 'nowrap' }}>Sign now →</a>
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

          {/* Refer a Friend */}
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 16, fontWeight: 500 }}>Refer a Friend</div>
          <div className="card" style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 8 }}>Your referral code</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, letterSpacing: 2, color: 'var(--lime)' }}>{referralCode}</div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  navigator.clipboard.writeText(referralCode)
                  setCodeCopied(true)
                  setTimeout(() => setCodeCopied(false), 2000)
                }}
              >
                {codeCopied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20 }}>0</div>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>Referrals</div>
              </div>
              <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20 }}>$0</div>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>Credits Earned</div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

          {/* Gift Cards */}
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 16, fontWeight: 500 }}>Gift Cards</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a href="/portal/billing" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>Buy a Gift Card</a>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowGiftModal(true)}>Redeem a code</button>
          </div>

          {showGiftModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={e => { if (e.target === e.currentTarget) { setShowGiftModal(false); setGiftCode(''); setGiftMsg('') } }}>
              <div className="card" style={{ width: 340, padding: 24 }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 16 }}>Redeem Gift Card</div>
                <div className="field">
                  <label>Gift card code</label>
                  <input type="text" value={giftCode} onChange={e => setGiftCode(e.target.value)} placeholder="Enter code…" />
                </div>
                {giftMsg && <div style={{ fontSize: 12, color: giftMsg.includes('redeemed') ? 'var(--lime)' : 'var(--red)', marginBottom: 12 }}>{giftMsg}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-lime btn-sm" onClick={handleRedeemGiftCard}>Redeem</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowGiftModal(false); setGiftCode(''); setGiftMsg('') }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 16, fontWeight: 500 }}>Password</div>
          <button className="btn btn-ghost btn-sm">Change password</button>
        </div>
      </div>
    </div>
  )
}
