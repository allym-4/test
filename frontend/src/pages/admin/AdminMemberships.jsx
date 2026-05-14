import { useState } from 'react'
import '../StudentsPage.css'
import { useApi } from '../../hooks/useApi'
import { membershipTypes } from '../../api'

function MembershipModal({ existing, onClose, onSaved }) {
  const [name, setName] = useState(existing?.name || '')
  const [price, setPrice] = useState(existing?.price || '')
  const [duration, setDuration] = useState(existing?.duration || '8 weeks')
  const [classesPerWeek, setClassesPerWeek] = useState(existing?.classesPerWeek || '1')
  const [visible, setVisible] = useState(existing?.visible ?? true)
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { name, price: parseFloat(price), duration, classesPerWeek, visible }
      if (existing?.id) {
        await membershipTypes.update(existing.id, payload)
      } else {
        await membershipTypes.create(payload)
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
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminMemberships() {
  const { data, loading, refetch } = useApi(() => membershipTypes.list())
  const memberships = data || []
  const [modal, setModal] = useState(null)

  function handleSaved() {
    setModal(null)
    refetch()
  }

  async function toggleVisible(m) {
    await membershipTypes.update(m.id, { visible: !m.visible })
    refetch()
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
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--grey)' }}>Loading…</div>
        ) : (
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
                    <div onClick={() => toggleVisible(m)} style={{ width: 36, height: 20, borderRadius: 10, background: m.visible ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', display: 'inline-block' }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: m.visible ? 19 : 3, transition: 'left 0.2s' }} />
                    </div>
                  </td>
                  <td><button className="btn btn-ghost btn-xs" onClick={() => setModal({ existing: m })}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && <MembershipModal existing={modal.existing} onClose={() => setModal(null)} onSaved={handleSaved} />}
    </div>
  )
}
