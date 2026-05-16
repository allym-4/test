import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const PROMPTS = [
  {
    icon: '🔒',
    label: "I can't access the studio",
    answer: "Within 5 minutes of your class starting? Use the Kisi app on your phone to unlock the door — it's available for all enrolled students.\n\nMore than 5 minutes late? The door is locked once class begins. Unfortunately we can't admit late students as it disrupts the class. No exceptions — but we'd love to see you next time!\n\nIf you have an ongoing access issue, tap 'Contact the team' below.",
  },
  {
    icon: '❌',
    label: 'I need to cancel or reschedule',
    answer: "You can cancel up to 24 hours before class starts with no fee — go to My Classes, tap the booking, and hit Cancel.\n\nCancellations within 24 hours incur a $10 late fee. No-shows (no cancellation at all) are $20.\n\nIf you're unwell or have an emergency, message us and we'll look after you.",
  },
  {
    icon: '💳',
    label: 'I have a billing question',
    answer: "You can view all charges, credits, and payment history in your Billing section (Account → Billing history).\n\nIf something looks wrong, contact us and we'll investigate. Please include the date and amount so we can find it quickly.",
  },
  {
    icon: '🎫',
    label: 'How do makeup credits work?',
    answer: "If you have an approved absence (illness, injury, or an emergency we've okayed), we'll issue a makeup credit.\n\nCredits let you book any equivalent or lower-level class within 60 days. They don't roll over after that.\n\nYou can see your credits in Billing. If you think you're owed one, get in touch.",
  },
  {
    icon: '📅',
    label: 'When do season enrolments open?',
    answer: "New season enrolments usually open around 4 weeks before the season starts. Current students get 48 hours of priority access before spots open to the public.\n\nKeep an eye on your notifications and email — we'll let you know as soon as enrolments are live.",
  },
  {
    icon: '🤕',
    label: "I'm injured — what should I do?",
    answer: "Your safety comes first. Please don't train through pain.\n\nLet your instructor know before class and they'll modify moves for you, or advise sitting out.\n\nFor longer injuries, message us via Chat. Depending on circumstances, we may be able to freeze your enrolment or issue makeup credits.",
  },
  {
    icon: '🏋️',
    label: 'Can I book practice time?',
    answer: "Yes! Head to Practice Time in the menu to see available slots and book pole time outside of your regular classes.\n\nPractice bookings are subject to availability and studio opening hours.",
  },
]

export default function HelpPanel({ open, onClose }) {
  const [expanded, setExpanded] = useState(null)
  const navigate = useNavigate()

  function handleChat() {
    onClose()
    navigate('/portal/chat')
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 301,
        width: 360, maxWidth: '100vw',
        background: 'var(--bg)', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease',
        boxShadow: open ? '-8px 0 40px rgba(0,0,0,0.5)' : 'none',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 3 }}>I need help</div>
              <div style={{ fontSize: 12, color: 'var(--grey)' }}>Tap a question for an instant answer</div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--grey)', fontSize: 20, cursor: 'pointer', padding: 0, lineHeight: 1 }}
            >✕</button>
          </div>
        </div>

        {/* Prompts */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {PROMPTS.map((p, i) => (
            <div key={i} style={{
              background: 'var(--card)', border: `1px solid ${expanded === i ? 'rgba(204,255,0,0.2)' : 'var(--border)'}`,
              borderRadius: 10, overflow: 'hidden',
              transition: 'border-color 0.15s',
            }}>
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                style={{
                  width: '100%', background: 'none', border: 'none', color: 'var(--white)',
                  padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{p.icon}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.label}</span>
                <span style={{
                  color: 'var(--grey)', fontSize: 16, flexShrink: 0,
                  transform: expanded === i ? 'rotate(45deg)' : 'none',
                  transition: 'transform 0.2s', display: 'inline-block',
                }}>+</span>
              </button>
              {expanded === i && (
                <div style={{ padding: '0 14px 14px 42px', fontSize: 12, color: 'var(--grey)', lineHeight: 1.7, borderTop: '1px solid #111', paddingTop: 10 }}>
                  {p.answer.split('\n\n').map((para, j) => (
                    <p key={j} style={{ margin: 0, marginBottom: j < p.answer.split('\n\n').length - 1 ? 10 : 0 }}>{para}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10, textAlign: 'center' }}>
            Can't find what you need?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, fontSize: 12 }}
              onClick={handleChat}
            >
              Chat with assistant
            </button>
            <button
              className="btn btn-lime btn-sm"
              style={{ flex: 1, fontSize: 12 }}
              onClick={handleChat}
            >
              Contact the team →
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
