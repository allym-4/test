import { useState } from 'react'

const CONVOS = [
  { id: 1, name: 'Mimi (Studio)', avatar: '🌟', preview: 'Hi! Just wanted to check in — how are you finding Season 3?', time: '1h', unread: 1, type: 'staff' },
  { id: 2, name: 'Chloe (Instructor)', avatar: '👩‍🏫', preview: 'Great work in class today! That mount is really improving 🙌', time: '2h', unread: 0, type: 'staff' },
  { id: 3, name: 'Katie Wu', avatar: 'KW', preview: 'Are you going to open practice on Saturday?', time: '3h', unread: 0, type: 'student' },
  { id: 4, name: 'Lily Anderson', avatar: 'LA', preview: 'Did you get the email about Season 4 yet?', time: '5h', unread: 0, type: 'student' },
]

const THREADS = {
  1: [
    { from: 'them', text: 'Hi! Just wanted to check in — how are you finding Season 3 so far?', time: '10:00 AM' },
    { from: 'me', text: "I'm absolutely loving it! The classes are so much fun and I can already feel myself getting stronger 💪", time: '10:15 AM' },
    { from: 'them', text: "That's so great to hear! You've been working really hard. Are there any particular moves you'd like to focus on?", time: '10:20 AM' },
  ],
  2: [
    { from: 'them', text: 'Great work in class today! That shoulder mount is really improving. Keep up the consistent training 🙌', time: '7:45 PM' },
    { from: 'me', text: 'Thank you so much Chloe!! Your feedback in class really helps 😊', time: '8:10 PM' },
  ],
  3: [
    { from: 'them', text: 'Hey! Are you going to the open practice session on Saturday?', time: '2:30 PM' },
    { from: 'me', text: 'Yes!! Planning to be there around 11:30. You?', time: '2:45 PM' },
    { from: 'them', text: 'Same! See you there 🎉', time: '2:46 PM' },
  ],
}

export default function StudentChat() {
  const [activeConvo, setActiveConvo] = useState(CONVOS[0])
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState('all')

  const thread = THREADS[activeConvo?.id] || []
  const filtered = CONVOS.filter(c => tab === 'all' || (tab === 'staff' ? c.type === 'staff' : c.type === 'student'))

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Messages</div>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>Chat with studio staff and classmates</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 0, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', height: 'calc(100vh - 180px)' }}>
        {/* Left: conversation list */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6 }}>
            {[['all', 'All'], ['staff', 'Studio'], ['student', 'Students']].map(([key, label]) => (
              <span key={key} onClick={() => setTab(key)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, cursor: 'pointer', background: tab === key ? 'var(--lime)' : '#1a1a1a', color: tab === key ? '#000' : 'var(--grey)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label}
              </span>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.map(c => (
              <div key={c.id} onClick={() => setActiveConvo(c)} style={{ padding: '12px 14px', borderBottom: '1px solid #111', cursor: 'pointer', background: activeConvo?.id === c.id ? '#161616' : 'transparent', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: c.type === 'staff' ? 'var(--lime)' : 'var(--lav)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: c.avatar.length > 2 ? 18 : 11, fontWeight: 700, flexShrink: 0 }}>
                  {c.avatar}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: c.unread ? 700 : 500, fontSize: 13 }}>{c.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--grey)' }}>{c.time}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.preview}</div>
                </div>
                {c.unread > 0 && (
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--lime)', color: '#000', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.unread}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: thread */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: activeConvo?.type === 'staff' ? 'var(--lime)' : 'var(--lav)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: activeConvo?.avatar.length > 2 ? 16 : 10, fontWeight: 700 }}>
              {activeConvo?.avatar}
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{activeConvo?.name}</div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {thread.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'me' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '72%', background: msg.from === 'me' ? 'var(--lime)' : '#1a1a1a', color: msg.from === 'me' ? '#000' : 'var(--white)', borderRadius: msg.from === 'me' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '9px 13px', fontSize: 13, lineHeight: 1.5 }}>
                  {msg.text}
                  <div style={{ fontSize: 9, color: msg.from === 'me' ? 'rgba(0,0,0,0.4)' : 'var(--grey)', marginTop: 4, textAlign: 'right' }}>{msg.time}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Type a message…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setMessage('')}
              style={{ flex: 1, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--white)', padding: '9px 16px', fontSize: 13, outline: 'none' }}
            />
            <button className="btn btn-lime btn-sm" onClick={() => setMessage('')}>Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}
