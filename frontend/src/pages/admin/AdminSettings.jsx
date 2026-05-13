import { useState } from 'react'

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

function Toggle({ on }) {
  const [val, setVal] = useState(on)
  return (
    <div onClick={() => setVal(v => !v)} style={{ width: 40, height: 22, borderRadius: 11, background: val ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: val ? 21 : 3, transition: 'left 0.2s' }} />
    </div>
  )
}

export default function AdminSettings() {
  const [tab, setTab] = useState('studio')

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-sub">Studio configuration and policies</div>
        </div>
        <button className="btn btn-lime btn-sm">Save All Changes</button>
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
              <FieldRow label="Studio name"><input defaultValue="Duality Pole Studio" /></FieldRow>
              <FieldRow label="Email"><input type="email" defaultValue="hello@dualitypole.com.au" /></FieldRow>
              <FieldRow label="Phone"><input type="tel" defaultValue="(02) 9XXX XXXX" /></FieldRow>
              <FieldRow label="Instagram"><input defaultValue="@dualitypole" /></FieldRow>
              <FieldRow label="Timezone"><select defaultValue="Australia/Sydney"><option>Australia/Sydney</option><option>Australia/Melbourne</option><option>Australia/Brisbane</option></select></FieldRow>
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
              <FieldRow label="Primary colour"><input defaultValue="#CCFF00" /></FieldRow>
              <FieldRow label="App tagline"><input defaultValue="Move your body. Find your power." /></FieldRow>
            </Section>

            <Section title="Contact for Students">
              <FieldRow label="General enquiries"><input defaultValue="hello@dualitypole.com.au" /></FieldRow>
              <FieldRow label="Urgent contact"><input defaultValue="urgent@dualitypole.com.au" /></FieldRow>
            </Section>
          </div>
        </div>
      )}

      {tab === 'policies' && (
        <div className="grid-2" style={{ gap: 24 }}>
          <div>
            <Section title="Booking & Cancellation">
              <FieldRow label="No-show fee"><input defaultValue="$20.00" /></FieldRow>
              <FieldRow label="Cancellation window"><input defaultValue="24 hours" /></FieldRow>
              <FieldRow label="Late cancellation fee"><input defaultValue="$10.00" /></FieldRow>
              <FieldRow label="Waitlist auto-promote"><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Toggle on={true} /><span style={{ fontSize: 12, color: 'var(--grey)' }}>Automatically offer spots to waitlisted students</span></div></FieldRow>
              <FieldRow label="Promote response window"><input defaultValue="12 hours" /></FieldRow>
              <FieldRow label="Late enrolment cutoff"><input defaultValue="1 hour before class" /></FieldRow>
            </Section>

            <Section title="Make-up Credits">
              <FieldRow label="Credit expiry"><input defaultValue="60 days" /></FieldRow>
              <FieldRow label="Max per season"><input defaultValue="2 credits" /></FieldRow>
              <FieldRow label="Auto-issue on approved absence"><Toggle on={true} /></FieldRow>
            </Section>
          </div>

          <div>
            <Section title="Account Freeze Policy">
              <FieldRow label="Max freeze duration"><input defaultValue="8 weeks" /></FieldRow>
              <FieldRow label="Max freezes per year"><input defaultValue="1 freeze" /></FieldRow>
              <FieldRow label="Notice required"><input defaultValue="7 days" /></FieldRow>
              <FieldRow label="Freeze fee"><input defaultValue="$0" /></FieldRow>
            </Section>

            <Section title="GST & Tax">
              <FieldRow label="GST registered"><Toggle on={true} /></FieldRow>
              <FieldRow label="ABN"><input defaultValue="12 345 678 901" /></FieldRow>
              <FieldRow label="GST rate"><input defaultValue="10%" /></FieldRow>
              <FieldRow label="Show GST on invoices"><Toggle on={true} /></FieldRow>
            </Section>
          </div>
        </div>
      )}

      {tab === 'pricing' && (
        <div>
          <Section title="Class Pricing">
            <div className="tbl-section" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead><tr><th>Type</th><th>Price</th><th>Description</th><th></th></tr></thead>
                <tbody>
                  {[
                    ['Season Enrolment', '$180–$220', 'Per student per 8-week season'],
                    ['Trial Class', '$25', 'First class for new students'],
                    ['Drop-in / Casual', '$35', 'Single casual class booking'],
                    ['Class Pass 5×', '$150', '5 casual class credits'],
                    ['Class Pass 10×', '$280', '10 casual class credits'],
                    ['Workshop', '$45–$75', 'Special workshop events'],
                  ].map(([type, price, desc]) => (
                    <tr key={type}>
                      <td><b>{type}</b></td>
                      <td style={{ color: 'var(--lime)', fontWeight: 600 }}>{price}</td>
                      <td style={{ color: 'var(--grey)', fontSize: 12 }}>{desc}</td>
                      <td><button className="btn btn-ghost btn-xs">Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn-ghost btn-xs" style={{ marginTop: 12 }}>+ Add Pricing Type</button>
          </Section>

          <Section title="Intro Offers">
            {[['First Class Special', 'Free first class for new students', true], ['3 Classes for $60', 'Intro bundle for new students', true]].map(([name, desc, on]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{desc}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Toggle on={on} />
                  <button className="btn btn-ghost btn-xs">Edit</button>
                </div>
              </div>
            ))}
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
              <FieldRow label="Chase reminders"><Toggle on={true} /></FieldRow>
              <FieldRow label="Re-engagement emails"><Toggle on={true} /></FieldRow>
              <FieldRow label="Welfare check-ins"><Toggle on={true} /></FieldRow>
              <FieldRow label="Waitlist notifications"><Toggle on={true} /></FieldRow>
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
