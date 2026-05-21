import { useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, ScrollView,
  Modal, RefreshControl,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { homework } from '../../api'
import client from '../../api/client'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function AssignmentCard({ item }) {
  const submitted = item.submission_count ?? 0
  const total = item.total_students ?? item.enrolled_count ?? '?'
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <Text style={s.cardTitle} numberOfLines={2}>{item.title || item.name || 'Assignment'}</Text>
        <View style={s.countBadge}>
          <Text style={s.countBadgeText}>{submitted}/{total}</Text>
        </View>
      </View>
      {item.class_session_name || item.session_name ? (
        <Text style={s.cardMeta}>{item.class_session_name ?? item.session_name}</Text>
      ) : null}
      {item.due_date ? (
        <Text style={s.dueDate}>Due {new Date(item.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</Text>
      ) : null}
    </View>
  )
}

function SubmissionCard({ item }) {
  const studentName = item.student_name || item.student?.display_name || 'Student'
  const assignmentTitle = item.assignment_title || item.assignment?.title || 'Assignment'
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{studentName}</Text>
      <Text style={s.cardMeta}>{assignmentTitle}</Text>
      {item.submitted_at || item.created_at ? (
        <Text style={s.dueDate}>{timeAgo(item.submitted_at ?? item.created_at)}</Text>
      ) : null}
    </View>
  )
}

function SkillPendingCard({ item }) {
  const studentName = item.student_name || item.user?.display_name || 'Student'
  const skillName = item.skill_name || item.skill?.name || 'Skill'
  return (
    <View style={[s.card, s.cardLav]}>
      <Text style={s.cardLavLabel}>SKILL REVIEW PENDING</Text>
      <Text style={s.cardTitle}>{studentName}</Text>
      <Text style={s.cardMeta}>{skillName}</Text>
    </View>
  )
}

function AssignHomeworkModal({ visible, onClose, onSaved }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title.')
      return
    }
    setSaving(true)
    try {
      await client.post('/api/homework/', { title, description, due_date: dueDate || null })
      Alert.alert('Saved', 'Assignment created.')
      setTitle('')
      setDescription('')
      setDueDate('')
      onSaved?.()
      onClose()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not create assignment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.modalRoot}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose} style={s.modalClose}>
            <Text style={s.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={s.modalTitle}>Assign Homework</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={s.modalSaveBtn}>
            {saving ? <ActivityIndicator size="small" color="#ccff00" /> : <Text style={s.modalSaveText}>Save</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
          <Text style={s.fieldLabel}>Title *</Text>
          <TextInput
            style={s.fieldInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Assignment title"
            placeholderTextColor="#555"
          />
          <Text style={s.fieldLabel}>Description</Text>
          <TextInput
            style={[s.fieldInput, s.fieldTextarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional instructions..."
            placeholderTextColor="#555"
            multiline
            textAlignVertical="top"
          />
          <Text style={s.fieldLabel}>Due Date (YYYY-MM-DD)</Text>
          <TextInput
            style={s.fieldInput}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="e.g. 2026-06-01"
            placeholderTextColor="#555"
          />
        </ScrollView>
      </View>
    </Modal>
  )
}

function ActiveTab({ refetchTrigger }) {
  const { data, loading, error, refetch } = useApi(() => homework.list({ status: 'active' }), [refetchTrigger])
  const items = data?.results ?? data ?? []
  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#ccff00" />
      ) : error ? (
        <Text style={s.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#ccff00" />}
          ListEmptyComponent={<Text style={s.emptyText}>No active assignments.</Text>}
          renderItem={({ item }) => <AssignmentCard item={item} />}
        />
      )}
    </View>
  )
}

function SubmittedTab() {
  const { data: subData, loading: subLoading, refetch: refetchSub } = useApi(
    () => homework.submissions({ status: 'submitted' }), []
  )
  const submissions = subData?.results ?? subData ?? []

  const { data: skillData, loading: skillLoading, refetch: refetchSkills } = useApi(
    () => client.get('/api/users/pending-skills/'), []
  )
  const pendingSkills = skillData?.results ?? skillData ?? []

  const loading = subLoading || skillLoading

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#ccff00" />
      ) : (
        <FlatList
          data={[...pendingSkills.map(s => ({ ...s, _type: 'skill' })), ...submissions.map(s => ({ ...s, _type: 'submission' }))]}
          keyExtractor={(item, i) => `${item._type}-${item.id ?? i}`}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => { refetchSub(); refetchSkills() }}
              tintColor="#ccff00"
            />
          }
          ListEmptyComponent={<Text style={s.emptyText}>No submissions pending review.</Text>}
          renderItem={({ item }) =>
            item._type === 'skill'
              ? <SkillPendingCard item={item} />
              : <SubmissionCard item={item} />
          }
        />
      )}
    </View>
  )
}

