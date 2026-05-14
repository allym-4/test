import { useState } from 'react'
import '../StudentsPage.css'
import { useApi } from '../../hooks/useApi'
import { skillLevels } from '../../api'

export default function AdminSkillLists() {
  const { data: levelsData, loading, refetch } = useApi(() => skillLevels.list())
  const levels = levelsData || []

  const [tab, setTab] = useState(null)
  const [modal, setModal] = useState(null)
  const [newSkillName, setNewSkillName] = useState('')
  const [newSkillGroup, setNewSkillGroup] = useState('')
  const [newLevelName, setNewLevelName] = useState('')
  const [saving, setSaving] = useState(false)

  const activeTab = tab || levels[0]?.name || null
  const activeLevel = levels.find(l => l.name === activeTab) || null
  const groups = activeLevel?.groups || []

  async function handleAddSkill(e) {
    e.preventDefault()
    const group = groups.find(g => g.name === newSkillGroup) || groups[0]
    if (!group) return
    setSaving(true)
    try {
      await skillLevels.createDefinition({ group: group.id, name: newSkillName, order: 0 })
      setModal(null)
      setNewSkillName('')
      setNewSkillGroup('')
      refetch()
    } finally {
      setSaving(false)
    }
  }

  async function handleAddLevel(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await skillLevels.create({ name: newLevelName, order: levels.length })
      setModal(null)
      setNewLevelName('')
      refetch()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">Skill Lists</div>
            <div className="page-sub">Track student progress through level checklists</div>
          </div>
        </div>
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--grey)' }}>Loading…</div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Skill Lists</div>
          <div className="page-sub">Track student progress through level checklists</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: 'level' })}>+ Add Skill List</button>
          <button className="btn btn-lime btn-sm" onClick={() => setModal({ type: 'skill' })}>+ Add Skill</button>
        </div>
      </div>

      <div className="subtabs" style={{ marginBottom: 24 }}>
        {levels.map(level => (
          <div key={level.id} className={`subtab ${activeTab === level.name ? 'active' : ''}`} onClick={() => setTab(level.name)}>{level.name}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {groups.map(group => (
          <div key={group.id} className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, marginBottom: 14, color: 'var(--lime)' }}>{group.name}</div>
            {(group.skills || []).map(skill => (
              <div key={skill.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a1a1a', fontSize: 13 }}>
                <span>{skill.name}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-xs">Students</button>
                  <button className="btn btn-ghost btn-xs">Edit</button>
                </div>
              </div>
            ))}
            <button className="btn btn-ghost btn-xs" style={{ marginTop: 12 }} onClick={() => setModal({ type: 'skill', groupId: group.id, groupName: group.name })}>+ Add Skill</button>
          </div>
        ))}
      </div>

      {modal?.type === 'skill' && (
        <div className="sd-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="sd-modal" style={{ maxWidth: 400 }}>
            <div className="sd-header">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Add Skill</div>
              <button className="modal-close-btn" onClick={() => setModal(null)}>✕</button>
            </div>
            <form className="sd-body" onSubmit={handleAddSkill}>
              <div className="field"><label>Skill Name</label><input value={newSkillName} onChange={e => setNewSkillName(e.target.value)} placeholder="e.g. Fireman Spin" required /></div>
              <div className="field">
                <label>Group</label>
                <select value={newSkillGroup || modal.groupName || groups[0]?.name || ''} onChange={e => setNewSkillGroup(e.target.value)}>
                  {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal?.type === 'level' && (
        <div className="sd-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="sd-modal" style={{ maxWidth: 400 }}>
            <div className="sd-header">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Add Skill List</div>
              <button className="modal-close-btn" onClick={() => setModal(null)}>✕</button>
            </div>
            <form className="sd-body" onSubmit={handleAddLevel}>
              <div className="field"><label>Level Name</label><input value={newLevelName} onChange={e => setNewLevelName(e.target.value)} placeholder="e.g. Level 4" required /></div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
