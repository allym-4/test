import { useState, useEffect } from 'react'
import client from '../api/client'
import '../pages/StudentsPage.css'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const inputStyle = {
  width: '100%',
  background: '#1a1a1a',
  border: '1px solid var(--border, #222)',
  borderRadius: 8,
  color: '#fff',
  padding: '9px 12px',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--grey, #888)',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const sectionStyle = {
  background: '#111',
  border: '1px solid var(--border, #222)',
  borderRadius: 10,
  padding: '16px 18px',
  marginBottom: 14,
}

const sectionTitleStyle = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: 'var(--grey, #888)',
  marginBottom: 14,
}

export default function AddEditClassModal({ session, onClose, onSaved }) {
  const isEdit = !!session

  const [form, setForm] = useState({
    selectedClassType: session ? { name: session.name, level: session.level } : null,
    name: session?.name || '',
    level: session?.level || '',
    category: session?.category || '',
    session_type: session?.session_type || 'course',
    catchup_cutoff_weeks: session?.catchup_cutoff_weeks ?? '',
    season: session?.season || '',
    day_of_week: session?.day_of_week ?? 0,
    start_time: session?.start_time?.slice(0, 5) || '18:00',
    duration_minutes: session?.duration_minutes || 90,
    capacity: session?.capacity || 12,
    instructor: session?.instructor || '',
    studio: session?.studio || '',
    is_active: session?.is_active ?? true,
  })

  const [classTypes, setClassTypes] = useState([])   // deduplicated class names
  const [showNewClassInput, setShowNewClassInput] = useState(false)
  const [instructors, setInstructors] = useState([])
  const [studios, setStudios] = useState([])
  const [seasons, setSeasons] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      client.get('/api/users/?role=instructor'),
      client.get('/api/users/?role=admin'),
      client.get('/api/classes/studios/'),
      client.get('/api/classes/seasons/'),
      client.get('/api/classes/sessions/?page_size=500'),
    ]).then(([instRes, adminRes, studioRes, seasonRes, sessionsRes]) => {
      setInstructors([...(instRes.data.results || []), ...(adminRes.data.results || [])])
      setStudios(studioRes.data.results || studioRes.data || [])
      setSeasons(seasonRes.data.results || seasonRes.data || [])

      // Deduplicate sessions by name, keep highest id
      const allSessions = sessionsRes.data.results || sessionsRes.data || []
      const seen = new Map()
      allSessions.forEach(s => {
        if (!seen.has(s.name) || s.id > seen.get(s.name).id) seen.set(s.name, s)
      })
      const deduped = Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
      setClassTypes(deduped)
    }).catch(() => {})
  }, [])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleClassTypeSelect(name) {
    if (name === '__new__') {
      setShowNewClassInput(true)
      set('selectedClassType', null)
      set('name', '')
      set('level', '')
      return
    }
    setShowNewClassInput(false)
    const match = classTypes.find(ct => ct.name === name)
    if (match) {
      setForm(f => ({
        ...f,
        selectedClassType: { name: match.name, level: match.level },
        name: match.name,
        level: match.level || '',
        session_type: match.session_type || f.session_type,
        catchup_cutoff_weeks: match.catchup_cutoff_weeks ?? f.catchup_cutoff_weeks,
      }))
    }
  }

  function handleStudioChange(studioId) {
    set('studio', studioId)
    const studio = studios.find(s => String(s.id) === String(studioId))
    if (studio) {
      const poles = parseInt(studio.poles) || parseInt(studio.capacity) || null
      if (poles) set('capacity', poles)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = {
        name: form.name,
        level: form.level,
        category: form.category || null,
        session_type: form.session_type,
        catchup_cutoff_weeks: form.catchup_cutoff_weeks === '' ? null : parseInt(form.catchup_cutoff_weeks),
        season: form.season || null,
        day_of_week: form.day_of_week,
        start_time: form.start_time + ':00',
        duration_minutes: form.duration_minutes,
        capacity: form.capacity,
        instructor: form.instructor || null,
        studio: form.studio || null,
        is_active: form.is_active,
      }
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
      <div className="sd-modal" style={{ maxWidth: 560 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>
            {isEdit ? 'Edit Class' : 'Add Class to Timetable'}
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit} style={{ overflowY: 'auto', maxHeight: '80vh' }}>
          {error && (
            <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>
              {error}
            </div>
          )}

          {/* Section 1: Class Type */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Class Type</div>

            {isEdit ? (
              /* Edit mode: show class name as plain display */
              <div style={{ marginBottom: 14 }}>
                <div style={labelStyle}>Class</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', padding: '9px 12px', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8 }}>
                  {form.name}
                  {form.level && <span style={{ fontSize: 12, color: 'var(--grey)', marginLeft: 8 }}>{form.level}</span>}
                </div>
              </div>
            ) : showNewClassInput ? (
              /* Creating with a new class type name */
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>New Class Name *</label>
                    <input
                      style={inputStyle}
                      value={form.name}
                      onChange={e => set('name', e.target.value)}
                      required
                      autoFocus
                      placeholder="e.g. Level 2"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setShowNewClassInput(false); set('name', ''); set('level', '') }}
                    style={{ flexShrink: 0, marginBottom: 0 }}
                  >
                    ← Back
                  </button>
                </div>
                <div>
                  <label style={labelStyle}>Level</label>
                  <input
                    style={inputStyle}
                    value={form.level}
                    onChange={e => set('level', e.target.value)}
                    placeholder="e.g. Level 2, Specialty"
                  />
                </div>
              </div>
            ) : (
              /* Creating: show dropdown of existing class types */
              <div style={{ marginBottom: 0 }}>
                <label style={labelStyle}>Select Class *</label>
                <select
                  style={inputStyle}
                  value={form.selectedClassType?.name || ''}
                  onChange={e => handleClassTypeSelect(e.target.value)}
                  required={!form.name}
                >
                  <option value="">— Select a class type —</option>
                  {classTypes.map(ct => (
                    <option key={ct.id} value={ct.name}>
                      {ct.name}{ct.level ? ` (${ct.level})` : ''}
                    </option>
                  ))}
                  <option value="__new__">+ Add new class type…</option>
                </select>
                {form.selectedClassType && (
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 6 }}>
                    Pre-filled from class type definition. Level and booking rules are inherited.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Schedule */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Schedule</div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Season</label>
              <select style={inputStyle} value={form.season} onChange={e => set('season', e.target.value)}>
                <option value="">— No season —</option>
                {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Day *</label>
                <select style={inputStyle} value={form.day_of_week} onChange={e => set('day_of_week', parseInt(e.target.value))}>
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Start Time *</label>
                <input
                  style={inputStyle}
                  type="time"
                  value={form.start_time}
                  onChange={e => set('start_time', e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Duration (minutes)</label>
              <input
                style={inputStyle}
                type="number"
                value={form.duration_minutes}
                onChange={e => set('duration_minutes', parseInt(e.target.value))}
                min={30}
                max={240}
              />
            </div>
          </div>

          {/* Section 3: Instructor & Room */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Instructor &amp; Room</div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Instructor</label>
              <select style={inputStyle} value={form.instructor} onChange={e => set('instructor', e.target.value)}>
                <option value="">— Unassigned —</option>
                {instructors.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.display_name || `${i.first_name} ${i.last_name}`}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 6 }}>
              <label style={labelStyle}>Room / Studio</label>
              <select
                style={inputStyle}
                value={form.studio}
                onChange={e => handleStudioChange(e.target.value)}
              >
                <option value="">— None —</option>
                {studios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 5 }}>
                Capacity defaults from the room's pole count and can be overridden.
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={labelStyle}>Capacity</label>
              <input
                style={inputStyle}
                type="number"
                value={form.capacity}
                onChange={e => set('capacity', parseInt(e.target.value))}
                min={1}
                max={100}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: form.is_active ? 'var(--lime)' : 'var(--grey)' }}>
              <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
              Active
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={loading}>
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add to Timetable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
