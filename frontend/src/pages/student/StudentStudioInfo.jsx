import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { settings, users } from '../../api'

const AVATAR_COLORS = ['#b0a0ff', '#ccff00', '#ffaa00', '#ff88aa', '#44ffcc', '#ffcc88', '#b0f0b0', '#9ac4ff', '#ffb3de', '#44ff99']
function avatarColor(name) {
  let h = 0
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}


export default function StudentStudioInfo() {
  const [tab, setTab] = useState('about')
  const { data: settingsData } = useApi(() => settings.get())
  const { data: staffData } = useApi(() => users.publicInstructors())

  const s = settingsData || {}
  const instructors = staffData || []

  const cancelWindow = s.cancellation_window_hours ?? 4
  const noShowFee = s.no_show_fee ? `$${parseFloat(s.no_show_fee).toFixed(0)}` : '$20'

  const policies = [
    {
      title: 'Cancellation Policy',
      body: `Mark yourself away at least ${cancelWindow} hours before class to receive a catch-up credit. Within ${cancelWindow} hours, you can still mark away so your instructor knows — but no credit is issued. No-shows (unannounced absences) incur a ${noShowFee} fee.`,
    },
    {
      title: 'Waitlist Policy',
      body: "When a spot opens, the first student on the waitlist is notified by email and has 12 hours to accept. If they don't respond, the next student is offered the spot.",
    },
    {
      title: 'Catch-up Credits',
      body: "When you mark away more than 4 hours before class, a catch-up credit is added to your account. You can use it to book into another class in the same season. Credits do not carry over between seasons.\n\nFor conditioning and dance classes, you can catch up any week. For level and routine classes: if you're already enrolled in that class, you can catch up in it any week. If you're not enrolled in that class, catch-ups can only be booked up to and including Week 3.",
    },
    {
      title: 'Refund Policy',
      body: "Season enrolments are non-refundable. If you are unable to continue, please contact us to request a transfer — we'll do our best to help.",
    },
    {
      title: 'Photography & Filming',
      body: "You must obtain consent from all individuals before filming or photographing in the studio. Duality may photograph or film classes for marketing purposes — let us know if you opt out.",
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Studio Info</div>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>Everything you need to know about Duality</div>
      </div>

      <div className="tab-strip" style={{ marginBottom: 20 }}>
        {[['about', 'About'], ['our-studio', 'Our Studio'], ['team', 'Our Team'], ['policies', 'Policies'], ['code', 'The Code']].map(([key, label]) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === 'about' && (
        <div style={{ maxWidth: 600 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 24px', marginBottom: 16 }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, marginBottom: 14, color: 'var(--lime)' }}>
              {s.tagline || 'Our purpose-built playground for all things pole.'}
            </div>
            {(s.description || '').split('\n\n').map((para, i) => (
              <div key={i} style={{ fontSize: 14, color: 'var(--grey)', lineHeight: 1.8, marginBottom: 14 }}>{para}</div>
            ))}
            <div style={{ marginTop: 18, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <a href="mailto:intrigued@dualitypole.com" style={{ fontSize: 13, color: 'var(--lime)', textDecoration: 'none' }}>✉ intrigued@dualitypole.com</a>
              <span style={{ fontSize: 13, color: 'var(--grey)' }}>📞 (02) 9160 0223</span>
              <a href="https://instagram.com/dualitypole" target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--lav)', textDecoration: 'none' }}>@ dualitypole</a>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginBottom: 16 }}>
            {[['2021', 'Est.'], ['3', 'Studios'], [`${instructors.length || ''}+`, 'Instructors']].map(([val, label]) => (
              <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 24, color: 'var(--lime)' }}>{val}</div>
                <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Chat to us */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', marginBottom: 16 }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 16 }}>Chat to us</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 4 }}>General enquiries</div>
                  <a href="mailto:intrigued@dualitypole.com" style={{ fontSize: 14, color: 'var(--lime)', textDecoration: 'none' }}>intrigued@dualitypole.com</a>
                </div>
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 4 }}>Same-day class issues</div>
                  <a href="mailto:intrigued@dualitypole.com" style={{ fontSize: 14, color: 'var(--lime)', textDecoration: 'none' }}>intrigued@dualitypole.com</a>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 4 }}>Phone</div>
                <a href="tel:0291600223" style={{ fontSize: 14, color: 'var(--white)', textDecoration: 'none' }}>(02) 9160 0223</a>
              </div>
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 4 }}>Instagram</div>
                <a href="https://instagram.com/dualitypole" target="_blank" rel="noreferrer" style={{ fontSize: 14, color: 'var(--lav)', textDecoration: 'none' }}>@dualitypole</a>
              </div>
              {/* Submit a ticket */}
              <div style={{ background: 'rgba(204,255,0,0.05)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 6 }}>Submit a ticket</div>
                <div style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.6, marginBottom: 10 }}>
                  Got a question that isn't urgent? Submit a support ticket and we'll get back to you — usually within one business day.
                </div>
                <a
                  href="/portal/forms"
                  style={{ display: 'inline-block', background: '#ccff00', color: '#000', fontWeight: 700, fontSize: 12, borderRadius: 8, padding: '9px 18px', textDecoration: 'none', letterSpacing: '0.4px' }}
                >
                  SUBMIT A TICKET →
                </a>
              </div>

              <div style={{ padding: '12px 14px', background: '#111', borderRadius: 8, fontSize: 12, color: 'var(--grey)', lineHeight: 1.7 }}>
                For same-day issues (e.g. can't access Kisi, running late) email <span style={{ color: 'var(--white)' }}>intrigued@dualitypole.com</span> — we monitor this before class. Please note we <span style={{ color: 'var(--white)' }}>can't respond during class time</span> as we're busy teaching everyone who arrived on time. The general inbox may not be checked until the next business day.
              </div>
            </div>
          </div>

          {/* Acknowledgements */}
          <div style={{ background: '#050000', border: '1px solid #333', borderRadius: 14, padding: '22px 24px' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 10 }}>Acknowledgements</div>
            <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.8, marginBottom: 14, borderBottom: '1px solid #1a1a1a', paddingBottom: 14 }}>
              We acknowledge the Traditional Custodians of the land on which we dance, the Gadigal People. We pay our respects to their Elders past and present. We dance on stolen land.
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.8 }}>
              We honour and respect the pioneers of pole dance — the past and present sex workers whose artistry, resilience, and innovation built the foundation of this industry. Their courage and creativity carved a path that allows us to move, express, and connect through pole today. We dance freely because of their work, and we remain grateful for the legacy they continue to shape.
            </div>
          </div>
        </div>
      )}

      {tab === 'our-studio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 4 }}>
            📍 Level 1, 88 Kippax St, Surry Hills NSW 2010 · (02) 9160 0223
          </div>
          {[
            {
              name: 'RHAPSODY',
              poles: 14,
              features: [
                '14 × 38mm brass 3.4m spin/static poles',
                'Every pole in the view of a mirror and teacher',
                '2.6m high mirrors',
                'Cushioned, shock absorbing, specialist torquet flooring',
                'Custom, colour controlled lighting',
                'Holographic windows',
                'Super spacious with at least 2.4m between each pole',
                'Ducted air conditioning',
                'State of the art speakers for crisp audio',
                'Branded Duality mats and blocks for use',
              ],
            },
            {
              name: 'THE BOX',
              poles: 11,
              features: [
                '11 × 38mm brass 3.4m spin/static poles',
                'Every pole in the view of a mirror and teacher',
                '2.6m high mirrors',
                'Cushioned, shock absorbing, specialist hybrid flooring',
                'Custom, colour controlled lighting',
                'Complete blackout allowing full lighting control',
                'Super spacious with at least 2.1m between each pole',
                'Ducted air conditioning',
                'State of the art speakers for crisp audio',
                'Branded Duality mats and blocks for use',
              ],
            },
            {
              name: "JANITOR'S CLOSET",
              poles: 3,
              features: [
                '3 × 38mm brass 3.4m spin/static poles',
                'Perfect for private lessons and competition practice',
                '2.6m high mirrors',
                'Cushioned, shock absorbing, specialist hybrid flooring',
                'Custom, colour controlled lighting',
                'Holographic windows',
                'Super spacious with at least 2.1m between each pole',
                'Ducted air conditioning',
                'Branded Duality mats and blocks for use',
              ],
            },
          ].map(loc => (
            <div key={loc.name} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20 }}>{loc.name}</div>
                <div style={{ background: 'rgba(204,255,0,0.12)', border: '1px solid rgba(204,255,0,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'var(--lime)', fontWeight: 700 }}>
                  {loc.poles} poles
                </div>
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {loc.features.map(f => (
                  <li key={f} style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.5 }}>{f}</li>
                ))}
              </ul>
            </div>
          ))}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', fontSize: 13, color: 'var(--grey)', lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: 6 }}>Shared spaces</div>
            Spacious and luxe reception area · Change rooms · Gender-neutral bathrooms with shower · Dyson tap-and-dryer · Locker room for season storage
          </div>
        </div>
      )}

      {tab === 'team' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {instructors.length === 0 ? (
            <div style={{ color: 'var(--grey)', fontSize: 13, gridColumn: '1/-1' }}>No team members found.</div>
          ) : instructors.map(person => (
            <div key={person.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 18px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: avatarColor(person.display_name), color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontFamily: "'Archivo Black', sans-serif", margin: '0 auto 12px' }}>
                {person.first_name?.[0] || '?'}
              </div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17, marginBottom: 4 }}>{person.display_name}</div>
              <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: person.pronouns ? 6 : 0, textTransform: 'capitalize' }}>Instructor</div>
              {person.pronouns && <div style={{ fontSize: 11, color: 'var(--lav)' }}>{person.pronouns}</div>}
            </div>
          ))}
        </div>
      )}

      {tab === 'policies' && (
        <div style={{ maxWidth: 580 }}>
          {policies.map((policy, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{policy.title}</div>
              <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.7 }}>{policy.body}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'code' && (
        <div style={{ maxWidth: 560 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 6 }}>The Duality Code</div>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 20, lineHeight: 1.6 }}>
            A very important guide on being a good human within our space.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(s.studio_code || []).map((item, i) => (
              <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>{item.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
