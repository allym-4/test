import { useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { skills as skillsApi, challenges as challengesApi } from '../../api'

// ─── Helpers ───────────────────────────────────────────────────────────────

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

// ─── Skill status badge ─────────────────────────────────────────────────────

function StatusBadge({ status }) {
  if (status === 'signed_off') {
    return (
      <View style={[s.badge, s.badgeGreen]}>
        <Text style={s.badgeTextGreen}>✓</Text>
      </View>
    )
  }
  if (status === 'pending') {
    return (
      <View style={[s.badge, s.badgeAmber]}>
        <Text style={s.badgeTextAmber}>⏳</Text>
      </View>
    )
  }
  return (
    <View style={[s.badge, s.badgeGrey]}>
      <Text style={s.badgeTextGrey}>○</Text>
    </View>
  )
}

// ─── Progress bar ───────────────────────────────────────────────────────────

function ProgressBar({ value, total, color = '#6366f1' }) {
  const pct = total > 0 ? Math.min(value / total, 1) : 0
  return (
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
    </View>
  )
}

// ─── Group section ──────────────────────────────────────────────────────────

function GroupSection({ groupName, items }) {
  const [open, setOpen] = useState(false)
  const signedOff = items.filter(i => i.status === 'signed_off').length
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
        <ProgressBar value={signedOff} total={items.length} color={signedOff === items.length ? '#10b981' : '#6366f1'} />
      </View>
      {open && items.map(skill => (
        <View key={skill.id} style={s.skillRow}>
          <Text style={s.skillName}>{skill.definition?.name ?? '—'}</Text>
          <View style={s.skillRight}>
            {skill.signed_off_by && (
              <Text style={s.signedBy}>{skill.signed_off_by.display_name} · {timeAgo(skill.signed_off_at)}</Text>
            )}
            <StatusBadge status={skill.status} />
          </View>
        </View>
      ))}
    </View>
  )
}

// ─── Skills tab ─────────────────────────────────────────────────────────────

function SkillsTab({ userId }) {
  const { data, loading, error, refetch } = useApi(() => skillsApi.list(userId), [userId])
  const [refreshing, setRefreshing] = useState(false)

  async function onRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  if (loading && !refreshing) {
    return <ActivityIndicator size="large" color="#6366f1" style={s.centered} />
  }
  if (error) {
    return <Text style={s.errorText}>{error}</Text>
  }

  const allSkills = data ?? []

  // Group by level → group
  const byLevel = groupBy(allSkills, s => s.definition?.group?.level?.name ?? 'Other')

  return (
    <ScrollView
      style={s.tabContent}
      contentContainerStyle={s.tabPad}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
    >
      {Object.entries(byLevel).map(([levelName, levelSkills]) => {
        const byGroup = groupBy(levelSkills, sk => sk.definition?.group?.name ?? 'Other')
        return (
          <View key={levelName} style={s.levelSection}>
            <Text style={s.levelHeading}>{levelName}</Text>
            {Object.entries(byGroup).map(([groupName, groupSkills]) => (
              <GroupSection key={groupName} groupName={groupName} items={groupSkills} />
            ))}
          </View>
        )
      })}
      {allSkills.length === 0 && (
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>No skills yet</Text>
          <Text style={s.emptyBody}>Skills will appear here once your teacher assigns them.</Text>
        </View>
      )}
    </ScrollView>
  )
}

// ─── Challenge card ─────────────────────────────────────────────────────────

function ChallengeCard({ item, onToggle, toggling }) {
  const pct = item.target > 0 ? Math.min(item.my_progress / item.target, 1) : 0
  return (
    <View style={[s.challengeCard, item.is_opted_in && s.challengeCardActive]}>
      <View style={s.challengeTop}>
        <Text style={s.challengeName}>{item.name}</Text>
        {item.is_opted_in && <View style={s.optedBadge}><Text style={s.optedBadgeText}>Joined</Text></View>}
      </View>
      {!!item.description && <Text style={s.challengeDesc}>{item.description}</Text>}
      <View style={s.challengeProgressRow}>
        <ProgressBar value={item.my_progress ?? 0} total={item.target ?? 1} color="#6366f1" />
        <Text style={s.challengeProgressLabel}>{item.my_progress ?? 0} / {item.target ?? 0}</Text>
      </View>
      <TouchableOpacity
        style={[s.optBtn, item.is_opted_in ? s.optBtnOut : s.optBtnIn]}
        onPress={() => onToggle(item)}
        disabled={toggling}
        activeOpacity={0.8}
      >
        {toggling
          ? <ActivityIndicator size="small" color={item.is_opted_in ? '#6366f1' : '#fff'} />
          : <Text style={item.is_opted_in ? s.optBtnTextOut : s.optBtnTextIn}>
              {item.is_opted_in ? 'Leave challenge' : 'Join challenge'}
            </Text>
        }
      </TouchableOpacity>
    </View>
  )
}

