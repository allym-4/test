import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { classes } from '../../api'
import { Link } from 'react-router-dom'
import AddEditClassModal from '../../components/AddEditClassModal'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function getWeekStart(offset = 0) {
  const d = new Date()
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
  d.setDate(d.getDate() - dow + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function AdminTimetable() {
  const [weekOffset, setWeekOffset] = useState(0)
  const { data, loading, refetch } = useApi(() => classes.list())
  const [sessionList, setSessionList] = useState(null)
  const [showAddClass, setShowAddClass] = useState(false)
  const [editSession, setEditSession] = useState(null)

  const sessions = sessionList ?? (data?.results || [])

  const weekStart = getWeekStart(weekOffset)
  const weekLabel = 'Week of ' + weekStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

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
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Timetable</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w - 1)}>← Prev</button>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{weekLabel}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(w => w + 1)}>Next →</button>
          </div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => { setEditSession(null); setShowAddClass(true) }}>+ Add Class</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : (
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
                      <div style={{ fontSize: 11, color: 'var(--grey)' }}>{classDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</div>
                    </td>
                    <td style={{ color: isToday ? 'var(--lime)' : 'var(--grey)', fontFamily: "'Archivo Black', sans-serif", fontSize: 14 }}>
                      {s.start_time?.slice(0, 5)}
                    </td>
                    <td><b>{s.name}</b>{s.level && <span style={{ fontSize: 11, color: 'var(--grey)', marginLeft: 6 }}>{s.level}</span>}</td>
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
                      <button className="btn btn-ghost btn-xs" onClick={() => { setEditSession(s); setShowAddClass(true) }}>Edit</button>
                    </td>
                  </tr>
                )
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--grey)', padding: '32px 0' }}>No classes yet — add your first class above</td></tr>
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
