import { useState } from 'react'

const CONVOS = [
  { id: 1, name: 'Priya Sharma', avatar: 'PS', preview: 'Hi! Just wanted to check if there are spots still available for…', time: '2m', unread: 2, tag: 'new_student' },
  { id: 2, name: 'Katie Wu', avatar: 'KW', preview: 'Thanks for letting me know about the makeup class 😊', time: '14m', unread: 0, tag: null },
  { id: 3, name: 'Bianca Forde', avatar: 'BF', preview: 'I need to freeze my membership for 3 weeks starting July…', time: '1h', unread: 1, tag: 'billing' },
  { id: 4, name: 'Lily Anderson', avatar: 'LA', preview: 'Can I switch to the Wednesday 7pm class instead?', time: '2h', unread: 0, tag: null },
  { id: 5, name: 'Zara Nguyen', avatar: 'ZN', preview: 'When does Season 4 enrolment open?', time: '3h', unread: 0, tag: 'enquiry' },
  { id: 6, name: 'Mia Torres', avatar: 'MT', preview: 'I missed class last week — can I get a makeup credit?', time: '5h', unread: 0, tag: 'billing' },
  { id: 7, name: 'Rachel Kim', avatar: 'RK', preview: 'Are there any beginner classes coming up in the schedule?', time: '1d', unread: 0, tag: 'enquiry' },
  { id: 8, name: 'Sienna Park', avatar: 'SP', preview: 'Just paid the outstanding invoice! Sorry for the delay 🙏', time: '1d', unread: 0, tag: null },
]

const THREAD = {
  1: [
    { from: 'student', text: 'Hi! Just wanted to check if there are spots still available for the Monday 6pm Pole Foundations class?', time: '10:42 AM' },
    { from: 'student', text: "I'm a complete beginner but I've been wanting to try pole for ages 😊", time: '10:43 AM' },
    { from: 'admin', text: 'Hi Priya! Yes, we still have spots available for Monday 6pm — it\'s a great class for beginners. Would you like me to book you in for a trial first?', time: '10:51 AM' },
    { from: 'student', text: 'That would be amazing! How much is a trial class?', time: '10:54 AM' },
    { from: 'student', text: 'Also — do I need to bring anything?', time: '10:54 AM' },
  ],
  3: [
    { from: 'student', text: 'Hi there, I need to freeze my membership for 3 weeks starting from July 7th. Is that possible?', time: '9:15 AM' },
    { from: 'admin', text: "Hi Bianca! Absolutely, we can freeze your membership for up to 8 weeks. I'll process that now for July 7–28. You'll receive a confirmation email shortly.", time: '9:22 AM' },
    { from: 'student', text: 'Thank you so much! Will the freeze affect my Season 3 enrolment?', time: '9:30 AM' },
  ],
}

const STUDENT_CONTEXT = {
  1: { name: 'Priya Sharma', email: 'priya.sharma@gmail.com', status: 'Lead', enrolled: false, balance: 0, classes: 0, note: 'Interested in Pole Foundations. Booked trial 14 May.' },
  3: { name: 'Bianca Forde', email: 'bianca.forde@me.com', status: 'Active', enrolled: true, balance: -10, classes: 8, note: 'Freeze requested July 7–28. Season 3 student.' },
}

const QUICK_REPLIES = [
  'Trial is $25 — just wear active wear and bring grippy socks!',
  "I've processed your request — check your email for confirmation.",
  'Season 4 opens for enrolment on 14 July. Stay tuned!',
  'Happy to help — can you give me a bit more detail?',
]

const TAG_STYLE = {
  new_student: { label: 'New Student', cls: 'tag-lav' },
  billing: { label: 'Billing', cls: 'tag-amber' },
  enquiry: { label: 'Enquiry', cls: 'tag-lime' },
}

