import { useState, useEffect } from 'react'
import { settings as settingsApi } from '../../api'

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

export default function AdminSettings() {
  const [tab, setTab] = useState('studio')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [locations, setLocations] = useState([
    { id: 1, name: 'The Box', address: 'Level 1, 88 Kippax St, Surry Hills NSW 2010' },
    { id: 2, name: 'Rhapsody', address: 'Level 2, 12 Crown St, Surry Hills NSW 2010' },
  ])
  const [editingLocation, setEditingLocation] = useState(null)
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [previewForm, setPreviewForm] = useState(null)
  const [integrationMsg, setIntegrationMsg] = useState(null)

  useEffect(() => {
    settingsApi.get().then(r => setForm(r.data))
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

  function saveLocation(loc) {
    if (loc.id) {
      setLocations(prev => prev.map(l => l.id === loc.id ? loc : l))
    } else {
      setLocations(prev => [...prev, { ...loc, id: Date.now() }])
    }
    setEditingLocation(null)
    setShowAddLocation(false)
  }

  function showIntegrationInfo(name) {
    setIntegrationMsg(`${name} integration is configured via environment variables on the server. Contact your developer to set up the connection.`)
    setTimeout(() => setIntegrationMsg(null), 4000)
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
        {[['studio', 'Studio'], ['policies', 'Policies'], ['pricing', 'Pricing'], ['integrations', 'Integrations'], ['forms', 'Forms & Docs']].map(([key, label]) => (
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

      {tab === 'integrations' && (
        <div className="grid-2" style={{ gap: 24 }}>
          <div>
            <Section title="Gmail">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--lime)' }} />
                <span style={{ fontSize: 13 }}>Connected: <b>mimi@dualitypole.com.au</b></span>
              </div>
            </Section>
            <Section title="Xero">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#333' }} />
                <span style={{ fontSize: 13, color: 'var(--grey)' }}>Not connected</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => showIntegrationInfo('Xero')}>Connect Xero</button>
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
          </div>
        </div>
      )}

      {tab === 'forms' && (
        <Section title="Forms & Documents">
          {[
            ['Health / PAR-Q Questionnaire', 'Medical pre-screening for new students', true],
            ['Photo & Video Consent', 'Permission to photograph/film in class', true],
            ['Studio Waiver', 'Liability waiver and code of conduct', true],
            ['Season Agreement', 'Season enrolment terms and conditions', true],
          ].map(([name, desc, enabled]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{desc}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`tag ${enabled ? 'tag-lime' : 'tag-grey'}`} style={{ fontSize: 10 }}>{enabled ? 'Active' : 'Inactive'}</span>
                <button className="btn btn-ghost btn-xs" onClick={() => setPreviewForm(name)}>Preview</button>
              </div>
            </div>
          ))}
        </Section>
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
