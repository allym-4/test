import { useState } from 'react'
import '../StudentsPage.css'

const MEDIA_ITEMS = [
  { id: 1, type: 'video', icon: '🎬', name: 'Fireman Spin Tutorial', level: 'Level 1', size: '42 MB' },
  { id: 2, type: 'video', icon: '🎬', name: 'Body Wave Breakdown', level: 'Level 2', size: '38 MB' },
  { id: 3, type: 'image', icon: '🖼', name: 'Grip Technique Guide', level: 'Level 1', size: '2.1 MB' },
  { id: 4, type: 'pdf', icon: '📄', name: 'Level 3 Skill Checklist', level: 'Level 3', size: '340 KB' },
  { id: 5, type: 'video', icon: '🎬', name: 'Invert Entry Drill', level: 'Level 3', size: '55 MB' },
  { id: 6, type: 'video', icon: '🎬', name: 'Pole Hold Fundamentals', level: 'Level 1', size: '28 MB' },
  { id: 7, type: 'pdf', icon: '📄', name: 'Season 4 Waiver', level: 'All', size: '120 KB' },
  { id: 8, type: 'image', icon: '🖼', name: 'High Trick Spotting Guide', level: 'High Tricks', size: '3.4 MB' },
]

export default function AdminMediaLibrary() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [levelFilter, setLevelFilter] = useState('All levels')

  const filtered = MEDIA_ITEMS.filter(m => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter !== 'All types' && m.type !== typeFilter.toLowerCase()) return false
    if (levelFilter !== 'All levels' && m.level !== levelFilter) return false
    return true
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Media Library</div>
          <div className="page-sub">Videos, images and resources for classes and homework</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm">↑ URL</button>
          <button className="btn btn-lime btn-sm">↑ Upload</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search media…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', fontFamily: 'inherit', fontSize: 13, padding: '8px 14px' }}
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', fontFamily: 'inherit', fontSize: 13, padding: '8px 12px' }}>
          {['All types', 'Video', 'Image', 'PDF'].map(o => <option key={o}>{o}</option>)}
        </select>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', fontFamily: 'inherit', fontSize: 13, padding: '8px 12px' }}>
          {['All levels', 'Level 1', 'Level 2', 'Level 3', 'High Tricks', 'All'].map(o => <option key={o}>{o}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">No media found</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {filtered.map(m => (
            <div key={m.id} style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', cursor: 'pointer' }}>
              <div style={{ height: 100, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                {m.icon}
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{m.name}</div>
                <div style={{ fontSize: 10, color: 'var(--grey)', marginBottom: 8 }}>{m.type.charAt(0).toUpperCase() + m.type.slice(1)} · {m.level} · {m.size}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-xs" onClick={e => e.stopPropagation()}>Edit</button>
                  <button className="btn btn-ghost btn-xs" onClick={e => e.stopPropagation()}>Assign</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
