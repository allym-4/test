import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { classes as classesApi, studios as studiosApi } from '../../api'

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

const EMPTY_SLOT = { studio: '', date: '', start_time: '', end_time: '', capacity: 6, notes: '' }

export default function AdminPractice() {
  const today = new Date().toISOString().split('T')[0]
  const [tab, setTab] = useState('upcoming')
  const [modal, setModal] = useState(null) // null | 'new' | slot object
  const [form, setForm] = useState(EMPTY_SLOT)
  const [busy, setBusy] = useState(false)
  const [viewBookings, setViewBookings] = useState(null)

  const { data: slotsData, refetch } = useApi(
    () => classesApi.practice.list(tab === 'past' ? { date_to: today } : { date_from: today }),
    [tab]
  )
  const { data: studiosData } = useApi(() => studiosApi.list(), [])
  const { data: bookingsData } = useApi(
    () => viewBookings ? classesApi.practice.allBookings({ slot: viewBookings.id }) : null,
    [viewBookings]
  )

  const slots = slotsData?.results || slotsData || []
  const studioList = studiosData?.results || studiosData || []
  const bookings = bookingsData?.results || bookingsData || []

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

  async function handleSave() {
    setBusy(true)
    try {
      if (modal === 'new') {
        await classesApi.practice.create(form)
      } else {
        await classesApi.practice.update(modal.id, form)
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
        <span>💜 Enrolled students: <strong style={{ color: '#fff' }}>$20/hr</strong></span>
        <span>👤 Non-enrolled: <strong style={{ color: '#fff' }}>$30/hr</strong></span>
        <span style={{ color: 'var(--lime)' }}>✓ 3+ classes this week: <strong>FREE</strong></span>
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
                <button className="btn btn-ghost btn-sm" onClick={() => setViewBookings(slot)}>
                  👥 {slot.booked_count}
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
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-lime btn-sm" style={{ flex: 1 }} disabled={busy} onClick={handleSave}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bookings viewer */}
      {viewBookings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setViewBookings(null) }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>{viewBookings.studio_detail?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{fmtDate(viewBookings.date)} · {fmt(viewBookings.start_time)}–{fmt(viewBookings.end_time)}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewBookings(null)}>✕</button>
            </div>
            {bookings.length === 0 ? (
              <div style={{ color: 'var(--grey)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No bookings yet.</div>
            ) : bookings.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{b.student_detail?.display_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey)' }}>{b.student_detail?.email}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, color: b.is_free ? 'var(--lime)' : 'var(--lav)', fontWeight: 600 }}>
                    {b.is_free ? 'Free' : `$${parseFloat(b.price_charged).toFixed(0)}`}
                  </div>
                  <div style={{ fontSize: 10, color: b.status === 'confirmed' ? 'var(--lime)' : 'var(--red)', textTransform: 'uppercase' }}>{b.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
