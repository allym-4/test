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
              {s.tagline || 'Move your body. Find your power.'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--grey)', lineHeight: 1.8, marginBottom: 14 }}>
              {s.studio_name || 'Duality Pole Studio'} is Surry Hills' home for pole fitness, founded in 2021. We believe pole dance is for every body — and that moving your body is one of the most powerful things you can do.
            </div>
            <div style={{ fontSize: 14, color: 'var(--grey)', lineHeight: 1.8, marginBottom: 14 }}>
              We run structured season programmes as well as casual classes, workshops, and open practice sessions. Our two studios — The Box and Rhapsody — are fully equipped with professional-grade poles in multiple diameters.
            </div>
            <div style={{ fontSize: 14, color: 'var(--grey)', lineHeight: 1.8 }}>
              Whether you're just starting out or looking to push your technique, there's a place for you at Duality.
            </div>
            {(s.email || s.phone || s.instagram) && (
              <div style={{ marginTop: 18, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {s.email && <a href={`mailto:${s.email}`} style={{ fontSize: 13, color: 'var(--lime)', textDecoration: 'none' }}>✉ {s.email}</a>}
                {s.phone && <span style={{ fontSize: 13, color: 'var(--grey)' }}>📞 {s.phone}</span>}
                {s.instagram && <a href={`https://instagram.com/${s.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--lav)', textDecoration: 'none' }}>@ {s.instagram}</a>}
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[['2021', 'Est.'], ['2', 'Studios'], [`${instructors.length || ''}+`, 'Instructors']].map(([val, label]) => (
              <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 24, color: 'var(--lime)' }}>{val}</div>
                <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'locations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
          {[
            {
              name: 'The Box',
              address: 'Level 1, 88 Kippax St, Surry Hills NSW 2010',
              desc: 'Our original studio. Fitted with 6 professional poles across 2 rooms. Easy access from Central Station.',
              hours: 'Mon–Sat: 9am–9pm, Sun: 10am–6pm',
              poles: 6,
              access: 'Stairs only',
            },
            {
              name: 'Rhapsody',
              address: 'Level 2, 12 Crown St, Surry Hills NSW 2010',
              desc: 'Our newer, larger space. 8 poles, a dedicated stretch area, and a beautiful rooftop for post-class hangs.',
              hours: 'Mon–Sat: 7am–9pm, Sun: 9am–7pm',
              poles: 8,
              access: 'Lift + stairs',
            },
          ].map(loc => (
            <div key={loc.name} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 4 }}>{loc.name}</div>
              <div style={{ fontSize: 12, color: 'var(--lime)', marginBottom: 12 }}>{loc.address}</div>
              <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.7, marginBottom: 14 }}>{loc.desc}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                {[['Poles', loc.poles], ['Hours', 'See below'], ['Access', loc.access]].map(([label, val]) => (
                  <div key={label} style={{ background: '#111', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{val}</div>
                    <div style={{ fontSize: 10, color: 'var(--grey)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--grey)' }}>🕐 {loc.hours}</div>
            </div>
          ))}
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
