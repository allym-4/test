import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { classes, seasons as seasonsApi } from '../api'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../contexts/AuthContext'

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

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function sevenDaysStr() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

// ── Cover Modal ────────────────────────────────────────────────────────────────

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

// ── My Classes tab ─────────────────────────────────────────────────────────────

function MyClassesTab() {
  const [view, setView] = useState('today')
  const [weekOffset, setWeekOffset] = useState(0)
  const [coverModal, setCoverModal] = useState(null)

  const { data, loading } = useApi(() => classes.list({ instructor: 'me' }))
  const sessions = data?.results ?? data ?? []

  const weekStart = getWeekStart(weekOffset)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const currentWeekStart = getWeekStart(0)

  const sorted = [...sessions].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
    return (a.start_time || '').localeCompare(b.start_time || '')
  })

  const filtered = sorted.filter(s => {
    const classDate = sessionDate(view === 'past' ? getWeekStart(weekOffset) : currentWeekStart, s.day_of_week)
    const isPast = classDate < today
    const isToday = classDate.getTime() === today.getTime()
    if (view === 'today') return isToday
    if (view === 'past') return isPast && !isToday
    if (view === 'upcoming') return !isPast && !isToday
    return true
  })

  const displayed = view === 'past' ? [...filtered].reverse() : filtered
  const todayCount = sorted.filter(s => sessionDate(currentWeekStart, s.day_of_week).getTime() === today.getTime()).length

  return (
    <div>
      {/* Sub-header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>
          {view === 'past'
            ? `Week of ${weekLabel(getWeekStart(weekOffset))}`
            : new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        {view === 'past' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w - 1)}>← Prev</button>
            {weekOffset !== 0 && <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(0)}>This Week</button>}
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* Past / Today / Upcoming toggle */}
      <div style={{ display: 'flex', background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 10, padding: 3, gap: 2, marginBottom: 20, width: 'fit-content', maxWidth: '100%' }}>
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
            const isCover = s.is_cover || s.substitute_instructor != null
            const dayLabel = DAYS[s.day_of_week]
            const dateNum = classDate.getDate()
            const monthLabel = MONTHS[classDate.getMonth()]

            return (
              <div
                key={s.id}
                style={{
                  display: 'flex', alignItems: 'stretch',
                  background: '#111',
                  border: `1px solid ${isToday ? 'rgba(204,255,0,0.25)' : '#1e1e1e'}`,
                  borderRadius: 14, overflow: 'hidden',
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
                    {isCover && (
                      <span style={{ background: 'rgba(255,170,0,0.1)', color: '#ffaa00', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '2px 7px' }}>COVER</span>
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

// ── All Classes tab ────────────────────────────────────────────────────────────

function weekNumber(dateStr, seasonStartStr) {
  if (!dateStr || !seasonStartStr) return null
  const d = new Date(dateStr + 'T00:00')
  const s = new Date(seasonStartStr + 'T00:00')
  return Math.floor((d - s) / (7 * 24 * 3600 * 1000)) + 1
}

function AllClassesTab() {
  const [showUpcoming, setShowUpcoming] = useState(false)
  const today = todayStr()
  const upcoming7 = sevenDaysStr()
  const navigate = typeof window !== 'undefined' ? null : null // use Link instead

  const { data: todayData, loading: todayLoading } = useApi(
    () => classes.occurrences({ date: today }),
    [today]
  )
  const { data: upcomingData, loading: upcomingLoading } = useApi(
    () => showUpcoming ? classes.occurrences({ date_after: today, date_before: upcoming7 }) : null,
    [showUpcoming, today]
  )

  const loading = showUpcoming ? upcomingLoading : todayLoading
  const rawOccs = showUpcoming
    ? (upcomingData?.results ?? upcomingData ?? [])
    : (todayData?.results ?? todayData ?? [])

  const occs = [...rawOccs].sort((a, b) => {
    if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '')
    return (a.start_time || '').localeCompare(b.start_time || '')
  })

  // Group by date
  const byDate = {}
  for (const occ of occs) {
    const d = occ.date || 'unknown'
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(occ)
  }

  return (
    <div>
      {/* Today / Next 7 days toggle */}
      <div style={{ display: 'flex', background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 10, padding: 3, gap: 2, marginBottom: 20, width: 'fit-content', maxWidth: '100%' }}>
        {[['today', 'Today'], ['upcoming', 'Next 7 Days']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setShowUpcoming(key === 'upcoming')}
            style={{
              padding: '7px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s',
              background: (key === 'upcoming') === showUpcoming ? '#222' : 'transparent',
              color: (key === 'upcoming') === showUpcoming ? '#fff' : 'var(--grey)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : occs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--grey)', fontSize: 13 }}>
          {showUpcoming ? 'No classes in the next 7 days.' : 'No classes today.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(byDate).map(([date, dateOccs]) => {
            const dateObj = new Date(date + 'T00:00')
            const dayName = dateObj.toLocaleDateString('en-AU', { weekday: 'long' }).toUpperCase()
            const dayNum = dateObj.getDate()
            const monthName = dateObj.toLocaleDateString('en-AU', { month: 'long' }).toUpperCase()
            // Get week/season from first occurrence
            const firstOcc = dateOccs[0]
            const seasonStart = firstOcc?.session_detail?.season_start_date
            const seasonName = firstOcc?.session_detail?.season_name
            const wk = weekNumber(date, seasonStart)
            const dateLabel = [dayName, `${dayNum} ${monthName}`, wk != null && seasonName ? `— WEEK ${wk}, ${seasonName.toUpperCase()}` : ''].filter(Boolean).join(' ')

            return (
              <div key={date}>
                {/* Date group header */}
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--grey)', letterSpacing: '0.8px', marginBottom: 10, textTransform: 'uppercase' }}>
                  {dateLabel}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dateOccs.map(occ => {
                    const isOwn = occ.is_mine || occ.instructor_is_me
                    const name = occ.session_name || occ.session_detail?.name || 'Class'
                    const instructorName = occ.substitute_instructor_detail?.display_name
                      || occ.instructor_detail?.display_name
                      || occ.session_detail?.instructor_detail?.display_name
                      || null
                    const studioName = occ.studio_name || occ.session_detail?.studio_detail?.name || null
                    const enrolled = occ.enrolled_count ?? null
                    const capacity = occ.capacity ?? occ.session_detail?.capacity ?? null
                    const isFull = enrolled != null && capacity != null && enrolled >= capacity
                    const sessionId = occ.session || occ.session_detail?.id

                    return (
                      <Link key={occ.id} to={`/classes/${sessionId}/attendance`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div
                          style={{
                            display: 'flex', alignItems: 'stretch',
                            background: '#111',
                            border: `1px solid ${isOwn ? 'rgba(204,255,0,0.2)' : '#1e1e1e'}`,
                            borderRadius: 12, overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'border-color 0.12s',
                          }}
                        >
                          {/* Left accent */}
                          <div style={{ width: 4, flexShrink: 0, background: isOwn ? 'var(--lime)' : '#1e1e1e' }} />

                          <div style={{ flex: 1, minWidth: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                              <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                                {occ.start_time ? fmt12(occ.start_time) : ''}
                                {studioName && ` · ${studioName}`}
                                {instructorName && ` · ${instructorName}`}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                              {isOwn && (
                                <span style={{ background: 'rgba(204,255,0,0.12)', color: 'var(--lime)', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '3px 8px', letterSpacing: '0.4px' }}>YOURS</span>
                              )}
                              {enrolled != null && (
                                <span style={{ background: isFull ? 'rgba(204,255,0,0.08)' : 'rgba(255,255,255,0.05)', color: isFull ? 'var(--lime)' : 'var(--grey)', borderRadius: 6, fontSize: 10, fontWeight: 600, padding: '3px 8px' }}>
                                  {enrolled}{capacity != null ? `/${capacity}` : ''} enrolled
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Season Enrolments tab ──────────────────────────────────────────────────────

function SeasonEnrolmentsTab({ currentUserId }) {
  const { data: seasonsData } = useApi(() => seasonsApi.list())
  const allSeasons = seasonsData?.results ?? (Array.isArray(seasonsData) ? seasonsData : [])
  const relevantSeasons = allSeasons.filter(s => s.status === 'active' || s.status === 'upcoming')
  const [selectedSeasonId, setSelectedSeasonId] = useState(null)

  const activeSeason = relevantSeasons.find(s => s.id === selectedSeasonId)
    ?? relevantSeasons.find(s => s.status === 'active')
    ?? relevantSeasons[0]
    ?? null

  const { data: sessionsData, loading } = useApi(
    () => activeSeason ? classes.list({ season: activeSeason.id, page_size: 200 }) : null,
    [activeSeason?.id]
  )
  const allSessions = sessionsData?.results ?? sessionsData ?? []
  const mySessions = allSessions.filter(s =>
    s.instructor === currentUserId || s.instructor_detail?.id === currentUserId
  )
  const [showAll, setShowAll] = useState(false)
  const sessions = showAll ? allSessions : mySessions

  const sorted = [...sessions].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
    return (a.start_time || '').localeCompare(b.start_time || '')
  })

  const totalEnrolled = sessions.reduce((sum, s) => sum + (s.enrolled_count ?? 0), 0)
  const totalCapacity = sessions.reduce((sum, s) => sum + (s.capacity ?? 0), 0)

  return (
    <div>
      {/* Season picker */}
      {relevantSeasons.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {relevantSeasons.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSeasonId(s.id)}
              style={{
                padding: '5px 14px', borderRadius: 8, border: '1px solid',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: activeSeason?.id === s.id ? 'rgba(204,255,0,0.12)' : 'transparent',
                borderColor: activeSeason?.id === s.id ? 'rgba(204,255,0,0.35)' : 'var(--border)',
                color: activeSeason?.id === s.id ? 'var(--lime)' : 'var(--grey)',
              }}
            >
              {s.name}
              <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>
                {s.status === 'active' ? '● Active' : '○ Upcoming'}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* My / All toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>
          {activeSeason
            ? `${activeSeason.name} · ${allSessions.length} classes · ${totalEnrolled}/${totalCapacity} enrolled`
            : 'No active or upcoming season'}
        </div>
        <div style={{ display: 'flex', background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 8, padding: 2, gap: 2 }}>
          {[['mine', 'My Classes'], ['all', 'All Classes']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setShowAll(key === 'all')}
              style={{
                padding: '4px 14px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                background: showAll === (key === 'all') ? '#222' : 'transparent',
                color: showAll === (key === 'all') ? '#fff' : 'var(--grey)',
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : !activeSeason ? (
        <div style={{ color: 'var(--grey)', fontSize: 13, textAlign: 'center', padding: '48px 0' }}>No active or upcoming seasons.</div>
      ) : sorted.length === 0 ? (
        <div style={{ color: 'var(--grey)', fontSize: 13, textAlign: 'center', padding: '48px 0' }}>
          {showAll ? 'No classes in this season.' : 'You have no classes assigned in this season.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map(s => {
            const isOwn = s.instructor === currentUserId || s.instructor_detail?.id === currentUserId
            const isFull = s.enrolled_count >= s.capacity
            const pct = s.capacity > 0 ? Math.min(100, (s.enrolled_count / s.capacity) * 100) : 0
            const barColor = isFull ? 'var(--red)' : pct > 75 ? 'var(--amber)' : 'var(--lime)'
            const hasWaitlist = (s.waitlist_count ?? 0) > 0
            return (
              <div
                key={s.id}
                style={{
                  background: '#111',
                  border: `1px solid ${isOwn ? 'rgba(204,255,0,0.2)' : 'var(--border)'}`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                {isOwn && <div style={{ width: 3, alignSelf: 'stretch', background: 'var(--lime)', borderRadius: 2, flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                    {isOwn && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--lime)', background: 'rgba(204,255,0,0.1)', borderRadius: 4, padding: '1px 6px' }}>MINE</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 8 }}>
                    {DAYS[s.day_of_week]} · {fmt12(s.start_time)}
                    {s.instructor_detail?.display_name && <span> · {s.instructor_detail.display_name}</span>}
                    {s.studio_detail?.name && <span> · {s.studio_detail.name}</span>}
                  </div>
                  <div style={{ height: 3, background: '#1e1e1e', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: isFull ? 'var(--red)' : 'var(--white)' }}>
                    {s.enrolled_count ?? 0}<span style={{ fontSize: 13, color: 'var(--grey)', fontWeight: 400 }}>/{s.capacity}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--grey)' }}>enrolled</div>
                  {hasWaitlist && (
                    <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 2 }}>+{s.waitlist_count} waitlist</div>
                  )}
                </div>
                <Link to={`/classes/${s.id}/attendance`}>
                  <button className="btn btn-ghost btn-xs">Roster</button>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ClassesPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('mine')

  return (
    <div>
      {/* Page heading */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22 }}>My Classes</div>
      </div>

      {/* Tab strip */}
      <div style={{ display: 'flex', background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 10, padding: 3, gap: 2, marginBottom: 24, width: 'fit-content', maxWidth: '100%' }}>
        {[['mine', 'My Classes'], ['all', 'All Classes'], ['season', 'Season Enrolments']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '7px 22px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s',
              background: activeTab === key ? (key === 'season' ? 'rgba(204,255,0,0.15)' : '#222') : 'transparent',
              color: activeTab === key ? (key === 'season' ? 'var(--lime)' : '#fff') : 'var(--grey)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'mine' ? <MyClassesTab /> : activeTab === 'all' ? <AllClassesTab /> : <SeasonEnrolmentsTab currentUserId={user?.id} />}
    </div>
  )
}