function AllTab() {
  const { data, loading, error, refetch } = useApi(() => homework.list({}), [])
  const items = data?.results ?? data ?? []
  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#ccff00" />
      ) : error ? (
        <Text style={s.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#ccff00" />}
          ListEmptyComponent={<Text style={s.emptyText}>No assignments yet.</Text>}
          renderItem={({ item }) => <AssignmentCard item={item} />}
        />
      )}
    </View>
  )
}

const TABS = [
  { id: 'active', label: 'Active' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'all', label: 'All' },
]

export default function ProgressScreen() {
  const [activeTab, setActiveTab] = useState('active')
  const [showModal, setShowModal] = useState(false)
  const [savedTrigger, setSavedTrigger] = useState(0)

  return (
    <View style={s.root}>
      <Text style={s.heading}>Progress</Text>

      <View style={s.tabStrip}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[s.tabBtn, activeTab === tab.id && s.tabBtnActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[s.tabBtnText, activeTab === tab.id && s.tabBtnTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'active' && <ActiveTab refetchTrigger={savedTrigger} />}
      {activeTab === 'submitted' && <SubmittedTab />}
      {activeTab === 'all' && <AllTab />}

      <TouchableOpacity style={s.fab} onPress={() => setShowModal(true)}>
        <Text style={s.fabText}>+ Assign Homework</Text>
      </TouchableOpacity>

      <AssignHomeworkModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSaved={() => setSavedTrigger(t => t + 1)}
      />
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  heading: { fontSize: 20, fontWeight: '700', color: '#fff', padding: 16, paddingBottom: 8 },

  tabStrip: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#1a1a1a', borderRadius: 10, padding: 3, gap: 2,
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#111' },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: '#888' },
  tabBtnTextActive: { color: '#ccff00' },

  list: { padding: 16, paddingBottom: 100 },
  emptyText: { textAlign: 'center', color: '#555', marginTop: 40 },
  errorText: { textAlign: 'center', color: '#ff5050', marginTop: 40, paddingHorizontal: 24 },

  card: { backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#222' },
  cardLav: { borderColor: '#b0a0ff33', backgroundColor: 'rgba(176,160,255,0.06)' },
  cardLavLabel: { fontSize: 9, fontWeight: '700', color: '#b0a0ff', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1 },
  cardMeta: { fontSize: 12, color: '#888', marginTop: 4 },
  dueDate: { fontSize: 11, color: '#ffaa00', marginTop: 6, fontWeight: '600' },
  countBadge: { backgroundColor: 'rgba(204,255,0,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: '#ccff00' },

  fab: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: '#ccff00', borderRadius: 14, padding: 16, alignItems: 'center',
  },
  fabText: { color: '#000', fontWeight: '700', fontSize: 16 },

  modalRoot: { flex: 1, backgroundColor: '#000' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#222',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  modalClose: { padding: 4 },
  modalCloseText: { color: '#ccff00', fontSize: 15 },
  modalSaveBtn: { padding: 4 },
  modalSaveText: { color: '#ccff00', fontWeight: '700', fontSize: 15 },
  modalBody: { padding: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6, marginTop: 16 },
  fieldInput: {
    borderWidth: 1, borderColor: '#333', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#fff', backgroundColor: '#111',
  },
  fieldTextarea: { height: 100, paddingTop: 10 },
})
