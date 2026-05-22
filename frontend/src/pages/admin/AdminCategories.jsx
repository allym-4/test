import { useState, useEffect } from 'react'
import '../StudentsPage.css'
import { useApi } from '../../hooks/useApi'
import { categories as categoriesApi, classes as sessionsApi } from '../../api'

function CategoryModal({ existing, onClose, onSaved }) {
  const [name, setName] = useState(existing?.name || '')
  const [colour, setColour] = useState(existing?.colour || '#ccff00')
  const [visible, setVisible] = useState(existing?.is_visible ?? true)
  const [isAddonType, setIsAddonType] = useState(existing?.is_addon_type ?? false)
  const [standalonePrice, setStandalonePrice] = useState(existing?.standalone_price ?? '')
  const [saving, setSaving] = useState(false)
  const [allSessions, setAllSessions] = useState([])
  const [selectedSessionIds, setSelectedSessionIds] = useState(new Set(existing?.session_ids || []))

  useEffect(() => {
    sessionsApi.list({ is_active: true }).then(res => {
      setAllSessions(res.data?.results || res.data || [])
    }).catch(() => {})
  }, [])

  function toggleSession(id) {
    setSelectedSessionIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name,
        colour,
        is_visible: visible,
        is_addon_type: isAddonType,
        standalone_price: standalonePrice !== '' ? standalonePrice : null,
      }
      let catId = existing?.id
      if (catId) {
        await categoriesApi.update(catId, payload)
      } else {
        const res = await categoriesApi.create(payload)
        catId = res.data.id
      }

      // Assign selected sessions to this category; deassign unselected ones that previously had it
      const prevIds = new Set(existing?.session_ids || [])
      const toAssign = [...selectedSessionIds].filter(id => !prevIds.has(id))
      const toRemove = [...prevIds].filter(id => !selectedSessionIds.has(id))
      await Promise.all([
        ...toAssign.map(id => sessionsApi.update(id, { category: catId })),
        ...toRemove.map(id => sessionsApi.update(id, { category: null })),
      ])

      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 400 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{existing ? 'Edit Category' : 'Add Category'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={submit}>
          <div className="field"><label>Name</label><input value={name} onChange={e => setName(e.target.value)} required /></div>
          <div className="field">
            <label>Colour</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="color" value={colour} onChange={e => setColour(e.target.value)} style={{ width: 40, height: 36, padding: 2, background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }} />
              <span style={{ fontSize: 12, color: 'var(--grey)' }}>{colour}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div onClick={() => setVisible(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, background: visible ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: visible ? 19 : 3, transition: 'left 0.2s' }} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--grey)' }}>Visible to students</span>
          </div>
          <div className="field">
            <label>Season base price ($) <span style={{ fontSize: 11, color: 'var(--grey)', fontWeight: 400 }}>— leave blank to use studio default</span></label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 240 for Kiki/Unravel"
              value={standalonePrice}
              onChange={e => setStandalonePrice(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <input
              type="checkbox"
              id="is_addon_type"
              checked={isAddonType}
              onChange={e => setIsAddonType(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <label htmlFor="is_addon_type" style={{ fontSize: 13, color: 'var(--grey)', cursor: 'pointer', margin: 0 }}>Add-on type class (e.g. Kiki, Unravel)</label>
          </div>

          {allSessions.length > 0 && (
            <div className="field">
              <label>Classes in this category <span style={{ fontSize: 11, color: 'var(--grey)', fontWeight: 400 }}>— select all that apply</span></label>
              <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 0' }}>
                {allSessions.map(s => (
                  <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={selectedSessionIds.has(s.id)}
                      onChange={() => toggleSession(s.id)}
                      style={{ width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }}
                    />
                    <span>{s.name}</span>
                    {s.day_of_week_display && <span style={{ fontSize: 11, color: 'var(--grey)', marginLeft: 'auto' }}>{s.day_of_week_display}</span>}
                  </label>
                ))}
              </div>
              {selectedSessionIds.size > 0 && (
                <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 6 }}>{selectedSessionIds.size} class{selectedSessionIds.size !== 1 ? 'es' : ''} selected</div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminCategories() {
  const { data, loading, refetch } = useApi(() => categoriesApi.list())
  const categories = data?.results || data || []
  const [modal, setModal] = useState(null)
  const [deleting, setDeleting] = useState(null)

  function handleSaved() {
    setModal(null)
    refetch()
  }

  async function toggleVisible(cat) {
    await categoriesApi.update(cat.id, { is_visible: !cat.is_visible })
    refetch()
  }

  async function handleDelete(cat) {
    if (!confirm(`Delete "${cat.name}"? This cannot be undone.`)) return
    setDeleting(cat.id)
    try {
      await categoriesApi.delete(cat.id)
      refetch()
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Categories</div>
          <div className="page-sub">Organise your class types and offerings</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => setModal({ existing: null })}>+ Add Category</button>
      </div>

      <div className="tbl-section">
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--grey)' }}>Loading…</div>
        ) : (
          <table>
            <thead><tr><th>Category</th><th>Colour</th><th>Classes</th><th>Visible to Students</th><th></th></tr></thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id}>
                  <td style={{ fontWeight: 600 }}>{cat.name}</td>
                  <td><span style={{ display: 'inline-block', width: 16, height: 16, background: cat.colour, borderRadius: 3 }} /></td>
                  <td style={{ color: 'var(--grey)', fontSize: 12 }}>{cat.session_ids?.length || 0} class{cat.session_ids?.length !== 1 ? 'es' : ''}</td>
                  <td>
                    <div onClick={() => toggleVisible(cat)} style={{ width: 36, height: 20, borderRadius: 10, background: cat.is_visible ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', display: 'inline-block' }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: cat.is_visible ? 19 : 3, transition: 'left 0.2s' }} />
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-xs" onClick={() => setModal({ existing: cat })}>Edit</button>
                      <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} disabled={deleting === cat.id} onClick={() => handleDelete(cat)}>{deleting === cat.id ? '…' : 'Delete'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && <CategoryModal existing={modal.existing} onClose={() => setModal(null)} onSaved={handleSaved} />}
    </div>
  )
}
