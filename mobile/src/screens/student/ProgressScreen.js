import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, KeyboardAvoidingView,
  Platform, FlatList, Linking, Modal, Alert,
} from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { enrolments, skills as skillsApi, media, classes, challenges as challengesApi } from '../../api'
import client from '../../api/client'

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const k = keyFn(item)
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

// ─── Progress bar ────────────────────────────────────────────────────────────

function ProgressBar({ value, total, color = '#ccff00' }) {
  const pct = total > 0 ? Math.min(value / total, 1) : 0
  return (
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
    </View>
  )
}

// ─── Group section (Skills) ──────────────────────────────────────────────────

function GroupSection({ groupName, items, skillProgress }) {
  const [open, setOpen] = useState(false)
  const signedOff = items.filter(d => skillProgress[d.name]?.teacher).length
  return (
    <View style={s.groupCard}>
      <TouchableOpacity onPress={() => setOpen(v => !v)} activeOpacity={0.7} style={s.groupHeader}>
        <View style={s.groupHeaderLeft}>
          <Text style={s.groupName}>{groupName}</Text>
          <Text style={s.groupCount}>{signedOff}/{items.length}</Text>
        </View>
        <Text style={s.chevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      <View style={s.groupBarWrap}>
        <ProgressBar value={signedOff} total={items.length} color={signedOff === items.length ? '#ccff00' : '#7c3aed'} />
      </View>
      {open && items.map(skill => {
        const prog = skillProgress[skill.name] || {}
        return (
          <View key={skill.id} style={s.skillRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={s.skillName}>{skill.name}</Text>
              {skill.groupName && <Text style={s.skillGroup}>{skill.groupName}</Text>}
            </View>
            <View style={s.skillRight}>
              {prog.teacher ? (
                <View style={s.badgeGreen}><Text style={s.badgeTextGreen}>✓ Unlocked</Text></View>
              ) : prog.self ? (
                <View style={s.badgeAmber}><Text style={s.badgeTextAmber}>Self-assessed</Text></View>
              ) : (
                <View style={s.badgeGrey}><Text style={s.badgeTextGrey}>Not yet</Text></View>
              )}
            </View>
          </View>
        )
      })}
    </View>
  )
}

// ─── Tricks Tab ──────────────────────────────────────────────────────────────

function TricksTab({ userId, enrolList }) {
  const [activeClassId, setActiveClassId] = useState(null)
  const [skillProgress, setSkillProgress] = useState({})
  const [selfAssessed, setSelfAssessed] = useState({})
  const [skillDefs, setSkillDefs] = useState([])
  const [defsLoading, setDefsLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (enrolList.length && !activeClassId) setActiveClassId(enrolList[0].id)
  }, [enrolList.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!userId) return
    skillsApi.list(userId).then(res => {
      const raw = res.data?.results || res.data || []
      const map = {}
      for (const s of raw) {
        map[s.skill_name] = { self: s.self_assessed, teacher: s.teacher_confirmed, id: s.id }
      }
      setSkillProgress(map)
    }).catch(() => setSkillProgress({}))
  }, [userId])

  useEffect(() => {
    setDefsLoading(true)
    client.get('/api/users/skill-levels/').then(res => {
      const levels = res.data?.results || res.data || []
      return Promise.all(
        levels.map(lv =>
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
      ).then(all => {
        setSkillDefs(all.flat())
        setDefsLoading(false)
      })
    }).catch(() => {
      setSkillDefs([])
      setDefsLoading(false)
    })
  }, [])

  const activeEnrol = enrolList.find(e => e.id === activeClassId)
  const byLevel = groupBy(skillDefs, d => d.levelName || 'Other')
  const unlockedCount = skillDefs.filter(d => skillProgress[d.name]?.teacher).length
  const selfAssessedNames = Object.entries(selfAssessed).filter(([, v]) => v).map(([k]) => k)

  async function submitSelfAssessed() {
    if (!userId || selfAssessedNames.length === 0) return
    setSubmitting(true)
    try {
      for (const name of selfAssessedNames) {
        const current = skillProgress[name] || {}
        await skillsApi.save(userId, {
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
      Alert.alert('Submitted', `${selfAssessedNames.length} trick${selfAssessedNames.length > 1 ? 's' : ''} sent to your instructor.`)
    } finally {
      setSubmitting(false)
    }
  }

  if (enrolList.length === 0) {
    return (
      <View style={s.emptyState}>
        <Text style={s.emptyTitle}>No active enrolments</Text>
        <Text style={s.emptyBody}>Enrol in a class to track your tricks.</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Class selector */}
      {enrolList.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.classSelector} contentContainerStyle={s.classSelectorContent}>
          {enrolList.map(e => {
            const name = e.class_session_detail?.name || e.session?.name || `Class ${e.id}`
            const active = e.id === activeClassId
            return (
              <TouchableOpacity
                key={e.id}
                onPress={() => setActiveClassId(e.id)}
                style={[s.classSelectorBtn, active && s.classSelectorBtnActive]}
              >
                <Text style={[s.classSelectorText, active && s.classSelectorTextActive]}>{name}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.tabPad}>
        {/* Progress card */}
        {activeEnrol && (
          <View style={s.progressCard}>
            <Text style={s.progressCardTitle}>
              {activeEnrol.class_session_detail?.name || activeEnrol.session?.name || 'Your Class'}
            </Text>
            {skillDefs.length > 0 ? (
              <>
                <Text style={s.progressCardSub}>{unlockedCount} of {skillDefs.length} tricks unlocked</Text>
                <ProgressBar value={unlockedCount} total={skillDefs.length} />
              </>
            ) : (
              <Text style={s.progressCardSub}>Your instructor will track tricks here</Text>
            )}
          </View>
        )}

        {/* Skill definitions by level */}
        {defsLoading ? (
          <ActivityIndicator size="large" color="#ccff00" style={{ marginTop: 40 }} />
        ) : skillDefs.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>No tricks yet</Text>
            <Text style={s.emptyBody}>Your instructor will track tricks here.</Text>
          </View>
        ) : (
          Object.entries(byLevel).map(([levelName, levelDefs]) => {
            const byGroup = groupBy(levelDefs, d => d.groupName || 'Other')
            return (
              <View key={levelName} style={s.levelSection}>
                <Text style={s.levelHeading}>{levelName}</Text>
                {Object.entries(byGroup).map(([groupName, groupDefs]) => (
                  <GroupSection
                    key={groupName}
                    groupName={groupName}
                    items={groupDefs}
                    skillProgress={skillProgress}
                  />
                ))}
              </View>
            )
          })
        )}
      </ScrollView>

      {/* Submit self-assessed banner */}
      {selfAssessedNames.length > 0 && (
        <View style={s.submitBanner}>
          <Text style={s.submitBannerText}>{selfAssessedNames.length} trick{selfAssessedNames.length > 1 ? 's' : ''} self-assessed</Text>
          <TouchableOpacity style={s.submitBannerBtn} onPress={submitSelfAssessed} disabled={submitting}>
            {submitting
              ? <ActivityIndicator size="small" color="#000" />
              : <Text style={s.submitBannerBtnText}>Submit to instructor</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ─── Challenges Tab ───────────────────────────────────────────────────────────

function LeaderboardModal({ challenge, onClose, userId }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!challenge) return
    challengesApi.leaderboard(challenge.id)
      .then(res => setData(res.data?.results || res.data || []))
      .catch(() => setData([]))
  }, [challenge?.id])

  if (!challenge) return null
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalBox}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Leaderboard — {challenge.title}</Text>
            <TouchableOpacity onPress={onClose}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 400 }}>
            {data === null ? (
              <ActivityIndicator color="#ccff00" style={{ marginTop: 20 }} />
            ) : data.length === 0 ? (
              <Text style={s.emptyBody}>No participants yet.</Text>
            ) : data.map((entry, i) => {
              const pct = Math.min(100, ((entry.current_value || 0) / challenge.target_value) * 100)
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
              const isMe = entry.student_id === userId
              return (
                <View key={entry.id || i} style={[s.lbRow, isMe && s.lbRowMe]}>
                  <Text style={s.lbRank}>{medal || `#${i + 1}`}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={s.lbNameRow}>
                      <Text style={[s.lbName, isMe && { fontWeight: '700' }]}>
                        {entry.student_name}{isMe ? ' (you)' : ''}
                      </Text>
                      <Text style={[s.lbScore, entry.completed && { color: '#ccff00' }]}>
                        {entry.completed ? 'Done!' : `${entry.current_value}/${challenge.target_value}`}
                      </Text>
                    </View>
                    <ProgressBar value={entry.current_value || 0} total={challenge.target_value} color={entry.completed ? '#ccff00' : '#7c3aed'} />
                  </View>
                </View>
              )
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function ChallengesTab() {
  const { user } = useAuth()
  const { data, loading, refetch } = useApi(() => challengesApi.list({ active: 'true' }), [])
  const [refreshing, setRefreshing] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [leaderboardChallenge, setLeaderboardChallenge] = useState(null)

  async function onRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  async function handleToggle(item) {
    setTogglingId(item.id)
    try {
      const prog = item.my_progress
      const joined = prog && (prog.current_value > 0 || prog.completed)
      if (joined) {
        await challengesApi.optOut(item.id)
      } else {
        await challengesApi.optIn(item.id)
      }
      refetch()
    } catch {
      // silent
    } finally {
      setTogglingId(null)
    }
  }

  const all = data?.results || data || []

  return (
    <>
      <LeaderboardModal
        challenge={leaderboardChallenge}
        onClose={() => setLeaderboardChallenge(null)}
        userId={user?.id}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.tabPad}
        refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} tintColor="#ccff00" />}
      >
        {all.length === 0 && !loading && (
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>No active challenges</Text>
            <Text style={s.emptyBody}>Check back soon for new challenges from your studio.</Text>
          </View>
        )}
        {all.map(c => {
          const prog = c.my_progress
          const joined = prog && (prog.current_value > 0 || prog.completed)
          const pct = Math.min(100, ((prog?.current_value || 0) / c.target_value) * 100)
          const daysLeft = c.end_date ? Math.max(0, Math.ceil((new Date(c.end_date) - new Date()) / 86400000)) : null
          return (
            <View key={c.id} style={s.challengeCard}>
              <View style={s.challengeTop}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={s.challengeName}>{c.title}</Text>
                  {c.description ? <Text style={s.challengeDesc}>{c.description}</Text> : null}
                </View>
                {prog?.completed && <View style={s.completedBadge}><Text style={s.completedBadgeText}>Complete!</Text></View>}
              </View>

              <View style={s.challengeMeta}>
                <Text style={s.challengeMetaText}>Target: <Text style={s.challengeMetaVal}>{c.target_value}</Text></Text>
                {c.end_date ? (
                  <Text style={s.challengeMetaText}>
                    Ends: <Text style={s.challengeMetaVal}>
                      {new Date(c.end_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </Text>
                    {daysLeft > 0 ? ` (${daysLeft}d left)` : ''}
                  </Text>
                ) : null}
                {c.reward_type && c.reward_type !== 'none' ? (
                  <Text style={s.challengeMetaText}>
                    Reward: <Text style={{ color: '#ccff00' }}>
                      {c.reward_type === 'badge' ? `"${c.reward_badge_name}" badge` : `$${c.reward_credit_amount} credit`}
                    </Text>
                  </Text>
                ) : null}
              </View>

              {joined ? (
                <>
                  <View style={s.challengeProgressRow}>
                    <Text style={s.challengeProgressLabel}>Your progress</Text>
                    <Text style={[s.challengeProgressVal, prog?.completed && { color: '#ccff00' }]}>
                      {prog?.current_value || 0} / {c.target_value}
                    </Text>
                  </View>
                  <ProgressBar value={prog?.current_value || 0} total={c.target_value} color={prog?.completed ? '#ccff00' : '#7c3aed'} />
                  <View style={s.challengeActions}>
                    <TouchableOpacity style={s.lbBtn} onPress={() => setLeaderboardChallenge(c)}>
                      <Text style={s.lbBtnText}>Leaderboard</Text>
                    </TouchableOpacity>
                    {!prog?.completed && (
                      <TouchableOpacity
                        style={s.leaveBtn}
                        onPress={() => handleToggle(c)}
                        disabled={togglingId === c.id}
                      >
                        {togglingId === c.id
                          ? <ActivityIndicator size="small" color="#ccff00" />
                          : <Text style={s.leaveBtnText}>Leave</Text>
                        }
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              ) : (
                <TouchableOpacity
                  style={s.joinBtn}
                  onPress={() => handleToggle(c)}
                  disabled={togglingId === c.id}
                >
                  {togglingId === c.id
                    ? <ActivityIndicator size="small" color="#000" />
                    : <Text style={s.joinBtnText}>Join challenge</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          )
        })}
      </ScrollView>
    </>
  )
}

// ─── Resources Tab ────────────────────────────────────────────────────────────

function ResourcesTab({ enrolList }) {
  const { data: mediaData, loading } = useApi(() => media.list(), [])
  const mediaList = mediaData?.results || mediaData || []

  function getIcon(item) {
    const n = (item.name || '').toLowerCase()
    if (item.media_type === 'video' || n.includes('routine')) return '🎬'
    if (n.includes('playlist') || n.includes('music')) return '🎵'
    if (n.includes('warm') || n.includes('stretch')) return '🏃'
    if (item.media_type === 'pdf') return '📄'
    return '📎'
  }

  function openResource(item) {
    const href = item.url || item.file
    if (href) Linking.openURL(href).catch(() => Alert.alert('Error', 'Could not open link.'))
  }

  // Showcase banners
  const showcaseBanners = enrolList.map(enrol => {
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
    const now = new Date(); now.setHours(0, 0, 0, 0)
    const daysUntil = Math.round((showcaseFriday - now) / 86400000)
    if (daysUntil < -14 || daysUntil > 70) return null
    const isPast = daysUntil < 0
    const dateStr = showcaseFriday.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
    const name = enrol.class_session_detail?.name || `Class ${enrol.id}`
    return { enrolId: enrol.id, isPast, dateStr, daysUntil, name }
  }).filter(Boolean)

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.tabPad}>
      {showcaseBanners.map(b => (
        <View key={b.enrolId} style={[s.showcaseBanner, b.isPast ? s.showcaseBannerPast : s.showcaseBannerUpcoming]}>
          <Text style={{ fontSize: 22, marginRight: 10 }}>🎭</Text>
          <View>
            <Text style={s.showcaseTitle}>
              {b.isPast ? 'Showcase was' : 'Showcase'} — {b.name}
            </Text>
            <Text style={s.showcaseSub}>
              {b.isPast ? b.dateStr : b.daysUntil === 0 ? `Today! ${b.dateStr}` : `${b.dateStr} · ${b.daysUntil} day${b.daysUntil !== 1 ? 's' : ''} away`}
            </Text>
          </View>
        </View>
      ))}

      <Text style={s.resourcesNote}>
        Routine videos are released in Week 5 of each season. Other resources like warm-up guides and music playlists are available year-round.
      </Text>

      {loading && <ActivityIndicator color="#ccff00" style={{ marginTop: 20 }} />}

      {!loading && mediaList.length === 0 && (
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>No resources yet</Text>
          <Text style={s.emptyBody}>Your studio will upload resources here.</Text>
        </View>
      )}

      {/* Per-class resources */}
      {enrolList.map(enrol => {
        const sessionId = enrol.class_session || enrol.session?.id
        const items = mediaList.filter(m => m.session === sessionId)
        if (!items.length) return null
        const className = enrol.class_session_detail?.name || enrol.session?.name || `Class ${enrol.id}`
        const seasonName = enrol.class_session_detail?.season_name || ''
        return (
          <View key={enrol.id} style={{ marginBottom: 24 }}>
            <Text style={s.resourceSectionLabel}>
              {className}{seasonName ? ` · ${seasonName}` : ''}
            </Text>
            {items.map(item => {
              const locked = item.available_from && new Date(item.available_from) > new Date()
              const availDate = item.available_from
                ? new Date(item.available_from).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
                : null
              const href = item.url || item.file
              return (
                <View key={item.id} style={[s.resourceItem, locked && s.resourceItemLocked]}>
                  <View style={[s.resourceIcon, locked ? s.resourceIconLocked : s.resourceIconUnlocked]}>
                    <Text style={{ fontSize: 18 }}>{getIcon(item)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.resourceName}>{item.name}</Text>
                    {item.description ? <Text style={s.resourceDesc}>{item.description}</Text> : null}
                    {locked && availDate ? <Text style={s.resourceLockDate}>Available from {availDate}</Text> : null}
                  </View>
                  {locked ? (
                    <Text style={s.resourceLockedLabel}>Locked</Text>
                  ) : href ? (
                    <TouchableOpacity style={s.resourceOpenBtn} onPress={() => openResource(item)}>
                      <Text style={s.resourceOpenText}>Open</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )
            })}
          </View>
        )
      })}

      {/* General resources */}
      {mediaList.filter(m => !m.session).length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <Text style={s.resourceSectionLabel}>General Resources</Text>
          {mediaList.filter(m => !m.session).map(item => {
            const href = item.url || item.file
            return (
              <View key={item.id} style={s.resourceItem}>
                <View style={s.resourceIconUnlocked}>
                  <Text style={{ fontSize: 18 }}>{getIcon(item)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.resourceName}>{item.name}</Text>
                  {item.description ? <Text style={s.resourceDesc}>{item.description}</Text> : null}
                </View>
                {href ? (
                  <TouchableOpacity style={s.resourceOpenBtn} onPress={() => openResource(item)}>
                    <Text style={s.resourceOpenText}>Open</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

// ─── Class Chat Tab ───────────────────────────────────────────────────────────

function ClassChatTab({ enrolList }) {
  const { user } = useAuth()
  const [chatClassId, setChatClassId] = useState(null)
  const [messages, setMessages] = useState({})
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [chatError, setChatError] = useState(null)
  const flatRef = useRef(null)

  useEffect(() => {
    if (enrolList.length && !chatClassId) setChatClassId(enrolList[0].id)
  }, [enrolList.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const chatEnrol = enrolList.find(e => e.id === chatClassId)
  const sessionId = chatEnrol?.class_session || chatEnrol?.session?.id

  useEffect(() => {
    if (!sessionId) return
    classes.chat.list(sessionId)
      .then(res => {
        const msgs = res.data?.results || res.data || []
        setMessages(prev => ({ ...prev, [chatClassId]: msgs }))
      })
      .catch(() => {
        setMessages(prev => ({ ...prev, [chatClassId]: [] }))
      })
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    const text = input.trim()
    if (!text || !sessionId) return
    setInput('')
    const optimistic = {
      id: Date.now(),
      body: text,
      sender_name: user?.first_name || 'Me',
      sender_id: user?.id,
      created_at: new Date().toISOString(),
      _mine: true,
    }
    setMessages(prev => ({ ...prev, [chatClassId]: [...(prev[chatClassId] || []), optimistic] }))
    setSending(true)
    try {
      await classes.chat.send(sessionId, { body: text })
    } catch {
      setChatError('Failed to send message.')
      setTimeout(() => setChatError(null), 4000)
      setMessages(prev => ({
        ...prev,
        [chatClassId]: (prev[chatClassId] || []).filter(m => m.id !== optimistic.id),
      }))
    } finally {
      setSending(false)
    }
  }

  const currentMsgs = messages[chatClassId] || []

  if (enrolList.length === 0) {
    return (
      <View style={s.emptyState}>
        <Text style={s.emptyTitle}>No active enrolments</Text>
        <Text style={s.emptyBody}>Enrol in a class to access class chat.</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
      {/* Class selector */}
      {enrolList.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.classSelector} contentContainerStyle={s.classSelectorContent}>
          {enrolList.map(e => {
            const name = e.class_session_detail?.name || e.session?.name || `Class ${e.id}`
            const active = e.id === chatClassId
            return (
              <TouchableOpacity
                key={e.id}
                onPress={() => setChatClassId(e.id)}
                style={[s.classSelectorBtn, active && s.classSelectorBtnActive]}
              >
                <Text style={[s.classSelectorText, active && s.classSelectorTextActive]}>{name}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      <FlatList
        ref={flatRef}
        data={currentMsgs}
        keyExtractor={m => String(m.id)}
        contentContainerStyle={s.chatList}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <Text style={[s.emptyBody, { textAlign: 'center', marginTop: 40 }]}>No messages yet — say hi to your class!</Text>
        }
        renderItem={({ item: msg }) => {
          const mine = msg._mine || msg.sender_id === user?.id || msg.sender === user?.id
          const ts = msg.created_at
            ? new Date(msg.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
            : ''
          return (
            <View style={[s.chatBubbleWrap, mine && s.chatBubbleWrapMine]}>
              {!mine && <Text style={s.chatSender}>{msg.sender_name || 'Student'}</Text>}
              <View style={[s.chatBubble, mine && s.chatBubbleMine]}>
                <Text style={s.chatText}>{msg.body || msg.message || msg.content}</Text>
              </View>
              {ts ? <Text style={[s.chatTs, mine && { alignSelf: 'flex-end' }]}>{ts}</Text> : null}
            </View>
          )
        }}
      />

      {chatError && <Text style={s.chatError}>{chatError}</Text>}

      <View style={s.chatInputRow}>
        <TextInput
          style={s.chatInput}
          placeholder={`Message ${chatEnrol?.class_session_detail?.name || chatEnrol?.session?.name || 'your class'}…`}
          placeholderTextColor="#555"
          value={input}
          onChangeText={setInput}
          multiline
          returnKeyType="send"
          onSubmitEditing={send}
        />
        <TouchableOpacity style={[s.chatSendBtn, (!input.trim() || sending) && s.chatSendBtnDisabled]} onPress={send} disabled={!input.trim() || sending}>
          {sending ? <ActivityIndicator size="small" color="#000" /> : <Text style={s.chatSendText}>Send</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const { user } = useAuth()
  const [tab, setTab] = useState('tricks')

  const { data: enrolData } = useApi(
    () => enrolments.list({ student: user?.id, status: 'active' }),
    [user?.id]
  )
  const enrolList = enrolData?.results || enrolData || []

  const tabs = [
    ['tricks', 'Tricks'],
    ['challenges', 'Challenges'],
    ['resources', 'Resources'],
    ['chat', 'Chat'],
  ]

  return (
    <View style={s.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabBarContent}>
        {tabs.map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[s.tabBtn, tab === key && s.tabBtnActive]}
            onPress={() => setTab(key)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabBtnText, tab === key && s.tabBtnTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab === 'tricks' && <TricksTab userId={user?.id} enrolList={enrolList} />}
      {tab === 'challenges' && <ChallengesTab />}
      {tab === 'resources' && <ResourcesTab enrolList={enrolList} />}
      {tab === 'chat' && <ClassChatTab enrolList={enrolList} />}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  // Tab bar
  tabBar: { backgroundColor: '#000', borderBottomWidth: 1, borderBottomColor: '#222', flexGrow: 0 },
  tabBarContent: { flexDirection: 'row' },
  tabBtn: { paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#ccff00' },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabBtnTextActive: { color: '#ccff00' },

  tabPad: { padding: 16, paddingBottom: 40 },

  // Class selector
  classSelector: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: '#222' },
  classSelectorContent: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6 },
  classSelectorBtn: { paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  classSelectorBtnActive: { borderBottomColor: '#ccff00' },
  classSelectorText: { fontSize: 13, color: '#666', fontWeight: '500' },
  classSelectorTextActive: { color: '#fff', fontWeight: '700' },

  // Progress card
  progressCard: { backgroundColor: '#111', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#222' },
  progressCardTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  progressCardSub: { fontSize: 13, color: '#888', marginBottom: 10 },

  // Level / group
  levelSection: { marginBottom: 20 },
  levelHeading: { fontSize: 11, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  groupCard: { backgroundColor: '#111', borderRadius: 12, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#222' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  groupHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  groupCount: { fontSize: 13, color: '#666' },
  chevron: { fontSize: 11, color: '#666' },
  groupBarWrap: { paddingHorizontal: 14, paddingBottom: 12 },

  // Skill row
  skillRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#1a1a1a' },
  skillName: { fontSize: 14, color: '#ccc', fontWeight: '500' },
  skillGroup: { fontSize: 11, color: '#555', marginTop: 1 },
  skillRight: { flexDirection: 'row', alignItems: 'center' },
  badgeGreen: { backgroundColor: '#0a2a1a', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTextGreen: { fontSize: 11, fontWeight: '600', color: '#ccff00' },
  badgeAmber: { backgroundColor: '#2a1a00', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTextAmber: { fontSize: 11, fontWeight: '600', color: '#ffaa00' },
  badgeGrey: { backgroundColor: '#1a1a1a', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTextGrey: { fontSize: 11, fontWeight: '600', color: '#555' },

  // Progress bar
  barTrack: { height: 6, borderRadius: 3, backgroundColor: '#222', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },

  // Submit banner
  submitBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111', borderTopWidth: 1, borderTopColor: '#222', padding: 14 },
  submitBannerText: { fontSize: 13, color: '#888' },
  submitBannerBtn: { backgroundColor: '#ccff00', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  submitBannerBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },

  // Challenge card
  challengeCard: { backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  challengeTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  challengeName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  challengeDesc: { fontSize: 13, color: '#888', lineHeight: 18 },
  completedBadge: { backgroundColor: '#0a2a1a', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  completedBadgeText: { fontSize: 11, fontWeight: '700', color: '#ccff00' },
  challengeMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  challengeMetaText: { fontSize: 12, color: '#666' },
  challengeMetaVal: { color: '#fff' },
  challengeProgressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  challengeProgressLabel: { fontSize: 12, color: '#666' },
  challengeProgressVal: { fontSize: 12, color: '#fff' },
  challengeActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  lbBtn: { backgroundColor: '#1a1a1a', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#333' },
  lbBtnText: { fontSize: 12, fontWeight: '600', color: '#ccff00' },
  leaveBtn: { backgroundColor: '#1a1a1a', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#333' },
  leaveBtnText: { fontSize: 12, fontWeight: '600', color: '#ef4444' },
  joinBtn: { backgroundColor: '#ccff00', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  joinBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },

  // Leaderboard modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, borderColor: '#222' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#fff', flex: 1 },
  modalClose: { fontSize: 18, color: '#666', paddingLeft: 12 },
  lbRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  lbRowMe: { backgroundColor: 'rgba(204,255,0,0.04)' },
  lbRank: { width: 28, textAlign: 'center', fontSize: 15, color: '#888' },
  lbNameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  lbName: { fontSize: 13, color: '#fff', fontWeight: '500' },
  lbScore: { fontSize: 12, color: '#666' },

  // Resources
  showcaseBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, marginBottom: 12 },
  showcaseBannerUpcoming: { backgroundColor: 'rgba(204,255,0,0.06)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.2)' },
  showcaseBannerPast: { backgroundColor: 'rgba(255,170,0,0.05)', borderWidth: 1, borderColor: 'rgba(255,170,0,0.2)' },
  showcaseTitle: { fontSize: 13, fontWeight: '600', color: '#fff' },
  showcaseSub: { fontSize: 12, color: '#888', marginTop: 2 },
  resourcesNote: { fontSize: 12, color: '#555', marginBottom: 16, lineHeight: 18 },
  resourceSectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: '#666', marginBottom: 10 },
  resourceItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(204,255,0,0.15)', gap: 12 },
  resourceItemLocked: { borderColor: '#222', opacity: 0.6 },
  resourceIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  resourceIconUnlocked: { backgroundColor: 'rgba(204,255,0,0.08)' },
  resourceIconLocked: { backgroundColor: '#1a1a1a' },
  resourceName: { fontSize: 13, fontWeight: '600', color: '#fff' },
  resourceDesc: { fontSize: 11, color: '#666', marginTop: 2 },
  resourceLockDate: { fontSize: 11, color: '#ffaa00', marginTop: 2 },
  resourceLockedLabel: { fontSize: 10, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.4 },
  resourceOpenBtn: { backgroundColor: '#1a1a1a', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#333' },
  resourceOpenText: { fontSize: 12, fontWeight: '600', color: '#ccff00' },

  // Chat
  chatList: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  chatBubbleWrap: { marginBottom: 10, alignItems: 'flex-start', maxWidth: '80%' },
  chatBubbleWrapMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  chatSender: { fontSize: 10, color: '#666', marginBottom: 3, marginLeft: 4 },
  chatBubble: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: '8px 12px', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#222' },
  chatBubbleMine: { backgroundColor: 'rgba(204,255,0,0.12)', borderColor: 'rgba(204,255,0,0.2)' },
  chatText: { fontSize: 14, color: '#fff', lineHeight: 20 },
  chatTs: { fontSize: 10, color: '#555', marginTop: 3, marginLeft: 4 },
  chatError: { fontSize: 12, color: '#ef4444', textAlign: 'center', padding: 6 },
  chatInputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#222', gap: 8 },
  chatInput: { flex: 1, backgroundColor: '#111', borderRadius: 10, borderWidth: 1, borderColor: '#333', color: '#fff', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  chatSendBtn: { backgroundColor: '#ccff00', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  chatSendBtnDisabled: { opacity: 0.4 },
  chatSendText: { fontSize: 13, fontWeight: '700', color: '#000' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#666', marginBottom: 6 },
  emptyBody: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20 },
})
