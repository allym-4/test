import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { enrolments, classes, users } from '../../api'
import '../StudentsPage.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const TYPE_TAG = {
  season:   'tag-lav',
  trial:    'tag-lav',
  casual:   'tag-grey',
  workshop: 'tag-amber',
  catchup:  'tag-grey',
  waitlist: 'tag-amber',
  course:   'tag-lav',
}

const STATUS_TAG = {
  active:    'tag-lime',
  waitlist:  'tag-amber',
  cancelled: 'tag-red',
  completed: 'tag-grey',
  suspended: 'tag-grey',
}

function BookingModal({ onClose, onSaved }) {
  const { data: sessData } = useApi(() => classes.list())
  const { data: studData } = useApi(() => users.list({ role: 'student' }))

  const sessions = sessData?.results || sessData || []
  const students = studData?.results || []

  const [studentId, setStudentId] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [type, setType] = useState('course')
  const [status, setStatus] = useState('active')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await enrolments.create({ student: parseInt(studentId), class_session: parseInt(sessionId), enrolment_type: type, status, notes })
      onSaved()
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to create booking')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 480 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Add Booking</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={submit}>
          {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>}
          <div className="field">
            <label>Student *</label>
            <select value={studentId} onChange={e => setStudentId(e.target.value)} required>
              <option value="">Select student…</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Class *</label>
            <select value={sessionId} onChange={e => setSessionId(e.target.value)} required>
              <option value="">Select class…</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name} — {DAYS[s.day_of_week]} {s.start_time?.slice(0, 5)}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Type</label>
              <select value={type} onChange={e => setType(e.target.value)}>
                <option value="course">Course</option>
                <option value="casual">Casual</option>
                <option value="trial">Trial</option>
                <option value="workshop">Workshop</option>
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="waitlist">Waitlist</option>
              </select>
            </div>
          </div>
          <div className="field"><label>Notes</label><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Add Booking'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ViewModal({ enrolment: e, onClose, onCancelled }) {
  const s = e.class_session_detail
  const st = e.student_detail
  const [cancelling, setCancelling] = useState(false)

  async function cancel() {
    if (!confirm('Cancel this booking?')) return
    setCancelling(true)
    try {
      await enrolments.update(e.id, { status: 'cancelled' })
      onCancelled()
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={ev => ev.target === ev.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 420 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Booking Details</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 8, fontWeight: 600 }}>Student</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{st?.display_name}</div>
            {st?.email && <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{st.email}</div>}
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 8, fontWeight: 600 }}>Class</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{s?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{DAYS[s?.day_of_week]} {s?.start_time?.slice(0, 5)} · {s?.studio_detail?.name}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 4, fontWeight: 600 }}>Type</div>
              <span className={`tag ${TYPE_TAG[e.enrolment_type] || 'tag-grey'}`} style={{ fontSize: 11 }}>{e.enrolment_type}</span>
            </div>
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 4, fontWeight: 600 }}>Status</div>
              <span className={`tag ${STATUS_TAG[e.status] || 'tag-grey'}`} style={{ fontSize: 11 }}>{e.status}</span>
            </div>
          </div>
          {e.enrolled_date && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 4, fontWeight: 600 }}>Enrolled</div>
              <div style={{ fontSize: 13 }}>{new Date(e.enrolled_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
          )}
          {e.notes && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 4, fontWeight: 600 }}>Notes</div>
              <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>{e.notes}</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {e.status === 'active' && (
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }} onClick={cancel} disabled={cancelling}>
                {cancelling ? 'Cancelling…' : 'Cancel Booking'}
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminBookings() {
  const { data, loading, refetch } = useApi(() => enrolments.list())
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [viewing, setViewing] = useState(null)

  const all = data?.results || []

  const filtered = all.filter(e => {
    const name = e.student_detail?.display_name?.toLowerCase() || ''
    const session = e.class_session_detail?.name?.toLowerCase() || ''
    const matchSearch = !search || name.includes(search.toLowerCase()) || session.includes(search.toLowerCase())
    const matchType = !filterType || e.enrolment_type === filterType
    const matchStatus = !filterStatus || e.status === filterStatus
    return matchSearch && matchType && matchStatus
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Bookings</div>
          <div className="page-sub">{all.length} total enrolments</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => setShowAdd(true)}>+ Add Booking</button>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {[
          ['Total', all.length, 'kpi-lime'],
          ['Active', all.filter(e => e.status === 'active').length, 'kpi-lav'],
          ['Waitlist', all.filter(e => e.status === 'waitlist').length, 'kpi-amber'],
          ['Cancelled', all.filter(e => e.status === 'cancelled').length, 'kpi-red'],
        ].map(([label, val, cls]) => (
          <div key={label} className={`kpi ${cls}`}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{val}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search student or class…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '8px 12px', fontSize: 13, outline: 'none', width: 260 }}
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '7px 12px', fontSize: 13, outline: 'none' }}>
          <option value="">All Types</option>
          <option value="course">Course</option>
          <option value="casual">Casual</option>
          <option value="trial">Trial</option>
          <option value="workshop">Workshop</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '7px 12px', fontSize: 13, outline: 'none' }}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="waitlist">Waitlist</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : (
        <div className="tbl-section">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Studio</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const s = e.class_session_detail
                const st = e.student_detail
                return (
                  <tr key={e.id} className="clickable" onClick={() => setViewing(e)}>
                    <td>
                      <b>{st?.display_name || `Student ${e.student}`}</b>
                      {st?.email && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{st.email}</div>}
                    </td>
                    <td>
                      <b>{s?.name}</b>
                      <div style={{ fontSize: 11, color: 'var(--grey)' }}>{DAYS[s?.day_of_week]} {s?.start_time?.slice(0, 5)}</div>
                    </td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{s?.studio_detail?.name}</td>
                    <td><span className={`tag ${TYPE_TAG[e.enrolment_type] || 'tag-grey'}`} style={{ fontSize: 10 }}>{e.enrolment_type}</span></td>
                    <td><span className={`tag ${STATUS_TAG[e.status] || 'tag-grey'}`} style={{ fontSize: 10 }}>{e.status}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }} onClick={ev => ev.stopPropagation()}>
                      <button className="btn btn-ghost btn-xs" style={{ marginRight: 4 }} onClick={() => setViewing(e)}>View</button>
                      {e.status === 'active' && (
                        <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={async () => {
                          if (!confirm('Cancel this booking?')) return
                          await enrolments.update(e.id, { status: 'cancelled' })
                          refetch()
                        }}>Cancel</button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--grey)', padding: '32px 0' }}>No bookings found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <BookingModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); refetch() }} />
      )}
      {viewing && (
        <ViewModal enrolment={viewing} onClose={() => setViewing(null)} onCancelled={() => { setViewing(null); refetch() }} />
      )}
    </div>
  )
}
