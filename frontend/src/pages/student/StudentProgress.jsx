import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { enrolments, skills as skillsApi, media, classes, challenges as challengesApi } from '../../api'
import client from '../../api/client'

const TYPE_BADGE = {
  video: { label: 'Video', color: 'var(--lime)', textColor: '#000' },
  pdf:   { label: 'PDF',   color: 'var(--lav)',  textColor: '#000' },
  image: { label: 'Image', color: 'var(--grey)', textColor: '#000' },
}

export default function StudentProgress() {
  const { user } = useAuth()
  const [mainTab, setMainTab] = useState('tricks')
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [chatClassId, setChatClassId] = useState(null)

  // Enrolments
  const { data: enrolData } = useApi(
    () => enrolments.list({ student: user?.id, status: 'active' }),
    [user?.id]
  )
  const enrolList = enrolData?.results || enrolData || []

  // Unique levels from enrolments (deduplicated)
  const enrolledLevels = [...new Set(
    enrolList.map(e => e.class_session_detail?.level || e.class_session_detail?.name).filter(Boolean)
  )]
  const activeLevel = selectedLevel || enrolledLevels[0] || null

  useEffect(() => {
    if (enrolList.length && !chatClassId) setChatClassId(enrolList[0].id)
  }, [enrolList.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Skills (student's saved progress)
  const [skillProgress, setSkillProgress] = useState({})
  const [selfAssessed, setSelfAssessed] = useState({})

  useEffect(() => {
    if (!user?.id) return
    skillsApi.list(user.id).then(res => {
      const map = {}
      for (const s of (res.data?.results || res.data || [])) {
        map[s.skill_name] = { self: s.self_assessed, teacher: s.teacher_confirmed, id: s.id }
      }
      setSkillProgress(map)
    }).catch(() => setSkillProgress({}))
  }, [user?.id])

  // Skill definitions from API
  const { data: skillLevelData } = useApi(() => client.get('/api/users/skill-levels/'), [])
  const skillLevels = skillLevelData?.results || skillLevelData || []

  const [skillDefs, setSkillDefs] = useState([])
  useEffect(() => {
    if (!skillLevels.length) return
    Promise.all(
      skillLevels.map(lv =>
        client.get('/api/users/skill-groups/', { params: { level: lv.id } }).then(r => {
          const groups = r.data?.results || r.data || []
          return Promise.all(
            groups.map(g =>
              client.get('/api/users/skill-definitions/', { params: { group: g.id } }).then(r2 => {
                const defs = r2.data?.results || r2.data || []
                return defs.map(d => ({ ...d, levelName: lv.name, groupName: g.name }))
              })
            )
          ).then(nested => nested.flat())
        })
      )
    ).then(all => setSkillDefs(all.flat())).catch(() => setSkillDefs([]))
  }, [skillLevels.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Skills filtered to the selected level
  const levelSkills = skillDefs.filter(d => !activeLevel || d.levelName === activeLevel)
  const unlockedCount = levelSkills.filter(d => skillProgress[d.name]?.teacher).length
  const totalCount = levelSkills.length

  function toggleSelf(skillName) {
    setSelfAssessed(prev => ({ ...prev, [skillName]: !prev[skillName] }))
  }

  const selfAssessedNames = Object.entries(selfAssessed).filter(([, v]) => v).map(([k]) => k)

  function submitSelfAssessed() {
    for (const name of selfAssessedNames) {
      const current = skillProgress[name] || {}
      skillsApi.save(user.id, {
        skill_name: name,
        self_assessed: true,
        teacher_confirmed: current.teacher || false,
      }).then(res => {
        setSkillProgress(p => ({
          ...p,
          [name]: { self: res.data.self_assessed, teacher: res.data.teacher_confirmed, id: res.data.id },
        }))
      }).catch(() => {})
    }
    setSelfAssessed({})
  }

  // Media / Resources
  const { data: mediaData } = useApi(() => media.list(), [])
  const mediaList = mediaData?.results || mediaData || []

  // Chat
  const [chatMessages, setChatMessages] = useState({})
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState(null)
  const chatEndRef = useRef(null)

  const chatEnrol = enrolList.find(e => e.id === chatClassId)

  useEffect(() => {
    if (!chatClassId) return
    const sessionId = chatEnrol?.class_session
    if (!sessionId) return
    classes.chat.list(sessionId).then(res => {
      const msgs = res.data?.results || res.data || []
      setChatMessages(prev => ({ ...prev, [chatClassId]: msgs }))
    }).catch(() => {
      setChatMessages(prev => ({ ...prev, [chatClassId]: [] }))
    })
  }, [chatClassId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatClassId])

  function sendChatMessage() {
    if (!chatInput.trim() || !chatClassId) return
    const sessionId = chatEnrol?.class_session
    if (!sessionId) return
    const text = chatInput.trim()
    setChatInput('')
    const optimistic = {
      id: Date.now(),
      body: text,
      sender_name: user?.first_name || 'Me',
      created_at: new Date().toISOString(),
      _mine: true,
    }
    setChatMessages(prev => ({
      ...prev,
      [chatClassId]: [...(prev[chatClassId] || []), optimistic],
    }))
    setChatLoading(true)
    classes.chat.send(sessionId, { body: text })
      .catch(() => {
        setChatError('Failed to send message. Please try again.')
        setTimeout(() => setChatError(null), 4000)
        // remove optimistic message on failure
        setChatMessages(prev => ({
          ...prev,
          [chatClassId]: (prev[chatClassId] || []).filter(m => m.id !== optimistic.id),
        }))
      })
      .finally(() => setChatLoading(false))
  }

  // Challenges
  const { data: challengeData, refetch: refetchChallenges } = useApi(
    () => challengesApi.list({ active: 'true' }),
    []
  )
  const activeChallenges = challengeData?.results || challengeData || []
  const [optingIn, setOptingIn] = useState(null)
  const [leaderboardChallenge, setLeaderboardChallenge] = useState(null)
  const [leaderboardData, setLeaderboardData] = useState(null)
  const [optInPopped, setOptInPopped] = useState(() => {
    try { return JSON.parse(localStorage.getItem('challenge_popups_shown') || '[]') } catch { return [] }
  })

  // Show opt-in popup for new challenges the student hasn't been shown yet
  useEffect(() => {
    if (!activeChallenges.length) return
    const unseen = activeChallenges.filter(c => {
      const notYetJoined = !c.my_progress || c.my_progress.current_value === 0
      const notPopped = !optInPopped.includes(c.id)
      return notYetJoined && notPopped
    })
    if (unseen.length && !optingIn) {
      setOptingIn(unseen[0])
      const updated = [...optInPopped, unseen[0].id]
      setOptInPopped(updated)
      localStorage.setItem('challenge_popups_shown', JSON.stringify(updated))
    }
  }, [activeChallenges.length]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleOptIn(challengeId) {
    await challengesApi.optIn(challengeId)
    setOptingIn(null)
    refetchChallenges()
  }

  async function handleOptOut(challengeId) {
    await challengesApi.optOut(challengeId)
    refetchChallenges()
  }

  async function openLeaderboard(c) {
    setLeaderboardChallenge(c)
    const res = await challengesApi.leaderboard(c.id)
    setLeaderboardData(res.data)
  }

  const tabs = [
    ['tricks', 'Tricks'],
    ['challenges', 'Challenges'],
    ['resources', 'Resources'],
    ['chat', 'Class Chat'],
  ]

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Progress</div>
          <div className="page-sub">Track your tricks, resources, and class chat</div>
        </div>
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMainTab(key)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${mainTab === key ? 'var(--lime)' : 'transparent'}`,
              color: mainTab === key ? 'var(--white)' : 'var(--grey)',
              padding: '10px 16px',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TRICKS TAB ── */}
      {mainTab === 'tricks' && (
        <div>
          {enrolList.length === 0 ? (
            <div className="empty-state">No active enrolments found</div>
          ) : (
            <>
              {/* Level selector */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {enrolledLevels.map(level => (
                  <button
                    key={level}
                    onClick={() => setSelectedLevel(level)}
                    style={{
                      borderBottom: `2px solid ${activeLevel === level ? 'var(--lime)' : 'transparent'}`,
                      color: activeLevel === level ? 'var(--white)' : 'var(--grey)',
                      padding: '6px 14px',
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'color 0.15s',
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>

              {activeLevel && (
                <>
                  {/* Progress card */}
                  <div className="card" style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
                      {activeLevel}
                    </div>
                    {totalCount > 0 ? (
                      <>
                        <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 8 }}>
                          {unlockedCount} of {totalCount} tricks unlocked
                        </div>
                        <div style={{ background: 'var(--border)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${totalCount ? (unlockedCount / totalCount) * 100 : 0}%`,
                              height: '100%',
                              background: 'var(--lime)',
                              transition: 'width 0.4s',
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: 'var(--grey)' }}>Your instructor will track tricks here</div>
                    )}
                  </div>

                  {/* Trick grid */}
                  {levelSkills.length === 0 ? (
                    <div className="empty-state">Your instructor will track tricks here</div>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                        gap: 10,
                      }}
                      className="trick-grid"
                    >
                      {levelSkills.map(def => {
                        const prog = skillProgress[def.name] || {}
                        const unlocked = prog.teacher
                        const isSelf = selfAssessed[def.name]
                        return (
                          <div
                            key={def.id}
                            onClick={() => !unlocked && toggleSelf(def.name)}
                            style={{
                              background: 'var(--card)',
                              border: `1px solid ${unlocked ? 'rgba(204,255,0,0.3)' : isSelf ? 'rgba(204,255,0,0.15)' : 'var(--border)'}`,
                              borderRadius: 10,
                              padding: '12px 14px',
                              cursor: unlocked ? 'default' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{def.name}</div>
                              {def.groupName && (
                                <div style={{ fontSize: 10, color: 'var(--grey)' }}>{def.groupName}</div>
                              )}
                            </div>
                            <div style={{ flexShrink: 0, textAlign: 'right' }}>
                              {unlocked ? (
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--lime)' }} title="Unlocked" />
                              ) : isSelf ? (
                                <span style={{ fontSize: 10, color: 'var(--lime)' }}>✓ Self-assessed</span>
                              ) : (
                                <span style={{ fontSize: 10, color: 'var(--grey)' }}>Tap if ready</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Sticky submit bar */}
              {selfAssessedNames.length > 0 && (
                <div
                  style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: '#111',
                    borderTop: '1px solid var(--border)',
                    padding: '12px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    zIndex: 100,
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--grey)' }}>
                    {selfAssessedNames.length} trick{selfAssessedNames.length > 1 ? 's' : ''} self-assessed
                  </span>
                  <button className="btn btn-lime btn-sm" onClick={submitSelfAssessed}>
                    Submit {selfAssessedNames.length} trick{selfAssessedNames.length > 1 ? 's' : ''} to instructor
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── CHALLENGES TAB ── */}
      {mainTab === 'challenges' && (
        <div>
          {activeChallenges.length === 0 ? (
            <div className="empty-state">No active challenges right now</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {activeChallenges.map(c => {
                const prog = c.my_progress
                const joined = prog && (prog.current_value > 0 || prog.completed)
                const pct = Math.min(100, ((prog?.current_value || 0) / c.target_value) * 100)
                const daysLeft = Math.max(0, Math.ceil((new Date(c.end_date) - new Date()) / 86400000))
                return (
                  <div key={c.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, marginBottom: 2 }}>{c.title}</div>
                        {c.description && <div style={{ fontSize: 12, color: 'var(--grey)' }}>{c.description}</div>}
                      </div>
                      {prog?.completed && <span className="tag tag-lime" style={{ fontSize: 10 }}>Complete!</span>}
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span>Target: <strong style={{ color: 'var(--white)' }}>{c.target_value}</strong></span>
                      <span>Ends: <strong style={{ color: 'var(--white)' }}>{new Date(c.end_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</strong>{daysLeft > 0 ? ` (${daysLeft}d left)` : ''}</span>
                      {c.reward_type !== 'none' && (
                        <span>Reward: <strong style={{ color: 'var(--lime)' }}>{c.reward_type === 'badge' ? `"${c.reward_badge_name}" badge` : `$${c.reward_credit_amount} credit`}</strong></span>
                      )}
                    </div>

                    {joined ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                          <span style={{ color: 'var(--grey)' }}>Your progress</span>
                          <span style={{ color: prog?.completed ? 'var(--lime)' : 'var(--white)' }}>
                            {prog?.current_value || 0} / {c.target_value}
                          </span>
                        </div>
                        <div style={{ background: 'var(--border)', borderRadius: 4, height: 8, overflow: 'hidden', marginBottom: 12 }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: prog?.completed ? 'var(--lime)' : 'var(--lav)', transition: 'width 0.4s' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => openLeaderboard(c)}>Leaderboard</button>
                          {!prog?.completed && (
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => handleOptOut(c.id)}>Leave challenge</button>
                          )}
                        </div>
                      </>
                    ) : (
                      <button className="btn btn-lime btn-sm" onClick={() => handleOptIn(c.id)}>
                        Join challenge
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── RESOURCES TAB ── */}
      {mainTab === 'resources' && (
        <div>
          {/* Showcase banners */}
          {enrolList.map(enrol => {
            const startDate = enrol.class_session_detail?.season_start_date
            if (!startDate) return null
            const start = new Date(startDate + 'T00:00')
            const week8start = new Date(start)
            week8start.setDate(start.getDate() + 49)
            const dayOfWeek = week8start.getDay()
            const daysToFriday = (5 - dayOfWeek + 7) % 7
            const showcaseFriday = new Date(week8start)
            showcaseFriday.setDate(week8start.getDate() + daysToFriday)
            showcaseFriday.setHours(0, 0, 0, 0)
            const now = new Date()
            now.setHours(0, 0, 0, 0)
            const daysUntil = Math.round((showcaseFriday - now) / 86400000)
            if (daysUntil < -14 || daysUntil > 70) return null
            const isPast = daysUntil < 0
            const dateStr = showcaseFriday.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
            return (
              <div key={enrol.id} style={{
                background: isPast ? 'rgba(255,170,0,0.05)' : 'rgba(204,255,0,0.06)',
                border: `1px solid ${isPast ? 'rgba(255,170,0,0.2)' : 'rgba(204,255,0,0.2)'}`,
                borderRadius: 10, padding: '12px 16px', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 22 }}>🎭</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {isPast ? 'Showcase was' : 'Showcase'} — {enrol.class_session_detail?.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
                    {isPast ? `${dateStr}` : daysUntil === 0 ? `Today! ${dateStr}` : `${dateStr} · ${daysUntil} day${daysUntil !== 1 ? 's' : ''} away`}
                  </div>
                </div>
              </div>
            )
          })}
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 20 }}>
            Routine videos are released in Week 5 of each season. Other resources like warm-up guides and music playlists are available year-round.
          </div>

          {mediaList.length === 0 ? (
            <div className="empty-state">No resources uploaded yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {enrolList.map(enrol => {
                const sessionId = enrol.class_session
                const items = (mediaList || []).filter(m => m.session === sessionId)
                if (!items.length) return null
                const className = enrol.class_session_detail?.name || `Class ${enrol.id}`
                const seasonName = enrol.class_session_detail?.season_name || ''
                return (
                  <div key={enrol.id}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 12 }}>
                      {className}{seasonName ? ` · ${seasonName}` : ''}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {items.map(item => {
                        const locked = item.available_from && new Date(item.available_from) > new Date(new Date().setHours(0,0,0,0))
                        const icon = (() => {
                          const n = (item.name || '').toLowerCase()
                          if (item.media_type === 'video' || n.includes('routine')) return '🎬'
                          if (n.includes('playlist') || n.includes('music')) return '🎵'
                          if (n.includes('warm') || n.includes('stretch')) return '🏃'
                          if (item.media_type === 'pdf') return '📄'
                          return '📎'
                        })()
                        const href = item.url || item.file
                        const availDate = item.available_from
                          ? new Date(item.available_from).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
                          : null
                        return (
                          <div key={item.id} style={{
                            background: 'var(--card)',
                            border: `1px solid ${locked ? 'var(--border)' : 'rgba(204,255,0,0.15)'}`,
                            borderRadius: 10, padding: '12px 16px',
                            display: 'flex', alignItems: 'center', gap: 12,
                            opacity: locked ? 0.6 : 1,
                          }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: locked ? '#1a1a1a' : 'rgba(204,255,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                              {icon}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                              {item.description && <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 1 }}>{item.description}</div>}
                              {locked && availDate && <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 2 }}>Available from {availDate}</div>}
                            </div>
                            {locked ? (
                              <span style={{ fontSize: 10, color: 'var(--grey)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>Locked</span>
                            ) : href ? (
                              <a href={href} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ textDecoration: 'none', flexShrink: 0, fontSize: 11 }}>Open</a>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {(mediaList || []).filter(m => !m.session).length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 12 }}>General Resources</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(mediaList || []).filter(m => !m.session).map(item => {
                      const href = item.url || item.file
                      return (
                        <div key={item.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                            {item.description && <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 1 }}>{item.description}</div>}
                          </div>
                          {href && <a href={href} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ textDecoration: 'none', flexShrink: 0, fontSize: 11 }}>Open</a>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── CLASS CHAT TAB ── */}
      {mainTab === 'chat' && (
        <div>
          {enrolList.length === 0 ? (
            <div className="empty-state">No active enrolments found</div>
          ) : (
            <>
              {/* Class selector */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {enrolList.map(e => {
                  const name = e.class_session_detail?.name || `Class ${e.id}`
                  const active = e.id === chatClassId
                  return (
                    <button
                      key={e.id}
                      onClick={() => setChatClassId(e.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        borderBottom: `2px solid ${active ? 'var(--lime)' : 'transparent'}`,
                        color: active ? 'var(--white)' : 'var(--grey)',
                        padding: '6px 14px',
                        fontSize: 13,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'color 0.15s',
                      }}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>

              {chatClassId && (
                <div className="chat-container" style={{ height: 'min(420px, 60vh)' }}>
                  {/* Message list */}
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      paddingBottom: 8,
                    }}
                  >
                    {chatMessages[chatClassId] === null ? (
                      <div className="empty-state">Loading…</div>
                    ) : (chatMessages[chatClassId] || []).length === 0 ? (
                      <div className="empty-state" style={{ marginTop: 40 }}>
                        No messages yet — say hi to your class!
                      </div>
                    ) : (
                      (chatMessages[chatClassId] || []).map(msg => {
                        const mine = msg._mine || msg.sender === user?.id || msg.sender_id === user?.id
                        const senderName = msg.sender_name || msg.sender_display || 'Student'
                        const ts = msg.created_at
                          ? new Date(msg.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
                          : ''
                        return (
                          <div
                            key={msg.id}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: mine ? 'flex-end' : 'flex-start',
                            }}
                          >
                            {!mine && (
                              <div style={{ fontSize: 10, color: 'var(--grey)', marginBottom: 3, marginLeft: 4 }}>
                                {senderName}
                              </div>
                            )}
                            <div
                              style={{
                                background: mine ? 'rgba(204,255,0,0.15)' : '#1a1a1a',
                                borderRadius: 12,
                                padding: '8px 12px',
                                maxWidth: '75%',
                                fontSize: 13,
                                lineHeight: 1.5,
                                border: mine ? '1px solid rgba(204,255,0,0.2)' : '1px solid var(--border)',
                              }}
                            >
                              {msg.body || msg.message || msg.content}
                            </div>
                            {ts && (
                              <div style={{ fontSize: 10, color: 'var(--grey)', marginTop: 3, marginLeft: mine ? 0 : 4, marginRight: mine ? 4 : 0 }}>
                                {ts}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {chatError && (
                    <div style={{ fontSize: 12, color: 'var(--red)', padding: '6px 0' }}>{chatError}</div>
                  )}
                  {/* Input */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border)',
                      paddingTop: 12,
                      display: 'flex',
                      gap: 8,
                      alignItems: 'flex-end',
                    }}
                  >
                    <textarea
                      rows={2}
                      placeholder={`Message ${chatEnrol?.class_session_detail?.name || 'your class'}…`}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage() } }}
                      style={{
                        flex: 1,
                        background: '#111',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        color: 'var(--white)',
                        padding: '8px 12px',
                        fontSize: 13,
                        resize: 'none',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                    <button
                      className="btn btn-lime btn-sm"
                      onClick={sendChatMessage}
                      disabled={!chatInput.trim() || chatLoading}
                      style={{ flexShrink: 0 }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {/* ── CHALLENGE OPT-IN POPUP ── */}
      {optingIn && (
        <div className="sd-overlay" onClick={() => setOptingIn(null)}>
          <div className="sd-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="sd-header">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>New challenge!</div>
              <button className="modal-close-btn" onClick={() => setOptingIn(null)}>✕</button>
            </div>
            <div className="sd-body">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 8 }}>{optingIn.title}</div>
              {optingIn.description && (
                <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16 }}>{optingIn.description}</div>
              )}
              <div style={{ fontSize: 13, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div>Target: <strong>{optingIn.target_value}</strong> {optingIn.challenge_type === 'attendance_count' ? 'classes' : optingIn.challenge_type === 'style_variety' ? 'different styles' : 'weeks in a row'}</div>
                <div>Ends: <strong>{new Date(optingIn.end_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}</strong></div>
                {optingIn.reward_type !== 'none' && (
                  <div>Reward: <strong style={{ color: 'var(--lime)' }}>{optingIn.reward_type === 'badge' ? `"${optingIn.reward_badge_name}" badge` : `$${optingIn.reward_credit_amount} credit`}</strong></div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-lime" style={{ flex: 1 }} onClick={() => handleOptIn(optingIn.id)}>
                  Join challenge
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setOptingIn(null)}>Not now</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LEADERBOARD MODAL ── */}
      {leaderboardChallenge && (
        <div className="sd-overlay" onClick={() => { setLeaderboardChallenge(null); setLeaderboardData(null) }}>
          <div className="sd-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="sd-header">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Leaderboard — {leaderboardChallenge.title}</div>
              <button className="modal-close-btn" onClick={() => { setLeaderboardChallenge(null); setLeaderboardData(null) }}>✕</button>
            </div>
            <div className="sd-body">
              {!leaderboardData ? (
                <div style={{ color: 'var(--grey)', fontSize: 13 }}>Loading…</div>
              ) : leaderboardData.length === 0 ? (
                <div style={{ color: 'var(--grey)', fontSize: 13 }}>No participants yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {leaderboardData.map((entry, i) => {
                    const pct = Math.min(100, (entry.current_value / leaderboardChallenge.target_value) * 100)
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                    const isMe = entry.student_id === user?.id
                    return (
                      <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1a1a1a', background: isMe ? 'rgba(204,255,0,0.04)' : 'none' }}>
                        <div style={{ width: 28, textAlign: 'center', fontSize: 15, flexShrink: 0 }}>
                          {medal || <span style={{ fontSize: 12, color: 'var(--grey)' }}>#{i + 1}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: isMe ? 700 : 500 }}>
                              {entry.student_name}{isMe ? ' (you)' : ''}
                            </span>
                            <span style={{ fontSize: 12, color: entry.completed ? 'var(--lime)' : 'var(--grey)' }}>
                              {entry.completed ? 'Done!' : `${entry.current_value}/${leaderboardChallenge.target_value}`}
                            </span>
                          </div>
                          <div style={{ background: 'var(--border)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: entry.completed ? 'var(--lime)' : 'var(--lav)' }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