// ─── Challenges tab ──────────────────────────────────────────────────────────

function ChallengesTab() {
  const { data, loading, error, refetch } = useApi(() => challengesApi.list(), [])
  const [refreshing, setRefreshing] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  async function onRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  async function handleToggle(item) {
    setTogglingId(item.id)
    try {
      if (item.is_opted_in) {
        await challengesApi.optOut(item.id)
      } else {
        await challengesApi.optIn(item.id)
      }
      refetch()
    } catch (_) {
      // silent
    } finally {
      setTogglingId(null)
    }
  }

  if (loading && !refreshing) {
    return <ActivityIndicator size="large" color="#6366f1" style={s.centered} />
  }
  if (error) {
    return <Text style={s.errorText}>{error}</Text>
  }

  const all = data?.results ?? data ?? []
  const sorted = [...all].sort((a, b) => (b.is_opted_in ? 1 : 0) - (a.is_opted_in ? 1 : 0))

  return (
    <ScrollView
      style={s.tabContent}
      contentContainerStyle={s.tabPad}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
    >
      {sorted.map(item => (
        <ChallengeCard
          key={item.id}
          item={item}
          onToggle={handleToggle}
          toggling={togglingId === item.id}
        />
      ))}
      {sorted.length === 0 && (
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>No challenges</Text>
          <Text style={s.emptyBody}>Check back soon for new challenges from your studio.</Text>
        </View>
      )}
    </ScrollView>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const { user } = useAuth()
  const [tab, setTab] = useState('skills')

  return (
    <View style={s.root}>
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'skills' && s.tabBtnActive]}
          onPress={() => setTab('skills')}
          activeOpacity={0.8}
        >
          <Text style={[s.tabBtnText, tab === 'skills' && s.tabBtnTextActive]}>Skills</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'challenges' && s.tabBtnActive]}
          onPress={() => setTab('challenges')}
          activeOpacity={0.8}
        >
          <Text style={[s.tabBtnText, tab === 'challenges' && s.tabBtnTextActive]}>Challenges</Text>
        </TouchableOpacity>
      </View>

      {tab === 'skills' ? <SkillsTab userId={user?.id} /> : <ChallengesTab />}
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, marginTop: 80 },
  errorText: { textAlign: 'center', color: '#ef4444', marginTop: 40, fontSize: 14 },

  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#6366f1' },
  tabBtnText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  tabBtnTextActive: { color: '#6366f1' },

  tabContent: { flex: 1 },
  tabPad: { padding: 16, paddingBottom: 32 },

  // Level heading
  levelSection: { marginBottom: 20 },
  levelHeading: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },

  // Group card
  groupCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  groupHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  groupCount: { fontSize: 13, color: '#6b7280' },
  chevron: { fontSize: 11, color: '#9ca3af' },
  groupBarWrap: { paddingHorizontal: 14, paddingBottom: 12 },

  // Skill row
  skillRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  skillName: { fontSize: 14, color: '#374151', flex: 1, marginRight: 8 },
  skillRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signedBy: { fontSize: 11, color: '#9ca3af' },

  // Badge
  badge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badgeGreen: { backgroundColor: '#d1fae5' },
  badgeAmber: { backgroundColor: '#fef3c7' },
  badgeGrey: { backgroundColor: '#f3f4f6' },
  badgeTextGreen: { fontSize: 12, color: '#059669' },
  badgeTextAmber: { fontSize: 12, color: '#d97706' },
  badgeTextGrey: { fontSize: 12, color: '#9ca3af' },

  // Progress bar
  barTrack: { height: 6, borderRadius: 3, backgroundColor: '#e5e7eb', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },

  // Challenge card
  challengeCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  challengeCardActive: { borderWidth: 1.5, borderColor: '#6366f1' },
  challengeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  challengeName: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  challengeDesc: { fontSize: 14, color: '#6b7280', marginBottom: 12, lineHeight: 20 },
  challengeProgressRow: { gap: 6, marginBottom: 14 },
  challengeProgressLabel: { fontSize: 12, color: '#6b7280', textAlign: 'right' },
  optedBadge: { backgroundColor: '#ede9fe', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  optedBadgeText: { fontSize: 12, fontWeight: '600', color: '#6366f1' },
  optBtn: { borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  optBtnIn: { backgroundColor: '#6366f1' },
  optBtnOut: { backgroundColor: '#f3f4f6' },
  optBtnTextIn: { fontSize: 14, fontWeight: '600', color: '#fff' },
  optBtnTextOut: { fontSize: 14, fontWeight: '600', color: '#6366f1' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptyBody: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 32 },
})
