import { useState } from 'react'
import {
  ScrollView, View, Text, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { forms } from '../../api'

const FORM_DEFS = [
  {
    key: 'parq',
    icon: '🏃',
    title: 'PAR-Q Health Questionnaire',
    description: 'A short health screening to ensure dance is safe for you.',
  },
  {
    key: 'waiver',
    icon: '📝',
    title: 'Liability Waiver',
    description: 'Acknowledges the physical nature of dance and releases the studio from liability.',
  },
  {
    key: 'photo_consent',
    icon: '📷',
    title: 'Photo & Video Consent',
    description: 'Permission to use photos and videos of you in studio content and promotions.',
  },
  {
    key: 'season_agreement',
    icon: '📋',
    title: 'Season Agreement',
    description: 'Confirms your commitment and understanding of studio policies for the season.',
  },
]

// PAR-Q questions
const PARQ_QUESTIONS = [
  { id: 'heart_condition', text: 'Has a doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?' },
  { id: 'chest_pain_activity', text: 'Do you feel pain in your chest when you do physical activity?' },
  { id: 'chest_pain_rest', text: 'In the past month, have you had chest pain when you were not doing physical activity?' },
  { id: 'balance_dizzy', text: 'Do you lose your balance because of dizziness or do you ever lose consciousness?' },
  { id: 'bone_joint', text: 'Do you have a bone or joint problem that could be made worse by a change in your physical activity?' },
  { id: 'blood_pressure_meds', text: 'Is your doctor currently prescribing drugs (for example, water pills) for your blood pressure or heart condition?' },
  { id: 'other_reason', text: 'Do you know of any other reason why you should not do physical activity?' },
]

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function ParqModal({ onClose, onSubmit, submitting }) {
  const [answers, setAnswers] = useState(
    Object.fromEntries(PARQ_QUESTIONS.map((q) => [q.id, null])),
  )

  function toggle(id, value) {
    setAnswers((prev) => ({ ...prev, [id]: value }))
  }

  const allAnswered = PARQ_QUESTIONS.every((q) => answers[q.id] !== null)

  return (
    <View style={m.overlay}>
      <View style={m.sheet}>
        <Text style={m.title}>PAR-Q Health Questionnaire</Text>
        <Text style={m.subtitle}>Please answer Yes or No for each question.</Text>
        <ScrollView style={m.scroll} showsVerticalScrollIndicator={false}>
          {PARQ_QUESTIONS.map((q) => (
            <View key={q.id} style={m.questionBlock}>
              <Text style={m.questionText}>{q.text}</Text>
              <View style={m.yesNo}>
                <TouchableOpacity
                  style={[m.answerBtn, answers[q.id] === true && m.answerBtnYes]}
                  onPress={() => toggle(q.id, true)}
                >
                  <Text style={[m.answerText, answers[q.id] === true && m.answerTextActive]}>
                    Yes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[m.answerBtn, answers[q.id] === false && m.answerBtnNo]}
                  onPress={() => toggle(q.id, false)}
                >
                  <Text style={[m.answerText, answers[q.id] === false && m.answerTextActive]}>
                    No
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={m.actions}>
          <TouchableOpacity style={m.cancelBtn} onPress={onClose} disabled={submitting}>
            <Text style={m.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[m.submitBtn, (!allAnswered || submitting) && m.submitBtnDisabled]}
            onPress={() => onSubmit(answers)}
            disabled={!allAnswered || submitting}
          >
            <Text style={m.submitText}>{submitting ? 'Submitting…' : 'Submit'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

export default function FormsScreen() {
  const { data: formsData, loading, refetch } = useApi(() => forms.list(), [])

  const [showParq, setShowParq] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Optimistic local completions: { form_type: submitted_at }
  const [localCompleted, setLocalCompleted] = useState({})

  const submittedForms = formsData?.results ?? formsData ?? []

  function isCompleted(formType) {
    if (localCompleted[formType]) return { submitted_at: localCompleted[formType] }
    return submittedForms.find((f) => f.form_type === formType) ?? null
  }

  async function submitForm(formType, responses) {
    setSubmitting(true)
    try {
      await forms.submit(formType, responses)
      setLocalCompleted((prev) => ({ ...prev, [formType]: new Date().toISOString() }))
      return true
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  async function handleParqSubmit(answers) {
    const ok = await submitForm('parq', answers)
    if (ok) setShowParq(false)
  }

  function handleSimpleForm(def) {
    Alert.alert(
      def.title,
      def.description + '\n\nBy confirming, you agree to the terms described above.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I agree',
          onPress: async () => {
            await submitForm(def.key, { agreed: true })
          },
        },
      ],
    )
  }

  function handleComplete(def) {
    if (def.key === 'parq') {
      Alert.alert(
        'PAR-Q Health Questionnaire',
        'This is a short health screening questionnaire with Yes/No questions. It helps ensure dance activity is safe for you. You\'ll answer 7 questions before proceeding.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start', onPress: () => setShowParq(true) },
        ],
      )
    } else {
      handleSimpleForm(def)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={s.root}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      >
        <Text style={s.pageTitle}>Forms</Text>
        <Text style={s.pageSubtitle}>Complete all required forms to get started.</Text>

        {loading && submittedForms.length === 0 && (
          <ActivityIndicator color="#6366f1" style={{ marginTop: 32 }} />
        )}

        {FORM_DEFS.map((def) => {
          const completed = isCompleted(def.key)
          return (
            <View key={def.key} style={[s.card, completed && s.cardDone]}>
              <View style={s.cardHeader}>
                <Text style={s.cardIcon}>{def.icon}</Text>
                <View style={s.cardMeta}>
                  <Text style={s.cardTitle}>{def.title}</Text>
                  <Text style={s.cardDesc}>{def.description}</Text>
                </View>
              </View>

              {completed ? (
                <View style={s.completedRow}>
                  <Text style={s.completedBadge}>✓  Completed</Text>
                  <Text style={s.completedDate}>{formatDate(completed.submitted_at)}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={s.completeBtn}
                  onPress={() => handleComplete(def)}
                  disabled={submitting}
                >
                  <Text style={s.completeBtnText}>Complete</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        })}
      </ScrollView>

      {showParq && (
        <ParqModal
          onClose={() => setShowParq(false)}
          onSubmit={handleParqSubmit}
          submitting={submitting}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },

  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardDone: { borderLeftWidth: 4, borderLeftColor: '#10b981' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  cardIcon: { fontSize: 28, marginRight: 14, marginTop: 1 },
  cardMeta: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#6b7280', lineHeight: 18 },

  completedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  completedBadge: { fontSize: 14, fontWeight: '700', color: '#10b981' },
  completedDate: { fontSize: 13, color: '#9ca3af' },

  completeBtn: {
    backgroundColor: '#6366f1', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  completeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})

// PAR-Q modal styles
const m = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 36, maxHeight: '90%',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  scroll: { maxHeight: 420 },

  questionBlock: {
    marginBottom: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  questionText: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 10 },
  yesNo: { flexDirection: 'row', gap: 10 },
  answerBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center',
  },
  answerBtnYes: { backgroundColor: '#fee2e2', borderColor: '#ef4444' },
  answerBtnNo: { backgroundColor: '#d1fae5', borderColor: '#10b981' },
  answerText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  answerTextActive: { color: '#111827' },

  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  submitBtn: {
    flex: 2, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#6366f1', alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
})
