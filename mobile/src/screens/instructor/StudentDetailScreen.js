import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, TextInput, Alert, Modal,
} from 'react-native'
import { users, enrolments, payments as paymentsApi } from '../../api'
import client from '../../api/client'

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  )
}

function Section({ title, children, action }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  )
}

function RecordPaymentModal({ visible, studentId, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [paymentType, setPaymentType] = useState('cash')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) {
      Alert.alert('Invalid', 'Please enter a valid amount.')
      return
    }
    setSaving(true)
    try {
      await client.post('/api/payments/', {
        student: studentId,
        amount: amt,
        payment_type: paymentType,
        description: description.trim() || 'Manual payment recorded by instructor',
      })
      Alert.alert('Recorded', `$${amt.toFixed(2)} payment recorded.`)
      setAmount('')
      setDescription('')
      onSaved?.()
      onClose()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not record payment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.modalRoot}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={s.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={s.modalTitle}>Record Payment</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#ccff00" /> : <Text style={s.modalSaveText}>Save</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
          <Text style={s.fieldLabel}>Amount ($) *</Text>
          <TextInput
            style={s.fieldInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor="#555"
            keyboardType="decimal-pad"
          />
          <Text style={s.fieldLabel}>Type</Text>
          <View style={s.typeRow}>
            {[['cash', 'Cash'], ['payment', 'Card'], ['credit', 'Credit']].map(([val, label]) => (
              <TouchableOpacity
                key={val}
                style={[s.typeBtn, paymentType === val && s.typeBtnActive]}
                onPress={() => setPaymentType(val)}
              >
                <Text style={[s.typeBtnText, paymentType === val && s.typeBtnTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.fieldLabel}>Description</Text>
          <TextInput
            style={s.fieldInput}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Season 2026 Winter cash payment"
            placeholderTextColor="#555"
          />
        </ScrollView>
      </View>
    </Modal>
  )
}

function EditNotesModal({ visible, currentNotes, onClose, onSaved }) {
  const [notes, setNotes] = useState(currentNotes ?? '')

  useEffect(() => { setNotes(currentNotes ?? '') }, [currentNotes, visible])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.modalRoot}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={s.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={s.modalTitle}>Notes</Text>
          <TouchableOpacity onPress={() => onSaved(notes)}>
            <Text style={s.modalSaveText}>Save</Text>
          </TouchableOpacity>
        </View>
        <View style={s.modalBody}>
          <TextInput
            style={[s.fieldInput, { height: 200, textAlignVertical: 'top', paddingTop: 12 }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes about this student..."
            placeholderTextColor="#555"
            multiline
            autoFocus
          />
        </View>
      </View>
    </Modal>
  )
}

export default function StudentDetailScreen({ navigation, route }) {
  const { studentId, studentName } = route.params ?? {}

  const [student, setStudent] = useState(null)
  const [loadingStudent, setLoadingStudent] = useState(true)
  const [studentEnrolments, setStudentEnrolments] = useState([])
  const [loadingEnr, setLoadingEnr] = useState(true)
  const [balance, setBalance] = useState(null)
  const [recentPayments, setRecentPayments] = useState([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)

  function loadStudent() {
    setLoadingStudent(true)
    users.get(studentId)
      .then(res => setStudent(res.data))
      .catch(() => {})
      .finally(() => setLoadingStudent(false))
  }

  function loadBalance() {
    paymentsApi.balance(studentId)
      .then(res => setBalance(parseFloat(res.data.balance)))
      .catch(() => {})
  }

  function loadPayments() {
    setLoadingPayments(true)
    paymentsApi.list({ student: studentId })
      .then(res => {
        const data = res.data?.results ?? res.data ?? []
        setRecentPayments(data.slice(0, 8))
      })
      .catch(() => {})
      .finally(() => setLoadingPayments(false))
  }

  useEffect(() => {
    if (!studentId) return
    loadStudent()
    loadBalance()
    loadPayments()
  }, [studentId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!studentId) return
    setLoadingEnr(true)
    enrolments.list({ student: studentId, status: 'active' })
      .then(res => {
        const data = res.data?.results ?? res.data ?? []
        setStudentEnrolments(data)
      })
      .catch(() => {})
      .finally(() => setLoadingEnr(false))
  }, [studentId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveNotes(newNotes) {
    try {
      const res = await users.update(studentId, { notes: newNotes })
      setStudent(prev => ({ ...prev, notes: res.data.notes ?? newNotes }))
      setShowNotesModal(false)
    } catch {
      Alert.alert('Error', 'Could not save notes.')
    }
  }

  async function handleMessage() {
    try {
      const res = await client.post('/api/helpdesk/conversations/', { student: studentId })
      navigation.navigate('MessagesTab')
    } catch (err) {
      const existing = err.response?.data?.conversation
      if (existing) {
        navigation.navigate('MessagesTab')
      } else {
        Alert.alert('Error', 'Could not open conversation.')
      }
    }
  }

  const displayName = student?.display_name
    || [student?.first_name, student?.last_name].filter(Boolean).join(' ')
    || studentName
    || 'Student'

  const initials = (
    (student?.first_name?.[0] ?? '') +
    (student?.last_name?.[0] ?? '')
  ).toUpperCase() || displayName[0]?.toUpperCase() || '?'

  const owing = balance != null && balance < 0 ? Math.abs(balance) : 0
  const credit = balance != null && balance > 0 ? balance : 0

  if (loadingStudent) {
    return (
      <View style={s.root}>
        <ActivityIndicator style={{ marginTop: 60 }} color="#ccff00" />
      </View>
    )
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Avatar + name */}
      <View style={s.profileCard}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.name}>{displayName}</Text>
        {student?.pronouns ? (
          <Text style={s.pronouns}>{student.pronouns}</Text>
        ) : null}
        {student?.level_display || student?.level ? (
          <View style={s.levelBadge}>
            <Text style={s.levelBadgeText}>
              {student.level_display ?? `Level ${student.level}`}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Action buttons */}
      <View style={s.actionsRow}>
        <TouchableOpacity style={s.actionBtn} onPress={handleMessage}>
          <Text style={s.actionBtnIcon}>💬</Text>
          <Text style={s.actionBtnText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={() => setShowPayModal(true)}>
          <Text style={s.actionBtnIcon}>💵</Text>
          <Text style={s.actionBtnText}>Take Payment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={() => setShowNotesModal(true)}>
          <Text style={s.actionBtnIcon}>📝</Text>
          <Text style={s.actionBtnText}>Notes</Text>
        </TouchableOpacity>
      </View>

      {/* Balance */}
      {balance != null && (
        <View style={[
          s.balanceBanner,
          owing > 0 ? s.balanceBannerOwing : credit > 0 ? s.balanceBannerCredit : s.balanceBannerZero,
        ]}>
          <Text style={[
            s.balanceBannerText,
            owing > 0 ? { color: '#ff5050' } : credit > 0 ? { color: '#ccff00' } : { color: '#555' },
          ]}>
            {owing > 0
              ? `⚠ $${owing.toFixed(2)} owing`
              : credit > 0
              ? `✓ $${credit.toFixed(2)} account credit`
              : 'Account balance clear'}
          </Text>
        </View>
      )}

      {/* Contact info */}
      <Section title="Contact">
        <InfoRow label="Email" value={student?.email} />
        <InfoRow label="Phone" value={student?.phone} />
        <InfoRow label="Emergency contact" value={student?.emergency_contact_name} />
        <InfoRow label="Emergency phone" value={student?.emergency_contact_phone} />
      </Section>

      {/* Active enrolments */}
      <Section title="Active Enrolments">
        {loadingEnr ? (
          <ActivityIndicator style={{ marginVertical: 16 }} color="#ccff00" />
        ) : studentEnrolments.length === 0 ? (
          <Text style={s.empty}>No active enrolments.</Text>
        ) : (
          studentEnrolments.map(enr => {
            const sessionDetail = enr.class_session_detail
            const sessionName = sessionDetail?.name ?? enr.class_name ?? 'Class'
            const dayName = sessionDetail?.day_of_week_display ?? ''
            const startTime = sessionDetail?.start_time ? sessionDetail.start_time.slice(0, 5) : ''
            return (
              <View key={enr.id} style={s.enrCard}>
                <View style={s.enrTop}>
                  <Text style={s.enrName} numberOfLines={1}>{sessionName}</Text>
                  <View style={[s.enrTypeBadge, enr.enrolment_type === 'trial' && s.enrTypeBadgeTrial]}>
                    <Text style={[s.enrTypeBadgeText, enr.enrolment_type === 'trial' && s.enrTypeBadgeTextTrial]}>
                      {enr.enrolment_type}
                    </Text>
                  </View>
                </View>
                {(dayName || startTime) ? (
                  <Text style={s.enrMeta}>{[dayName, startTime].filter(Boolean).join(' · ')}</Text>
                ) : null}
                {enr.class_session_detail?.season_name ? (
                  <Text style={s.enrSeason}>{enr.class_session_detail.season_name}</Text>
                ) : null}
              </View>
            )
          })
        )}
      </Section>

      {/* Payment history */}
      <Section
        title="Payment History"
        action={
          <TouchableOpacity onPress={() => setShowPayModal(true)}>
            <Text style={s.sectionAction}>+ Record</Text>
          </TouchableOpacity>
        }
      >
        {loadingPayments ? (
          <ActivityIndicator style={{ marginVertical: 12 }} color="#ccff00" />
        ) : recentPayments.length === 0 ? (
          <Text style={s.empty}>No payments recorded.</Text>
        ) : (
          recentPayments.map(p => {
            const isDebit = ['charge', 'no_show_fee', 'casual', 'enrolment', 'payment'].includes(p.payment_type)
            const amountColor = isDebit ? '#ff5050' : '#ccff00'
            const sign = isDebit ? '-' : '+'
            return (
              <View key={p.id} style={s.payRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.payDesc} numberOfLines={1}>{p.description || p.payment_type}</Text>
                  <Text style={s.payDate}>{new Date(p.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                </View>
                <Text style={[s.payAmount, { color: amountColor }]}>{sign}${Math.abs(parseFloat(p.amount)).toFixed(2)}</Text>
              </View>
            )
          })
        )}
      </Section>

      {/* Notes */}
      <Section
        title="Notes"
        action={
          <TouchableOpacity onPress={() => setShowNotesModal(true)}>
            <Text style={s.sectionAction}>Edit</Text>
          </TouchableOpacity>
        }
      >
        {student?.notes ? (
          <Text style={s.notes}>{student.notes}</Text>
        ) : (
          <TouchableOpacity onPress={() => setShowNotesModal(true)}>
            <Text style={s.empty}>No notes. Tap to add.</Text>
          </TouchableOpacity>
        )}
      </Section>

      <RecordPaymentModal
        visible={showPayModal}
        studentId={studentId}
        onClose={() => setShowPayModal(false)}
        onSaved={() => { loadBalance(); loadPayments() }}
      />

      <EditNotesModal
        visible={showNotesModal}
        currentNotes={student?.notes}
        onClose={() => setShowNotesModal(false)}
        onSaved={handleSaveNotes}
      />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { padding: 16, paddingBottom: 48 },

  // Profile card
  profileCard: {
    alignItems: 'center', backgroundColor: '#111', borderRadius: 16,
    padding: 24, marginBottom: 12, borderWidth: 1, borderColor: '#222',
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#2a1a6e',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: '#b0a0ff', fontSize: 26, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  pronouns: { fontSize: 13, color: '#555', marginTop: 3 },
  levelBadge: {
    marginTop: 8, backgroundColor: 'rgba(204,255,0,0.12)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  levelBadgeText: { fontSize: 12, fontWeight: '700', color: '#ccff00' },

  // Actions row
  actionsRow: {
    flexDirection: 'row', gap: 10, marginBottom: 12,
  },
  actionBtn: {
    flex: 1, backgroundColor: '#111', borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#222', gap: 4,
  },
  actionBtnIcon: { fontSize: 20 },
  actionBtnText: { fontSize: 11, fontWeight: '600', color: '#888' },

  // Balance banner
  balanceBanner: {
    borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, alignItems: 'center',
  },
  balanceBannerOwing: { backgroundColor: 'rgba(255,80,80,0.08)', borderColor: 'rgba(255,80,80,0.25)' },
  balanceBannerCredit: { backgroundColor: 'rgba(204,255,0,0.06)', borderColor: 'rgba(204,255,0,0.2)' },
  balanceBannerZero: { backgroundColor: 'transparent', borderColor: '#1a1a1a' },
  balanceBannerText: { fontWeight: '700', fontSize: 14 },

  // Section
  section: {
    backgroundColor: '#111', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#222',
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#555',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  sectionAction: { fontSize: 12, fontWeight: '700', color: '#ccff00' },

  // Info rows
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  infoLabel: { fontSize: 13, color: '#555', flex: 1 },
  infoValue: { fontSize: 13, color: '#fff', flex: 2, textAlign: 'right' },

  // Enrolment cards
  enrCard: {
    backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#2a2a2a',
  },
  enrTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  enrName: { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1, marginRight: 8 },
  enrMeta: { fontSize: 12, color: '#888', marginTop: 3 },
  enrTypeBadge: {
    backgroundColor: 'rgba(176,160,255,0.15)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  enrTypeBadgeText: { fontSize: 11, fontWeight: '600', color: '#b0a0ff', textTransform: 'capitalize' },
  enrTypeBadgeTrial: { backgroundColor: 'rgba(245,158,11,0.15)' },
  enrTypeBadgeTextTrial: { color: '#f59e0b' },
  enrSeason: { fontSize: 12, color: '#555', marginTop: 2 },

  // Payment rows
  payRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  payDesc: { fontSize: 13, color: '#fff', marginBottom: 2 },
  payDate: { fontSize: 11, color: '#555' },
  payAmount: { fontSize: 14, fontWeight: '700', marginLeft: 8 },

  // Empty / notes
  empty: { fontSize: 13, color: '#555', paddingVertical: 4 },
  notes: { fontSize: 14, color: '#ccc', lineHeight: 20 },

  // Modals
  modalRoot: { flex: 1, backgroundColor: '#000' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#222',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  modalCancelText: { color: '#888', fontSize: 15 },
  modalSaveText: { color: '#ccff00', fontWeight: '700', fontSize: 15 },
  modalBody: { padding: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6, marginTop: 16 },
  fieldInput: {
    borderWidth: 1, borderColor: '#333', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#fff', backgroundColor: '#111',
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#333', backgroundColor: '#1a1a1a',
  },
  typeBtnActive: { borderColor: '#ccff00', backgroundColor: 'rgba(204,255,0,0.1)' },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#555' },
  typeBtnTextActive: { color: '#ccff00' },
})
