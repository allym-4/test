import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { seasons } from '../../api'

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

// Convert ISO datetime to datetime-local input value
function isoToLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Convert a local datetime-local input value to ISO string
function localInputToISO(val) {
  if (!val) return null
  return new Date(val).toISOString()
}

function calcEndDate(startDate, weeks) {
  if (!startDate || !weeks) return ''
  const d = new Date(startDate + 'T00:00')
  const dayOfWeek = d.getDay()
  const daysToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const mon = new Date(d)
  mon.setDate(d.getDate() + daysToMon)
  const end = new Date(mon)
  end.setDate(mon.getDate() + weeks * 7 - 1)
  return end.toISOString().slice(0, 10)
}

function ordinalLabel(n) {
  const s = parseInt(n)
  if (isNaN(s)) return `${n}`
  return s === 2 ? '2nd' : s === 3 ? '3rd' : `${s}th`
}

export default function AdminSeasonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const [season, setSeason] = useState(null)
  const [loadingData, setLoadingData] = useState(!isNew)

  const [form, setForm] = useState({
    name: '',
    start_date: '',
    weeks: 8,
    status: 'upcoming',
    go_live_at: '',
    notes: '',
  })

  // Discount tiers: array of { pos, amt }
  const [tiers, setTiers] = useState([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [archiving, setArchiving] = useState(false)

  useEffect(() => {
    if (!isNew) {
      seasons.get(id).then(r => {
        const s = r.data
        setSeason(s)
        const existingWeeks = s.start_date && s.end_date
          ? Math.round((new Date(s.end_date + 'T00:00') - new Date(s.start_date + 'T00:00')) / (7 * 86400000) + 1 / 7)
          : 8
        setForm({
          name: s.name || '',
          start_date: s.start_date || '',
          weeks: Math.round(existingWeeks),
          status: s.status || 'upcoming',
          go_live_at: s.go_live_at ? isoToLocalInput(s.go_live_at) : '',
          notes: s.notes || '',
        })
        const t = s.discount_tiers || {}
        if (Object.keys(t).length > 0) {
          setTiers(
            Object.entries(t)
              .map(([pos, amt]) => ({ pos: String(pos), amt: String(amt) }))
              .sort((a, b) => parseInt(a.pos) - parseInt(b.pos))
          )
        }
        setLoadingData(false)
      }).catch(() => setLoadingData(false))
    }
  }, [id, isNew])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const endDate = calcEndDate(form.start_date, form.weeks)

  function addTierRow() {
    const maxPos = tiers.reduce((m, r) => Math.max(m, parseInt(r.pos) || 1), 1)
    setTiers(prev => [...prev, { pos: String(maxPos + 1), amt: '' }])
  }

  function removeTierRow(i) {
    setTiers(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateTierRow(i, field, val) {
    setTiers(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!endDate) { setError('Pick a start date and number of weeks.'); return }
    setSaving(true)
    setError(null)
    try {
      // Build discount_tiers object
      const discount_tiers = {}
      tiers.forEach(r => {
        if (r.pos && r.amt !== '') discount_tiers[r.pos] = parseFloat(r.amt)
      })

      const payload = {
        name: form.name,
        start_date: form.start_date,
        end_date: endDate,
        status: form.status,
        go_live_at: form.go_live_at ? localInputToISO(form.go_live_at) : null,
        notes: form.notes,
        discount_tiers,
      }

      if (isNew) {
        await seasons.create(payload)
      } else {
        await seasons.update(id, payload)
      }
      navigate('/admin/seasons')
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed')
      setSaving(false)
    }
  }

  async function handleArchive() {
    setArchiving(true)
    try {
      await seasons.archive(id)
      navigate('/admin/seasons')
    } finally {
      setArchiving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await seasons.delete(id)
      navigate('/admin/seasons')
    } finally {
      setDeleting(false)
    }
  }

  if (loadingData) {
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
            to="/admin/seasons"
            style={{ color: 'var(--grey)', textDecoration: 'none', fontSize: 20, lineHeight: 1, display: 'flex', alignItems: 'center' }}
          >←</Link>
          <div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: 'var(--white, #fff)' }}>
              {isNew ? 'New Season' : (season?.name || 'Edit Season')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 2 }}>
              {isNew ? 'Create a new season' : 'Edit season details and booking settings'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/seasons')}>Cancel</button>
          <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Create Season' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red, #e05555)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Section 1: Season Details */}
      <div style={sectionCard}>
        <div style={sectionTitle}>Season Details</div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Season Name *</label>
          <input
            style={inputStyle}
            value={form.name}
            onChange={e => set('name', e.target.value)}
            required
            placeholder="e.g. Season 4"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Start Date *</label>
            <input
              style={inputStyle}
              type="date"
              value={form.start_date}
              onChange={e => set('start_date', e.target.value)}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Duration</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                style={{ ...inputStyle, width: 80, textAlign: 'center' }}
                type="number"
                min={1}
                max={52}
                value={form.weeks}
                onChange={e => set('weeks', parseInt(e.target.value) || 8)}
              />
              <span style={{ fontSize: 13, color: 'var(--grey)', whiteSpace: 'nowrap' }}>weeks</span>
            </div>
          </div>
        </div>

        {endDate && (
          <div style={{ padding: '10px 14px', background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 8, fontSize: 13 }}>
            End date:{' '}
            <span style={{ color: '#ccff00', fontWeight: 700 }}>
              {new Date(endDate + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span style={{ color: 'var(--grey)', marginLeft: 8 }}>({form.weeks} weeks, Mon–Sun)</span>
          </div>
        )}
      </div>

      {/* Section 2: Bookings */}
      <div style={sectionCard}>
        <div style={sectionTitle}>Bookings</div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Go-live date &amp; time</label>
          <input
            style={{ ...inputStyle, colorScheme: 'dark' }}
            type="datetime-local"
            value={form.go_live_at}
            onChange={e => set('go_live_at', e.target.value)}
          />
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 5 }}>
            Schedule when season bookings open automatically (8am Sydney time). Leave blank to open manually.
          </div>
        </div>

        <div>
          <label style={labelStyle}>Notes</label>
          <textarea
            style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            placeholder="Optional internal notes…"
          />
        </div>
      </div>

      {/* Section 3: Incremental Pricing */}
      <div style={sectionCard}>
        <div style={sectionTitle}>Incremental Pricing</div>
        <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16, lineHeight: 1.6 }}>
          Students pay the difference when adding classes — e.g. adding a 3rd class costs the 3rd-class tier price minus the 2nd-class tier price. Set dollar discounts off the base class price for each additional class enrolled. Leave blank to use studio defaults.
        </div>

        {tiers.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--grey)', fontStyle: 'italic', marginBottom: 12 }}>
            No custom tiers set — using studio default discount structure.
          </div>
        )}

        {tiers.map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <div style={{ flexShrink: 0 }}>
              <select
                value={row.pos}
                onChange={e => updateTierRow(i, 'pos', e.target.value)}
                style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 6, color: '#fff', fontSize: 12, padding: '5px 8px' }}
              >
                {[2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{ordinalLabel(n)} class</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
              <span style={{ fontSize: 12, color: 'var(--grey)' }}>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={row.amt}
                onChange={e => updateTierRow(i, 'amt', e.target.value)}
                placeholder="discount off"
                style={{ flex: 1, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: '#fff', fontSize: 12 }}
              />
              <span style={{ fontSize: 11, color: 'var(--grey)' }}>off</span>
            </div>
            <button
              type="button"
              onClick={() => removeTierRow(i)}
              style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}
            >✕</button>
          </div>
        ))}

        <button
          type="button"
          onClick={addTierRow}
          style={{ background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.2)', borderRadius: 6, color: 'var(--lime)', fontSize: 12, padding: '5px 14px', cursor: 'pointer', marginTop: 4 }}
        >
          + Add row
        </button>
      </div>

      {/* Section 4: Danger Zone — edit mode only */}
      {!isNew && (
        <div style={{ ...sectionCard, borderColor: 'rgba(255,68,68,0.2)' }}>
          <div style={{ ...sectionTitle, color: 'var(--red, #e05555)' }}>Danger Zone</div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--grey)', borderColor: 'var(--border)' }}
              onClick={handleArchive}
              disabled={archiving}
            >
              {archiving ? '…' : season?.archived ? 'Unarchive Season' : 'Archive Season'}
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }}
                onClick={() => setConfirmDelete(true)}
              >
                Delete Season
              </button>
            ) : (
              <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: 8, padding: '12px 14px', flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--red)' }}>Permanently delete this season?</div>
                <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10 }}>
                  This cannot be undone. All classes and enrolments linked to this season will also be removed.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: 'rgba(255,68,68,0.15)', color: 'var(--red)', border: '1px solid rgba(255,68,68,0.3)' }}
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom save button */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingBottom: 40 }}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/admin/seasons')}>Cancel</button>
        <button type="submit" className="btn btn-lime" disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Create Season' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
