import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { classes } from '../api'
import { Link } from 'react-router-dom'
import client from '../api/client'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getWeekStart(offsetWeeks = 0) {
  const d = new Date()
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
  d.setDate(d.getDate() - dow + offsetWeeks * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function weekLabel(weekStart) {
  return 'Week of ' + weekStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function sessionDate(weekStart, dayOfWeek) {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + dayOfWeek)
  return d
}

const COVER_REASONS = ['Personal', 'Medical', 'Emergency', 'Other']

function CoverModal({ session, onClose }) {
  const [reason, setReason] = useState('Personal')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  async function submit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await client.post('/api/users/availability/', {
        session_id: session.id,
        type: 'cover_request',
        reason,
        notes,
      })
      setToast('Cover request submitted')
      setTimeout(onClose, 1500)
    } catch {
      setToast('Failed to submit — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 440 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Request Cover — {session.name}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          {toast && (
            <div style={{ background: 'var(--lime)', color: '#000', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              {toast}
            </div>
          )}
          <form onSubmit={submit}>
            <div className="field">
              <label>Reason</label>
              <select value={reason} onChange={e => setReason(e.target.value)}>
                {COVER_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Notes</label>
              <textarea
                rows={4}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Additional notes for the studio…"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-lime btn-sm" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ClassesPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [coverModal, setCoverModal] = useState(null)
  const { data, loading } = useApi(() => classes.list())
  const sessions = data?.results || []

  const weekStart = getWeekStart(weekOffset)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sorted = [...sessions].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
    return (a.start_time || '').localeCompare(b.start_time || '')
  })

  return (
    <div>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">My Classes</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w - 1)}>← Prev Week</button>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{weekLabel(weekStart)}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w + 1)}>Next Week →</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : sorted.length === 0 ? (
        <div className="empty-state">No classes found</div>
      ) : (
        <div className="list-card">
          {sorted.map(s => {
            const classDate = sessionDate(weekStart, s.day_of_week)
            const isPast = classDate < today
            const isToday = classDate.getTime() === today.getTime()
            const isFull = s.enrolled_count >= s.capacity
            const needsAction = isToday || isPast
            const dayLabel = DAYS[s.day_of_week] + ' ' + classDate.getDate()

            return (
              <div key={s.id} className="list-row" style={{ flexWrap: 'wrap', gap: 10 }}>
                <div className="list-time">
                  <div className="list-time-val" style={{ color: needsAction ? 'var(--lime)' : 'var(--grey)' }}>
                    {s.start_time?.slice(0, 5)}
                  </div>
                  <div className="list-time-day">{dayLabel}</div>
                </div>
                <div className="list-body">
                  <div className="list-title">{s.name} · {s.studio_detail?.name}</div>
                  <div className="list-sub">
                    {s.enrolled_count}/{s.capacity} enrolled
                    {needsAction && <span style={{ color: 'var(--amber)', marginLeft: 6 }}>· Register not saved</span>}
                  </div>
                </div>
                <div className="list-end">
                  <span className={`tag ${needsAction ? 'tag-amber' : 'tag-grey'}`} style={{ fontSize: 10 }}>
                    {needsAction ? 'Action needed' : 'Upcoming'}
                  </span>
                </div>
                <div style={{ width: '100%', paddingLeft: 64, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {needsAction ? (
                    <Link to={`/classes/${s.id}/attendance`}>
                      <button className="btn btn-lime btn-xs">Take Register</button>
                    </Link>
                  ) : (
                    <Link to={`/classes/${s.id}/attendance`}>
                      <button className="btn btn-ghost btn-xs">View Roster</button>
                    </Link>
                  )}
                  <button className="btn btn-ghost btn-xs" onClick={() => setCoverModal(s)}>Request Cover</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {coverModal && <CoverModal session={coverModal} onClose={() => setCoverModal(null)} />}
    </div>
  )
}
