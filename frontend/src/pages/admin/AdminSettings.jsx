import { useState, useEffect } from 'react'
import { settings as settingsApi, membershipTypes, users, studios as studiosApi, packages as packagesApi, xero as xeroApi } from '../../api'
import { useApi } from '../../hooks/useApi'

const FORM_FIELDS = {
  'Health / PAR-Q Questionnaire': [
    'Do you have a heart condition that requires medical supervision during exercise?',
    'Do you feel pain in your chest when you do physical activity?',
    'Do you lose your balance because of dizziness, or do you ever lose consciousness?',
    'Do you have a bone or joint problem that could be made worse by physical activity?',
    'Are you currently taking medication for blood pressure or a heart condition?',
    'Do you know of any other reason why you should not do physical activity?',
  ],
  'Photo & Video Consent': [
    'I consent to being photographed and/or filmed during classes at Duality Pole Studio.',
    'I consent to photos/videos being used on the studio\'s social media accounts.',
    'I consent to photos/videos being used in the studio\'s marketing materials.',
    'I understand I can withdraw consent at any time by notifying the studio in writing.',
  ],
  'Studio Waiver': [
    'I understand that pole dancing involves physical activity with inherent risks.',
    'I accept full responsibility for my own health and safety during classes.',
    'I agree to follow all instructor guidance and studio safety rules.',
    'I will not participate if I feel unwell or have an injury that may worsen.',
    'I release Duality Pole Studio from liability for injuries sustained during normal class activity.',
    'I agree to the studio\'s cancellation and no-show policy.',
  ],
  'Season Agreement': [
    'I understand my season enrolment is for a fixed 8-week term.',
    'I understand the season fee is non-refundable except in medical circumstances.',
    'I agree to the studio\'s absence and makeup credit policy.',
    'I understand that if I cancel my enrolment mid-season, no refund will be issued.',
  ],
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 14, fontWeight: 600 }}>{title}</div>
      <div className="section" style={{ padding: '18px 20px' }}>{children}</div>
    </div>
  )
}

function FieldRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
      <div style={{ width: 180, flexShrink: 0, fontSize: 13, color: 'var(--grey)', paddingTop: 10 }}>{label}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ width: 40, height: 22, borderRadius: 11, background: checked ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: checked ? 21 : 3, transition: 'left 0.2s' }} />
    </div>
  )
}

