import { useState } from 'react'

const TICKETS = [
  { id: 'HD-041', subject: 'Cannot book into Wednesday class', student: 'Lily Anderson', avatar: 'LA', email: 'lily.a@gmail.com', status: 'open', priority: 'high', category: 'Booking', created: '12 May, 9:14 AM', lastReply: '12 May, 10:02 AM', assigned: 'Mimi' },
  { id: 'HD-040', subject: 'Charge appeared on my account', student: 'Bianca Forde', avatar: 'BF', email: 'bianca.forde@me.com', status: 'open', priority: 'high', category: 'Billing', created: '11 May, 4:30 PM', lastReply: '11 May, 5:15 PM', assigned: 'Mimi' },
  { id: 'HD-039', subject: 'How do I freeze my membership?', student: 'Zara Nguyen', avatar: 'ZN', email: 'zara.n@gmail.com', status: 'pending', priority: 'medium', category: 'Membership', created: '11 May, 2:10 PM', lastReply: '11 May, 2:45 PM', assigned: 'Chloe' },
  { id: 'HD-038', subject: 'Makeup class credit not showing', student: 'Katie Wu', avatar: 'KW', email: 'katiewu@hotmail.com', status: 'pending', priority: 'medium', category: 'Billing', created: '10 May, 11:30 AM', lastReply: '10 May, 12:00 PM', assigned: 'Mimi' },
  { id: 'HD-037', subject: 'Question about Season 4 dates', student: 'Rachel Kim', avatar: 'RK', email: 'rachk@gmail.com', status: 'resolved', priority: 'low', category: 'General', created: '9 May, 3:00 PM', lastReply: '9 May, 3:45 PM', assigned: 'Mimi' },
  { id: 'HD-036', subject: 'App not loading on mobile', student: 'Mia Torres', avatar: 'MT', email: 'mia.torres@outlook.com', status: 'resolved', priority: 'low', category: 'Technical', created: '8 May, 9:00 AM', lastReply: '8 May, 11:30 AM', assigned: 'Chloe' },
]

const THREADS = {
  'HD-041': [
    { from: 'student', text: "Hi, I've been trying to book into the Wednesday 6pm class but it keeps saying 'enrolment closed'. I'm a current Season 3 student — is there something wrong?", time: '9:14 AM' },
    { from: 'admin', text: "Hi Lily! Thanks for reaching out. Let me check your account right now. Can you confirm which class specifically? Is it Pole Foundations or Intermediate Flows on Wednesday?", time: '9:28 AM' },
    { from: 'student', text: "It's the Intermediate Flows at 6pm. I've been in this class all season — it's weird that it's showing as closed.", time: '10:02 AM' },
  ],
  'HD-040': [
    { from: 'student', text: "Hi, I just noticed a $20 charge on my account that I don't recognise. I attended every class this month so I'm not sure what this is for.", time: '4:30 PM' },
    { from: 'admin', text: "Hi Bianca! I can see the charge was applied on May 9th. Looking at our records, it appears to be a no-show fee from the April 28th class. I'll look into this further and get back to you.", time: '5:15 PM' },
  ],
}

const STATUS_STYLE = {
  open: { label: 'Open', cls: 'tag-red' },
  pending: { label: 'Pending', cls: 'tag-amber' },
  resolved: { label: 'Resolved', cls: 'tag-lime' },
}

const PRIORITY_COLOR = { high: 'var(--red)', medium: 'var(--amber)', low: 'var(--grey)' }

