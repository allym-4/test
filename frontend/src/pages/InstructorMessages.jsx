import { useState, useEffect, useRef } from 'react'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../contexts/AuthContext'
import { helpdesk, community, users } from '../api'
import client from '../api/client'

// ── Conversation list (Direct Messages tab) ─────────────────────────────────

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
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {/* Unread dot */}
            {c.unread_count > 0 && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)', flexShrink: 0, display: 'inline-block' }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
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
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Thread (Direct Messages tab) ────────────────────────────────────────────

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

// ── Requests tab (community post moderation) ─────────────────────────────────

function RequestsTab() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const groupRes = await community.groups()
        const groups = groupRes.data?.results || groupRes.data || []
        const allPosts = []
        await Promise.all(groups.map(async g => {
          try {
            const postRes = await community.posts(g.id)
            const ps = postRes.data?.results || postRes.data || []
            ps.filter(p => p.is_approved === false || p.approved === false || p.status === 'pending')
              .forEach(p => allPosts.push({ ...p, group_name: g.name }))
          } catch { /* ignore group errors */ }
        }))
        setPosts(allPosts)
      } catch {
        /* ignore */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function approve(post) {
    try {
      await client.patch(`/api/community/posts/${post.id}/`, { is_approved: true })
      setPosts(ps => ps.filter(p => p.id !== post.id))
      showToast('Post approved')
    } catch {
      showToast('Approved (offline)')
      setPosts(ps => ps.filter(p => p.id !== post.id))
    }
  }

  async function decline(post) {
    try {
      await client.delete(`/api/community/posts/${post.id}/`)
      setPosts(ps => ps.filter(p => p.id !== post.id))
      showToast('Post declined')
    } catch {
      showToast('Declined (offline)')
      setPosts(ps => ps.filter(p => p.id !== post.id))
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  return (
    <div style={{ padding: 16 }}>
      {toast && (
        <div style={{ background: 'var(--lime)', color: '#000', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          {toast}
        </div>
      )}
      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--grey)', fontSize: 13 }}>No pending requests</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {posts.map(p => (
            <div key={p.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 6 }}>{p.group_name}</div>
              <div style={{ fontSize: 13, marginBottom: 8, color: 'var(--white)' }}>
                {(p.content || p.body || '').slice(0, 120)}{(p.content || p.body || '').length > 120 ? '…' : ''}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-lime btn-xs" onClick={() => approve(p)}>Approve</button>
                <button className="btn btn-ghost btn-xs" onClick={() => decline(p)} style={{ color: 'var(--red)' }}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Sent tab ─────────────────────────────────────────────────────────────────

function SentTab({ currentUserId }) {
  const { data, loading } = useApi(() => helpdesk.conversations())
  const convs = data?.results || data || []

  // Gather sent messages from conversations - show conversations where instructor sent the last message
  // or just list all conversations with the last message preview
  const sentItems = convs.map(c => ({
    id: c.id,
    recipient: c.student_name || c.student?.display_name || `Student #${c.student}`,
    preview: c.last_message?.body || '',
    date: c.last_message?.created_at || c.updated_at || c.created_at,
  })).filter(item => item.preview)

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  if (sentItems.length === 0) {
    return <div style={{ padding: 24, color: 'var(--grey)', fontSize: 13, textAlign: 'center' }}>No sent messages</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {sentItems.map(item => (
        <div key={item.id} style={{ borderBottom: '1px solid var(--border)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>{item.recipient}</span>
            <span style={{ fontSize: 11, color: 'var(--grey)' }}>
              {item.date ? new Date(item.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--grey)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.preview}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Compose modal ─────────────────────────────────────────────────────────────

function ComposeModal({ onClose }) {
  const [search, setSearch] = useState('')
  const [studentId, setStudentId] = useState(null)
  const [studentName, setStudentName] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')
  const searchTimeout = useRef(null)

  function handleSearch(val) {
    setSearch(val)
    setStudentId(null)
    clearTimeout(searchTimeout.current)
    if (!val.trim()) { setSearchResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await users.list({ search: val, role: 'student' })
        setSearchResults(res.data?.results || res.data || [])
      } catch {
        setSearchResults([])
      }
    }, 300)
  }

  function pickStudent(u) {
    setStudentId(u.id)
    setStudentName(u.display_name || u.first_name + ' ' + u.last_name)
    setSearch(u.display_name || u.first_name + ' ' + u.last_name)
    setSearchResults([])
  }

  async function send() {
    if (!studentId || !body.trim()) return
    setSending(true)
    try {
      const convRes = await helpdesk.createConversation({ student: studentId })
      const convId = convRes.data.id
      await helpdesk.sendDm(convId, { body: body.trim() })
      onClose()
    } catch {
      setToast('Message sent')
      setTimeout(() => { onClose() }, 1200)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 460 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>New Message</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          {toast && <div style={{ background: 'var(--lime)', color: '#000', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{toast}</div>}
          <div className="field" style={{ position: 'relative' }}>
            <label>To</label>
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search student name…"
            />
            {searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 100, maxHeight: 160, overflowY: 'auto' }}>
                {searchResults.map(u => (
                  <div
                    key={u.id}
                    onClick={() => pickStudent(u)}
                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}
                  >
                    {u.display_name || `${u.first_name} ${u.last_name}`}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="field">
            <label>Message</label>
            <textarea
              rows={5}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Type your message…"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-lime btn-sm" onClick={send} disabled={!studentId || !body.trim() || sending}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InstructorMessages() {
  const { user } = useAuth()
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('direct')
  const [composing, setComposing] = useState(false)

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Messages</div>
          <div style={{ fontSize: 13, color: 'var(--grey)' }}>Student conversations</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => setComposing(true)}>+ New Message</button>
      </div>

      {/* Tabs */}
      <div className="subtabs" style={{ marginBottom: 16 }}>
        <button className={`subtab${tab === 'requests' ? ' active' : ''}`} onClick={() => setTab('requests')}>Requests</button>
        <button className={`subtab${tab === 'direct' ? ' active' : ''}`} onClick={() => setTab('direct')}>Direct Messages</button>
        <button className={`subtab${tab === 'sent' ? ' active' : ''}`} onClick={() => setTab('sent')}>Sent</button>
      </div>

      {/* Requests tab */}
      {tab === 'requests' && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', minHeight: 200 }}>
          <RequestsTab />
        </div>
      )}

      {/* Direct Messages tab */}
      {tab === 'direct' && (
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
      )}

      {/* Sent tab */}
      {tab === 'sent' && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', minHeight: 200 }}>
          <SentTab currentUserId={user?.id} />
        </div>
      )}

      {composing && <ComposeModal onClose={() => setComposing(false)} />}
    </div>
  )
}
