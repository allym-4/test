import { useState } from 'react'
import {
  ScrollView, View, Text, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, RefreshControl, Modal,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { forms, surveys } from '../../api'

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

function SurveyModal({ survey, onClose, onDone }) {
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function setAnswer(qId, val) { setAnswers(a => ({ ...a, [qId]: val })) }

  async function submit() {
    setSubmitting(true)
    try {
      await surveys.respond({
        survey: survey.id,
        answers: Object.entries(answers).map(([question, answer_text]) => ({
          question: parseInt(question), answer_text: String(answer_text),
        })),
      })
      onDone()
    } catch {
      Alert.alert('Error', 'Failed to submit — please try again.')
    } finally { setSubmitting(false) }
  }

  const questions = survey.questions || []
  const allRequired = questions.filter(q => q.required).every(q => answers[q.id] !== undefined && answers[q.id] !== '')

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff', flex: 1, marginRight: 12 }} numberOfLines={1}>{survey.name}</Text>
          <TouchableOpacity onPress={onClose}><Text style={{ color: '#666', fontSize: 16 }}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {survey.description ? <Text style={{ fontSize: 13, color: '#888', lineHeight: 20, marginBottom: 20 }}>{survey.description}</Text> : null}
          {questions.map((q, i) => (
            <View key={q.id} style={{ backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#222' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 10, lineHeight: 20 }}>
                {i + 1}. {q.question_text}{q.required ? <Text style={{ color: '#ef4444' }}> *</Text> : null}
              </Text>
              {q.question_type === 'text' && (
                <TextInput value={answers[q.id] || ''} onChangeText={t => setAnswer(q.id, t)} placeholder="Your answer…" placeholderTextColor="#555" style={{ color: '#fff', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 10, fontSize: 13 }} />
              )}
              {q.question_type === 'yes_no' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[['Yes', 'yes'], ['No', 'no']].map(([label, val]) => (
                    <TouchableOpacity key={val} onPress={() => setAnswer(q.id, val)}
                      style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: answers[q.id] === val ? '#ccff00' : '#333', backgroundColor: answers[q.id] === val ? 'rgba(204,255,0,0.1)' : 'transparent', alignItems: 'center' }}>
                      <Text style={{ color: answers[q.id] === val ? '#ccff00' : '#666', fontWeight: '600' }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {q.question_type === 'rating' && (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[1,2,3,4,5].map(n => (
                    <TouchableOpacity key={n} onPress={() => setAnswer(q.id, n)}
                      style={{ width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: (answers[q.id] || 0) >= n ? '#ccff00' : '#333', backgroundColor: (answers[q.id] || 0) >= n ? 'rgba(204,255,0,0.1)' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 20, color: (answers[q.id] || 0) >= n ? '#ccff00' : '#555' }}>★</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {q.question_type === 'scale' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {Array.from({length: 10}, (_, i) => i + 1).map(n => (
                    <TouchableOpacity key={n} onPress={() => setAnswer(q.id, n)}
                      style={{ width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: answers[q.id] === n ? '#ccff00' : '#333', backgroundColor: answers[q.id] === n ? 'rgba(204,255,0,0.12)' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: answers[q.id] === n ? '#ccff00' : '#666', fontWeight: '600', fontSize: 13 }}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {(q.question_type === 'multiple_choice' || q.question_type === 'checkbox') && (
                <View style={{ gap: 6 }}>
                  {(q.options || []).map(opt => {
                    const isMulti = q.question_type === 'checkbox'
                    const selected = isMulti ? (answers[q.id] || []).includes(opt) : answers[q.id] === opt
                    return (
                      <TouchableOpacity key={opt} onPress={() => {
                        if (isMulti) {
                          const cur = answers[q.id] || []
                          setAnswer(q.id, selected ? cur.filter(x => x !== opt) : [...cur, opt])
                        } else { setAnswer(q.id, opt) }
                      }}
                        style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: selected ? '#ccff00' : '#333', backgroundColor: selected ? 'rgba(204,255,0,0.08)' : 'transparent' }}>
                        <Text style={{ color: selected ? '#ccff00' : '#888', fontSize: 13 }}>{opt}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}
            </View>
          ))}
          <TouchableOpacity style={{ backgroundColor: '#ccff00', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8, opacity: allRequired && !submitting ? 1 : 0.4 }}
            onPress={submit} disabled={!allRequired || submitting}>
            {submitting ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>Submit</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )
}

export default function FormsScreen() {
  const { data: formsData, loading, refetch } = useApi(() => forms.list(), [])
  const { data: surveysData, refetch: refetchSurveys } = useApi(() => surveys.mine(), [])

  const [showParq, setShowParq] = useState(false)
  const [activeSurvey, setActiveSurvey] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  // Optimistic local completions: { form_type: submitted_at }
  const [localCompleted, setLocalCompleted] = useState({})
  const pendingSurveys = surveysData?.results ?? surveysData ?? []

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
          <ActivityIndicator color="#ccff00" style={{ marginTop: 32 }} />
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

        {pendingSurveys.map(sv => (
          <View key={`sv-${sv.id}`} style={[s.card, { borderColor: 'rgba(176,160,255,0.3)', borderLeftWidth: 3, borderLeftColor: '#b0a0ff' }]}>
            <View style={s.cardHeader}>
              <Text style={s.cardIcon}>📋</Text>
              <View style={s.cardMeta}>
                <Text style={s.cardTitle}>{sv.name}</Text>
                {sv.description ? <Text style={s.cardDesc}>{sv.description}</Text> : null}
                <Text style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{sv.questions?.length || 0} question{sv.questions?.length !== 1 ? 's' : ''}</Text>
              </View>
            </View>
            <TouchableOpacity style={[s.completeBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#b0a0ff' }]}
              onPress={() => setActiveSurvey(sv)}>
              <Text style={[s.completeBtnText, { color: '#b0a0ff' }]}>Complete</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {showParq && (
        <ParqModal
          onClose={() => setShowParq(false)}
          onSubmit={handleParqSubmit}
          submitting={submitting}
        />
      )}
      {activeSurvey && (
        <SurveyModal
          survey={activeSurvey}
          onClose={() => setActiveSurvey(null)}
          onDone={() => { setActiveSurvey(null); refetchSurveys() }}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingBottom: 40 },

  pageTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },

  card: {
    backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#222',
  },
  cardDone: { borderLeftWidth: 4, borderLeftColor: '#ccff00', borderColor: '#ccff00' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  cardIcon: { fontSize: 28, marginRight: 14, marginTop: 1 },
  cardMeta: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#888', lineHeight: 18 },

  completedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  completedBadge: { fontSize: 14, fontWeight: '700', color: '#ccff00' },
  completedDate: { fontSize: 13, color: '#555' },

  completeBtn: {
    backgroundColor: '#ccff00', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  completeBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
})

// PAR-Q modal styles
const m = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheet: {
    backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderColor: '#222',
    padding: 24, paddingBottom: 36, maxHeight: '90%',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 16 },
  scroll: { maxHeight: 420 },

  questionBlock: {
    marginBottom: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  questionText: { fontSize: 14, color: '#ccc', lineHeight: 20, marginBottom: 10 },
  yesNo: { flexDirection: 'row', gap: 10 },
  answerBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#333', alignItems: 'center',
  },
  answerBtnYes: { backgroundColor: '#2a0a0a', borderColor: '#ef4444' },
  answerBtnNo: { backgroundColor: '#0a2a1a', borderColor: '#ccff00' },
  answerText: { fontSize: 14, fontWeight: '600', color: '#666' },
  answerTextActive: { color: '#fff' },

  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#333', alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#888' },
  submitBtn: {
    flex: 2, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#ccff00', alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { fontSize: 15, fontWeight: '700', color: '#000' },
})