export default function AdminHelpdesk() {
  const [activeTicket, setActiveTicket] = useState(TICKETS[0])
  const [filter, setFilter] = useState('all')
  const [reply, setReply] = useState('')

  const filtered = TICKETS.filter(t => filter === 'all' || t.status === filter)
  const thread = THREADS[activeTicket?.id] || []

  const openCount = TICKETS.filter(t => t.status === 'open').length
  const pendingCount = TICKETS.filter(t => t.status === 'pending').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      <div className="page-header" style={{ marginBottom: 0, paddingBottom: 16 }}>
        <div>
          <div className="page-title">Helpdesk</div>
          <div className="page-sub">Student support tickets</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--grey)' }}>{openCount} open · {pendingCount} pending</span>
          <button className="btn btn-lime btn-sm">+ New Ticket</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 260px', gap: 0, flex: 1, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {/* Left: ticket list */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[['all', 'All'], ['open', 'Open'], ['pending', 'Pending'], ['resolved', 'Resolved']].map(([key, label]) => (
              <span key={key} onClick={() => setFilter(key)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, cursor: 'pointer', background: filter === key ? 'var(--lime)' : '#1a1a1a', color: filter === key ? '#000' : 'var(--grey)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label}
              </span>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.map(t => (
              <div key={t.id} onClick={() => setActiveTicket(t)} style={{ padding: '12px 14px', borderBottom: '1px solid #111', cursor: 'pointer', background: activeTicket?.id === t.id ? '#161616' : 'transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--grey)' }}>{t.id}</span>
                  <span className={`tag ${STATUS_STYLE[t.status].cls}`} style={{ fontSize: 9 }}>{STATUS_STYLE[t.status].label}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 4 }}>{t.student}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--grey)' }}>{t.category}</span>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLOR[t.priority] }} title={`${t.priority} priority`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: thread */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
          {activeTicket && (
            <>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{activeTicket.subject}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)' }}>{activeTicket.student} · {activeTicket.created}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {activeTicket.status !== 'resolved' && <button className="btn btn-ghost btn-xs">Resolve</button>}
                    <button className="btn btn-ghost btn-xs">Assign</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className={`tag ${STATUS_STYLE[activeTicket.status].cls}`} style={{ fontSize: 9 }}>{STATUS_STYLE[activeTicket.status].label}</span>
                  <span className="tag tag-grey" style={{ fontSize: 9 }}>{activeTicket.category}</span>
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'transparent', color: PRIORITY_COLOR[activeTicket.priority], fontWeight: 700, textTransform: 'uppercase' }}>{activeTicket.priority} priority</span>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {thread.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--grey)', fontSize: 12, marginTop: 40 }}>No messages in this ticket</div>
                ) : thread.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'admin' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '75%', background: msg.from === 'admin' ? 'var(--lime)' : '#1a1a1a', color: msg.from === 'admin' ? '#000' : 'var(--white)', borderRadius: msg.from === 'admin' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '10px 14px', fontSize: 13, lineHeight: 1.5 }}>
                      {msg.text}
                      <div style={{ fontSize: 9, color: msg.from === 'admin' ? 'rgba(0,0,0,0.4)' : 'var(--grey)', marginTop: 4, textAlign: 'right' }}>{msg.time}</div>
                    </div>
                  </div>
                ))}
              </div>

              {activeTicket.status !== 'resolved' && (
                <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                  <textarea
                    rows={2}
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Type a reply…"
                    style={{ flex: 1, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '8px 12px', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button className="btn btn-lime btn-sm" onClick={() => setReply('')}>Reply</button>
                    <button className="btn btn-ghost btn-xs">Resolve</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: ticket details */}
        <div style={{ padding: '16px', overflowY: 'auto' }}>
          {activeTicket && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 8, fontWeight: 600 }}>Student</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--lav)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{activeTicket.avatar}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{activeTicket.student}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)' }}>{activeTicket.email}</div>
                  </div>
                </div>
                <button className="btn btn-ghost btn-xs" style={{ width: '100%' }}>View Profile</button>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 10, fontWeight: 600 }}>Ticket Details</div>
                {[
                  ['Ticket ID', activeTicket.id],
                  ['Category', activeTicket.category],
                  ['Priority', activeTicket.priority.charAt(0).toUpperCase() + activeTicket.priority.slice(1)],
                  ['Assigned to', activeTicket.assigned],
                  ['Created', activeTicket.created],
                  ['Last Reply', activeTicket.lastReply],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '1px solid #111' }}>
                    <span style={{ color: 'var(--grey)' }}>{label}</span>
                    <span style={{ fontWeight: 500, textAlign: 'right' }}>{val}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="btn btn-ghost btn-xs" style={{ width: '100%' }}>Change Priority</button>
                <button className="btn btn-ghost btn-xs" style={{ width: '100%' }}>Add Internal Note</button>
                <button className="btn btn-ghost btn-xs" style={{ width: '100%', color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }}>Close Ticket</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
