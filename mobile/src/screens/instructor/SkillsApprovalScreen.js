import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, Alert,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../contexts/AuthContext'
import { skills } from '../../api'

const LEVEL_COLORS = {
  beginner:     { bg: 'rgba(29,78,216,0.2)', text: '#93bbff' },
  intermediate: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  advanced:     { bg: 'rgba(204,255,0,0.12)', text: '#ccff00' },
  expert:       { bg: 'rgba(176,160,255,0.15)', text: '#b0a0ff' },
}

function LevelBadge({ level }) {
  if (!level) return null
  const key = level.toLowerCase()
  const colors = LEVEL_COLORS[key] ?? { bg: '#1a1a1a', text: '#aaa' }
  return (
    <View style={[s.levelBadge, { backgroundColor: colors.bg }]}>
      <Text style={[s.levelBadgeText, { color: colors.text }]}>
        {level}
      </Text>
    </View>
  )
}

function SkillRow({ studentId, skill, onConfirmed }) {
  const [confirming, setConfirming] = useState(false)

  async function handleConfirm() {
    setConfirming(true)
    try {
      await skills.save(studentId, {
        skill_name: skill.skill_name,
        level: skill.level,
        self_assessed: false,
      })
      onConfirmed()
    } catch (err) {
      Alert.alert(
        'Error',
        err.response?.data?.detail || 'Could not confirm skill. Please try again.',
      )
    } finally {
      setConfirming(false)
    }
  }

  return (
    <View style={s.skillRow}>
      <View style={s.skillInfo}>
        <Text style={s.skillName}>{skill.skill_name}</Text>
        <LevelBadge level={skill.level} />
      </View>
      <TouchableOpacity
        style={[s.confirmBtn, confirming && s.confirmBtnDisabled]}
        onPress={handleConfirm}
        disabled={confirming}
        accessibilityLabel={`Confirm ${skill.skill_name}`}
      >
        {confirming
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={s.confirmBtnText}>✓</Text>
        }
      </TouchableOpacity>
    </View>
  )
}

function StudentGroup({ group, onSkillConfirmed }) {
  const [removedKeys, setRemovedKeys] = useState(new Set())

  function handleConfirmed(skillName) {
    setRemovedKeys(prev => new Set([...prev, skillName]))
    onSkillConfirmed()
  }

  const visibleSkills = group.skills.filter(sk => !removedKeys.has(sk.skill_name))

  if (visibleSkills.length === 0) return null

  return (
    <View style={s.groupCard}>
      <View style={s.groupHeader}>
        <View>
          <Text style={s.groupStudentName}>{group.student_name}</Text>
          <Text style={s.groupCount}>
            {visibleSkills.length} skill{visibleSkills.length !== 1 ? 's' : ''} pending
          </Text>
        </View>
      </View>
      <View style={s.groupBody}>
        {visibleSkills.map(skill => (
          <SkillRow
            key={skill.skill_name}
            studentId={group.student_id}
            skill={skill}
            onConfirmed={() => handleConfirmed(skill.skill_name)}
          />
        ))}
      </View>
    </View>
  )
}

export default function SkillsApprovalScreen() {
  const { data, loading, error, refetch } = useApi(() => skills.pendingAll(), [])
  const [refreshing, setRefreshing] = useState(false)

  const groups = data ?? []

  const totalPending = groups.reduce((acc, g) => acc + g.skills.length, 0)

  async function handleRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  if (loading && !refreshing) {
    return (
      <View style={s.root}>
        <Text style={s.heading}>Skill Approvals</Text>
        <ActivityIndicator style={{ marginTop: 40 }} color="#ccff00" />
      </View>
    )
  }

  if (error) {
    return (
      <View style={s.root}>
        <Text style={s.heading}>Skill Approvals</Text>
        <Text style={s.errorText}>{error}</Text>
      </View>
    )
  }

  return (
    <View style={s.root}>
      <Text style={s.heading}>Skill Approvals</Text>
      <Text style={s.subheading}>
        {totalPending > 0
          ? `${totalPending} skill${totalPending !== 1 ? 's' : ''} awaiting confirmation`
          : 'All skills confirmed'}
      </Text>

      <FlatList
        data={groups}
        keyExtractor={g => String(g.student_id)}
        contentContainerStyle={s.list}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>✅</Text>
            <Text style={s.emptyTitle}>No pending skills to approve</Text>
            <Text style={s.emptyBody}>
              Students who self-assess skills will appear here for your review.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <StudentGroup
            group={item}
            onSkillConfirmed={refetch}
          />
        )}
      />
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  heading: { fontSize: 20, fontWeight: '700', color: '#fff', padding: 16, paddingBottom: 2 },
  subheading: { fontSize: 13, color: '#888', paddingHorizontal: 16, marginBottom: 8 },
  list: { padding: 16, paddingBottom: 40 },
  errorText: { textAlign: 'center', color: '#ef4444', marginTop: 40, paddingHorizontal: 24 },

  // Student group card
  groupCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  groupStudentName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  groupCount: { fontSize: 12, color: '#888', marginTop: 2 },
  groupBody: { paddingHorizontal: 16, paddingBottom: 6 },

  // Skill row
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1a1a1a',
  },
  skillInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, flexWrap: 'wrap', gap: 8 },
  skillName: { fontSize: 14, fontWeight: '500', color: '#fff' },

  // Level badge
  levelBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  levelBadgeText: { fontSize: 11, fontWeight: '600' },

  // Confirm button
  confirmBtn: {
    backgroundColor: '#10b981',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    flexShrink: 0,
  },
  confirmBtnDisabled: { backgroundColor: '#6ee7b7' },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#ccc', marginBottom: 6 },
  emptyBody: { fontSize: 13, color: '#555', textAlign: 'center', lineHeight: 19 },
})
