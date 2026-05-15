import { useState, useEffect } from 'react'
import client from '../api/client'
import { classes } from '../api'
import '../pages/StudentsPage.css'

export default function AddToClassModal({ student, onClose, onSuccess }) {
  const [sessions, setSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [form, setForm] = useState({
    class_session: '',
    enrolment_type: 'course',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    classes.list()
      .then(({ data }) => {
        const results = Array.isArray(data) ? data : (data.results ?? [])
        setSessions(results)
        if (results.length > 0) {
          setForm(f => ({ ...f, class_session: results[0].id }))
        }
      })
      .catch(() => setError('Failed to load classes.'))
      .finally(() => setLoadingSessions(false))
  }, [])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function formatSession(s) {
    const parts = [s.name]
    if (s.day) parts.push(s.day)
    if (s.time) parts.push(s.time)
    else if (s.start_time) parts.push(s.start_time)
    return parts.join(' — ')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.class_session) {
      setError('Please select a class.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await client.post('/api/enrolments/', {
        student: student.id,
        class_session: form.class_session,
        enrolment_type: form.enrolment_type,
        notes: form.notes,
      })
      onSuccess()
      onClose()
    } catch (err) {
      const detail = err.response?.data
      setError(detail ? JSON.stringify(detail) : 'Failed to enrol student.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 480 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>
            Add to Class
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <form className="sd-body" onSubmit={handleSubmit}>
          <div style={{
            fontSize: 13,
            color: 'var(--grey)',
            marginBottom: 18,
            paddingBottom: 14,
            borderBottom: '1px solid var(--border)',
          }}>
            Student:{' '}
            <span style={{ color: 'var(--white)', fontWeight: 600 }}>
              {student.first_name} {student.last_name}
            </span>
          </div>

          {error && (
            <div style={{
              background: 'rgba(255,68,68,0.1)',
              border: '1px solid rgba(255,68,68,0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              color: '#ff4444',
              marginBottom: 14,
            }}>
              {error}
            </div>
          )}

          <div className="field">
            <label>Class</label>
            {loadingSessions ? (
              <div style={{ fontSize: 13, color: 'var(--grey)', padding: '8px 0' }}>Loading classes…</div>
            ) : (
              <select
                value={form.class_session}
                onChange={e => set('class_session', e.target.value)}
                required
              >
                {sessions.length === 0 && (
                  <option value="">No classes available</option>
                )}
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {formatSession(s)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="field">
            <label>Enrolment Type</label>
            <select
              value={form.enrolment_type}
              onChange={e => set('enrolment_type', e.target.value)}
            >
              <option value="course">Course / Season</option>
              <option value="casual">Casual / Drop-in</option>
              <option value="trial">Trial Class</option>
            </select>
          </div>

          <div className="field">
            <label>Notes <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              className="note-input"
              rows={3}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any notes about this enrolment…"
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-lime btn-sm"
              disabled={saving || loadingSessions}
            >
              {saving ? 'Enrolling…' : 'Enrol Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
