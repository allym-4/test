import { useState } from 'react'

const FAQS = [
  {
    q: 'How do I cancel or reschedule a class?',
    a: 'You can cancel a booking up to 24 hours before the class starts without a fee. To cancel, go to My Classes and tap the booking. Cancellations within 24 hours may incur a late cancellation fee of $10. If you miss a class without cancelling, a $20 no-show fee applies.',
  },
  {
    q: 'Can I freeze my membership?',
    a: "Yes! You can freeze your season membership for up to 8 weeks once per season. Freezes require 7 days notice. To request a freeze, message us via the Messages tab or email hello@dualitypole.com.au.",
  },
  {
    q: 'How do makeup credits work?',
    a: 'If you have an approved absence (e.g., illness, injury), we may issue a makeup credit. Credits can be used to book any equivalent or lower level class within 60 days. You can see your credits in your Billing section.',
  },
  {
    q: 'What should I wear to class?',
    a: 'Wear comfortable activewear that leaves your legs, arms, and midriff exposed — your skin helps you grip the pole! Avoid moisturisers or fake tan before class. Bring grippy socks for warm-up and cool-down. We sell grip socks and grip aids at the studio.',
  },
  {
    q: 'Is there parking nearby?',
    a: 'The Box (Surry Hills): There is street parking on Kippax St and surrounding streets. We recommend arriving via public transport if possible. Rhapsody (Crown St): Limited street parking is available. The nearest train station is Central.',
  },
  {
    q: 'What happens if a class is cancelled?',
    a: "If we cancel a class, you'll be notified by email as soon as possible. A makeup credit will automatically be added to your account. You can use this credit to book any equivalent class within 60 days.",
  },
  {
    q: 'How do I enrol for a new season?',
    a: 'Season enrolments open approximately 4 weeks before the new season starts. Current students get priority access for the first 48 hours. You\'ll receive an email when enrolments open. You can then book through the Book tab.',
  },
]

export default function StudentSupport() {
  const [openFaq, setOpenFaq] = useState(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [tab, setTab] = useState('faq')

  function handleSubmit() {
    if (subject && message) {
      setSent(true)
      setSubject('')
      setMessage('')
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Support</div>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>FAQs and contact the studio</div>
      </div>

      <div className="tab-strip" style={{ marginBottom: 20 }}>
        {[['faq', 'FAQs'], ['contact', 'Contact Us']].map(([key, label]) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === 'faq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{faq.q}</div>
                <div style={{ color: 'var(--grey)', fontSize: 18, flexShrink: 0, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(45deg)' : 'none' }}>+</div>
              </div>
              {openFaq === i && (
                <div style={{ padding: '0 18px 16px', fontSize: 13, color: 'var(--grey)', lineHeight: 1.7, borderTop: '1px solid #111' }}>
                  <div style={{ paddingTop: 12 }}>{faq.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'contact' && (
        <div style={{ maxWidth: 520 }}>
          <div style={{ background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Get in touch</div>
            <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.6 }}>
              We try to respond within 24 hours. For urgent matters, call us on <b>(02) 9XXX XXXX</b> or email <b>urgent@dualitypole.com.au</b>.
            </div>
          </div>

          {sent ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 8 }}>Message sent!</div>
              <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 20 }}>We'll get back to you within 24 hours.</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSent(false)}>Send another message</button>
            </div>
          ) : (
            <div>
              <div className="field" style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 6 }}>Subject</label>
                <select value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%' }}>
                  <option value="">Select a topic…</option>
                  <option>Booking question</option>
                  <option>Billing or payment</option>
                  <option>Membership freeze</option>
                  <option>Makeup credit</option>
                  <option>Technical issue</option>
                  <option>Feedback</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="field" style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 6 }}>Message</label>
                <textarea
                  rows={5}
                  placeholder="Tell us what's going on…"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '10px 12px', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <button className="btn btn-lime btn-sm" onClick={handleSubmit} disabled={!subject || !message} style={{ width: '100%' }}>
                Send Message
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
