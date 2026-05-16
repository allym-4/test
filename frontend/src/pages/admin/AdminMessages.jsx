import { useState, useEffect, useRef } from 'react'
import { useApi } from '../../hooks/useApi'
import { helpdesk, users, settings, notifications as notificationsApi, classes as classesApi } from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const QUICK_REPLIES = [
  'Trial is $25 — just wear active wear and bring grippy socks!',
  "I've processed your request — check your email for confirmation.",
  'Season 4 opens for enrolment on 14 July. Stay tuned!',
  'Happy to help — can you give me a bit more detail?',
]

function avatar(name) {
  if (!name) return '?'
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function NewConvoModal({ onClose, onCreated }) {
  const [studentSearch, setStudentSearch] = useState('')
  const [studentList, setStudentList] = useState([])
  const [picked, setPicked] = useState(null)
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (studentSearch.length < 2) { setStudentList([]); return }
    users.list({ search: studentSearch, role: 'student' }).then(r => setStudentList(r.data.results || r.data))
  }, [studentSearch])

  async function submit(e) {
    e.preventDefault()
    if (!picked || !body.trim()) return
    setSaving(true)
    try {
      const convRes = await helpdesk.conversations()
      const existing = (convRes.data.results || convRes.data).find(c => c.student === picked.id)
      let convId
      if (existing) {
        convId = existing.id
      } else {
        const res = await helpdesk.createConversation({ student: picked.id })
        convId = res.data.id
      }
      await helpdesk.sendDm(convId, { body })
      onCreated(convId)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 420 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>New Message</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <form onSubmit={submit}>
            <div className="field">
              <label>Student</label>
              {picked ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13 }}>{picked.display_name}</span>
                  <button type="button" className="btn btn-ghost btn-xs" onClick={() => setPicked(null)}>Change</button>
                </div>
              ) : (
                <>
                  <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search by name…" />
                  {studentList.length > 0 && (
                    <div style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4 }}>
                      {studentList.slice(0, 5).map(s => (
                        <div key={s.id} onClick={() => { setPicked(s); setStudentSearch('') }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}>{s.display_name}</div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="field">
              <label>Message</label>
              <textarea rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="Type your message…" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-lime btn-sm" disabled={saving || !picked || !body.trim()}>{saving ? 'Sending…' : 'Send'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function BroadcastModal({ onClose }) {
  const { data: sessData } = useApi(() => classesApi.list())
  const sessions = sessData?.results || sessData || []

  const [target, setTarget] = useState('all')
  const [sessionId, setSessionId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sendEmail, setSendEmail] = useState(false)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(null)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setSending(true)
    setError(null)
    try {
      const targetVal = target === 'session' ? `session:${sessionId}` : target
      const res = await notificationsApi.bulk({ title, body, target: targetVal, send_email: sendEmail })
      setDone(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 480 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Broadcast Message</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        {done ? (
          <div className="sd-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17, marginBottom: 8 }}>Sent!</div>
            <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 20 }}>
              Notification sent to <b style={{ color: 'var(--lime)' }}>{done.count} student{done.count !== 1 ? 's' : ''}</b>
              {done.email_sent && ' · email copy also sent'}.
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form className="sd-body" onSubmit={handleSubmit}>
            <div className="field">
              <label>Send to</label>
              <select value={target} onChange={e => setTarget(e.target.value)}>
                <option value="all">All active students</option>
                <option value="session">Students in a specific class</option>
                <option value="overdue">Students with an overdue balance</option>
              </select>
            </div>
            {target === 'session' && (
              <div className="field">
                <label>Class</label>
                <select value={sessionId} onChange={e => setSessionId(e.target.value)} required>
                  <option value="">Select class…</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name} — {DAYS[s.day_of_week]} {s.start_time?.slice(0, 5)}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="field">
              <label>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Class update, Important notice" required />
            </div>
            <div className="field">
              <label>Message</label>
              <textarea rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="Your message…" required style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 18 }}>
              <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
              Also send by email
            </label>
            {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-lime btn-sm" disabled={sending || (target === 'session' && !sessionId)}>
                {sending ? 'Sending…' : 'Send Broadcast'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function AdminMessages() {
  const { user: me } = useAuth()
  const navigate = useNavigate()
  const { data: convData, loading, refetch } = useApi(() => helpdesk.conversations(), [])
  const { data: studioSettings } = useApi(() => settings.get())
  const instagramConnected = !!studioSettings?.instagram_access_token
  const instagramUsername = studioSettings?.instagram_username
  const conversations = convData?.results || convData || []

  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')
  const [showNew, setShowNew] = useState(false)
  const [showBroadcast, setShowBroadcast] = useState(false)
  const threadRef = useRef(null)

  const activeConvo = conversations.find(c => c.id === activeId)

  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id)
  }, [conversations])

  useEffect(() => {
    if (!activeId) return
    setLoadingThread(true)
    helpdesk.dms(activeId).then(r => {
      setMessages(r.data.results || r.data)
    }).finally(() => setLoadingThread(false))
    const convo = conversations.find(c => c.id === activeId)
    if (convo?.admin_unread) {
      helpdesk.updateConversation(activeId, { admin_unread: false }).then(() => refetch())
    }
  }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [messages])

  async function sendReply() {
    if (!reply.trim() || !activeId || sending) return
    setSending(true)
    const text = reply
    setReply('')
    try {
      const r = await helpdesk.sendDm(activeId, { body: text })
      setMessages(prev => [...prev, r.data])
      refetch()
    } finally {
      setSending(false)
    }
  }

  function handleKey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') sendReply()
  }

  const filtered = conversations.filter(c => {
    if (tab === 'unread') return c.admin_unread === true
    if (search && !c.student_detail?.display_name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const student = activeConvo?.student_detail

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      <div className="page-header" style={{ marginBottom: 0, paddingBottom: 16 }}>
        <div>
          <div className="page-title">Messages</div>
          <div className="page-sub">{instagramConnected ? 'Instagram DMs · connected via Meta Messaging API' : 'Student direct messages'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/settings')}>⚙ Manage Connection</button>
          <button className="btn btn-ghost btn-sm" onClick={() => alert('All messages marked as read')}>Mark all read</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowBroadcast(true)}>📣 Broadcast</button>
          <button className="btn btn-lime btn-sm" onClick={() => setShowNew(true)}>+ New Message</button>
        </div>
      </div>

      {/* Instagram connection banner */}
      {!instagramConnected ? (
        <div style={{ background: 'rgba(176,160,255,0.08)', border: '1px solid rgba(176,160,255,0.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>📸</span>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Connect Instagram DMs</div>
              <div style={{ fontSize: 12, color: 'var(--grey)' }}>Receive and reply to Instagram DMs directly here. Requires Meta Business API approval.</div>
            </div>
          </div>
          <a href="/api/users/instagram/auth/" className="btn btn-ghost btn-sm" style={{ flexShrink: 0, textDecoration: 'none' }}>Connect Instagram</a>
        </div>
      ) : (
        <div style={{ background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.2)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, fontSize: 13 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)', flexShrink: 0 }} />
          <span>Instagram connected{instagramUsername ? ` — @${instagramUsername}` : ''}. DMs from Instagram will appear here.</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 260px', gap: 0, flex: 1, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {/* Left: convo list */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '7px 10px', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              {[['all', 'All'], ['unread', 'Unread']].map(([key, label]) => (
                <span key={key} onClick={() => setTab(key)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, cursor: 'pointer', background: tab === key ? 'var(--lime)' : '#1a1a1a', color: tab === key ? '#000' : 'var(--grey)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <div style={{ padding: 16, fontSize: 12, color: 'var(--grey)' }}>Loading…</div>}
            {filtered.map(c => (
              <div key={c.id} onClick={() => setActiveId(c.id)} style={{ padding: '12px 14px', borderBottom: '1px solid #111', cursor: 'pointer', background: activeId === c.id ? '#161616' : 'transparent', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--lav)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {avatar(c.student_detail?.display_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{c.student_detail?.display_name || 'Unknown'}</span>
                    <span style={{ fontSize: 10, color: 'var(--grey)' }}>{timeAgo(c.last_message_at)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.last_message_preview || 'No messages yet'}
                  </div>
                  <span style={{ fontSize: 9, color: 'var(--grey)' }}>{c.message_count} msg{c.message_count !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
            {!loading && filtered.length === 0 && (
              <div style={{ padding: 24, fontSize: 12, color: 'var(--grey)', textAlign: 'center' }}>No conversations yet</div>
            )}
          </div>
        </div>

        {/* Middle: thread */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{student?.display_name || '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--grey)' }}>Direct message</div>
            </div>
          </div>

          <div ref={threadRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loadingThread ? (
              <div style={{ textAlign: 'center', color: 'var(--grey)', fontSize: 12, marginTop: 40 }}>Loading…</div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--grey)', fontSize: 12, marginTop: 40 }}>No messages yet</div>
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

          {activeId && (
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                {QUICK_REPLIES.map((qr, i) => (
                  <span key={i} onClick={() => setReply(qr)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--grey)', background: 'transparent', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                    {qr.slice(0, 28)}…
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  rows={2}
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type a reply… (⌘+Enter to send)"
                  style={{ flex: 1, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '8px 12px', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit' }}
                />
                <button className="btn btn-lime btn-sm" onClick={sendReply} disabled={sending || !reply.trim()} style={{ alignSelf: 'flex-end' }}>
                  {sending ? '…' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: student context */}
        <div style={{ padding: '16px', overflowY: 'auto' }}>
          {student ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--lav)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, margin: '0 auto 8px' }}>
                  {avatar(student.display_name)}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{student.display_name}</div>
                <span className="tag tag-lime" style={{ fontSize: 10, marginTop: 6, display: 'inline-block', textTransform: 'capitalize' }}>{student.role}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                <button className="btn btn-ghost btn-xs" style={{ width: '100%' }} onClick={() => navigate(`/admin/students?search=${encodeURIComponent(student.display_name || '')}`)}>View Full Profile</button>
              </div>
              <div style={{ marginTop: 14, fontSize: 11, color: 'var(--grey)' }}>
                Conversation started {activeConvo && new Date(activeConvo.created_at).toLocaleDateString('en-AU')}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--grey)', fontSize: 12, marginTop: 40 }}>
              Select a conversation to see student details
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <NewConvoModal
          onClose={() => setShowNew(false)}
          onCreated={id => { setShowNew(false); refetch(); setActiveId(id) }}
        />
      )}
      {showBroadcast && <BroadcastModal onClose={() => setShowBroadcast(false)} />}
    </div>
  )
}
