import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { classes, categories as categoriesApi, studios as studiosApi, seasons as seasonsApi } from '../../api'
import { fmt12 } from '../../utils/time'
import client from '../../api/client'

function TagChipSelector({ selectedIds, onChange }) {
  const [allTags, setAllTags] = useState([])
  useEffect(() => {
    classes.classTags.list().then(r => setAllTags(r.data?.results || r.data || []))
  }, [])

  function toggle(id) {
    if (selectedIds.includes(id)) onChange(selectedIds.filter(x => x !== id))
    else onChange([...selectedIds, id])
  }

  if (allTags.length === 0) {
    return (
      <div style={{ fontSize: 12, color: 'var(--grey)' }}>
        No class tags yet. <Link to="/admin/class-tags" style={{ color: 'var(--lime)' }}>Create tags →</Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {allTags.map(tag => {
        const active = selectedIds.includes(tag.id)
        return (
          <div
            key={tag.id}
            onClick={() => toggle(tag.id)}
            style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', userSelect: 'none',
              background: active ? (tag.colour + '33') : 'transparent',
              color: active ? tag.colour : 'var(--grey)',
              border: `1px solid ${active ? tag.colour : 'var(--border)'}`,
              transition: 'all 0.15s',
            }}
          >
            {tag.name}
          </div>
        )
      })}
    </div>
  )
}

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

// Default what-to-bring text auto-filled for Week 1 first-timer info
const DEFAULT_WHAT_TO_BRING = `What to wear: fitted shorts and a crop top — skin contact with the pole is important, so less is more!

What to bring: grip aid (Dry Hands or Tite Grip are great), a sweat towel, and a water bottle.

What to expect: we'll start with a warm-up, then work through the class content at your own pace. Don't stress if you can't get something straight away — that's what the season is for.

Shoes are optional. Bare feet or heels both work. Any questions before you arrive, just drop us a message.`

