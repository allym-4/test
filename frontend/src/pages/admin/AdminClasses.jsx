import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { classes, users, studios } from '../../api'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TYPE_LABELS = { course: 'Course', casual: 'Drop-In' }

function ClassModal({ cls, instructors, studios, onSave, onClose }) {
  const [form, setForm] = useState({
    name: cls?.name || '',
    level: cls?.level || '',
    session_type: cls?.session_type || 'course',
    day_of_week: cls?.day_of_week ?? 0,
    start_time: cls?.start_time?.slice(0, 5) || '09:00',
    duration_minutes: cls?.duration_minutes || 90,
    capacity: cls?.capacity || 12,
    instructor: cls?.instructor || '',
    studio: cls?.studio || '',
    is_active: cls?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (cls?.id) {
        await classes.update(cls.id, form)
      } else {
        await classes.create(form)
      }
      onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{cls ? 'Edit Class' : 'Create Class'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Class Name</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required style={{ width: '100%' }} />
            </div>
            <div>
              <label className="form-label">Level</label>
              <input className="input" value={form.level} onChange={e => set('level', e.target.value)} style={{ width: '100%' }} placeholder="e.g. Level 2" />
            </div>
            <div>
              <label className="form-label">Type</label>
              <select className="input" value={form.session_type} onChange={e => set('session_type', e.target.value)} style={{ width: '100%' }}>
                <option value="course">Course</option>
                <option value="casual">Drop-In</option>
              </select>
            </div>
            <div>
              <label className="form-label">Day</label>
              <select className="input" value={form.day_of_week} onChange={e => set('day_of_week', parseInt(e.target.value))} style={{ width: '100%' }}>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Start Time</label>
              <input className="input" type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} style={{ width: '100%' }} />
            </div>
            <div>
              <label className="form-label">Duration (mins)</label>
              <input className="input" type="number" value={form.duration_minutes} onChange={e => set('duration_minutes', parseInt(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div>
              <label className="form-label">Capacity</label>
              <input className="input" type="number" value={form.capacity} onChange={e => set('capacity', parseInt(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div>
              <label className="form-label">Instructor</label>
              <select className="input" value={form.instructor || ''} onChange={e => set('instructor', e.target.value || null)} style={{ width: '100%' }}>
                <option value="">— None —</option>
                {instructors.map(i => <option key={i.id} value={i.id}>{i.display_name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Studio</label>
              <select className="input" value={form.studio || ''} onChange={e => set('studio', e.target.value || null)} style={{ width: '100%' }}>
                <option value="">— None —</option>
                {studios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : cls ? 'Save Changes' : 'Create Class'}</button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminClasses() {
  const [typeFilter, setTypeFilter] = useState('all')
  const [modal, setModal] = useState(null) // null | 'create-course' | 'create-casual' | classObj
  const [deleting, setDeleting] = useState(null)

  const { data: sessData, loading, refetch } = useApi(() => classes.list(), [])
  const { data: instrData } = useApi(() => users.list({ role: 'instructor' }), [])
  const { data: studioData } = useApi(() => studios.list(), [])

  const sessions = sessData?.results || sessData || []
  const instructors = instrData?.results || instrData || []
  const studioList = studioData?.results || studioData || []

  const filtered = typeFilter === 'all' ? sessions
    : sessions.filter(s => s.session_type === typeFilter)

  async function handleDelete(id) {
    if (!confirm('Delete this class? This cannot be undone.')) return
    setDeleting(id)
    try {
      await classes.delete(id)
      refetch()
    } finally {
      setDeleting(null)
    }
  }

  function openCreate(type) {
    setModal({ _new: true, session_type: type })
  }

  return (
    <div>
      {(modal && modal !== null) && (
        <ClassModal
          cls={modal._new ? { session_type: modal.session_type } : modal}
          instructors={instructors}
          studios={studioList}
          onSave={() => { setModal(null); refetch() }}
          onClose={() => setModal(null)}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Classes</div>
          <div style={{ fontSize: 13, color: 'var(--grey)' }}>Manage all class types available in your studio</div>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => openCreate('course')}>+ Course</button>
            <button className="btn btn-ghost btn-sm" onClick={() => openCreate('casual')}>+ Drop-In</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['all', 'All Types'], ['course', 'Course'], ['casual', 'Drop-In']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setTypeFilter(v)}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, border: '1px solid var(--border)',
              background: typeFilter === v ? 'var(--lime)' : 'transparent',
              color: typeFilter === v ? '#000' : 'var(--grey)',
              cursor: 'pointer',
            }}
          >{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Day / Time</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Instructor</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Cap</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--grey)', fontSize: 13 }}>No classes yet.</td></tr>
              ) : filtered.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                    {s.level && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{s.level}</div>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`tag ${s.session_type === 'course' ? 'tag-lav' : 'tag-amber'}`} style={{ fontSize: 10 }}>
                      {TYPE_LABELS[s.session_type] || s.session_type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--grey)' }}>
                    {DAYS[s.day_of_week]} · {s.start_time?.slice(0, 5)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>
                    {s.instructor_detail?.display_name || <span style={{ color: 'var(--grey)' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>{s.capacity}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-xs" onClick={() => setModal(s)}>Edit</button>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleDelete(s.id)}
                        disabled={deleting === s.id}
                        style={{ color: 'var(--red)' }}
                      >{deleting === s.id ? '…' : 'Delete'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
