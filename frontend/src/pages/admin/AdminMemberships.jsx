import { useState } from 'react'
import '../StudentsPage.css'

const DEFAULTS = [
  { id: 1, name: 'Season — 1 class/wk', price: 160, duration: '8 weeks', classesPerWeek: '1', activeStudents: 34, visible: true },
  { id: 2, name: 'Season — 2 classes/wk', price: 290, duration: '8 weeks', classesPerWeek: '2', activeStudents: 18, visible: true },
  { id: 3, name: 'Season — 3 classes/wk', price: 390, duration: '8 weeks', classesPerWeek: '3', activeStudents: 6, visible: true },
  { id: 4, name: 'Trial Class', price: 35, duration: 'Single', classesPerWeek: '—', activeStudents: 12, visible: true },
  { id: 5, name: 'Drop-in', price: 40, duration: 'Single', classesPerWeek: '—', activeStudents: 14, visible: true },
  { id: 6, name: 'Casual Practice', price: 20, duration: 'Single', classesPerWeek: '—', activeStudents: 9, visible: true },
]

function MembershipModal({ existing, onClose, onSaved }) {
  const [name, setName] = useState(existing?.name || '')
  const [price, setPrice] = useState(existing?.price || '')
  const [duration, setDuration] = useState(existing?.duration || '8 weeks')
  const [classesPerWeek, setClassesPerWeek] = useState(existing?.classesPerWeek || '1')
  const [visible, setVisible] = useState(existing?.visible ?? true)

  function submit(e) {
    e.preventDefault()
    onSaved({ ...existing, name, price: parseFloat(price), duration, classesPerWeek, visible })
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 420 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{existing ? 'Edit Membership' : 'Add Membership Type'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={submit}>
          <div className="field"><label>Name</label><input value={name} onChange={e => setName(e.target.value)} required /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Price ($)</label><input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} required /></div>
            <div className="field"><label>Duration</label><input value={duration} onChange={e => setDuration(e.target.value)} placeholder="8 weeks / Single" /></div>
          </div>
          <div className="field"><label>Classes / Week</label><input value={classesPerWeek} onChange={e => setClassesPerWeek(e.target.value)} placeholder="1, 2, 3, or —" /></div>
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

export default function AdminMemberships() {
  const [memberships, setMemberships] = useState(DEFAULTS)
  const [modal, setModal] = useState(null)

  function handleSaved(m) {
    if (m.id) {
      setMemberships(ms => ms.map(x => x.id === m.id ? m : x))
    } else {
      setMemberships(ms => [...ms, { ...m, id: Date.now(), activeStudents: 0 }])
    }
    setModal(null)
  }

  function toggleVisible(id) {
    setMemberships(ms => ms.map(m => m.id === id ? { ...m, visible: !m.visible } : m))
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Memberships</div>
          <div className="page-sub">Season enrolments, recurring and drop-in pricing</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => setModal({ existing: null })}>+ Add Type</button>
      </div>

      <div className="tbl-section">
        <table>
          <thead><tr><th>Membership Type</th><th>Price</th><th>Duration</th><th>Classes / Week</th><th>Active Students</th><th>Visible</th><th></th></tr></thead>
          <tbody>
            {memberships.map(m => (
              <tr key={m.id}>
                <td style={{ fontWeight: 600 }}>{m.name}</td>
                <td style={{ color: 'var(--lime)', fontWeight: 600 }}>${m.price}</td>
                <td style={{ color: 'var(--grey)', fontSize: 12 }}>{m.duration}</td>
                <td style={{ color: 'var(--grey)', fontSize: 12 }}>{m.classesPerWeek}</td>
                <td>{m.activeStudents}</td>
                <td>
                  <div onClick={() => toggleVisible(m.id)} style={{ width: 36, height: 20, borderRadius: 10, background: m.visible ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', display: 'inline-block' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: m.visible ? 19 : 3, transition: 'left 0.2s' }} />
                  </div>
                </td>
                <td><button className="btn btn-ghost btn-xs" onClick={() => setModal({ existing: m })}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && <MembershipModal existing={modal.existing} onClose={() => setModal(null)} onSaved={handleSaved} />}
    </div>
  )
}
