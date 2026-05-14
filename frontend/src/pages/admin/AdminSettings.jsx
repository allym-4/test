import { useState, useEffect } from 'react'
import { settings as settingsApi } from '../../api'

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

export default function AdminSettings() {
  const [tab, setTab] = useState('studio')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
              {[['The Box', 'Level 1, 88 Kippax St, Surry Hills NSW 2010'], ['Rhapsody', 'Level 2, 12 Crown St, Surry Hills NSW 2010']].map(([name, addr]) => (
                <div key={name} style={{ padding: '10px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{addr}</div>
                  </div>
                  <button className="btn btn-ghost btn-xs">Edit</button>
                </div>
              ))}
              <button className="btn btn-ghost btn-xs" style={{ marginTop: 12 }}>+ Add Location</button>
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
              <button className="btn btn-ghost btn-sm">Connect Xero</button>
            </Section>
          </div>
          <div>
            <Section title="Kisi Door Access">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#333' }} />
                <span style={{ fontSize: 13, color: 'var(--grey)' }}>Not configured</span>
              </div>
              <button className="btn btn-ghost btn-sm">Configure Kisi</button>
            </Section>
            <Section title="Square POS">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#333' }} />
                <span style={{ fontSize: 13, color: 'var(--grey)' }}>Not connected</span>
              </div>
              <button className="btn btn-ghost btn-sm">Connect Square</button>
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
                <button className="btn btn-ghost btn-xs">Edit</button>
                <button className="btn btn-ghost btn-xs">Preview</button>
              </div>
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}
