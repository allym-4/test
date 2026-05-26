import { useState, useMemo, useCallback } from 'react'
import { useApi } from '../../hooks/useApi'
import { classes, seasons as seasonsApi } from '../../api'
import { Link } from 'react-router-dom'
import AddEditClassModal from '../../components/AddEditClassModal'
import { fmt12 } from '../../utils/time'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS      = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const SLOT_START_HOUR = 6        // 6:00 am
const SLOT_END_HOUR   = 22       // 10:00 pm (last label)
const SLOT_HEIGHT     = 52       // px per 30-min slot
const TOTAL_SLOTS     = (SLOT_END_HOUR - SLOT_START_HOUR) * 2  // 32 slots

const FALLBACK_SEASON_LABEL = 'Current Season'
const FALLBACK_SEASON_WEEKS = 8
const FALLBACK_SEASON_START = new Date('2026-04-06T00:00:00')

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
function getSeasonWeek(weekStart, seasonStart, seasonWeeks) {
  const ms = weekStart - seasonStart
  if (ms < 0) return null
  const week = Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) + 1
  return week > seasonWeeks ? null : week
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

/** Solid card colours keyed by class type — matches website aesthetic */
function cardColors(name = '', conflicting = false) {
  if (conflicting) return { bg: '#ff4444', text: '#fff', subText: 'rgba(255,255,255,0.75)' }
  const n = name.toLowerCase()
  if (n.includes('practice'))
    return { bg: '#2a2a2a', text: '#888', subText: '#555' }
  // Level classes + most dance/floor/strip styles → lime
  if (
    n.includes('level') || n.includes('dance') || n.includes('strip') ||
    n.includes('floor') || n.includes('chair') || n.includes('kiki') ||
    n.includes('unravel') || n.includes('virgin') || n.includes('workshop') ||
    n.includes('intensive') || n.includes('bootcamp')
  )
    return { bg: '#ccff00', text: '#000', subText: 'rgba(0,0,0,0.55)' }
  // Conditioning / tricks → lavender
  return { bg: '#b0a0ff', text: '#000', subText: 'rgba(0,0,0,0.55)' }
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

/**
 * Assign sub-column indices to sessions in a single day so overlapping cards
 * sit side-by-side rather than on top of each other.
 * Returns an array of { session, col, totalCols }.
 */
function assignSubColumns(sessions) {
  const sorted = [...sessions].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
  const slots = [] // [{ endMins, col }]
  const result = sorted.map(s => {
    const startMins = timeToMinutes(s.start_time)
    const endMins   = startMins + (s.duration_minutes ?? 60)
    // Remove finished sessions
    const active = slots.filter(x => x.endMins > startMins)
    // Find first free column
    const used = new Set(active.map(x => x.col))
    let col = 0
    while (used.has(col)) col++
    active.push({ endMins, col })
    slots.length = 0
    active.forEach(x => slots.push(x))
    return { session: s, col, _active: [...active] }
  })
  // Second pass: set totalCols = max col used by any overlapping peer + 1
  return result.map(r => ({
    session:   r.session,
    col:       r.col,
    totalCols: Math.max(...r._active.map(x => x.col)) + 1,
  }))
}



/** Modal shown when a calendar card is clicked */
function SessionDetailModal({ session, onClose }) {
  if (!session) return null
  const colors = cardColors(session.name)
  const theme = { border: colors.bg }
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
          <div><b style={{ color: 'var(--white, #fff)' }}>Time:</b> {fmt12(session.start_time)}</div>
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
/**
 * dataMode: 'season' → show season enrolments from session
 *           'week'   → show this week's actual bookings from occurrence
 */
function CalendarCard({ session, occurrence, dataMode = 'season', conflicting, onClick, col = 0, totalCols = 1 }) {
  const colors     = cardColors(session.name, conflicting)
  const instructor = session.instructor_detail?.display_name || ''
  const firstName  = instructor.split(' ')[0]

  const startMins  = timeToMinutes(session.start_time)
  const duration   = session.duration_minutes ?? 55
  const rowStart   = minutesToRow(startMins)
  const rowSpan    = Math.max(1, duration / 30)

  const clampedStart = Math.max(0, rowStart)
  const clampedEnd   = Math.min(TOTAL_SLOTS, rowStart + rowSpan)
  if (clampedEnd <= clampedStart) return null

  const pct    = 100 / totalCols
  const left   = `calc(${col * pct}% + 2px)`
  const width  = `calc(${pct}% - 4px)`
  const top    = clampedStart * SLOT_HEIGHT + 1
  const height = Math.max(26, (clampedEnd - clampedStart) * SLOT_HEIGHT - 3)
  const showInstructor = height >= 46 && firstName
  const showStats      = height >= 56

  // Season mode: enrolled / capacity + session waitlist
  // Week mode: (enrolled + casual) / capacity + trial star + occurrence waitlist
  const capacity = session.capacity || 0
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

  const isFull = bookedCount >= capacity

  return (
    <div
      onClick={onClick}
      title={`${session.name}${firstName ? ` · ${firstName}` : ''} — ${fmt12(session.start_time)} · ${bookedCount}/${capacity}${waitlistCount > 0 ? ` · ${waitlistCount} waiting` : ''}${hasTrial ? ' · ★ first timer' : ''}`}
      style={{
        position:      'absolute',
        top,
        height,
        left,
        width,
        background:    colors.bg,
        borderRadius:  3,
        padding:       '3px 5px',
        cursor:        'pointer',
        overflow:      'hidden',
        display:       'flex',
        flexDirection: 'column',
        justifyContent:'center',
        boxSizing:     'border-box',
        zIndex:        2,
        transition:    'filter 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.88)' }}
      onMouseLeave={e => { e.currentTarget.style.filter = '' }}
    >
      {/* Class name row — with first-timer star */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, overflow: 'hidden' }}>
        <div style={{
          fontWeight:   800,
          fontSize:     10,
          lineHeight:   1.25,
          color:        colors.text,
          textTransform:'uppercase',
          letterSpacing:'0.04em',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
          flex:         1,
        }}>
          {session.name}
        </div>
        {hasTrial && (
          <span style={{ fontSize: 9, color: colors.text, flexShrink: 0, lineHeight: 1 }}>★</span>
        )}
      </div>

      {showInstructor && (
        <div style={{
          fontSize:     9,
          lineHeight:   1.2,
          color:        colors.subText,
          fontWeight:   600,
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
          marginTop:    1,
        }}>
          {firstName.toUpperCase()}
        </div>
      )}

      {showStats && (
        <div style={{ fontSize: 9, lineHeight: 1.2, color: isFull ? colors.text : colors.subText, marginTop: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ fontWeight: isFull ? 700 : 400 }}>
            {bookedCount}/{capacity}{isFull ? ' FULL' : ''}
          </span>
          {waitlistCount > 0 && (
            <span style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 2, padding: '0 3px', fontSize: 8, fontWeight: 700 }}>
              +{waitlistCount}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * The 7-column calendar grid. Accepts pre-computed conflictIds so the parent
 * can also display the conflict count in the page header.
 */
// occurrencesBySession: Map<sessionId, occurrence> for the current week
function CalendarGrid({ sessions, weekStart, conflictIds = new Set(), showConflicts = false, onDismissConflicts, conflictsDismissed, occurrencesBySession = new Map(), dataMode = 'season' }) {
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

  const showConflictBanner = showConflicts && conflictIds.size > 0 && !conflictsDismissed
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
          gridTemplateColumns: '52px repeat(7, minmax(110px, 1fr))',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#111',
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
          gridTemplateColumns: '52px repeat(7, minmax(110px, 1fr))',
          // Each column handles its own rows internally; outer grid just places columns
        }}>
          {/* Time label column — only show on-the-hour labels */}
          <div style={{
            display: 'grid',
            gridTemplateRows: `repeat(${TOTAL_SLOTS}, ${SLOT_HEIGHT}px)`,
          }}>
            {timeLabels.map((label, i) => {
              const isHour = i % 2 === 0
              return (
                <div
                  key={label}
                  style={{
                    fontSize: 9,
                    color: isHour ? 'var(--grey)' : 'transparent',
                    padding: '2px 6px 0',
                    borderTop: isHour ? '1px solid var(--border, #2a2a2a)' : 'none',
                    lineHeight: 1,
                    userSelect: 'none',
                    boxSizing: 'border-box',
                    fontWeight: 600,
                  }}
                >
                  {isHour ? label : ''}
                </div>
              )
            })}
          </div>

          {/* Seven day columns */}
          {Array.from({ length: 7 }, (_, dayIdx) => {
            const positioned = assignSubColumns(byDay[dayIdx])
            const colHeight  = TOTAL_SLOTS * SLOT_HEIGHT
            return (
              <div
                key={dayIdx}
                style={{
                  borderLeft: '1px solid var(--border, #2a2a2a)',
                  position:   'relative',
                  height:     colHeight,
                }}
              >
                {/* Hour grid lines only — every 2 slots (60 min) */}
                {Array.from({ length: TOTAL_SLOTS }, (_, si) => si % 2 === 0 ? (
                  <div
                    key={si}
                    style={{
                      position:      'absolute',
                      top:           si * SLOT_HEIGHT,
                      left:          0,
                      right:         0,
                      height:        1,
                      background:    'var(--border, #2a2a2a)',
                      pointerEvents: 'none',
                      zIndex:        1,
                    }}
                  />
                ) : null)}

                {/* Class cards — absolutely positioned with sub-column layout */}
                {positioned.map(({ session: s, col, totalCols }) => (
                  <CalendarCard
                    key={s.id}
                    session={s}
                    occurrence={occurrencesBySession.get(s.id)}
                    dataMode={dataMode}
                    conflicting={showConflicts && conflictIds.has(s.id)}
                    col={col}
                    totalCols={totalCols}
                    onClick={() => setSelectedSession(s)}
                  />
                ))}
              </div>
            )
          })}
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
  const [view, setView]                   = useState('list')  // 'calendar' | 'list'
  const [dataMode, setDataMode]           = useState('season') // 'season' | 'week'
  const [mode, setMode]                   = useState('attend')    // 'attend' | 'setup'
  const [showAddClass, setShowAddClass]   = useState(false)
  const [editSession, setEditSession]     = useState(null)
  const [sessionList, setSessionList]     = useState(null)
  const [conflictsDismissed, setConflictsDismissed] = useState(true)
  const [conflictCheckTick, setConflictCheckTick]   = useState(0)
  const [selectedSeasonId, setSelectedSeasonId]     = useState(null)
  // Term Setup filters
  const [setupFilterLevel,     setSetupFilterLevel]     = useState('')
  const [setupFilterTeacher,   setSetupFilterTeacher]   = useState('')
  const [setupFilterWaitlist,  setSetupFilterWaitlist]  = useState(false)
  const [setupFilterLow,       setSetupFilterLow]       = useState(false)

  // Load seasons first so we know which season to fetch sessions for
  const { data: seasonsData } = useApi(() => seasonsApi.list())
  const seasonOptions = seasonsData?.results ?? (Array.isArray(seasonsData) ? seasonsData : [])

  // Derive current season from live data
  const activeSeason = selectedSeasonId
    ? (seasonOptions?.find(s => s.id === selectedSeasonId) ?? seasonOptions?.find(s => s.status === 'active') ?? null)
    : (seasonOptions?.find(s => s.status === 'active') ?? null)

  // Load sessions filtered to the selected season — avoids cross-season conflicts
  const seasonIdForFetch = activeSeason?.id
  const { data, loading } = useApi(
    () => seasonIdForFetch ? classes.list({ season: seasonIdForFetch }) : classes.list({ active: true }),
    [seasonIdForFetch]
  )
  const seasonStart = activeSeason?.start_date
    ? new Date(activeSeason.start_date + 'T00:00:00')
    : FALLBACK_SEASON_START
  const seasonEnd = activeSeason?.end_date ? new Date(activeSeason.end_date + 'T00:00:00') : null
  const seasonWeeks = seasonEnd
    ? Math.round((seasonEnd - seasonStart) / (7 * 24 * 60 * 60 * 1000))
    : FALLBACK_SEASON_WEEKS
  const seasonLabel = activeSeason?.name ?? FALLBACK_SEASON_LABEL

  // Clear any locally-edited session list when season changes
  const [prevSeasonId, setPrevSeasonId] = useState(null)
  if (seasonIdForFetch !== prevSeasonId) { setPrevSeasonId(seasonIdForFetch); setSessionList(null) }

  const sessions = sessionList ?? (data?.results ?? [])

  const weekStart     = getWeekStart(weekOffset)
  const weekLabel     = 'Week of ' + weekStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

  // For "week" data mode: fetch occurrences for this specific week
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 6)
    return d
  }, [weekStart])
  const weekStartStr = weekStart.toISOString().slice(0, 10)
  const weekEndStr   = weekEnd.toISOString().slice(0, 10)
  const shouldFetchOccurrences = view === 'calendar' && dataMode === 'week'
  const { data: occData } = useApi(
    () => shouldFetchOccurrences
      ? classes.occurrences({ date_from: weekStartStr, date_to: weekEndStr, page_size: 200 })
      : null,
    [shouldFetchOccurrences, weekStartStr, weekEndStr]
  )
  // Build a Map<sessionId, occurrence> for quick lookup
  const occurrencesBySession = useMemo(() => {
    const map = new Map()
    const list = occData?.results ?? (Array.isArray(occData) ? occData : [])
    list.forEach(occ => {
      if (occ.session) map.set(occ.session, occ)
    })
    return map
  }, [occData])
  const seasonWeek    = getSeasonWeek(weekStart, seasonStart, seasonWeeks)
  const seasonWeekLabel = seasonWeek
    ? `${seasonLabel} — Week ${seasonWeek} of ${seasonWeeks}`
    : seasonLabel

  // Conflict detection — re-runs when sessions change or user clicks "Check"
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

  return (
    <div>
      {/* ── Page header: row 1 — title + controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        {/* Left: title + season picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="page-title" style={{ marginBottom: 0 }}>Timetable</div>
          <select
            value={selectedSeasonId ?? activeSeason?.id ?? ''}
            onChange={e => setSelectedSeasonId(Number(e.target.value) || null)}
            style={{
              background: '#1a1a1a',
              border: '1px solid var(--border, #333)',
              color: 'var(--white)',
              borderRadius: 6,
              padding: '5px 10px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              maxWidth: 180,
            }}
          >
            {seasonOptions.length > 0
              ? seasonOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
              : <option>{FALLBACK_SEASON_LABEL}</option>
            }
          </select>
        </div>

        {/* Right: mode + view toggles + add class */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border, #333)', borderRadius: 6, overflow: 'hidden' }}>
            {[['attend', 'Attendance Mode'], ['setup', 'Term Setup']].map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '5px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: mode === m ? 'var(--lime, #ccff00)' : 'transparent',
                  color:      mode === m ? '#000' : 'var(--grey)',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >{label}</button>
            ))}
          </div>

          {mode === 'attend' && view === 'calendar' && (
            <div style={{ display: 'flex', border: '1px solid var(--border, #333)', borderRadius: 6, overflow: 'hidden' }}>
              {[['season', 'Season'], ['week', 'This Week']].map(([dm, label]) => (
                <button
                  key={dm}
                  onClick={() => setDataMode(dm)}
                  style={{
                    padding: '5px 12px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: dataMode === dm ? '#333' : 'transparent',
                    color:      dataMode === dm ? '#fff' : 'var(--grey)',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >{label}</button>
              ))}
            </div>
          )}

          {mode === 'attend' && (
            <div style={{ display: 'flex', border: '1px solid var(--border, #333)', borderRadius: 6, overflow: 'hidden' }}>
              {['calendar', 'list'].map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: '5px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: view === v ? 'var(--lime, #ccff00)' : 'transparent',
                    color:      view === v ? '#000' : 'var(--grey)',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {v === 'calendar' ? '⊞ Calendar' : '☰ List'}
                </button>
              ))}
            </div>
          )}

          <button
            className="btn btn-lime btn-sm"
            onClick={() => { setEditSession(null); setShowAddClass(true) }}
          >+ Add Class</button>
        </div>
      </div>

      {/* ── Row 2: week nav — hidden in setup mode ── */}
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

      {/* ── Week data mode legend ── */}
      {view === 'calendar' && dataMode === 'week' && (
        <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 10, display: 'flex', gap: 14, alignItems: 'center' }}>
          <span>This week: enrolled + casuals + catch-ups</span>
          <span style={{ color: '#ccff00' }}>★ = first timer booked</span>
          <span>+N = waitlisted</span>
        </div>
      )}

      {/* ── Term Setup banner ── */}
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
      ) : mode === 'setup' ? (
        /* ── Term Setup view ── */
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
              {/* Filters */}
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
              <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 14 }}>{seasonInfo} · Click any class to view roster or edit settings</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.length === 0 && (
                  <div style={{ color: 'var(--grey)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>No classes match the current filters.</div>
                )}
                {filtered.map(s => {
                  const isFull = s.enrolled_count >= s.capacity
                  const hasWaitlist = s.waitlist_count > 0
                  const isLow = s.enrolled_count < 4
                  return (
                    <div key={s.id} style={{ background: '#111', border: `1px solid ${isFull ? '#ff3333aa' : 'var(--border)'}`, borderRadius: 10 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr 160px 90px auto', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
                        onClick={() => { setEditSession(s); setShowAddClass(true) }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{DAYS[s.day_of_week]} {fmt12(s.start_time)}</div>
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
                        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                          <Link to={`/admin/classes/${s.id}/attendance`}>
                            <button className="btn btn-ghost btn-xs">Roster</button>
                          </Link>
                          <button className="btn btn-ghost btn-xs" onClick={() => { setEditSession(s); setShowAddClass(true) }}>Edit</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()
      ) : view === 'calendar' ? (
        <CalendarGrid
          sessions={sessions}
          weekStart={weekStart}
          conflictIds={conflictIds}
          showConflicts={!conflictsDismissed}
          conflictsDismissed={conflictsDismissed}
          onDismissConflicts={() => setConflictsDismissed(true)}
          occurrencesBySession={occurrencesBySession}
          dataMode={dataMode}
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
                      {fmt12(s.start_time)}
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
