import { useState } from 'react'
import '../StudentsPage.css'

const DEFAULTS = [
  {
    id: 1, name: 'The Box', status: 'active',
    address: 'Level 1, 88 Kippax St, Surry Hills NSW 2010',
    capacity: '14 students', poles: '7 × 45mm chrome',
    features: 'Crash mats, mirrors, sound system, AC', kisi: true,
  },
  {
    id: 2, name: 'Rhapsody', status: 'active',
    address: 'Level 1, 88 Kippax St, Surry Hills NSW 2010',
    capacity: '10 students', poles: '5 × 45mm chrome + 1 × brass',
    features: 'Crash mats, mirrors, mood lighting, AC', kisi: true,
  },
]

function RoomModal({ existing, onClose, onSaved }) {
  const [name, setName] = useState(existing?.name || '')
  const [address, setAddress] = useState(existing?.address || '')
  const [capacity, setCapacity] = useState(existing?.capacity || '')
  const [poles, setPoles] = useState(existing?.poles || '')
  const [features, setFeatures] = useState(existing?.features || '')

  function submit(e) {
    e.preventDefault()
    onSaved({ ...existing, name, address, capacity, poles, features })
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 460 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{existing ? 'Edit Room' : 'Add Room'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={submit}>
          <div className="field"><label>Room Name</label><input value={name} onChange={e => setName(e.target.value)} required /></div>
          <div className="field"><label>Address</label><input value={address} onChange={e => setAddress(e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Capacity</label><input value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="14 students" /></div>
            <div className="field"><label>Poles</label><input value={poles} onChange={e => setPoles(e.target.value)} placeholder="7 × 45mm chrome" /></div>
          </div>
          <div className="field"><label>Features</label><input value={features} onChange={e => setFeatures(e.target.value)} placeholder="Crash mats, mirrors, AC" /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminRooms() {
  const [rooms, setRooms] = useState(DEFAULTS)
  const [modal, setModal] = useState(null)

  function handleSaved(r) {
    if (r.id) {
      setRooms(rs => rs.map(x => x.id === r.id ? r : x))
    } else {
      setRooms(rs => [...rs, { ...r, id: Date.now(), status: 'active', kisi: false }])
    }
    setModal(null)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Rooms</div>
          <div className="page-sub">Manage studio spaces, capacity and equipment</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => setModal({ existing: null })}>+ Add Room</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {rooms.map(room => (
          <div key={room.id} className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>{room.name}</div>
              <span className="tag tag-lime">Active</span>
            </div>
            {[
              ['Address', room.address],
              ['Capacity', room.capacity],
              ['Poles', room.poles],
              ['Features', room.features],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #1a1a1a', fontSize: 13 }}>
                <div style={{ width: 90, color: 'var(--grey)', flexShrink: 0 }}>{label}</div>
                <div>{val}</div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #1a1a1a', fontSize: 13 }}>
              <div style={{ width: 90, color: 'var(--grey)', flexShrink: 0 }}>Kisi Access</div>
              <div style={{ color: room.kisi ? 'var(--lime)' : 'var(--grey)' }}>{room.kisi ? 'Connected ✓' : 'Not configured'}</div>
            </div>
            <div style={{ height: 100, background: '#0a0a0a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--grey)', fontSize: 12, cursor: 'pointer', marginTop: 14 }}>
              📷 Add photos
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal({ existing: room })}>Edit</button>
              <button className="btn btn-ghost btn-sm">Kisi Settings</button>
            </div>
          </div>
        ))}
      </div>

      {modal && <RoomModal existing={modal.existing} onClose={() => setModal(null)} onSaved={handleSaved} />}
    </div>
  )
}
