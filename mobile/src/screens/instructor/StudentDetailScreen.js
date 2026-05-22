import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, TextInput, Alert, Modal, FlatList,
} from 'react-native'
import { users, enrolments, attendance, payments as paymentsApi, skills as skillsApi, forms as formsApi, helpdesk } from '../../api'
import client from '../../api/client'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SKILL_LEVELS = {
  'Level 1': ['Fireman Spin', 'Chair Spin', 'Front Hook Spin', 'Body Wave', 'Basic Climb', 'Pole Hold & Grip', 'Floor Work Sequence'],
  'Level 2': ['Carousel Spin', 'Attitude Spin', 'Back Hook Spin', 'Crucifix', 'Hip Hold', 'Tuck Invert Prep', 'Brass Monkey'],
  'Level 3': ['Aerial Invert', 'Caterpillar', 'Russian Layback', 'Dead Lift Prep', 'Superman', 'Cross-knee Release', 'Handspring Prep'],
  'High Tricks': ['Iron X', 'Handspring', 'Deadlift Flag', 'Hollow Back', 'Pencil Drop', 'Shoulder Mount', 'Flag'],
}

const NOTE_TAGS = [
  { key: 'general', label: '📝 General' },
  { key: 'medical', label: '🏥 Medical' },
  { key: 'injury', label: '🩹 Injury' },
  { key: 'vibe', label: '✨ Vibe' },
]

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'enrolments', label: 'Enrolments' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'payments', label: 'Payments' },
  { key: 'progress', label: 'Progress' },
  { key: 'notes', label: 'Notes' },
  { key: 'docs', label: 'Documents' },
  { key: 'comms', label: 'Comms' },
]

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function InfoRow({ label, value, valueColor }) {
  if (!value && value !== 0) return null
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  )
}

function SectionCard({ title, action, children }) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Text style={s.cardTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  )
}

