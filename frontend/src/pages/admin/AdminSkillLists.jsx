import { useState } from 'react'
import '../StudentsPage.css'
import { useApi } from '../../hooks/useApi'
import { skillLevels } from '../../api'

export default function AdminSkillLists() {
  const { data: levelsData, loading, refetch } = useApi(() => skillLevels.list())
  const { data: namesData } = useApi(() => skillLevels.sessionNames())
  const levels = levelsData?.results || levelsData || []
  const sessionNames = namesData || []

  const [tab, setTab] = useState(null)
  const [modal, setModal] = useState(null)
  const [newSkillName, setNewSkillName] = useState('')
  const [newLevelName, setNewLevelName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingSkill, setDeletingSkill] = useState(null)

  const activeTab = tab || levels[0]?.name || null
  const activeLevel = levels.find(l => l.name === activeTab) || null

  // Flatten all skills across all groups for display
  const allSkills = activeLevel
    ? (activeLevel.groups || []).flatMap(g => g.skills || [])
    : []

  async function handleAddSkill(e) {
    e.preventDefault()
    if (!activeLevel || !newSkillName.trim()) return
    setSaving(true)
    try {
      await skillLevels.addSkill(activeLevel.id, newSkillName.trim())
      setModal(null)
      setNewSkillName('')
      refetch()
    } finally {
      setSaving(false)
    }
  }

  async function handleEditSkill(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await skillLevels.updateDefinition(modal.skill.id, { name: newSkillName })
      setModal(null)
      setNewSkillName('')
      refetch()
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteSkill(skill) {
    if (!confirm(`Delete "${skill.name}"? This cannot be undone.`)) return
    setDeletingSkill(skill.id)
    try {
      await skillLevels.deleteDefinition(skill.id)
      refetch()
    } finally {
      setDeletingSkill(null)
    }
  }

  async function handleAddLevel(e) {
    e.preventDefault()
    if (!newLevelName.trim()) return
    setSaving(true)
    try {
      await skillLevels.create({ name: newLevelName.trim(), order: levels.length })
      setModal(null)
      setNewLevelName('')
      refetch()
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteLevel() {
    if (!activeLevel) return
    if (!confirm(`Delete skill list "${activeLevel.name}" and all its skills? This cannot be undone.`)) return
    setSaving(true)
    try {
      await skillLevels.delete(activeLevel.id)
      setTab(null)
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
            <div className="page-sub">Track student progress through class skill checklists</div>
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
          <div className="page-sub">Track student progress through class skill checklists</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: 'level' })}>+ Add Class Skills</button>
          {activeLevel && (
            <button className="btn btn-lime btn-sm" onClick={() => { setNewSkillName(''); setModal({ type: 'skill' }) }}>+ Add Skill</button>
          )}
        </div>
      </div>

      {levels.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--grey)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--white)' }}>No skill lists yet</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Create a skill list for each class style (e.g. Level 1, Level 2).</div>
          <button className="btn btn-lime btn-sm" onClick={() => setModal({ type: 'level' })}>+ Add Class Skills</button>
        </div>
      ) : (
        <>
          {/* Class type tabs */}
          <div className="subtabs" style={{ marginBottom: 24 }}>
            {levels.map(level => (
              <div
                key={level.id}
                className={`subtab ${activeTab === level.name ? 'active' : ''}`}
                onClick={() => setTab(level.name)}
              >
                {level.name}
              </div>
            ))}
          </div>

          {activeLevel && (
            <>
              {/* Classes using this list */}
              {activeLevel.classes?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                  <span style={{ fontSize: 11, color: 'var(--grey)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', alignSelf: 'center' }}>Used by:</span>
                  {activeLevel.classes.map(c => (
                    <span key={c.id} style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>
                      {c.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Flat skill list */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {allSkills.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--grey)', fontSize: 13 }}>
                    No skills yet. Add the first skill for {activeLevel.name}.
                  </div>
                ) : (
                  allSkills.map((skill, idx) => (
                    <div
                      key={skill.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '13px 18px',
                        borderBottom: idx < allSkills.length - 1 ? '1px solid #1a1a1a' : 'none',
                        fontSize: 14,
                      }}
                    >
                      <span>{skill.name}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => { setModal({ type: 'edit-skill', skill }); setNewSkillName(skill.name) }}
                        >Edit</button>
                        <button
                          className="btn btn-ghost btn-xs"
                          style={{ color: 'var(--red)' }}
                          disabled={deletingSkill === skill.id}
                          onClick={() => handleDeleteSkill(skill)}
                        >{deletingSkill === skill.id ? '…' : 'Delete'}</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <button
                  className="btn btn-lime btn-sm"
                  onClick={() => { setNewSkillName(''); setModal({ type: 'skill' }) }}
                >+ Add Skill</button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }}
                  onClick={handleDeleteLevel}
                  disabled={saving}
                >Delete List</button>
              </div>
            </>
          )}
        </>
      )}

      {/* Add Skill */}
      {(modal?.type === 'skill') && (
        <div className="sd-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="sd-modal" style={{ maxWidth: 400 }}>
            <div className="sd-header">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Add Skill — {activeLevel?.name}</div>
              <button className="modal-close-btn" onClick={() => setModal(null)}>✕</button>
            </div>
            <form className="sd-body" onSubmit={handleAddSkill}>
              <div className="field">
                <label>Skill Name</label>
                <input
                  value={newSkillName}
                  onChange={e => setNewSkillName(e.target.value)}
                  placeholder="e.g. Hook Spin"
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Skill */}
      {modal?.type === 'edit-skill' && (
        <div className="sd-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="sd-modal" style={{ maxWidth: 400 }}>
            <div className="sd-header">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Edit Skill</div>
              <button className="modal-close-btn" onClick={() => setModal(null)}>✕</button>
            </div>
            <form className="sd-body" onSubmit={handleEditSkill}>
              <div className="field">
                <label>Skill Name</label>
                <input value={newSkillName} onChange={e => setNewSkillName(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Class Skills (create new skill list) */}
      {modal?.type === 'level' && (
        <div className="sd-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="sd-modal" style={{ maxWidth: 400 }}>
            <div className="sd-header">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Add Class Skills</div>
              <button className="modal-close-btn" onClick={() => setModal(null)}>✕</button>
            </div>
            <form className="sd-body" onSubmit={handleAddLevel}>
              <div className="field">
                <label>Class Type</label>
                {sessionNames.length > 0 ? (
                  <select
                    value={newLevelName}
                    onChange={e => setNewLevelName(e.target.value)}
                  >
                    <option value="">— Select a class —</option>
                    {sessionNames
                      .filter(name => !levels.find(l => l.name.toLowerCase() === name.toLowerCase()))
                      .map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                  </select>
                ) : (
                  <input
                    value={newLevelName}
                    onChange={e => setNewLevelName(e.target.value)}
                    placeholder="e.g. Level 1"
                    required
                  />
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 12, lineHeight: 1.5 }}>
                Skills added here will appear on student profiles for that class type.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>Cancel</button>
                <button
                  type="submit"
                  className="btn btn-lime btn-sm"
                  disabled={saving || !newLevelName.trim()}
                >{saving ? 'Creating…' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