function LocationModal({ location, onClose, onSave }) {
  const [name, setName] = useState(location?.name || '')
  const [address, setAddress] = useState(location?.address || '')

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 440 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>{location ? 'Edit Location' : 'Add Location'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <div className="field"><label>Location name</label><input value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
          <div className="field"><label>Address</label><input value={address} onChange={e => setAddress(e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-lime btn-sm" onClick={() => onSave({ ...location, name, address })} disabled={!name.trim()}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FormPreviewModal({ formName, onClose }) {
  const fields = FORM_FIELDS[formName] || []
  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 560 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>{formName}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 16 }}>Students complete this form during onboarding or enrolment.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fields.map((q, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#1a1a1a', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, border: '1px solid var(--border)', flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{q}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const STAFF_PERMISSIONS = [
  { key: 'billing', label: 'Can view billing' },
  { key: 'editProfiles', label: 'Can edit student profiles' },
  { key: 'approvePlans', label: 'Can approve payment plans' },
  { key: 'bulkEmail', label: 'Can send bulk emails' },
  { key: 'reports', label: 'Can view reports' },
]

function IntroOfferModal({ offer, onClose, onSave }) {
  const [name, setName] = useState(offer?.name || '')
  const [price, setPrice] = useState(offer?.price != null ? String(offer.price) : '')
  const [description, setDescription] = useState(offer?.description || '')
  const [numClasses, setNumClasses] = useState(offer?.num_classes != null ? String(offer.num_classes) : '1')
  const [expiryDays, setExpiryDays] = useState(offer?.expiry_days != null ? String(offer.expiry_days) : '14')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({ name, price: parseFloat(price), description, num_classes: parseInt(numClasses), expiry_days: parseInt(expiryDays), is_intro: true, is_active: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 440 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{offer?.id ? 'Edit Intro Offer' : 'New Intro Offer'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit}>
          <div className="field"><label>Name *</label><input value={name} onChange={e => setName(e.target.value)} required autoFocus placeholder="e.g. 2-Week Intro Pass" /></div>
          <div className="field"><label>Price ($) *</label><input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} required placeholder="35.00" /></div>
          <div className="field"><label>Description</label><input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Unlimited classes for 2 weeks" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Classes included</label><input type="number" min="1" value={numClasses} onChange={e => setNumClasses(e.target.value)} /></div>
            <div className="field"><label>Expires after (days)</label><input type="number" min="1" value={expiryDays} onChange={e => setExpiryDays(e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : offer?.id ? 'Save Changes' : 'Create Offer'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MembershipModal({ membership, onClose, onSave }) {
  const [name, setName] = useState(membership?.name || '')
  const [price, setPrice] = useState(membership?.price != null ? String(membership.price) : '')
  const [duration, setDuration] = useState(membership?.duration || '')
  const [classesPerWeek, setClassesPerWeek] = useState(membership?.classes_per_week || '')
  const [isActive, setIsActive] = useState(membership?.is_active !== false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({ ...membership, name, price: parseFloat(price) || 0, duration, classes_per_week: classesPerWeek, is_active: isActive })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 460 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>{membership?.id ? 'Edit Membership' : 'Add Membership'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <div className="field"><label>Name</label><input value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
          <div className="field">
            <label>Price ($)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--grey)' }}>$</span>
              <input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} style={{ maxWidth: 120 }} />
            </div>
          </div>
          <div className="field"><label>Duration (e.g. "8 weeks")</label><input value={duration} onChange={e => setDuration(e.target.value)} /></div>
          <div className="field"><label>Classes/Week (e.g. "1", "2", "Unlimited")</label><input value={classesPerWeek} onChange={e => setClassesPerWeek(e.target.value)} /></div>
          <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ marginBottom: 0 }}>Active</label>
            <Toggle checked={isActive} onChange={setIsActive} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-lime btn-sm" onClick={handleSave} disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminSettings() {
  const [tab, setTab] = useState('studio')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { data: studiosData, refetch: refetchStudios } = useApi(() => studiosApi.list(), [])
  const locations = studiosData?.results || studiosData || []
  const [editingLocation, setEditingLocation] = useState(null)
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [previewForm, setPreviewForm] = useState(null)
  const [integrationMsg, setIntegrationMsg] = useState(null)
  const [xeroStatus, setXeroStatus] = useState(null) // null | {connected, tenant_name, error}
  const [xeroSyncing, setXeroSyncing] = useState(false)
  const [xeroConnecting, setXeroConnecting] = useState(false)
  const [confirmDeleteOfferId, setConfirmDeleteOfferId] = useState(null)
  const [confirmXeroDisconnect, setConfirmXeroDisconnect] = useState(false)

  // Memberships tab
  const { data: membershipData, loading: membershipLoading, refetch: refetchMemberships } = useApi(() => membershipTypes.list(), [])
  const membershipList = membershipData?.results || membershipData || []
  const [membershipModal, setMembershipModal] = useState(null)

  // Intro Offers (packages with is_intro=true)
  const { data: introData, refetch: refetchIntro } = useApi(() => packagesApi.list(), [])
  const introOffers = (introData?.results || introData || []).filter(p => p.is_intro)
  const [introModal, setIntroModal] = useState(null) // null | 'add' | {package object}

  // Staff & Permissions tab
  const { data: staffData } = useApi(() => users.list({ role: 'staff' }), [])
  const { data: instructorData } = useApi(() => users.list({ role: 'instructor' }), [])
  const rawStaff = staffData?.results || staffData || []
  const rawInstructors = instructorData?.results || instructorData || []
  const allStaff = [...rawInstructors, ...rawStaff]
  const [savingStaff, setSavingStaff] = useState({}) // { [userId]: true } while saving

  function permKey(frontendKey) {
    return { billing: 'perm_billing', editProfiles: 'perm_edit_profiles', approvePlans: 'perm_approve_plans', bulkEmail: 'perm_bulk_email', reports: 'perm_reports' }[frontendKey]
  }

  function getPerms(user) {
    return {
      billing: !!user.perm_billing,
      editProfiles: !!user.perm_edit_profiles,
      approvePlans: !!user.perm_approve_plans,
      bulkEmail: !!user.perm_bulk_email,
      reports: !!user.perm_reports,
    }
  }

  async function saveStaffField(user, field, val) {
    setSavingStaff(prev => ({ ...prev, [user.id]: true }))
    try {
      await users.update(user.id, { [field]: val })
      // Update the local list so the UI reflects the new value immediately
      const lists = [rawInstructors, rawStaff]
      lists.forEach(list => {
        const found = list.find(u => u.id === user.id)
        if (found) found[field] = val
      })
    } finally {
      setSavingStaff(prev => ({ ...prev, [user.id]: false }))
    }
  }

  useEffect(() => {
    settingsApi.get().then(r => setForm(r.data))
    xeroApi.status().then(r => setXeroStatus(r.data)).catch(() => setXeroStatus({ connected: false }))
  }, [])

  // Handle Xero OAuth callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
    if (params.get('xero') === 'connected') {
      xeroApi.status().then(r => setXeroStatus(r.data))
      setIntegrationMsg('Xero connected successfully!')
      setTimeout(() => setIntegrationMsg(null), 4000)
    } else if (params.get('xero') === 'error') {
      setIntegrationMsg('Xero connection failed — check your Client ID and Secret.')
      setTimeout(() => setIntegrationMsg(null), 5000)
    }
  }, [])

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function saveAll() {
    if (!form) return
    setSaving(true)
    try {
      await settingsApi.save(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function saveLocation(loc) {
    if (loc.id) {
      await studiosApi.update(loc.id, { name: loc.name, address: loc.address })
    } else {
      await studiosApi.create({ name: loc.name, address: loc.address })
    }
    refetchStudios()
    setEditingLocation(null)
    setShowAddLocation(false)
  }

  async function saveMembership(data) {
    if (data.id) {
      await membershipTypes.update(data.id, data)
    } else {
      await membershipTypes.create(data)
    }
    setMembershipModal(null)
    refetchMemberships()
  }

  async function toggleMembershipActive(m) {
    await membershipTypes.update(m.id, { is_active: !m.is_active })
    refetchMemberships()
  }

  async function saveIntroOffer(data) {
    if (data.id) {
      await packagesApi.update(data.id, data)
    } else {
      await packagesApi.create(data)
    }
    setIntroModal(null)
    refetchIntro()
  }

  async function deleteIntroOffer(offer) {
    setConfirmDeleteOfferId(null)
    await packagesApi.delete(offer.id)
    refetchIntro()
  }

  function showIntegrationInfo(name) {
    setIntegrationMsg(`${name} integration is configured via environment variables on the server. Contact your developer to set up the connection.`)
    setTimeout(() => setIntegrationMsg(null), 4000)
  }

  async function connectXero() {
    setXeroConnecting(true)
    try {
      const r = await xeroApi.connect()
      window.location.href = r.data.auth_url
    } catch (e) {
      setIntegrationMsg(e.response?.data?.detail || 'Failed to start Xero connection — enter Client ID and Client Secret first.')
      setTimeout(() => setIntegrationMsg(null), 5000)
      setXeroConnecting(false)
    }
  }

  async function disconnectXero() {
    setConfirmXeroDisconnect(false)
    await xeroApi.disconnect()
    setXeroStatus({ connected: false })
    setIntegrationMsg('Xero disconnected.')
    setTimeout(() => setIntegrationMsg(null), 3000)
  }

  async function syncXero() {
    setXeroSyncing(true)
    try {
      const r = await xeroApi.sync()
      setIntegrationMsg(`Xero sync complete — ${r.data.synced} invoices synced${r.data.errors ? `, ${r.data.errors} errors` : ''}.`)
    } catch {
      setIntegrationMsg('Xero sync failed — check connection.')
    } finally {
      setXeroSyncing(false)
      setTimeout(() => setIntegrationMsg(null), 5000)
    }
  }

  if (!form) return <div style={{ padding: 32, color: 'var(--grey)' }}>Loading settings…</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-sub">Studio configuration and policies</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={saveAll} disabled={saving}>
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save All Changes'}
        </button>
      </div>

      {integrationMsg && (
        <div style={{ background: 'rgba(176,160,255,0.1)', border: '1px solid rgba(176,160,255,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--lav)' }}>
          {integrationMsg}
        </div>
      )}

      <div className="subtabs" style={{ marginBottom: 24 }}>
        {[['studio', 'Studio'], ['policies', 'Policies'], ['pricing', 'Pricing'], ['memberships', 'Memberships'], ['staff', 'Staff & Permissions'], ['integrations', 'Integrations'], ['forms', 'Forms & Docs']].map(([key, label]) => (
          <div key={key} className={`subtab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</div>
        ))}
      </div>

      {tab === 'studio' && (
        <div className="grid-2" style={{ gap: 24 }}>
          <div>
            <Section title="Studio Details">
              <FieldRow label="Studio name"><input value={form.studio_name} onChange={e => set('studio_name', e.target.value)} /></FieldRow>
              <FieldRow label="Email"><input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></FieldRow>
              <FieldRow label="Phone"><input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} /></FieldRow>
              <FieldRow label="Instagram"><input value={form.instagram} onChange={e => set('instagram', e.target.value)} /></FieldRow>
              <FieldRow label="Timezone">
                <select value={form.timezone} onChange={e => set('timezone', e.target.value)}>
                  <option value="Australia/Sydney">Australia/Sydney</option>
                  <option value="Australia/Melbourne">Australia/Melbourne</option>
                  <option value="Australia/Brisbane">Australia/Brisbane</option>
                </select>
              </FieldRow>
            </Section>

            <Section title="Locations">
              {locations.map(loc => (
                <div key={loc.id} style={{ padding: '10px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{loc.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{loc.address}</div>
                  </div>
                  <button className="btn btn-ghost btn-xs" onClick={() => setEditingLocation(loc)}>Edit</button>
                </div>
              ))}
              <button className="btn btn-ghost btn-xs" style={{ marginTop: 12 }} onClick={() => setShowAddLocation(true)}>+ Add Location</button>
            </Section>
          </div>

          <div>
            <Section title="Branding">
              <FieldRow label="Primary colour"><input value={form.primary_colour} onChange={e => set('primary_colour', e.target.value)} /></FieldRow>
              <FieldRow label="App tagline"><input value={form.tagline} onChange={e => set('tagline', e.target.value)} /></FieldRow>
            </Section>

            <Section title="Contact for Students">
              <FieldRow label="General enquiries"><input value={form.enquiries_email} onChange={e => set('enquiries_email', e.target.value)} /></FieldRow>
              <FieldRow label="Urgent contact"><input value={form.urgent_email} onChange={e => set('urgent_email', e.target.value)} /></FieldRow>
            </Section>
          </div>
        </div>
      )}

      {tab === 'policies' && (
        <div className="grid-2" style={{ gap: 24 }}>
          <div>
            <Section title="Booking & Cancellation">
              <FieldRow label="No-show fee"><input value={form.no_show_fee} onChange={e => set('no_show_fee', e.target.value)} /></FieldRow>
              <FieldRow label="Cancellation window (hrs)"><input type="number" value={form.cancellation_window_hours} onChange={e => set('cancellation_window_hours', parseInt(e.target.value) || 0)} /></FieldRow>
              <FieldRow label="Late cancellation fee"><input value={form.late_cancel_fee} onChange={e => set('late_cancel_fee', e.target.value)} /></FieldRow>
            </Section>

            <Section title="Make-up Credits">
              <FieldRow label="Credit expiry (days)"><input type="number" value={form.credit_expiry_days} onChange={e => set('credit_expiry_days', parseInt(e.target.value) || 0)} /></FieldRow>
            </Section>
          </div>

          <div>
            <Section title="Account Freeze Policy">
              <FieldRow label="Max freeze duration (weeks)"><input type="number" value={form.max_freeze_weeks} onChange={e => set('max_freeze_weeks', parseInt(e.target.value) || 0)} /></FieldRow>
            </Section>

            <Section title="GST & Tax">
              <FieldRow label="GST registered"><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Toggle checked={form.gst_registered} onChange={v => set('gst_registered', v)} /></div></FieldRow>
              <FieldRow label="ABN"><input value={form.abn} onChange={e => set('abn', e.target.value)} /></FieldRow>
            </Section>

            <Section title="Overdue Balance Reminders">
              <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 14, lineHeight: 1.6 }}>
                Configure automatic reminder notifications for students with a negative balance. Each step fires after the specified number of days since the previous one (or since the balance went negative for the first).
              </div>
              {(form.overdue_reminder_schedule || []).map((step, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--grey)', minWidth: 80 }}>Reminder {idx + 1}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                    <input
                      type="number"
                      min={0}
                      value={step.days}
                      onChange={e => {
                        const updated = [...(form.overdue_reminder_schedule || [])]
                        updated[idx] = { ...updated[idx], days: parseInt(e.target.value) || 0 }
                        set('overdue_reminder_schedule', updated)
                      }}
                      style={{ width: 60, textAlign: 'center' }}
                      className="input"
                    />
                    <span style={{ fontSize: 12, color: 'var(--grey)' }}>days</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Toggle
                      checked={step.send_email}
                      onChange={v => {
                        const updated = [...(form.overdue_reminder_schedule || [])]
                        updated[idx] = { ...updated[idx], send_email: v }
                        set('overdue_reminder_schedule', updated)
                      }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--grey)' }}>Email</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = (form.overdue_reminder_schedule || []).filter((_, i) => i !== idx)
                      set('overdue_reminder_schedule', updated)
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 4 }}
                  >×</button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 4 }}
                onClick={() => {
                  const current = form.overdue_reminder_schedule || []
                  set('overdue_reminder_schedule', [...current, { days: 7, send_email: false }])
                }}
              >+ Add Reminder Step</button>
            </Section>
          </div>
        </div>
      )}

      {tab === 'pricing' && (
        <div>
          <Section title="Booking Prices">
            <FieldRow label="Casual / drop-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--grey)' }}>$</span>
                <input type="number" step="0.01" min="0" style={{ maxWidth: 120 }} value={form.price_casual} onChange={e => set('price_casual', e.target.value)} />
                <span style={{ fontSize: 12, color: 'var(--grey)' }}>per class</span>
              </div>
            </FieldRow>
            <FieldRow label="Season enrolment">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--grey)' }}>$</span>
                <input type="number" step="0.01" min="0" style={{ maxWidth: 120 }} value={form.price_season} onChange={e => set('price_season', e.target.value)} />
                <span style={{ fontSize: 12, color: 'var(--grey)' }}>per season</span>
              </div>
            </FieldRow>
            <FieldRow label="Trial class">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--grey)' }}>$</span>
                <input type="number" step="0.01" min="0" style={{ maxWidth: 120 }} value={form.price_trial} onChange={e => set('price_trial', e.target.value)} />
                <span style={{ fontSize: 12, color: 'var(--grey)' }}>first class</span>
              </div>
            </FieldRow>
          </Section>
        </div>
      )}

      {tab === 'memberships' && (
        <div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', fontWeight: 600 }}>Membership Types</div>
            <button className="btn btn-lime btn-sm" onClick={() => setMembershipModal('add')}>+ Add Membership</button>
          </div>

          {membershipLoading ? (
            <div style={{ color: 'var(--grey)', fontSize: 13, padding: 12 }}>Loading…</div>
          ) : membershipList.length === 0 ? (
            <div style={{ color: 'var(--grey)', fontSize: 13, padding: 12 }}>No membership types yet.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 32 }}>
              {membershipList.map(m => (
                <div key={m.id} className="section" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                    <span className={`tag ${m.is_active ? 'tag-lime' : 'tag-grey'}`} style={{ fontSize: 10 }}>{m.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--grey)' }}>
                    {m.duration}{m.classes_per_week ? ` — ${m.classes_per_week}x/week` : ''}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--lime)' }}>${m.price}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button className="btn btn-ghost btn-xs" onClick={() => setMembershipModal(m)}>Edit</button>
                    <button className="btn btn-ghost btn-xs" onClick={() => toggleMembershipActive(m)}>{m.is_active ? 'Deactivate' : 'Activate'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Intro Offers */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#f59e0b', fontWeight: 600 }}>Intro Offers</div>
              <button className="btn btn-ghost btn-xs" onClick={() => setIntroModal('add')}>+ Add Offer</button>
            </div>
            {introOffers.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--grey)', padding: '12px 0' }}>No intro offers yet. Add one to get started.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {introOffers.map(offer => (
                  <div key={offer.id} style={{ borderRadius: 12, border: '1px solid rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.05)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{offer.name}</div>
                      <span style={{ fontSize: 10, background: 'rgba(245,158,11,0.2)', color: '#f59e0b', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>Intro</span>
                    </div>
                    {offer.description && <div style={{ fontSize: 13, color: 'var(--grey)' }}>{offer.description}</div>}
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>${parseFloat(offer.price).toFixed(0)}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)' }}>{offer.num_classes} class{offer.num_classes !== 1 ? 'es' : ''} · {offer.expiry_days} day expiry</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <button className="btn btn-ghost btn-xs" onClick={() => setIntroModal(offer)}>Edit</button>
                      {confirmDeleteOfferId === offer.id ? (
                        <>
                          <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => deleteIntroOffer(offer)}>Confirm</button>
                          <button className="btn btn-ghost btn-xs" onClick={() => setConfirmDeleteOfferId(null)}>No</button>
                        </>
                      ) : (
                        <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => setConfirmDeleteOfferId(offer.id)}>Delete</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'staff' && (
        <div>
          {allStaff.length === 0 ? (
            <div style={{ color: 'var(--grey)', fontSize: 13, padding: 12 }}>No staff or instructors found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {allStaff.map(user => {
                const perms = getPerms(user)
                const initials = (user.first_name?.[0] || user.email?.[0] || '?').toUpperCase()
                const displayName = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.email
                const isSaving = !!savingStaff[user.id]
                return (
                  <div key={user.id} className="section" style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--lav)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#000', flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{displayName}</div>
                        <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{user.email}</div>
                      </div>
                      <select
                        value={user.role}
                        onChange={e => saveStaffField(user, 'role', e.target.value)}
                        disabled={isSaving}
                        style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, background: '#1a1a1a', border: '1px solid var(--border)', color: 'var(--white)', cursor: 'pointer' }}
                      >
                        <option value="instructor">Instructor</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                      {isSaving && <span style={{ fontSize: 11, color: 'var(--grey)' }}>Saving…</span>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
                      {STAFF_PERMISSIONS.map(p => (
                        <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Toggle
                            checked={!!perms[p.key]}
                            onChange={val => saveStaffField(user, permKey(p.key), val)}
                          />
                          <span style={{ fontSize: 13 }}>{p.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'integrations' && (
        <div className="grid-2" style={{ gap: 24 }}>
          <div>
            <Section title="Gmail">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--lime)' }} />
                <span style={{ fontSize: 13 }}>Connected: <b>intrigued@dualitypole.com</b></span>
              </div>
            </Section>
            <Section title="Xero">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: xeroStatus?.connected ? 'var(--lime)' : '#333' }} />
                <span style={{ fontSize: 13, color: xeroStatus?.connected ? 'var(--white)' : 'var(--grey)' }}>
                  {xeroStatus?.connected ? `Connected — ${xeroStatus.tenant_name || 'Xero'}` : 'Not connected'}
                </span>
              </div>
              {!xeroStatus?.connected && (
                <>
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10, lineHeight: 1.5 }}>
                    Enter your Xero app credentials, then click Connect to authorise via Xero's login page.
                  </div>
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 4 }}>Client ID</label>
                    <input className="input" value={form?.xero_client_id || ''} onChange={e => set('xero_client_id', e.target.value)} placeholder="From app.xero.com" style={{ width: '100%', fontSize: 12 }} />
                  </div>
                  <div className="field" style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 4 }}>Client Secret</label>
                    <input className="input" type="password" value={form?.xero_client_secret || ''} onChange={e => set('xero_client_secret', e.target.value)} placeholder="Client secret" style={{ width: '100%', fontSize: 12 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={saveAll} disabled={saving}>Save Credentials</button>
                    <button className="btn btn-lime btn-sm" onClick={connectXero} disabled={xeroConnecting || !form?.xero_client_id}>
                      {xeroConnecting ? 'Redirecting…' : 'Connect Xero'}
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 10, lineHeight: 1.5 }}>
                    Set this as your redirect URI in the Xero app:{' '}
                    <span style={{ fontFamily: 'monospace', color: 'var(--lav)' }}>/api/users/xero/callback/</span>
                  </div>
                </>
              )}
              {xeroStatus?.connected && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-lime btn-sm" onClick={syncXero} disabled={xeroSyncing}>
                    {xeroSyncing ? 'Syncing…' : 'Sync Payments (30 days)'}
                  </button>
                  {confirmXeroDisconnect ? (
                    <>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={disconnectXero}>Confirm disconnect</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmXeroDisconnect(false)}>Cancel</button>
                    </>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmXeroDisconnect(true)}>Disconnect</button>
                  )}
                </div>
              )}
            </Section>
          </div>
          <div>
            <Section title="Kisi Door Access">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#333' }} />
                <span style={{ fontSize: 13, color: 'var(--grey)' }}>Not configured</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => showIntegrationInfo('Kisi')}>Configure Kisi</button>
            </Section>
            <Section title="Square POS">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#333' }} />
                <span style={{ fontSize: 13, color: 'var(--grey)' }}>Not connected</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => showIntegrationInfo('Square POS')}>Connect Square</button>
            </Section>
            <Section title="Instagram DMs (Meta Business API)">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: form.instagram_access_token ? 'var(--lime)' : '#333' }} />
                <span style={{ fontSize: 13, color: form.instagram_access_token ? 'var(--white)' : 'var(--grey)' }}>
                  {form.instagram_access_token
                    ? `Connected${form.instagram_username ? ` — @${form.instagram_username}` : ''}`
                    : 'Not connected'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 14, lineHeight: 1.6 }}>
                Set the following environment variables on your server to enable Instagram DM integration:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {[
                  ['META_APP_ID', 'Your Meta app ID from developers.facebook.com'],
                  ['META_APP_SECRET', 'Your Meta app secret'],
                  ['INSTAGRAM_WEBHOOK_VERIFY_TOKEN', 'A secret string you choose to verify webhook calls (default: duality_pole_verify)'],
                ].map(([key, desc]) => (
                  <div key={key} style={{ background: '#111', borderRadius: 6, padding: '8px 12px' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--lime)', marginBottom: 2 }}>{key}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)' }}>{desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 8 }}>
                Register this webhook URL with Meta:
              </div>
              <div style={{ background: '#111', borderRadius: 6, padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, color: 'var(--lav)', marginBottom: 14, wordBreak: 'break-all' }}>
                /api/users/instagram/webhook/
              </div>
              <a href="/api/users/instagram/auth/" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none', display: 'inline-block' }}>Connect Instagram</a>
            </Section>
          </div>
        </div>
      )}

      {tab === 'forms' && (
        <Section title="Forms & Documents">
          {[
            ['Health / PAR-Q Questionnaire', 'Medical pre-screening for new students', 'form_health_enabled'],
            ['Photo & Video Consent', 'Permission to photograph/film in class', 'form_photo_consent_enabled'],
            ['Studio Waiver', 'Liability waiver and code of conduct', 'form_waiver_enabled'],
            ['Season Agreement', 'Season enrolment terms and conditions', 'form_season_agreement_enabled'],
          ].map(([name, desc, key]) => {
            const enabled = form?.[key] ?? true
            return (
              <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{desc}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Toggle checked={enabled} onChange={val => set(key, val)} />
                  <span className={`tag ${enabled ? 'tag-lime' : 'tag-grey'}`} style={{ fontSize: 10 }}>{enabled ? 'Active' : 'Inactive'}</span>
                  <button className="btn btn-ghost btn-xs" onClick={() => setPreviewForm(name)}>Preview</button>
                </div>
              </div>
            )
          })}
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-lime btn-sm" onClick={saveAll} disabled={saving}>{saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}</button>
          </div>
        </Section>
      )}

      {membershipModal && (
        <MembershipModal
          membership={membershipModal === 'add' ? null : membershipModal}
          onClose={() => setMembershipModal(null)}
          onSave={saveMembership}
        />
      )}

      {introModal && (
        <IntroOfferModal
          offer={introModal === 'add' ? null : introModal}
          onClose={() => setIntroModal(null)}
          onSave={saveIntroOffer}
        />
      )}

      {editingLocation && (
        <LocationModal location={editingLocation} onClose={() => setEditingLocation(null)} onSave={saveLocation} />
      )}
      {showAddLocation && (
        <LocationModal location={null} onClose={() => setShowAddLocation(false)} onSave={saveLocation} />
      )}
      {previewForm && (
        <FormPreviewModal formName={previewForm} onClose={() => setPreviewForm(null)} />
      )}
    </div>
  )
}
