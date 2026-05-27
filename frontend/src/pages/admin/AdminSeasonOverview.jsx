import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { seasons as seasonsApi, classes as classesApi } from '../../api'
import client from '../../api/client'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function weeksRemaining(endDate) {
  if (!endDate) return null
  const ms = new Date(endDate + 'T00:00') - new Date()
  if (ms <= 0) return 0
  return Math.ceil(ms / (1000 * 60 * 60 * 24 * 7))
}

function OverrideCapacityModal({ session, onClose, onSaved }) {
  const [capacity, setCapacity] = useState(session.capacity)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await client.patch(`/api/classes/sessions/${session.id}/`, { capacity })
      onSaved(res.data)
      onClose()
    } catch {
      setError('Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#111', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px', width: '100%', maxWidth: 380 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17, marginBottom: 6 }}>Override Capacity</div>
        <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 20 }}>
          {session.name} — {DAYS[session.day_of_week]} {session.start_time?.slice(0, 5)}
        </div>
        {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>}
        <form onSubmit={handleSave}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--grey)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Capacity</label>
          <input
            type="number"
            min={1}
            max={100}
            value={capacity}
            onChange={e => setCapacity(parseInt(e.target.value))}
            autoFocus
            style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', padding: '9px 12px', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 20 }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ClassRow({ session, onOverrideCapacity }) {
  const isFull = session.enrolled_count >= session.capacity
  const pct = session.capacity > 0 ? Math.min(100, (session.enrolled_count / session.capacity) * 100) : 0
  const barColor = isFull ? 'var(--red)' : pct > 75 ? 'var(--amber)' : 'var(--lime)'
  const hasWaitlist = (session.waitlist_count ?? 0) > 0

  return (
    <div style={{ background: '#111', border: `1px solid ${isFull ? 'rgba(255,68,68,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        {/* Class info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14 }}>{session.name}</div>
            {!session.is_active && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'var(--grey)', border: '1px solid var(--border)' }}>Inactive</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--grey)' }}>
            {DAYS[session.day_of_week]} · {session.start_time?.slice(0, 5)}
            {session.instructor_detail?.display_name && <span> · {session.instructor_detail.display_name}</span>}
            {session.studio_detail?.name && <span> · {session.studio_detail.name}</span>}
          </div>
        </div>

        {/* Enrolment count */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: isFull ? 'var(--red)' : 'var(--white)' }}>
            {session.enrolled_count ?? 0}
            <span style={{ fontSize: 13, color: 'var(--grey)', fontWeight: 400 }}>/{session.capacity}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--grey)' }}>enrolled</div>
          {hasWaitlist && (
            <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 2 }}>
              +{session.waitlist_count} waitlisted
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ margin: '12px 0 12px' }}>
        <div style={{ height: 4, background: '#1e1e1e', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link to={`/admin/classes/${session.id}/season-enrolments`}>
          <button className="btn btn-ghost btn-xs">See Enrolments</button>
        </Link>
        <Link to={`/admin/classes/${session.id}/attendance`}>
          <button className="btn btn-ghost btn-xs">Attendance</button>
        </Link>
        <button className="btn btn-ghost btn-xs" onClick={() => onOverrideCapacity(session)}>
          Override Numbers
        </button>
        <Link to={`/admin/classes/${session.id}`}>
          <button className="btn btn-ghost btn-xs">Edit Class</button>
        </Link>
      </div>
    </div>
  )
}

export default function AdminSeasonOverview() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [season, setSeason] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loadingSeason, setLoadingSeason] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [overrideSession, setOverrideSession] = useState(null)
  const [toggling, setToggling] = useState(false)
  const [togglingEnabled, setTogglingEnabled] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    seasonsApi.get(id)
      .then(r => setSeason(r.data))
      .catch(() => {})
      .finally(() => setLoadingSeason(false))
  }, [id])

  useEffect(() => {
    classesApi.list({ season: id, page_size: 200 })
      .then(r => setSessions(r.data?.results ?? r.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingSessions(false))
  }, [id])

  async function handleToggleBookings() {
    setToggling(true)
    try {
      const res = await seasonsApi.toggleBookings(id)
      setSeason(s => ({ ...s, bookings_open: res.data.bookings_open }))
    } finally {
      setToggling(false)
    }
  }

  async function handleToggleBookingsEnabled() {
    setTogglingEnabled(true)
    try {
      const res = await seasonsApi.toggleBookingsEnabled(id)
      setSeason(s => ({ ...s, bookings_enabled: res.data.bookings_enabled }))
    } finally {
      setTogglingEnabled(false)
    }
  }

  async function handleCloseSeason() {
    setClosing(true)
    try {
      const res = await seasonsApi.close(id)
      setSeason(res.data.season)
      setConfirmClose(false)
    } finally {
      setClosing(false)
    }
  }

  function handleCapacitySaved(updated) {
    setSessions(prev => prev.map(s => s.id === updated.id ? { ...s, capacity: updated.capacity } : s))
  }

  if (loadingSeason) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>
  }

  if (!season) {
    return <div style={{ color: 'var(--grey)', padding: 40 }}>Season not found.</div>
  }

  const sorted = [...sessions].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
    return (a.start_time || '').localeCompare(b.start_time || '')
  })

  const totalEnrolled = sessions.reduce((sum, s) => sum + (s.enrolled_count ?? 0), 0)
  const totalCapacity = sessions.reduce((sum, s) => sum + (s.capacity ?? 0), 0)
  const totalWaitlisted = sessions.reduce((sum, s) => sum + (s.waitlist_count ?? 0), 0)
  const wr = weeksRemaining(season.end_date)

  const statusCls = { active: 'tag-lime', upcoming: 'tag-lav', completed: 'tag-grey' }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/admin/seasons')}
            style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }}
          >←</button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 24 }}>{season.name}</div>
              <span className={`tag ${statusCls[season.status] || 'tag-grey'}`} style={{ fontSize: 10 }}>
                {season.status.charAt(0).toUpperCase() + season.status.slice(1)}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                background: season.bookings_open ? 'rgba(204,255,0,0.12)' : 'rgba(255,68,68,0.1)',
                color: season.bookings_open ? 'var(--lime)' : 'var(--red)',
                border: `1px solid ${season.bookings_open ? 'rgba(204,255,0,0.25)' : 'rgba(255,68,68,0.2)'}`,
              }}>
                {season.bookings_open ? 'Bookings open' : 'Bookings closed'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 4 }}>
              {formatDate(season.start_date)} → {formatDate(season.end_date)}
              {wr != null && season.status !== 'completed' && (
                <span style={{ marginLeft: 8, color: 'var(--amber)' }}>{wr} weeks left</span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/seasons/${id}`)}>Edit Season</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Classes', value: sessions.length, color: 'var(--lime)' },
          { label: 'Total enrolled', value: `${totalEnrolled}/${totalCapacity}`, color: 'var(--lav)' },
          { label: 'Waitlisted', value: totalWaitlisted, color: 'var(--amber)' },
          ...(season.status !== 'completed' && wr != null ? [{ label: 'Weeks left', value: wr, color: 'var(--amber)' }] : []),
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#111', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Booking controls */}
      <div style={{ background: '#111', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 28, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Status display */}
        {season.bookings_enabled === false ? (
          <>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,170,0,0.12)', color: 'var(--amber)', border: '1px solid rgba(255,170,0,0.25)' }}>
              Enrolments disabled
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleToggleBookingsEnabled}
              disabled={togglingEnabled}
            >
              {togglingEnabled ? '…' : 'Re-enable'}
            </button>
          </>
        ) : season.bookings_open ? (
          <>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(204,255,0,0.12)', color: 'var(--lime)', border: '1px solid rgba(204,255,0,0.25)' }}>
              Enrolments open
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleToggleBookings}
              disabled={toggling}
              style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }}
            >
              {toggling ? '…' : 'Close bookings'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleToggleBookingsEnabled}
              disabled={togglingEnabled}
              style={{ color: 'var(--grey)' }}
            >
              {togglingEnabled ? '…' : 'Disable enrolments'}
            </button>
          </>
        ) : season.go_live_at ? (
          <>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', color: 'var(--grey)', border: '1px solid var(--border)' }}>
              Opening {new Date(season.go_live_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} Sydney
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/seasons/${id}`)}>Edit</button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', color: 'var(--grey)', border: '1px solid var(--border)' }}>
              Enrolments closed
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleToggleBookings}
              disabled={toggling}
              style={{ color: 'var(--lime)', borderColor: 'rgba(204,255,0,0.3)' }}
            >
              {toggling ? '…' : 'Open bookings'}
            </button>
          </>
        )}
        {season.status !== 'completed' && (
          confirmClose ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--grey)' }}>Close and archive all enrolments?</span>
              <button
                onClick={handleCloseSeason}
                disabled={closing}
                style={{ background: 'rgba(255,68,68,0.15)', color: 'var(--red)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '6px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                {closing ? '…' : 'Yes, close'}
              </button>
              <button className="btn btn-ghost btn-xs" onClick={() => setConfirmClose(false)}>Cancel</button>
            </div>
          ) : (
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--grey)', marginLeft: 'auto' }}
              onClick={() => setConfirmClose(true)}
            >
              Close Season
            </button>
          )
        )}
      </div>

      {/* Classes list header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)' }}>
          Classes — Full Season Enrolments
        </div>
        <Link to={`/admin/seasons/${id}/add-class`}>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--lime)' }}>+ Add Class</button>
        </Link>
      </div>
      <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 16 }}>
        Casual/catch-up attendees are tracked separately in the attendance register.
      </div>

      {loadingSessions ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : sorted.length === 0 ? (
        <div style={{ color: 'var(--grey)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
          No classes assigned to this season yet.{' '}
          <Link to={`/admin/seasons/${id}/add-class`} style={{ color: 'var(--lime)' }}>Add a class →</Link>
        </div>
      ) : (
        /* Group by day of week */
        (() => {
          const byDay = {}
          for (const s of sorted) {
            const day = DAYS[s.day_of_week] || 'Other'
            if (!byDay[day]) byDay[day] = []
            byDay[day].push(s)
          }
          return Object.entries(byDay).map(([day, daySessions]) => (
            <div key={day} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--lime)', marginBottom: 10 }}>
                {day}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {daySessions.map(s => (
                  <ClassRow key={s.id} session={s} onOverrideCapacity={setOverrideSession} />
                ))}
              </div>
            </div>
          ))
        })()
      )}

      {overrideSession && (
        <OverrideCapacityModal
          session={overrideSession}
          onClose={() => setOverrideSession(null)}
          onSaved={updated => { handleCapacitySaved(updated); setOverrideSession(null) }}
        />
      )}
    </div>
  )
}
