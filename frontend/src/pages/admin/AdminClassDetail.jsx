import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { classes, categories as categoriesApi } from '../../api'
import { fmt12 } from '../../utils/time'

const inputStyle = {
  width: '100%',
  background: 'var(--input, #1a1a1a)',
  border: '1px solid var(--border, #222)',
  borderRadius: 8,
  color: 'var(--white, #fff)',
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

const sectionCard = {
  background: '#111',
  border: '1px solid var(--border, #222)',
  borderRadius: 12,
  padding: '20px 24px',
  marginBottom: 24,
}

const sectionTitle = {
  fontSize: 13,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: 'var(--grey, #888)',
  marginBottom: 16,
}

function UpsellsPanel({ sessionId, allSessions }) {
  const [upsells, setUpsells] = useState([])
  const [adding, setAdding] = useState(false)
  const [newForm, setNewForm] = useState({ suggested_session: '', headline: '', body: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    classes.upsells.list({ source_session: sessionId }).then(r => setUpsells(r.data?.results || r.data || []))
  }, [sessionId])

  async function saveNew(e) {
    e.preventDefault()
    if (!newForm.suggested_session || !newForm.headline) return
    setSaving(true)
    try {
      await classes.upsells.create({ source_session: sessionId, ...newForm })
      const r = await classes.upsells.list({ source_session: sessionId })
      setUpsells(r.data?.results || r.data || [])
      setNewForm({ suggested_session: '', headline: '', body: '' })
      setAdding(false)
    } finally {
      setSaving(false)
    }
  }

  async function remove(id) {
    await classes.upsells.delete(id)
    setUpsells(u => u.filter(x => x.id !== id))
  }

  async function toggle(u) {
    const r = await classes.upsells.update(u.id, { is_active: !u.is_active })
    setUpsells(us => us.map(x => x.id === u.id ? r.data : x))
  }

  const otherSessions = allSessions.filter(s => s.id !== sessionId)

  return (
    <div>
      {upsells.length === 0 && !adding && (
        <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 12 }}>No upsells configured for this class.</div>
      )}
      {upsells.map(u => (
        <div key={u.id} style={{
          background: 'var(--card, #1a1a1a)', border: '1px solid var(--border, #222)', borderRadius: 8,
          padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{u.headline}</div>
            <div style={{ fontSize: 12, color: 'var(--grey)' }}>→ {u.suggested_session_name}</div>
            {u.body && <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{u.body}</div>}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <span
              onClick={() => toggle(u)}
              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, cursor: 'pointer',
                background: u.is_active ? 'rgba(204,255,0,0.12)' : 'var(--border)',
                color: u.is_active ? 'var(--lime)' : 'var(--grey)' }}
            >{u.is_active ? 'Active' : 'Off'}</span>
            <button className="btn btn-ghost btn-xs" onClick={() => remove(u.id)} style={{ color: 'var(--red)' }}>✕</button>
          </div>
        </div>
      ))}
      {adding ? (
        <form onSubmit={saveNew} style={{ background: 'var(--card, #1a1a1a)', border: '1px solid var(--border, #222)', borderRadius: 8, padding: 14, marginTop: 8 }}>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Suggest this class</label>
            <select style={inputStyle} value={newForm.suggested_session} onChange={e => setNewForm(f => ({ ...f, suggested_session: e.target.value }))} required>
              <option value="">— Select class —</option>
              {otherSessions.map(s => <option key={s.id} value={s.id}>{s.name} ({s.day_of_week_display} {fmt12(s.start_time)})</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Headline</label>
            <input style={inputStyle} placeholder="e.g. Combining this with High Tricks is a great double" value={newForm.headline} onChange={e => setNewForm(f => ({ ...f, headline: e.target.value }))} required />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Body (optional)</label>
            <input style={inputStyle} placeholder="Short description shown to student" value={newForm.body} onChange={e => setNewForm(f => ({ ...f, body: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn btn-ghost btn-sm" onClick={() => setAdding(true)} style={{ marginTop: 4 }}>+ Add upsell</button>
      )}
    </div>
  )
}

export default function AdminClassDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const [cls, setCls] = useState(null)
  const [loading, setLoading] = useState(!isNew)

  useEffect(() => {
    if (!isNew) {
      classes.get(id).then(r => { setCls(r.data); setLoading(false) })
    }
  }, [id, isNew])

  const { data: categoriesData } = useApi(() => categoriesApi.list(), [])
  const { data: allSessionsData } = useApi(() => classes.list(), [])

  const categoryList = categoriesData?.results || categoriesData || []
  const allSessions = allSessionsData?.results || allSessionsData || []

  const [form, setForm] = useState({
    name: '',
    session_type: 'course',
    level: '',
    category: '',
    catchup_cutoff_weeks: '',
    description: '',
    first_timer_headline: '',
    first_timer_body: '',
    is_active: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (cls) {
      setForm({
        name: cls.name || '',
        session_type: cls.session_type || 'course',
        level: cls.level || '',
        category: cls.category || '',
        catchup_cutoff_weeks: cls.catchup_cutoff_weeks ?? '',
        description: cls.description || '',
        first_timer_headline: cls.first_timer_headline || '',
        first_timer_body: cls.first_timer_body || '',
        is_active: cls.is_active ?? true,
      })
    }
  }, [cls])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        category: form.category || null,
        catchup_cutoff_weeks: form.catchup_cutoff_weeks !== '' ? parseInt(form.catchup_cutoff_weeks) : null,
      }
      if (isNew) {
        await classes.create(payload)
      } else {
        await classes.update(id, payload)
      }
      navigate('/admin/classes')
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/admin/classes"
            style={{ color: 'var(--grey)', textDecoration: 'none', fontSize: 20, lineHeight: 1, display: 'flex', alignItems: 'center' }}
          >←</Link>
          <div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: 'var(--white, #fff)' }}>
              {isNew ? 'New Class' : (cls?.name || 'Edit Class')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 2 }}>
              Define the class type, description, and booking rules — scheduling is done in the Timetable.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Active toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: form.is_active ? 'var(--lime)' : 'var(--grey)' }}>
            <div
              onClick={() => set('is_active', !form.is_active)}
              style={{
                width: 40, height: 22, borderRadius: 11,
                background: form.is_active ? 'var(--lime, #ccff00)' : 'var(--border, #333)',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: form.is_active ? 21 : 3,
                width: 16, height: 16, borderRadius: '50%', background: form.is_active ? '#000' : '#666',
                transition: 'left 0.2s',
              }} />
            </div>
            {form.is_active ? 'Active' : 'Inactive'}
          </label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/classes')}>Cancel</button>
          <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Create Class' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red, #e05555)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Class Details */}
      <div style={sectionCard}>
        <div style={sectionTitle}>Class Details</div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Name *</label>
          <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Level 2" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Class Type</label>
            <select style={inputStyle} value={form.session_type} onChange={e => set('session_type', e.target.value)}>
              <option value="course">Course</option>
              <option value="casual">Drop-In</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Level</label>
            <input style={inputStyle} value={form.level} onChange={e => set('level', e.target.value)} placeholder="e.g. Level 2, Specialty" />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Category</label>
          <select style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">— None —</option>
            {categoryList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Catch-up Cutoff (weeks)</label>
          <input
            style={inputStyle}
            type="number"
            min="1"
            value={form.catchup_cutoff_weeks}
            onChange={e => set('catchup_cutoff_weeks', e.target.value)}
            placeholder="Leave blank to allow drop-ins any week"
          />
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 5 }}>
            No catch-up bookings accepted after this many weeks into the season. Leave blank for conditioning/dance classes that allow drop-ins any week.
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={sectionCard}>
        <div style={sectionTitle}>Description</div>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="A short description of this class shown to students…"
          rows={4}
        />
      </div>

      {/* First-timer info */}
      <div style={sectionCard}>
        <div style={sectionTitle}>First-timer Info</div>
        <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16 }}>
          Shown to students booking this class for the first time. Leave blank to show nothing.
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Headline</label>
          <input
            style={inputStyle}
            value={form.first_timer_headline}
            onChange={e => set('first_timer_headline', e.target.value)}
            placeholder="e.g. Everything you need to know before you walk in"
          />
        </div>
        <div>
          <label style={labelStyle}>Body</label>
          <textarea
            style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}
            value={form.first_timer_body}
            onChange={e => set('first_timer_body', e.target.value)}
            placeholder="What to wear, what to bring, what to expect…"
            rows={5}
          />
        </div>
      </div>

      {/* Upsells — edit mode only */}
      {!isNew && cls?.id && (
        <div style={sectionCard}>
          <div style={sectionTitle}>Upsells</div>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16 }}>
            Suggest other classes to students when they book this one.
          </div>
          <UpsellsPanel sessionId={cls.id} allSessions={allSessions} />
        </div>
      )}

      {/* Bottom save button */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingBottom: 40 }}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/admin/classes')}>Cancel</button>
        <button type="submit" className="btn btn-lime" disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Create Class' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