export default function AdminMessages() {
  const [activeConvo, setActiveConvo] = useState(CONVOS[0])
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [reply, setReply] = useState('')

  const filtered = CONVOS.filter(c => {
    if (tab === 'unread' && c.unread === 0) return false
    if (tab === 'unknown' && c.tag !== null) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const thread = THREAD[activeConvo?.id] || []
  const ctx = STUDENT_CONTEXT[activeConvo?.id]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      <div className="page-header" style={{ marginBottom: 0, paddingBottom: 16 }}>
        <div>
          <div className="page-title">Messages</div>
          <div className="page-sub">Student enquiries and conversations</div>
        </div>
        <button className="btn btn-lime btn-sm">+ New Message</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 260px', gap: 0, flex: 1, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {/* Left: convo list */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '7px 10px', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              {[['all', 'All'], ['unread', 'Unread'], ['unknown', 'Unknown']].map(([key, label]) => (
                <span key={key} onClick={() => setTab(key)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, cursor: 'pointer', background: tab === key ? 'var(--lime)' : '#1a1a1a', color: tab === key ? '#000' : 'var(--grey)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.map(c => (
              <div key={c.id} onClick={() => setActiveConvo(c)} style={{ padding: '12px 14px', borderBottom: '1px solid #111', cursor: 'pointer', background: activeConvo?.id === c.id ? '#161616' : 'transparent', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--lav)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{c.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: c.unread ? 700 : 500, fontSize: 13 }}>{c.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--grey)' }}>{c.time}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.preview}</div>
                  {c.tag && TAG_STYLE[c.tag] && (
                    <span className={`tag ${TAG_STYLE[c.tag].cls}`} style={{ fontSize: 9, marginTop: 4 }}>{TAG_STYLE[c.tag].label}</span>
                  )}
                </div>
                {c.unread > 0 && (
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--lime)', color: '#000', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.unread}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Middle: thread */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{activeConvo?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--grey)' }}>via email</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-xs">Mark resolved</button>
              <button className="btn btn-ghost btn-xs">Assign</button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {thread.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--grey)', fontSize: 12, marginTop: 40 }}>No messages yet</div>
            ) : thread.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'admin' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '72%', background: msg.from === 'admin' ? 'var(--lime)' : '#1a1a1a', color: msg.from === 'admin' ? '#000' : 'var(--white)', borderRadius: msg.from === 'admin' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '9px 13px', fontSize: 13, lineHeight: 1.5 }}>
                  {msg.text}
                  <div style={{ fontSize: 9, color: msg.from === 'admin' ? 'rgba(0,0,0,0.4)' : 'var(--grey)', marginTop: 4, textAlign: 'right' }}>{msg.time}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {QUICK_REPLIES.map((qr, i) => (
                <span key={i} onClick={() => setReply(qr)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--grey)', background: 'transparent', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                  {qr.slice(0, 28)}…
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                rows={2}
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Type a reply…"
                style={{ flex: 1, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '8px 12px', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit' }}
              />
              <button className="btn btn-lime btn-sm" onClick={() => setReply('')} style={{ alignSelf: 'flex-end' }}>Send</button>
            </div>
          </div>
        </div>

        {/* Right: student context */}
        <div style={{ padding: '16px', overflowY: 'auto' }}>
          {ctx ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--lav)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, margin: '0 auto 8px' }}>{activeConvo?.avatar}</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{ctx.name}</div>
                <div style={{ fontSize: 11, color: 'var(--grey)' }}>{ctx.email}</div>
                <span className={`tag ${ctx.enrolled ? 'tag-lime' : 'tag-lav'}`} style={{ fontSize: 10, marginTop: 6, display: 'inline-block' }}>{ctx.status}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[['Classes', ctx.classes], ['Balance', ctx.balance < 0 ? `-$${Math.abs(ctx.balance)}` : ctx.balance === 0 ? '$0' : `+$${ctx.balance}`]].map(([label, val]) => (
                  <div key={label} style={{ background: '#111', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: label === 'Balance' && ctx.balance < 0 ? 'var(--red)' : 'var(--white)' }}>{val}</div>
                    <div style={{ fontSize: 10, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 6, fontWeight: 600 }}>Notes</div>
              <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.6, marginBottom: 14 }}>{ctx.note}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="btn btn-ghost btn-xs" style={{ width: '100%' }}>View Full Profile</button>
                <button className="btn btn-ghost btn-xs" style={{ width: '100%' }}>Log Note</button>
                {ctx.balance < 0 && <button className="btn btn-xs" style={{ width: '100%', background: 'rgba(255,68,68,0.15)', color: 'var(--red)', border: '1px solid rgba(255,68,68,0.3)' }}>Send Payment Reminder</button>}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--grey)', fontSize: 12, marginTop: 40 }}>
              Select a conversation to see student details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
