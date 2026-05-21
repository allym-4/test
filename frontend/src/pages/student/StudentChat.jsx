import { useState, useEffect, useRef } from 'react'
import { helpdesk, assistant } from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { useSearchParams } from 'react-router-dom'

export default function StudentChat() {
  const { user: me } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Derive initial active thread from URL params
  const paramInstructorId = searchParams.get('instructor')
  const paramInstructorName = searchParams.get('name') || 'my teacher'

  const [activeThread, setActiveThread] = useState(paramInstructorId ? `instructor_${paramInstructorId}` : 'assistant')

  // Human (studio) thread
  const [conv, setConv] = useState(null)
  const [loadingHuman, setLoadingHuman] = useState(false)
  const [humanMessage, setHumanMessage] = useState('')
  const [sendingHuman, setSendingHuman] = useState(false)
  const humanThreadRef = useRef(null)

  // Instructor threads: { [instructorId]: { conv, loading, message, sending } }
  const [instructorConvs, setInstructorConvs] = useState({})

  // AI assistant thread
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

  const [mobilePanelOpen, setMobilePanelOpen] = useState(!!paramInstructorId)

  // Load studio conversation
  async function loadHuman() {
    setLoadingHuman(true)
    try {
      const r = await helpdesk.myConversation()
      setConv(r.data)
    } finally {
      setLoadingHuman(false)
    }
  }

  // Load instructor-specific conversation
  async function loadInstructorConv(instructorId) {
    setInstructorConvs(prev => ({ ...prev, [instructorId]: { ...(prev[instructorId] || {}), loading: true } }))
    try {
      const r = await helpdesk.myConversation(instructorId)
      setInstructorConvs(prev => ({ ...prev, [instructorId]: { ...(prev[instructorId] || {}), conv: r.data, loading: false } }))
    } catch {
      setInstructorConvs(prev => ({ ...prev, [instructorId]: { ...(prev[instructorId] || {}), loading: false } }))
    }
  }

  useEffect(() => {
    loadHuman()
    // If arriving with an instructor param, pre-load that conversation
    if (paramInstructorId) {
      loadInstructorConv(paramInstructorId)
      // Clean up URL params without navigating away
      setSearchParams({}, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (humanThreadRef.current) humanThreadRef.current.scrollTop = humanThreadRef.current.scrollHeight
  }, [conv?.messages])

  useEffect(() => {
    if (aiThreadRef.current) aiThreadRef.current.scrollTop = aiThreadRef.current.scrollHeight
  }, [aiMessages])

  function selectThread(id) {
    setActiveThread(id)
    setMobilePanelOpen(true)
    if (id.startsWith('instructor_')) {
      const instructorId = id.replace('instructor_', '')
      if (!instructorConvs[instructorId]) {
        loadInstructorConv(instructorId)
      }
    }
  }

  async function sendHuman() {
    if (!humanMessage.trim() || sendingHuman) return
    setSendingHuman(true)
    const text = humanMessage
    setHumanMessage('')
    try {
      const r = await helpdesk.sendMyDm({ body: text })
      setConv(prev => ({ ...prev, messages: [...(prev?.messages || []), r.data] }))
    } finally {
      setSendingHuman(false)
    }
  }

  function handleHumanKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendHuman() }
  }

  async function sendInstructor(instructorId) {
    const state = instructorConvs[instructorId]
    const text = state?.message?.trim()
    if (!text || state?.sending) return
    setInstructorConvs(prev => ({ ...prev, [instructorId]: { ...prev[instructorId], sending: true, message: '' } }))
    try {
      const r = await helpdesk.sendMyDm({ body: text, instructor_id: instructorId })
      const newMsg = r.data
      setInstructorConvs(prev => ({
        ...prev,
        [instructorId]: {
          ...prev[instructorId],
          sending: false,
          conv: {
            ...prev[instructorId]?.conv,
            messages: [...(prev[instructorId]?.conv?.messages || []), newMsg],
          },
        },
      }))
    } catch {
      setInstructorConvs(prev => ({ ...prev, [instructorId]: { ...prev[instructorId], sending: false } }))
    }
  }

  function handleInstructorKey(e, instructorId) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendInstructor(instructorId) }
  }

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
      setAiMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', body: data.response || data.message || "Sorry, I couldn't process that." }])
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

  // Build thread list — static entries + any instructor entries
  const instructorEntries = Object.entries(instructorConvs).map(([id, state]) => {
    const firstMsg = state.conv?.messages?.[0]
    const instructorName = state.conv?.instructor_detail?.display_name || state.conv?.instructor_detail?.first_name
      || (paramInstructorId === id ? paramInstructorName : `Instructor`)
    return { id: `instructor_${id}`, instructorId: id, name: instructorName, sub: 'Your teacher', lastMsg: firstMsg }
  })

  // If we have a param instructor not yet in convs, add a placeholder thread
  const placeholderEntry = paramInstructorId && !instructorConvs[paramInstructorId]
    ? [{ id: `instructor_${paramInstructorId}`, instructorId: paramInstructorId, name: paramInstructorName, sub: 'Your teacher', lastMsg: null }]
    : []

  const allInstructorEntries = [
    ...placeholderEntry,
    ...instructorEntries.filter(e => e.instructorId !== paramInstructorId || instructorConvs[paramInstructorId]),
  ]

  const threads = [
    { id: 'assistant', name: 'Duality Assistant', avatar: '🤖', avatarBg: 'var(--lav)', sub: 'AI powered' },
    { id: 'studio', name: 'Mimi & Chloe', avatar: 'D', avatarBg: 'var(--lime)', avatarColor: '#000', sub: 'Studio team' },
    ...allInstructorEntries.map(e => ({
      id: e.id, name: e.name, avatar: (e.name || 'T')[0].toUpperCase(), avatarBg: '#2a2a2a', avatarColor: '#ccff00', sub: e.sub,
    })),
  ]

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
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer',
                borderLeft: activeThread === t.id ? '3px solid var(--lime)' : '3px solid transparent',
                background: activeThread === t.id ? '#111' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: t.avatarBg, color: t.avatarColor || '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
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

          {/* ── AI Assistant ── */}
          {activeThread === 'assistant' && (
            <>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="mobile-back-btn" onClick={() => setMobilePanelOpen(false)}>← Back</button>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--lav)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🤖</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Duality Assistant</div>
                  <div style={{ fontSize: 11, color: 'var(--grey)' }}>AI helper · usually instant</div>
                </div>
              </div>
              <div ref={aiThreadRef} style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {aiMessages.map(msg => (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '72%', background: msg.role === 'user' ? 'var(--lime)' : '#1a1a1a', color: msg.role === 'user' ? '#000' : 'var(--white)', borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '9px 13px', fontSize: 13, lineHeight: 1.5 }}>
                      {msg.body}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ background: '#1a1a1a', borderRadius: '12px 12px 12px 2px', padding: '10px 16px', fontSize: 18, letterSpacing: 2, color: 'var(--grey)' }}>...</div>
                  </div>
                )}
                <div style={{ background: '#0d0d0d', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginTop: 4 }}>
                  <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 10 }}>Need something I can't handle? Speak to the studio team.</div>
                  <button className="btn btn-sm" style={{ background: 'var(--lav)', color: '#000', fontSize: 12 }} onClick={() => selectThread('studio')}>
                    Speak to Mimi &amp; Chloe
                  </button>
                </div>
              </div>
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                <input type="text" placeholder="Ask the assistant…" value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={handleAiKey} style={{ flex: 1, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--white)', padding: '9px 16px', fontSize: 13, outline: 'none' }} />
                <button className="btn btn-lime btn-sm" onClick={sendAi} disabled={aiLoading || !aiInput.trim()}>{aiLoading ? '…' : 'Send'}</button>
              </div>
            </>
          )}

          {/* ── Studio team (Mimi & Chloe) ── */}
          {activeThread === 'studio' && (
            <>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="mobile-back-btn" onClick={() => setMobilePanelOpen(false)}>← Back</button>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--lime)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>D</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Mimi &amp; Chloe</div>
                  <div style={{ fontSize: 11, color: 'var(--grey)' }}>Usually replies within a few hours</div>
                </div>
              </div>
              <div ref={humanThreadRef} style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {loadingHuman ? (
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
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                <input type="text" placeholder="Type a message…" value={humanMessage} onChange={e => setHumanMessage(e.target.value)} onKeyDown={handleHumanKey} style={{ flex: 1, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--white)', padding: '9px 16px', fontSize: 13, outline: 'none' }} />
                <button className="btn btn-lime btn-sm" onClick={sendHuman} disabled={sendingHuman || !humanMessage.trim()}>{sendingHuman ? '…' : 'Send'}</button>
              </div>
            </>
          )}

          {/* ── Instructor thread ── */}
          {activeThread.startsWith('instructor_') && (() => {
            const instructorId = activeThread.replace('instructor_', '')
            const state = instructorConvs[instructorId] || {}
            const messages = state.conv?.messages || []
            const instructorDetail = state.conv?.instructor_detail
            const instructorName = instructorDetail?.display_name || instructorDetail?.first_name
              || (paramInstructorId === instructorId ? paramInstructorName : 'Your teacher')
            return (
              <>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button className="mobile-back-btn" onClick={() => setMobilePanelOpen(false)}>← Back</button>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2a2a2a', color: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                    {(instructorName || 'T')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{instructorName}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)' }}>Your instructor</div>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {state.loading ? (
                    <div style={{ textAlign: 'center', color: 'var(--grey)', fontSize: 12, marginTop: 40 }}>Loading…</div>
                  ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--grey)', fontSize: 12, marginTop: 60 }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Say hello to {instructorName}!</div>
                      <div>Your message goes directly to your instructor.</div>
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
                <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder={`Message ${instructorName}…`}
                    value={state.message || ''}
                    onChange={e => setInstructorConvs(prev => ({ ...prev, [instructorId]: { ...prev[instructorId], message: e.target.value } }))}
                    onKeyDown={e => handleInstructorKey(e, instructorId)}
                    style={{ flex: 1, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--white)', padding: '9px 16px', fontSize: 13, outline: 'none' }}
                  />
                  <button className="btn btn-lime btn-sm" onClick={() => sendInstructor(instructorId)} disabled={state.sending || !state.message?.trim()}>
                    {state.sending ? '…' : 'Send'}
                  </button>
                </div>
              </>
            )
          })()}

          {/* Empty state */}
          {!mobilePanelOpen && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--grey)', fontSize: 13 }}>
              Select a conversation
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
