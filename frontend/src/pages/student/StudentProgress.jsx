import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { attendance, enrolments, skills as skillsApi } from '../../api'

const ATT_TAG = {
  present:   { label: 'Present',   cls: 'tag-lime' },
  late:      { label: 'Late',      cls: 'tag-amber' },
  no_show:   { label: 'No-show',   cls: 'tag-red' },
  absent:    { label: 'Absent',    cls: 'tag-grey' },
  cancelled: { label: 'Cancelled', cls: 'tag-grey' },
}

const SKILL_LEVELS = {
  'Level 1': ['Fireman Spin', 'Chair Spin', 'Front Hook Spin', 'Body Wave', 'Basic Climb', 'Pole Hold & Grip', 'Floor Work Sequence'],
  'Level 2': ['Carousel Spin', 'Attitude Spin', 'Back Hook Spin', 'Crucifix', 'Hip Hold', 'Tuck Invert Prep', 'Brass Monkey'],
  'Level 3': ['Aerial Invert', 'Caterpillar', 'Russian Layback', 'Dead Lift Prep', 'Superman', 'Cross-knee Release', 'Handspring Prep'],
  'High Tricks': ['Iron X', 'Handspring', 'Deadlift Flag', 'Hollow Back', 'Pencil Drop', 'Shoulder Mount', 'Flag'],
}

