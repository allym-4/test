import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { skills as skillsApi } from '../api'

export default function InstructorSkills() {
  const { data, loading, refetch } = useApi(() => skillsApi.pendingAll())
  const [confirming, setConfirming] = useState({})
  const [confirmed, setConfirmed] = useState({})

  const groups = data || []
  const totalPending = groups.reduce((acc, g) => acc + g.skills.length, 0)

  async function confirmSkill(studentId, skill) {
    const key = `${studentId}-${skill.skill_name}`
    setConfirming(s => ({ ...s, [key]: true }))
    try {
      await skillsApi.save(studentId, {
        skill_name: skill.skill_name,
        level: skill.level,
        self_assessed: skill.self_assessed,
        teacher_confirmed: true,
      })
      setConfirmed(s => ({ ...s, [key]: true }))
      refetch()
    } finally {
      setConfirming(s => ({ ...s, [key]: false }))
    }
  }

  async function confirmAll(group) {
    for (const skill of group.skills) {
      await confirmSkill(group.student_id, skill)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>
          Skill Approvals
        </div>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>
          {loading ? '…' : totalPending > 0 ? `${totalPending} skill${totalPending !== 1 ? 's' : ''} awaiting confirmation` : 'All skills confirmed — nothing pending'}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="spinner" />
        </div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--grey)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Nothing pending</div>
          <div style={{ fontSize: 12 }}>Students who self-assess skills will appear here for your review.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {groups.map(group => (
            <div key={group.student_id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{group.student_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
                    {group.skills.length} skill{group.skills.length !== 1 ? 's' : ''} pending
                  </div>
                </div>
                <button
                  className="btn btn-lime btn-sm"
                  onClick={() => confirmAll(group)}
                  disabled={group.skills.every(s => confirming[`${group.student_id}-${s.skill_name}`])}
                >
                  Confirm All
                </button>
              </div>
              <div style={{ padding: '10px 18px 14px' }}>
                {group.skills.map(skill => {
                  const key = `${group.student_id}-${skill.skill_name}`
                  const isConfirming = confirming[key]
                  const isConfirmed = confirmed[key]
                  return (
                    <div key={skill.skill_name} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 0',
                      borderBottom: '1px solid #111',
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{skill.skill_name}</div>
                        {skill.level && (
                          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{skill.level}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--lav)' }}>Self-assessed</span>
                        {isConfirmed ? (
                          <span style={{ fontSize: 11, color: 'var(--lime)', fontWeight: 600 }}>Confirmed ✓</span>
                        ) : (
                          <button
                            className="btn btn-ghost btn-xs"
                            style={{ color: 'var(--lime)', borderColor: 'rgba(204,255,0,0.3)' }}
                            disabled={isConfirming}
                            onClick={() => confirmSkill(group.student_id, skill)}
                          >
                            {isConfirming ? '…' : 'Confirm'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
