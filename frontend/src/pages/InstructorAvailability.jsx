import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import { availability } from '../api'

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
  const { data, loading, refetch } = useApi(() => availability.list())
  const [grid, setGrid] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Availability</div>
          <div style={{ fontSize: 13, color: 'var(--grey)' }}>Set your weekly teaching availability</div>
        </div>
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
    </div>
  )
}
