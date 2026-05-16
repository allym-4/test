import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { settings, users } from '../../api'

const AVATAR_COLORS = ['#b0a0ff', '#ccff00', '#ffaa00', '#ff88aa', '#44ffcc', '#ffcc88', '#b0f0b0', '#9ac4ff', '#ffb3de', '#44ff99']
function avatarColor(name) {
  let h = 0
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

const CODE = [
  { icon: '💪', title: 'Show up', body: 'Consistency is how you grow. If you need to miss a class, let us know in advance.' },
  { icon: '🤝', title: 'Support each other', body: "We celebrate every win in this studio — yours and your classmates'. Cheer each other on." },
  { icon: '🙏', title: 'Be respectful', body: 'Of the space, the equipment, the instructors, and each other. We look after this place together.' },
  { icon: '📱', title: 'Phones on silent', body: 'Be present in class. You can share your journey after, not during.' },
  { icon: '🚫', title: 'No unsolicited filming', body: "Always ask before filming other students. Everyone's comfort matters." },
  { icon: '💚', title: 'Your pace is your pace', body: "Never compare your chapter 1 to someone else's chapter 10. Progress is personal." },
]

export default function StudentStudioInfo() {
  const [tab, setTab] = useState('about')
  const { data: settingsData } = useApi(() => settings.get())
  const { data: staffData } = useApi(() => users.list({ role: 'instructor' }))

  const s = settingsData || {}
  const instructors = staffData?.results || []

  const cancelWindow = s.cancellation_window_hours ?? 24
  const noShowFee = s.no_show_fee ? `$${parseFloat(s.no_show_fee).toFixed(0)}` : '$20'
  const lateCancelFee = s.late_cancel_fee ? `$${parseFloat(s.late_cancel_fee).toFixed(0)}` : '$10'
  const creditExpiry = s.credit_expiry_days ?? 60
  const maxFreeze = s.max_freeze_weeks ?? 8

  const policies = [
    {
      title: 'Cancellation Policy',
      body: `Cancellations must be made at least ${cancelWindow} hours before class. Late cancellations (within ${cancelWindow} hours) incur a ${lateCancelFee} fee. No-shows (unannounced absences) incur a ${noShowFee} fee.`,
    },
    {
      title: 'Waitlist Policy',
      body: "When a spot opens, the first student on the waitlist is notified by email and has 12 hours to accept. If they don't respond, the next student is offered the spot.",
    },
    {
      title: 'Makeup Credits',
      body: `Approved absences (illness, injury, or emergency) may receive a makeup credit. Credits expire ${creditExpiry} days after issue. Maximum 2 credits per season. Credits are non-transferable.`,
    },
    {
      title: 'Membership Freeze',
      body: `You can freeze your season membership for up to ${maxFreeze} weeks, once per season. 7 days notice required. Freeze is free of charge.`,
    },
    {
      title: 'Refund Policy',
      body: "Season enrolments are non-refundable after the season commences. If you are unable to continue due to medical reasons, please contact us — we'll do our best to help.",
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
        {[['about', 'About'], ['locations', 'Locations'], ['team', 'Our Team'], ['policies', 'Policies'], ['code', 'The Code']].map(([key, label]) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === 'about' && (
        <div style={{ maxWidth: 600 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 24px', marginBottom: 16 }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, marginBottom: 14, color: 'var(--lime)' }}>
              {s.tagline || 'Our purpose-built playground for all things pole.'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--grey)', lineHeight: 1.8, marginBottom: 14 }}>
              Welcome to Duality, our purpose-built playground for all things pole. Tucked high in the trees on vibrant Gadigal Land in Surry Hills, our dreamy studio is designed for one thing: the ultimate pole experience.
            </div>
            <div style={{ fontSize: 14, color: 'var(--grey)', lineHeight: 1.8, marginBottom: 14 }}>
              Inside you will find not one, not two, but three stunning pole studios ready to set the stage for your spins, flips and hair flicks. The reception is spacious and luxe, perfect for a pre-class catch-up or post-class debrief. We have change rooms to slip into your duality with ease, gender-neutral bathrooms with two stalls and a shower, a Dyson tap-and-dryer because we love looking good while staying sustainable. You can also grab a locker for the season to stash your grip, shoes or secret snacks.
            </div>
            <div style={{ fontSize: 14, color: 'var(--grey)', lineHeight: 1.8 }}>
              Every corner of Duality is designed to feel otherworldly. From the moment you step inside you leave the everyday behind. The lights, the mirrors, the music, the energy — it is dreamy, a little cheeky and completely transportive. Think of it as stepping into another dimension — one where you are powerful, playful and free to move however you want.
            </div>
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

          {/* Get in Touch */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', marginBottom: 16 }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 16 }}>Get in Touch</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 4 }}>General enquiries</div>
                  <a href="mailto:intrigued@dualitypole.com" style={{ fontSize: 14, color: 'var(--lime)', textDecoration: 'none' }}>intrigued@dualitypole.com</a>
                </div>
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 4 }}>Urgent (same-day class issues)</div>
                  <a href="mailto:staff@dualitypole.com" style={{ fontSize: 14, color: 'var(--lime)', textDecoration: 'none' }}>staff@dualitypole.com</a>
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
              <div style={{ padding: '12px 14px', background: '#111', borderRadius: 8, fontSize: 12, color: 'var(--grey)', lineHeight: 1.6 }}>
                For same-day issues (e.g. can't access Kisi, running late) please email <span style={{ color: 'var(--white)' }}>staff@dualitypole.com</span> — this inbox is monitored before and during class time. The general inbox may not be checked until the next business day.
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

      {tab === 'locations' && (
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
            These are the values that make Duality the space it is. We ask every student to embrace them.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CODE.map((item, i) => (
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
