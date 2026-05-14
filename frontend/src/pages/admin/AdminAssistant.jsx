import { useState, useRef, useEffect } from 'react'
import { useApi } from '../../hooks/useApi'
import { users } from '../../api'

const SUGGESTIONS = [
  'List all students',
  'Show students owing money',
  'How many active students do we have?',
  'List new students this season',
  'Which students have outstanding balances?',
  'Show me an enrolment summary',
  'List students and their emails',
  'Who has not booked recently?',
]

function queryStudents(query, allStudents) {
  const q = query.toLowerCase()
  let results = allStudents

  if (q.includes('owing') || q.includes('outstanding') || q.includes('balance')) {
    return { text: `Students with outstanding balances would be shown here. Connect the billing API to get live data.` }
  }
  if (q.includes('new student')) {
    return { text: `New students this season: this requires season/enrolment data to filter accurately.` }
  }
  if (q.includes('how many') || q.includes('total') || q.includes('count')) {
    return { text: `There are currently **${allStudents.length} students** in the system.` }
  }
  if (q.includes('email')) {
    const list = results.slice(0, 20).map(s => `${s.display_name} — ${s.email}`).join('\n')
    return { text: `Here are student emails (first 20):\n\n${list}` }
  }
  if (q.includes('list') || q.includes('show') || q.includes('all student')) {
    return {
      text: `Found **${results.length} students**:`,
      students: results.slice(0, 20),
    }
  }

  return { text: `I found **${results.length} students** matching your query. Try asking for a list, emails, or counts.` }
}

export default function AdminAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hey! I'm your studio assistant. Ask me to pull reports, list students, find outstanding balances, or generate email lists. Try one of the suggestions above to get started.` }
  ])
  const [input, setInput] = useState('')
  const bottomRef = useRef()
  const { data } = useApi(() => users.list({ role: 'student' }), [])
  const allStudents = data?.results || []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function ask(query) {
    if (!query.trim()) return
    setMessages(ms => [...ms, { role: 'user', text: query }])
    setInput('')
    setTimeout(() => {
      const result = queryStudents(query, allStudents)
      setMessages(ms => [...ms, { role: 'assistant', ...result }])
    }, 400)
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
              {msg.text.split('\n').map((line, j) => <div key={j}>{line || <br />}</div>)}
              {msg.students && (
                <div style={{ marginTop: 10 }}>
                  {msg.students.map(s => (
                    <div key={s.id} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid #2a2a2a', color: 'var(--grey)' }}>
                      <span style={{ color: 'var(--white)', fontWeight: 500 }}>{s.display_name}</span> — {s.email}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
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
        <button className="btn btn-lime" onClick={() => ask(input)}>Ask →</button>
      </div>
    </div>
  )
}
