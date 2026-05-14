import { useState } from 'react'
import '../StudentsPage.css'

const LEVELS = {
  'Level 1': [
    { group: 'Foundation Skills', skills: ['Pole hold & grip', 'Fireman spin', 'Chair spin', 'Front hook spin', 'Body wave', 'Basic climb'] },
    { group: 'Floor Work', skills: ['Body roll', 'Floorwork sequence', 'Hip circles'] },
  ],
  'Level 2': [
    { group: 'Intermediate Spins', skills: ['Carousel spin', 'Attitude spin', 'Back hook spin', 'Two-hand spin'] },
    { group: 'Inversions Intro', skills: ['Tuck invert', 'Straddle invert', 'Basic invert hold'] },
  ],
  'Level 3': [
    { group: 'Advanced Inversions', skills: ['Aerial invert', 'Handspring prep', 'Caterpillar', 'Russian layback'] },
    { group: 'Strength & Conditioning', skills: ['Dead lift', 'Iron X prep', 'Superman', 'Flag prep'] },
  ],
  'High Tricks': [
    { group: 'Aerial Skills', skills: ['Iron X', 'Handspring', 'Deadlift flag', 'Hollow back', 'Pencil drop'] },
    { group: 'Performance', skills: ['Choreography', 'Transitions', 'Floor to pole flow'] },
  ],
}

export default function AdminSkillLists() {
  const [tab, setTab] = useState('Level 1')
  const [modal, setModal] = useState(null)

  const groups = LEVELS[tab] || []

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Skill Lists</div>
          <div className="page-sub">Track student progress through level checklists</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm">+ Add Skill List</button>
          <button className="btn btn-lime btn-sm" onClick={() => setModal({ type: 'skill' })}>+ Add Skill</button>
        </div>
      </div>

      <div className="subtabs" style={{ marginBottom: 24 }}>
        {Object.keys(LEVELS).map(level => (
          <div key={level} className={`subtab ${tab === level ? 'active' : ''}`} onClick={() => setTab(level)}>{level}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {groups.map(group => (
          <div key={group.group} className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, marginBottom: 14, color: 'var(--lime)' }}>{group.group}</div>
            {group.skills.map(skill => (
              <div key={skill} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a1a1a', fontSize: 13 }}>
                <span>{skill}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-xs">Students</button>
                  <button className="btn btn-ghost btn-xs">Edit</button>
                </div>
              </div>
            ))}
            <button className="btn btn-ghost btn-xs" style={{ marginTop: 12 }}>+ Add Skill</button>
          </div>
        ))}
      </div>

      {modal && (
        <div className="sd-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="sd-modal" style={{ maxWidth: 400 }}>
            <div className="sd-header">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Add Skill</div>
              <button className="modal-close-btn" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="sd-body">
              <div className="field"><label>Skill Name</label><input placeholder="e.g. Fireman Spin" /></div>
              <div className="field">
                <label>Group</label>
                <select>
                  {groups.map(g => <option key={g.group}>{g.group}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn btn-lime btn-sm" onClick={() => setModal(null)}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
