import { useState } from 'react'
import '../StudentsPage.css'

const DEFAULTS = [
  { id: 1, name: 'Pole', colour: '#b0a0ff', classes: 'Level 1, Level 2, Level 3, High Tricks', visible: true },
  { id: 2, name: 'Sensual / Exotic', colour: '#ffaa00', classes: 'Dance, Strip Virgin', visible: true },
  { id: 3, name: 'Practice', colour: '#ccff00', classes: 'Practice Time, Open Studio', visible: true },
  { id: 4, name: 'Workshop', colour: '#5ecc7b', classes: 'Guest workshops, Intensives', visible: true },
  { id: 5, name: 'Aerial', colour: '#e05555', classes: '(none yet)', visible: false },
]

function CategoryModal({ existing, onClose, onSaved }) {
  const [name, setName] = useState(existing?.name || '')
  const [colour, setColour] = useState(existing?.colour || '#ccff00')
  const [visible, setVisible] = useState(existing?.visible ?? true)

  function submit(e) {
    e.preventDefault()
    onSaved({ ...existing, name, colour, visible })
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
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminCategories() {
  const [categories, setCategories] = useState(DEFAULTS)
  const [modal, setModal] = useState(null)

  function handleSaved(cat) {
    if (cat.id) {
      setCategories(cs => cs.map(c => c.id === cat.id ? cat : c))
    } else {
      setCategories(cs => [...cs, { ...cat, id: Date.now() }])
    }
    setModal(null)
  }

  function toggleVisible(id) {
    setCategories(cs => cs.map(c => c.id === id ? { ...c, visible: !c.visible } : c))
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
        <table>
          <thead><tr><th>Category</th><th>Colour</th><th>Classes</th><th>Visible to Students</th><th></th></tr></thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id}>
                <td style={{ fontWeight: 600 }}>{cat.name}</td>
                <td><span style={{ display: 'inline-block', width: 16, height: 16, background: cat.colour, borderRadius: 3 }} /></td>
                <td style={{ color: 'var(--grey)', fontSize: 12 }}>{cat.classes}</td>
                <td>
                  <div onClick={() => toggleVisible(cat.id)} style={{ width: 36, height: 20, borderRadius: 10, background: cat.visible ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', display: 'inline-block' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: cat.visible ? 19 : 3, transition: 'left 0.2s' }} />
                  </div>
                </td>
                <td><button className="btn btn-ghost btn-xs" onClick={() => setModal({ existing: cat })}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && <CategoryModal existing={modal.existing} onClose={() => setModal(null)} onSaved={handleSaved} />}
    </div>
  )
}
