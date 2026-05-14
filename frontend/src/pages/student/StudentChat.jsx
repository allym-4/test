import { useState, useEffect, useRef } from 'react'
import { helpdesk } from '../../api'
import { useAuth } from '../../contexts/AuthContext'

export default function StudentChat() {
  const { user: me } = useAuth()
  const [conv, setConv] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const threadRef = useRef(null)

  async function load() {
    try {
      const r = await helpdesk.myConversation()
      setConv(r.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [conv?.messages])

  async function send() {
    if (!message.trim() || sending) return
    setSending(true)
    const text = message
    setMessage('')
    try {
      const r = await helpdesk.sendMyDm({ body: text })
      setConv(prev => ({ ...prev, messages: [...(prev?.messages || []), r.data] }))
    } finally {
      setSending(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const messages = conv?.messages || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Messages</div>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>Chat with the studio team</div>
      </div>

      <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--lime)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
            🌟
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Duality Pole Studio</div>
            <div style={{ fontSize: 11, color: 'var(--grey)' }}>Studio team · Usually replies within a few hours</div>
          </div>
        </div>

        {/* Thread */}
        <div ref={threadRef} style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--grey)', fontSize: 12, marginTop: 40 }}>Loading…</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--grey)', fontSize: 12, marginTop: 60 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Send us a message</div>
              <div>We'd love to hear from you!</div>
            </div>
          ) : messages.map(msg => {
            const isMe = msg.sender === me?.id
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '72%', background: isMe ? 'var(--lime)' : '#1a1a1a', color: isMe ? '#000' : 'var(--white)', borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '9px 13px', fontSize: 13, lineHeight: 1.5 }}>
                  {msg.body}
                  <div style={{ fontSize: 9, color: isMe ? 'rgba(0,0,0,0.4)' : 'var(--grey)', marginTop: 4, textAlign: 'right' }}>
                    {msg.sender_detail?.display_name} · {new Date(msg.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Input */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Type a message…"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKey}
            style={{ flex: 1, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--white)', padding: '9px 16px', fontSize: 13, outline: 'none' }}
          />
          <button className="btn btn-lime btn-sm" onClick={send} disabled={sending || !message.trim()}>
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
