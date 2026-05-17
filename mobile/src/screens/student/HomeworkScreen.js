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

// ─── submission detail modal ──────────────────────────────────────────────────

function SubmissionDetailModal({ submission, assignment, onClose }) {
  const { data: itemsData, loading: itemsLoading } = useApi(
    () => homework.submissionItems(submission.id),
    [submission.id],
  )
  const items = itemsData?.results ?? itemsData ?? []
  const checklistItems = assignment?.checklist_items ?? []
  const feedback = submission.feedback || submission.instructor_notes

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={s.modalRoot}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle} numberOfLines={1}>
            {assignment?.title ?? `Assignment #${submission.assignment}`}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={s.modalCloseText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={s.modalBody}
          contentContainerStyle={s.modalBodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Submitted banner */}
          <View style={s.submittedBanner}>
            <View style={{ flex: 1 }}>
              <Text style={s.submittedBannerTitle}>Submitted ✓</Text>
              {!!submission.submitted_at && (
                <Text style={s.submittedBannerDate}>{fmtDate(submission.submitted_at)}</Text>
              )}
            </View>
            <View style={s.detailStatusCol}>
              <StatusBadge status={submission.status} />
              {!!submission.reviewed && (
                <View style={s.reviewedBadge}>
                  <Text style={s.reviewedBadgeText}>Reviewed ✓</Text>
                </View>
              )}
            </View>
          </View>

          {/* Instructor feedback */}
          {!!feedback && (
            <View style={s.modalSection}>
              <Text style={s.modalSectionLabel}>Instructor Feedback</Text>
              <View style={s.feedbackBox}>
                <Text style={s.feedbackText}>{feedback}</Text>
              </View>
            </View>
          )}

          {/* Grade */}
          {submission.grade != null && (
            <View style={s.gradeRow}>
              <Text style={s.gradeLabel}>Grade</Text>
              <Text style={s.gradeValue}>{submission.grade}</Text>
            </View>
          )}

          {/* Checklist items with completion status */}
          {checklistItems.length > 0 && (
            <View style={s.modalSection}>
              <Text style={s.modalSectionLabel}>Checklist</Text>
              {itemsLoading ? (
                <ActivityIndicator color="#ccff00" style={{ marginTop: 8 }} />
              ) : (
                checklistItems.map(ci => {
                  const submitted = items.find(i => i.checklist_item === ci.id)
                  const done = submitted?.completed ?? false
                  return (
                    <View key={ci.id} style={s.detailCheckRow}>
                      <View style={[s.detailCheckCircle, done && s.detailCheckCircleDone]}>
                        <Text style={[s.detailCheckSymbol, done && s.detailCheckSymbolDone]}>
                          {done ? '✓' : '○'}
                        </Text>
                      </View>
                      <Text style={[s.detailCheckText, done && s.detailCheckTextDone]}>
                        {ci.text}
                      </Text>
                    </View>
                  )
                })
              )}
            </View>
          )}

          {/* Student notes */}
          {!!submission.notes && (
            <View style={s.modalSection}>
              <Text style={s.modalSectionLabel}>Your Notes</Text>
              <View style={s.studentNotesBox}>
                <Text style={s.studentNotesText}>{submission.notes}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

// ─── submitted card ───────────────────────────────────────────────────────────

function SubmittedCard({ submission, allAssignments, onView }) {
  const assignment = allAssignments.find(a => a.id === submission.assignment)
  const title = assignment?.title ?? `Assignment #${submission.assignment}`
  const className = assignment?.session?.name

  return (
    <TouchableOpacity style={[s.card, s.cardSubmitted]} onPress={onView} activeOpacity={0.85}>
      <View style={s.cardHeader}>
        <View style={s.cardTitleRow}>
          <Text style={[s.cardTitle, { flex: 1 }]} numberOfLines={2}>
            {title}
          </Text>
          <StatusBadge status={submission.status} />
        </View>
        {!!className && <Text style={s.cardClass}>{className}</Text>}
        <View style={s.submittedMeta}>
          {!!submission.submitted_at && (
            <Text style={s.cardDate}>Submitted {fmtDate(submission.submitted_at)}</Text>
          )}
          {!!submission.reviewed && (
            <Text style={s.reviewedInline}>Reviewed ✓</Text>
          )}
        </View>
      </View>

      <View style={s.viewRow}>
        <Text style={s.viewRowText}>View submission →</Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── main screen ──────────────────────────────────────────────────────────────

export default function HomeworkScreen() {
  const { user } = useAuth()
  const userId = user?.id

  const [activeTab, setActiveTab] = useState('Pending')
  const [modalAssignment, setModalAssignment] = useState(null)
  const [viewSubmission, setViewSubmission] = useState(null)
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
          <ActivityIndicator size="large" color="#ccff00" />
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
            tintColor="#ccff00"
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
          <ActivityIndicator size="large" color="#ccff00" />
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
          <SubmittedCard
            submission={item}
            allAssignments={assignments}
            onView={() => setViewSubmission(item)}
          />
        )}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ccff00"
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

      {viewSubmission && (
        <SubmissionDetailModal
          submission={viewSubmission}
          assignment={assignments.find(a => a.id === viewSubmission.assignment)}
          onClose={() => setViewSubmission(null)}
        />
      )}
    </View>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Tab bar ───────────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
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
    borderBottomColor: '#ccff00',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#ccff00',
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
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Card ──────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
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
    color: '#fff',
    flex: 1,
  },
  cardClass: {
    fontSize: 13,
    color: '#ccff00',
    fontWeight: '500',
    marginBottom: 3,
  },
  cardDue: {
    fontSize: 12,
    color: '#666',
  },
  cardDueOverdue: {
    color: '#ef4444',
    fontWeight: '600',
  },
  cardDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cardDesc: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
    marginBottom: 12,
  },

  // ── Read-only checklist (pending card) ────────────────────────────────────────
  readonlyChecklist: {
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
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
    backgroundColor: '#7c3aed',
    marginTop: 7,
  },
  readonlyCheckText: {
    flex: 1,
    fontSize: 13,
    color: '#aaa',
    lineHeight: 20,
  },

  // ── Submit button on card ─────────────────────────────────────────────────────
  submitCardBtn: {
    backgroundColor: '#ccff00',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  submitCardBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
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
  badgeGrey: { backgroundColor: '#1a1a1a' },
  badgeTextGrey: { color: '#888' },
  badgeGreen: { backgroundColor: '#0a2a1a' },
  badgeTextGreen: { color: '#ccff00' },
  badgeAmber: { backgroundColor: '#2a1a00' },
  badgeTextAmber: { color: '#ffaa00' },

  // ── Submitted card ────────────────────────────────────────────────────────────
  cardSubmitted: {
    borderColor: 'rgba(204,255,0,0.18)',
  },
  submittedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  reviewedInline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ccff00',
  },
  viewRow: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  viewRowText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#b0a0ff',
  },

  // ── Submission detail modal ───────────────────────────────────────────────────
  submittedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(204,255,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(204,255,0,0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
    gap: 12,
  },
  submittedBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ccff00',
    marginBottom: 3,
  },
  submittedBannerDate: {
    fontSize: 12,
    color: '#888',
  },
  detailStatusCol: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  reviewedBadge: {
    backgroundColor: 'rgba(204,255,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(204,255,0,0.25)',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  reviewedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ccff00',
  },

  // ── Detail checklist ──────────────────────────────────────────────────────────
  detailCheckRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  detailCheckCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  detailCheckCircleDone: {
    backgroundColor: '#ccff00',
    borderColor: '#ccff00',
  },
  detailCheckSymbol: {
    fontSize: 13,
    color: '#555',
    fontWeight: '700',
    lineHeight: 16,
  },
  detailCheckSymbolDone: {
    color: '#000',
  },
  detailCheckText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  detailCheckTextDone: {
    color: '#ccc',
  },

  // ── Student notes (detail) ────────────────────────────────────────────────────
  studentNotesBox: {
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  studentNotesText: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 21,
  },

  // ── Feedback & grade ──────────────────────────────────────────────────────────
  feedbackBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#7c3aed',
  },
  feedbackText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  gradeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  gradeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },

  // ── Submit modal ──────────────────────────────────────────────────────────────
  modalRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginRight: 12,
  },
  modalCloseText: {
    fontSize: 15,
    color: '#ccff00',
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
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  modalFooter: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222',
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
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#ccff00',
    borderColor: '#ccff00',
  },
  checkmark: {
    fontSize: 13,
    color: '#000',
    fontWeight: '700',
    lineHeight: 16,
  },
  checkItemText: {
    flex: 1,
    fontSize: 15,
    color: '#ccc',
    lineHeight: 22,
  },
  checkItemTextChecked: {
    color: '#555',
    textDecorationLine: 'line-through',
  },

  // ── Notes input ───────────────────────────────────────────────────────────────
  notesInput: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#333',
    padding: 12,
    fontSize: 15,
    color: '#fff',
    minHeight: 100,
    lineHeight: 22,
  },

  // ── Modal submit button ───────────────────────────────────────────────────────
  submitBtn: {
    backgroundColor: '#ccff00',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
})
