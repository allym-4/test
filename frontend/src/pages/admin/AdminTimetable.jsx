import { useState, useMemo, useCallback } from 'react'
import { useApi } from '../../hooks/useApi'
import { classes } from '../../api'
import { Link } from 'react-router-dom'
import AddEditClassModal from '../../components/AddEditClassModal'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const SLOT_START_HOUR = 6       // 6:00am
const SLOT_END_HOUR   = 22      // 10:00pm (exclusive — last slot label is 10:00pm)
const SLOT_HEIGHT     = 40      // px per 30-min slot
const TOTAL_SLOTS     = (SLOT_END_HOUR - SLOT_START_HOUR) * 2  // 32 slots

const SEASON_LABEL    = 'Season 4 (Current)'
const SEASON_WEEKS    = 8
// Hardcoded season start — replace with API value when available
const SEASON_START    = new Date('2026-04-06T00:00:00')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekStart(offset = 0) {
  const d = new Date()
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
  d.setDate(d.getDate() - dow + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Current season week number (1-based) from season start */
function getSeasonWeek(weekStart) {
  const ms = weekStart - SEASON_START
  if (ms < 0) return null
  const week = Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) + 1
  return week > SEASON_WEEKS ? null : week
}

/** Time string "HH:MM:SS" or "HH:MM" → total minutes from midnight */
function timeToMinutes(t = '') {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Minutes from midnight → grid row index (0-based, relative to SLOT_START_HOUR) */
function minutesToRow(mins) {
  return (mins - SLOT_START_HOUR * 60) / 30
}

/** Build human-readable time label */
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
  if (n.includes('level'))     return { bg: '#ccff0022', border: 'var(--lime)',  label: 'lime'  }
  if (n.includes('dance'))     return { bg: '#b0a0ff22', border: 'var(--lav)',   label: 'lav'   }
  if (n.includes('workshop') || n.includes('intensive'))
                               return { bg: '#ffaa0022', border: 'var(--amber)', label: 'amber' }
  return                              { bg: 'rgba(255,255,255,0.05)', border: 'var(--grey)', label: 'grey' }
}

/** Detect conflicts: same studio, overlapping time, same day */
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
        background: 'rgba(0,0,0,0.6)',
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{session.name}</div>
            {session.level && <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{session.level}</div>}
          </div>
          <button
            className="btn btn-ghost btn-xs"
            onClick={onClose}
            style={{ padding: '2px 8px', fontSize: 16, lineHeight: 1 }}
          >×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--grey)' }}>
          <div><b style={{ color: 'var(--white, #fff)' }}>Day:</b> {DAYS_FULL[session.day_of_week]}</div>
          <div><b style={{ color: 'var(--white, #fff)' }}>Time:</b> {session.start_time?.slice(0, 5)}</div>
          <div><b style={{ color: 'var(--white, #fff)' }}>Instructor:</b> {session.instructor_detail?.display_name || '—'}</div>
          <div><b style={{ color: 'var(--white, #fff)' }}>Studio:</b> {session.studio_detail?.name || '—'}</div>
          <div>
            <b style={{ color: 'var(--white, #fff)' }}>Enrolment:</b>{' '}
            <span style={{ color: session.enrolled_count >= session.capacity ? 'var(--amber)' : 'var(--white, #fff)' }}>
              {session.enrolled_count}
            </span>
            /{session.capacity}
          </div>
          {session.notes && <div><b style={{ color: 'var(--white, #fff)' }}>Notes:</b> {session.notes}</div>}
        </div>
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

