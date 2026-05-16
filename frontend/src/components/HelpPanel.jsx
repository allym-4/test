import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const PROMPTS = [
  {
    icon: '🔒',
    label: "I can't access the studio",
    answer: "The door auto-unlocks 15 minutes before each class and stays unlocked until 1 minute after it starts — just push the door, no app needed during that window.\n\nOutside that window, use the Kisi app (you'll have received an email with access before your first class). You'll need Kisi if you're arriving more than 15 minutes early or are a couple of minutes late.\n\n5 minutes late or more? Unfortunately the door is locked and you'll be marked as a no-show. Warm-up is essential for safety and we can't disrupt the class — no exceptions. If you haven't set up Kisi yet or are having trouble with it, email us at intrigued@dualitypole.com.",
  },
  {
    icon: '❌',
    label: 'I need to cancel',
    answer: "Cancel at least 4 hours before your class and you'll receive a makeup credit to use within the same season.\n\nCancel less than 4 hours before? You'll forfeit the class — no credit issued. We still encourage you to cancel in the app even past the cut-off, so we know you're not coming.\n\nDon't cancel at all and don't show up? That's a $20 no-show fee.\n\nTo cancel, go to My Classes, tap the booking, and hit Cancel.",
  },
  {
    icon: '🎫',
    label: 'How do makeup credits work?',
    answer: "If you cancel at least 4 hours before your class, you'll automatically get a makeup credit.\n\nYou can use that credit to book a catch-up class within the same season — credits don't carry over to future seasons, so make sure you use them!\n\nNot sure which classes you can catch up in? See 'What classes can I catch up in?' below.",
  },
  {
    icon: '🗓️',
    label: 'What classes can I catch up in?',
    answer: "Depends on your level! Here's what you can book into:\n\nLevel 1 — Level 1, Kiki, Unravel, Dance Virgin, Spin Virgin\nLevel 2 — Level 2, Kiki, Unravel, Dance Virgin/Dance, Spin Virgin, Invert Tech\nLevel 3 — Level 3, Kiki, Unravel, Dance Virgin/Dance, Spin Virgin, Invert Tech, Dirty Dance\nLevel 4 — Level 4, Kiki, Unravel, 4 Tricks, Dance Virgin/Dance, Invert Tech, Dirty Dance\nLevel 5 — Level 5, Kiki, Unravel, 4 Tricks, Dance Virgin/Dance, Invert Tech, 6 Virgin, Dirty Dance\nLevel 6 — Level 6, Kiki, Unravel, High Tricks, Dance, Dirty Dance\n\nFor specialty classes (Strip, Chair, Floor, Chole etc.) catch up in Kiki, Unravel, Dance Virgin, Spin Virgin, or Dirty Dance. For Strip/Strip Virgin you can also swap between those two.\n\nStill not sure? Email us.",
  },
  {
    icon: '🩰',
    label: "Why can't I join a class mid-season?",
    answer: "Levelled classes and most specialty classes (Strip, Chair, Floor, Chole) build toward a full routine over the season — each week adds to what came before, so joining too late means you'd be missing too much of the foundation.\n\nIf you're already enrolled and just missed a week, no stress — you can pick back up. But if you're looking to join fresh mid-season, you'll need to wait for the next one.\n\nIn the meantime, plenty of classes are open any time — see 'What classes can I catch up in?' above.",
  },
  {
    icon: '🤔',
    label: "I don't know what class I should do",
    answer: "Never done pole before? Start with a Virgin class — low pressure, beginner-friendly, and a great way to try it before committing to a full season. Ready to go all in? Level 1 is your starting point, no experience needed.\n\nDone pole before elsewhere? Email us at intrigued@dualitypole.com with a bit about your background and we'll place you in the right level.\n\nWant to explore beyond pole? Check out our specialty classes (Strip, Chair, Floor, Dance, Chole) and conditioning classes (Kiki, Unravel, and more) — there's something for every level and mood.",
  },
  {
    icon: '👜',
    label: 'What do I bring?',
    answer: "Every class: two towels (one for you, one to wipe down your equipment) and a water bottle — we have a water filter to refill but nothing to drink from if you forget.\n\nPole/tricks classes (Levels 1–6, Spin Virgin, Invert Tech etc.): bare legs to grip the pole, and grip aid — we have Griptinite at reception. Pleaser heels are always welcome but barefoot is fine too.\n\nSpecialty classes (Strip, Chair, Floor, Chole etc.): knee pads are recommended — we sell them at reception. Pleasers also great here.\n\nKiki & Unravel: just comfortable activewear, no grip needed.",
  },
  {
    icon: '📍',
    label: 'Where are you / how do I find you?',
    answer: "We're on Level 1 at 88 Kippax St, Surry Hills.\n\nHead through the double doors on Kippax St — you'll hit a small staircase. Turn right down the corridor and you'll find our very recognisable steps (yes, take a photo).\n\nReception is at the top. You're welcome to arrive up to 15 minutes before your class and wait there. Your instructor will let you into the studio 5 minutes before class starts.",
  },
  {
    icon: '🏋️',
    label: 'Can I book practice time?',
    answer: "Yes! Practice time is bookable through the app (look for it on the timetable).\n\nIf you're doing 3 or more classes a week, one practice session per week is on us. Otherwise it's $20 (or $15 cash) for enrolled students, and $30 (or $25 cash) for non-enrolled.\n\nMake sure you select your enrolled student package at checkout for the discount. If you want to pay cash, use the code IWANNAPAYCASH and pay at reception on the day.\n\nSame cancellation rules apply — cancel before the cut-off or your card will be charged.",
  },
  {
    icon: '📅',
    label: 'When do season enrolments open?',
    answer: "New season enrolments usually open around 4 weeks before the season starts. Current students get 48 hours of priority access before spots open to the public.\n\nKeep an eye on your notifications and email — we'll let you know as soon as enrolments are live.",
  },
  {
    icon: '🎬',
    label: 'Where are the routine videos?',
    answer: "Routine videos get uploaded around week 5 of the season.\n\nFind them in Progress → Resources, alongside your music playlist and warm-up guide.",
  },
  {
    icon: '💳',
    label: 'I have a billing question',
    answer: "You can view all your charges, credits, and payment history under Account → Billing history.\n\nIf something looks wrong, email us at intrigued@dualitypole.com with the date and amount and we'll look into it.",
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
