import { useState, useEffect, useRef } from 'react'
import { useApi } from '../../hooks/useApi'
import { helpdesk, users } from '../../api'
import '../StudentsPage.css'

const STATUS_STYLE = {
  open:     { label: 'Open',     cls: 'tag-lime' },
  pending:  { label: 'Pending',  cls: 'tag-amber' },
  resolved: { label: 'Resolved', cls: 'tag-grey' },
  closed:   { label: 'Closed',   cls: 'tag-grey' },
}
const PRIORITY_COLOR = { high: 'var(--red)', medium: 'var(--amber)', low: 'var(--grey)' }
const CATEGORIES = ['Booking', 'Billing', 'Membership', 'Technical', 'General']

function NewTicketModal({ students, onClose, onCreated }) {
  const [form, setForm] = useState({ subject: '', student: '', category: 'General', priority: 'medium', body: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  function set(f, v) { setForm(x => ({ ...x, [f]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const res = await helpdesk.create({ subject: form.subject, student: form.student || null, category: form.category, priority: form.priority, status: 'open' })
      if (form.body.trim()) await helpdesk.reply(res.data.id, { body: form.body })
      onCreated(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 500 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>New Ticket</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit}>
          {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>}
          <div className="field"><label>Subject *</label><input value={form.subject} onChange={e => set('subject', e.target.value)} required autoFocus /></div>
          <div className="field">
            <label>Student</label>
            <select value={form.student} onChange={e => set('student', e.target.value)}>
              <option value="">— No student —</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Category</label><select value={form.category} onChange={e => set('category', e.target.value)}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="field"><label>Priority</label><select value={form.priority} onChange={e => set('priority', e.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
          </div>
          <div className="field"><label>Initial Message</label><textarea rows={4} value={form.body} onChange={e => set('body', e.target.value)} placeholder="Describe the issue…" /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Creating…' : 'Create Ticket'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminHelpdesk() {
  const { data, loading } = useApi(() => helpdesk.list())
  const { data: studentsData } = useApi(() => users.list({ role: 'student' }))
  const [filter, setFilter] = useState('all')
  const [activeTicket, setActiveTicket] = useState(null)
  const [thread, setThread] = useState([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [reply, setReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [ticketList, setTicketList] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const threadBottomRef = useRef(null)

  const allTickets = ticketList ?? (data?.results || data || [])
  const students = studentsData?.results || []
  const filtered = allTickets.filter(t => filter === 'all' || t.status === filter)
  const openCount = allTickets.filter(t => t.status === 'open').length
  const pendingCount = allTickets.filter(t => t.status === 'pending').length

  async function openTicket(ticket) {
    setActiveTicket(ticket)
    setLoadingThread(true)
    setThread([])
    try {
      const res = await helpdesk.messages(ticket.id)
      setThread(res.data.results || res.data || [])
    } finally { setLoadingThread(false) }
  }

  useEffect(() => {
    if (allTickets.length > 0 && !activeTicket) openTicket(allTickets[0])
  }, [allTickets.length])

  useEffect(() => { threadBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread])

  async function handleReply() {
    if (!reply.trim() || !activeTicket) return
    setSendingReply(true)
    try {
      const res = await helpdesk.reply(activeTicket.id, { body: reply })
      setThread(t => [...t, res.data])
      setReply('')
      const newStatus = activeTicket.status === 'open' ? 'pending' : activeTicket.status
      setActiveTicket(prev => ({ ...prev, status: newStatus }))
      setTicketList(prev => (prev ?? allTickets).map(t => t.id === activeTicket.id ? { ...t, status: newStatus } : t))
    } finally { setSendingReply(false) }
  }

  async function handleStatus(newStatus) {
    if (!activeTicket) return
    await helpdesk.update(activeTicket.id, { status: newStatus })
    setActiveTicket(prev => ({ ...prev, status: newStatus }))
    setTicketList(prev => (prev ?? allTickets).map(t => t.id === activeTicket.id ? { ...t, status: newStatus } : t))
  }

  const fmtTime = iso => new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  const fmtDate = iso => new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      <div className="page-header" style={{ marginBottom: 0, paddingBottom: 16 }}>
        <div>
          <div className="page-title">Helpdesk</div>
          <div className="page-sub">Student support tickets</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--grey)' }}>{openCount} open · {pendingCount} pending</span>
          <button className="btn btn-lime btn-sm" onClick={() => setShowNew(true)}>+ New Ticket</button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 240px', flex: 1, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', minHeight: 0 }}>

          {/* Ticket list */}
          <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
              {[['all','All'],['open','Open'],['pending','Pending'],['resolved','Resolved']].map(([key, label]) => (
                <span key={key} onClick={() => setFilter(key)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, cursor: 'pointer', background: filter === key ? 'var(--lime)' : '#1a1a1a', color: filter === key ? '#000' : 'var(--grey)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--grey)', fontSize: 12, padding: '32px 16px' }}>No tickets</div>
              ) : filtered.map(t => (
                <div key={t.id} onClick={() => openTicket(t)} style={{ padding: '12px 14px', borderBottom: '1px solid #111', cursor: 'pointer', background: activeTicket?.id === t.id ? '#161616' : 'transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--grey)' }}>#{t.id}</span>
                    <span className={`tag ${STATUS_STYLE[t.status]?.cls || 'tag-grey'}`} style={{ fontSize: 9 }}>{STATUS_STYLE[t.status]?.label}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
                  <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 4 }}>{t.student_detail?.display_name || 'No student'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, color: 'var(--grey)' }}>{t.category}</span>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLOR[t.priority] || 'var(--grey)', marginTop: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Thread */}
          <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', minHeight: 0 }}>
            {activeTicket ? (
              <>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{activeTicket.subject}</div>
                      <div style={{ fontSize: 11, color: 'var(--grey)' }}>{activeTicket.student_detail?.display_name || 'No student'} · {fmtDate(activeTicket.created_at)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {activeTicket.status !== 'resolved' && <button className="btn btn-ghost btn-xs" onClick={() => handleStatus('resolved')}>Resolve</button>}
                      {activeTicket.status === 'resolved' && <button className="btn btn-ghost btn-xs" onClick={() => handleStatus('open')}>Reopen</button>}
                      {activeTicket.status !== 'closed' && <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => handleStatus('closed')}>Close</button>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className={`tag ${STATUS_STYLE[activeTicket.status]?.cls || 'tag-grey'}`} style={{ fontSize: 9 }}>{STATUS_STYLE[activeTicket.status]?.label}</span>
                    <span className="tag tag-grey" style={{ fontSize: 9 }}>{activeTicket.category}</span>
                    <span style={{ fontSize: 9, color: PRIORITY_COLOR[activeTicket.priority], fontWeight: 700, textTransform: 'uppercase' }}>{activeTicket.priority}</span>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {loadingThread ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
                  ) : thread.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--grey)', fontSize: 12, marginTop: 40 }}>No messages yet</div>
                  ) : thread.map(msg => {
                    const isStaff = msg.sender_detail?.role !== 'student'
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isStaff ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '75%', background: isStaff ? 'var(--lime)' : '#1a1a1a', color: isStaff ? '#000' : 'var(--white)', borderRadius: isStaff ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '10px 14px', fontSize: 13, lineHeight: 1.5 }}>
                          {!isStaff && <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, color: 'var(--lav)' }}>{msg.sender_detail?.display_name}</div>}
                          {msg.body}
                          <div style={{ fontSize: 9, color: isStaff ? 'rgba(0,0,0,0.4)' : 'var(--grey)', marginTop: 4, textAlign: 'right' }}>{fmtTime(msg.created_at)}</div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={threadBottomRef} />
                </div>

                {activeTicket.status !== 'closed' && (
                  <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
                    <textarea rows={2} value={reply} onChange={e => setReply(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReply() }}
                      placeholder="Reply… (Cmd+Enter to send)"
                      style={{ flex: 1, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '8px 12px', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button className="btn btn-lime btn-sm" onClick={handleReply} disabled={sendingReply || !reply.trim()}>{sendingReply ? '…' : 'Reply'}</button>
                      {activeTicket.status !== 'resolved' && <button className="btn btn-ghost btn-xs" onClick={() => handleStatus('resolved')}>Resolve</button>}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--grey)', fontSize: 13 }}>Select a ticket</div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ padding: '16px', overflowY: 'auto' }}>
            {activeTicket && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 8, fontWeight: 600 }}>Student</div>
                  {activeTicket.student_detail ? (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--lav)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                        {activeTicket.student_detail.first_name?.[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{activeTicket.student_detail.display_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--grey)' }}>{activeTicket.student_detail.role}</div>
                      </div>
                    </div>
                  ) : <div style={{ fontSize: 12, color: 'var(--grey)' }}>No student linked</div>}
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 10, fontWeight: 600 }}>Details</div>
                  {[['Ticket', `#${activeTicket.id}`], ['Category', activeTicket.category], ['Priority', activeTicket.priority], ['Status', STATUS_STYLE[activeTicket.status]?.label], ['Created', fmtDate(activeTicket.created_at)], ['Messages', thread.length]].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '1px solid #111' }}>
                      <span style={{ color: 'var(--grey)' }}>{label}</span>
                      <span style={{ fontWeight: 500 }}>{val}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activeTicket.status !== 'resolved' && <button className="btn btn-lime btn-xs" style={{ width: '100%' }} onClick={() => handleStatus('resolved')}>Mark Resolved</button>}
                  {activeTicket.status === 'resolved' && <button className="btn btn-ghost btn-xs" style={{ width: '100%' }} onClick={() => handleStatus('open')}>Reopen</button>}
                  {activeTicket.status !== 'closed' && <button className="btn btn-ghost btn-xs" style={{ width: '100%', color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }} onClick={() => handleStatus('closed')}>Close Ticket</button>}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showNew && <NewTicketModal students={students} onClose={() => setShowNew(false)} onCreated={ticket => { setTicketList(prev => [ticket, ...(prev ?? allTickets)]); openTicket(ticket) }} />}
    </div>
  )
}
