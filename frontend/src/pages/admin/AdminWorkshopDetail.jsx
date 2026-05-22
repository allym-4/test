import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { classes, users, studios } from '../../api'

function SectionCard({ title, children }) {
  return (
    <div style={{ background: '#111', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
      {title && (
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 16 }}>
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--grey)', marginBottom: 5, fontWeight: 500 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

const inputStyle = {
  width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8,
  padding: '9px 12px', fontSize: 13, color: 'var(--white)', fontFamily: 'inherit', boxSizing: 'border-box',
}

export default function AdminWorkshopDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const [workshop, setWorkshop] = useState(null)
  const [loadingWorkshop, setLoadingWorkshop] = useState(!isNew)
  const [bookings, setBookings] = useState(null)
  const [loadingBookings, setLoadingBookings] = useState(!isNew)

  useEffect(() => {
    if (!isNew) {
      classes.workshops.get(id).then(r => {
        setWorkshop(r.data)
        setLoadingWorkshop(false)
      })
      classes.workshops.bookings(id).then(r => {
        setBookings(r.data?.results || r.data || [])
        setLoadingBookings(false)
      })
    }
  }, [id, isNew])

  const { data: instrData } = useApi(() => users.list({ role: 'instructor' }), [])
  const { data: studioData } = useApi(() => studios.list(), [])
  const instructors = instrData?.results || instrData || []
  const studioList = studioData?.results || studioData || []

  const [form, setForm] = useState({
    name: '',
    description: '',
    date: '',
    start_time: '10:00',
    end_time: '12:00',
    price: '',
    capacity: 12,
    instructor: '',
    studio: '',
    is_active: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (workshop) {
      setForm({
        name: workshop.name || '',
        description: workshop.description || '',
        date: workshop.date || '',
        start_time: workshop.start_time?.slice(0, 5) || '10:00',
        end_time: workshop.end_time?.slice(0, 5) || '12:00',
        price: workshop.price ?? '',
        capacity: workshop.capacity || 12,
        instructor: workshop.instructor || '',
        studio: workshop.studio || '',
        is_active: workshop.is_active ?? true,
      })
    }
  }, [workshop])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        instructor: form.instructor || null,
        studio: form.studio || null,
        price: parseFloat(form.price) || 0,
        capacity: parseInt(form.capacity) || 12,
      }
      if (isNew) {
        await classes.workshops.create(payload)
      } else {
        await classes.workshops.update(id, payload)
      }
      navigate('/admin/classes?tab=workshops')
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Permanently delete this workshop? This cannot be undone.')) return
    await classes.workshops.delete(id)
    navigate('/admin/classes?tab=workshops')
  }

  if (loadingWorkshop) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div className="spinner" />
      </div>
    )
  }

  const confirmed = (bookings || []).filter(b => b.status === 'confirmed')
  const waitlisted = (bookings || []).filter(b => b.status === 'waitlisted')

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <button
            onClick={() => navigate('/admin/classes?tab=workshops')}
            style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            ← Back to Classes
          </button>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26 }}>
            {isNew ? 'New Workshop' : (workshop?.name || 'Workshop')}
          </div>
          {!isNew && workshop && (
            <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 4 }}>
              {workshop.date ? new Date(workshop.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }}
            >
              Delete
            </button>
          )}
          <button
            form="workshop-form"
            type="submit"
            className="btn btn-lime btn-sm"
            disabled={saving}
          >
            {saving ? 'Saving…' : isNew ? 'Create Workshop' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      <form id="workshop-form" onSubmit={handleSubmit}>
        <SectionCard title="Workshop Details">
          <Field label="Name *">
            <input
              style={inputStyle}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
              placeholder="e.g. Intro to Aerial Silks"
            />
          </Field>

          <Field label="Description" hint="Shown to students when booking. What will they learn? What should they bring?">
            <textarea
              style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe the workshop…"
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <Field label="Date *">
              <input
                style={inputStyle}
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                required
              />
            </Field>
            <Field label="Start Time *">
              <input
                style={inputStyle}
                type="time"
                value={form.start_time}
                onChange={e => set('start_time', e.target.value)}
                required
              />
            </Field>
            <Field label="End Time *">
              <input
                style={inputStyle}
                type="time"
                value={form.end_time}
                onChange={e => set('end_time', e.target.value)}
                required
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Price ($) *">
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                required
                placeholder="e.g. 75"
              />
            </Field>
            <Field label="Capacity">
              <input
                style={inputStyle}
                type="number"
                min="1"
                value={form.capacity}
                onChange={e => set('capacity', e.target.value)}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Instructor">
              <select style={inputStyle} value={form.instructor} onChange={e => set('instructor', e.target.value)}>
                <option value="">— None —</option>
                {instructors.map(i => (
                  <option key={i.id} value={i.id}>{i.display_name || i.first_name}</option>
                ))}
              </select>
            </Field>
            <Field label="Studio / Room">
              <select style={inputStyle} value={form.studio} onChange={e => set('studio', e.target.value)}>
                <option value="">— None —</option>
                {studioList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
            <label style={{ fontSize: 13, color: 'var(--grey)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => set('is_active', e.target.checked)}
                style={{ accentColor: 'var(--lime)', width: 16, height: 16 }}
              />
              Active (visible for booking)
            </label>
          </div>
        </SectionCard>
      </form>

      {/* Bookings — edit mode only */}
      {!isNew && (
        <SectionCard title={`Bookings${bookings ? ` · ${confirmed.length} confirmed${waitlisted.length > 0 ? `, ${waitlisted.length} waitlisted` : ''}` : ''}`}>
          {loadingBookings ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div className="spinner" /></div>
          ) : !bookings || bookings.length === 0 ? (
            <div style={{ color: 'var(--grey)', fontSize: 13, padding: '8px 0' }}>No bookings yet.</div>
          ) : (
            <>
              {confirmed.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--lime)', fontWeight: 600, marginBottom: 8 }}>
                    Confirmed ({confirmed.length})
                  </div>
                  <div style={{ background: '#1a1a1a', borderRadius: 8, overflow: 'hidden' }}>
                    {confirmed.map((b, i) => (
                      <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: i < confirmed.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{b.student_name}</div>
                          {b.student_email && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{b.student_email}</div>}
                        </div>
                        <span className="tag tag-lime" style={{ fontSize: 10 }}>Confirmed</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {waitlisted.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--amber)', fontWeight: 600, marginBottom: 8 }}>
                    Waitlist ({waitlisted.length})
                  </div>
                  <div style={{ background: '#1a1a1a', borderRadius: 8, overflow: 'hidden' }}>
                    {waitlisted.map((b, i) => (
                      <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: i < waitlisted.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{b.student_name}</div>
                          {b.student_email && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{b.student_email}</div>}
                        </div>
                        <span className="tag tag-amber" style={{ fontSize: 10 }}>Waitlisted</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </SectionCard>
      )}

      {/* Bottom save */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingBottom: 48 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/admin/classes?tab=workshops')}
        >
          Cancel
        </button>
        <button
          form="workshop-form"
          type="submit"
          className="btn btn-lime btn-sm"
          disabled={saving}
        >
          {saving ? 'Saving…' : isNew ? 'Create Workshop' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
