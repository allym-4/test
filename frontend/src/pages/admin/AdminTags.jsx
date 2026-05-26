import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../StudentsPage.css'
import { useApi } from '../../hooks/useApi'
import { tags as tagsApi } from '../../api'

function TagModal({ existing, onClose, onSaved }) {
  const [name, setName] = useState(existing?.name || '')
  const [colour, setColour] = useState(existing?.colour || '#ccff00')
  const [autoRule, setAutoRule] = useState(existing?.auto_rule || 'Manual only')
  const [manual, setManual] = useState(existing?.is_manual ?? true)
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { name, colour, auto_rule: manual ? 'Manual only' : autoRule, is_manual: manual }
      if (existing?.id) {
        await tagsApi.update(existing.id, payload)
      } else {
        await tagsApi.create(payload)
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 420 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{existing ? 'Edit Tag' : 'New Tag'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={submit}>
          <div className="field"><label>Tag Name</label><input value={name} onChange={e => setName(e.target.value)} required /></div>
          <div className="field">
            <label>Colour</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="color" value={colour} onChange={e => setColour(e.target.value)} style={{ width: 40, height: 36, padding: 2, background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }} />
              <span style={{ fontSize: 12, color: 'var(--grey)' }}>{colour}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div onClick={() => setManual(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, background: !manual ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: !manual ? 19 : 3, transition: 'left 0.2s' }} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--grey)' }}>Auto-assign with rule</span>
          </div>
          {!manual && (
            <div className="field"><label>Auto-rule condition</label><input value={autoRule === 'Manual only' ? '' : autoRule} onChange={e => setAutoRule(e.target.value)} placeholder="e.g. No booking in 21 days" /></div>
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

export default function AdminTags() {
  const navigate = useNavigate()
  const { data, loading, refetch } = useApi(() => tagsApi.list())
  const tags = data?.results || data || []
  const [modal, setModal] = useState(null)
  const [autoRemove, setAutoRemove] = useState(true)
  const [notifyAtRisk, setNotifyAtRisk] = useState(true)

  async function handleDelete(id) {
    await tagsApi.delete(id)
    refetch()
  }

  function handleSaved() {
    setModal(null)
    refetch()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Tags</div>
          <div className="page-sub">Organise students with labels and automate tag rules</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => setModal({ existing: null })}>+ New Tag</button>
      </div>

      <div className="tbl-section" style={{ marginBottom: 24 }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--grey)' }}>Loading…</div>
        ) : tags.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--grey)', fontSize: 13 }}>No tags yet — create your first tag above.</div>
        ) : (
          <table>
            <thead><tr><th>Tag</th><th>Colour</th><th>Students</th><th>Auto-rule</th><th></th></tr></thead>
            <tbody>
              {tags.map(tag => (
                <tr key={tag.id}>
                  <td>
                    <span style={{ display: 'inline-block', background: tag.colour + '33', color: tag.colour, fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                      {tag.name}
                    </span>
                  </td>
                  <td><span style={{ display: 'inline-block', width: 16, height: 16, background: tag.colour, borderRadius: 3 }} /></td>
                  <td style={{ fontSize: 12, color: 'var(--grey)' }}>—</td>
                  <td style={{ fontSize: 12, color: tag.is_manual ? 'var(--grey)' : 'inherit' }}>{tag.is_manual ? 'Manual only' : tag.auto_rule}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-xs" style={{ marginRight: 4 }} onClick={() => setModal({ existing: tag })}>Edit</button>
                    <button className="btn btn-ghost btn-xs" onClick={() => navigate(`/admin/students?tag=${tag.id}`)}>View Students</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14 }}>Auto-tag Rules</div>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => setModal({ existing: { name: '', colour: '#ccff00', auto_rule: '', is_manual: false } })}
          >+ Add Rule</button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 14 }}>Tags with rules are applied automatically and updated daily. Manual-only tags must be applied individually.</p>

        {/* Auto-rule tags from the tag list */}
        {tags.filter(t => !t.is_manual && t.auto_rule && t.auto_rule !== 'Manual only').length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {tags.filter(t => !t.is_manual && t.auto_rule && t.auto_rule !== 'Manual only').map(tag => (
              <div key={tag.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'inline-block', background: tag.colour + '33', color: tag.colour, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>{tag.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--grey)' }}>{tag.auto_rule}</span>
                </div>
                <button className="btn btn-ghost btn-xs" onClick={() => setModal({ existing: tag })}>Edit</button>
              </div>
            ))}
          </div>
        )}
        {tags.filter(t => !t.is_manual && t.auto_rule && t.auto_rule !== 'Manual only').length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 16, fontStyle: 'italic' }}>
            No auto-tag rules configured. Use "+ Add Rule" to create one, or enable "Auto-assign with rule" when editing a tag.
          </div>
        )}

        {[
          { label: 'Auto-remove tags when conditions no longer apply', sub: 'e.g. remove "At Risk" if student books again', val: autoRemove, set: setAutoRemove },
          { label: 'Notify admin when a student gains an At Risk tag', sub: '', val: notifyAtRisk, set: setNotifyAtRisk },
        ].map(({ label, sub, val, set }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{label}</div>
              {sub && <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{sub}</div>}
            </div>
            <div onClick={() => set(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, background: val ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: val ? 19 : 3, transition: 'left 0.2s' }} />
            </div>
          </div>
        ))}
      </div>

      {modal && <TagModal existing={modal.existing} onClose={() => setModal(null)} onSaved={handleSaved} />}
    </div>
  )
}
