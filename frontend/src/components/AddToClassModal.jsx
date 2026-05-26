import { useState, useEffect } from 'react'
import client from '../api/client'
import { classes, seasons as seasonsApi } from '../api'
import '../pages/StudentsPage.css'
import { fmt12 } from '../utils/time'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function datesForSession(session, season) {
  if (!season?.start_date || !season?.end_date) return []
  const dow = session.day_of_week // 0=Mon
  const start = new Date(season.start_date)
  const end = new Date(season.end_date)
  const dates = []
  let d = new Date(start)
  // advance to first occurrence of dow
  while (d.getDay() !== (dow + 1) % 7) d.setDate(d.getDate() + 1) // JS: 0=Sun
  // actually JS getDay: 0=Sun,1=Mon...6=Sat. Our dow: 0=Mon...6=Sun
  // Re-map: our 0→JS 1, our 6→JS 0
  const jsDow = (dow + 1) % 7
  d = new Date(start)
  while (d.getDay() !== jsDow) d.setDate(d.getDate() + 1)
  while (d <= end) {
    dates.push(d.toISOString().slice(0, 10))
    d = new Date(d)
    d.setDate(d.getDate() + 7)
  }
  return dates
}

export default function AddToClassModal({ student, onClose, onSuccess }) {
  const [seasonsList, setSeasonsList] = useState([])
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [enrolmentType, setEnrolmentType] = useState('course')
  const [selectedDate, setSelectedDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    seasonsApi.list().then(r => {
      const all = r.data?.results || r.data || []
      const active = all.filter(s => s.status === 'active' || s.status === 'upcoming')
      setSeasonsList(active)
      if (active.length > 0) setSelectedSeason(active[0])
    })
  }, [])

  useEffect(() => {
    if (!selectedSeason) return
    setSessions([])
    setSelectedSession(null)
    classes.list({ season: selectedSeason.id, active: 'true' }).then(r => {
      const results = r.data?.results || r.data || []
      setSessions(results)
      if (results.length > 0) setSelectedSession(results[0])
    })
  }, [selectedSeason?.id])

  useEffect(() => {
    setSelectedDate('')
  }, [selectedSession, enrolmentType])

  const availableDates = (enrolmentType === 'casual' || enrolmentType === 'trial') && selectedSession && selectedSeason
    ? datesForSession(selectedSession, selectedSeason).filter(d => d >= new Date().toISOString().slice(0, 10))
    : []

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedSession) { setError('Please select a class.'); return }
    if ((enrolmentType === 'casual' || enrolmentType === 'trial') && !selectedDate) {
      setError('Please select a date.'); return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        student: student.id,
        class_session: selectedSession.id,
        enrolment_type: enrolmentType,
      }
      if (selectedDate) payload.date = selectedDate
      await client.post('/api/enrolments/', payload)
      onSuccess()
      onClose()
    } catch (err) {
      const detail = err.response?.data
      setError(detail ? (typeof detail === 'string' ? detail : JSON.stringify(detail)) : 'Failed to enrol student.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 480 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>Add to Class</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <form className="sd-body" onSubmit={handleSubmit}>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
            Student: <span style={{ color: 'var(--white)', fontWeight: 600 }}>{student.display_name || `${student.first_name} ${student.last_name}`}</span>
          </div>

          {error && (
            <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff4444', marginBottom: 14 }}>
              {error}
            </div>
          )}

          <div className="field">
            <label>Season</label>
            <select value={selectedSeason?.id || ''} onChange={e => setSelectedSeason(seasonsList.find(s => String(s.id) === e.target.value))}>
              {seasonsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Class</label>
            {sessions.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--grey)', padding: '8px 0' }}>
                {selectedSeason ? 'No classes in this season.' : 'Select a season first.'}
              </div>
            ) : (
              <select value={selectedSession?.id || ''} onChange={e => setSelectedSession(sessions.find(s => String(s.id) === e.target.value))}>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {DAYS[s.day_of_week]} {fmt12(s.start_time)}
                    {s.instructor_detail?.display_name ? ` · ${s.instructor_detail.display_name}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="field">
            <label>Enrolment Type</label>
            <select value={enrolmentType} onChange={e => setEnrolmentType(e.target.value)}>
              <option value="course">Full Season</option>
              <option value="casual">Single Casual Class</option>
              <option value="trial">Trial Class</option>
            </select>
          </div>

          {(enrolmentType === 'casual' || enrolmentType === 'trial') && (
            <div className="field">
              <label>Date</label>
              {availableDates.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--grey)', padding: '6px 0' }}>No upcoming dates available.</div>
              ) : (
                <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} required>
                  <option value="">Select date…</option>
                  {availableDates.map(d => {
                    const label = new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
                    return <option key={d} value={d}>{label}</option>
                  })}
                </select>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving || !selectedSession}>
              {saving ? 'Enrolling…' : 'Enrol Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
