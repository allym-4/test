import { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { homework } from '../../api'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function isOverdue(dueDateStr) {
  if (!dueDateStr) return false
  return new Date(dueDateStr) < new Date()
}

const SUBMISSION_STATUS_LABELS = {
  pending_review: 'Submitted',
  approved: 'Approved',
  needs_work: 'Needs work',
}

const SUBMISSION_STATUS_STYLES = {
  pending_review: { badge: 'badgeGrey', text: 'badgeTextGrey' },
  approved: { badge: 'badgeGreen', text: 'badgeTextGreen' },
  needs_work: { badge: 'badgeAmber', text: 'badgeTextAmber' },
}

// ─── sub-components ───────────────────────────────────────────────────────────

function TabBar({ activeTab, onSelect }) {
  return (
    <View style={s.tabBar}>
      {['Pending', 'Submitted'].map(tab => {
        const active = activeTab === tab
        return (
          <TouchableOpacity
            key={tab}
            style={[s.tab, active && s.tabActive]}
            onPress={() => onSelect(tab)}
            activeOpacity={0.75}
          >
            <Text style={[s.tabText, active && s.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function StatusBadge({ status }) {
  const label = SUBMISSION_STATUS_LABELS[status] ?? status
  const styles = SUBMISSION_STATUS_STYLES[status] ?? {
    badge: 'badgeGrey',
    text: 'badgeTextGrey',
  }
  return (
    <View style={[s.badge, s[styles.badge]]}>
      <Text style={[s.badgeText, s[styles.text]]}>{label}</Text>
    </View>
  )
}

function ChecklistItem({ item, checked, onToggle }) {
  return (
    <TouchableOpacity
      style={s.checkItem}
      onPress={() => onToggle(item.id)}
      activeOpacity={0.7}
    >
      <View style={[s.checkbox, checked && s.checkboxChecked]}>
        {checked && <Text style={s.checkmark}>✓</Text>}
      </View>
      <Text style={[s.checkItemText, checked && s.checkItemTextChecked]}>
        {item.text}
      </Text>
    </TouchableOpacity>
  )
}

// ─── submit modal ─────────────────────────────────────────────────────────────

function SubmitModal({ visible, assignment, onClose, onSuccess }) {
  const [checked, setChecked] = useState({})
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Reset state each time a new assignment is opened
  useEffect(() => {
    if (visible && assignment) {
      const initial = {}
      ;(assignment.checklist_items ?? []).forEach(item => {
        initial[item.id] = false
      })
      setChecked(initial)
      setNotes('')
    }
  }, [visible, assignment?.id])

  function toggleItem(itemId) {
    setChecked(prev => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  async function handleSubmit() {
    const checklistResponses = Object.entries(checked).map(([id, done]) => ({
      checklist_item: id,
      completed: done,
    }))
    setSubmitting(true)
    try {
      await homework.submitHomework({
        assignment: assignment.id,
        checklist_responses: checklistResponses,
        notes: notes.trim() || undefined,
      })
      onSuccess()
    } catch (err) {
      Alert.alert(
        'Submission failed',
        err?.response?.data?.detail ?? 'Could not submit homework. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!assignment) return null

  const items = assignment.checklist_items ?? []

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={s.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={s.modalHeader}>
          <Text style={s.modalTitle} numberOfLines={1}>
            {assignment.title}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={s.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={s.modalBody}
          contentContainerStyle={s.modalBodyContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Checklist */}
          {items.length > 0 && (
            <View style={s.modalSection}>
              <Text style={s.modalSectionLabel}>Checklist</Text>
              {items.map(item => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  checked={!!checked[item.id]}
                  onToggle={toggleItem}
                />
              ))}
            </View>
          )}

          {/* Notes */}
          <View style={s.modalSection}>
            <Text style={s.modalSectionLabel}>Notes (optional)</Text>
            <TextInput
              style={s.notesInput}
              placeholder="Add any notes for your teacher…"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Submit button */}
        <View style={s.modalFooter}>
          <TouchableOpacity
            style={[s.submitBtn, submitting && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.submitBtnText}>Submit homework</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── pending card ─────────────────────────────────────────────────────────────

function PendingCard({ assignment, submittedIds, onPressSubmit }) {
  const alreadySubmitted = submittedIds.has(assignment.id)
  const overdue = isOverdue(assignment.due_date)
  const items = assignment.checklist_items ?? []

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.cardTitleRow}>
          <Text style={s.cardTitle}>{assignment.title}</Text>
          {alreadySubmitted && (
            <View style={[s.badge, s.badgeGreen]}>
              <Text style={[s.badgeText, s.badgeTextGreen]}>Submitted</Text>
            </View>
          )}
        </View>
        {!!assignment.session?.name && (
          <Text style={s.cardClass}>{assignment.session.name}</Text>
        )}
        {!!assignment.due_date && (
          <Text style={[s.cardDue, overdue && s.cardDueOverdue]}>
            Due {fmtDate(assignment.due_date)}
            {overdue ? ' — Overdue' : ''}
          </Text>
        )}
      </View>

      {!!assignment.description && (
        <Text style={s.cardDesc}>{assignment.description}</Text>
      )}

      {items.length > 0 && (
        <View style={s.readonlyChecklist}>
          {items.map(item => (
            <View key={item.id} style={s.readonlyCheckItem}>
              <View style={s.readonlyDot} />
              <Text style={s.readonlyCheckText}>{item.text}</Text>
            </View>
          ))}
        </View>
      )}

      {!alreadySubmitted && (
        <TouchableOpacity
          style={s.submitCardBtn}
          onPress={() => onPressSubmit(assignment)}
          activeOpacity={0.8}
        >
          <Text style={s.submitCardBtnText}>Submit</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ─── submitted card ───────────────────────────────────────────────────────────

function SubmittedCard({ submission, allAssignments }) {
  // Look up the assignment title from the fetched list if possible
  const assignment = allAssignments.find(a => a.id === submission.assignment)
  const title = assignment?.title ?? `Assignment #${submission.assignment}`
  const className = assignment?.session?.name

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.cardTitleRow}>
          <Text style={[s.cardTitle, { flex: 1 }]} numberOfLines={2}>
            {title}
          </Text>
          <StatusBadge status={submission.status} />
        </View>
        {!!className && <Text style={s.cardClass}>{className}</Text>}
        {!!submission.submitted_at && (
          <Text style={s.cardDate}>
            Submitted {fmtDate(submission.submitted_at)}
          </Text>
        )}
      </View>

      {!!submission.feedback && (
        <View style={s.feedbackBox}>
          <Text style={s.feedbackLabel}>Teacher feedback</Text>
          <Text style={s.feedbackText}>{submission.feedback}</Text>
        </View>
      )}

      {submission.grade != null && (
        <View style={s.gradeRow}>
          <Text style={s.gradeLabel}>Grade</Text>
          <Text style={s.gradeValue}>{submission.grade}</Text>
        </View>
      )}
    </View>
  )
}

// ─── main screen ──────────────────────────────────────────────────────────────

export default function HomeworkScreen() {
  const { user } = useAuth()
  const userId = user?.id

  const [activeTab, setActiveTab] = useState('Pending')
  const [modalAssignment, setModalAssignment] = useState(null)
  // Track locally submitted IDs so the UI updates immediately without a
  // full refetch (the list will sync properly on pull-to-refresh)
  const [locallySubmitted, setLocallySubmitted] = useState(new Set())
  const [refreshing, setRefreshing] = useState(false)

  const {
    data: assignmentsData,
    loading: assignmentsLoading,
    refetch: refetchAssignments,
  } = useApi(() => homework.list({ status: 'active' }), [])

  const {
    data: submissionsData,
    loading: submissionsLoading,
    refetch: refetchSubmissions,
  } = useApi(
    () => (userId ? homework.submissions({ student: userId }) : null),
    [userId],
  )

  const assignments = assignmentsData?.results ?? assignmentsData ?? []
  const submissions = submissionsData?.results ?? submissionsData ?? []

  // Build a set of submitted assignment IDs (from server + local optimistic)
  const serverSubmittedIds = new Set(submissions.map(s => s.assignment))
  const submittedIds = new Set([...serverSubmittedIds, ...locallySubmitted])

  const pendingAssignments = assignments.filter(a => !submittedIds.has(a.id))
  // Show all active assignments in pending tab; submitted ones show "Submitted" badge
  const allActiveAssignments = assignments

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refetchAssignments(), refetchSubmissions()])
    setRefreshing(false)
  }, [refetchAssignments, refetchSubmissions])

  function handleSubmitSuccess() {
    if (modalAssignment) {
      setLocallySubmitted(prev => new Set([...prev, modalAssignment.id]))
    }
    setModalAssignment(null)
    // Refresh submissions in background so the Submitted tab is up-to-date
    refetchSubmissions()
    setActiveTab('Submitted')
  }

  // ── pending list ─────────────────────────────────────────────────────────────
  function renderPending() {
    if (assignmentsLoading) {
      return (
        <View style={s.centred}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      )
    }
    if (allActiveAssignments.length === 0) {
      return (
        <View style={s.centred}>
          <Text style={s.emptyTitle}>All caught up!</Text>
          <Text style={s.emptySubtitle}>No homework assigned right now.</Text>
        </View>
      )
    }
    return (
      <FlatList
        data={allActiveAssignments}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <PendingCard
            assignment={item}
            submittedIds={submittedIds}
            onPressSubmit={setModalAssignment}
          />
        )}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    )
  }

  // ── submitted list ───────────────────────────────────────────────────────────
  function renderSubmitted() {
    if (submissionsLoading) {
      return (
        <View style={s.centred}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      )
    }
    if (submissions.length === 0) {
      return (
        <View style={s.centred}>
          <Text style={s.emptyTitle}>Nothing submitted yet</Text>
          <Text style={s.emptySubtitle}>
            Complete and submit your homework from the Pending tab.
          </Text>
        </View>
      )
    }
    return (
      <FlatList
        data={submissions}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <SubmittedCard submission={item} allAssignments={assignments} />
        )}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    )
  }

  return (
    <View style={s.root}>
      <TabBar activeTab={activeTab} onSelect={setActiveTab} />

      <View style={s.listContainer}>
        {activeTab === 'Pending' ? renderPending() : renderSubmitted()}
      </View>

      <SubmitModal
        visible={!!modalAssignment}
        assignment={modalAssignment}
        onClose={() => setModalAssignment(null)}
        onSuccess={handleSubmitSuccess}
      />
    </View>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },

  // ── Tab bar ───────────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#6366f1',
    fontWeight: '700',
  },

  // ── List ──────────────────────────────────────────────────────────────────────
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Card ──────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  cardClass: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '500',
    marginBottom: 3,
  },
  cardDue: {
    fontSize: 12,
    color: '#6b7280',
  },
  cardDueOverdue: {
    color: '#ef4444',
    fontWeight: '600',
  },
  cardDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  cardDesc: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },

  // ── Read-only checklist (pending card) ────────────────────────────────────────
  readonlyChecklist: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 10,
    marginBottom: 12,
    gap: 6,
  },
  readonlyCheckItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  readonlyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#a5b4fc',
    marginTop: 7,
  },
  readonlyCheckText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },

  // ── Submit button on card ─────────────────────────────────────────────────────
  submitCardBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  submitCardBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Status badges ─────────────────────────────────────────────────────────────
  badge: {
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeGrey: { backgroundColor: '#f3f4f6' },
  badgeTextGrey: { color: '#374151' },
  badgeGreen: { backgroundColor: '#d1fae5' },
  badgeTextGreen: { color: '#065f46' },
  badgeAmber: { backgroundColor: '#fef3c7' },
  badgeTextAmber: { color: '#92400e' },

  // ── Feedback & grade (submitted card) ────────────────────────────────────────
  feedbackBox: {
    backgroundColor: '#f5f3ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  feedbackLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  gradeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  gradeValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  // ── Submit modal ──────────────────────────────────────────────────────────────
  modalRoot: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginRight: 12,
  },
  modalCloseText: {
    fontSize: 15,
    color: '#6366f1',
    fontWeight: '600',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 16,
    gap: 20,
    paddingBottom: 24,
  },
  modalSection: {
    gap: 10,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  modalFooter: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },

  // ── Modal checklist ───────────────────────────────────────────────────────────
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  checkmark: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
    lineHeight: 16,
  },
  checkItemText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  checkItemTextChecked: {
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },

  // ── Notes input ───────────────────────────────────────────────────────────────
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    padding: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
    lineHeight: 22,
  },

  // ── Modal submit button ───────────────────────────────────────────────────────
  submitBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
})
