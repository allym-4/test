import { useState, useEffect, useRef } from 'react'
import { useApi } from '../../hooks/useApi'
import { helpdesk, users, settings, notifications as notificationsApi, classes as classesApi, tags as tagsApi, assistant as assistantApi } from '../../api'
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
  const { data: tagData } = useApi(() => tagsApi.list())
  const allTags = tagData?.results || tagData || []

  const [target, setTarget] = useState('all')
  const [sessionId, setSessionId] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [actionLabel, setActionLabel] = useState('')
  const [actionUrl, setActionUrl] = useState('')
  const [showCta, setShowCta] = useState(false)
  const [sendEmail, setSendEmail] = useState(false)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(null)
  const [error, setError] = useState(null)

  function toggleTag(id) {
    setSelectedTagIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setSending(true)
    setError(null)
    try {
      const payload = {
        title,
        body,
        send_email: sendEmail,
        action_label: showCta ? actionLabel : '',
        action_url: showCta ? actionUrl : '',
      }
      if (target === 'session') {
        payload.target = `session:${sessionId}`
      } else if (target === 'tags') {
        payload.target = 'tags'
        payload.tag_ids = selectedTagIds
      } else {
        payload.target = target
      }
      const res = await notificationsApi.bulk(payload)
      setDone(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send.')
    } finally {
      setSending(false)
    }
  }

  const canSend = title.trim() && body.trim()
    && (target !== 'session' || sessionId)
    && (target !== 'tags' || selectedTagIds.length > 0)

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 500 }}>
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
              <select value={target} onChange={e => { setTarget(e.target.value); setSelectedTagIds([]) }}>
                <option value="all">All active students</option>
                <option value="tags">Students with specific tags</option>
                <option value="session">Students in a specific class</option>
                <option value="overdue">Students with an overdue balance</option>
              </select>
            </div>

            {target === 'tags' && (
              <div className="field">
                <label>Tags <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(select one or more)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 0' }}>
                  {allTags.length === 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--grey)' }}>No tags found — create tags in the Tags page first</span>
                  ) : allTags.map(tag => {
                    const selected = selectedTagIds.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 20,
                          border: `1px solid ${selected ? (tag.colour || 'var(--lime)') : 'var(--border)'}`,
                          background: selected ? `${tag.colour || 'var(--lime)'}22` : 'var(--card)',
                          color: selected ? (tag.colour || 'var(--lime)') : 'var(--grey)',
                          fontSize: 12,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'all 0.15s',
                        }}
                      >
                        {selected && '✓ '}{tag.name}
                      </button>
                    )
                  })}
                </div>
                {selectedTagIds.length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>
                    {selectedTagIds.length} tag{selectedTagIds.length !== 1 ? 's' : ''} selected — recipients will be the union of all tagged students
                  </div>
                )}
              </div>
            )}

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
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. New Level 5 class added!" required />
            </div>
            <div className="field">
              <label>Message</label>
              <textarea rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="Your message…" required style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>

            {/* CTA button toggle */}
            <div style={{ marginBottom: showCta ? 0 : 18 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--white)', textTransform: 'none', letterSpacing: 0 }}>
                <input type="checkbox" checked={showCta} onChange={e => setShowCta(e.target.checked)} style={{ accentColor: 'var(--lime)', width: 14, height: 14 }} />
                <span>Add a call-to-action button</span>
              </label>
            </div>
            {showCta && (
              <div style={{ background: 'rgba(204,255,0,0.04)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Button label</label>
                  <input value={actionLabel} onChange={e => setActionLabel(e.target.value)} placeholder="e.g. Add to enrolment, View schedule" />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Button link</label>
                  <input value={actionUrl} onChange={e => setActionUrl(e.target.value)} placeholder="e.g. /portal/book" />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--white)', textTransform: 'none', letterSpacing: 0 }}>
                <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} style={{ accentColor: 'var(--lime)', width: 14, height: 14 }} />
                <span>Also send by email</span>
              </label>
            </div>

            {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-lime btn-sm" disabled={sending || !canSend}>
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
  const [mainView, setMainView] = useState('dm') // 'dm' | 'assistant'
  const [aiChats, setAiChats] = useState(null)
  const [aiChatUser, setAiChatUser] = useState(null) // { id, name } — drilled-in user
  const [aiChatMessages, setAiChatMessages] = useState(null)
  const [loadingAi, setLoadingAi] = useState(false)
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

  function openAiOverview() {
    setMainView('assistant')
    setAiChatUser(null)
    setAiChatMessages(null)
    if (aiChats) return
    setLoadingAi(true)
    assistantApi.chats().then(r => setAiChats(r.data || [])).catch(() => setAiChats([])).finally(() => setLoadingAi(false))
  }

  function openAiUser(u) {
    setAiChatUser(u)
    setAiChatMessages(null)
    assistantApi.userChats(u.user_id).then(r => setAiChatMessages(r.data || [])).catch(() => setAiChatMessages([]))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      <div className="page-header" style={{ marginBottom: 0, paddingBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <button onClick={() => setMainView('dm')} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${mainView === 'dm' ? 'var(--lime)' : 'transparent'}`, color: mainView === 'dm' ? 'var(--white)' : 'var(--grey)', fontFamily: "'Archivo Black', sans-serif", fontSize: 18, cursor: 'pointer', padding: '0 0 4px', transition: 'color 0.15s' }}>Messages</button>
            <button onClick={openAiOverview} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${mainView === 'assistant' ? 'var(--lime)' : 'transparent'}`, color: mainView === 'assistant' ? 'var(--white)' : 'var(--grey)', fontFamily: "'Archivo Black', sans-serif", fontSize: 18, cursor: 'pointer', padding: '0 0 4px', transition: 'color 0.15s' }}>AI Assistant</button>
          </div>
          <div className="page-sub">{mainView === 'assistant' ? 'Student conversations with the AI assistant' : instagramConnected ? 'Instagram DMs · connected via Meta Messaging API' : 'Student direct messages'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/settings')}>⚙ Manage Connection</button>
          <button className="btn btn-ghost btn-sm" onClick={async () => {
            const unread = conversations.filter(c => c.admin_unread)
            await Promise.all(unread.map(c => helpdesk.updateConversation(c.id, { admin_unread: false })))
            refetch()
          }}>Mark all read</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowBroadcast(true)}>📣 Broadcast</button>
          <button className="btn btn-lime btn-sm" onClick={() => setShowNew(true)}>+ New Message</button>
        </div>
      </div>

      {/* Instagram connection banner */}
      {/* ── AI Assistant view ── */}
      {mainView === 'assistant' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: 0, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Left: student list */}
          <div style={{ width: 280, borderRight: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0 }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Students</div>
            {loadingAi && <div style={{ padding: 16, fontSize: 12, color: 'var(--grey)' }}>Loading…</div>}
            {(aiChats || []).map(u => (
              <div key={u.user_id} onClick={() => openAiUser(u)} style={{ padding: '12px 14px', borderBottom: '1px solid #111', cursor: 'pointer', background: aiChatUser?.user_id === u.user_id ? '#161616' : 'transparent', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--lav)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {(u.user__display_name || u.user__first_name || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{u.user__display_name || `${u.user__first_name || ''} ${u.user__last_name || ''}`.trim() || 'Unknown'}</div>
                  <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{u.message_count} message{u.message_count !== 1 ? 's' : ''} · {u.last_at ? new Date(u.last_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}</div>
                </div>
              </div>
            ))}
            {!loadingAi && (aiChats || []).length === 0 && (
              <div style={{ padding: 24, fontSize: 12, color: 'var(--grey)', textAlign: 'center' }}>No assistant conversations yet</div>
            )}
          </div>
          {/* Right: conversation thread */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!aiChatUser && <div style={{ color: 'var(--grey)', fontSize: 13, textAlign: 'center', marginTop: 60 }}>Select a student to view their conversation</div>}
            {aiChatUser && !aiChatMessages && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>}
            {aiChatUser && aiChatMessages && aiChatMessages.length === 0 && <div style={{ color: 'var(--grey)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>No messages found</div>}
            {aiChatUser && (aiChatMessages || []).map(m => (
              <div key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.role === 'user' ? 'var(--lav)' : '#2a2a2a', color: m.role === 'user' ? '#000' : 'var(--grey)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                  {m.role === 'user' ? (aiChatUser.user__display_name?.[0] || '?') : 'AI'}
                </div>
                <div style={{ maxWidth: '68%', background: m.role === 'user' ? 'rgba(176,160,255,0.12)' : '#1a1a1a', border: `1px solid ${m.role === 'user' ? 'rgba(176,160,255,0.2)' : 'var(--border)'}`, borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  <div style={{ fontSize: 10, color: 'var(--grey)', marginTop: 4, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                    {new Date(m.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {m.escalated && <span style={{ marginLeft: 8, color: 'var(--amber)', fontWeight: 600 }}>↑ escalated to staff</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mainView === 'dm' && (!instagramConnected ? (
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
      ))}

      {mainView === 'dm' && <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 260px', gap: 0, flex: 1, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
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
      </div>}

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