/** A single coloured class card inside the calendar grid */
function CalendarCard({ session, conflicting, onClick }) {
  const theme = cardTheme(session.name)
  const instructor = session.instructor_detail?.display_name || '—'
  const studio     = session.studio_detail?.name || '—'

  const startMins = timeToMinutes(session.start_time)
  const duration  = session.duration_minutes ?? 60
  const rowStart  = minutesToRow(startMins)
  const rowSpan   = duration / 30

  // Clamp to grid bounds
  const clampedRowStart = Math.max(0, rowStart)
  const clampedRowEnd   = Math.min(TOTAL_SLOTS, rowStart + rowSpan)
  if (clampedRowEnd <= clampedRowStart) return null

  return (
    <div
      onClick={onClick}
      title={session.name}
      style={{
        gridRowStart: clampedRowStart + 1,
        gridRowEnd:   clampedRowEnd   + 1,
        background:   theme.bg,
        borderLeft:   conflicting ? '3px solid var(--red, #ff4444)' : `3px solid ${theme.border}`,
        outline:      conflicting ? '1px solid var(--red, #ff4444)' : 'none',
        borderRadius: 4,
        padding:      '3px 5px',
        cursor:       'pointer',
        overflow:     'hidden',
        margin:       '1px 1px',
        minHeight:    0,
        display:      'flex',
        flexDirection:'column',
        gap:          1,
        boxSizing:    'border-box',
        transition:   'filter 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.25)'}
      onMouseLeave={e => e.currentTarget.style.filter = ''}
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

/** The full 7-column calendar grid */
function CalendarGrid({ sessions, weekStart }) {
  const [selectedSession, setSelectedSession] = useState(null)
  const [conflictsDismissed, setConflictsDismissed] = useState(false)
  const [conflictCheckTick, setConflictCheckTick] = useState(0)

  const conflictIds = useMemo(() => detectConflicts(sessions), [sessions, conflictCheckTick]) // eslint-disable-line
  const conflictCount = conflictIds.size / 2 | 0   // each pair counted once — approximate

  const recheck = useCallback(() => {
    setConflictsDismissed(false)
    setConflictCheckTick(t => t + 1)
  }, [])

  // Build slot row labels
  const timeLabels = Array.from({ length: TOTAL_SLOTS }, (_, i) => slotLabel(i))

  // Group sessions by day_of_week
  const byDay = useMemo(() => {
    const map = Array.from({ length: 7 }, () => [])
    sessions.forEach(s => {
      const d = s.day_of_week
      if (d >= 0 && d <= 6) map[d].push(s)
    })
    return map
  }, [sessions])

  const showConflictBanner = conflictIds.size > 0 && !conflictsDismissed

  return (
    <>
      {/* Conflict banner */}
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
          <span>⚠ {conflictIds.size > 0 ? `${Math.ceil(conflictIds.size / 2)} scheduling conflict${conflictIds.size > 2 ? 's' : ''} detected` : ''}</span>
          <button
            className="btn btn-ghost btn-xs"
            style={{ color: 'var(--red, #ff4444)', borderColor: 'var(--red, #ff4444)' }}
            onClick={() => setConflictsDismissed(true)}
          >Dismiss</button>
        </div>
      )}

      {/* Recheck button row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={recheck}>Check for Conflicts</button>
      </div>

      {/* Scrollable grid wrapper */}
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)', border: '1px solid var(--border, #333)', borderRadius: 6 }}>
        {/* Header row: empty corner + day columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px repeat(7, minmax(100px, 1fr))',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--surface, #1a1a2e)',
          borderBottom: '1px solid var(--border, #333)',
        }}>
          <div style={{ padding: '6px 0' }} />
          {DAYS.map((day, i) => {
            const d = new Date(weekStart)
            d.setDate(d.getDate() + i)
            const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0)
            const isToday = d.getTime() === todayDate.getTime()
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

        {/* Body: time labels + day columns, each using CSS grid rows */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px repeat(7, minmax(100px, 1fr))',
          gridTemplateRows: `repeat(${TOTAL_SLOTS}, ${SLOT_HEIGHT}px)`,
        }}>
          {/* Time label column */}
          {timeLabels.map((label, i) => (
            <div
              key={label}
              style={{
                gridRowStart: i + 1,
                gridRowEnd:   i + 2,
                gridColumn:   1,
                fontSize: 10,
                color: 'var(--grey)',
                padding: '2px 6px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--border, #222)',
                lineHeight: 1,
                userSelect: 'none',
              }}
            >
              {label}
            </div>
          ))}

          {/* Day columns */}
          {Array.from({ length: 7 }, (_, dayIdx) => (
            <div
              key={dayIdx}
              style={{
                gridColumn: dayIdx + 2,
                gridRow: `1 / ${TOTAL_SLOTS + 1}`,
                display: 'grid',
                gridTemplateRows: `repeat(${TOTAL_SLOTS}, ${SLOT_HEIGHT}px)`,
                borderLeft: '1px solid var(--border, #222)',
                position: 'relative',
              }}
            >
              {/* Alternating slot backgrounds */}
              {Array.from({ length: TOTAL_SLOTS }, (_, si) => (
                <div
                  key={si}
                  style={{
                    gridRow: `${si + 1} / ${si + 2}`,
                    background: si % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                    borderTop: si === 0 ? 'none' : '1px solid var(--border, #1e1e2e)',
                  }}
                />
              ))}

              {/* Class cards */}
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
  const [weekOffset, setWeekOffset]   = useState(0)
  const [view, setView]               = useState('calendar') // 'calendar' | 'list'
  const [showAddClass, setShowAddClass] = useState(false)
  const [editSession, setEditSession] = useState(null)
  const [sessionList, setSessionList] = useState(null)

  const { data, loading } = useApi(() => classes.list())

  const sessions = sessionList ?? (data?.results || [])

  const weekStart = getWeekStart(weekOffset)
  const weekLabel = 'Week of ' + weekStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  const seasonWeek = getSeasonWeek(weekStart)
  const seasonWeekLabel = seasonWeek ? `Season 4 — Week ${seasonWeek} of ${SEASON_WEEKS}` : SEASON_LABEL

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
              <option>{SEASON_LABEL}</option>
            </select>
          </div>

          {/* Week navigation (always shown) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w - 1)}>← Prev</button>
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              {view === 'calendar' ? seasonWeekLabel : weekLabel}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w + 1)}>Next →</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Calendar / List toggle */}
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
        <CalendarGrid sessions={sessions} weekStart={weekStart} />
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
                    <td style={{ color: isToday ? 'var(--lime)' : 'var(--grey)', fontFamily: "'Archivo Black', sans-serif", fontSize: 14 }}>
                      {s.start_time?.slice(0, 5)}
                    </td>
                    <td>
                      <b>{s.name}</b>
                      {s.level && <span style={{ fontSize: 11, color: 'var(--grey)', marginLeft: 6 }}>{s.level}</span>}
                    </td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{s.instructor_detail?.display_name || '—'}</td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{s.studio_detail?.name || '—'}</td>
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
