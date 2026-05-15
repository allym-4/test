import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../contexts/AuthContext'
import { availability } from '../api'
import client from '../api/client'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SLOTS = [
  { id: 'morning',   label: 'Morning',   sub: '9am – 12pm' },
  { id: 'afternoon', label: 'Afternoon', sub: '12pm – 5pm' },
  { id: 'evening',   label: 'Evening',   sub: '5pm – 10pm' },
]

function makeGrid(slots) {
  const grid = {}
  DAYS.forEach((_, d) => {
    grid[d] = {}
    SLOTS.forEach(s => { grid[d][s.id] = false })
  })
  ;(slots || []).forEach(slot => {
    if (grid[slot.day_of_week] !== undefined) {
      grid[slot.day_of_week][slot.slot] = slot.available
    }
  })
  return grid
}

export default function InstructorAvailability() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('availability')

  // Availability tab state
  const { data, loading, refetch } = useApi(() => availability.list())
  const [grid, setGrid] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Mark Unavailable modal
  const [unavailModal, setUnavailModal] = useState(false)
  const [unavailFrom, setUnavailFrom] = useState('')
  const [unavailTo, setUnavailTo] = useState('')
  const [unavailReason, setUnavailReason] = useState('')

  // Cover Requests tab state
  const { data: coverData, loading: coverLoading, refetch: coverRefetch } = useApi(
    () => client.get('/api/classes/occurrences/', { params: { cover_needed: true } })
  )
  const [coverActioning, setCoverActioning] = useState({})

  // My Cover History tab state
  const { data: historyData, loading: historyLoading } = useApi(
    () => user?.id ? client.get('/api/classes/occurrences/', { params: { substitute_instructor: user.id } }) : null
  )

  useEffect(() => {
    if (data) setGrid(makeGrid(data))
  }, [data])

  function toggle(day, slot) {
    setGrid(g => ({
      ...g,
      [day]: { ...g[day], [slot]: !g[day][slot] },
    }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    try {
      const payload = []
      DAYS.forEach((_, d) => {
        SLOTS.forEach(s => {
          payload.push({ day_of_week: d, slot: s.id, available: grid[d]?.[s.id] ?? false })
        })
      })
      await availability.save(payload)
      await refetch()
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  async function handleAcceptCover(occ) {
    setCoverActioning(a => ({ ...a, [occ.id]: 'accepting' }))
    try {
      await client.patch(`/api/classes/occurrences/${occ.id}/`, { substitute_instructor: user.id })
      await coverRefetch()
    } finally {
      setCoverActioning(a => ({ ...a, [occ.id]: null }))
    }
  }

  async function handleDeclineCover(occ) {
    setCoverActioning(a => ({ ...a, [occ.id]: 'declining' }))
    try {
      await client.patch(`/api/classes/occurrences/${occ.id}/`, { cover_needed: false })
      await coverRefetch()
    } finally {
      setCoverActioning(a => ({ ...a, [occ.id]: null }))
    }
  }

  const coverOccurrences = coverData?.results || coverData?.data?.results || []
  const historyOccurrences = historyData?.results || historyData?.data?.results || []

  const TABS = [
    { id: 'availability', label: 'My Availability' },
    { id: 'cover_requests', label: 'Cover Requests' },
    { id: 'cover_history', label: 'My Cover History' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Availability</div>
          <div style={{ fontSize: 13, color: 'var(--grey)' }}>Set your weekly teaching availability</div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="subtabs" style={{ marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`subtab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* My Availability */}
      {activeTab === 'availability' && (
        <>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 14 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setUnavailModal(true)}>Mark Unavailable</button>
                <button className="btn btn-lime btn-sm" onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
                </button>
              </div>

              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ padding: '10px 14px', fontSize: 11, color: 'var(--grey)' }} />
                  {DAYS.map(d => (
                    <div key={d} style={{ padding: '10px 8px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--grey)', textAlign: 'center', fontWeight: 600 }}>
                      {d.slice(0, 3)}
                    </div>
                  ))}
                </div>

                {/* Slot rows */}
                {SLOTS.map((slot, si) => (
                  <div key={slot.id} style={{ display: 'grid', gridTemplateColumns: '120px repeat(7, 1fr)', borderBottom: si < SLOTS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ padding: '14px', borderRight: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{slot.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--grey)', marginTop: 2 }}>{slot.sub}</div>
                    </div>
                    {DAYS.map((_, di) => {
                      const isAvail = grid[di]?.[slot.id] ?? false
                      return (
                        <button
                          key={di}
                          onClick={() => toggle(di, slot.id)}
                          style={{
                            border: 'none',
                            borderRight: di < 6 ? '1px solid var(--border)' : 'none',
                            background: isAvail ? 'rgba(204,255,0,0.1)' : 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 14,
                            transition: 'background 0.15s',
                          }}
                        >
                          {isAvail ? (
                            <span style={{ color: 'var(--lime)', fontSize: 16, fontWeight: 700 }}>✓</span>
                          ) : (
                            <span style={{ color: 'var(--border)', fontSize: 16 }}>–</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--grey)' }}>
                Click a cell to toggle your availability. Green means you're available to teach that slot.
              </div>
            </>
          )}
        </>
      )}

      {/* Cover Requests */}
      {activeTab === 'cover_requests' && (
        <div>
          {coverLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
          ) : coverOccurrences.length === 0 ? (
            <div className="empty-state">No open cover requests</div>
          ) : (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Instructor', 'Class', 'Date', 'Time', 'Studio', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--grey)', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {coverOccurrences.map(occ => (
                    <tr key={occ.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 14px', fontSize: 13 }}>{occ.instructor_detail?.display_name || occ.instructor_name || '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13 }}>{occ.session_detail?.name || occ.class_name || '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13 }}>{occ.date ? new Date(occ.date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13 }}>{occ.start_time?.slice(0, 5) || occ.session_detail?.start_time?.slice(0, 5) || '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13 }}>{occ.studio_detail?.name || occ.studio_name || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-lime btn-sm"
                            onClick={() => handleAcceptCover(occ)}
                            disabled={coverActioning[occ.id] === 'accepting'}
                          >
                            {coverActioning[occ.id] === 'accepting' ? '…' : 'Accept'}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDeclineCover(occ)}
                            disabled={coverActioning[occ.id] === 'declining'}
                          >
                            {coverActioning[occ.id] === 'declining' ? '…' : 'Decline'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* My Cover History */}
      {activeTab === 'cover_history' && (
        <div>
          {historyLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
          ) : historyOccurrences.length === 0 ? (
            <div className="empty-state">No cover history yet</div>
          ) : (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Date', 'Class', 'Original Instructor', 'Studio', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--grey)', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyOccurrences.map(occ => {
                    const isUpcoming = occ.date && new Date(occ.date) >= new Date(new Date().toISOString().slice(0, 10))
                    return (
                      <tr key={occ.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 14px', fontSize: 13 }}>{occ.date ? new Date(occ.date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13 }}>{occ.session_detail?.name || occ.class_name || '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13 }}>{occ.instructor_detail?.display_name || occ.instructor_name || '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13 }}>{occ.studio_detail?.name || occ.studio_name || '—'}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span className={`tag ${isUpcoming ? 'tag-lime' : 'tag-grey'}`} style={{ fontSize: 10 }}>
                            {isUpcoming ? 'Upcoming' : 'Completed'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Mark Unavailable Modal */}
      {unavailModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setUnavailModal(false)}>
          <div className="modal-box">
            <div className="modal-title">
              Mark Unavailable
              <button className="modal-close" onClick={() => setUnavailModal(false)}>✕</button>
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 6 }}>Date From</label>
              <input
                className="input"
                type="date"
                value={unavailFrom}
                onChange={e => setUnavailFrom(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 6 }}>Date To</label>
              <input
                className="input"
                type="date"
                value={unavailTo}
                onChange={e => setUnavailTo(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 6 }}>Reason</label>
              <textarea
                rows={3}
                value={unavailReason}
                onChange={e => setUnavailReason(e.target.value)}
                placeholder="e.g. Holiday, illness, personal leave…"
                style={{ width: '100%', background: '#111', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, resize: 'vertical' }}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setUnavailModal(false)}>Cancel</button>
              <button className="btn btn-lime btn-sm" onClick={async () => {
                if (!unavailFrom || !unavailTo) return
                await availability.unavailableDates.create({ date_from: unavailFrom, date_to: unavailTo, reason: unavailReason })
                setUnavailModal(false)
                setUnavailFrom('')
                setUnavailTo('')
                setUnavailReason('')
              }}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
