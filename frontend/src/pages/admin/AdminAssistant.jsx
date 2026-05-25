import { useState, useRef, useEffect } from 'react'
import { assistant } from '../../api'
import { useAuth } from '../../contexts/AuthContext'

const SUGGESTIONS = [
  'Sarah marked away from Level 3 Thursday but she can make it',
  'Move Jess from Level 2 Monday to Level 2 Thursday',
  "Who's coming to class today?",
  'Enrol Mia in Level 1 Wednesday',
  'Record a $270 cash payment from Bella',
  'Issue a makeup credit to Jake — he was sick',
  'Add a $20 no-show fee to Emma',
  "What's on the waitlist for Level 3?",
  'Show me all automations',
  'Create an automation: when a trial is booked, send a confirmation email',
]

function renderText(text) {
  // Convert **bold** markdown to <strong> spans
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  )
}

function ChatPane() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hey! I'm your studio assistant. I can look up students, update attendance, move people between classes, take payments, issue credits, check waitlists, create automations, and more. Try one of the suggestions above.` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function ask(query) {
    if (!query.trim() || loading) return
    setMessages(ms => [...ms, { role: 'user', text: query }])
    setInput('')
    setLoading(true)
    try {
      const res = await assistant.chat(query)
      const reply = res.data?.response || res.data?.reply || 'No response received.'
      setMessages(ms => [...ms, { role: 'assistant', text: reply }])
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Sorry, something went wrong. Please try again.'
      setMessages(ms => [...ms, { role: 'assistant', text: errMsg }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 8 }}>Try asking:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => ask(s)} style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: 'var(--white)', cursor: 'pointer' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: '#0d0d0d', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: msg.role === 'user' ? 'var(--lav)' : 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>
            <div style={{ background: '#1a1a1a', borderRadius: msg.role === 'user' ? '10px 0 10px 10px' : '0 10px 10px 10px', padding: '12px 14px', fontSize: 13, lineHeight: 1.6, maxWidth: '85%' }}>
              {msg.text.split('\n').map((line, j) => (
                <div key={j}>{line ? renderText(line) : <br />}</div>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>🤖</div>
            <div style={{ background: '#1a1a1a', borderRadius: '0 10px 10px 10px', padding: '12px 14px', fontSize: 13, color: 'var(--grey)' }}>Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask(input)}
          placeholder="Ask a question about your students or enrolments…"
          style={{ flex: 1, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', fontFamily: 'inherit', fontSize: 14, padding: '12px 16px' }}
        />
        <button className="btn btn-lime" onClick={() => ask(input)} disabled={loading}>Ask →</button>
      </div>
    </>
  )
}

function ChatHistoryPane() {
  const [users, setUsers] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [msgs, setMsgs] = useState(null)
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  useEffect(() => {
    assistant.chats().then(r => setUsers(r.data)).catch(() => setUsers([]))
  }, [])

  async function openUser(u) {
    setSelectedUser(u)
    setLoadingMsgs(true)
    try {
      const r = await assistant.userChats(u.user_id)
      setMsgs(r.data)
    } catch {
      setMsgs([])
    } finally {
      setLoadingMsgs(false)
    }
  }

  if (selectedUser) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedUser(null); setMsgs(null) }}>← Back</button>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedUser.user__display_name || `${selectedUser.user__first_name} ${selectedUser.user__last_name}`}</div>
          <span className="tag tag-grey" style={{ fontSize: 10 }}>{selectedUser.user__role}</span>
          <span style={{ fontSize: 12, color: 'var(--grey)', marginLeft: 'auto' }}>{selectedUser.message_count} messages</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', background: '#0d0d0d', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loadingMsgs && <div style={{ color: 'var(--grey)', fontSize: 13 }}>Loading…</div>}
          {msgs && msgs.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: msg.role === 'user' ? 'var(--lav)' : 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: msg.role === 'user' ? '10px 0 10px 10px' : '0 10px 10px 10px', padding: '10px 14px', fontSize: 13, lineHeight: 1.6, maxWidth: '85%' }}>
                {msg.escalated && <div style={{ fontSize: 10, color: 'var(--amber)', marginBottom: 4, fontWeight: 600 }}>ESCALATED TO STAFF</div>}
                {msg.content.split('\n').map((line, j) => (
                  <div key={j}>{line ? renderText(line) : <br />}</div>
                ))}
                <div style={{ fontSize: 10, color: 'var(--grey)', marginTop: 4 }}>{new Date(msg.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {users === null && <div style={{ color: 'var(--grey)', fontSize: 13 }}>Loading…</div>}
      {users && users.length === 0 && <div style={{ color: 'var(--grey)', fontSize: 13 }}>No chat history yet.</div>}
      {users && users.map(u => (
        <div key={u.user_id} onClick={() => openUser(u)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#111', borderRadius: 8, marginBottom: 8, cursor: 'pointer', border: '1px solid #222' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: u.user__role === 'student' ? 'var(--lav)' : 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
            {(u.user__display_name || u.user__first_name || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{u.user__display_name || `${u.user__first_name} ${u.user__last_name}`}</div>
            <div style={{ fontSize: 11, color: 'var(--grey)' }}>{u.user__role} · {u.message_count} messages</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--grey)' }}>{new Date(u.last_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</div>
        </div>
      ))}
    </div>
  )
}

export default function AdminAssistant() {
  const { user } = useAuth()
  const [tab, setTab] = useState('chat')
  const isAdmin = user?.role === 'admin'

  function clear() {
    setTab('chat') // re-mounting ChatPane clears it; use key trick below
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div>
          <div className="page-title">Assistant</div>
          <div className="page-sub">Ask anything about your students, enrolments, and data</div>
        </div>
        {tab === 'chat' && <button className="btn btn-ghost btn-sm" onClick={() => setTab('chat_reset')}>Clear Chat</button>}
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexShrink: 0 }}>
          <button onClick={() => setTab('chat')} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === 'chat' || tab === 'chat_reset' ? 'var(--lime)' : '#1a1a1a', color: tab === 'chat' || tab === 'chat_reset' ? '#000' : 'var(--grey)' }}>My Chat</button>
          <button onClick={() => setTab('history')} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === 'history' ? 'var(--lime)' : '#1a1a1a', color: tab === 'history' ? '#000' : 'var(--grey)' }}>Chat History</button>
        </div>
      )}

      {(tab === 'chat' || tab === 'chat_reset') && <ChatPane key={tab} />}
      {tab === 'history' && <ChatHistoryPane />}
    </div>
  )
}