export default function StudentProgress() {
  const { user } = useAuth()
  const [mainTab, setMainTab] = useState('attendance')
  const { data: attData, loading } = useApi(() => attendance.list({ student: user?.id }), [user?.id])
  const { data: enrolData } = useApi(() => enrolments.list({ student: user?.id, status: 'active' }), [user?.id])
  const [skillLevel, setSkillLevel] = useState('Level 1')
  const [skillProgress, setSkillProgress] = useState({})

  useEffect(() => {
    if (!user?.id) return
    skillsApi.list(user.id).then(res => {
      const map = {}
      for (const skill of (res.data || [])) {
        map[skill.skill_name] = { self: skill.self_assessed, teacher: skill.teacher_confirmed, id: skill.id }
      }
      setSkillProgress(map)
    }).catch(() => setSkillProgress({}))
  }, [user?.id])

  function toggleSelf(skillName) {
    setSkillProgress(prev => {
      const current = prev[skillName] || {}
      const newVal = !current.self
      const updated = { ...prev, [skillName]: { ...current, self: newVal } }
      skillsApi.save(user.id, {
        skill_name: skillName,
        level: skillLevel,
        self_assessed: newVal,
        teacher_confirmed: current.teacher || false,
      }).then(res => {
        setSkillProgress(p => ({ ...p, [skillName]: { self: res.data.self_assessed, teacher: res.data.teacher_confirmed, id: res.data.id } }))
      }).catch(() => {
        setSkillProgress(p => ({ ...p, [skillName]: current }))
      })
      return updated
    })
  }

  const attHistory = attData?.results || []
  const enrolments_ = enrolData?.results || []

  const presentCount = attHistory.filter(a => a.status === 'present').length
  const lateCount = attHistory.filter(a => a.status === 'late').length
  const noShowCount = attHistory.filter(a => a.status === 'no_show').length
  const totalAttended = presentCount + lateCount
  const attendanceRate = attHistory.length ? Math.round(totalAttended / attHistory.length * 100) : 0

  const bySession = {}
  for (const a of attHistory) {
    const name = a.occurrence_detail?.session_detail?.name || 'Unknown'
    if (!bySession[name]) bySession[name] = { present: 0, late: 0, no_show: 0, total: 0 }
    bySession[name][a.status] = (bySession[name][a.status] || 0) + 1
    bySession[name].total++
  }

  const sorted = [...attHistory].sort((a, b) => new Date(b.occurrence_detail?.date) - new Date(a.occurrence_detail?.date))

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Progress</div>
          <div className="page-sub">Your attendance history and skills</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {[['attendance', 'Attendance'], ['skills', 'Skills']].map(([key, label]) => (
          <button key={key} onClick={() => setMainTab(key)} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${mainTab === key ? 'var(--lime)' : 'transparent'}`, color: mainTab === key ? 'var(--white)' : 'var(--grey)', padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'color 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {mainTab === 'attendance' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, color: 'var(--lime)' }}>{totalAttended}</div>
              <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>Classes Attended</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, color: attendanceRate >= 80 ? 'var(--lime)' : attendanceRate >= 50 ? 'var(--amber)' : 'var(--red)' }}>{attendanceRate}%</div>
              <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>Attendance Rate</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, color: 'var(--amber)' }}>{noShowCount}</div>
              <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>No-shows</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, color: 'var(--lav)' }}>{enrolments_.length}</div>
              <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>Active Classes</div>
            </div>
          </div>

          {Object.keys(bySession).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div className="section-title" style={{ fontSize: 13, marginBottom: 12 }}>By Class</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(bySession).map(([name, stats]) => {
                  const rate = stats.total ? Math.round((stats.present + (stats.late || 0)) / stats.total * 100) : 0
                  return (
                    <div key={name} className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                        <span style={{ fontFamily: "'Archivo Black', sans-serif", color: rate >= 80 ? 'var(--lime)' : 'var(--amber)' }}>{rate}%</span>
                      </div>
                      <div className="progress-bar" style={{ marginBottom: 10 }}>
                        <div className="progress-fill" style={{ width: `${rate}%`, background: rate >= 80 ? 'var(--lime)' : 'var(--amber)' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--grey)' }}>
                        <span style={{ color: 'var(--lime)' }}>{stats.present || 0} present</span>
                        {stats.late > 0 && <span style={{ color: 'var(--amber)' }}>{stats.late} late</span>}
                        {stats.no_show > 0 && <span style={{ color: 'var(--red)' }}>{stats.no_show} no-show</span>}
                        <span>{stats.total} total</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <div className="section-title" style={{ fontSize: 13, marginBottom: 12 }}>Full History</div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
            ) : sorted.length === 0 ? (
              <div className="empty-state">No attendance records yet</div>
            ) : (
              <div className="list-card">
                {sorted.map(a => {
                  const tag = ATT_TAG[a.status] || { label: a.status, cls: 'tag-grey' }
                  return (
                    <div key={a.id} className="list-row">
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.status === 'present' ? 'var(--lime)' : a.status === 'late' ? 'var(--amber)' : a.status === 'no_show' ? 'var(--red)' : 'var(--grey)', flexShrink: 0 }} />
                      <div className="list-body">
                        <div className="list-title">{a.occurrence_detail?.session_detail?.name}</div>
                        <div className="list-sub">
                          {a.occurrence_detail?.date ? new Date(a.occurrence_detail.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                        </div>
                      </div>
                      <span className={`tag ${tag.cls}`} style={{ fontSize: 10 }}>{tag.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {mainTab === 'skills' && (
        <div>
          <div className="subtabs" style={{ marginBottom: 20 }}>
            {Object.keys(SKILL_LEVELS).map(level => (
              <div key={level} className={`subtab ${skillLevel === level ? 'active' : ''}`} onClick={() => setSkillLevel(level)}>{level}</div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--lav)', marginRight: 4 }} />Self-assessed</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--lime)', marginRight: 4 }} />Teacher confirmed</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {(SKILL_LEVELS[skillLevel] || []).map(skillName => {
              const prog = skillProgress[skillName] || {}
              return (
                <div key={skillName} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13 }}>{skillName}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div onClick={() => toggleSelf(skillName)} style={{ width: 10, height: 10, borderRadius: '50%', background: prog.self ? 'var(--lav)' : 'none', border: '1px solid var(--lav)', cursor: 'pointer' }} title="Self-assessed" />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: prog.teacher ? 'var(--lime)' : 'none', border: '1px solid var(--lime)', cursor: 'default' }} title="Teacher confirmed" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
