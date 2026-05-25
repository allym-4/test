import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { helpdesk, users, enrolments } from '../../api'
import '../StudentsPage.css'

const STATUS_STYLE = {
  open:     { label: 'Open',     cls: 'tag-lime' },
  pending:  { label: 'Pending',  cls: 'tag-amber' },
  resolved: { label: 'Resolved', cls: 'tag-grey' },
  closed:   { label: 'Closed',   cls: 'tag-grey' },
}

const CR_STATUS_COLOR = {
  pending: 'var(--amber)',
  awaiting_response: '#f97316',
  approved: 'var(--lime)',
  rejected: 'var(--red)',
}
const CR_STATUS_LABEL = {
  pending: 'Pending',
  awaiting_response: 'Awaiting Response',
  approved: 'Approved',
  rejected: 'Rejected',
}

const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
function fmtSessionLabel(session) {
  if (!session) return null
  const day = DAYS_FULL[session.day_of_week] ?? ''
  const time = session.start_time ? session.start_time.slice(0, 5) : ''
  const [h, m] = time.split(':').map(Number)
  const h12 = h % 12 || 12
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${day} ${h12}:${String(m).padStart(2, '0')}${ampm}`
}

function ApproveModal({ req, onClose, onDone }) {
  const currentSession = req.current_enrolment_detail?.class_session_detail
  const requestedSession = req.requested_session_detail
  const currentClass = currentSession?.name || req.current_class_name || '—'
  const requestedClass = requestedSession?.name || req.requested_session_name || 'Not specified'
  const currentSchedule = fmtSessionLabel(currentSession)
  const requestedSchedule = fmtSessionLabel(requestedSession)
  const isFull = requestedSession && requestedSession.enrolled_count >= requestedSession.capacity
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleApprove() {
    setSaving(true); setError(null)
    try {
      const payload = {
        new_session_id: req.requested_session || req.requested_session_detail?.id,
        admin_notes: adminNotes,
      }
      const res = await enrolments.changeRequests.approve(req.id, payload)
      onDone(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to approve')
    } finally { setSaving(false) }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 480 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>Approve & Transfer</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>}
          {isFull && (
            <div style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--amber)' }}>
              ⚠ <strong>Class is full</strong> ({requestedSession.enrolled_count}/{requestedSession.capacity}). Approving will override the capacity limit.
            </div>
          )}
          <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Transfer Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 500 }}>{currentClass}</div>
                {currentSchedule && <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{currentSchedule}</div>}
              </div>
              <span style={{ color: 'var(--lime)', fontSize: 18 }}>→</span>
              <div>
                <div style={{ fontWeight: 600, color: isFull ? 'var(--amber)' : 'var(--lime)' }}>{requestedClass}</div>
                {requestedSchedule && <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{requestedSchedule}</div>}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 10, borderTop: '1px solid #2a2a2a', paddingTop: 8 }}>
              Student: <span style={{ color: 'var(--white)' }}>{req.student_detail?.display_name || `Student #${req.student}`}</span>
            </div>
          </div>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 16, lineHeight: 1.5 }}>
            Approving this request will automatically move the student from their current class to the requested class.
          </div>
          <div className="field">
            <label>Admin Notes (optional)</label>
            <textarea rows={3} value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Internal notes about this approval…" />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-lime btn-sm" onClick={handleApprove} disabled={saving}>
              {saving ? 'Approving…' : 'Approve & Transfer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ContactModal({ req, onClose, onDone }) {
  const studentName = req.student_detail?.display_name || `Student #${req.student}`
  const [message, setMessage] = useState(`Hi ${studentName},\n\nThank you for your transfer request. We'd like to get some more information before we can process this.\n\nCould you please let us know [details needed]?\n\nThanks,\nDuality Pole Studio`)
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSend() {
    setSaving(true); setError(null)
    try {
      const res = await enrolments.changeRequests.requestInfo(req.id, { message, admin_notes: adminNotes })
      onDone(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to send')
    } finally { setSaving(false) }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 500 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>Contact for More Info</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>}
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 14, padding: '8px 12px', background: '#1a1a1a', borderRadius: 7 }}>
            This will send a message to <strong style={{ color: 'var(--white)' }}>{studentName}</strong> via their chat and set the request status to <strong style={{ color: '#f97316' }}>Awaiting Response</strong>.
          </div>
          <div className="field">
            <label>Message to Student</label>
            <textarea rows={7} value={message} onChange={e => setMessage(e.target.value)} />
          </div>
          <div className="field">
            <label>Admin Notes (optional)</label>
            <textarea rows={2} value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Internal notes…" />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-lime btn-sm" onClick={handleSend} disabled={saving || !message.trim()}>
              {saving ? 'Sending…' : 'Send Message'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RejectModal({ req, onClose, onDone }) {
  const studentName = req.student_detail?.display_name || `Student #${req.student}`
  const requestedClass = req.requested_session_detail?.name || req.requested_session_name || 'the requested class'
  const [message, setMessage] = useState(`Hi ${studentName},\n\nThank you for submitting your transfer request to ${requestedClass}.\n\nUnfortunately, we're unable to process this transfer at this time. [Reason here]\n\nIf you have any questions, please don't hesitate to reach out.\n\nWarm regards,\nDuality Pole Studio`)
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleReject() {
    setSaving(true); setError(null)
    try {
      const res = await enrolments.changeRequests.reject(req.id, { message, admin_notes: adminNotes })
      onDone(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to reject')
    } finally { setSaving(false) }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 500 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>Reject Request</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>}
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 14, padding: '8px 12px', background: '#1a1a1a', borderRadius: 7 }}>
            This will send a rejection message to <strong style={{ color: 'var(--white)' }}>{studentName}</strong> via their chat and close the request.
          </div>
          <div className="field">
            <label>Message to Student</label>
            <textarea rows={8} value={message} onChange={e => setMessage(e.target.value)} />
          </div>
          <div className="field">
            <label>Admin Notes (optional)</label>
            <textarea rows={2} value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Internal notes…" />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-sm" style={{ background: 'rgba(255,68,68,0.15)', color: 'var(--red)', border: '1px solid rgba(255,68,68,0.3)' }} onClick={handleReject} disabled={saving}>
              {saving ? 'Rejecting…' : 'Reject & Notify'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
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
  const navigate = useNavigate()
  const { data, loading } = useApi(() => helpdesk.list())
  const { data: studentsData } = useApi(() => users.list({ role: 'student' }))
  const { data: changeReqData, loading: changeReqLoading, refetch: refetchChangeReqs } = useApi(() => enrolments.changeRequests.list())
  const [mainTab, setMainTab] = useState('tickets') // 'tickets' | 'change-requests'
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

  const [allChangeReqs, setAllChangeReqs] = useState(null)
  const changeReqs = allChangeReqs ?? (changeReqData?.results || changeReqData || [])
  const pendingChangeReqs = changeReqs.filter(r => r.status === 'pending' || r.status === 'awaiting_response')
  const [changeReqFilter, setChangeReqFilter] = useState('pending')
  const [approveModal, setApproveModal] = useState(null)
  const [contactModal, setContactModal] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)

  function updateChangeReq(updated) {
    setAllChangeReqs(prev => (prev ?? (changeReqData?.results || changeReqData || [])).map(r => r.id === updated.id ? updated : r))
  }

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

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  function fmtSession(session) {
    if (!session) return null
    const day = DAYS[session.day_of_week] ?? ''
    const time = session.start_time ? session.start_time.slice(0, 5) : ''
    const [h, m] = time.split(':').map(Number)
    const h12 = h % 12 || 12
    const ampm = h >= 12 ? 'pm' : 'am'
    return `${day} ${h12}:${String(m).padStart(2, '0')}${ampm}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      <div className="page-header" style={{ marginBottom: 0, paddingBottom: 16 }}>
        <div>
          <div className="page-title">Helpdesk</div>
          <div className="page-sub">Student support requests &amp; enquiries</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => alert('Export CSV downloaded')}>Export</button>
          <button className="btn btn-lime btn-sm" onClick={() => setShowNew(true)}>+ New Ticket</button>
        </div>
      </div>

      {/* KPI bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <div className="section" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Open Tickets</div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26, color: 'var(--amber)' }}>{openCount}</div>
          <div style={{ fontSize: 11, color: 'var(--grey)' }}>Awaiting response</div>
        </div>
        <div className="section" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Response Time</div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26, color: 'var(--lav)' }}>3.2h</div>
          <div style={{ fontSize: 11, color: 'var(--grey)' }}>This week</div>
        </div>
        <div className="section" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resolved This Week</div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26, color: 'var(--lime)' }}>
            {allTickets.filter(t => t.status === 'resolved').length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--grey)' }}>This week</div>
        </div>
        <div className="section" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Satisfaction</div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26, color: 'var(--lime)' }}>94%</div>
          <div style={{ fontSize: 11, color: 'var(--grey)' }}>Based on 18 ratings</div>
        </div>
      </div>

      {/* Main tab switcher */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#111', borderRadius: 10, padding: 4, alignSelf: 'flex-start' }}>
        <button
          onClick={() => setMainTab('tickets')}
          style={{ padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: mainTab === 'tickets' ? 'var(--lime)' : 'transparent', color: mainTab === 'tickets' ? '#000' : 'var(--grey)' }}
        >
          Tickets {openCount > 0 && <span style={{ marginLeft: 4, background: mainTab === 'tickets' ? 'rgba(0,0,0,0.2)' : '#222', color: mainTab === 'tickets' ? '#000' : 'var(--amber)', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>{openCount}</span>}
        </button>
        <button
          onClick={() => setMainTab('change-requests')}
          style={{ padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: mainTab === 'change-requests' ? 'var(--lime)' : 'transparent', color: mainTab === 'change-requests' ? '#000' : 'var(--grey)' }}
        >
          Change Requests {pendingChangeReqs.length > 0 && <span style={{ marginLeft: 4, background: mainTab === 'change-requests' ? 'rgba(0,0,0,0.2)' : '#222', color: mainTab === 'change-requests' ? '#000' : 'var(--amber)', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>{pendingChangeReqs.length}</span>}
        </button>
      </div>

      {mainTab === 'change-requests' ? (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            {[['pending', 'Pending'], ['awaiting_response', 'Awaiting Response'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']].map(([key, label]) => (
              <span key={key} onClick={() => setChangeReqFilter(key)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', background: changeReqFilter === key ? 'var(--lime)' : '#1a1a1a', color: changeReqFilter === key ? '#000' : 'var(--grey)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{label}</span>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--grey)', flexShrink: 0 }}>{pendingChangeReqs.length} pending</span>
            <button className="btn btn-ghost btn-sm" onClick={refetchChangeReqs}>Refresh</button>
          </div>
          {changeReqLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
          ) : (() => {
            const displayReqs = changeReqFilter === 'all' ? changeReqs : changeReqs.filter(r => r.status === changeReqFilter)
            if (displayReqs.length === 0) return (
              <div style={{ textAlign: 'center', color: 'var(--grey)', fontSize: 13, padding: '48px 0' }}>No {changeReqFilter === 'all' ? '' : changeReqFilter} change requests</div>
            )
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {displayReqs.map(r => {
                  const statusColor = CR_STATUS_COLOR[r.status] || 'var(--grey)'
                  const studentName = r.student_detail?.display_name || r.student_name || `Student #${r.student}`
                  const currentSession = r.current_enrolment_detail?.class_session_detail
                  const requestedSession = r.requested_session_detail
                  const currentClass = currentSession?.name || r.current_class_name || '—'
                  const requestedClass = requestedSession?.name || r.requested_session_name || 'Not specified'
                  const currentSchedule = fmtSession(currentSession)
                  const requestedSchedule = fmtSession(requestedSession)
                  const requestedFull = requestedSession && requestedSession.enrolled_count >= requestedSession.capacity
                  const studentId = r.student_detail?.id || r.student
                  const isActionable = r.status === 'pending' || r.status === 'awaiting_response'
                  return (
                    <div key={r.id} style={{ background: '#111', border: `1px solid ${requestedFull && isActionable ? 'rgba(255,170,0,0.4)' : 'var(--border)'}`, borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--lav)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                            {(studentName[0] || '?').toUpperCase()}
                          </div>
                          <div>
                            <button
                              onClick={() => navigate(`/admin/students/${studentId}`)}
                              style={{ fontWeight: 600, fontSize: 14, background: 'none', border: 'none', color: 'var(--white)', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.2)' }}
                            >
                              {studentName}
                            </button>
                            <div style={{ fontSize: 11, color: 'var(--grey)' }}>
                              {new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {r.request_type && <span style={{ marginLeft: 6, textTransform: 'capitalize' }}>· {r.request_type}</span>}
                            </div>
                          </div>
                          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: statusColor, background: `${statusColor}22`, borderRadius: 20, padding: '3px 10px', border: `1px solid ${statusColor}44`, whiteSpace: 'nowrap' }}>
                            {CR_STATUS_LABEL[r.status] || r.status}
                          </span>
                        </div>

                        {requestedFull && isActionable && (
                          <div style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.3)', borderRadius: 7, padding: '7px 12px', marginBottom: 10, fontSize: 12, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            ⚠ Requested class is full ({requestedSession.enrolled_count}/{requestedSession.capacity}) — you'll need to manually override or waitlist
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                          <div style={{ background: '#1a1a1a', borderRadius: 7, padding: '8px 12px' }}>
                            <div style={{ fontSize: 10, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Current Class</div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{currentClass}</div>
                            {currentSchedule && <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 3 }}>{currentSchedule}</div>}
                          </div>
                          <div style={{ background: '#1a1a1a', borderRadius: 7, padding: '8px 12px' }}>
                            <div style={{ fontSize: 10, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Requested Class</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: requestedFull ? 'var(--amber)' : 'var(--lime)' }}>{requestedClass}</div>
                            {requestedSchedule && <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 3 }}>{requestedSchedule}</div>}
                            {requestedFull && <div style={{ fontSize: 10, color: 'var(--amber)', marginTop: 3, fontWeight: 600 }}>FULL {requestedSession.enrolled_count}/{requestedSession.capacity}</div>}
                          </div>
                        </div>
                        {r.notes && (
                          <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.5, background: '#1a1a1a', borderRadius: 7, padding: '8px 12px', marginBottom: 8, borderLeft: '3px solid var(--border)' }}>
                            {r.notes}
                          </div>
                        )}
                        {r.admin_notes && (
                          <div style={{ fontSize: 12, color: 'var(--grey)', fontStyle: 'italic', marginTop: 4 }}>
                            Admin note: {r.admin_notes}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                        {isActionable && (
                          <>
                            <button
                              className="btn btn-lime btn-xs"
                              onClick={() => setApproveModal(r)}
                              style={{ whiteSpace: 'nowrap' }}
                            >
                              Approve & Action
                            </button>
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => setContactModal(r)}
                              style={{ whiteSpace: 'nowrap' }}
                            >
                              Contact for Info
                            </button>
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => setRejectModal(r)}
                              style={{ whiteSpace: 'nowrap', color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {r.ticket && (
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => setMainTab('tickets')}
                            style={{ whiteSpace: 'nowrap', fontSize: 10 }}
                          >
                            View Ticket #{r.ticket}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      ) : loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 240px', flex: 1, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', minHeight: 0 }}>

          {/* Ticket list */}
          <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <input
                type="text"
                placeholder="Search tickets…"
                style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--white)', padding: '7px 11px', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[['all','All'],['open','Open'],['pending','Pending'],['resolved','Resolved']].map(([key, label]) => (
                  <span key={key} onClick={() => setFilter(key)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, cursor: 'pointer', background: filter === key ? 'var(--lime)' : '#1a1a1a', color: filter === key ? '#000' : 'var(--grey)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                ))}
              </div>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--grey)' }}>{fmtDate(t.created_at)}</span>
                    <button
                      className="btn btn-ghost btn-xs"
                      style={{ fontSize: 9, padding: '2px 6px' }}
                      onClick={e => { e.stopPropagation(); openTicket(t) }}
                    >View</button>
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

      {showNew && mainTab === 'tickets' && <NewTicketModal students={students} onClose={() => setShowNew(false)} onCreated={ticket => { setTicketList(prev => [ticket, ...(prev ?? allTickets)]); openTicket(ticket) }} />}
      {approveModal && <ApproveModal req={approveModal} onClose={() => setApproveModal(null)} onDone={updateChangeReq} />}
      {contactModal && <ContactModal req={contactModal} onClose={() => setContactModal(null)} onDone={updateChangeReq} />}
      {rejectModal && <RejectModal req={rejectModal} onClose={() => setRejectModal(null)} onDone={updateChangeReq} />}
    </div>
  )
}
