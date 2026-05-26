import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
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

function SkillRow({ studentId, skill, onReviewed }) {
  const [status, setStatus] = useState(null)
  const [noteModalVisible, setNoteModalVisible] = useState(false)
  const [pendingStatus, setPendingStatus] = useState(null)
  const [noteText, setNoteText] = useState('')

  async function handleReview(instructorStatus, notes) {
    setStatus('saving')
    try {
      await skills.save(studentId, {
        skill_name: skill.skill_name,
        level: skill.level,
        self_assessed: skill.self_assessed,
        teacher_confirmed: instructorStatus === 'approved',
        instructor_status: instructorStatus,
        ...(notes ? { instructor_notes: notes } : {}),
      })
      setStatus(instructorStatus)
      if (instructorStatus === 'approved') onReviewed()
    } catch (err) {
      Alert.alert(
        'Error',
        err.response?.data?.detail || 'Could not save. Please try again.',
      )
      setStatus(null)
    }
  }

  function openNoteModal(instructorStatus) {
    setPendingStatus(instructorStatus)
    setNoteText('')
    setNoteModalVisible(true)
  }

  function confirmNote() {
    setNoteModalVisible(false)
    handleReview(pendingStatus, noteText.trim())
  }

  return (
    <View style={s.skillRow}>
      <Modal
        visible={noteModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <KeyboardAvoidingView style={s.noteOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.noteSheet}>
            <Text style={s.noteTitle}>Add a note for the student</Text>
            <Text style={s.noteWarning}>⚠ This note will be visible to the student</Text>
            <TextInput
              style={s.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Type a note..."
              placeholderTextColor="#555"
              multiline
              autoFocus
            />
            <View style={s.noteBtnRow}>
              <TouchableOpacity style={s.noteCancelBtn} onPress={() => setNoteModalVisible(false)}>
                <Text style={s.noteCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.noteConfirmBtn} onPress={confirmNote}>
                <Text style={s.noteConfirmBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <View style={s.skillInfo}>
        <Text style={s.skillName}>{skill.skill_name}</Text>
        <LevelBadge level={skill.level} />
      </View>
      {status === 'saving' ? (
        <ActivityIndicator color="#ccff00" size="small" style={{ marginLeft: 12 }} />
      ) : status === 'approved' ? (
        <Text style={s.doneApproved}>Yes ✓</Text>
      ) : status === 'not_quite' ? (
        <Text style={s.doneNotQuite}>Not Quite ✓</Text>
      ) : status === 'not_approved' ? (
        <Text style={s.doneNo}>Not Yet ✓</Text>
      ) : (
        <View style={s.btnRow}>
          <TouchableOpacity
            style={s.approveBtn}
            onPress={() => handleReview('approved')}
            accessibilityLabel={`Yes — approve ${skill.skill_name}`}
          >
            <Text style={s.approveBtnText}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.notQuiteBtn}
            onPress={() => openNoteModal('not_quite')}
            accessibilityLabel={`Not quite ${skill.skill_name}`}
          >
            <Text style={s.notQuiteBtnText}>Not Quite</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.noBtn}
            onPress={() => openNoteModal('not_approved')}
            accessibilityLabel={`Not yet — ${skill.skill_name}`}
          >
            <Text style={s.noBtnText}>Not Yet</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

function StudentGroup({ group, onSkillConfirmed, onApproveAll }) {
  const [removedKeys, setRemovedKeys] = useState(new Set())
  const [approvingAll, setApprovingAll] = useState(false)

  function handleConfirmed(skillName) {
    setRemovedKeys(prev => new Set([...prev, skillName]))
    onSkillConfirmed()
  }

  async function handleApproveAll() {
    setApprovingAll(true)
    try {
      const skillObjects = group.skills.map(s => ({ skill_name: s.skill_name, level: s.level || '' }))
      const skillNames = skillObjects.map(s => s.skill_name)
      await skills.batchApprove(group.student_id, skillObjects)
      setRemovedKeys(new Set(skillNames))
      onSkillConfirmed()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not approve all. Please try again.')
    } finally {
      setApprovingAll(false)
    }
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
        <TouchableOpacity
          style={[s.approveAllBtn, approvingAll && s.approveAllBtnDisabled]}
          onPress={handleApproveAll}
          disabled={approvingAll}
        >
          {approvingAll
            ? <ActivityIndicator color="#000" size="small" />
            : <Text style={s.approveAllBtnText}>Approve All</Text>
          }
        </TouchableOpacity>
      </View>
      <View style={s.groupBody}>
        {visibleSkills.map(skill => (
          <SkillRow
            key={skill.skill_name}
            studentId={group.student_id}
            skill={skill}
            onReviewed={() => handleConfirmed(skill.skill_name)}
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
          ? `${totalPending} skill${totalPending !== 1 ? 's' : ''} awaiting review`
          : 'All skills reviewed'}
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
            <Text style={s.emptyTitle}>No pending skills to review</Text>
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

  groupCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e1e1e',
  },
  groupStudentName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  groupCount: { fontSize: 12, color: '#888', marginTop: 2 },
  groupBody: { paddingHorizontal: 16, paddingBottom: 6 },

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

  levelBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  levelBadgeText: { fontSize: 11, fontWeight: '600' },

  btnRow: { flexDirection: 'row', gap: 6, marginLeft: 12, flexShrink: 0 },

  approveBtn: {
    backgroundColor: '#ccff00',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtnText: { color: '#000', fontWeight: '700', fontSize: 12 },

  notQuiteBtn: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notQuiteBtnText: { color: '#f59e0b', fontWeight: '700', fontSize: 12 },

  noBtn: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 12 },

  doneApproved: { fontSize: 11, color: '#ccff00', fontWeight: '600', marginLeft: 12 },
  doneNotQuite: { fontSize: 11, color: '#f59e0b', fontWeight: '600', marginLeft: 12 },
  doneNo: { fontSize: 11, color: '#ef4444', fontWeight: '600', marginLeft: 12 },

  approveAllBtn: {
    backgroundColor: '#ccff00',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  approveAllBtnDisabled: { backgroundColor: 'rgba(204,255,0,0.3)' },
  approveAllBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#ccc', marginBottom: 6 },
  emptyBody: { fontSize: 13, color: '#555', textAlign: 'center', lineHeight: 19 },

  noteOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  noteSheet: {
    backgroundColor: '#111', borderRadius: 16,
    padding: 20, width: '100%',
  },
  noteTitle: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 6 },
  noteWarning: { fontSize: 11, color: '#f59e0b', marginBottom: 14 },
  noteInput: {
    backgroundColor: '#000', borderWidth: 1, borderColor: '#333',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#fff', minHeight: 80, textAlignVertical: 'top',
  },
  noteBtnRow: { flexDirection: 'row', gap: 10, marginTop: 16, justifyContent: 'flex-end' },
  noteCancelBtn: {
    borderWidth: 1, borderColor: '#333', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  noteCancelBtnText: { color: '#888', fontWeight: '600', fontSize: 14 },
  noteConfirmBtn: {
    backgroundColor: '#ccff00', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  noteConfirmBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
})
