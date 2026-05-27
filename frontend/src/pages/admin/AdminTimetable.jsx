import { useState, useMemo, useCallback } from 'react'
import { useApi } from '../../hooks/useApi'
import { classes, seasons as seasonsApi } from '../../api'
import { Link, useNavigate } from 'react-router-dom'
import AddEditClassModal from '../../components/AddEditClassModal'
import { fmt12 } from '../../utils/time'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS      = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const FALLBACK_SEASON_LABEL = 'Current Season'
const FALLBACK_SEASON_WEEKS = 8
const FALLBACK_SEASON_START = new Date('2026-04-06T00:00:00')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekStart(offset = 0) {
  const d = new Date()
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
  d.setDate(d.getDate() - dow + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function getSeasonWeek(weekStart, seasonStart, seasonWeeks) {
  const ms = weekStart - seasonStart
  if (ms < 0) return null
  const week = Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) + 1
  return week > seasonWeeks ? null : week
}

function timeToMinutes(t = '') {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function cardColors(studioName = '', isPractice = false, conflicting = false) {
  if (conflicting) return { bg: '#ff4444', text: '#fff', subText: 'rgba(255,255,255,0.75)' }
  if (isPractice) return { bg: '#2a2a2a', text: '#888', subText: '#555' }
  const s = studioName.toLowerCase()
  if (s.includes('box'))      return { bg: '#b0a0ff', text: '#000', subText: 'rgba(0,0,0,0.55)' }
  if (s.includes('rhapsody')) return { bg: '#ccff00', text: '#000', subText: 'rgba(0,0,0,0.55)' }
  // Janitor's Closet or unknown studio
  return { bg: '#444', text: '#fff', subText: 'rgba(255,255,255,0.6)' }
}

function detectConflicts(sessions) {
  const conflicts = new Set()
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const a = sessions[i], b = sessions[j]
      if (a.day_of_week !== b.day_of_week) continue
      const studioA = a.studio_detail?.id ?? a.studio
      const studioB = b.studio_detail?.id ?? b.studio
      if (!studioA || !studioB || studioA !== studioB) continue
      const aStart = timeToMinutes(a.start_time)
      const aEnd   = aStart + (a.duration_minutes ?? 55)
      const bStart = timeToMinutes(b.start_time)
      const bEnd   = bStart + (b.duration_minutes ?? 55)
      if (aStart < bEnd && bStart < aEnd) {
        conflicts.add(a.id)
        conflicts.add(b.id)
      }
    }
  }
  return conflicts
}

// ─── Session Detail Modal ─────────────────────────────────────────────────────

