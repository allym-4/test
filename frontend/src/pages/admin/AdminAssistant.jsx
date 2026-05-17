import { useState, useRef, useEffect } from 'react'
import { assistant } from '../../api'

const SUGGESTIONS = [
  'Sarah marked away from Level 3 Thursday but she can make it',
  'Move Jess from Level 2 Monday to Level 2 Thursday',
  "Who's coming to class today?",
  'Enrol Mia in Level 1 Wednesday',
  'Record a $270 cash payment from Bella',
  'Issue a makeup credit to Jake — he was sick',
  'Add a $20 no-show fee to Emma',
  "What's on the waitlist for Level 3?",
]

function renderText(text) {
  // Convert **bold** markdown to <strong> spans
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  )
}

export default function AdminAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hey! I'm your studio assistant. I can look up students, update attendance, move people between classes, take payments, issue credits, check waitlists, and more. Try one of the suggestions above.` }
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

  function clear() {
    setMessages([{ role: 'assistant', text: `Chat cleared. What would you like to know?` }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div>
          <div className="page-title">Assistant</div>
          <div className="page-sub">Ask anything about your students, enrolments, and data</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={clear}>Clear Chat</button>
      </div>

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
    </div>
  )
}
