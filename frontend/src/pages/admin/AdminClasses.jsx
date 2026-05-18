import { useState, useEffect } from 'react'
import { useApi } from '../../hooks/useApi'
import { classes, users, studios } from '../../api'

function WorkshopModal({ w, instructorList, studioList, onSave, onClose }) {
  const [form, setForm] = useState({
    name: w?.name || '', description: w?.description || '',
    date: w?.date || '', start_time: w?.start_time?.slice(0, 5) || '10:00',
    end_time: w?.end_time?.slice(0, 5) || '12:00', price: w?.price || '',
    capacity: w?.capacity || 12, instructor: w?.instructor || '', studio: w?.studio || '',
    is_active: w?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (w?.id) await classes.workshops.update(w.id, form)
      else await classes.workshops.create(form)
      onSave()
    } finally { setSaving(false) }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 500 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{w?.id ? 'Edit' : 'New'} Workshop</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={submit}>
          <div className="field"><label>Name</label><input required value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div className="field"><label>Description</label><textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} style={{ width: '100%', background: 'var(--input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '9px 12px', fontSize: 13, resize: 'vertical' }} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="field"><label>Date</label><input required type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
            <div className="field"><label>Start</label><input required type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} /></div>
            <div className="field"><label>End</label><input required type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Price ($)</label><input required type="number" step="0.01" min="0" value={form.price} onChange={e => set('price', e.target.value)} /></div>
            <div className="field"><label>Capacity</label><input required type="number" min="1" value={form.capacity} onChange={e => set('capacity', parseInt(e.target.value))} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Instructor</label>
              <select value={form.instructor} onChange={e => set('instructor', e.target.value)}>
                <option value="">— none —</option>
                {instructorList.map(i => <option key={i.id} value={i.id}>{i.display_name || i.first_name}</option>)}
              </select>
            </div>
            <div className="field"><label>Studio</label>
              <select value={form.studio} onChange={e => set('studio', e.target.value)}>
                <option value="">— none —</option>
                {studioList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TYPE_LABELS = { course: 'Course', casual: 'Drop-In' }

function UpsellsPanel({ sessionId, allSessions }) {
  const [upsells, setUpsells] = useState([])
  const [adding, setAdding] = useState(false)
  const [newForm, setNewForm] = useState({ suggested_session: '', headline: '', body: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    classes.upsells.list({ source_session: sessionId }).then(r => setUpsells(r.data || []))
  }, [sessionId])

  async function saveNew(e) {
    e.preventDefault()
    if (!newForm.suggested_session || !newForm.headline) return
    setSaving(true)
    try {
      await classes.upsells.create({ source_session: sessionId, ...newForm })
      const r = await classes.upsells.list({ source_session: sessionId })
      setUpsells(r.data || [])
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
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
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
        <form onSubmit={saveNew} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginTop: 8 }}>
          <div style={{ marginBottom: 10 }}>
            <label className="form-label">Suggest this class</label>
            <select className="input" style={{ width: '100%' }} value={newForm.suggested_session} onChange={e => setNewForm(f => ({ ...f, suggested_session: e.target.value }))} required>
              <option value="">— Select class —</option>
              {otherSessions.map(s => <option key={s.id} value={s.id}>{s.name} ({s.day_of_week_display} {s.start_time?.slice(0,5)})</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label className="form-label">Headline</label>
            <input className="input" style={{ width: '100%' }} placeholder="e.g. Combining this with High Tricks is a great double" value={newForm.headline} onChange={e => setNewForm(f => ({ ...f, headline: e.target.value }))} required />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label className="form-label">Body (optional)</label>
            <input className="input" style={{ width: '100%' }} placeholder="Short description shown to student" value={newForm.body} onChange={e => setNewForm(f => ({ ...f, body: e.target.value }))} />
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

function ClassModal({ cls, instructors, studios: studioList, allSessions, onSave, onClose }) {
  const [tab, setTab] = useState('details')
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

  const tabStyle = (t) => ({
    fontSize: 12, fontWeight: 600, padding: '6px 14px', cursor: 'pointer',
    borderBottom: tab === t ? '2px solid var(--lime)' : '2px solid transparent',
    color: tab === t ? 'var(--lime)' : 'var(--grey)',
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{cls?.id ? 'Edit Class' : 'Create Class'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {cls?.id && (
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
            <div style={tabStyle('details')} onClick={() => setTab('details')}>Details</div>
            <div style={tabStyle('upsells')} onClick={() => setTab('upsells')}>Upsells</div>
          </div>
        )}

        {tab === 'details' ? (
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
                  {studioList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : cls?.id ? 'Save Changes' : 'Create Class'}</button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </form>
        ) : (
          <UpsellsPanel sessionId={cls.id} allSessions={allSessions || []} />
        )}
      </div>
    </div>
  )
}

function WorkshopBookingsModal({ workshop, onClose }) {
  const { data, loading } = useApi(() => classes.workshops.bookings(workshop.id), [workshop.id])
  const bookings = data || []
  const confirmed = bookings.filter(b => b.status === 'confirmed')
  const waitlisted = bookings.filter(b => b.status === 'waitlisted')

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 560 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>
            Bookings — {workshop.name}
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : bookings.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--grey)', padding: 32, fontSize: 13 }}>No bookings yet.</div>
          ) : (
            <>
              {confirmed.length > 0 && (
                <>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600, marginBottom: 8 }}>
                    Confirmed ({confirmed.length})
                  </div>
                  <div style={{ background: 'var(--input)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                    {confirmed.map((b, i) => (
                      <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: i < confirmed.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{b.student_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--grey)' }}>{b.student_email}</div>
                        </div>
                        <span className="tag tag-lime" style={{ fontSize: 10 }}>Confirmed</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {waitlisted.length > 0 && (
                <>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600, marginBottom: 8 }}>
                    Waitlist ({waitlisted.length})
                  </div>
                  <div style={{ background: 'var(--input)', borderRadius: 8, overflow: 'hidden' }}>
                    {waitlisted.map((b, i) => (
                      <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: i < waitlisted.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{b.student_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--grey)' }}>{b.student_email}</div>
                        </div>
                        <span className="tag tag-amber" style={{ fontSize: 10 }}>Waitlist</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminClasses() {
  const [tab, setTab] = useState('classes')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [workshopModal, setWorkshopModal] = useState(null)
  const [deletingWorkshop, setDeletingWorkshop] = useState(null)
  const [confirmDeleteWorkshopId, setConfirmDeleteWorkshopId] = useState(null)
  const [bookingsWorkshop, setBookingsWorkshop] = useState(null)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)

  const { data: sessData, loading, refetch } = useApi(() => classes.list(), [])
  const { data: instrData } = useApi(() => users.list({ role: 'instructor' }), [])
  const { data: studioData } = useApi(() => studios.list(), [])
  const { data: workshopsData, loading: loadingWorkshops, refetch: refetchWorkshops } = useApi(() => classes.workshops.list(), [])

  const sessions = sessData?.results || sessData || []
  const instructors = instrData?.results || instrData || []
  const studioList = studioData?.results || studioData || []
  const workshopList = workshopsData?.results || workshopsData || []

  const filtered = sessions.filter(s => {
    const matchType = typeFilter === 'all' || s.session_type === typeFilter
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  async function handleDelete(id) {
    setDeleting(id)
    try {
      await classes.delete(id)
      refetch()
    } finally {
      setDeleting(null)
      setConfirmDeleteId(null)
    }
  }

  async function handleDeleteWorkshop(id) {
    setDeletingWorkshop(id)
    try {
      await classes.workshops.delete(id)
      refetchWorkshops()
    } finally {
      setDeletingWorkshop(null)
      setConfirmDeleteWorkshopId(null)
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
          allSessions={sessions}
          onSave={() => { setModal(null); refetch() }}
          onClose={() => setModal(null)}
        />
      )}
      {workshopModal !== null && (
        <WorkshopModal
          w={workshopModal._new ? null : workshopModal}
          instructorList={instructors}
          studioList={studioList}
          onSave={() => { setWorkshopModal(null); refetchWorkshops() }}
          onClose={() => setWorkshopModal(null)}
        />
      )}
      {bookingsWorkshop && (
        <WorkshopBookingsModal workshop={bookingsWorkshop} onClose={() => setBookingsWorkshop(null)} />
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Classes</div>
          <div className="page-sub">Manage all class types available in your studio</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'classes' && (
            <div style={{ position: 'relative' }}>
              <button className="btn btn-lime btn-sm" onClick={() => setCreateMenuOpen(o => !o)}>
                + Create New Class ▾
              </button>
              {createMenuOpen && (
                <div style={{ position: 'absolute', right: 0, top: 36, background: 'var(--dark)', border: '1px solid var(--border)', borderRadius: 8, minWidth: 200, zIndex: 200, overflow: 'hidden' }}
                  onMouseLeave={() => setCreateMenuOpen(false)}>
                  <div style={{ padding: '10px 16px', fontSize: 13, cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1a1a1a'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                    onClick={() => { setCreateMenuOpen(false); openCreate('course') }}>Create Course Class</div>
                  <div style={{ padding: '10px 16px', fontSize: 13, cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1a1a1a'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                    onClick={() => { setCreateMenuOpen(false); openCreate('casual') }}>Create Drop-In Class</div>
                </div>
              )}
            </div>
          )}
          {tab === 'workshops' && (
            <button className="btn btn-lime btn-sm" onClick={() => setWorkshopModal({ _new: true })}>+ Workshop</button>
          )}
        </div>
      </div>

      <div className="subtabs" style={{ marginBottom: 20 }}>
        {[['classes', 'Recurring Classes'], ['workshops', 'Workshops']].map(([key, label]) => (
          <div key={key} className={`subtab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</div>
        ))}
      </div>

      {tab === 'classes' && (
        <>
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
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Action</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Name of Class</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Cost</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Date Created</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Seq / No.</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--grey)', fontSize: 13 }}>No classes yet.</td></tr>
                  ) : filtered.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-xs" title="View" onClick={() => setModal(s)}>👁</button>
                          <button className="btn btn-ghost btn-xs" title="Edit" onClick={() => setModal(s)}>✏</button>
                          <button className="btn btn-ghost btn-xs" title="Duplicate" onClick={() => { const copy = { ...s, id: undefined, name: s.name + ' (copy)' }; setModal(copy) }}>⧉</button>
                          {confirmDeleteId === s.id ? (
                            <>
                              <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => handleDelete(s.id)} disabled={deleting === s.id}>{deleting === s.id ? '…' : '✓'}</button>
                              <button className="btn btn-ghost btn-xs" onClick={() => setConfirmDeleteId(null)}>✕</button>
                            </>
                          ) : (
                            <button className="btn btn-ghost btn-xs" style={{ color: '#e05555' }} onClick={() => setConfirmDeleteId(s.id)} title="Delete">🗑</button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                        {s.level && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{s.level}</div>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--grey)' }}>
                        {s.price != null ? `$${parseFloat(s.price).toFixed(0)}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`tag ${s.session_type === 'course' ? 'tag-lav' : 'tag-grey'}`} style={{ fontSize: 10 }}>
                          {TYPE_LABELS[s.session_type] || s.session_type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--grey)' }}>
                        {s.created_at ? new Date(s.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--grey)' }}>#{i + 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'workshops' && (
        <>
          {loadingWorkshops ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
          ) : (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Workshop</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Time</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Instructor</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Price</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Spots</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workshopList.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--grey)', fontSize: 13 }}>No workshops yet. Click "+ Workshop" to create one.</td></tr>
                  ) : workshopList.map((w, i) => (
                    <tr key={w.id} style={{ borderBottom: i < workshopList.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{w.name}</div>
                        {!w.is_active && <span className="tag tag-grey" style={{ fontSize: 10, marginTop: 2 }}>Inactive</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--grey)' }}>
                        {w.date ? new Date(w.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--grey)' }}>
                        {w.start_time?.slice(0, 5)} – {w.end_time?.slice(0, 5)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>
                        {w.instructor_detail?.display_name || <span style={{ color: 'var(--grey)' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>${parseFloat(w.price || 0).toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>
                        <span style={{ color: w.spots_left === 0 ? 'var(--red)' : 'inherit' }}>
                          {w.enrolled_count}/{w.capacity}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-xs" onClick={() => setBookingsWorkshop(w)}>Bookings</button>
                          <button className="btn btn-ghost btn-xs" onClick={() => setWorkshopModal(w)}>Edit</button>
                          {confirmDeleteWorkshopId === w.id ? (
                            <>
                              <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => handleDeleteWorkshop(w.id)} disabled={deletingWorkshop === w.id}>{deletingWorkshop === w.id ? '…' : 'Confirm'}</button>
                              <button className="btn btn-ghost btn-xs" onClick={() => setConfirmDeleteWorkshopId(null)}>No</button>
                            </>
                          ) : (
                            <button className="btn btn-ghost btn-xs" onClick={() => setConfirmDeleteWorkshopId(w.id)} style={{ color: 'var(--red)' }}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
