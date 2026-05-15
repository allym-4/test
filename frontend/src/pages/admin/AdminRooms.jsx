import { useState, useRef } from 'react'
import '../StudentsPage.css'
import { useApi } from '../../hooks/useApi'
import { studios } from '../../api'

function RoomModal({ existing, onClose, onSaved }) {
  const [name, setName] = useState(existing?.name || '')
  const [address, setAddress] = useState(existing?.address || '')
  const [capacity, setCapacity] = useState(existing?.capacity || '')
  const [poles, setPoles] = useState(existing?.poles || '')
  const [features, setFeatures] = useState(existing?.features || '')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { name, address, capacity, poles, features }
      if (existing?.id) {
        await studios.update(existing.id, payload)
      } else {
        await studios.create(payload)
      }
      onSaved()
    } finally {
      setSaving(false)
    }
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
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminRooms() {
  const { data, loading, refetch } = useApi(() => studios.list())
  const rooms = data?.results || data || []
  const [modal, setModal] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(null)
  const photoRefs = useRef({})

  function handleSaved() {
    setModal(null)
    refetch()
  }

  async function handlePhotoChange(room, file) {
    if (!file) return
    setUploadingPhoto(room.id)
    try {
      await studios.uploadPhoto(room.id, file)
      refetch()
    } finally {
      setUploadingPhoto(null)
    }
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

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--grey)' }}>Loading…</div>
      ) : (
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
              <div
                style={{ height: 100, background: '#0a0a0a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--grey)', fontSize: 12, cursor: 'pointer', marginTop: 14, overflow: 'hidden', position: 'relative' }}
                onClick={() => photoRefs.current[room.id]?.click()}
              >
                {room.photo
                  ? <img src={room.photo} alt={room.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : uploadingPhoto === room.id ? 'Uploading…' : '📷 Add photo'
                }
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  ref={el => photoRefs.current[room.id] = el}
                  onChange={e => handlePhotoChange(room, e.target.files[0])}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setModal({ existing: room })}>Edit</button>
                <button className="btn btn-ghost btn-sm">Kisi Settings</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <RoomModal existing={modal.existing} onClose={() => setModal(null)} onSaved={handleSaved} />}
    </div>
  )
}
