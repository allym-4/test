import { useState, useMemo, useCallback } from 'react'
import { useApi } from '../../hooks/useApi'
import { classes, seasons as seasonsApi } from '../../api'
import { Link } from 'react-router-dom'
import AddEditClassModal from '../../components/AddEditClassModal'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS      = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const SLOT_START_HOUR = 6        // 6:00 am
const SLOT_END_HOUR   = 22       // 10:00 pm (last label)
const SLOT_HEIGHT     = 40       // px per 30-min slot
const TOTAL_SLOTS     = (SLOT_END_HOUR - SLOT_START_HOUR) * 2  // 32 slots

const SEASON_LABEL = 'Season 4 (Current)'
const SEASON_WEEKS = 8
// Hardcoded season start — replace with live value from seasons API when available
const SEASON_START = new Date('2026-04-06T00:00:00')

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Monday-normalised week start for a given week offset */
function getWeekStart(offset = 0) {
  const d = new Date()
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1  // 0=Mon … 6=Sun
  d.setDate(d.getDate() - dow + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

/** 1-based season week number, or null if outside season */
function getSeasonWeek(weekStart) {
  const ms = weekStart - SEASON_START
  if (ms < 0) return null
  const week = Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) + 1
  return week > SEASON_WEEKS ? null : week
}

/** "HH:MM:SS" or "HH:MM" → total minutes from midnight */
function timeToMinutes(t = '') {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Minutes from midnight → 0-based grid row relative to SLOT_START_HOUR */
function minutesToRow(mins) {
  return (mins - SLOT_START_HOUR * 60) / 30
}

/** Build human-readable time label for a slot index */
function slotLabel(slotIndex) {
  const totalMins = SLOT_START_HOUR * 60 + slotIndex * 30
  const h24 = Math.floor(totalMins / 60)
  const m   = totalMins % 60
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const ampm = h24 < 12 ? 'am' : 'pm'
  return `${h12}:${String(m).padStart(2, '0')}${ampm}`
}

/** Colour theme based on class name */
function cardTheme(name = '') {
  const n = name.toLowerCase()
  if (n.includes('level'))
    return { bg: '#ccff0033', border: 'var(--lime)',  label: 'lime'  }
  if (n.includes('dance'))
    return { bg: '#b0a0ff33', border: 'var(--lav)',   label: 'lav'   }
  if (n.includes('workshop') || n.includes('intensive'))
    return { bg: '#ffaa0033', border: 'var(--amber)', label: 'amber' }
  return   { bg: 'rgba(255,255,255,0.06)', border: 'var(--grey)', label: 'grey' }
}

/**
 * Detect scheduling conflicts: two sessions in the same studio on the same
 * day whose time ranges overlap. Returns a Set of conflicting session IDs.
 */
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
      const aEnd   = aStart + (a.duration_minutes ?? 60)
      const bStart = timeToMinutes(b.start_time)
      const bEnd   = bStart + (b.duration_minutes ?? 60)
      if (aStart < bEnd && bStart < aEnd) {
        conflicts.add(a.id)
        conflicts.add(b.id)
      }
    }
  }
  return conflicts
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Modal shown when a calendar card is clicked */
function SessionDetailModal({ session, onClose }) {
  if (!session) return null
  const theme = cardTheme(session.name)
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
          background: 'var(--surface, #1a1a2e)',
          border: '1px solid var(--border, #333)',
          borderTop: `3px solid ${theme.border}`,
          borderRadius: 8,
          padding: 28,
          minWidth: 320,
          maxWidth: 460,
          width: '100%',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{session.name}</div>
            {session.level && (
              <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{session.level}</div>
            )}
          </div>
          <button
            className="btn btn-ghost btn-xs"
            onClick={onClose}
            style={{ padding: '2px 8px', fontSize: 16, lineHeight: 1 }}
          >×</button>
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--grey)' }}>
          <div><b style={{ color: 'var(--white, #fff)' }}>Day:</b> {DAYS_FULL[session.day_of_week]}</div>
          <div><b style={{ color: 'var(--white, #fff)' }}>Time:</b> {session.start_time?.slice(0, 5)}</div>
          <div>
            <b style={{ color: 'var(--white, #fff)' }}>Duration:</b>{' '}
            {session.duration_minutes ?? 60} min
          </div>
          <div>
            <b style={{ color: 'var(--white, #fff)' }}>Instructor:</b>{' '}
            {session.instructor_detail?.display_name || '—'}
          </div>
          <div>
            <b style={{ color: 'var(--white, #fff)' }}>Studio:</b>{' '}
            {session.studio_detail?.name || '—'}
          </div>
          <div>
            <b style={{ color: 'var(--white, #fff)' }}>Enrolment:</b>{' '}
            <span style={{ color: session.enrolled_count >= session.capacity ? 'var(--amber)' : 'var(--white, #fff)' }}>
              {session.enrolled_count}
            </span>/{session.capacity}
          </div>
          {session.notes && (
            <div><b style={{ color: 'var(--white, #fff)' }}>Notes:</b> {session.notes}</div>
          )}
        </div>

        {/* Actions */}
        <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
          <Link to={`/admin/classes/${session.id}/attendance`}>
            <button className="btn btn-lime btn-sm">Go to Attendance →</button>
          </Link>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

