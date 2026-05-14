import { useState, useEffect, useRef } from 'react'
import { useApi } from '../hooks/useApi'
import { helpdesk } from '../api'

function ConversationList({ selected, onSelect }) {
  const { data, loading } = useApi(() => helpdesk.conversations())

  const convs = data?.results || data || []

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>

  if (convs.length === 0) {
    return <div style={{ padding: 24, color: 'var(--grey)', fontSize: 13 }}>No conversations yet.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {convs.map(c => {
        const isActive = selected?.id === c.id
        const lastMsg = c.last_message
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            style={{
              background: isActive ? 'rgba(204,255,0,0.06)' : 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              padding: '14px 16px',
              textAlign: 'left',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? 'var(--lime)' : 'var(--white)' }}>
                {c.student_name || c.student?.display_name || `Student #${c.student}`}
              </span>
              {c.unread_count > 0 && (
                <span style={{ background: 'var(--lime)', color: '#000', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 7px' }}>
                  {c.unread_count}
                </span>
              )}
            </div>
            {lastMsg && (
              <div style={{ fontSize: 11, color: 'var(--grey)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lastMsg.body}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

function Thread({ conv }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!conv) return
    setLoading(true)
    helpdesk.dms(conv.id).then(res => {
      const msgs = res.data?.results || res.data || []
      setMessages(msgs)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [conv?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    try {
      const res = await helpdesk.sendDm(conv.id, { body: text.trim() })
      setMessages(m => [...m, res.data])
      setText('')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--grey)', fontSize: 13, paddingTop: 40 }}>No messages yet. Say hello!</div>
        )}
        {messages.map(m => {
          const fromStudent = m.sender_role === 'student' || m.sender?.role === 'student'
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: fromStudent ? 'flex-start' : 'flex-end' }}>
              <div style={{
                maxWidth: '72%',
                background: fromStudent ? 'var(--card)' : 'rgba(204,255,0,0.1)',
                border: `1px solid ${fromStudent ? 'var(--border)' : 'rgba(204,255,0,0.25)'}`,
                borderRadius: 12,
                padding: '10px 14px',
              }}>
                {fromStudent && (
                  <div style={{ fontSize: 10, color: 'var(--grey)', marginBottom: 4 }}>
                    {m.sender?.display_name || conv.student_name}
                  </div>
                )}
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{m.body}</div>
                <div style={{ fontSize: 10, color: 'var(--grey)', marginTop: 4, textAlign: 'right' }}>
                  {m.created_at ? new Date(m.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', gap: 10 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message…"
          style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', color: 'var(--white)', fontSize: 13, outline: 'none' }}
        />
        <button type="submit" className="btn btn-lime btn-sm" disabled={!text.trim() || sending}>
          Send
        </button>
      </form>
    </div>
  )
}

export default function InstructorMessages() {
  const [selected, setSelected] = useState(null)

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Messages</div>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>Student conversations</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '280px 1fr' : '1fr', gap: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', minHeight: 480 }}>
        <div style={{ borderRight: selected ? '1px solid var(--border)' : 'none', overflowY: 'auto' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', fontWeight: 600 }}>
            Conversations
          </div>
          <ConversationList selected={selected} onSelect={setSelected} />
        </div>

        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14 }}>
              {selected.student_name || `Student #${selected.student}`}
              <button onClick={() => setSelected(null)} style={{ float: 'right', background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <Thread conv={selected} />
          </div>
        )}
      </div>
    </div>
  )
}