function StatBox({ label, value, color }) {
  return (
    <View style={s.statBox}>
      <Text style={[s.statVal, color ? { color } : null]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

// ── Record Payment Modal ──────────────────────────────────────────────────────

function RecordPaymentModal({ visible, studentId, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [paymentType, setPaymentType] = useState('payment')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { Alert.alert('Invalid', 'Enter a valid amount.'); return }
    setSaving(true)
    try {
      await paymentsApi.create({
        student: studentId,
        amount: amt,
        payment_type: paymentType,
        description: description.trim() || 'Payment recorded by instructor',
      })
      Alert.alert('Saved', `$${amt.toFixed(2)} recorded.`)
      setAmount(''); setDescription(''); onSaved?.(); onClose()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not record payment.')
    } finally { setSaving(false) }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.modalRoot}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={s.modalTitle}>Record Payment</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#ccff00" /> : <Text style={s.modalSave}>Save</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
          <Text style={s.fieldLabel}>Amount ($) *</Text>
          <TextInput style={s.fieldInput} value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor="#555" keyboardType="decimal-pad" />
          <Text style={s.fieldLabel}>Type</Text>
          <View style={s.typeRow}>
            {[['payment', 'Payment'], ['cash', 'Cash'], ['credit', 'Credit'], ['refund', 'Refund']].map(([val, lbl]) => (
              <TouchableOpacity key={val} style={[s.typeBtn, paymentType === val && s.typeBtnActive]} onPress={() => setPaymentType(val)}>
                <Text style={[s.typeBtnText, paymentType === val && s.typeBtnTextActive]}>{lbl}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.fieldLabel}>Description</Text>
          <TextInput style={s.fieldInput} value={description} onChangeText={setDescription} placeholder="e.g. Season 2026 Winter cash payment" placeholderTextColor="#555" />
        </ScrollView>
      </View>
    </Modal>
  )
}

// ── Add Note Modal ────────────────────────────────────────────────────────────

function AddNoteModal({ visible, studentId, onClose, onSaved }) {
  const [body, setBody] = useState('')
  const [tag, setTag] = useState('general')
  const [recheckDate, setRecheckDate] = useState('')
  const [isPermanent, setIsPermanent] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!body.trim()) { Alert.alert('Required', 'Please add note text.'); return }
    setSaving(true)
    try {
      await users.addNote(studentId, { body: body.trim(), tag, recheck_date: recheckDate || null, is_permanent: isPermanent })
      setBody(''); setRecheckDate(''); setIsPermanent(false)
      onSaved?.(); onClose()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not save note.')
    } finally { setSaving(false) }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.modalRoot}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={s.modalTitle}>Add Note</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#ccff00" /> : <Text style={s.modalSave}>Save</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
          <Text style={s.fieldLabel}>Category</Text>
          <View style={s.typeRow}>
            {NOTE_TAGS.map(t => (
              <TouchableOpacity key={t.key} style={[s.typeBtn, tag === t.key && s.typeBtnActive]} onPress={() => setTag(t.key)}>
                <Text style={[s.typeBtnText, tag === t.key && s.typeBtnTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.fieldLabel}>Note *</Text>
          <TextInput style={[s.fieldInput, { height: 120, textAlignVertical: 'top', paddingTop: 10 }]} value={body} onChangeText={setBody} placeholder="Internal note about this student…" placeholderTextColor="#555" multiline autoFocus />
          <Text style={s.fieldLabel}>Recheck Date (optional)</Text>
          <TextInput style={s.fieldInput} value={recheckDate} onChangeText={setRecheckDate} placeholder="YYYY-MM-DD" placeholderTextColor="#555" />
          <TouchableOpacity style={s.checkRow} onPress={() => setIsPermanent(v => !v)}>
            <View style={[s.checkbox, isPermanent && s.checkboxChecked]}>
              {isPermanent && <Text style={s.checkmark}>✓</Text>}
            </View>
            <Text style={s.checkLabel}>Permanent note (always surfaces in action items)</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )
}

// ── Issue Credit / Refund Modal ───────────────────────────────────────────────

function IssueCreditModal({ visible, studentId, onClose, onSaved }) {
  const [type, setType] = useState('credit')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      if (type === 'no_refund') {
        await paymentsApi.create({ student: studentId, payment_type: 'no_refund', amount: 0, description: description || 'No refund or credit issued' })
      } else {
        const amt = parseFloat(amount)
        if (!amt || amt <= 0) { Alert.alert('Invalid', 'Enter a valid amount.'); setSaving(false); return }
        await paymentsApi.create({ student: studentId, payment_type: type, amount: amt, description: description || `${type === 'refund' ? 'Refund' : 'Account credit'} issued` })
      }
      Alert.alert('Done', 'Recorded.')
      setAmount(''); setDescription(''); onSaved?.(); onClose()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not record.')
    } finally { setSaving(false) }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.modalRoot}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={s.modalTitle}>Issue Refund / Credit</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#ccff00" /> : <Text style={s.modalSave}>Save</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
          <Text style={s.fieldLabel}>Type</Text>
          <View style={s.typeRow}>
            {[['refund', 'Refund'], ['credit', 'Credit'], ['no_refund', 'No Refund']].map(([val, lbl]) => (
              <TouchableOpacity key={val} style={[s.typeBtn, type === val && s.typeBtnActive]} onPress={() => setType(val)}>
                <Text style={[s.typeBtnText, type === val && s.typeBtnTextActive]}>{lbl}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {type !== 'no_refund' && (
            <>
              <Text style={s.fieldLabel}>Amount ($)</Text>
              <TextInput style={s.fieldInput} value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor="#555" keyboardType="decimal-pad" />
            </>
          )}
          <Text style={s.fieldLabel}>Description / reason</Text>
          <TextInput style={s.fieldInput} value={description} onChangeText={setDescription} placeholder="Reason for decision" placeholderTextColor="#555" />
        </ScrollView>
      </View>
    </Modal>
  )
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function StudentDetailScreen({ navigation, route }) {
  const { studentId, studentName } = route.params ?? {}

  const [tab, setTab] = useState('overview')
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  // Data per tab
  const [balanceData, setBalanceData] = useState(null)
  const [enrolData, setEnrolData] = useState([])
  const [attData, setAttData] = useState([])
  const [payData, setPayData] = useState([])
  const [notesData, setNotesData] = useState([])
  const [skillProgress, setSkillProgress] = useState({})
  const [formsData, setFormsData] = useState([])
  const [savedCards, setSavedCards] = useState(null)
  const [lockerData, setLockerData] = useState(null)
  const [changeRequests, setChangeRequests] = useState([])
  const [commsData, setCommsData] = useState(null)
  const [notifData, setNotifData] = useState([])

  // UI state
  const [skillLevel, setSkillLevel] = useState('Level 1')
  const [noteCatFilter, setNoteCatFilter] = useState('all')
  const [showArchivedNotes, setShowArchivedNotes] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [chargingSaved, setChargingSaved] = useState(false)

  const loadAll = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    try {
      const [userRes, balRes, enrRes, attRes, payRes, noteRes, formsRes, cardsRes, lockerRes, crRes] = await Promise.all([
        users.get(studentId),
        paymentsApi.balance(studentId),
        enrolments.list({ student: studentId }),
        attendance.list({ student: studentId }),
        paymentsApi.list({ student: studentId }),
        users.notes(studentId, { archived: 'false' }),
        formsApi.listForStudent(studentId),
        paymentsApi.stripe.paymentMethods({ student_id: studentId }).catch(() => ({ data: null })),
        client.get('/api/classes/lockers/', { params: { assigned_to: studentId } }).catch(() => ({ data: [] })),
        enrolments.changeRequests.list({ student: studentId }).catch(() => ({ data: [] })),
      ])
      setStudent(userRes.data)
      setBalanceData(balRes.data)
      setEnrolData(enrRes.data.results ?? enrRes.data ?? [])
      setAttData(attRes.data.results ?? attRes.data ?? [])
      setPayData(payRes.data.results ?? payRes.data ?? [])
      setNotesData(noteRes.data.results ?? noteRes.data ?? [])
      setFormsData(formsRes.data.results ?? formsRes.data ?? [])
      setSavedCards(cardsRes.data)
      const lockers = lockerRes.data?.results ?? lockerRes.data ?? []
      setLockerData(lockers[0] ?? null)
      setChangeRequests(crRes.data.results ?? crRes.data ?? [])
    } finally { setLoading(false) }

    // Skills async
    skillsApi.list(studentId)
      .then(res => {
        const map = {}
        for (const sk of (res.data ?? [])) map[sk.skill_name] = { self: sk.self_assessed, teacher: sk.teacher_confirmed, id: sk.id }
        setSkillProgress(map)
      }).catch(() => {})
  }, [studentId])

  useEffect(() => { loadAll() }, [loadAll])

  // Load comms when tab active
  useEffect(() => {
    if (tab !== 'comms' || !studentId) return
    Promise.all([
      helpdesk.conversations().then(r => (r.data.results ?? r.data ?? []).filter(c => (c.student?.id ?? c.student) === studentId)).catch(() => []),
      client.get('/api/users/notifications/', { params: { recipient: studentId } }).then(r => r.data.results ?? r.data ?? []).catch(() => []),
    ]).then(([convs, notifs]) => { setCommsData(convs); setNotifData(notifs) })
  }, [tab, studentId])

  async function reloadNotes() {
    const res = await users.notes(studentId, { archived: showArchivedNotes ? 'true' : 'false' })
    setNotesData(res.data.results ?? res.data ?? [])
  }

  async function reloadBalance() {
    const res = await paymentsApi.balance(studentId)
    setBalanceData(res.data)
    const payRes = await paymentsApi.list({ student: studentId })
    setPayData(payRes.data.results ?? payRes.data ?? [])
  }

  async function toggleSkill(skillName, type) {
    const current = skillProgress[skillName] ?? {}
    const newVal = !current[type]
    const updated = { ...skillProgress, [skillName]: { ...current, [type]: newVal } }
    setSkillProgress(updated)
    const payload = {
      skill_name: skillName, level: skillLevel,
      self_assessed: type === 'self' ? newVal : (current.self ?? false),
      teacher_confirmed: type === 'teacher' ? newVal : (current.teacher ?? false),
    }
    try {
      const res = await skillsApi.save(studentId, payload)
      setSkillProgress(p => ({ ...p, [skillName]: { self: res.data.self_assessed, teacher: res.data.teacher_confirmed, id: res.data.id } }))
    } catch {
      setSkillProgress(p => ({ ...p, [skillName]: current }))
    }
  }

  async function archiveNote(noteId, archived) {
    await users.updateNote(studentId, noteId, { archived })
    await reloadNotes()
  }

  async function deleteNote(noteId) {
    Alert.alert('Delete note?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await users.deleteNote(studentId, noteId)
        await reloadNotes()
      }},
    ])
  }

  async function handleMessage() {
    try {
      await client.post('/api/helpdesk/conversations/', { student: studentId })
    } catch {}
    navigation.navigate('MessagesTab')
  }

  async function handleChargeSaved(bal) {
    setChargingSaved(true)
    try {
      await paymentsApi.stripe.chargeSaved({ student_id: studentId, amount_cents: Math.round(Math.abs(bal) * 100), description: 'Outstanding balance — Duality Pole Studio' })
      await reloadBalance()
      Alert.alert('Charged', 'Saved card charged successfully.')
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.detail || 'Charge failed.')
    } finally { setChargingSaved(false) }
  }

  if (loading) return <View style={s.root}><ActivityIndicator style={{ marginTop: 60 }} color="#ccff00" /></View>
  if (!student) return <View style={s.root}><Text style={s.empty}>Student not found.</Text></View>

  const displayName = student.display_name || [student.first_name, student.last_name].filter(Boolean).join(' ') || studentName || 'Student'
  const initials = ((student.first_name?.[0] ?? '') + (student.last_name?.[0] ?? '')).toUpperCase() || displayName[0]?.toUpperCase() || '?'
  const bal = balanceData ? parseFloat(balanceData.balance) : 0
  const isOwing = bal < 0
  const activeEnrols = enrolData.filter(e => e.status === 'active')
  const attRate = attData.length ? Math.round(attData.filter(a => a.status === 'present').length / attData.length * 100) : 0
  const filteredNotes = notesData.filter(n => noteCatFilter === 'all' || n.tag === noteCatFilter)
  const savedCard = savedCards?.payment_methods?.[0]

  return (
    <View style={s.root}>
      {/* Profile hero */}
      <View style={s.hero}>
        <View style={s.heroInner}>
          <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroName}>{displayName}</Text>
            {student.pronouns ? <Text style={s.heroPronoun}>{student.pronouns}</Text> : null}
            <View style={s.heroBadges}>
              {student.level_display || student.level ? <View style={s.badgeLime}><Text style={s.badgeLimeText}>{student.level_display ?? `Level ${student.level}`}</Text></View> : null}
              {isOwing ? <View style={s.badgeRed}><Text style={s.badgeRedText}>⚠ Owing</Text></View> : null}
              {student.booking_blocked ? <View style={s.badgeAmber}><Text style={s.badgeAmberText}>Frozen</Text></View> : null}
            </View>
          </View>
        </View>
        {/* Actions */}
        <View style={s.heroActions}>
          <TouchableOpacity style={s.heroBtn} onPress={handleMessage}><Text style={s.heroBtnText}>💬 Message</Text></TouchableOpacity>
          <TouchableOpacity style={s.heroBtn} onPress={() => setShowPayModal(true)}><Text style={s.heroBtnText}>💵 Payment</Text></TouchableOpacity>
          <TouchableOpacity style={s.heroBtn} onPress={() => { setTab('notes'); setShowNoteModal(true) }}><Text style={s.heroBtnText}>📝 Note</Text></TouchableOpacity>
          <TouchableOpacity
            style={[s.heroBtn, { borderColor: student.is_active ? 'rgba(255,80,80,0.4)' : 'rgba(204,255,0,0.4)' }]}
            onPress={() => {
              const action = student.is_active ? 'Block' : 'Unblock'
              Alert.alert(`${action} Account?`, `This will ${student.is_active ? 'prevent' : 'restore'} ${student.first_name}'s access.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: action, style: student.is_active ? 'destructive' : 'default', onPress: async () => {
                  await users.update(studentId, { is_active: !student.is_active })
                  setStudent(s => ({ ...s, is_active: !s.is_active }))
                }},
              ])
            }}
          >
            <Text style={[s.heroBtnText, { color: student.is_active ? '#ff5050' : '#ccff00' }]}>{student.is_active ? '🔒 Block' : '🔓 Unblock'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll} contentContainerStyle={s.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[s.tabBtn, tab === t.key && s.tabBtnActive]} onPress={() => setTab(t.key)}>
            <Text style={[s.tabBtnText, tab === t.key && s.tabBtnTextActive]}>
              {t.key === 'notes' && notesData.length ? `${t.label} (${notesData.length})` : t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.tabContent}>

        {/* ── OVERVIEW ─────────────────────────────────────────── */}
        {tab === 'overview' && (
          <>
            <SectionCard title="Contact Info">
              <InfoRow label="Email" value={student.email} />
              <InfoRow label="Phone" value={student.phone} />
              <InfoRow label="Date of Birth" value={student.date_of_birth} />
              <InfoRow label="Pronouns" value={student.pronouns} />
              <InfoRow label="Emergency" value={student.emergency_contact_name ? `${student.emergency_contact_name}  ·  ${student.emergency_contact_phone}` : null} />
              {student.internal_notes ? <View style={s.healthNote}><Text style={s.healthNoteText}>⚕ {student.internal_notes}</Text></View> : null}
            </SectionCard>

            <SectionCard title="Account Summary">
              <InfoRow label="Member since" value={fmtDate(student.created_at)} />
              <InfoRow label="Sessions attended" value={String(attData.filter(a => a.status === 'present').length)} />
              <InfoRow label="Total sessions" value={String(attData.length)} />
              <InfoRow label="Attendance rate" value={`${attRate}%`} valueColor={attRate >= 80 ? '#ccff00' : attRate >= 50 ? '#ffaa00' : '#ff5050'} />
              <InfoRow label="Lifetime spend" value={`$${parseFloat(balanceData?.total_paid ?? 0).toFixed(2)}`} />
              <InfoRow
                label="Balance"
                value={isOwing ? `-$${Math.abs(bal).toFixed(2)} owing` : bal > 0 ? `$${bal.toFixed(2)} credit` : '$0 clear'}
                valueColor={isOwing ? '#ff5050' : bal > 0 ? '#ccff00' : '#555'}
              />
              <InfoRow label="Active enrolments" value={`${activeEnrols.length} class${activeEnrols.length !== 1 ? 'es' : ''}`} />
              <InfoRow label="Source" value={student.source} />
            </SectionCard>

            {activeEnrols.length > 0 && (
              <SectionCard title="Current Classes">
                {activeEnrols.map(e => (
                  <View key={e.id} style={s.enrRow}>
                    <Text style={s.enrRowName} numberOfLines={1}>{e.class_session_detail?.name ?? e.class_name ?? 'Class'}</Text>
                    <Text style={s.enrRowMeta}>{DAYS[e.class_session_detail?.day_of_week] ?? ''} {e.class_session_detail?.start_time?.slice(0,5) ?? ''} · {e.class_session_detail?.studio_detail?.name ?? ''}</Text>
                  </View>
                ))}
              </SectionCard>
            )}

            {lockerData && (
              <SectionCard title="Locker">
                <View style={s.lockerRow}>
                  <Text style={s.lockerNum}>🔐 #{lockerData.number}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.lockerType}>{lockerData.locker_type?.replace(/_/g, ' ') ?? 'Standard'}</Text>
                    {lockerData.expires_at ? <Text style={s.lockerExpiry}>Expires {fmtDate(lockerData.expires_at)}</Text> : null}
                    <View style={s.lockerBadges}>
                      <Text style={[s.pill, lockerData.key_issued ? s.pillGreen : s.pillGrey]}>{lockerData.key_issued ? 'Key issued' : 'No key'}</Text>
                      {lockerData.key_lost && <Text style={s.pillRed}>Key lost</Text>}
                      <Text style={[s.pill, lockerData.payment_status === 'paid' ? s.pillGreen : s.pillAmber]}>{lockerData.payment_status ?? 'Unpaid'}</Text>
                    </View>
                  </View>
                </View>
              </SectionCard>
            )}
          </>
        )}

        {/* ── ENROLMENTS ───────────────────────────────────────── */}
        {tab === 'enrolments' && (
          <>
            {/* Add-on pricing */}
            {(() => {
              const PRICES = {1:270,2:440,3:580,4:700,5:800,6:900}
              const n = activeEnrols.length
              const next = n === 0 ? 270 : (PRICES[Math.min(n+1,6)] - PRICES[Math.min(n,5)])
              return (
                <View style={s.pricingBanner}>
                  <Text style={s.pricingText}>Next class add-on cost: <Text style={{ color: '#ccff00', fontWeight: '700' }}>${next}</Text></Text>
                </View>
              )
            })()}

            <SectionCard title={`Active (${activeEnrols.length})`}>
              {activeEnrols.length === 0 ? <Text style={s.empty}>No active enrolments</Text> : activeEnrols.map(e => (
                <View key={e.id} style={s.enrCard}>
                  <View style={s.enrCardTop}>
                    <Text style={s.enrCardName} numberOfLines={1}>{e.class_session_detail?.name ?? 'Class'}</Text>
                    <Text style={[s.pill, e.enrolment_type === 'trial' ? s.pillAmber : s.pillGreen]}>{e.enrolment_type === 'trial' ? 'Trial' : 'Enrolled'}</Text>
                  </View>
                  <Text style={s.enrCardMeta}>{DAYS[e.class_session_detail?.day_of_week] ?? ''} {e.class_session_detail?.start_time?.slice(0,5) ?? ''} · {e.class_session_detail?.studio_detail?.name ?? ''}</Text>
                  <Text style={s.enrCardSeason}>{e.class_session_detail?.season_name ?? ''}</Text>
                </View>
              ))}
            </SectionCard>

            {enrolData.filter(e => e.status === 'waitlisted').length > 0 && (
              <SectionCard title="Waitlisted">
                {enrolData.filter(e => e.status === 'waitlisted').map(e => (
                  <View key={e.id} style={s.enrCard}>
                    <Text style={s.enrCardName}>{e.class_session_detail?.name ?? 'Class'}</Text>
                    <Text style={s.enrCardMeta}>{DAYS[e.class_session_detail?.day_of_week] ?? ''} {e.class_session_detail?.start_time?.slice(0,5) ?? ''}</Text>
                  </View>
                ))}
              </SectionCard>
            )}

            {/* Past */}
            {enrolData.filter(e => !['active','waitlisted'].includes(e.status)).length > 0 && (
              <SectionCard title="Past / Cancelled">
                {enrolData.filter(e => !['active','waitlisted'].includes(e.status)).map(e => (
                  <View key={e.id} style={[s.enrCard, { opacity: 0.6 }]}>
                    <View style={s.enrCardTop}>
                      <Text style={s.enrCardName} numberOfLines={1}>{e.class_session_detail?.name ?? 'Class'}</Text>
                      <Text style={s.pillGrey}>{e.status}</Text>
                    </View>
                    <Text style={s.enrCardSeason}>{e.class_session_detail?.season_name ?? ''}</Text>
                  </View>
                ))}
              </SectionCard>
            )}

            {/* Change requests */}
            {changeRequests.length > 0 && (
              <SectionCard title="Class Change Requests">
                {changeRequests.map(req => (
                  <View key={req.id} style={s.changeReqCard}>
                    <View style={s.changeReqTop}>
                      <Text style={s.changeReqFrom} numberOfLines={1}>{req.current_enrolment_detail?.class_session_detail?.name ?? 'Unknown'}</Text>
                      <Text style={[s.pill, req.status === 'pending' ? s.pillAmber : req.status === 'approved' ? s.pillGreen : s.pillRed]}>{req.status}</Text>
                    </View>
                    {req.requested_session_detail && <Text style={s.changeReqTo}>→ {req.requested_session_detail.name}</Text>}
                    {req.notes ? <Text style={s.changeReqNote}>"{req.notes}"</Text> : null}
                    <Text style={s.changeReqDate}>{fmtDate(req.created_at)}</Text>
                  </View>
                ))}
              </SectionCard>
            )}
          </>
        )}

        {/* ── ATTENDANCE ───────────────────────────────────────── */}
        {tab === 'attendance' && (
          <>
            <View style={s.statsRow}>
              <StatBox label="Total" value={attData.length} />
              <StatBox label="Rate" value={`${attRate}%`} color={attRate >= 80 ? '#ccff00' : attRate >= 50 ? '#ffaa00' : '#ff5050'} />
              <StatBox label="No-shows" value={attData.filter(a => a.status === 'no_show').length} color="#ff5050" />
              <StatBox label="Present" value={attData.filter(a => a.status === 'present').length} color="#b0a0ff" />
            </View>
            {attData.length === 0 ? (
              <Text style={s.empty}>No attendance records.</Text>
            ) : (
              attData.map(a => {
                const STATUS_COLOR = { present: '#ccff00', late: '#ffaa00', no_show: '#ff5050', absent: '#555', cancelled: '#555' }
                const color = STATUS_COLOR[a.status] ?? '#888'
                return (
                  <View key={a.id} style={s.attRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.attClass} numberOfLines={1}>{a.occurrence_detail?.session_detail?.name ?? '—'}</Text>
                      <Text style={s.attDate}>{a.occurrence_detail?.date ? fmtDate(a.occurrence_detail.date) : '—'}</Text>
                      {a.notes ? <Text style={s.attNote}>{a.notes}</Text> : null}
                    </View>
                    <Text style={[s.attStatus, { color }]}>{a.status?.replace(/_/g, ' ')}</Text>
                  </View>
                )
              })
            )}
          </>
        )}

        {/* ── PAYMENTS ─────────────────────────────────────────── */}
        {tab === 'payments' && (
          <>
            <View style={s.statsRow}>
              <StatBox label="Outstanding" value={isOwing ? `$${Math.abs(bal).toFixed(2)}` : '$0'} color={isOwing ? '#ff5050' : '#555'} />
              <StatBox label="Total Paid" value={`$${parseFloat(balanceData?.total_paid ?? 0).toFixed(2)}`} color="#ccff00" />
              <StatBox label="Credit" value={bal > 0 ? `$${bal.toFixed(2)}` : '$0'} color={bal > 0 ? '#ccff00' : '#555'} />
            </View>

            {/* Saved card */}
            {savedCard && (
              <View style={s.savedCard}>
                <Text style={s.savedCardText}>💳 {savedCard.brand?.toUpperCase()} ···· {savedCard.last4} · exp {String(savedCard.exp_month).padStart(2,'0')}/{String(savedCard.exp_year).slice(-2)}</Text>
                {savedCards.auto_charge && <Text style={[s.pill, s.pillGreen]}>AUTO-CHARGE</Text>}
              </View>
            )}

            {/* Action buttons */}
            <View style={s.payActionsRow}>
              <TouchableOpacity style={s.payActionBtn} onPress={() => setShowPayModal(true)}>
                <Text style={s.payActionBtnText}>+ Record Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.payActionBtn} onPress={() => setShowCreditModal(true)}>
                <Text style={s.payActionBtnText}>Issue Refund / Credit</Text>
              </TouchableOpacity>
            </View>
            {savedCard && isOwing && (
              <TouchableOpacity
                style={[s.payActionBtn, { marginHorizontal: 0, marginBottom: 8, borderColor: 'rgba(204,255,0,0.4)' }]}
                onPress={() => handleChargeSaved(bal)}
                disabled={chargingSaved}
              >
                <Text style={[s.payActionBtnText, { color: '#ccff00' }]}>
                  {chargingSaved ? 'Charging…' : `Charge Saved Card — $${Math.abs(bal).toFixed(2)}`}
                </Text>
              </TouchableOpacity>
            )}

            {/* Transaction history */}
            <Text style={s.sectionHeading}>Transaction History</Text>
            {payData.length === 0 ? (
              <Text style={s.empty}>No transactions.</Text>
            ) : (() => {
              const rows = [...payData].reverse()
              let running = 0
              const withBal = rows.map(p => {
                const isCredit = ['payment','credit','refund'].includes(p.payment_type)
                const amt = parseFloat(p.amount ?? 0)
                if (isCredit) running += amt; else running -= amt
                return { ...p, _running: running, _isCredit: isCredit }
              })
              return withBal.reverse().map(p => {
                const TYPE = { payment: ['PAYMENT','#ccff00'], credit: ['CREDIT','#ccff00'], refund: ['REFUND','#ffaa00'], charge: ['INVOICE','#b0a0ff'], no_show_fee: ['FEE','#ff5050'] }
                const [typeLabel, typeColor] = TYPE[p.payment_type] ?? [p.payment_type, '#888']
                const amt = parseFloat(p.amount ?? 0)
                return (
                  <View key={p.id} style={s.txRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.txDesc} numberOfLines={1}>{p.description || p.payment_type?.replace(/_/g,' ')}</Text>
                      <View style={s.txMeta}>
                        <Text style={s.txDate}>{fmtDate(p.created_at)}</Text>
                        <Text style={[s.txType, { color: typeColor }]}>{typeLabel}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={[s.txAmt, { color: p._isCredit ? '#ccff00' : '#ff5050' }]}>
                        {p._isCredit ? '+' : '-'}${amt.toFixed(2)}
                      </Text>
                      <Text style={[s.txBal, { color: p._running < 0 ? '#ff5050' : p._running > 0 ? '#ccff00' : '#555' }]}>
                        bal {p._running < 0 ? `-$${Math.abs(p._running).toFixed(2)}` : `$${p._running.toFixed(2)}`}
                      </Text>
                    </View>
                  </View>
                )
              })
            })()}
          </>
        )}

        {/* ── PROGRESS ─────────────────────────────────────────── */}
        {tab === 'progress' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 0 }}>
              {Object.keys(SKILL_LEVELS).map(lvl => (
                <TouchableOpacity key={lvl} style={[s.levelBtn, skillLevel === lvl && s.levelBtnActive]} onPress={() => setSkillLevel(lvl)}>
                  <Text style={[s.levelBtnText, skillLevel === lvl && s.levelBtnTextActive]}>{lvl}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={s.skillLegend}>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#b0a0ff' }]} /><Text style={s.legendText}>Self-assessed</Text></View>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#ccff00' }]} /><Text style={s.legendText}>Teacher confirmed</Text></View>
            </View>
            {(SKILL_LEVELS[skillLevel] ?? []).map(skill => {
              const prog = skillProgress[skill] ?? {}
              return (
                <View key={skill} style={s.skillRow}>
                  <Text style={s.skillName} numberOfLines={1}>{skill}</Text>
                  <View style={s.skillDots}>
                    <TouchableOpacity onPress={() => toggleSkill(skill, 'self')}>
                      <View style={[s.skillDot, { borderColor: '#b0a0ff', backgroundColor: prog.self ? '#b0a0ff' : 'transparent' }]} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleSkill(skill, 'teacher')}>
                      <View style={[s.skillDot, { borderColor: '#ccff00', backgroundColor: prog.teacher ? '#ccff00' : 'transparent' }]} />
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })}
          </>
        )}

        {/* ── NOTES ────────────────────────────────────────────── */}
        {tab === 'notes' && (
          <>
            {/* Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
              {[{ key: 'all', label: 'All' }, ...NOTE_TAGS].map(t => (
                <TouchableOpacity key={t.key} style={[s.filterBtn, noteCatFilter === t.key && s.filterBtnActive]} onPress={() => setNoteCatFilter(t.key)}>
                  <Text style={[s.filterBtnText, noteCatFilter === t.key && s.filterBtnTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[s.filterBtn, showArchivedNotes && s.filterBtnActive]} onPress={() => {
                const next = !showArchivedNotes
                setShowArchivedNotes(next)
                users.notes(studentId, { archived: next ? 'true' : 'false' }).then(r => setNotesData(r.data.results ?? r.data ?? []))
              }}>
                <Text style={[s.filterBtnText, showArchivedNotes && s.filterBtnTextActive]}>{showArchivedNotes ? 'Active' : 'Archived'}</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={s.addNoteBtn} onPress={() => setShowNoteModal(true)}>
              <Text style={s.addNoteBtnText}>+ Add Note</Text>
            </TouchableOpacity>

            {filteredNotes.length === 0 ? (
              <Text style={s.empty}>{showArchivedNotes ? 'No archived notes' : 'No notes yet.'}</Text>
            ) : filteredNotes.map(n => (
              <View key={n.id} style={[s.noteCard, { opacity: n.archived ? 0.55 : 1 }]}>
                <View style={s.noteCardTop}>
                  <View style={s.noteTags}>
                    {n.tag && <Text style={s.pillAmber}>{n.tag}</Text>}
                    {n.is_permanent && <Text style={s.pillRed}>Permanent</Text>}
                    {n.recheck_date && <Text style={s.pillLav}>Recheck {fmtDate(n.recheck_date)}</Text>}
                  </View>
                  <View style={s.noteActions}>
                    <TouchableOpacity onPress={() => archiveNote(n.id, !n.archived)}>
                      <Text style={s.noteActionText}>{n.archived ? 'Restore' : 'Archive'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteNote(n.id)}>
                      <Text style={[s.noteActionText, { color: '#ff5050' }]}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={s.noteMeta}>{n.created_by_name} · {fmtDate(n.created_at)}</Text>
                <Text style={s.noteBody}>{n.body}</Text>
              </View>
            ))}
          </>
        )}

        {/* ── DOCUMENTS ────────────────────────────────────────── */}
        {tab === 'docs' && (
          <SectionCard title="Documents & Consents">
            {[
              { name: 'Health & Medical (PAR-Q)', type: 'parq' },
              { name: 'Liability Waiver', type: 'waiver' },
              { name: 'Photo Consent', type: 'photo_consent' },
              { name: 'Season Agreement', type: 'season_agreement' },
            ].map(doc => {
              const form = formsData.find(f => f.form_type === doc.type)
              const status = !form ? { label: 'Not submitted', color: '#555' } : form.completed ? { label: 'Signed ✓', color: '#ccff00' } : { label: 'In Progress', color: '#ffaa00' }
              return (
                <View key={doc.type} style={s.docRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.docName}>{doc.name}</Text>
                  </View>
                  <Text style={[s.docStatus, { color: status.color }]}>{status.label}</Text>
                </View>
              )
            })}
          </SectionCard>
        )}

        {/* ── COMMS ────────────────────────────────────────────── */}
        {tab === 'comms' && (
          <>
            <Text style={s.sectionHeading}>Notifications</Text>
            {notifData.length === 0 ? <Text style={s.empty}>No notifications.</Text> : notifData.map(n => (
              <View key={n.id} style={s.commsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.commsTitle}>{n.title}</Text>
                  {n.body ? <Text style={s.commsSub} numberOfLines={1}>{n.body}</Text> : null}
                </View>
                <Text style={s.commsDate}>{fmtDate(n.created_at)}</Text>
              </View>
            ))}

            <Text style={[s.sectionHeading, { marginTop: 20 }]}>Conversations</Text>
            {commsData === null ? (
              <ActivityIndicator color="#ccff00" style={{ marginTop: 20 }} />
            ) : commsData.length === 0 ? (
              <Text style={s.empty}>No conversations.</Text>
            ) : commsData.map(c => {
              const name = c.student_name ?? c.student?.display_name ?? `Student #${c.student}`
              return (
                <View key={c.id} style={s.commsRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.commsTitle}>{name}</Text>
                    {c.last_message?.body ? <Text style={s.commsSub} numberOfLines={1}>{c.last_message.body}</Text> : null}
                  </View>
                  {c.unread_count > 0 && <View style={s.unreadBadge}><Text style={s.unreadBadgeText}>{c.unread_count}</Text></View>}
                </View>
              )
            })}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modals */}
      <RecordPaymentModal
        visible={showPayModal}
        studentId={studentId}
        onClose={() => setShowPayModal(false)}
        onSaved={() => reloadBalance()}
      />
      <IssueCreditModal
        visible={showCreditModal}
        studentId={studentId}
        onClose={() => setShowCreditModal(false)}
        onSaved={() => reloadBalance()}
      />
      <AddNoteModal
        visible={showNoteModal}
        studentId={studentId}
        onClose={() => setShowNoteModal(false)}
        onSaved={() => reloadNotes()}
      />
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  // Hero
  hero: { backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#222', padding: 16 },
  heroInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#2a1a6e', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#b0a0ff', fontSize: 20, fontWeight: '700' },
  heroName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  heroPronoun: { fontSize: 12, color: '#555', marginTop: 2 },
  heroBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  heroActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  heroBtn: { borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#1a1a1a' },
  heroBtnText: { fontSize: 12, fontWeight: '600', color: '#aaa' },

  // Tabs
  tabScroll: { borderBottomWidth: 1, borderBottomColor: '#222', flexGrow: 0 },
  tabBar: { paddingHorizontal: 8, gap: 2, paddingVertical: 4 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#ccff00', borderRadius: 0 },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: '#555' },
  tabBtnTextActive: { color: '#fff' },
  tabContent: { padding: 14 },

  // Cards
  card: { backgroundColor: '#111', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.7 },

  // Info rows
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  infoLabel: { fontSize: 13, color: '#555', flex: 1 },
  infoValue: { fontSize: 13, color: '#fff', flex: 2, textAlign: 'right' },
  healthNote: { marginTop: 10, backgroundColor: 'rgba(255,120,60,0.1)', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: 'rgba(255,120,60,0.3)' },
  healthNoteText: { fontSize: 12, color: '#ff9977' },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: '#111', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  statVal: { fontSize: 18, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 9, color: '#555', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },

  // Enrolments
  enrRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  enrRowName: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 },
  enrRowMeta: { fontSize: 12, color: '#888' },
  enrCard: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2a2a2a' },
  enrCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  enrCardName: { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1, marginRight: 8 },
  enrCardMeta: { fontSize: 12, color: '#888', marginBottom: 2 },
  enrCardSeason: { fontSize: 11, color: '#555' },
  pricingBanner: { backgroundColor: '#1a1a1a', borderRadius: 8, padding: '10px 14px', marginBottom: 12, borderWidth: 1, borderColor: '#2a2a2a', paddingHorizontal: 12, paddingVertical: 10 },
  pricingText: { fontSize: 12, color: '#888' },
  changeReqCard: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2a2a2a' },
  changeReqTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  changeReqFrom: { fontSize: 13, fontWeight: '600', color: '#fff', flex: 1, marginRight: 8 },
  changeReqTo: { fontSize: 12, color: '#888', marginBottom: 4 },
  changeReqNote: { fontSize: 13, color: '#ccc', fontStyle: 'italic', marginBottom: 4 },
  changeReqDate: { fontSize: 11, color: '#555' },

  // Attendance
  attRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', gap: 8 },
  attClass: { fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 2 },
  attDate: { fontSize: 11, color: '#555' },
  attNote: { fontSize: 11, color: '#888', marginTop: 2, fontStyle: 'italic' },
  attStatus: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize', textAlign: 'right', minWidth: 70 },

  // Payments
  savedCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  savedCardText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  payActionsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  payActionBtn: { flex: 1, backgroundColor: '#111', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  payActionBtnText: { fontSize: 12, fontWeight: '600', color: '#aaa' },
  sectionHeading: { fontSize: 13, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 },
  txRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', gap: 8 },
  txDesc: { fontSize: 13, color: '#fff', marginBottom: 3 },
  txMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  txDate: { fontSize: 11, color: '#555' },
  txType: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  txAmt: { fontSize: 13, fontWeight: '700' },
  txBal: { fontSize: 10, fontWeight: '600' },

  // Progress
  skillLegend: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#888' },
  levelBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#333', backgroundColor: '#1a1a1a' },
  levelBtnActive: { borderColor: '#ccff00', backgroundColor: 'rgba(204,255,0,0.1)' },
  levelBtnText: { fontSize: 12, fontWeight: '600', color: '#555' },
  levelBtnTextActive: { color: '#ccff00' },
  skillRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111', borderRadius: 8, padding: '10px 14px', paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6, borderWidth: 1, borderColor: '#222' },
  skillName: { fontSize: 13, color: '#fff', flex: 1 },
  skillDots: { flexDirection: 'row', gap: 8 },
  skillDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },

  // Notes
  addNoteBtn: { backgroundColor: '#1a1a1a', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  addNoteBtnText: { fontSize: 13, fontWeight: '700', color: '#ccff00' },
  noteCard: { backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#222' },
  noteCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  noteTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  noteActions: { flexDirection: 'row', gap: 10, flexShrink: 0 },
  noteActionText: { fontSize: 12, color: '#888', fontWeight: '600' },
  noteMeta: { fontSize: 11, color: '#555', marginBottom: 6 },
  noteBody: { fontSize: 14, color: '#ccc', lineHeight: 20 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#333', backgroundColor: '#1a1a1a' },
  filterBtnActive: { borderColor: '#ccff00', backgroundColor: 'rgba(204,255,0,0.1)' },
  filterBtnText: { fontSize: 12, fontWeight: '600', color: '#555' },
  filterBtnTextActive: { color: '#ccff00' },

  // Documents
  docRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', gap: 12 },
  docName: { fontSize: 13, fontWeight: '600', color: '#fff' },
  docStatus: { fontSize: 12, fontWeight: '600', flexShrink: 0 },

  // Comms
  commsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#222', gap: 10 },
  commsTitle: { fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 2 },
  commsSub: { fontSize: 12, color: '#888' },
  commsDate: { fontSize: 11, color: '#555', flexShrink: 0 },
  unreadBadge: { backgroundColor: '#ccff00', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  unreadBadgeText: { fontSize: 10, fontWeight: '700', color: '#000' },

  // Locker
  lockerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  lockerNum: { fontSize: 22, marginTop: 2 },
  lockerType: { fontSize: 14, fontWeight: '600', color: '#fff', textTransform: 'capitalize', marginBottom: 2 },
  lockerExpiry: { fontSize: 12, color: '#888', marginBottom: 6 },
  lockerBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },

  // Pills
  pill: { fontSize: 10, fontWeight: '700', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden', borderWidth: 1 },
  pillGreen: { color: '#ccff00', borderColor: 'rgba(204,255,0,0.3)', backgroundColor: 'rgba(204,255,0,0.1)' },
  pillRed: { fontSize: 10, fontWeight: '700', color: '#ff5050', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,80,80,0.3)', backgroundColor: 'rgba(255,80,80,0.1)' },
  pillAmber: { fontSize: 10, fontWeight: '700', color: '#ffaa00', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,170,0,0.3)', backgroundColor: 'rgba(255,170,0,0.1)' },
  pillLav: { fontSize: 10, fontWeight: '700', color: '#b0a0ff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(176,160,255,0.3)', backgroundColor: 'rgba(176,160,255,0.1)' },
  pillGrey: { fontSize: 10, fontWeight: '700', color: '#888', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#333', backgroundColor: '#1a1a1a' },
  badgeLime: { backgroundColor: 'rgba(204,255,0,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeLimeText: { fontSize: 10, fontWeight: '700', color: '#ccff00' },
  badgeRed: { backgroundColor: 'rgba(255,80,80,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeRedText: { fontSize: 10, fontWeight: '700', color: '#ff5050' },
  badgeAmber: { backgroundColor: 'rgba(255,170,0,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeAmberText: { fontSize: 10, fontWeight: '700', color: '#ffaa00' },

  // Modal
  modalRoot: { flex: 1, backgroundColor: '#000' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  modalCancel: { color: '#888', fontSize: 15 },
  modalSave: { color: '#ccff00', fontWeight: '700', fontSize: 15 },
  modalBody: { padding: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6, marginTop: 16 },
  fieldInput: { borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#fff', backgroundColor: '#111' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#333', backgroundColor: '#1a1a1a' },
  typeBtnActive: { borderColor: '#ccff00', backgroundColor: 'rgba(204,255,0,0.1)' },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#555' },
  typeBtnTextActive: { color: '#ccff00' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#555', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: 'rgba(204,255,0,0.2)', borderColor: '#ccff00' },
  checkmark: { fontSize: 12, color: '#ccff00', fontWeight: '700' },
  checkLabel: { fontSize: 13, color: '#888', flex: 1 },

  empty: { textAlign: 'center', color: '#555', marginTop: 24, fontSize: 13 },
})