/**
 * A single coloured class card placed into the CSS grid via gridRowStart/End.
 * Must be rendered as a direct child of a grid container that uses
 * gridTemplateRows: `repeat(${TOTAL_SLOTS}, ${SLOT_HEIGHT}px)`.
 */
function CalendarCard({ session, conflicting, onClick }) {
  const theme    = cardTheme(session.name)
  const instructor = session.instructor_detail?.display_name || '—'
  const studio     = session.studio_detail?.name || '—'

  const startMins      = timeToMinutes(session.start_time)
  const duration       = session.duration_minutes ?? 60
  const rowStart       = minutesToRow(startMins)
  const rowSpan        = Math.max(1, duration / 30)

  // Clamp to visible grid bounds
  const clampedStart = Math.max(0, rowStart)
  const clampedEnd   = Math.min(TOTAL_SLOTS, rowStart + rowSpan)
  if (clampedEnd <= clampedStart) return null

  return (
    <div
      onClick={onClick}
      title={`${session.name} — ${session.start_time?.slice(0, 5)}`}
      style={{
        gridRowStart: clampedStart + 1,
        gridRowEnd:   clampedEnd   + 1,
        gridColumn:   1,             // single column inside the day container
        background:   theme.bg,
        borderLeft:   conflicting
          ? '3px solid var(--red, #ff4444)'
          : `3px solid ${theme.border}`,
        outline:      conflicting ? '1px solid var(--red, #ff4444)' : 'none',
        borderRadius: 4,
        padding:      '3px 5px',
        cursor:       'pointer',
        overflow:     'hidden',
        margin:       '1px 2px',
        minHeight:    0,
        display:      'flex',
        flexDirection:'column',
        gap:          1,
        boxSizing:    'border-box',
        zIndex:       2,
        transition:   'filter 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.3)' }}
      onMouseLeave={e => { e.currentTarget.style.filter = '' }}
    >
      <div style={{ fontWeight: 700, fontSize: 11, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {session.name}
      </div>
      <div style={{ fontSize: 10, color: 'var(--grey)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {instructor}
      </div>
      <div style={{ fontSize: 10, color: 'var(--grey)', lineHeight: 1.3 }}>
        {session.enrolled_count}/{session.capacity}
      </div>
      <div style={{ fontSize: 10, color: 'var(--grey)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {studio}
      </div>
    </div>
  )
}

/**
 * The 7-column calendar grid. Accepts pre-computed conflictIds so the parent
 * can also display the conflict count in the page header.
 */
function CalendarGrid({ sessions, weekStart, conflictIds, onDismissConflicts, conflictsDismissed }) {
  const [selectedSession, setSelectedSession] = useState(null)

  // Build time labels once
  const timeLabels = useMemo(
    () => Array.from({ length: TOTAL_SLOTS }, (_, i) => slotLabel(i)),
    []
  )

  // Group sessions by day index (0=Mon … 6=Sun)
  const byDay = useMemo(() => {
    const map = Array.from({ length: 7 }, () => [])
    sessions.forEach(s => {
      const d = s.day_of_week
      if (d >= 0 && d <= 6) map[d].push(s)
    })
    return map
  }, [sessions])

  const showConflictBanner = conflictIds.size > 0 && !conflictsDismissed
  const conflictPairCount  = Math.ceil(conflictIds.size / 2)

  return (
    <>
      {/* ── Conflict banner ── */}
      {showConflictBanner && (
        <div style={{
          background: 'rgba(255,68,68,0.12)',
          border: '1px solid var(--red, #ff4444)',
          borderRadius: 6,
          padding: '8px 16px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
          color: 'var(--red, #ff4444)',
        }}>
          <span>
            ⚠ {conflictPairCount} scheduling conflict{conflictPairCount !== 1 ? 's' : ''} detected
          </span>
          <button
            className="btn btn-ghost btn-xs"
            style={{ color: 'var(--red, #ff4444)', borderColor: 'var(--red, #ff4444)' }}
            onClick={onDismissConflicts}
          >Dismiss</button>
        </div>
      )}

      {/* ── Scrollable grid wrapper ── */}
      <div style={{
        overflowX: 'auto',
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 260px)',
        border: '1px solid var(--border, #333)',
        borderRadius: 6,
      }}>
        {/* Sticky day-header row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px repeat(7, minmax(100px, 1fr))',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--surface, #1a1a2e)',
          borderBottom: '1px solid var(--border, #333)',
        }}>
          {/* Empty corner */}
          <div style={{ padding: '6px 0' }} />

          {/* Day columns */}
          {DAYS.map((day, i) => {
            const d = new Date(weekStart)
            d.setDate(d.getDate() + i)
            const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0)
            const isToday = d.getTime() === todayMidnight.getTime()
            return (
              <div
                key={day}
                style={{
                  padding: '6px 4px',
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  color: isToday ? 'var(--lime, #ccff00)' : 'var(--grey)',
                  borderLeft: '1px solid var(--border, #333)',
                }}
              >
                <div>{day}</div>
                <div style={{ fontSize: 11, fontWeight: 400 }}>
                  {d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Grid body: time labels + day columns ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px repeat(7, minmax(100px, 1fr))',
          // Each column handles its own rows internally; outer grid just places columns
        }}>
          {/* Time label column */}
          <div style={{
            display: 'grid',
            gridTemplateRows: `repeat(${TOTAL_SLOTS}, ${SLOT_HEIGHT}px)`,
          }}>
            {timeLabels.map((label, i) => (
              <div
                key={label}
                style={{
                  fontSize: 10,
                  color: 'var(--grey)',
                  padding: '2px 6px 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border, #222)',
                  lineHeight: 1,
                  userSelect: 'none',
                  boxSizing: 'border-box',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Seven day columns */}
          {Array.from({ length: 7 }, (_, dayIdx) => (
            <div
              key={dayIdx}
              style={{
                display: 'grid',
                gridTemplateRows: `repeat(${TOTAL_SLOTS}, ${SLOT_HEIGHT}px)`,
                borderLeft: '1px solid var(--border, #222)',
                position: 'relative',
              }}
            >
              {/* Alternating slot background stripes */}
              {Array.from({ length: TOTAL_SLOTS }, (_, si) => (
                <div
                  key={si}
                  style={{
                    gridRow: `${si + 1} / ${si + 2}`,
                    gridColumn: 1,
                    background: si % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                    borderTop: si === 0 ? 'none' : '1px solid var(--border, #1e1e2e)',
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                />
              ))}

              {/* Class cards — placed by gridRowStart/End within the same grid */}
              {byDay[dayIdx].map(s => (
                <CalendarCard
                  key={s.id}
                  session={s}
                  conflicting={conflictIds.has(s.id)}
                  onClick={() => setSelectedSession(s)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Session detail modal */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminTimetable() {
  const [weekOffset, setWeekOffset]       = useState(0)
  const [view, setView]                   = useState('calendar')  // 'calendar' | 'list'
  const [showAddClass, setShowAddClass]   = useState(false)
  const [editSession, setEditSession]     = useState(null)
  const [sessionList, setSessionList]     = useState(null)
  const [conflictsDismissed, setConflictsDismissed] = useState(false)
  const [conflictCheckTick, setConflictCheckTick]   = useState(0)

  // Load active sessions
  const { data, loading } = useApi(() => classes.list({ active: true }))

  // Load seasons for the dropdown (best-effort; falls back to hardcoded)
  const { data: seasonsData } = useApi(() => seasonsApi.list())
  const seasonOptions = seasonsData?.results ?? seasonsData ?? null

  const sessions = sessionList ?? (data?.results ?? [])

  const weekStart     = getWeekStart(weekOffset)
  const weekLabel     = 'Week of ' + weekStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  const seasonWeek    = getSeasonWeek(weekStart)
  const seasonWeekLabel = seasonWeek
    ? `Season 4 — Week ${seasonWeek} of ${SEASON_WEEKS}`
    : SEASON_LABEL

  // Conflict detection — re-runs when sessions change or user clicks "Check"
  const conflictIds = useMemo(
    () => detectConflicts(sessions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, conflictCheckTick]
  )

  const handleRecheck = useCallback(() => {
    setConflictsDismissed(false)
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

  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>

        {/* Left: title + season selector + week nav */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div className="page-title">Timetable</div>

            {/* Season selector */}
            <select
              style={{
                background: 'var(--surface, #1a1a2e)',
                border: '1px solid var(--border, #333)',
                color: 'var(--grey)',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {seasonOptions && seasonOptions.length > 0
                ? seasonOptions.map(s => (
                    <option key={s.id} value={s.id}>{s.name ?? `Season ${s.number}`}</option>
                  ))
                : <option>{SEASON_LABEL}</option>
              }
            </select>

            {/* Check for Conflicts button — visible in calendar view */}
            {view === 'calendar' && (
              <button className="btn btn-ghost btn-sm" onClick={handleRecheck}>
                Check for Conflicts
              </button>
            )}
          </div>

          {/* Week navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w - 1)}>← Prev</button>
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              {view === 'calendar' ? seasonWeekLabel : weekLabel}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w + 1)}>Next →</button>
          </div>
        </div>

        {/* Right: Calendar/List toggle + Add Class */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Segmented toggle */}
          <div style={{
            display: 'flex',
            border: '1px solid var(--border, #333)',
            borderRadius: 6,
            overflow: 'hidden',
          }}>
            {['calendar', 'list'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '5px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: view === v ? 'var(--lime, #ccff00)' : 'transparent',
                  color:      view === v ? '#000' : 'var(--grey)',
                  transition: 'background 0.15s, color 0.15s',
                  textTransform: 'capitalize',
                }}
              >
                {v === 'calendar' ? '⊞ Calendar' : '☰ List'}
              </button>
            ))}
          </div>

          <button
            className="btn btn-lime btn-sm"
            onClick={() => { setEditSession(null); setShowAddClass(true) }}
          >+ Add Class</button>
        </div>
      </div>

      {/* ── Body ── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="spinner" />
        </div>
      ) : view === 'calendar' ? (
        <CalendarGrid
          sessions={sessions}
          weekStart={weekStart}
          conflictIds={conflictIds}
          conflictsDismissed={conflictsDismissed}
          onDismissConflicts={() => setConflictsDismissed(true)}
        />
      ) : (
        /* ── List view (unchanged) ── */
        <div className="tbl-section">
          <table>
            <thead>
              <tr>
                <th>Day</th>
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
              {sorted.map(s => {
                const isFull = s.enrolled_count >= s.capacity
                const classDate = new Date(weekStart)
                classDate.setDate(classDate.getDate() + s.day_of_week)
                const today = new Date(); today.setHours(0, 0, 0, 0)
                const isToday = classDate.getTime() === today.getTime()

                return (
                  <tr key={s.id} className="clickable">
                    <td>
                      <div style={{ fontWeight: 600 }}>{DAYS[s.day_of_week]}</div>
                      <div style={{ fontSize: 11, color: 'var(--grey)' }}>
                        {classDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </div>
                    </td>
                    <td style={{
                      color: isToday ? 'var(--lime)' : 'var(--grey)',
                      fontFamily: "'Archivo Black', sans-serif",
                      fontSize: 14,
                    }}>
                      {s.start_time?.slice(0, 5)}
                    </td>
                    <td>
                      <b>{s.name}</b>
                      {s.level && (
                        <span style={{ fontSize: 11, color: 'var(--grey)', marginLeft: 6 }}>{s.level}</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                      {s.instructor_detail?.display_name || '—'}
                    </td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                      {s.studio_detail?.name || '—'}
                    </td>
                    <td>
                      <span style={{ color: isFull ? 'var(--amber)' : 'var(--white)' }}>
                        {s.enrolled_count}
                      </span>
                      <span style={{ color: 'var(--grey)' }}>/{s.capacity}</span>
                    </td>
                    <td>
                      <span
                        className={`tag ${!s.is_active ? 'tag-grey' : isFull ? 'tag-amber' : 'tag-lime'}`}
                        style={{ fontSize: 10 }}
                      >
                        {!s.is_active ? 'Inactive' : isFull ? 'Full' : 'Active'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link to={`/admin/classes/${s.id}/attendance`}>
                        <button className="btn btn-ghost btn-xs" style={{ marginRight: 4 }}>Register</button>
                      </Link>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => { setEditSession(s); setShowAddClass(true) }}
                      >Edit</button>
                    </td>
                  </tr>
                )
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--grey)', padding: '32px 0' }}>
                    No classes yet — add your first class above
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit class modal */}
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
