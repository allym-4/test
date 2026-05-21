import { useState, useEffect, useRef } from 'react'
import { helpdesk, assistant } from '../../api'
import { useAuth } from '../../contexts/AuthContext'

export default function StudentChat() {
  const { user: me } = useAuth()

  // Thread state
  const [activeThread, setActiveThread] = useState('assistant') // 'assistant' | 'human'

  // Human thread state (existing)
  const [conv, setConv] = useState(null)
  const [loading, setLoading] = useState(true)
  const [humanMessage, setHumanMessage] = useState('')
  const [sending, setSending] = useState(false)
  const humanThreadRef = useRef(null)

  // AI assistant thread state
  const [aiMessages, setAiMessages] = useState([
    {
      id: 'greeting',
      role: 'bot',
      body: `Hi ${me?.first_name || 'there'}! I'm the Duality assistant. Ask me anything about classes, bookings, or studio policies.`,
    },
  ])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const aiThreadRef = useRef(null)

  async function loadHuman() {
    try {
      const r = await helpdesk.myConversation()
      setConv(r.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadHuman() }, [])

  useEffect(() => {
    if (humanThreadRef.current) humanThreadRef.current.scrollTop = humanThreadRef.current.scrollHeight
  }, [conv?.messages])

  useEffect(() => {
    if (aiThreadRef.current) aiThreadRef.current.scrollTop = aiThreadRef.current.scrollHeight
  }, [aiMessages])

  // Send to human thread
  async function sendHuman() {
    if (!humanMessage.trim() || sending) return
    setSending(true)
    const text = humanMessage
    setHumanMessage('')
    try {
      const r = await helpdesk.sendMyDm({ body: text })
      setConv(prev => ({ ...prev, messages: [...(prev?.messages || []), r.data] }))
    } finally {
      setSending(false)
    }
  }

  function handleHumanKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendHuman() }
  }

  // Send to AI assistant
  async function sendAi() {
    if (!aiInput.trim() || aiLoading) return
    const text = aiInput
    setAiInput('')
    setAiMessages(prev => [...prev, { id: Date.now(), role: 'user', body: text }])
    setAiLoading(true)
    const start = Date.now()
    try {
      const { data } = await assistant.chat(text)
      const elapsed = Date.now() - start
      if (elapsed < 1000) await new Promise(res => setTimeout(res, 1000 - elapsed))
      setAiMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', body: data.response || data.message || 'Sorry, I couldn\'t process that.' }])
    } catch {
      setAiMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', body: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setAiLoading(false)
    }
  }

  function handleAiKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAi() }
  }

  const humanMessages = conv?.messages || []

  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)

  const threads = [
    {
      id: 'assistant',
      name: 'Duality Assistant',
      avatar: '🤖',
      avatarBg: 'var(--lav)',
      sub: 'AI powered',
    },
    {
      id: 'human',
      name: 'Mimi & Chloe',
      avatar: 'D',
      avatarBg: 'var(--lime)',
      avatarColor: '#000',
      sub: 'Speak to Mimi & Chloe',
    },
  ]

  function selectThread(id) {
    setActiveThread(id)
    setMobilePanelOpen(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Messages</div>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>Chat with the studio team</div>
      </div>

      <div className="split-layout" style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 12, minHeight: 0 }}>
        {/* Sidebar */}
        <div className={`split-sidebar${mobilePanelOpen ? ' mobile-panel-open' : ''}`} style={{ width: 260, borderRight: '1px solid var(--border)' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', fontWeight: 500 }}>
            Conversations
          </div>
          {threads.map(t => (
            <div
              key={t.id}
              onClick={() => selectThread(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                cursor: 'pointer',
                borderLeft: activeThread === t.id ? '3px solid var(--lime)' : '3px solid transparent',
                background: activeThread === t.id ? '#111' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: t.avatarBg,
                color: t.avatarColor || '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {t.avatar}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 1 }}>{t.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Right pane */}
        <div className={`split-main${!mobilePanelOpen ? ' mobile-list-showing' : ''}`}>

          {/* ── AI Assistant thread ── */}
          {activeThread === 'assistant' && (
            <>
              {/* Header */}
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="mobile-back-btn" onClick={() => setMobilePanelOpen(false)}>← Back</button>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--lav)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  🤖
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Duality Assistant</div>
                  <div style={{ fontSize: 11, color: 'var(--grey)' }}>AI helper · usually instant</div>
                </div>
              </div>

              {/* Thread */}
              <div ref={aiThreadRef} style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {aiMessages.map(msg => (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '72%',
                      background: msg.role === 'user' ? 'var(--lime)' : '#1a1a1a',
                      color: msg.role === 'user' ? '#000' : 'var(--white)',
                      borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      padding: '9px 13px',
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}>
                      {msg.body}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ background: '#1a1a1a', borderRadius: '12px 12px 12px 2px', padding: '10px 16px', fontSize: 18, letterSpacing: 2, color: 'var(--grey)' }}>
                      ...
                    </div>
                  </div>
                )}

                {/* Human handoff nudge */}
                <div style={{ background: '#0d0d0d', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginTop: 4 }}>
                  <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 10 }}>Need something I can't handle — like changing your level or a custom question?</div>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--lav)', color: '#000', fontSize: 12 }}
                    onClick={() => setActiveThread('human')}
                  >
                    Speak to Mimi &amp; Chloe
                  </button>
                </div>
              </div>

              {/* Input */}
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Ask the assistant…"
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={handleAiKey}
                  style={{ flex: 1, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--white)', padding: '9px 16px', fontSize: 13, outline: 'none' }}
                />
                <button className="btn btn-lime btn-sm" onClick={sendAi} disabled={aiLoading || !aiInput.trim()}>
                  {aiLoading ? '…' : 'Send'}
                </button>
              </div>
            </>
          )}

          {/* ── Human / studio thread ── */}
          {activeThread === 'human' && (
            <>
              {/* Header */}
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="mobile-back-btn" onClick={() => setMobilePanelOpen(false)}>← Back</button>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--lime)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                  D
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Mimi &amp; Chloe</div>
                  <div style={{ fontSize: 11, color: 'var(--grey)' }}>Speak to Mimi & Chloe · Usually replies within a few hours</div>
                </div>
              </div>

              {/* Thread */}
              <div ref={humanThreadRef} style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {loading ? (
                  <div style={{ textAlign: 'center', color: 'var(--grey)', fontSize: 12, marginTop: 40 }}>Loading…</div>
                ) : humanMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--grey)', fontSize: 12, marginTop: 60 }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Send us a message</div>
                    <div>We'd love to hear from you!</div>
                  </div>
                ) : humanMessages.map(msg => {
                  const isMe = msg.sender === me?.id
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '72%',
                        background: isMe ? 'var(--lime)' : '#1a1a1a',
                        color: isMe ? '#000' : 'var(--white)',
                        borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        padding: '9px 13px',
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}>
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
                  value={humanMessage}
                  onChange={e => setHumanMessage(e.target.value)}
                  onKeyDown={handleHumanKey}
                  style={{ flex: 1, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--white)', padding: '9px 16px', fontSize: 13, outline: 'none' }}
                />
                <button className="btn btn-lime btn-sm" onClick={sendHuman} disabled={sending || !humanMessage.trim()}>
                  {sending ? '…' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
