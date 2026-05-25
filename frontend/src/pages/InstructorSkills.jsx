import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { skills as skillsApi } from '../api'

export default function InstructorSkills() {
  const { data, loading, refetch } = useApi(() => skillsApi.pendingAll())
  const [statuses, setStatuses] = useState({})

  const groups = data || []
  const totalPending = groups.reduce((acc, g) => acc + g.skills.length, 0)

  function setStatus(key, status) {
    setStatuses(s => ({ ...s, [key]: status }))
  }

  async function reviewSkill(studentId, skill, instructorStatus) {
    const key = `${studentId}-${skill.skill_name}`
    setStatus(key, 'saving')
    try {
      await skillsApi.save(studentId, {
        skill_name: skill.skill_name,
        level: skill.level,
        self_assessed: skill.self_assessed,
        teacher_confirmed: instructorStatus === 'approved',
        instructor_status: instructorStatus,
      })
      setStatus(key, instructorStatus)
      refetch()
    } catch {
      setStatus(key, null)
    }
  }

  async function confirmAll(group) {
    const skillNames = group.skills.map(s => s.skill_name)
    setStatuses(prev => {
      const next = { ...prev }
      group.skills.forEach(s => { next[`${group.student_id}-${s.skill_name}`] = 'saving' })
      return next
    })
    try {
      await skillsApi.batchApprove(group.student_id, skillNames)
      setStatuses(prev => {
        const next = { ...prev }
        group.skills.forEach(s => { next[`${group.student_id}-${s.skill_name}`] = 'approved' })
        return next
      })
      refetch()
    } catch {
      setStatuses(prev => {
        const next = { ...prev }
        group.skills.forEach(s => { next[`${group.student_id}-${s.skill_name}`] = null })
        return next
      })
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22 }}>Skill Approvals</div>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 4 }}>
            {loading ? '…' : totalPending > 0 ? `${totalPending} skill${totalPending !== 1 ? 's' : ''} awaiting review` : 'All skills reviewed — nothing pending'}
          </div>
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
          {groups.map(group => {
            const allSaving = group.skills.every(s => statuses[`${group.student_id}-${s.skill_name}`] === 'saving')
            return (
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
                    disabled={allSaving}
                  >
                    {allSaving ? 'Saving…' : 'Approve All'}
                  </button>
                </div>
                <div style={{ padding: '10px 18px 14px' }}>
                  {group.skills.map(skill => {
                    const key = `${group.student_id}-${skill.skill_name}`
                    const status = statuses[key]
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
                          {status === 'saving' ? (
                            <span style={{ fontSize: 11, color: 'var(--grey)' }}>…</span>
                          ) : status === 'approved' ? (
                            <span style={{ fontSize: 11, color: 'var(--lime)', fontWeight: 600 }}>Approved ✓</span>
                          ) : status === 'not_quite' ? (
                            <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Not Quite</span>
                          ) : status === 'not_approved' ? (
                            <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>Not Approved</span>
                          ) : (
                            <>
                              <button
                                className="btn btn-ghost btn-xs"
                                style={{ color: 'var(--lime)', borderColor: 'rgba(204,255,0,0.3)' }}
                                onClick={() => reviewSkill(group.student_id, skill, 'approved')}
                              >
                                Approve
                              </button>
                              <button
                                className="btn btn-ghost btn-xs"
                                style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }}
                                onClick={() => reviewSkill(group.student_id, skill, 'not_quite')}
                              >
                                Not Quite
                              </button>
                              <button
                                className="btn btn-ghost btn-xs"
                                style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }}
                                onClick={() => reviewSkill(group.student_id, skill, 'not_approved')}
                              >
                                No
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