function SessionDetailModal({ session, onClose }) {
  if (!session) return null
  const colors = cardColors(session.studio_detail?.name ?? '', session.isPractice ?? false)
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#111',
          border: '1px solid var(--border, #333)',
          borderTop: `3px solid ${colors.bg}`,
          borderRadius: 8,
          padding: 28,
          minWidth: 320,
          maxWidth: 460,
          width: '100%',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{session.name}</div>
            {session.level && <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{session.level}</div>}
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose} style={{ padding: '2px 8px', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--grey)' }}>
          <div><b style={{ color: '#fff' }}>Day:</b> {DAYS_FULL[session.day_of_week]}</div>
          <div><b style={{ color: '#fff' }}>Time:</b> {fmt12(session.start_time)}</div>
          <div><b style={{ color: '#fff' }}>Duration:</b> {session.duration_minutes ?? 55} min</div>
          <div><b style={{ color: '#fff' }}>Instructor:</b> {session.instructor_detail?.display_name || '—'}</div>
          <div><b style={{ color: '#fff' }}>Studio:</b> {session.studio_detail?.name || '—'}</div>
          <div>
            <b style={{ color: '#fff' }}>Enrolment:</b>{' '}
            <span style={{ color: session.enrolled_count >= session.capacity ? 'var(--amber)' : '#fff' }}>
              {session.enrolled_count}
            </span>/{session.capacity}
          </div>
          {session.notes && <div><b style={{ color: '#fff' }}>Notes:</b> {session.notes}</div>}
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
          {!session.isPractice && (
            <Link to={`/admin/classes/${session.id}/attendance`}>
              <button className="btn btn-lime btn-sm">Go to Attendance →</button>
            </Link>
          )}
          {session.isPractice && (
            <Link to="/admin/practice-time">
              <button className="btn btn-lime btn-sm">Manage Practice Time →</button>
            </Link>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── Calendar Card (stacked, no absolute positioning) ─────────────────────────

function CalendarCard({ session, occurrence, dataMode = 'season', conflicting, onClick }) {
  const colors     = cardColors(session.studio_detail?.name ?? '', session.isPractice ?? false, conflicting)
  const instructor = session.instructor_detail?.display_name || ''
  const firstName  = instructor.split(' ')[0]
  const capacity   = session.capacity || 0

  let bookedCount, waitlistCount, hasTrial
  if (dataMode === 'week' && occurrence) {
    bookedCount   = (occurrence.enrolled_count ?? 0) + (occurrence.casual_booked_count ?? 0)
    waitlistCount = occurrence.waitlist_count ?? 0
    hasTrial      = (occurrence.trial_count ?? 0) > 0
  } else {
    bookedCount   = session.enrolled_count ?? 0
    waitlistCount = session.waitlist_count ?? 0
    hasTrial      = false
  }

  const isFull = bookedCount >= capacity && capacity > 0

  return (
    <div
      onClick={onClick}
      title={`${session.name}${firstName ? ` · ${firstName}` : ''} — ${fmt12(session.start_time)} · ${bookedCount}/${capacity}${waitlistCount > 0 ? ` · ${waitlistCount} waiting` : ''}${hasTrial ? ' · ★ first timer' : ''}`}
      style={{
        background: colors.bg,
        borderRadius: 4,
        padding: '4px 6px',
        marginBottom: 3,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'filter 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.88)' }}
      onMouseLeave={e => { e.currentTarget.style.filter = '' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <div style={{
          fontWeight: 800, fontSize: 10, color: colors.text, textTransform: 'uppercase',
          letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', flex: 1, lineHeight: 1.3,
        }}>
          {session.name}
        </div>
        {hasTrial && <span style={{ fontSize: 9, color: colors.text, flexShrink: 0 }}>★</span>}
      </div>
      {firstName && (
        <div style={{
          fontSize: 9, color: colors.subText, fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2,
        }}>
          {firstName.toUpperCase()}
        </div>
      )}
      <div style={{ fontSize: 9, color: isFull ? colors.text : colors.subText, lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 3 }}>
        <span style={{ fontWeight: isFull ? 700 : 400 }}>
          {bookedCount}/{capacity}{isFull ? ' FULL' : ''}
        </span>
        {waitlistCount > 0 && (
          <span style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 2, padding: '0 3px', fontSize: 8, fontWeight: 700 }}>
            +{waitlistCount}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Calendar Grid (table-based, cards stack vertically per cell) ─────────────

function CalendarGrid({
  sessions, weekStart,
  conflictIds = new Set(), showConflicts = false, onDismissConflicts, conflictsDismissed,
  occurrencesBySession = new Map(), dataMode = 'season',
}) {
  const [selectedSession, setSelectedSession] = useState(null)

  // One row per unique start_time across all sessions
  const timeSlots = useMemo(
    () => [...new Set(sessions.map(s => s.start_time).filter(Boolean))].sort(),
    [sessions]
  )

  // Map "dayIdx|time" → [sessions]
  const grid = useMemo(() => {
    const map = {}
    sessions.forEach(s => {
      if (s.day_of_week == null || !s.start_time) return
      const key = `${s.day_of_week}|${s.start_time}`
      if (!map[key]) map[key] = []
      map[key].push(s)
    })
    return map
  }, [sessions])

  const showConflictBanner = showConflicts && conflictIds.size > 0 && !conflictsDismissed
  const conflictPairCount  = Math.ceil(conflictIds.size / 2)
  const todayMidnight = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  return (
    <>
      {showConflictBanner && (
        <div style={{
          background: 'rgba(255,68,68,0.12)', border: '1px solid var(--red, #ff4444)',
          borderRadius: 6, padding: '8px 16px', marginBottom: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 13, color: 'var(--red, #ff4444)',
        }}>
          <span>⚠ {conflictPairCount} scheduling conflict{conflictPairCount !== 1 ? 's' : ''} detected</span>
          <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red, #ff4444)', borderColor: 'var(--red, #ff4444)' }} onClick={onDismissConflicts}>Dismiss</button>
        </div>
      )}

      <div style={{ overflowX: 'auto', border: '1px solid var(--border, #333)', borderRadius: 6 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600 }}>
          <thead>
            <tr style={{ background: '#111' }}>
              <th style={{ width: 64, padding: '8px', fontSize: 11, color: 'var(--grey)', fontWeight: 600, textAlign: 'left', borderBottom: '1px solid var(--border, #333)', position: 'sticky', top: 0, background: '#111', zIndex: 5 }}>
                Time
              </th>
              {DAYS.map((day, i) => {
                const d = new Date(weekStart)
                d.setDate(d.getDate() + i)
                const isToday = d.getTime() === todayMidnight.getTime()
                return (
                  <th key={day} style={{
                    padding: '8px 4px', textAlign: 'center', fontSize: 12, fontWeight: 600,
                    color: isToday ? 'var(--lime, #ccff00)' : 'var(--grey)',
                    borderBottom: '1px solid var(--border, #333)',
                    borderLeft: '1px solid var(--border, #333)',
                    minWidth: 120,
                    position: 'sticky', top: 0, background: '#111', zIndex: 5,
                  }}>
                    <div>{day}</div>
                    <div style={{ fontSize: 11, fontWeight: 400 }}>
                      {d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {timeSlots.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--grey)', padding: '32px 0', fontSize: 13 }}>
                  No classes scheduled
                </td>
              </tr>
            ) : timeSlots.map(time => (
              <tr key={time} style={{ borderTop: '1px solid var(--border, #2a2a2a)' }}>
                <td style={{
                  padding: '6px 8px', fontSize: 11, color: 'var(--grey)', fontWeight: 600,
                  verticalAlign: 'top', whiteSpace: 'nowrap',
                  borderRight: '1px solid var(--border, #2a2a2a)',
                }}>
                  {fmt12(time)}
                </td>
                {Array.from({ length: 7 }, (_, dayIdx) => {
                  const cell = grid[`${dayIdx}|${time}`] ?? []
                  return (
                    <td key={dayIdx} style={{
                      padding: 4, verticalAlign: 'top',
                      borderLeft: '1px solid var(--border, #2a2a2a)',
                      minWidth: 120,
                    }}>
                      {cell.map(s => (
                        <CalendarCard
                          key={s.id}
                          session={s}
                          occurrence={occurrencesBySession.get(s.id)}
                          dataMode={dataMode}
                          conflicting={showConflicts && conflictIds.has(s.id)}
                          onClick={() => setSelectedSession(s)}
                        />
                      ))}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSession && (
        <SessionDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminTimetable() {
  const navigate = useNavigate()
  const [weekOffset, setWeekOffset]     = useState(0)
  const [view, setView]                 = useState('list')   // 'calendar' | 'list'
  const [dataMode, setDataMode]         = useState('season') // 'season' | 'week'
  const [mode, setMode]                 = useState('attend') // 'attend' | 'setup'
  const [showAddClass, setShowAddClass] = useState(false)
  const [editSession, setEditSession]   = useState(null)
  const [sessionList, setSessionList]   = useState(null)
  const [conflictsDismissed, setConflictsDismissed] = useState(true)
  const [conflictCheckTick, setConflictCheckTick]   = useState(0)
  const [selectedSeasonId, setSelectedSeasonId]     = useState(null)
  const [setupFilterLevel,    setSetupFilterLevel]    = useState('')
  const [setupFilterTeacher,  setSetupFilterTeacher]  = useState('')
  const [setupFilterWaitlist, setSetupFilterWaitlist] = useState(false)
  const [setupFilterLow,      setSetupFilterLow]      = useState(false)

  const { data: seasonsData } = useApi(() => seasonsApi.list())
  const seasonOptions = seasonsData?.results ?? (Array.isArray(seasonsData) ? seasonsData : [])

  const activeSeason = selectedSeasonId
    ? (seasonOptions?.find(s => s.id === selectedSeasonId) ?? seasonOptions?.find(s => s.status === 'active') ?? null)
    : (seasonOptions?.find(s => s.status === 'active') ?? null)

  const seasonIdForFetch = activeSeason?.id
  const { data, loading } = useApi(
    () => seasonIdForFetch ? classes.list({ season: seasonIdForFetch }) : classes.list({ active: true }),
    [seasonIdForFetch]
  )
  const seasonStart  = activeSeason?.start_date ? new Date(activeSeason.start_date + 'T00:00:00') : FALLBACK_SEASON_START
  const seasonEnd    = activeSeason?.end_date ? new Date(activeSeason.end_date + 'T00:00:00') : null
  const seasonWeeks  = seasonEnd ? Math.round((seasonEnd - seasonStart) / (7 * 24 * 60 * 60 * 1000)) : FALLBACK_SEASON_WEEKS
  const seasonLabel  = activeSeason?.name ?? FALLBACK_SEASON_LABEL

  const [prevSeasonId, setPrevSeasonId] = useState(null)
  if (seasonIdForFetch !== prevSeasonId) { setPrevSeasonId(seasonIdForFetch); setSessionList(null) }

  const sessions = sessionList ?? (data?.results ?? [])

  const weekStart = getWeekStart(weekOffset)
  const weekLabel = 'Week of ' + weekStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart); d.setDate(d.getDate() + 6); return d
  }, [weekStart])
  const weekStartStr = weekStart.toISOString().slice(0, 10)
  const weekEndStr   = weekEnd.toISOString().slice(0, 10)

  const shouldFetchOccurrences = mode === 'attend' && view === 'calendar' && dataMode === 'week'
  const { data: occData } = useApi(
    () => shouldFetchOccurrences
      ? classes.occurrences({ date_from: weekStartStr, date_to: weekEndStr, page_size: 200 })
      : null,
    [shouldFetchOccurrences, weekStartStr, weekEndStr]
  )
  const occurrencesBySession = useMemo(() => {
    const map = new Map()
    const list = occData?.results ?? (Array.isArray(occData) ? occData : [])
    list.forEach(occ => { if (occ.session) map.set(occ.session, occ) })
    return map
  }, [occData])

  // Practice slots for the visible week — always shown on calendar
  const shouldFetchPractice = view === 'calendar'
  const { data: practiceData } = useApi(
    () => shouldFetchPractice
      ? classes.practice.list({ date_from: weekStartStr, date_to: weekEndStr, page_size: 100 })
      : null,
    [shouldFetchPractice, weekStartStr, weekEndStr]
  )
  // Convert practice slots to pseudo-sessions keyed by day index
  const practiceSlots = useMemo(() => {
    const list = practiceData?.results ?? (Array.isArray(practiceData) ? practiceData : [])
    return list
      .filter(p => p.is_active)
      .map(p => {
        const d = new Date(p.date + 'T00:00:00')
        const dow = d.getDay() === 0 ? 6 : d.getDay() - 1  // Mon=0
        const durationMins = p.duration_hours ? Math.round(p.duration_hours * 60) : 60
        return {
          id:               `practice-${p.id}`,
          name:             'Practice Time',
          day_of_week:      dow,
          start_time:       p.start_time,
          duration_minutes: durationMins,
          capacity:         p.capacity,
          enrolled_count:   p.booked_count ?? 0,
          waitlist_count:   0,
          studio_detail:    p.studio_detail,
          instructor_detail: null,
          isPractice:       true,
          _practiceId:      p.id,
        }
      })
  }, [practiceData])

  const seasonWeek      = getSeasonWeek(weekStart, seasonStart, seasonWeeks)
  const seasonWeekLabel = seasonWeek ? `${seasonLabel} — Week ${seasonWeek} of ${seasonWeeks}` : seasonLabel

  const conflictIds = useMemo(
    () => detectConflicts(sessions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, conflictCheckTick]
  )

  const handleRecheck = useCallback(() => {
    setConflictsDismissed(prev => !prev)
    setConflictCheckTick(t => t + 1)
  }, [])

  const sorted = [...sessions].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
    return (a.start_time || '').localeCompare(b.start_time || '')
  })

  function handleSaved(session) {
    if (editSession) {
      setSessionList(prev => (prev ?? sessions).map(s => s.id === session.id ? session : s))
    } else {
      setSessionList(prev => [...(prev ?? sessions), session])
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Row 1: title + controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="page-title" style={{ marginBottom: 0 }}>Timetable</div>
          <select
            value={selectedSeasonId ?? activeSeason?.id ?? ''}
            onChange={e => setSelectedSeasonId(Number(e.target.value) || null)}
            style={{ background: '#1a1a1a', border: '1px solid var(--border, #333)', color: 'var(--white)', borderRadius: 6, padding: '5px 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', maxWidth: 180 }}
          >
            {seasonOptions.length > 0
              ? seasonOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
              : <option>{FALLBACK_SEASON_LABEL}</option>
            }
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Attend / Setup toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border, #333)', borderRadius: 6, overflow: 'hidden' }}>
            {[['attend', 'Attendance Mode'], ['setup', 'Term Setup']].map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: '5px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: mode === m ? 'var(--lime, #ccff00)' : 'transparent',
                color:      mode === m ? '#000' : 'var(--grey)',
                transition: 'background 0.15s, color 0.15s',
              }}>{label}</button>
            ))}
          </div>

          {/* Season / This Week data mode (attend calendar only) */}
          {mode === 'attend' && view === 'calendar' && (
            <div style={{ display: 'flex', border: '1px solid var(--border, #333)', borderRadius: 6, overflow: 'hidden' }}>
              {[['season', 'Season'], ['week', 'This Week']].map(([dm, label]) => (
                <button key={dm} onClick={() => setDataMode(dm)} style={{
                  padding: '5px 12px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: dataMode === dm ? '#333' : 'transparent',
                  color:      dataMode === dm ? '#fff' : 'var(--grey)',
                  transition: 'background 0.15s, color 0.15s',
                }}>{label}</button>
              ))}
            </div>
          )}

          {/* Calendar / List view toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border, #333)', borderRadius: 6, overflow: 'hidden' }}>
            {[['calendar', '⊞ Calendar'], ['list', '☰ List']].map(([v, label]) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '5px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: view === v ? 'var(--lime, #ccff00)' : 'transparent',
                color:      view === v ? '#000' : 'var(--grey)',
                transition: 'background 0.15s, color 0.15s',
              }}>{label}</button>
            ))}
          </div>

          <button className="btn btn-lime btn-sm" onClick={() => { setEditSession(null); setShowAddClass(true) }}>
            + Add Class
          </button>
        </div>
      </div>

      {/* Row 2: week nav — hidden in setup mode */}
      {mode !== 'setup' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w - 1)}>← Prev</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>
            {view === 'calendar' ? seasonWeekLabel : weekLabel}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w + 1)}>Next →</button>
          {view === 'calendar' && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: 8, ...((!conflictsDismissed && conflictIds.size > 0) ? { color: 'var(--red)', borderColor: 'var(--red)' } : {}) }}
              onClick={handleRecheck}
            >
              {conflictsDismissed ? 'Check Conflicts' : `Hide Conflicts (${Math.ceil(conflictIds.size / 2)})`}
            </button>
          )}
        </div>
      )}

      {/* Studio colour legend */}
      {view === 'calendar' && (
        <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ccff00', display: 'inline-block' }} />
            Rhapsody
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#b0a0ff', display: 'inline-block' }} />
            The Box
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#444', display: 'inline-block' }} />
            Janitor's Closet
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#2a2a2a', border: '1px solid #555', display: 'inline-block' }} />
            Practice Time
          </span>
        </div>
      )}

      {/* Week data mode legend */}
      {mode === 'attend' && view === 'calendar' && dataMode === 'week' && (
        <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 10, display: 'flex', gap: 14, alignItems: 'center' }}>
          <span>This week: enrolled + casuals + catch-ups</span>
          <span style={{ color: '#ccff00' }}>★ = first timer booked</span>
          <span>+N = waitlisted</span>
        </div>
      )}

      {/* Term Setup banner */}
      {mode === 'setup' && (
        <div style={{ background: '#151000', border: '1px solid var(--amber)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: 'var(--amber)' }}>
          ⚙ Term Setup Mode — view season roster, edit class settings (levels, capacity, tags) and manage enrolments
        </div>
      )}

      {/* ── Body ── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="spinner" />
        </div>
      ) : view === 'calendar' ? (
        /* ── Calendar view (shared by both modes) ── */
        <CalendarGrid
          sessions={[...sessions, ...practiceSlots]}
          weekStart={weekStart}
          conflictIds={conflictIds}
          showConflicts={!conflictsDismissed}
          conflictsDismissed={conflictsDismissed}
          onDismissConflicts={() => setConflictsDismissed(true)}
          occurrencesBySession={occurrencesBySession}
          dataMode={mode === 'attend' ? dataMode : 'season'}
        />
      ) : mode === 'setup' ? (
        /* ── Term Setup list view ── */
        (() => {
          const instructorNames = [...new Set(sorted.map(s => s.instructor_detail?.display_name).filter(Boolean))]
          const levelNames      = [...new Set(sorted.map(s => s.name).filter(Boolean))].sort()
          const filtered = sorted.filter(s => {
            if (setupFilterLevel   && s.name !== setupFilterLevel) return false
            if (setupFilterTeacher && (s.instructor_detail?.display_name || '') !== setupFilterTeacher) return false
            if (setupFilterWaitlist && !(s.waitlist_count > 0)) return false
            if (setupFilterLow     && !(s.enrolled_count < 4)) return false
            return true
          })
          const seasonInfo = activeSeason
            ? `${activeSeason.name} · ${activeSeason.start_date} to ${activeSeason.end_date} · ${seasonWeeks} weeks`
            : 'No active season'

          return (
            <div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
                <select value={setupFilterLevel} onChange={e => setSetupFilterLevel(e.target.value)}
                  style={{ background: '#1a1a1a', border: '1px solid var(--border)', color: 'var(--white)', padding: '7px 12px', borderRadius: 8, fontFamily: 'inherit', fontSize: 13 }}>
                  <option value="">All Classes</option>
                  {levelNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <select value={setupFilterTeacher} onChange={e => setSetupFilterTeacher(e.target.value)}
                  style={{ background: '#1a1a1a', border: '1px solid var(--border)', color: 'var(--white)', padding: '7px 12px', borderRadius: 8, fontFamily: 'inherit', fontSize: 13 }}>
                  <option value="">All Teachers</option>
                  {instructorNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={setupFilterWaitlist} onChange={e => setSetupFilterWaitlist(e.target.checked)} style={{ accentColor: 'var(--amber)' }} />
                  <span style={{ color: 'var(--amber)' }}>Has waitlist</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={setupFilterLow} onChange={e => setSetupFilterLow(e.target.checked)} style={{ accentColor: 'var(--lav)' }} />
                  <span style={{ color: 'var(--lav)' }}>Low numbers (&lt;4)</span>
                </label>
                {(setupFilterLevel || setupFilterTeacher || setupFilterWaitlist || setupFilterLow) && (
                  <button className="btn btn-ghost btn-xs" onClick={() => { setSetupFilterLevel(''); setSetupFilterTeacher(''); setSetupFilterWaitlist(false); setSetupFilterLow(false) }}>Clear</button>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 14 }}>
                {seasonInfo} · Click any class to view roster or edit settings
              </div>

              {/* Grouped by day */}
              {DAYS.map((dayName, dayIdx) => {
                const daySessions = filtered.filter(s => s.day_of_week === dayIdx)
                if (daySessions.length === 0) return null
                return (
                  <div key={dayIdx} style={{ marginBottom: 20 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: 'var(--grey)', padding: '6px 0', borderBottom: '1px solid var(--border, #333)',
                      marginBottom: 8,
                    }}>
                      {dayName}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {daySessions.map(s => {
                        const isFull = s.enrolled_count >= s.capacity
                        const hasWaitlist = s.waitlist_count > 0
                        const isLow = s.enrolled_count < 4
                        return (
                          <div key={s.id} style={{ background: '#111', border: `1px solid ${isFull ? '#ff3333aa' : 'var(--border)'}`, borderRadius: 10 }}>
                            <div
                              style={{ display: 'grid', gridTemplateColumns: '170px 1fr 160px 90px auto', alignItems: 'center', gap: 12, padding: '12px 16px' }}
                            >
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{fmt12(s.start_time)}</div>
                              </div>
                              <div style={{ fontSize: 13 }}>
                                {s.instructor_detail?.display_name || '—'}
                                <span style={{ color: 'var(--grey)' }}> · {s.studio_detail?.name || '—'}</span>
                              </div>
                              <div>
                                <div style={{ fontSize: 13, color: isFull ? '#ff6b6b' : isLow ? 'var(--lav)' : 'var(--lime)' }}>
                                  {s.enrolled_count}/{s.capacity}{isFull ? ' FULL' : ''}
                                </div>
                                {hasWaitlist
                                  ? <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 2 }}>{s.waitlist_count} on waitlist</div>
                                  : <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>No waitlist</div>
                                }
                              </div>
                              <span className={`tag ${!s.is_active ? 'tag-grey' : isFull ? 'tag-amber' : 'tag-lime'}`} style={{ fontSize: 10 }}>
                                {!s.is_active ? 'Inactive' : isFull ? 'Full' : 'Active'}
                              </span>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-ghost btn-xs" onClick={() => navigate(`/admin/classes/${s.id}`)}>Edit Class</button>
                                <button className="btn btn-ghost btn-xs" style={{ color: 'var(--lime)' }} onClick={() => navigate(`/admin/classes/${s.id}/season-enrolments`)}>See Enrolments</button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {filtered.length === 0 && (
                <div style={{ color: 'var(--grey)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
                  No classes match the current filters.
                </div>
              )}
            </div>
          )
        })()
      ) : (
        /* ── Attendance list view — grouped by day ── */
        <div>
          {DAYS.map((dayName, dayIdx) => {
            const daySessions = sorted.filter(s => s.day_of_week === dayIdx)
            if (daySessions.length === 0) return null
            const classDate = new Date(weekStart)
            classDate.setDate(classDate.getDate() + dayIdx)
            const today = new Date(); today.setHours(0, 0, 0, 0)
            const isToday = classDate.getTime() === today.getTime()
            return (
              <div key={dayIdx} style={{ marginBottom: 24 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: isToday ? 'var(--lime, #ccff00)' : 'var(--grey)',
                  padding: '6px 0',
                  borderBottom: '1px solid var(--border, #333)',
                  marginBottom: 8,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {dayName}
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                    {classDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}
                  </span>
                  {isToday && <span style={{ fontSize: 10, background: 'var(--lime, #ccff00)', color: '#000', borderRadius: 4, padding: '1px 6px', fontWeight: 700, letterSpacing: '0.06em' }}>TODAY</span>}
                </div>
                <div className="tbl-section" style={{ marginBottom: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Class</th>
                        <th>Instructor</th>
                        <th>Studio</th>
                        <th>Enrolled</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daySessions.map(s => {
                        const isFull = s.enrolled_count >= s.capacity
                        return (
                          <tr key={s.id} className="clickable">
                            <td style={{
                              color: isToday ? 'var(--lime)' : 'var(--grey)',
                              fontFamily: "'Archivo Black', sans-serif",
                              fontSize: 14,
                            }}>
                              {fmt12(s.start_time)}
                            </td>
                            <td>
                              <b>{s.name}</b>
                              {s.level && <span style={{ fontSize: 11, color: 'var(--grey)', marginLeft: 6 }}>{s.level}</span>}
                            </td>
                            <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                              {s.instructor_detail?.display_name || '—'}
                            </td>
                            <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                              {s.studio_detail?.name || '—'}
                            </td>
                            <td>
                              <span style={{ color: isFull ? 'var(--amber)' : 'var(--white)' }}>{s.enrolled_count}</span>
                              <span style={{ color: 'var(--grey)' }}>/{s.capacity}</span>
                            </td>
                            <td>
                              <span className={`tag ${!s.is_active ? 'tag-grey' : isFull ? 'tag-amber' : 'tag-lime'}`} style={{ fontSize: 10 }}>
                                {!s.is_active ? 'Inactive' : isFull ? 'Full' : 'Active'}
                              </span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <Link to={`/admin/classes/${s.id}/attendance`}>
                                <button className="btn btn-ghost btn-xs" style={{ marginRight: 4 }}>Register</button>
                              </Link>
                              <button className="btn btn-ghost btn-xs" onClick={() => { setEditSession(s); setShowAddClass(true) }}>Edit</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
          {sorted.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--grey)', padding: '32px 0', fontSize: 13 }}>
              No classes yet — add your first class above
            </div>
          )}
        </div>
      )}

      {showAddClass && (
        <AddEditClassModal
          session={editSession}
          onClose={() => { setShowAddClass(false); setEditSession(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
