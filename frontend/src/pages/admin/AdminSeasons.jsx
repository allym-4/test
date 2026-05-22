import { useState, useMemo } from 'react'
import { useApi } from '../../hooks/useApi'
import { seasons, classes as classesApi } from '../../api'
import '../StudentsPage.css'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa']

function SeasonCalendarPicker({ value, onChange, existingSeasons = [], label }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(value ? new Date(value + 'T00:00').getFullYear() : today.getFullYear())
  const [viewMonth, setViewMonth] = useState(value ? new Date(value + 'T00:00').getMonth() : today.getMonth())
  const [open, setOpen] = useState(false)

  const selectedDate = value ? new Date(value + 'T00:00') : null

  const days = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1)
    const last = new Date(viewYear, viewMonth + 1, 0)
    const result = []
    for (let i = 0; i < first.getDay(); i++) result.push(null)
    for (let d = 1; d <= last.getDate(); d++) result.push(new Date(viewYear, viewMonth, d))
    return result
  }, [viewYear, viewMonth])

  function isInSeason(date) {
    if (!date) return false
    return existingSeasons.some(s => {
      if (!s.start_date || !s.end_date) return false
      const start = new Date(s.start_date + 'T00:00')
      const end = new Date(s.end_date + 'T00:00')
      return date >= start && date <= end
    })
  }

  function isSame(a, b) {
    if (!a || !b) return false
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  }

  function pickDate(date) {
    const iso = date.toISOString().slice(0, 10)
    onChange(iso)
    setOpen(false)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  return (
    <div style={{ position: 'relative' }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--grey)', marginBottom: 4 }}>{label}</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', background: '#1a1a1a', border: '1px solid var(--border)',
          borderRadius: 8, padding: '8px 12px', fontSize: 13, color: value ? 'var(--white)' : 'var(--grey)',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        {value ? new Date(value + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pick a date…'}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 500, marginTop: 4,
          background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 10,
          padding: 12, width: 240, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button type="button" onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 16, padding: '0 6px' }}>‹</button>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{MONTH_NAMES[viewMonth]} {viewYear}</div>
            <button type="button" onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 16, padding: '0 6px' }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--grey)', padding: '2px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {days.map((date, i) => {
              if (!date) return <div key={`blank-${i}`} />
              const inSeason = isInSeason(date)
              const isSelected = isSame(date, selectedDate)
              const isToday = isSame(date, today)
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => pickDate(date)}
                  title={inSeason ? 'A season already runs on this date' : ''}
                  style={{
                    padding: '4px 0', border: 'none', borderRadius: 4, cursor: 'pointer',
                    fontSize: 11, fontWeight: isSelected || isToday ? 700 : 400,
                    background: isSelected ? 'var(--lime)' : inSeason ? 'rgba(176,160,255,0.25)' : 'transparent',
                    color: isSelected ? '#000' : inSeason ? 'var(--lav)' : isToday ? 'var(--lime)' : 'var(--white)',
                    outline: isToday && !isSelected ? '1px solid rgba(204,255,0,0.4)' : 'none',
                  }}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 10, color: 'var(--grey)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(176,160,255,0.25)', display: 'inline-block' }} />
              Season active
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--lime)', display: 'inline-block' }} />
              Selected
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(dt) {
  if (!dt) return null
  return new Date(dt).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
  })
}

function goLiveLabel(goLiveAt) {
  if (!goLiveAt) return null
  const d = new Date(goLiveAt)
  const now = new Date()
  if (d <= now) return { text: 'Live now', live: true }
  const ms = d - now
  const hrs = Math.floor(ms / 3600000)
  if (hrs < 48) return { text: `Opens in ${hrs}h`, live: false }
  const days = Math.floor(ms / 86400000)
  return { text: `Opens in ${days}d`, live: false }
}

function weeksRemaining(endDate) {
  if (!endDate) return null
  const ms = new Date(endDate + 'T00:00') - new Date()
  if (ms <= 0) return 0
  return Math.ceil(ms / (1000 * 60 * 60 * 24 * 7))
}

// Convert a local datetime-local input value to ISO string (treating it as Sydney time → UTC)
function localInputToISO(val) {
  if (!val) return null
  // val is like "2025-10-01T08:00" — treat as Sydney time (UTC+10 or +11 DST)
  // We approximate by creating a Date with the local timezone offset
  return new Date(val).toISOString()
}

