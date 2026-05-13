import { useState, useEffect } from 'react'
import client from '../api/client'
import '../pages/StudentsPage.css'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function AddEditClassModal({ session, onClose, onSaved }) {
  const isEdit = !!session
  const [form, setForm] = useState({
    name: session?.name || '',
    level: session?.level || '',
    instructor: session?.instructor || '',
    studio: session?.studio || '',
    day_of_week: session?.day_of_week ?? 0,
    start_time: session?.start_time?.slice(0, 5) || '18:00',
    duration_minutes: session?.duration_minutes || 90,
    capacity: session?.capacity || 12,
    session_type: session?.session_type || 'course',
    is_active: session?.is_active ?? true,
  })
  const [instructors, setInstructors] = useState([])
  const [studios, setStudios] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      client.get('/api/users/?role=instructor'),
      client.get('/api/users/?role=admin'),
      client.get('/api/classes/studios/'),
    ]).then(([instRes, adminRes, studioRes]) => {
      setInstructors([...(instRes.data.results || []), ...(adminRes.data.results || [])])
      setStudios(studioRes.data.results || studioRes.data || [])
    }).catch(() => {})
  }, [])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = { ...form, start_time: form.start_time + ':00' }
      const res = isEdit
        ? await client.patch(`/api/classes/sessions/${session.id}/`, payload)
        : await client.post('/api/classes/sessions/', payload)
      onSaved(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 520 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>{isEdit ? 'Edit Class' : 'Add Class'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit}>
          {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>}

          <div className="field"><label>Class Name *</label><input value={form.name} onChange={e => set('name', e.target.value)} required autoFocus /></div>
          <div className="field"><label>Level</label><input value={form.level} onChange={e => set('level', e.target.value)} placeholder="e.g. Beginner, Level 2" /></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Day *</label>
              <select value={form.day_of_week} onChange={e => set('day_of_week', parseInt(e.target.value))}>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Start Time *</label>
              <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Duration (mins)</label>
              <input type="number" value={form.duration_minutes} onChange={e => set('duration_minutes', parseInt(e.target.value))} min={30} max={240} />
            </div>
            <div className="field">
              <label>Capacity</label>
              <input type="number" value={form.capacity} onChange={e => set('capacity', parseInt(e.target.value))} min={1} max={100} />
            </div>
          </div>

          <div className="field">
            <label>Instructor</label>
            <select value={form.instructor} onChange={e => set('instructor', e.target.value)}>
              <option value="">— Unassigned —</option>
              {instructors.map(i => <option key={i.id} value={i.id}>{i.display_name || `${i.first_name} ${i.last_name}`}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Studio / Location</label>
            <select value={form.studio} onChange={e => set('studio', e.target.value)}>
              <option value="">— None —</option>
              {studios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Type</label>
              <select value={form.session_type} onChange={e => set('session_type', e.target.value)}>
                <option value="course">Course / Season</option>
                <option value="casual">Casual / Drop-in</option>
              </select>
            </div>
            <div className="field" style={{ paddingTop: 22 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
                Active
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={loading}>{loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Class'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
