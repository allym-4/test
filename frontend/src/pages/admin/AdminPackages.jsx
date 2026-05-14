import { useState } from 'react'
import '../StudentsPage.css'

const DEFAULTS = [
  { id: 1, name: 'Class Pass 5×', classes: 5, price: 150, expiry: '90 days', activeStudents: 8, visible: true },
  { id: 2, name: 'Class Pass 10×', classes: 10, price: 280, expiry: '180 days', activeStudents: 5, visible: true },
  { id: 3, name: 'Makeup Package', classes: 3, price: 90, expiry: '60 days', activeStudents: 11, visible: true },
  { id: 4, name: 'Intro Pack', classes: 4, price: 100, expiry: '60 days', activeStudents: 3, visible: true },
  { id: 5, name: 'Pole Icon VIP Pass', classes: 20, price: 500, expiry: '12 months', activeStudents: 2, visible: false },
]

function PackageModal({ existing, onClose, onSaved }) {
  const [name, setName] = useState(existing?.name || '')
  const [classes, setClasses] = useState(existing?.classes || '')
  const [price, setPrice] = useState(existing?.price || '')
  const [expiry, setExpiry] = useState(existing?.expiry || '90 days')
  const [visible, setVisible] = useState(existing?.visible ?? true)

  function submit(e) {
    e.preventDefault()
    onSaved({ ...existing, name, classes: parseInt(classes), price: parseFloat(price), expiry, visible })
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 420 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{existing ? 'Edit Package' : 'Add Package'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={submit}>
          <div className="field"><label>Package Name</label><input value={name} onChange={e => setName(e.target.value)} required /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Classes</label><input type="number" min="1" value={classes} onChange={e => setClasses(e.target.value)} required /></div>
            <div className="field"><label>Price ($)</label><input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} required /></div>
          </div>
          <div className="field"><label>Expiry</label><input value={expiry} onChange={e => setExpiry(e.target.value)} placeholder="90 days / 6 months" /></div>
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

export default function AdminPackages() {
  const [packages, setPackages] = useState(DEFAULTS)
  const [modal, setModal] = useState(null)

  function handleSaved(p) {
    if (p.id) {
      setPackages(ps => ps.map(x => x.id === p.id ? p : x))
    } else {
      setPackages(ps => [...ps, { ...p, id: Date.now(), activeStudents: 0 }])
    }
    setModal(null)
  }

  function toggleVisible(id) {
    setPackages(ps => ps.map(p => p.id === id ? { ...p, visible: !p.visible } : p))
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Packages</div>
          <div className="page-sub">Class packs, punch cards and multi-session bundles</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => setModal({ existing: null })}>+ Add Package</button>
      </div>

      <div className="tbl-section">
        <table>
          <thead><tr><th>Package Name</th><th>Classes</th><th>Price</th><th>Expiry</th><th>Active Students</th><th>Visible</th><th></th></tr></thead>
          <tbody>
            {packages.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>{p.classes}</td>
                <td style={{ color: 'var(--lime)', fontWeight: 600 }}>${p.price}</td>
                <td style={{ color: 'var(--grey)', fontSize: 12 }}>{p.expiry}</td>
                <td>{p.activeStudents}</td>
                <td>
                  <div onClick={() => toggleVisible(p.id)} style={{ width: 36, height: 20, borderRadius: 10, background: p.visible ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', display: 'inline-block' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: p.visible ? 19 : 3, transition: 'left 0.2s' }} />
                  </div>
                </td>
                <td><button className="btn btn-ghost btn-xs" onClick={() => setModal({ existing: p })}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && <PackageModal existing={modal.existing} onClose={() => setModal(null)} onSaved={handleSaved} />}
    </div>
  )
}
