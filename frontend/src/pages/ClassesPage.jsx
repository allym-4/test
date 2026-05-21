import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { classes } from '../api'
import { Link } from 'react-router-dom'
import client from '../api/client'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const COVER_REASONS = ['Personal', 'Medical', 'Emergency', 'Other']

function getWeekStart(offsetWeeks = 0) {
  const d = new Date()
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
  d.setDate(d.getDate() - dow + offsetWeeks * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function weekLabel(weekStart) {
  return weekStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function sessionDate(weekStart, dayOfWeek) {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + dayOfWeek)
  return d
}

function fmt12(time) {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')}${ampm}`
}

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 440, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>Request Cover — {session.name}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: '18px 20px' }}>
          {toast && (
            <div style={{ background: 'var(--lime)', color: '#000', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
              {toast}
            </div>
          )}
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--grey)', display: 'block', marginBottom: 6 }}>Reason</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                style={{ width: '100%', background: '#111', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13 }}
              >
                {COVER_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--grey)', display: 'block', marginBottom: 6 }}>Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Additional notes for the studio…"
                style={{ width: '100%', background: '#111', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-lime btn-sm" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ClassesPage() {
  const [view, setView] = useState('today') // 'past' | 'today' | 'upcoming'
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

  // For past/today/upcoming we always use the current week
  const currentWeekStart = getWeekStart(0)

  const filtered = sorted.filter(s => {
    const classDate = sessionDate(view === 'past' ? getWeekStart(weekOffset) : currentWeekStart, s.day_of_week)
    const isPast = classDate < today
    const isToday = classDate.getTime() === today.getTime()
    if (view === 'today') return isToday
    if (view === 'past') return isPast && !isToday
    if (view === 'upcoming') return !isPast && !isToday
    return true
  })

  // For past view, sort newest-first
  const displayed = view === 'past' ? [...filtered].reverse() : filtered

  const todayCount = sorted.filter(s => sessionDate(currentWeekStart, s.day_of_week).getTime() === today.getTime()).length

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26 }}>My Classes</div>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 4 }}>
            {view === 'past' ? `Week of ${weekLabel(getWeekStart(weekOffset))}` : new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        {view === 'past' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w - 1)}>← Prev</button>
            {weekOffset !== 0 && <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(0)}>This Week</button>}
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* Toggle */}
      <div style={{ display: 'flex', background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 10, padding: 3, gap: 2, marginBottom: 24, width: 'fit-content' }}>
        {[['past', 'Past'], ['today', `Today${todayCount > 0 ? ` (${todayCount})` : ''}`], ['upcoming', 'Upcoming']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setView(key); setWeekOffset(0) }}
            style={{
              padding: '7px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s',
              background: view === key ? (key === 'today' ? 'var(--lime)' : '#222') : 'transparent',
              color: view === key ? (key === 'today' ? '#000' : '#fff') : 'var(--grey)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--grey)' }}>
          <div style={{ fontSize: 13 }}>
            {view === 'today' ? 'No classes today' : view === 'upcoming' ? 'No upcoming classes this week' : 'No past classes this week'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayed.map(s => {
            const classDate = sessionDate(view === 'past' ? getWeekStart(weekOffset) : currentWeekStart, s.day_of_week)
            const isPast = classDate < today
            const isToday = classDate.getTime() === today.getTime()
            const isFull = s.enrolled_count >= s.capacity
            const enrollPct = s.capacity > 0 ? Math.min(100, (s.enrolled_count / s.capacity) * 100) : 0
            const barColor = isFull ? 'var(--lime)' : enrollPct > 75 ? 'var(--amber)' : 'var(--lav)'
            const dayLabel = DAYS[s.day_of_week]
            const dateNum = classDate.getDate()
            const monthLabel = MONTHS[classDate.getMonth()]

            return (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  background: '#111',
                  border: `1px solid ${isToday ? 'rgba(204,255,0,0.25)' : '#1e1e1e'}`,
                  borderRadius: 14,
                  overflow: 'hidden',
                  opacity: isPast && !isToday ? 0.6 : 1,
                }}
              >
                {/* Left accent */}
                <div style={{ width: 4, flexShrink: 0, background: isToday ? 'var(--lime)' : isPast ? '#333' : 'var(--lav)' }} />

                {/* Date block */}
                <div style={{ width: 64, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 8px', borderRight: '1px solid #1e1e1e', gap: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{dayLabel}</div>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 24, color: isToday ? 'var(--lime)' : '#fff', lineHeight: 1.1 }}>{dateNum}</div>
                  <div style={{ fontSize: 10, color: '#555' }}>{monthLabel}</div>
                </div>

                {/* Main content */}
                <div style={{ flex: 1, minWidth: 0, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15 }}>{s.name}</div>
                    {isToday && (
                      <span style={{ background: 'rgba(204,255,0,0.12)', color: 'var(--lime)', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '2px 7px', letterSpacing: '0.4px' }}>TODAY</span>
                    )}
                    {isFull && (
                      <span style={{ background: 'rgba(204,255,0,0.08)', color: 'var(--lime)', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '2px 7px' }}>FULL</span>
                    )}
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10 }}>
                    {fmt12(s.start_time)}{s.end_time ? ` – ${fmt12(s.end_time)}` : ''}
                    {s.studio_detail?.name && <span style={{ marginLeft: 8, color: '#444' }}>· {s.studio_detail.name}</span>}
                  </div>

                  {/* Enrolment bar */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--grey)' }}>Enrolled</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: isFull ? 'var(--lime)' : 'var(--grey)' }}>
                        {s.enrolled_count ?? 0}/{s.capacity ?? '?'}
                      </span>
                    </div>
                    <div style={{ height: 3, background: '#1e1e1e', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${enrollPct}%`, background: barColor, borderRadius: 2, transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Link to={`/classes/${s.id}/attendance`}>
                      <button className={`btn btn-sm ${isToday ? 'btn-lime' : 'btn-ghost'}`}>
                        {isToday ? 'Take Register →' : isPast ? 'View Register' : 'View Roster'}
                      </button>
                    </Link>
                    {!isPast && (
                      <button className="btn btn-ghost btn-xs" onClick={() => setCoverModal(s)} style={{ fontSize: 11 }}>
                        Request Cover
                      </button>
                    )}
                  </div>
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
