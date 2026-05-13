import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { seasons } from '../../api'
import '../StudentsPage.css'

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

export default function AdminSeasons() {
  const { data, loading, refetch } = useApi(() => seasons.list())
  const [showModal, setShowModal] = useState(false)
  const [editSeason, setEditSeason] = useState(null)
  const [seasonList, setSeasonList] = useState(null)

  const allSeasons = seasonList ?? (data?.results || data || [])

  function handleSaved(saved) {
    if (editSeason) {
      setSeasonList(prev => (prev ?? allSeasons).map(s => s.id === saved.id ? saved : s))
    } else {
      setSeasonList(prev => [...(prev ?? allSeasons), saved])
    }
  }

  const sorted = [...allSeasons].sort((a, b) => new Date(b.start_date) - new Date(a.start_date))

  const statusCls = { active: 'tag-lime', upcoming: 'tag-lav', completed: 'tag-grey' }

  function formatDate(d) {
    if (!d) return '—'
    return new Date(d + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

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
            const isUpcoming = season.status === 'upcoming'
            return (
              <div key={season.id} style={{
                background: 'var(--card)',
                border: `1px solid ${isActive ? 'rgba(204,255,0,0.4)' : 'var(--border)'}`,
                borderRadius: 14,
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>{season.name}</div>
                  <span className={`tag ${statusCls[season.status] || 'tag-grey'}`} style={{ fontSize: 10 }}>
                    {season.status.charAt(0).toUpperCase() + season.status.slice(1)}
                  </span>
                </div>

                <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                  {formatDate(season.start_date)} → {formatDate(season.end_date)}
                </div>

                {season.notes && (
                  <div style={{ fontSize: 12, color: 'var(--grey)', fontStyle: 'italic' }}>{season.notes}</div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-xs" onClick={() => { setEditSeason(season); setShowModal(true) }}>Edit Season</button>
                  {isUpcoming && (
                    <button className="btn btn-xs" style={{ background: 'rgba(176,160,255,0.15)', color: 'var(--lav)', border: '1px solid rgba(176,160,255,0.3)' }}
                      onClick={async () => {
                        const res = await seasons.update(season.id, { status: 'active' })
                        setSeasonList(prev => (prev ?? allSeasons).map(s => s.id === season.id ? res.data : s))
                      }}>
                      Activate
                    </button>
                  )}
                  {isActive && (
                    <button className="btn btn-xs" style={{ background: 'rgba(102,102,102,0.15)', color: 'var(--grey)', border: '1px solid rgba(102,102,102,0.3)' }}
                      onClick={async () => {
                        const res = await seasons.update(season.id, { status: 'completed' })
                        setSeasonList(prev => (prev ?? allSeasons).map(s => s.id === season.id ? res.data : s))
                      }}>
                      Close Season
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
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
