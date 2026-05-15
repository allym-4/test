import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { enrolments, skills as skillsApi, media, helpdesk } from '../../api'
import client from '../../api/client'

const TYPE_BADGE = {
  video: { label: 'Video', color: 'var(--lime)', textColor: '#000' },
  pdf:   { label: 'PDF',   color: 'var(--lav)',  textColor: '#000' },
  image: { label: 'Image', color: 'var(--grey)', textColor: '#000' },
}

export default function StudentProgress() {
  const { user } = useAuth()
  const [mainTab, setMainTab] = useState('tricks')
  const [activeClassId, setActiveClassId] = useState(null)
  const [chatClassId, setChatClassId] = useState(null)

  // Enrolments
  const { data: enrolData } = useApi(
    () => enrolments.list({ student: user?.id, status: 'active' }),
    [user?.id]
  )
  const enrolList = enrolData?.results || enrolData || []

  useEffect(() => {
    if (enrolList.length && !activeClassId) setActiveClassId(enrolList[0].id)
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

  // Active enrolment
  const activeEnrol = enrolList.find(e => e.id === activeClassId)
  const classSkills = skillDefs // show all tricks; could filter by class level

  const unlockedCount = classSkills.filter(d => skillProgress[d.name]?.teacher).length
  const totalCount = classSkills.length

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
  const chatEndRef = useRef(null)

  const chatEnrol = enrolList.find(e => e.id === chatClassId)

  useEffect(() => {
    if (!chatClassId) return
    helpdesk.conversations({ class: chatClassId }).then(res => {
      const msgs = res.data?.results || res.data || []
      setChatMessages(prev => ({ ...prev, [chatClassId]: msgs }))
    }).catch(() => {
      setChatMessages(prev => ({ ...prev, [chatClassId]: null })) // null = endpoint unavailable
    })
  }, [chatClassId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatClassId])

  function sendChatMessage() {
    if (!chatInput.trim() || !chatClassId) return
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
    helpdesk.createConversation({ class: chatClassId, body: text })
      .catch(() => {})
      .finally(() => setChatLoading(false))
  }

  const tabs = [
    ['tricks', 'Tricks'],
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
              {/* Class selector */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {enrolList.map(e => {
                  const name = e.session_detail?.name || e.session?.name || `Class ${e.id}`
                  const active = e.id === activeClassId
                  return (
                    <button
                      key={e.id}
                      onClick={() => setActiveClassId(e.id)}
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

              {activeEnrol && (
                <>
                  {/* Progress card */}
                  <div className="card" style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
                      {activeEnrol.session_detail?.name || activeEnrol.session?.name || 'Your Class'}
                    </div>
                    {activeEnrol.session_detail?.studio_detail?.name && (
                      <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 12 }}>
                        {activeEnrol.session_detail.studio_detail.name}
                      </div>
                    )}
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
                  {classSkills.length === 0 ? (
                    <div className="empty-state">Your instructor will track tricks here</div>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 10,
                      }}
                      className="trick-grid"
                    >
                      {classSkills.map(def => {
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

      {/* ── RESOURCES TAB ── */}
      {mainTab === 'resources' && (
        <div>
          {mediaList.length === 0 ? (
            <div className="empty-state">No resources uploaded yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {mediaList.map(item => {
                const badge = TYPE_BADGE[item.media_type] || TYPE_BADGE.image
                const label = item.media_type === 'video' ? 'Watch' : 'View'
                return (
                  <div
                    key={item.id}
                    className="card"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span
                          style={{
                            background: badge.color,
                            color: badge.textColor,
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title || item.name || 'Resource'}
                      </div>
                      {item.description && (
                        <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{item.description}</div>
                      )}
                    </div>
                    {(item.url || item.file) && (
                      <a
                        href={item.url || item.file}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm"
                        style={{ flexShrink: 0, textDecoration: 'none' }}
                      >
                        {label}
                      </a>
                    )}
                  </div>
                )
              })}
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
                  const name = e.session_detail?.name || e.session?.name || `Class ${e.id}`
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
                <div style={{ display: 'flex', flexDirection: 'column', height: 420 }}>
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
                      <div className="empty-state">Class chat coming soon</div>
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
                      placeholder={`Message ${chatEnrol?.session_detail?.name || 'your class'}…`}
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
    </div>
  )
}