// Convert ISO datetime to datetime-local input value in Sydney time
function isoToLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  // Format as YYYY-MM-DDTHH:mm in local timezone
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function SeasonModal({ season, onClose, onSaved, allSeasons = [] }) {
  const isEdit = !!season
  const otherSeasons = allSeasons.filter(s => !season || s.id !== season.id)

  const [form, setForm] = useState({
    name: season?.name || '',
    start_date: season?.start_date || '',
    end_date: season?.end_date || '',
    status: season?.status || 'upcoming',
    notes: season?.notes || '',
    go_live_at: season?.go_live_at ? isoToLocalInput(season.go_live_at) : '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  function set(f, v) { setForm(x => ({ ...x, [f]: v })) }

  function handleStartDate(val) {
    set('start_date', val)
    if (val) {
      const end = new Date(val + 'T00:00')
      end.setDate(end.getDate() + 56)
      set('end_date', end.toISOString().slice(0, 10))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: form.name,
        start_date: form.start_date,
        end_date: form.end_date,
        status: form.status,
        notes: form.notes,
        go_live_at: form.go_live_at ? localInputToISO(form.go_live_at) : null,
      }
      const res = isEdit
        ? await seasons.update(season.id, payload)
        : await seasons.create(payload)
      onSaved(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 500 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>{isEdit ? 'Edit Season' : 'New Season'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit}>
          {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>}
          <div className="field"><label>Season Name *</label><input value={form.name} onChange={e => set('name', e.target.value)} required autoFocus placeholder="e.g. Season 4" /></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <SeasonCalendarPicker
              label="Start Date *"
              value={form.start_date}
              onChange={handleStartDate}
              existingSeasons={otherSeasons}
            />
            <div>
              <SeasonCalendarPicker
                label="End Date *"
                value={form.end_date}
                onChange={v => set('end_date', v)}
                existingSeasons={otherSeasons}
              />
              <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>Auto-set to 8 weeks · override if needed</div>
            </div>
          </div>

          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="field">
            <label>Go-live date & time</label>
            <input
              type="datetime-local"
              value={form.go_live_at}
              onChange={e => set('go_live_at', e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
            <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>
              Schedule when enrolment bookings open automatically. Leave blank to open manually.
            </div>
          </div>

          <div className="field"><label>Notes</label><textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Season'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SeasonDrawer({ season, onClose, onEdit, onStatusChange, onBookingsToggle, onToggleBookingsEnabled, onCloseSeason, onArchive, onDelete }) {
  const { data: sessionsData, loading: loadingSessions } = useApi(
    () => classesApi.list({ season: season.id }),
    [season.id]
  )
  const sessions = sessionsData?.results || sessionsData || []
  const [toggling, setToggling] = useState(false)
  const [togglingEnabled, setTogglingEnabled] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closeResult, setCloseResult] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const statusCls = { active: 'tag-lime', upcoming: 'tag-lav', completed: 'tag-grey' }
  const wr = weeksRemaining(season.end_date)
  const glLabel = goLiveLabel(season.go_live_at)

  async function handleToggleBookings() {
    setToggling(true)
    try { await onBookingsToggle() } finally { setToggling(false) }
  }

  async function handleToggleBookingsEnabled() {
    setTogglingEnabled(true)
    try { await onToggleBookingsEnabled() } finally { setTogglingEnabled(false) }
  }

  async function handleCloseSeason() {
    setClosing(true)
    try {
      const result = await onCloseSeason()
      setCloseResult(result)
      setConfirmClose(false)
    } finally {
      setClosing(false)
    }
  }

  async function handleArchive() {
    setArchiving(true)
    try { await onArchive() } finally { setArchiving(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try { await onDelete() } finally { setDeleting(false) }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: 'var(--card)', borderLeft: '1px solid var(--border)',
        zIndex: 201, display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, marginBottom: 6 }}>
              {season.name}
              {season.archived && (
                <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 8, padding: '2px 7px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'var(--grey)', border: '1px solid var(--border)', verticalAlign: 'middle' }}>Archived</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`tag ${statusCls[season.status] || 'tag-grey'}`} style={{ fontSize: 10 }}>
                {season.status.charAt(0).toUpperCase() + season.status.slice(1)}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                padding: '2px 8px', borderRadius: 20,
                background: season.bookings_open ? 'rgba(204,255,0,0.15)' : 'rgba(255,68,68,0.12)',
                color: season.bookings_open ? 'var(--lime)' : 'var(--red)',
                border: `1px solid ${season.bookings_open ? 'rgba(204,255,0,0.3)' : 'rgba(255,68,68,0.25)'}`,
              }}>
                {season.bookings_open ? 'Bookings open' : 'Bookings closed'}
              </span>
              {!season.bookings_enabled && (
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                  padding: '2px 8px', borderRadius: 20,
                  background: 'rgba(255,160,0,0.12)', color: 'var(--amber)',
                  border: '1px solid rgba(255,160,0,0.3)',
                }}>
                  Enrolments off
                </span>
              )}
              {glLabel && (
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                  padding: '2px 8px', borderRadius: 20,
                  background: glLabel.live ? 'rgba(204,255,0,0.15)' : 'rgba(176,160,255,0.12)',
                  color: glLabel.live ? 'var(--lime)' : 'var(--lav)',
                  border: `1px solid ${glLabel.live ? 'rgba(204,255,0,0.3)' : 'rgba(176,160,255,0.25)'}`,
                }}>
                  {glLabel.text}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-ghost btn-xs" onClick={onEdit}>Edit</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '20px 24px', flex: 1 }}>
          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Start', value: formatDate(season.start_date) },
              { label: 'End', value: formatDate(season.end_date) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#111', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Go-live info */}
          {season.go_live_at && (
            <div style={{ background: '#111', borderRadius: 8, padding: '12px 14px', marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 4 }}>Scheduled go-live</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: glLabel?.live ? 'var(--lime)' : 'var(--lav)' }}>
                {formatDateTime(season.go_live_at)}
              </div>
            </div>
          )}

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
            {[
              { label: 'Classes', value: season.session_count ?? sessions.length, color: 'var(--lime)' },
              { label: 'Enrolled', value: season.enrolled_count ?? '—', color: 'var(--lav)' },
              { label: 'Weeks left', value: season.status === 'completed' ? '—' : (wr ?? '—'), color: 'var(--amber)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#111', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Classes in this season */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', fontWeight: 600, marginBottom: 12 }}>
              Classes in this season
            </div>
            {loadingSessions ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div className="spinner" /></div>
            ) : sessions.length === 0 ? (
              <div style={{ color: 'var(--grey)', fontSize: 13, padding: '12px 0' }}>
                No classes assigned to this season yet. Edit a class in the Timetable to link it here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sessions.map(s => (
                  <div key={s.id} style={{ background: '#111', borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>
                        {DAYS[s.day_of_week]} · {s.start_time?.slice(0, 5)}
                        {s.studio_detail?.name ? ` · ${s.studio_detail.name}` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: s.is_active ? 'var(--lime)' : 'var(--grey)' }}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {season.notes && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', fontWeight: 600, marginBottom: 8 }}>Notes</div>
              <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>{season.notes}</div>
            </div>
          )}

          {/* Booking Access */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', fontWeight: 600, marginBottom: 10 }}>Booking Access</div>

            {/* bookings_open toggle (existing) */}
            <div style={{ background: '#111', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                  {season.bookings_open ? 'Bookings are open' : 'Bookings are closed'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                  {season.bookings_open
                    ? 'Students can enrol in classes for this season.'
                    : 'Students cannot book season classes until you open bookings.'}
                </div>
              </div>
              <button
                onClick={handleToggleBookings}
                disabled={toggling}
                style={{
                  flexShrink: 0,
                  background: season.bookings_open ? 'rgba(255,68,68,0.12)' : 'var(--lime)',
                  color: season.bookings_open ? 'var(--red)' : '#000',
                  border: season.bookings_open ? '1px solid rgba(255,68,68,0.3)' : 'none',
                  borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: 12,
                  cursor: toggling ? 'default' : 'pointer', opacity: toggling ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {toggling ? '…' : season.bookings_open ? 'Close bookings' : 'Open bookings'}
              </button>
            </div>

            {/* bookings_enabled toggle (season enrolments kill-switch) */}
            <div style={{ background: '#111', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                  {season.bookings_enabled ? 'Season enrolments enabled' : 'Season enrolments disabled'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                  {season.bookings_enabled
                    ? 'Students can enrol in this season. Casuals are unaffected.'
                    : 'Season enrolments are off. Casual drop-ins are still available.'}
                </div>
              </div>
              <button
                onClick={handleToggleBookingsEnabled}
                disabled={togglingEnabled}
                style={{
                  flexShrink: 0,
                  background: season.bookings_enabled ? 'rgba(255,68,68,0.12)' : 'rgba(204,255,0,0.12)',
                  color: season.bookings_enabled ? 'var(--red)' : 'var(--lime)',
                  border: `1px solid ${season.bookings_enabled ? 'rgba(255,68,68,0.3)' : 'rgba(204,255,0,0.3)'}`,
                  borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: 12,
                  cursor: togglingEnabled ? 'default' : 'pointer', opacity: togglingEnabled ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {togglingEnabled ? '…' : season.bookings_enabled ? 'Turn off' : 'Turn on'}
              </button>
            </div>
          </div>

          {/* Status actions */}
          <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
            {season.status === 'upcoming' && (
              <div>
                <button className="btn btn-sm" style={{ background: 'rgba(176,160,255,0.15)', color: 'var(--lav)', border: '1px solid rgba(176,160,255,0.3)' }}
                  onClick={() => onStatusChange('active')}>
                  Activate Season
                </button>
              </div>
            )}
            {closeResult && (
              <div style={{ background: 'rgba(204,255,0,0.1)', border: '1px solid rgba(204,255,0,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--lime)' }}>
                Season closed — {closeResult.enrolments_completed} enrolment{closeResult.enrolments_completed !== 1 ? 's' : ''} archived
              </div>
            )}
            {season.status !== 'completed' && !closeResult && (
              <div>
                {!confirmClose ? (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }}
                    onClick={() => setConfirmClose(true)}
                  >
                    Close Season
                  </button>
                ) : (
                  <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--red)' }}>Close this season?</div>
                    <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 12 }}>
                      This will archive all active enrolments, close bookings, and mark the season as completed. This cannot be undone.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-sm"
                        style={{ background: 'rgba(255,68,68,0.15)', color: 'var(--red)', border: '1px solid rgba(255,68,68,0.3)' }}
                        onClick={handleCloseSeason}
                        disabled={closing}
                      >
                        {closing ? 'Closing…' : 'Yes, close season'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmClose(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Archive / Delete */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', fontWeight: 600, marginBottom: 12 }}>Danger Zone</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--grey)', borderColor: 'var(--border)' }}
                onClick={handleArchive}
                disabled={archiving}
              >
                {archiving ? '…' : season.archived ? 'Unarchive' : 'Archive'}
              </button>
              {!confirmDelete ? (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete Season
                </button>
              ) : (
                <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: 8, padding: '12px 14px', flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--red)' }}>Permanently delete?</div>
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10 }}>
                    This cannot be undone. All classes and enrolments linked to this season will also be removed.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'rgba(255,68,68,0.15)', color: 'var(--red)', border: '1px solid rgba(255,68,68,0.3)' }}
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function AdminSeasons() {
  const { data, loading, refetch } = useApi(() => seasons.list())
  const [showModal, setShowModal] = useState(false)
  const [editSeason, setEditSeason] = useState(null)
  const [drawerSeason, setDrawerSeason] = useState(null)
  const [seasonList, setSeasonList] = useState(null)
  const [showArchived, setShowArchived] = useState(false)

  const allSeasons = seasonList ?? (data?.results || data || [])

  function handleSaved(saved) {
    if (editSeason) {
      setSeasonList(prev => (prev ?? allSeasons).map(s => s.id === saved.id ? saved : s))
      if (drawerSeason?.id === saved.id) setDrawerSeason(saved)
    } else {
      setSeasonList(prev => [...(prev ?? allSeasons), saved])
    }
  }

  async function handleStatusChange(seasonId, newStatus) {
    const res = await seasons.update(seasonId, { status: newStatus })
    setSeasonList(prev => (prev ?? allSeasons).map(s => s.id === seasonId ? res.data : s))
    setDrawerSeason(res.data)
  }

  const sorted = [...allSeasons].sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
  const activeSeasons = sorted.filter(s => !s.archived)
  const archivedSeasons = sorted.filter(s => s.archived)
  const statusCls = { active: 'tag-lime', upcoming: 'tag-lav', completed: 'tag-grey' }

  function SeasonCard({ season }) {
    const isActive = season.status === 'active'
    const wr = weeksRemaining(season.end_date)
    const glLabel = goLiveLabel(season.go_live_at)
    return (
      <div
        key={season.id}
        onClick={() => setDrawerSeason(season)}
        style={{
          background: 'var(--card)',
          border: `1px solid ${isActive ? 'rgba(204,255,0,0.4)' : 'var(--border)'}`,
          borderRadius: 14,
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          cursor: 'pointer',
          transition: 'border-color 0.15s',
          opacity: season.archived ? 0.55 : 1,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>{season.name}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <span className={`tag ${statusCls[season.status] || 'tag-grey'}`} style={{ fontSize: 10 }}>
              {season.status.charAt(0).toUpperCase() + season.status.slice(1)}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
              background: season.bookings_open ? 'rgba(204,255,0,0.12)' : 'rgba(255,68,68,0.1)',
              color: season.bookings_open ? 'var(--lime)' : 'var(--red)',
              border: `1px solid ${season.bookings_open ? 'rgba(204,255,0,0.25)' : 'rgba(255,68,68,0.2)'}`,
            }}>
              {season.bookings_open ? 'Open' : 'Closed'}
            </span>
            {!season.bookings_enabled && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                background: 'rgba(255,160,0,0.1)', color: 'var(--amber)',
                border: '1px solid rgba(255,160,0,0.25)',
              }}>Enrolments off</span>
            )}
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--grey)' }}>
          {formatDate(season.start_date)} → {formatDate(season.end_date)}
        </div>

        {glLabel && (
          <div style={{ fontSize: 12, color: glLabel.live ? 'var(--lime)' : 'var(--lav)', fontWeight: 600 }}>
            {glLabel.live ? '⏱ Live now' : `⏱ ${glLabel.text}`}
          </div>
        )}

        <div style={{ display: 'flex', gap: 16 }}>
          {season.session_count != null && (
            <div style={{ fontSize: 12 }}>
              <span style={{ color: 'var(--lime)', fontWeight: 700 }}>{season.session_count}</span>
              <span style={{ color: 'var(--grey)' }}> classes</span>
            </div>
          )}
          {season.enrolled_count != null && (
            <div style={{ fontSize: 12 }}>
              <span style={{ color: 'var(--lav)', fontWeight: 700 }}>{season.enrolled_count}</span>
              <span style={{ color: 'var(--grey)' }}> enrolled</span>
            </div>
          )}
          {isActive && wr != null && (
            <div style={{ fontSize: 12 }}>
              <span style={{ color: 'var(--amber)', fontWeight: 700 }}>{wr}</span>
              <span style={{ color: 'var(--grey)' }}> weeks left</span>
            </div>
          )}
        </div>

        {season.notes && (
          <div style={{ fontSize: 12, color: 'var(--grey)', fontStyle: 'italic' }}>{season.notes}</div>
        )}

        <div style={{ fontSize: 11, color: 'var(--grey)' }}>Click to view details →</div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Seasons</div>
          <div className="page-sub">Manage season schedules and enrolment windows</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => { setEditSeason(null); setShowModal(true) }}>+ New Season</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : allSeasons.length === 0 ? (
        <div className="empty-state">
          <div style={{ marginBottom: 8 }}>No seasons yet</div>
          <div style={{ fontSize: 12 }}>Create your first season above</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {activeSeasons.map(season => <SeasonCard key={season.id} season={season} />)}
          </div>

          {archivedSeasons.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <button
                onClick={() => setShowArchived(v => !v)}
                style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span style={{ fontSize: 11, transform: showArchived ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>▶</span>
                Archived seasons ({archivedSeasons.length})
              </button>
              {showArchived && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {archivedSeasons.map(season => <SeasonCard key={season.id} season={season} />)}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {drawerSeason && (
        <SeasonDrawer
          season={drawerSeason}
          onClose={() => setDrawerSeason(null)}
          onEdit={() => { setEditSeason(drawerSeason); setShowModal(true) }}
          onStatusChange={(status) => handleStatusChange(drawerSeason.id, status)}
          onBookingsToggle={async () => {
            const res = await seasons.toggleBookings(drawerSeason.id)
            const updated = { ...drawerSeason, bookings_open: res.data.bookings_open }
            setDrawerSeason(updated)
            setSeasonList(prev => (prev ?? allSeasons).map(s => s.id === updated.id ? updated : s))
          }}
          onToggleBookingsEnabled={async () => {
            const res = await seasons.toggleBookingsEnabled(drawerSeason.id)
            const updated = { ...drawerSeason, bookings_enabled: res.data.bookings_enabled }
            setDrawerSeason(updated)
            setSeasonList(prev => (prev ?? allSeasons).map(s => s.id === updated.id ? updated : s))
          }}
          onCloseSeason={async () => {
            const res = await seasons.close(drawerSeason.id)
            const updated = res.data.season
            setDrawerSeason(updated)
            setSeasonList(prev => (prev ?? allSeasons).map(s => s.id === updated.id ? updated : s))
            return res.data
          }}
          onArchive={async () => {
            const res = await seasons.archive(drawerSeason.id)
            const updated = res.data
            setDrawerSeason(updated)
            setSeasonList(prev => (prev ?? allSeasons).map(s => s.id === updated.id ? updated : s))
          }}
          onDelete={async () => {
            await seasons.delete(drawerSeason.id)
            setDrawerSeason(null)
            setSeasonList(prev => (prev ?? allSeasons).filter(s => s.id !== drawerSeason.id))
          }}
        />
      )}

      {showModal && (
        <SeasonModal
          season={editSeason}
          onClose={() => { setShowModal(false); setEditSeason(null) }}
          onSaved={handleSaved}
          allSeasons={allSeasons}
        />
      )}
    </div>
  )
}
