import { useState, useEffect, useRef } from 'react'
import { useApi } from '../../hooks/useApi'
import { classes as classesApi, studios as studiosApi, users as usersApi } from '../../api'

function fmt(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr > 12 ? hr - 12 : hr || 12}:${m}${hr >= 12 ? 'pm' : 'am'}`
}

function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

const EMPTY_SLOT = { studio: '', date: '', start_time: '', end_time: '', capacity: 6, notes: '', repeat_weeks: 1 }

const ATT_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'var(--grey)' },
  { value: 'present', label: 'Attended', color: 'var(--lime)' },
  { value: 'no_show', label: 'No-show (fee)', color: 'var(--red)' },
  { value: 'no_show_waived', label: 'No-show (no fee)', color: 'var(--amber)' },
]

function AttendanceRow({ booking, slotId, onUpdated }) {
  const [busy, setBusy] = useState(false)

  async function setStatus(newStatus) {
    setBusy(true)
    try {
      await classesApi.practice.updateAttendance(slotId, {
        student_id: booking.student,
        attendance_status: newStatus,
        kisi_access_granted: booking.kisi_access_granted,
      })
      onUpdated()
    } catch {
      // ignore
    }
    setBusy(false)
  }

  async function toggleKisi() {
    setBusy(true)
    try {
      await classesApi.practice.updateAttendance(slotId, {
        student_id: booking.student,
        attendance_status: booking.attendance_status || 'pending',
        kisi_access_granted: !booking.kisi_access_granted,
      })
      onUpdated()
    } catch {
      // ignore
    }
    setBusy(false)
  }

  async function remove() {
    if (!confirm(`Remove ${booking.student_detail?.display_name} from this session?`)) return
    setBusy(true)
    try {
      await classesApi.practice.removeStudent(slotId, booking.student)
      onUpdated()
    } catch {
      // ignore
    }
    setBusy(false)
  }

  const currentStatus = ATT_STATUSES.find(s => s.value === (booking.attendance_status || 'pending'))

  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{booking.student_detail?.display_name}</div>
          <div style={{ fontSize: 11, color: 'var(--grey)' }}>{booking.student_detail?.email}</div>
          <div style={{ fontSize: 11, marginTop: 2, color: booking.is_free ? 'var(--lime)' : 'var(--lav)' }}>
            {booking.is_free ? 'Free' : `$${parseFloat(booking.price_charged || 0).toFixed(0)}`}
            {booking.payment_type ? ` · ${booking.payment_type}` : ''}
          </div>
        </div>

        {/* Attendance status buttons */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {ATT_STATUSES.map(s => (
            <button
              key={s.value}
              disabled={busy}
              onClick={() => setStatus(s.value)}
              style={{
                fontSize: 11,
                padding: '4px 8px',
                borderRadius: 6,
                border: `1px solid ${booking.attendance_status === s.value ? s.color : 'var(--border)'}`,
                background: booking.attendance_status === s.value ? s.color + '22' : 'transparent',
                color: booking.attendance_status === s.value ? s.color : 'var(--grey)',
                cursor: busy ? 'default' : 'pointer',
                fontWeight: booking.attendance_status === s.value ? 700 : 400,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Kisi toggle */}
        <button
          disabled={busy}
          onClick={toggleKisi}
          title="Kisi access granted"
          style={{
            fontSize: 11,
            padding: '4px 10px',
            borderRadius: 6,
            border: `1px solid ${booking.kisi_access_granted ? 'var(--lime)' : 'var(--border)'}`,
            background: booking.kisi_access_granted ? 'rgba(204,255,0,0.12)' : 'transparent',
            color: booking.kisi_access_granted ? 'var(--lime)' : 'var(--grey)',
            cursor: busy ? 'default' : 'pointer',
            fontWeight: booking.kisi_access_granted ? 700 : 400,
          }}
        >
          {booking.kisi_access_granted ? '🔓 Kisi' : '🔒 Kisi'}
        </button>

        {/* Remove */}
        <button
          disabled={busy}
          onClick={remove}
          style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', color: 'var(--red)', background: 'transparent', cursor: busy ? 'default' : 'pointer' }}
        >
          Remove
        </button>
      </div>
    </div>
  )
}

function AddStudentRow({ slotId, onAdded }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [searching, setSearching] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await usersApi.list({ search: query, role: 'student', page_size: 8 })
        setResults(r.data?.results || r.data || [])
      } catch {
        setResults([])
      }
      setSearching(false)
    }, 300)
  }, [query])

  async function addStudent(student) {
    setBusy(true)
    try {
      await classesApi.practice.addStudent(slotId, student.id)
      setQuery('')
      setResults([])
      onAdded()
    } catch (e) {
      alert(e.response?.data?.detail || 'Could not add student.')
    }
    setBusy(false)
  }

  return (
    <div style={{ paddingTop: 14 }}>
      <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Add student</div>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
        {(results.length > 0 || searching) && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 50, maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
            {searching && <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--grey)' }}>Searching…</div>}
            {results.map(s => (
              <button
                key={s.id}
                disabled={busy}
                onClick={() => addStudent(s)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', color: '#fff' }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.display_name || `${s.first_name} ${s.last_name}`.trim()}</div>
                <div style={{ fontSize: 11, color: 'var(--grey)' }}>{s.email}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminPractice() {
  const today = new Date().toISOString().split('T')[0]
  const [tab, setTab] = useState('upcoming')
  const [modal, setModal] = useState(null) // null | 'new' | slot object
  const [form, setForm] = useState(EMPTY_SLOT)
  const [busy, setBusy] = useState(false)
  const [attendanceSlot, setAttendanceSlot] = useState(null)
  const [attendanceData, setAttendanceData] = useState(null)
  const [attLoading, setAttLoading] = useState(false)

  const { data: slotsData, refetch } = useApi(
    () => classesApi.practice.list(tab === 'past' ? { date_to: today } : { date_from: today }),
    [tab]
  )
  const { data: studiosData } = useApi(() => studiosApi.list(), [])

  const slots = slotsData?.results || slotsData || []
  const studioList = studiosData?.results || studiosData || []

  async function loadAttendance(slot) {
    setAttendanceSlot(slot)
    setAttLoading(true)
    try {
      const r = await classesApi.practice.attendance(slot.id)
      setAttendanceData(r.data)
    } catch {
      setAttendanceData(null)
    }
    setAttLoading(false)
  }

  async function refreshAttendance() {
    if (!attendanceSlot) return
    await loadAttendance(attendanceSlot)
    refetch()
  }

  function openNew() {
    setForm({ ...EMPTY_SLOT, studio: studioList[0]?.id || '' })
    setModal('new')
  }

  function openEdit(slot) {
    setForm({
      studio: slot.studio,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      capacity: slot.capacity,
      notes: slot.notes || '',
    })
    setModal(slot)
  }

  function addDaysToDate(dateStr, n) {
    const d = new Date(dateStr + 'T00:00')
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
  }

  async function handleSave() {
    setBusy(true)
    try {
      if (modal === 'new') {
        const weeks = parseInt(form.repeat_weeks) || 1
        const { repeat_weeks, ...slotData } = form
        for (let i = 0; i < weeks; i++) {
          await classesApi.practice.create({ ...slotData, date: addDaysToDate(form.date, i * 7) })
        }
      } else {
        const { repeat_weeks, ...slotData } = form
        await classesApi.practice.update(modal.id, slotData)
      }
      setModal(null)
      refetch()
    } catch (e) {
      alert(e.response?.data?.detail || 'Save failed')
    }
    setBusy(false)
  }

  async function handleDelete(slot) {
    if (!confirm(`Delete practice slot on ${fmtDate(slot.date)}?`)) return
    await classesApi.practice.delete(slot.id)
    refetch()
  }

  // Total booked across upcoming slots
  const totalBooked = slots.reduce((s, sl) => s + (sl.booked_count || 0), 0)
  const totalCapacity = slots.reduce((s, sl) => s + (sl.capacity || 0), 0)

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Practice Time</h1>
          <div className="page-sub">Open studio sessions for independent practice</div>
        </div>
        <button className="btn btn-lime" onClick={openNew}>+ Add Slot</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          ['Upcoming slots', slots.length],
          ['Total booked', totalBooked],
          ['Total capacity', totalCapacity],
          ['Fill rate', totalCapacity ? `${Math.round(100 * totalBooked / totalCapacity)}%` : '—'],
        ].map(([label, val]) => (
          <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: 'var(--lime)' }}>{val}</div>
            <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Pricing info */}
      <div style={{ background: 'rgba(176,160,255,0.08)', border: '1px solid rgba(176,160,255,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--grey)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <span>Enrolled students: <strong style={{ color: '#fff' }}>$20/hr</strong></span>
        <span>Non-enrolled: <strong style={{ color: '#fff' }}>$30/hr</strong></span>
        <span style={{ color: 'var(--lime)' }}>3 classes enrolled this season: <strong>1 free/week</strong></span>
        <span style={{ color: 'var(--lime)' }}>4+ classes enrolled: <strong>unlimited free</strong></span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[['upcoming', 'Upcoming'], ['past', 'Past']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`btn btn-sm ${tab === key ? 'btn-lime' : 'btn-ghost'}`}>{label}</button>
        ))}
      </div>

      {/* Slot list */}
      {slots.length === 0 ? (
        <div style={{ color: 'var(--grey)', fontSize: 13, padding: '32px', textAlign: 'center', background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)' }}>
          No {tab} practice slots.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {slots.map(slot => (
            <div key={slot.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{slot.studio_detail?.name}</div>
                <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 2 }}>
                  {fmtDate(slot.date)} · {fmt(slot.start_time)}–{fmt(slot.end_time)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: slot.spots_left === 0 ? 'var(--red)' : 'var(--lime)' }}>
                    {slot.booked_count}/{slot.capacity}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--grey)', textTransform: 'uppercase' }}>Booked</div>
                </div>
                {slot.notes && <div style={{ fontSize: 12, color: 'var(--grey)', maxWidth: 200 }}>{slot.notes}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => loadAttendance(slot)}>
                  Attendance ({slot.booked_count})
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(slot)}>Edit</button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDelete(slot)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {modal !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 420 }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 18 }}>
              {modal === 'new' ? 'New Practice Slot' : 'Edit Practice Slot'}
            </div>
            {[
              ['Studio', <select value={form.studio} onChange={e => setForm(f => ({ ...f, studio: e.target.value }))}>
                {studioList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>],
              ['Date', <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />],
              ['Start time', <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />],
              ['End time', <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />],
              ['Capacity', <input type="number" min={1} max={20} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))} />],
              ['Notes', <input placeholder="Optional note shown to students" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />],
            ].map(([label, field]) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                {field}
              </div>
            ))}
            {modal === 'new' && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repeat for</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number" min={1} max={52}
                    value={form.repeat_weeks}
                    onChange={e => setForm(f => ({ ...f, repeat_weeks: parseInt(e.target.value) || 1 }))}
                    style={{ width: 70 }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--grey)' }}>week{form.repeat_weeks !== 1 ? 's' : ''}</span>
                  {form.repeat_weeks > 1 && (
                    <span style={{ fontSize: 11, color: 'var(--lime)' }}>creates {form.repeat_weeks} slots</span>
                  )}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-lime btn-sm" style={{ flex: 1 }} disabled={busy} onClick={handleSave}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance panel */}
      {attendanceSlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) { setAttendanceSlot(null); setAttendanceData(null) } }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>
                  {attendanceSlot.studio_detail?.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
                  {fmtDate(attendanceSlot.date)} · {fmt(attendanceSlot.start_time)}–{fmt(attendanceSlot.end_time)}
                </div>
                {attendanceData && (
                  <div style={{ fontSize: 12, color: 'var(--lime)', marginTop: 4 }}>
                    {attendanceData.bookings?.length || 0} / {attendanceSlot.capacity} booked
                  </div>
                )}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAttendanceSlot(null); setAttendanceData(null) }}>✕</button>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {ATT_STATUSES.map(s => (
                <span key={s.value} style={{ fontSize: 10, color: s.color, border: `1px solid ${s.color}33`, borderRadius: 4, padding: '2px 6px' }}>
                  {s.label}
                </span>
              ))}
              <span style={{ fontSize: 10, color: 'var(--lime)', border: '1px solid rgba(204,255,0,0.2)', borderRadius: 4, padding: '2px 6px' }}>
                Kisi = door access granted
              </span>
            </div>

            {attLoading ? (
              <div style={{ color: 'var(--grey)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Loading…</div>
            ) : !attendanceData ? (
              <div style={{ color: 'var(--grey)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Could not load attendance.</div>
            ) : attendanceData.bookings?.length === 0 ? (
              <div style={{ color: 'var(--grey)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No bookings yet.</div>
            ) : (
              attendanceData.bookings.map(b => (
                <AttendanceRow
                  key={b.id}
                  booking={b}
                  slotId={attendanceSlot.id}
                  onUpdated={refreshAttendance}
                />
              ))
            )}

            {/* Add student */}
            {attendanceData && (
              <AddStudentRow slotId={attendanceSlot.id} onAdded={refreshAttendance} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