function UpsellsPanel({ sessionId, allSessions, sessionName }) {
  const [upsells, setUpsells]   = useState([])
  const [adding, setAdding]     = useState(false)
  const [newForm, setNewForm]   = useState({ suggested_session: '', headline: '', body: '' })
  const [saving, setSaving]     = useState(false)
  const [suggesting, setSuggesting] = useState(false)

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

  async function autoSuggest() {
    setSuggesting(true)
    try {
      const r = await classes.upsells.suggest([sessionId])
      const suggestions = r.data || []
      const filtered = suggestions.filter(s => s.from_category && s.suggested_session)
      if (filtered.length === 0) {
        alert('No category-level upsell suggestions found. Set up upsell targets on the Categories page, or add one manually.')
        return
      }
      for (const s of filtered) {
        const alreadyExists = upsells.some(u => u.suggested_session === s.suggested_session)
        if (!alreadyExists) {
          await classes.upsells.create({
            source_session: sessionId,
            suggested_session: s.suggested_session,
            headline: s.headline,
            body: s.body || '',
          })
        }
      }
      const updated = await classes.upsells.list({ source_session: sessionId })
      setUpsells(updated.data?.results || updated.data || [])
    } finally {
      setSuggesting(false)
    }
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
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}>+ Add upsell</button>
          <button className="btn btn-ghost btn-sm" onClick={autoSuggest} disabled={suggesting} title="Auto-populate from category upsell settings">
            {suggesting ? 'Suggesting…' : '✦ Auto-populate'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function AdminClassDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isNew = !id || id === 'new'

  function goBack() {
    if (location.key !== 'default') {
      navigate(-1)
    } else {
      navigate('/admin/classes')
    }
  }

  const [cls, setCls]         = useState(null)
  const [loading, setLoading] = useState(!isNew)

  useEffect(() => {
    if (!isNew) {
      classes.get(id).then(r => { setCls(r.data); setLoading(false) })
    }
  }, [id, isNew])

  const { data: categoriesData }   = useApi(() => categoriesApi.list(), [])
  const { data: allSessionsData }  = useApi(() => classes.list(), [])
  const { data: studiosData }      = useApi(() => studiosApi.list(), [])
  const { data: seasonsData }      = useApi(() => seasonsApi.list(), [])
  const [instructors, setInstructors] = useState([])
  useEffect(() => {
    client.get('/api/users/?role=instructor').then(r => {
      const users = r.data?.results || r.data || []
      setInstructors(users)
    })
  }, [])

  const categoryList = categoriesData?.results || categoriesData || []
  const allSessions  = allSessionsData?.results || allSessionsData || []
  const studioList   = studiosData?.results || studiosData || []
  const seasonList   = seasonsData?.results || seasonsData || []

  const [form, setForm] = useState({
    name: '',
    session_type: 'course',
    level: '',
    category: '',
    catchup_cutoff_weeks: '',
    description: '',
    first_timer_headline: '',
    first_timer_body: '',
    prerequisites: '',
    skill_level: '',
    is_active: true,
    season: '',
    day_of_week: 0,
    start_time: '18:00',
    duration_minutes: 55,
    capacity: 12,
    instructor: '',
    studio: '',
    price_override: '',
    instructor_fee: '',
    requires_full_payment: false,
    auto_exempt_same_name: true,
    catchup_eligible_names: '',
    tags: [],
  })
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState(null)
  const [aiLoading, setAiLoading]     = useState(null) // 'description' | 'first_timer_body' | null
  const [aiError, setAiError]         = useState(null)
  const [copyFromId, setCopyFromId]   = useState('')

  useEffect(() => {
    if (cls) {
      setForm({
        name:                 cls.name || '',
        session_type:         cls.session_type || 'course',
        level:                cls.level || '',
        category:             cls.category || '',
        catchup_cutoff_weeks: cls.catchup_cutoff_weeks ?? '',
        description:          cls.description || '',
        first_timer_headline: cls.first_timer_headline || '',
        first_timer_body:     cls.first_timer_body || '',
        prerequisites:        cls.prerequisites || '',
        skill_level:          cls.skill_level || '',
        is_active:            cls.is_active ?? true,
        season:               cls.season || '',
        day_of_week:          cls.day_of_week ?? 0,
        start_time:           cls.start_time?.slice(0, 5) || '18:00',
        duration_minutes:     cls.duration_minutes || 55,
        capacity:             cls.capacity || 12,
        instructor:           cls.instructor || '',
        studio:               cls.studio || '',
        price_override:       cls.price_override || '',
        instructor_fee:       cls.instructor_fee || '',
        requires_full_payment: cls.requires_full_payment || false,
        auto_exempt_same_name: cls.auto_exempt_same_name ?? true,
        catchup_eligible_names: cls.catchup_eligible_names || '',
        tags:                 cls.tags || [],
      })
    }
  }, [cls])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function copyFromSession(sessionId) {
    if (!sessionId) { setCopyFromId(''); return }
    const src = allSessions.find(s => String(s.id) === String(sessionId))
    if (!src) return
    setCopyFromId(sessionId)
    setForm(f => ({
      ...f,
      name:                 src.name || f.name,
      description:          src.description || f.description,
      first_timer_headline: src.first_timer_headline || f.first_timer_headline,
      first_timer_body:     src.first_timer_body || f.first_timer_body,
      catchup_cutoff_weeks: src.catchup_cutoff_weeks ?? f.catchup_cutoff_weeks,
      level:                src.level || f.level,
      session_type:         src.session_type || f.session_type,
      duration_minutes:     src.duration_minutes || f.duration_minutes,
      capacity:             src.capacity || f.capacity,
      category:             src.category || f.category,
      prerequisites:        src.prerequisites || f.prerequisites,
      skill_level:          src.skill_level || f.skill_level,
      // Do NOT copy: season, instructor, studio, day_of_week, start_time
    }))
  }

  async function generateWithAI(field) {
    setAiLoading(field)
    setAiError(null)
    try {
      const r = await classes.generateDescription({ name: form.name, level: form.level, field })
      if (r.data?.result) set(field, r.data.result)
    } catch {
      setAiError('AI generation failed — check your API key or try again.')
    } finally {
      setAiLoading(null)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        category:             form.category || null,
        skill_level:          form.skill_level || null,
        catchup_cutoff_weeks: form.catchup_cutoff_weeks !== '' ? parseInt(form.catchup_cutoff_weeks) : null,
        season:               form.season || null,
        instructor:           form.instructor || null,
        studio:               form.studio || null,
        start_time:           form.start_time ? form.start_time + ':00' : null,
        day_of_week:          form.day_of_week,
        duration_minutes:     form.duration_minutes ? parseInt(form.duration_minutes) : null,
        capacity:             form.capacity ? parseInt(form.capacity) : null,
        price_override:       form.price_override !== '' ? parseFloat(form.price_override) : null,
        instructor_fee:       form.instructor_fee !== '' ? parseFloat(form.instructor_fee) : null,
        requires_full_payment: form.requires_full_payment,
        auto_exempt_same_name: form.auto_exempt_same_name,
        catchup_eligible_names: form.catchup_eligible_names,
        tags:                 form.tags,
      }
      if (isNew) {
        await classes.create(payload)
      } else {
        await classes.update(id, payload)
      }
      goBack()
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
          <button
            type="button"
            onClick={goBack}
            style={{ background: 'none', border: 'none', color: 'var(--grey)', textDecoration: 'none', fontSize: 20, lineHeight: 1, display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 0 }}
          >←</button>
          <div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: 'var(--white, #fff)' }}>
              {isNew ? 'New Class' : (cls?.name || 'Edit Class')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 2 }}>
              Class setup — scheduling, descriptions, and booking rules.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: form.is_active ? 'var(--lime)' : 'var(--grey)' }}>
            <div
              onClick={() => set('is_active', !form.is_active)}
              style={{ width: 40, height: 22, borderRadius: 11, background: form.is_active ? 'var(--lime, #ccff00)' : 'var(--border, #333)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              <div style={{ position: 'absolute', top: 3, left: form.is_active ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: form.is_active ? '#000' : '#666', transition: 'left 0.2s' }} />
            </div>
            {form.is_active ? 'Active' : 'Inactive'}
          </label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={goBack}>Cancel</button>
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

      {aiError && (
        <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red, #e05555)', marginBottom: 20 }}>
          {aiError}
        </div>
      )}

      {/* Copy settings from existing class (new only) */}
      {isNew && allSessions.length > 0 && (
        <div style={{ ...sectionCard, borderColor: 'rgba(204,255,0,0.15)' }}>
          <div style={sectionTitle}>Copy settings from</div>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 12 }}>
            Quickly populate this class from an existing one. Scheduling fields (season, instructor, studio, day, time) are left for you to set.
          </div>
          <select
            style={inputStyle}
            value={copyFromId}
            onChange={e => copyFromSession(e.target.value)}
          >
            <option value="">— Select a class to copy from —</option>
            {[...allSessions]
              .sort((a, b) => {
                const nameCompare = (a.name || '').localeCompare(b.name || '')
                if (nameCompare !== 0) return nameCompare
                return (b.season_start_date || '') > (a.season_start_date || '') ? 1 : -1
              })
              .map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.season_name || s.season_detail?.name ? ` — ${s.season_name || s.season_detail?.name}` : ''}
                </option>
              ))
            }
          </select>
          {copyFromId && (
            <div style={{ fontSize: 12, color: 'var(--lime)', marginTop: 8 }}>
              ✓ Settings copied — review and adjust below.
            </div>
          )}
        </div>
      )}

      {/* Scheduling — only shown when editing an existing class */}
      {!isNew && (
        <div style={sectionCard}>
          <div style={sectionTitle}>Scheduling</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Season</label>
              <select style={inputStyle} value={form.season} onChange={e => set('season', e.target.value)}>
                <option value="">— No season —</option>
                {seasonList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Day</label>
              <select style={inputStyle} value={form.day_of_week} onChange={e => set('day_of_week', parseInt(e.target.value))}>
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((d,i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Start Time</label>
              <input style={inputStyle} type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Duration (min)</label>
              <input style={inputStyle} type="number" min="15" max="180" value={form.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Capacity</label>
              <input style={inputStyle} type="number" min="1" value={form.capacity} onChange={e => set('capacity', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Instructor</label>
              <select style={inputStyle} value={form.instructor} onChange={e => set('instructor', e.target.value)}>
                <option value="">— None —</option>
                {instructors.map(i => <option key={i.id} value={i.id}>{i.display_name || i.first_name + ' ' + i.last_name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Studio</label>
              <select style={inputStyle} value={form.studio} onChange={e => {
                set('studio', e.target.value)
                const studio = studioList.find(s => String(s.id) === String(e.target.value))
                if (studio) {
                  const poles = parseInt(studio.poles) || parseInt(studio.capacity) || null
                  if (poles) set('capacity', poles)
                }
              }}>
                <option value="">— None —</option>
                {studioList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Category</label>
            <Link to="/admin/categories" style={{ fontSize: 11, color: 'var(--lime)', textDecoration: 'none' }}>Manage categories →</Link>
          </div>
          <select style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">— None —</option>
            {categoryList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
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
              Leave blank for conditioning/dance classes that allow drop-ins any week.
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Skill Level</label>
              <Link to="/admin/skills" style={{ fontSize: 11, color: 'var(--lime)', textDecoration: 'none' }}>Manage skill lists →</Link>
            </div>
            <input
              style={inputStyle}
              value={form.skill_level}
              onChange={e => set('skill_level', e.target.value)}
              placeholder="e.g. Level 2 (links to skill list)"
            />
            <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 5 }}>
              Associates this class with a skill progression list.
            </div>
          </div>
        </div>
        {/* Prerequisites */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Prerequisites</label>
          <textarea
            style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
            value={form.prerequisites}
            onChange={e => set('prerequisites', e.target.value)}
            placeholder="What students need to know or be able to do before joining this class…"
            rows={3}
          />
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 5 }}>
            Shown to students during booking. Leave blank if there are no prerequisites.
          </div>
        </div>

        {/* Auto-exempt toggle */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div
              onClick={() => set('auto_exempt_same_name', !form.auto_exempt_same_name)}
              style={{ width: 36, height: 20, borderRadius: 10, flexShrink: 0, background: form.auto_exempt_same_name ? 'var(--lime)' : '#333', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: form.auto_exempt_same_name ? 19 : 3, transition: 'left 0.2s' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: form.auto_exempt_same_name ? 'var(--white)' : 'var(--grey)' }}>Auto-exempt enrolled students</div>
              <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>Students already enrolled in a class with the same name bypass the catch-up cutoff.</div>
            </div>
          </label>
        </div>

        {/* Catch-up eligible names */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Catch-up Eligible Classes</label>
          <input
            style={inputStyle}
            value={form.catchup_eligible_names}
            onChange={e => set('catchup_eligible_names', e.target.value)}
            placeholder="e.g. Strip Thursday, Strip Saturday"
          />
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 5 }}>
            Students enrolled in this class can catch up in these classes. If enrolled in 2+ classes, eligibility covers all enrolled classes.
          </div>
        </div>

        {/* Tags */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Tags</label>
            <Link to="/admin/class-tags" style={{ fontSize: 11, color: 'var(--lime)', textDecoration: 'none' }}>Manage tags →</Link>
          </div>
          <TagChipSelector
            selectedIds={form.tags}
            onChange={ids => set('tags', ids)}
          />
        </div>
      </div>

      {/* Pricing & Payment */}
      <div style={sectionCard}>
        <div style={sectionTitle}>Pricing &amp; Payment</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Season Price Override ($)</label>
            <input
              style={inputStyle}
              type="number"
              min="0"
              step="0.01"
              value={form.price_override}
              onChange={e => set('price_override', e.target.value)}
              placeholder="Leave blank for standard ($270)"
            />
            <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 5 }}>
              Overrides the standard season price for this class.
            </div>
          </div>
          <div>
            <label style={labelStyle}>Instructor Fee (per class, $)</label>
            <input
              style={inputStyle}
              type="number"
              min="0"
              step="0.01"
              value={form.instructor_fee}
              onChange={e => set('instructor_fee', e.target.value)}
              placeholder="e.g. 50.00"
            />
            <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 5 }}>
              Amount credited to instructor's account each time this class runs.
            </div>
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <div
            onClick={() => set('requires_full_payment', !form.requires_full_payment)}
            style={{ width: 36, height: 20, borderRadius: 10, flexShrink: 0, background: form.requires_full_payment ? 'var(--lime)' : '#333', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
          >
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: form.requires_full_payment ? 19 : 3, transition: 'left 0.2s' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: form.requires_full_payment ? 'var(--white)' : 'var(--grey)' }}>Require full upfront payment</div>
            <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>Students cannot use a payment plan for this class.</div>
          </div>
        </label>
      </div>

      {/* Description */}
      <div style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={sectionTitle} style={{ marginBottom: 0 }}>Description</div>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            disabled={!form.name || aiLoading === 'description'}
            onClick={() => generateWithAI('description')}
            title="Generate a description using AI based on the class name and level"
            style={{ fontSize: 11, color: 'var(--lime)', borderColor: 'var(--lime)' }}
          >
            {aiLoading === 'description' ? '✦ Generating…' : '✦ Write with AI'}
          </button>
        </div>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Body</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {!form.first_timer_body && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => set('first_timer_body', DEFAULT_WHAT_TO_BRING)}
                  style={{ fontSize: 11 }}
                >
                  Fill default
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                disabled={!form.name || aiLoading === 'first_timer_body'}
                onClick={() => generateWithAI('first_timer_body')}
                style={{ fontSize: 11, color: 'var(--lime)', borderColor: 'var(--lime)' }}
              >
                {aiLoading === 'first_timer_body' ? '✦ Generating…' : '✦ Write with AI'}
              </button>
            </div>
          </div>
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
            Suggest other classes to students when they book this one. Use <b style={{ color: 'var(--white)' }}>✦ Auto-populate</b> to pull suggestions from the category upsell settings.
          </div>
          <UpsellsPanel sessionId={cls.id} allSessions={allSessions} sessionName={cls.name} />
        </div>
      )}

      {/* Bottom save */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingBottom: 40 }}>
        <button type="button" className="btn btn-ghost" onClick={goBack}>Cancel</button>
        <button type="submit" className="btn btn-lime" disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Create Class' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
