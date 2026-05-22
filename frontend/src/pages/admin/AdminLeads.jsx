import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { leads, users } from '../../api'
import client from '../../api/client'
import '../StudentsPage.css'

const STATUS_TAG = {
  new:          { label: 'New Enquiry',      cls: 'tag-lav' },
  trial_booked: { label: 'Trial Booked',     cls: 'tag-amber' },
  follow_up:    { label: 'Follow-up Needed', cls: 'tag-red' },
  cold:         { label: 'Cold',             cls: 'tag-grey' },
  enrolled:     { label: 'Enrolled',         cls: 'tag-lime' },
}

const SOURCES = ['instagram', 'google', 'referral', 'website', 'walkin', 'other']

function exportCsv(leadList) {
  const headers = ['Name', 'Email', 'Phone', 'Source', 'Status', 'Enquiry Date', 'Last Contact', 'Notes']
  const rows = leadList.map(l => [
    l.name,
    l.email || '',
    l.phone || '',
    l.source,
    STATUS_TAG[l.status]?.label ?? l.status,
    l.created_at ? new Date(l.created_at).toLocaleDateString('en-AU') : '',
    l.last_contact_at ? new Date(l.last_contact_at).toLocaleDateString('en-AU') : '',
    (l.notes || '').replace(/\n/g, ' '),
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'leads.csv'; a.click()
  URL.revokeObjectURL(url)
}

function AddLeadModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', source: 'instagram', status: 'new', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  function set(f, v) { setForm(x => ({ ...x, [f]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await leads.create(form)
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
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>Add Lead</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit}>
          {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Name *</label><input value={form.name} onChange={e => set('name', e.target.value)} required autoFocus /></div>
            <div className="field"><label>Phone</label><input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          </div>
          <div className="field"><label>Email</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Source</label>
              <select value={form.source} onChange={e => set('source', e.target.value)}>
                {SOURCES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(STATUS_TAG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="field"><label>Notes</label><textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Add Lead'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LeadDetailModal({ lead: l, onClose, onUpdated }) {
  const [form, setForm] = useState({ name: l.name, email: l.email || '', phone: l.phone || '', source: l.source, status: l.status, notes: l.notes || '' })
  const [saving, setSaving] = useState(false)
  const [loggingContact, setLoggingContact] = useState(false)
  const [lastContact, setLastContact] = useState(l.last_contact_at)
  const [error, setError] = useState(null)
  function set(f, v) { setForm(x => ({ ...x, [f]: v })) }

  async function handleLogContact() {
    setLoggingContact(true)
    try {
      const res = await leads.logContact(l.id)
      setLastContact(res.data.last_contact_at)
      onUpdated(res.data)
    } catch {}
    finally { setLoggingContact(false) }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await leads.update(l.id, form)
      onUpdated(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(newStatus) {
    try {
      const res = await leads.update(l.id, { status: newStatus })
      onUpdated(res.data)
      setForm(f => ({ ...f, status: newStatus }))
    } catch {}
  }

  const tag = STATUS_TAG[l.status] || STATUS_TAG.new

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 500 }}>
        <div className="sd-header">
          <div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{l.name}</div>
            <div style={{ marginTop: 4 }}><span className={`tag ${tag.cls}`} style={{ fontSize: 10 }}>{tag.label}</span></div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSave}>
          {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {Object.entries(STATUS_TAG).map(([k, v]) => (
              <button key={k} type="button"
                className={`btn btn-xs ${form.status === k ? '' : 'btn-ghost'}`}
                style={form.status === k ? { background: 'var(--lime)', color: '#000' } : {}}
                onClick={() => { set('status', k); handleStatusChange(k) }}
              >{v.label}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Name</label><input value={form.name} onChange={e => set('name', e.target.value)} /></div>
            <div className="field"><label>Phone</label><input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          </div>
          <div className="field"><label>Email</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
          <div className="field">
            <label>Source</label>
            <select value={form.source} onChange={e => set('source', e.target.value)}>
              {SOURCES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="field"><label>Notes</label><textarea rows={4} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
          <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 12 }}>
            Added {new Date(l.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
            {l.assigned_to_name && ` · Assigned to ${l.assigned_to_name}`}
            {lastContact && ` · Last contact: ${new Date(lastContact).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogContact} disabled={loggingContact}>
              {loggingContact ? 'Logging…' : '📞 Log contact'}
            </button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminLeads() {
  const { data, loading, refetch } = useApi(() => leads.list())
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [viewLead, setViewLead] = useState(null)
  const [leadList, setLeadList] = useState(null)

  const allLeads = leadList ?? (data?.results || data || [])

  const counts = { all: allLeads.length }
  for (const s of ['new', 'trial_booked', 'follow_up', 'cold']) {
    counts[s] = allLeads.filter(l => l.status === s).length
  }

  const shown = allLeads.filter(l => {
    const matchFilter = filter === 'all' || l.status === filter
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.email?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  function handleSaved(lead) {
    setLeadList(prev => [...(prev ?? allLeads), lead])
  }

  function handleUpdated(updated) {
    setLeadList(prev => (prev ?? allLeads).map(l => l.id === updated.id ? updated : l))
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Leads</div>
          <div className="page-sub">Enquiries, sign-ups and trial follow-ups</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => exportCsv(allLeads)}>↓ Export</button>
        <button className="btn btn-lime btn-sm" onClick={() => setShowAdd(true)}>+ Add Lead</button>
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        {[['all', 'All'], ['new', 'New Enquiry'], ['trial_booked', 'Trial Booked'], ['follow_up', 'Follow-up'], ['cold', 'Cold']].map(([key, label]) => (
          <span key={key} className={`filter-tag ${filter === key ? 'active-tag' : ''}`} onClick={() => setFilter(key)}>
            {label} {counts[key] > 0 ? `(${counts[key]})` : ''}
          </span>
        ))}
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '8px 12px', fontSize: 13, outline: 'none', width: 260 }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : (
        <div className="tbl-section">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Source</th>
                <th>Enquiry Date</th>
                <th>Status</th>
                <th>Last Contact</th>
                <th>Assigned To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(l => {
                const tag = STATUS_TAG[l.status] || { label: l.status, cls: 'tag-grey' }
                return (
                  <tr key={l.id} className="clickable" onClick={() => setViewLead(l)}>
                    <td><b>{l.name}</b></td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{l.email || '—'}</td>
                    <td style={{ color: 'var(--grey)', fontSize: 12, textTransform: 'capitalize' }}>{l.source}</td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                      {new Date(l.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </td>
                    <td><span className={`tag ${tag.cls}`} style={{ fontSize: 10 }}>{tag.label}</span></td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                      {l.last_contact_at ? new Date(l.last_contact_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                    <td style={{ fontSize: 12 }}>{l.assigned_to_name || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-xs" style={{ marginRight: 4 }} onClick={() => setViewLead(l)}>View</button>
                      {(l.status === 'follow_up' || l.status === 'new') && (
                        <button className="btn btn-lime btn-xs" style={{ marginRight: 4 }} onClick={() => setViewLead(l)}>Follow Up</button>
                      )}
                      {l.status === 'trial_booked' && (
                        <button className="btn btn-lime btn-xs" onClick={async () => {
                          const res = await leads.update(l.id, { status: 'enrolled' })
                          handleUpdated(res.data)
                        }}>Enrol</button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {shown.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--grey)', padding: '32px 0' }}>
                  {allLeads.length === 0 ? 'No leads yet — add your first enquiry above' : 'No leads found'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} onSaved={handleSaved} />}
      {viewLead && <LeadDetailModal lead={viewLead} onClose={() => setViewLead(null)} onUpdated={updated => { handleUpdated(updated); setViewLead(updated) }} />}
    </div>
  )
}
