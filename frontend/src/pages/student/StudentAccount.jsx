import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { auth, giftCards as giftCardsApi, referrals as referralsApi, lockers as lockersApi } from '../../api'
import { useApi } from '../../hooks/useApi'

function ChangePasswordModal({ onClose }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (next !== confirm) { setErr('New passwords do not match.'); return }
    if (next.length < 8) { setErr('New password must be at least 8 characters.'); return }
    setSaving(true); setErr(null)
    try {
      await auth.changePassword({ current_password: current, new_password: next })
      setDone(true)
      setTimeout(onClose, 1800)
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Failed to change password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 400 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Change Password</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={submit}>
          {done ? (
            <div style={{ color: 'var(--lime)', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>Password changed successfully!</div>
          ) : (
            <>
              <div className="field"><label>Current password</label><input type="password" value={current} onChange={e => setCurrent(e.target.value)} required autoComplete="current-password" /></div>
              <div className="field"><label>New password</label><input type="password" value={next} onChange={e => setNext(e.target.value)} required autoComplete="new-password" /></div>
              <div className="field"><label>Confirm new password</label><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" /></div>
              {err && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{err}</div>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Update password'}</button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}

export default function StudentAccount() {
  const { user, setUser } = useAuth()
  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [pronouns, setPronouns] = useState(user?.pronouns || '')
  const [ecName, setEcName] = useState(user?.emergency_contact_name || '')
  const [ecPhone, setEcPhone] = useState(user?.emergency_contact_phone || '')
  const [ecRelationship, setEcRelationship] = useState(user?.emergency_contact_relationship || '')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
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

  const { data: referralData } = useApi(() => user?.id ? referralsApi.list({ referrer: user.id }) : null, [user?.id])
  const { data: lockerData, refetch: refetchLocker } = useApi(() => lockersApi.mine(), [])
  const [keyLostMsg, setKeyLostMsg] = useState('')

  async function handleLostKey() {
    if (!lockerData?.id) return
    try {
      await lockersApi.lostKey(lockerData.id)
      setKeyLostMsg('Reported — we\'ll be in touch about the replacement fee.')
      refetchLocker()
    } catch {
      setKeyLostMsg('Something went wrong. Please email us.')
    }
    setTimeout(() => setKeyLostMsg(''), 6000)
  }
  const myReferrals = referralData?.results || referralData || []
  const creditedReferrals = myReferrals.filter(r => r.status === 'credited')
  const pendingReferrals = myReferrals.filter(r => r.status === 'pending')
  const totalCredits = creditedReferrals.reduce((sum, r) => sum + parseFloat(r.credit_amount || 0), 0)

  // Roster visibility
  const [showInRoster, setShowInRoster] = useState(user?.show_in_roster ?? false)
  const [rosterName, setRosterName] = useState(user?.roster_name || 'first_name')
  const [nickname, setNickname] = useState(user?.nickname || '')
  const [rosterSaved, setRosterSaved] = useState(false)

  async function handleRosterChange(updates) {
    const merged = {
      show_in_roster: showInRoster,
      roster_name: rosterName,
      nickname,
      ...updates,
    }
    if ('show_in_roster' in updates) setShowInRoster(updates.show_in_roster)
    if ('roster_name' in updates) setRosterName(updates.roster_name)
    if ('nickname' in updates) setNickname(updates.nickname)
    try {
      await auth.updateMe(merged)
      setRosterSaved(true)
      setTimeout(() => setRosterSaved(false), 2500)
    } catch { /* silent */ }
  }

  // Notification preferences
  const prefs = user?.notification_preferences || {}
  const [classReminders, setClassReminders] = useState(prefs.class_reminders ?? true)
  const [waitlistEmail, setWaitlistEmail] = useState(prefs.waitlist_email ?? true)
  const [waitlistApp, setWaitlistApp] = useState(prefs.waitlist_app ?? true)
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
        emergency_contact_relationship: ecRelationship,
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
      setSaveError('Failed to save — please try again.')
      setTimeout(() => setSaveError(''), 4000)
    }
  }

  async function handleNotifToggle(key, value) {
    const updated = {
      class_reminders: classReminders,
      waitlist_email: waitlistEmail,
      waitlist_app: waitlistApp,
      studio_updates: studioUpdates,
      homework,
      [key]: value,
    }
    // Update local state
    if (key === 'class_reminders') setClassReminders(value)
    if (key === 'waitlist_email') setWaitlistEmail(value)
    if (key === 'waitlist_app') setWaitlistApp(value)
    if (key === 'studio_updates') setStudioUpdates(value)
    if (key === 'homework') setHomework(value)
    try {
      await auth.updateMe({ notification_preferences: updated })
      setNotifSaved(true)
      setTimeout(() => setNotifSaved(false), 2000)
    } catch {
      // revert on error
      if (key === 'class_reminders') setClassReminders(!value)
      if (key === 'waitlist_email') setWaitlistEmail(!value)
      if (key === 'waitlist_app') setWaitlistApp(!value)
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
    { label: 'Waitlist alerts — email', desc: 'Email me when a spot opens or expires', key: 'waitlist_email', value: waitlistEmail },
    { label: 'Waitlist alerts — in-app', desc: 'In-app notification when a spot opens', key: 'waitlist_app', value: waitlistApp },
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

      <div className="two-col-grid" style={{ maxWidth: 820 }}>
        {/* Left column */}
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 16, fontWeight: 500 }}>Profile</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 26 }}>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
              ) : (
                <div className="avatar" style={{ width: 64, height: 64, fontSize: 24, background: 'var(--lav)' }}>
                  {user?.first_name?.[0] || '?'}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? 'Uploading…' : 'Change photo'}
            </button>
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
              <label>Name</label>
              <input type="text" value={ecName} onChange={e => setEcName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="field">
              <label>Relationship</label>
              <input type="text" value={ecRelationship} onChange={e => setEcRelationship(e.target.value)} placeholder="e.g. Sister, Partner, Mother" />
            </div>
            <div className="field">
              <label>Phone</label>
              <input type="tel" value={ecPhone} onChange={e => setEcPhone(e.target.value)} placeholder="Phone number" />
            </div>

            {saveError && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>{saveError}</div>}
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

          {lockerData ? (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 16, fontWeight: 500 }}>Your Locker</div>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: 'var(--lime)', letterSpacing: 1 }}>#{lockerData.number}</div>
                    {lockerData.expires_at && (
                      <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 3 }}>
                        Season ends {new Date(lockerData.expires_at + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                    {lockerData.key_lost && (
                      <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 6 }}>Key reported lost — we'll be in touch.</div>
                    )}
                  </div>
                  {lockerData.key_issued && !lockerData.key_lost && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--red)', borderColor: 'rgba(255,80,80,0.3)', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}
                      onClick={handleLostKey}
                    >
                      I lost my key
                    </button>
                  )}
                </div>
                {keyLostMsg && <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 10 }}>{keyLostMsg}</div>}
              </div>
            </>
          ) : null}

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

          {/* Class roster */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', fontWeight: 500 }}>Who's Coming</div>
            {rosterSaved && <span style={{ fontSize: 11, color: 'var(--lime)' }}>Saved</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid #1a1a1a' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Show my name to classmates</div>
              <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>Other students in your class can see who's coming</div>
            </div>
            <Toggle value={showInRoster} onChange={v => handleRosterChange({ show_in_roster: v })} />
          </div>
          {showInRoster && (
            <>
              <div style={{ paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid #1a1a1a' }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Show me as</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['first_name', 'First name'], ['nickname', 'Nickname']].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => handleRosterChange({ roster_name: val })}
                      className={`btn btn-sm ${rosterName === val ? 'btn-lime' : 'btn-ghost'}`}
                      style={{ fontSize: 12 }}
                    >{label}</button>
                  ))}
                </div>
              </div>
              {rosterName === 'nickname' && (
                <div style={{ paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid #1a1a1a' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Your nickname</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      value={nickname}
                      onChange={e => setNickname(e.target.value)}
                      placeholder="e.g. Mia"
                      style={{ flex: 1, maxWidth: 200 }}
                    />
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => handleRosterChange({ nickname })}>Save</button>
                  </div>
                </div>
              )}
            </>
          )}

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
                <Link to="/portal/forms" style={{ fontSize: 12, color: 'var(--lime)', textDecoration: 'none', whiteSpace: 'nowrap' }}>Sign now →</Link>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: 'var(--lime)' }}>{myReferrals.length}</div>
                <div style={{ fontSize: 10, color: 'var(--grey)', textTransform: 'uppercase', marginTop: 2 }}>Referrals</div>
              </div>
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: '#4ade80' }}>${totalCredits.toFixed(0)}</div>
                <div style={{ fontSize: 10, color: 'var(--grey)', textTransform: 'uppercase', marginTop: 2 }}>Credits Earned</div>
              </div>
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: 'var(--lav)' }}>{pendingReferrals.length}</div>
                <div style={{ fontSize: 10, color: 'var(--grey)', textTransform: 'uppercase', marginTop: 2 }}>Pending</div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

          {/* Gift Cards */}
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 16, fontWeight: 500 }}>Gift Cards</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/portal/billing" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>Buy a Gift Card</Link>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowGiftModal(true)}>Redeem a code</button>
          </div>

          {showGiftModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={e => { if (e.target === e.currentTarget) { setShowGiftModal(false); setGiftCode(''); setGiftMsg('') } }}>
              <div className="card" style={{ width: 'min(340px, calc(100vw - 32px))', padding: 24 }}>
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
          <button className="btn btn-ghost btn-sm" onClick={() => setShowPasswordModal(true)}>Change password</button>
          {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}

        </div>
      </div>
    </div>
  )
}
