import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { seasons, classes as classesApi } from '../../api'
import '../StudentsPage.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function weeksRemaining(endDate) {
  if (!endDate) return null
  const ms = new Date(endDate + 'T00:00') - new Date()
  if (ms <= 0) return 0
  return Math.ceil(ms / (1000 * 60 * 60 * 24 * 7))
}

function SeasonModal({ season, onClose, onSaved }) {
  const isEdit = !!season
  const [form, setForm] = useState({
    name: season?.name || '',
    start_date: season?.start_date || '',
    end_date: season?.end_date || '',
    status: season?.status || 'upcoming',
    notes: season?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  function set(f, v) { setForm(x => ({ ...x, [f]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = isEdit
        ? await seasons.update(season.id, form)
        : await seasons.create(form)
      onSaved(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 480 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>{isEdit ? 'Edit Season' : 'New Season'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit}>
          {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>}
          <div className="field"><label>Season Name *</label><input value={form.name} onChange={e => set('name', e.target.value)} required autoFocus placeholder="e.g. Season 4" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Start Date *</label><input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} required /></div>
            <div className="field"><label>End Date *</label><input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} required /></div>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="field"><label>Notes</label><textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Season'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SeasonDrawer({ season, onClose, onEdit, onStatusChange }) {
  const { data: sessionsData, loading: loadingSessions } = useApi(
    () => classesApi.list({ season: season.id }),
    [season.id]
  )
  const sessions = sessionsData?.results || sessionsData || []

  const statusCls = { active: 'tag-lime', upcoming: 'tag-lav', completed: 'tag-grey' }
  const wr = weeksRemaining(season.end_date)

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}
      />
      {/* drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: 'var(--card)', borderLeft: '1px solid var(--border)',
        zIndex: 201, display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, marginBottom: 4 }}>{season.name}</div>
            <span className={`tag ${statusCls[season.status] || 'tag-grey'}`} style={{ fontSize: 10 }}>
              {season.status.charAt(0).toUpperCase() + season.status.slice(1)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-ghost btn-xs" onClick={onEdit}>Edit</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '20px 24px', flex: 1 }}>
          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Start', value: formatDate(season.start_date) },
              { label: 'End', value: formatDate(season.end_date) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#111', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
            {[
              { label: 'Classes', value: season.session_count ?? sessions.length, color: 'var(--lime)' },
              { label: 'Enrolled', value: season.enrolled_count ?? '—', color: 'var(--lav)' },
              { label: 'Weeks left', value: season.status === 'completed' ? '—' : (wr ?? '—'), color: 'var(--amber)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#111', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Classes in this season */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', fontWeight: 600, marginBottom: 12 }}>
              Classes in this season
            </div>
            {loadingSessions ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div className="spinner" /></div>
            ) : sessions.length === 0 ? (
              <div style={{ color: 'var(--grey)', fontSize: 13, padding: '12px 0' }}>
                No classes assigned to this season yet. Edit a class in the Timetable to link it here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sessions.map(s => (
                  <div key={s.id} style={{ background: '#111', borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>
                        {DAYS[s.day_of_week]} · {s.start_time?.slice(0, 5)}
                        {s.studio_detail?.name ? ` · ${s.studio_detail.name}` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: s.is_active ? 'var(--lime)' : 'var(--grey)' }}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {season.notes && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', fontWeight: 600, marginBottom: 8 }}>Notes</div>
              <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>{season.notes}</div>
            </div>
          )}

          {/* Status actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            {season.status === 'upcoming' && (
              <button className="btn btn-sm" style={{ background: 'rgba(176,160,255,0.15)', color: 'var(--lav)', border: '1px solid rgba(176,160,255,0.3)' }}
                onClick={() => onStatusChange('active')}>
                Activate Season
              </button>
            )}
            {season.status === 'active' && (
              <button className="btn btn-sm" style={{ background: 'rgba(102,102,102,0.15)', color: 'var(--grey)', border: '1px solid rgba(102,102,102,0.3)' }}
                onClick={() => onStatusChange('completed')}>
                Close Season
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function AdminSeasons() {
  const { data, loading, refetch } = useApi(() => seasons.list())
  const [showModal, setShowModal] = useState(false)
  const [editSeason, setEditSeason] = useState(null)
  const [drawerSeason, setDrawerSeason] = useState(null)
  const [seasonList, setSeasonList] = useState(null)

  const allSeasons = seasonList ?? (data?.results || data || [])

  function handleSaved(saved) {
    if (editSeason) {
      setSeasonList(prev => (prev ?? allSeasons).map(s => s.id === saved.id ? saved : s))
      if (drawerSeason?.id === saved.id) setDrawerSeason(saved)
    } else {
      setSeasonList(prev => [...(prev ?? allSeasons), saved])
    }
  }

  async function handleStatusChange(seasonId, newStatus) {
    const res = await seasons.update(seasonId, { status: newStatus })
    setSeasonList(prev => (prev ?? allSeasons).map(s => s.id === seasonId ? res.data : s))
    setDrawerSeason(res.data)
  }

  const sorted = [...allSeasons].sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
  const statusCls = { active: 'tag-lime', upcoming: 'tag-lav', completed: 'tag-grey' }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Seasons</div>
          <div className="page-sub">Manage season schedules and enrolment windows</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => { setEditSeason(null); setShowModal(true) }}>+ New Season</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : allSeasons.length === 0 ? (
        <div className="empty-state">
          <div style={{ marginBottom: 8 }}>No seasons yet</div>
          <div style={{ fontSize: 12 }}>Create your first season above</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {sorted.map(season => {
            const isActive = season.status === 'active'
            const wr = weeksRemaining(season.end_date)
            return (
              <div
                key={season.id}
                onClick={() => setDrawerSeason(season)}
                style={{
                  background: 'var(--card)',
                  border: `1px solid ${isActive ? 'rgba(204,255,0,0.4)' : 'var(--border)'}`,
                  borderRadius: 14,
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>{season.name}</div>
                  <span className={`tag ${statusCls[season.status] || 'tag-grey'}`} style={{ fontSize: 10 }}>
                    {season.status.charAt(0).toUpperCase() + season.status.slice(1)}
                  </span>
                </div>

                <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                  {formatDate(season.start_date)} → {formatDate(season.end_date)}
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                  {season.session_count != null && (
                    <div style={{ fontSize: 12 }}>
                      <span style={{ color: 'var(--lime)', fontWeight: 700 }}>{season.session_count}</span>
                      <span style={{ color: 'var(--grey)' }}> classes</span>
                    </div>
                  )}
                  {season.enrolled_count != null && (
                    <div style={{ fontSize: 12 }}>
                      <span style={{ color: 'var(--lav)', fontWeight: 700 }}>{season.enrolled_count}</span>
                      <span style={{ color: 'var(--grey)' }}> enrolled</span>
                    </div>
                  )}
                  {isActive && wr != null && (
                    <div style={{ fontSize: 12 }}>
                      <span style={{ color: 'var(--amber)', fontWeight: 700 }}>{wr}</span>
                      <span style={{ color: 'var(--grey)' }}> weeks left</span>
                    </div>
                  )}
                </div>

                {season.notes && (
                  <div style={{ fontSize: 12, color: 'var(--grey)', fontStyle: 'italic' }}>{season.notes}</div>
                )}

                <div style={{ fontSize: 11, color: 'var(--grey)' }}>Click to view details →</div>
              </div>
            )
          })}
        </div>
      )}

      {drawerSeason && (
        <SeasonDrawer
          season={drawerSeason}
          onClose={() => setDrawerSeason(null)}
          onEdit={() => { setEditSeason(drawerSeason); setShowModal(true) }}
          onStatusChange={(status) => handleStatusChange(drawerSeason.id, status)}
        />
      )}

      {showModal && (
        <SeasonModal
          season={editSeason}
          onClose={() => { setShowModal(false); setEditSeason(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
