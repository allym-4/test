import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, TextInput, Alert, Modal, FlatList,
} from 'react-native'
import { users, enrolments, attendance, payments as paymentsApi, skills as skillsApi, forms as formsApi, helpdesk, seasons as seasonsApi } from '../../api'
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
  { key: 'notes', label: 'Notes' },
  { key: 'enrolments', label: 'Enrolments' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'payments', label: 'Payments' },
  { key: 'progress', label: 'Progress' },
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
  const [seasonsData, setSeasonsData] = useState([])
  const [makeupCredits, setMakeupCredits] = useState([])
  const [casualBookings, setCasualBookings] = useState([])
  const [enrolSubTab, setEnrolSubTab] = useState('current')

  // UI state
  const [skillLevel, setSkillLevel] = useState('Level 1')
  const [noteCatFilter, setNoteCatFilter] = useState('all')
  const [showArchivedNotes, setShowArchivedNotes] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [chargingSaved, setChargingSaved] = useState(false)
  const [tcModal, setTcModal] = useState(false)
  const [tcStep, setTcStep] = useState(null) // null | 'transfer' | 'cancel' | 'cancel_all'
  const [tcEnrolment, setTcEnrolment] = useState(null)
  const [tcNewSession, setTcNewSession] = useState('')
  const [tcResolution, setTcResolution] = useState('credit')
  const [tcNotes, setTcNotes] = useState('')
  const [tcSaving, setTcSaving] = useState(false)
  const [tcError, setTcError] = useState(null)
  const [allSessions, setAllSessions] = useState([])
  const [seasonSessions, setSeasonSessions] = useState([])
  const [seasonSessionsLoading, setSeasonSessionsLoading] = useState(false)
  const [tcTransferClass, setTcTransferClass] = useState('')

  const loadAll = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    try {
      const [userRes, balRes, enrRes, attRes, payRes, noteRes, formsRes, cardsRes, lockerRes, crRes, seasonsRes, makeupRes, casualRes] = await Promise.all([
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
        seasonsApi.list().catch(() => ({ data: [] })),
        attendance.makeupCredits.list({ student: studentId }).catch(() => ({ data: [] })),
        client.get('/api/classes/casual-bookings/', { params: { student: studentId } }).catch(() => ({ data: [] })),
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
      setSeasonsData(seasonsRes.data.results ?? seasonsRes.data ?? [])
      setMakeupCredits(makeupRes.data.results ?? makeupRes.data ?? [])
      setCasualBookings(casualRes.data.results ?? casualRes.data ?? [])
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

  // Load sessions for transfer when enrolments tab active
  useEffect(() => {
    if (tab !== 'enrolments' || allSessions.length > 0) return
    client.get('/api/classes/sessions/', { params: { page_size: 200 } }).then(r => setAllSessions(r.data.results ?? r.data ?? [])).catch(() => {})
  }, [tab, studentId])

  // Load comms when tab active
  useEffect(() => {
    if (tab !== 'comms' || !studentId) return
    Promise.all([
      helpdesk.conversations().then(r => (r.data.results ?? r.data ?? []).filter(c => (c.student?.id ?? c.student) === studentId)).catch(() => []),
      client.get('/api/users/notifications/', { params: { recipient: studentId } }).then(r => r.data.results ?? r.data ?? []).catch(() => []),
    ]).then(([convs, notifs]) => { setCommsData(convs); setNotifData(notifs) })
  }, [tab, studentId])

  async function loadSeasonSessions(enrolment) {
    const sid = enrolment?.class_session_detail?.season
    if (!sid) return
    setSeasonSessions([])
    setSeasonSessionsLoading(true)
    try {
      const r = await client.get('/api/classes/sessions/', { params: { season: sid } })
      setSeasonSessions(r.data.results ?? r.data ?? [])
    } catch { } finally {
      setSeasonSessionsLoading(false)
    }
  }

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
            {/* Balance banner */}
            <TouchableOpacity
              style={[s.balanceBanner, isOwing ? s.balanceBannerOwing : bal > 0 ? s.balanceBannerCredit : s.balanceBannerClear]}
              onPress={() => setTab('payments')}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.balanceBannerLabel}>ACCOUNT BALANCE</Text>
                <Text style={[s.balanceBannerAmount, isOwing ? { color: '#ff5050' } : bal > 0 ? { color: '#ccff00' } : { color: '#555' }]}>
                  {isOwing ? `-$${Math.abs(bal).toFixed(2)}` : bal > 0 ? `+$${bal.toFixed(2)}` : '$0.00'}
                </Text>
                <Text style={s.balanceBannerSub}>
                  {isOwing ? 'Outstanding — tap to view payments' : bal > 0 ? 'Credit on account' : 'Account is clear'}
                </Text>
              </View>
              {isOwing && <Text style={s.balanceBannerArrow}>›</Text>}
            </TouchableOpacity>

            {/* Important notes surfaced on overview */}
            {notesData.filter(n => !n.archived && (n.is_permanent || n.tag === 'medical' || n.tag === 'injury')).map(n => (
              <TouchableOpacity key={n.id} style={s.importantNoteCard} onPress={() => setTab('notes')} activeOpacity={0.8}>
                <View style={s.importantNoteTop}>
                  <Text style={s.importantNoteIcon}>{n.tag === 'medical' ? '🏥' : n.tag === 'injury' ? '🩹' : '📌'}</Text>
                  <View style={s.importantNoteTags}>
                    {n.tag && <Text style={s.pillAmber}>{n.tag}</Text>}
                    {n.is_permanent && <Text style={s.pillRed}>Permanent</Text>}
                  </View>
                  <Text style={s.importantNoteDate}>{fmtDate(n.created_at)}</Text>
                </View>
                <Text style={s.importantNoteBody} numberOfLines={3}>{n.body}</Text>
              </TouchableOpacity>
            ))}

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
        {tab === 'enrolments' && (() => {
          const PRICES = {1:270,2:440,3:580,4:700,5:800,6:900}
          const n = activeEnrols.length
          const nextCost = n === 0 ? 270 : (PRICES[Math.min(n+1,6)] - PRICES[Math.min(n,5)])

          // Membership status
          const isBlocked = student.booking_blocked
          const hasOwing = isOwing
          const hasEverEnrolled = enrolData.length > 0
          let memberStatus, memberColor, memberBg
          if (isBlocked) { memberStatus = 'Blocked'; memberColor = '#ff5050'; memberBg = 'rgba(255,80,80,0.1)' }
          else if (hasOwing) { memberStatus = 'On Hold — Payment Issue'; memberColor = '#ffaa00'; memberBg = 'rgba(255,170,0,0.1)' }
          else if (activeEnrols.length > 0) { memberStatus = 'Enrolled'; memberColor = '#ccff00'; memberBg = 'rgba(204,255,0,0.1)' }
          else if (hasEverEnrolled) { memberStatus = 'Not Currently Enrolled'; memberColor = '#888'; memberBg = 'rgba(255,255,255,0.04)' }
          else { memberStatus = 'Never Enrolled'; memberColor = '#555'; memberBg = 'rgba(255,255,255,0.04)' }

          // Group active enrolments by season
          const activeBySeasonId = {}
          for (const e of activeEnrols) {
            const sid = e.class_session_detail?.season ?? 'unknown'
            if (!activeBySeasonId[sid]) activeBySeasonId[sid] = { name: e.class_session_detail?.season_name ?? 'Unknown Season', enrols: [] }
            activeBySeasonId[sid].enrols.push(e)
          }

          // Upcoming seasons not enrolled
          const upcomingUnbooked = seasonsData.filter(s =>
            (s.status === 'upcoming' || s.status === 'active') && s.bookings_open &&
            !activeEnrols.some(e => e.class_session_detail?.season === s.id)
          )

          // Casual bookings upcoming
          const upcomingCasuals = casualBookings.filter(cb => {
            const d = cb.occurrence_detail?.date ?? cb.date
            return d && new Date(d) >= new Date()
          })
          const unusedCredits = makeupCredits.filter(c => !c.used)

          // Waitlisted grouped by season
          const waitlisted = enrolData.filter(e => e.status === 'waitlisted')
          const waitlistBySeason = {}
          for (const e of waitlisted) {
            const sid = e.class_session_detail?.season ?? 'unknown'
            if (!waitlistBySeason[sid]) waitlistBySeason[sid] = { name: e.class_session_detail?.season_name ?? 'Unknown Season', enrols: [] }
            waitlistBySeason[sid].enrols.push(e)
          }

          // Past enrolments grouped by season
          const pastEnrols = enrolData.filter(e => ['completed','cancelled'].includes(e.status))
          const pastBySeason = {}
          for (const e of pastEnrols) {
            const sid = e.class_session_detail?.season ?? 'unknown'
            if (!pastBySeason[sid]) pastBySeason[sid] = { name: e.class_session_detail?.season_name ?? 'Unknown Season', enrols: [] }
            pastBySeason[sid].enrols.push(e)
          }

          // Change request label helper
          const crLabel = status => {
            if (status === 'pending') return 'In Progress'
            if (status === 'approved') return 'Approved'
            if (status === 'denied') return 'Denied'
            return status
          }
          const crPillStyle = status => status === 'approved' ? s.pillGreen : status === 'denied' ? s.pillRed : s.pillAmber

          return (
            <>
              {/* Membership status */}
              <View style={[s.memberStatusBanner, { backgroundColor: memberBg, borderColor: memberColor + '44' }]}>
                <Text style={s.memberStatusLabel}>MEMBERSHIP STATUS</Text>
                <Text style={[s.memberStatusVal, { color: memberColor }]}>{memberStatus}</Text>
              </View>

              {/* Add-on pricing */}
              <View style={s.pricingBanner}>
                <Text style={s.pricingText}>Next class add-on: <Text style={{ color: '#ccff00', fontWeight: '700' }}>${nextCost}</Text></Text>
              </View>

              {/* Sub-tabs */}
              <View style={s.enrSubTabs}>
                {[['current','Current'],['past','Past']].map(([key,lbl]) => (
                  <TouchableOpacity key={key} style={[s.enrSubTab, enrolSubTab === key && s.enrSubTabActive]} onPress={() => setEnrolSubTab(key)}>
                    <Text style={[s.enrSubTabText, enrolSubTab === key && s.enrSubTabTextActive]}>{lbl}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {enrolSubTab === 'current' && (
                <>
                  {/* Active enrolments grouped by season */}
                  {Object.keys(activeBySeasonId).length === 0 ? (
                    <View style={s.enrEmptyBlock}><Text style={s.empty}>No active enrolments</Text></View>
                  ) : Object.entries(activeBySeasonId).map(([sid, group]) => (
                    <View key={sid} style={s.seasonGroup}>
                      <Text style={s.seasonGroupTitle}>{group.name}</Text>
                      {group.enrols.map(e => (
                        <View key={e.id} style={s.enrCard}>
                          <View style={s.enrCardTop}>
                            <Text style={s.enrCardName} numberOfLines={1}>{e.class_session_detail?.name ?? 'Class'}</Text>
                            <Text style={[s.pill, e.enrolment_type === 'trial' ? s.pillAmber : s.pillGreen]}>
                              {e.enrolment_type === 'trial' ? 'Trial' : 'Enrolled'}
                            </Text>
                          </View>
                          <Text style={s.enrCardMeta}>
                            {DAYS[e.class_session_detail?.day_of_week] ?? ''} {e.class_session_detail?.start_time?.slice(0,5) ?? ''} · {e.class_session_detail?.studio_detail?.name ?? ''}
                          </Text>
                          {e.class_session_detail?.instructor_name ? (
                            <Text style={s.enrCardInstructor}>{e.class_session_detail.instructor_name}</Text>
                          ) : null}
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                            <TouchableOpacity
                              style={s.tcBtnTransfer}
                              onPress={() => { setTcEnrolment(e); setTcNewSession(''); setTcTransferClass(''); setTcNotes(''); setTcError(null); setTcStep('transfer'); setTcModal(true); loadSeasonSessions(e) }}
                            >
                              <Text style={s.tcBtnTransferText}>Transfer</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={s.tcBtnCancel}
                              onPress={() => { setTcEnrolment(e); setTcNotes(''); setTcResolution('credit'); setTcError(null); setTcStep('cancel'); setTcModal(true) }}
                            >
                              <Text style={s.tcBtnCancelText}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}

                  {/* Upcoming seasons not enrolled */}
                  {upcomingUnbooked.map(season => (
                    <View key={season.id} style={s.notEnrolledWarning}>
                      <Text style={s.notEnrolledText}>⚠ Not enrolled in {season.name} — follow up!</Text>
                      <TouchableOpacity
                        style={s.addNoteSmallBtn}
                        onPress={async () => {
                          try {
                            await users.addNote(studentId, { body: `Not enrolled in ${season.name} — follow up.`, tag: 'general' })
                            Alert.alert('Note added', `Note added for ${season.name}.`)
                          } catch { Alert.alert('Error', 'Could not add note.') }
                        }}
                      >
                        <Text style={s.addNoteSmallBtnText}>+ Note</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* Cancel All */}
                  {activeEnrols.length > 0 && (
                    <TouchableOpacity
                      style={s.cancelAllBtn}
                      onPress={() => { setTcNotes(''); setTcResolution('credit'); setTcError(null); setTcStep('cancel_all'); setTcModal(true) }}
                    >
                      <Text style={s.cancelAllBtnText}>Cancel All Enrolments</Text>
                    </TouchableOpacity>
                  )}

                  {/* Casual & Catch-up */}
                  <View style={s.creditRow}>
                    <View style={s.creditBox}>
                      <Text style={s.creditBoxVal}>{unusedCredits.length}</Text>
                      <Text style={s.creditBoxLabel}>Catch-up Credits</Text>
                    </View>
                    <View style={s.creditBox}>
                      <Text style={s.creditBoxVal}>{upcomingCasuals.length}</Text>
                      <Text style={s.creditBoxLabel}>Upcoming Casuals</Text>
                    </View>
                  </View>

                  {upcomingCasuals.length > 0 && (
                    <SectionCard title="Upcoming Casual Bookings">
                      {upcomingCasuals.map(cb => (
                        <View key={cb.id} style={s.enrCard}>
                          <Text style={s.enrCardName} numberOfLines={1}>
                            {cb.occurrence_detail?.session_detail?.name ?? cb.class_name ?? 'Casual Class'}
                          </Text>
                          <Text style={s.enrCardMeta}>{cb.occurrence_detail?.date ? fmtDate(cb.occurrence_detail.date) : ''}</Text>
                          <Text style={[s.pill, cb.booking_type === 'catchup' ? s.pillAmber : s.pillGreen]}>
                            {cb.booking_type === 'catchup' ? 'Catch-up' : 'Casual'}
                          </Text>
                        </View>
                      ))}
                    </SectionCard>
                  )}

                  {/* Waitlisted */}
                  {Object.keys(waitlistBySeason).length > 0 && (
                    <>
                      {Object.entries(waitlistBySeason).map(([sid, group]) => (
                        <View key={sid} style={s.seasonGroup}>
                          <Text style={s.seasonGroupTitle}>{group.name} — Waitlist</Text>
                          {group.enrols.map(e => (
                            <View key={e.id} style={s.enrCard}>
                              <View style={s.enrCardTop}>
                                <Text style={s.enrCardName} numberOfLines={1}>{e.class_session_detail?.name ?? 'Class'}</Text>
                                <Text style={s.pillAmber}>{e.waitlist_type === 'single' ? 'Single class' : 'Full season'}</Text>
                              </View>
                              <Text style={s.enrCardMeta}>
                                {DAYS[e.class_session_detail?.day_of_week] ?? ''} {e.class_session_detail?.start_time?.slice(0,5) ?? ''}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ))}
                    </>
                  )}

                  {/* Change requests */}
                  {changeRequests.length > 0 && (
                    <SectionCard title="Class Change Requests">
                      {changeRequests.map(req => (
                        <View key={req.id} style={s.changeReqCard}>
                          <View style={s.changeReqTop}>
                            <Text style={s.changeReqFrom} numberOfLines={1}>{req.current_enrolment_detail?.class_session_detail?.name ?? 'Unknown'}</Text>
                            <Text style={[s.pill, crPillStyle(req.status)]}>{crLabel(req.status)}</Text>
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

              {enrolSubTab === 'past' && (
                <>
                  {Object.keys(pastBySeason).length === 0 ? (
                    <View style={s.enrEmptyBlock}><Text style={s.empty}>No past enrolments</Text></View>
                  ) : Object.entries(pastBySeason).map(([sid, group]) => (
                    <View key={sid} style={s.seasonGroup}>
                      <Text style={s.seasonGroupTitle}>{group.name}</Text>
                      {group.enrols.map(e => (
                        <View key={e.id} style={[s.enrCard, { opacity: 0.65 }]}>
                          <View style={s.enrCardTop}>
                            <Text style={s.enrCardName} numberOfLines={1}>{e.class_session_detail?.name ?? 'Class'}</Text>
                            <Text style={[s.pill, e.status === 'completed' ? s.pillGrey : s.pillRed]}>
                              {e.status === 'completed' ? 'Completed' : 'Cancelled'}
                            </Text>
                          </View>
                          <Text style={s.enrCardMeta}>
                            {DAYS[e.class_session_detail?.day_of_week] ?? ''} {e.class_session_detail?.start_time?.slice(0,5) ?? ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </>
              )}
            </>
          )
        })()}

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

      {/* Transfer / Cancel Modal */}
      <Modal visible={tcModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTcModal(false)}>
        <View style={s.modalRoot}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => {
              if (tcStep === null) { setTcModal(false); setTcTransferClass(''); return }
              if (tcStep === 'transfer' && tcTransferClass) { setTcTransferClass(''); setTcNewSession(''); return }
              setTcStep(null); setTcTransferClass(''); setTcNewSession('')
            }}>
              <Text style={s.modalCancel}>{tcStep ? '← Back' : 'Close'}</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>
              {tcStep === 'transfer' ? 'Transfer Enrolment' : tcStep === 'cancel' ? 'Cancel Enrolment' : tcStep === 'cancel_all' ? 'Cancel All' : 'Transfer / Cancel'}
            </Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
            {tcError ? (
              <View style={{ backgroundColor: 'rgba(255,68,68,0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,68,68,0.3)', padding: 12, marginBottom: 14 }}>
                <Text style={{ color: '#ff5050', fontSize: 13 }}>{tcError}</Text>
              </View>
            ) : null}

            {/* Step: class list */}
            {!tcStep && (() => {
              const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
              return (
                <>
                  {activeEnrols.length === 0 ? (
                    <Text style={s.empty}>No active enrolments.</Text>
                  ) : activeEnrols.map(e => (
                    <View key={e.id} style={[s.enrCard, { marginBottom: 10 }]}>
                      <Text style={s.enrCardName} numberOfLines={1}>{e.class_session_detail?.name ?? 'Class'}</Text>
                      <Text style={s.enrCardMeta}>{DAYS[e.class_session_detail?.day_of_week] ?? ''} {e.class_session_detail?.start_time?.slice(0,5) ?? ''}</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                        <TouchableOpacity style={[s.tcBtnTransfer, { flex: 1 }]} onPress={() => { setTcEnrolment(e); setTcNewSession(''); setTcTransferClass(''); setTcNotes(''); setTcError(null); setTcStep('transfer'); loadSeasonSessions(e) }}>
                          <Text style={s.tcBtnTransferText}>Transfer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.tcBtnCancel, { flex: 1 }]} onPress={() => { setTcEnrolment(e); setTcNotes(''); setTcResolution('credit'); setTcError(null); setTcStep('cancel') }}>
                          <Text style={s.tcBtnCancelText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  <View style={{ borderTopWidth: 1, borderTopColor: '#222', marginTop: 8, paddingTop: 12 }}>
                    <TouchableOpacity
                      style={[s.tcBtnCancel, { alignItems: 'center', paddingVertical: 12 }]}
                      onPress={() => { setTcNotes(''); setTcResolution('credit'); setTcError(null); setTcStep('cancel_all') }}
                    >
                      <Text style={s.tcBtnCancelText}>Cancel All Enrolments</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )
            })()}

            {/* Step: Transfer — pick class name */}
            {tcStep === 'transfer' && !tcTransferClass && (() => {
              const availSessions = seasonSessions.filter(s => s.id !== tcEnrolment?.class_session)
              const uniqueNames = [...new Set(availSessions.map(s => s.name))].sort()
              return (
                <>
                  <View style={{ backgroundColor: '#1a1a1a', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Transferring from</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{tcEnrolment?.class_session_detail?.name}</Text>
                  </View>
                  <Text style={s.fieldLabel}>Select class</Text>
                  {seasonSessionsLoading ? (
                    <Text style={{ color: '#555', fontSize: 13, paddingVertical: 12 }}>Loading classes…</Text>
                  ) : uniqueNames.length === 0 ? (
                    <Text style={{ color: '#555', fontSize: 13, paddingVertical: 12 }}>No other classes available in this season.</Text>
                  ) : uniqueNames.map(name => (
                    <TouchableOpacity
                      key={name}
                      style={[s.enrCard, { marginBottom: 8 }]}
                      onPress={() => { setTcTransferClass(name); setTcNewSession('') }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{name}</Text>
                      <Text style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
                        {availSessions.filter(s => s.name === name).length} time{availSessions.filter(s => s.name === name).length !== 1 ? 's' : ''} available
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )
            })()}

            {/* Step: Transfer — pick day/time */}
            {tcStep === 'transfer' && tcTransferClass && (() => {
              const sessions = seasonSessions.filter(s => s.id !== tcEnrolment?.class_session && s.name === tcTransferClass)
              return (
                <>
                  <View style={{ backgroundColor: '#1a1a1a', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Transferring from</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{tcEnrolment?.class_session_detail?.name}</Text>
                  </View>
                  <View style={{ backgroundColor: '#1a1a1a', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Class</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{tcTransferClass}</Text>
                  </View>
                  <Text style={s.fieldLabel}>Select day / time</Text>
                  {sessions.map(sess => {
                    const spotsLeft = sess.spots_left ?? Math.max(0, (sess.capacity || 0) - (sess.enrolled_count || 0))
                    const isFull = spotsLeft <= 0
                    const isSelected = String(tcNewSession) === String(sess.id)
                    return (
                      <View key={sess.id} style={[s.enrCard, { marginBottom: 8, borderColor: isSelected ? 'rgba(204,255,0,0.4)' : '#2a2a2a', backgroundColor: isSelected ? 'rgba(204,255,0,0.06)' : '#1a1a1a' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 }}>
                              {DAYS[sess.day_of_week]} {sess.start_time?.slice(0,5)}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                              {[sess.instructor_detail?.display_name, sess.studio_detail?.name].filter(Boolean).join(' · ')}
                            </Text>
                            {isFull ? (
                              <Text style={s.pillRed}>FULL</Text>
                            ) : (
                              <Text style={{ fontSize: 11, color: '#555' }}>{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} available</Text>
                            )}
                          </View>
                          {isFull ? (
                            <TouchableOpacity
                              style={[s.tcBtnTransfer, { borderColor: 'rgba(255,170,0,0.3)', backgroundColor: 'rgba(255,170,0,0.1)' }]}
                              disabled={tcSaving}
                              onPress={async () => {
                                setTcSaving(true); setTcError(null)
                                try {
                                  await enrolments.create({ class_session: sess.id, student: studentId, status: 'waitlisted', waitlist_type: 'season' })
                                  const r = await enrolments.list({ student: studentId })
                                  setEnrolData(r.data.results ?? r.data ?? [])
                                  setTcModal(false); setTcStep(null); setTcTransferClass('')
                                } catch (err) { setTcError(err.response?.data?.detail || 'Could not join waitlist.') }
                                finally { setTcSaving(false) }
                              }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '600', color: '#ffaa00' }}>Add to Waitlist</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[isSelected ? s.typeBtnActive : s.typeBtn, { paddingHorizontal: 12, paddingVertical: 6 }]}
                              onPress={() => setTcNewSession(isSelected ? '' : String(sess.id))}
                            >
                              <Text style={[isSelected ? s.typeBtnTextActive : s.typeBtnText, { fontSize: 12 }]}>{isSelected ? '✓ Selected' : 'Select'}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )
                  })}
                  {tcNewSession ? (
                    <>
                      <Text style={[s.fieldLabel, { marginTop: 14 }]}>Notes (optional)</Text>
                      <TextInput style={[s.fieldInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]} value={tcNotes} onChangeText={setTcNotes} placeholder="Reason for transfer…" placeholderTextColor="#555" multiline />
                      <TouchableOpacity
                        style={[s.typeBtn, s.typeBtnActive, { marginTop: 16, alignItems: 'center', paddingVertical: 12 }]}
                        onPress={async () => {
                          setTcSaving(true); setTcError(null)
                          try {
                            await enrolments.changeRequests.create({ current_enrolment: tcEnrolment.id, requested_session: tcNewSession, request_type: 'transfer', notes: tcNotes })
                            const r = await enrolments.changeRequests.list({ student: studentId })
                            setChangeRequests(r.data.results ?? r.data ?? [])
                            setTcModal(false); setTcStep(null); setTcTransferClass('')
                          } catch (err) { setTcError(err.response?.data?.detail || 'Could not submit.') }
                          finally { setTcSaving(false) }
                        }}
                        disabled={tcSaving}
                      >
                        <Text style={s.typeBtnTextActive}>{tcSaving ? 'Submitting…' : 'Submit Transfer Request'}</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                </>
              )
            })()}

            {/* Step: Cancel single */}
            {tcStep === 'cancel' && (
              <>
                <View style={{ backgroundColor: '#1a1a1a', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Cancelling</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{tcEnrolment?.class_session_detail?.name}</Text>
                </View>
                <Text style={s.fieldLabel}>Resolution</Text>
                <View style={s.typeRow}>
                  {[['credit','Account Credit'],['refund','Refund'],['no_refund','No Refund']].map(([val,lbl]) => (
                    <TouchableOpacity key={val} style={[s.typeBtn, tcResolution === val && s.typeBtnActive]} onPress={() => setTcResolution(val)}>
                      <Text style={[s.typeBtnText, tcResolution === val && s.typeBtnTextActive]}>{lbl}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[s.fieldLabel, { marginTop: 14 }]}>Notes / reason</Text>
                <TextInput style={[s.fieldInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]} value={tcNotes} onChangeText={setTcNotes} placeholder="Reason for cancellation…" placeholderTextColor="#555" multiline />
                <Text style={{ fontSize: 12, color: '#555', marginTop: 10, marginBottom: 16 }}>This submits a cancellation request to Mimi &amp; Chloe for review.</Text>
                <TouchableOpacity
                  style={[s.tcBtnCancel, { alignItems: 'center', paddingVertical: 12 }]}
                  onPress={async () => {
                    setTcSaving(true); setTcError(null)
                    try {
                      await enrolments.changeRequests.create({ current_enrolment: tcEnrolment.id, request_type: 'cancel', cancellation_resolution: tcResolution, notes: tcNotes })
                      const r = await enrolments.changeRequests.list({ student: studentId })
                      setChangeRequests(r.data.results ?? r.data ?? [])
                      setTcModal(false); setTcStep(null)
                    } catch (err) { setTcError(err.response?.data?.detail || 'Could not submit.') }
                    finally { setTcSaving(false) }
                  }}
                  disabled={tcSaving}
                >
                  <Text style={s.tcBtnCancelText}>{tcSaving ? 'Submitting…' : 'Submit Cancellation Request'}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Step: Cancel all */}
            {tcStep === 'cancel_all' && (
              <>
                <View style={{ backgroundColor: 'rgba(255,68,68,0.08)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,68,68,0.2)', padding: 12, marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, color: '#ff5050' }}>This will submit cancellation requests for all {activeEnrols.length} active enrolment{activeEnrols.length !== 1 ? 's' : ''}.</Text>
                </View>
                {activeEnrols.map(e => (
                  <Text key={e.id} style={{ fontSize: 13, color: '#666', paddingBottom: 4 }}>· {e.class_session_detail?.name}</Text>
                ))}
                <Text style={s.fieldLabel}>Resolution</Text>
                <View style={s.typeRow}>
                  {[['credit','Account Credit'],['refund','Refund'],['no_refund','No Refund']].map(([val,lbl]) => (
                    <TouchableOpacity key={val} style={[s.typeBtn, tcResolution === val && s.typeBtnActive]} onPress={() => setTcResolution(val)}>
                      <Text style={[s.typeBtnText, tcResolution === val && s.typeBtnTextActive]}>{lbl}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[s.fieldLabel, { marginTop: 14 }]}>Notes / reason</Text>
                <TextInput style={[s.fieldInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]} value={tcNotes} onChangeText={setTcNotes} placeholder="Reason for cancellation…" placeholderTextColor="#555" multiline />
                <TouchableOpacity
                  style={[s.tcBtnCancel, { alignItems: 'center', paddingVertical: 12, marginTop: 16 }]}
                  onPress={async () => {
                    setTcSaving(true); setTcError(null)
                    try {
                      for (const e of activeEnrols) {
                        await enrolments.changeRequests.create({ current_enrolment: e.id, request_type: 'cancel', cancellation_resolution: tcResolution, notes: tcNotes })
                      }
                      const r = await enrolments.changeRequests.list({ student: studentId })
                      setChangeRequests(r.data.results ?? r.data ?? [])
                      setTcModal(false); setTcStep(null)
                    } catch (err) { setTcError(err.response?.data?.detail || 'One or more requests failed.') }
                    finally { setTcSaving(false) }
                  }}
                  disabled={tcSaving}
                >
                  <Text style={s.tcBtnCancelText}>{tcSaving ? 'Submitting…' : 'Submit All Cancellation Requests'}</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
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
  enrCardInstructor: { fontSize: 11, color: '#666', marginTop: 2 },
  enrEmptyBlock: { paddingVertical: 12, paddingHorizontal: 4 },
  pricingBanner: { backgroundColor: '#1a1a1a', borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#2a2a2a', paddingHorizontal: 12, paddingVertical: 10 },
  pricingText: { fontSize: 12, color: '#888' },
  memberStatusBanner: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, borderWidth: 1 },
  memberStatusLabel: { fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  memberStatusVal: { fontSize: 15, fontWeight: '700' },
  enrSubTabs: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 8, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: '#222' },
  enrSubTab: { flex: 1, paddingVertical: 9, alignItems: 'center' },
  enrSubTabActive: { backgroundColor: '#ccff00' },
  enrSubTabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  enrSubTabTextActive: { color: '#000' },
  seasonGroup: { marginBottom: 14 },
  seasonGroupTitle: { fontSize: 11, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  notEnrolledWarning: { backgroundColor: 'rgba(255,170,0,0.08)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,170,0,0.25)', padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notEnrolledText: { fontSize: 13, color: '#ffaa00', flex: 1, marginRight: 8 },
  addNoteSmallBtn: { backgroundColor: 'rgba(255,170,0,0.15)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,170,0,0.3)' },
  addNoteSmallBtnText: { fontSize: 12, fontWeight: '600', color: '#ffaa00' },
  creditRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  creditBox: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a' },
  creditBoxVal: { fontSize: 24, fontWeight: '700', color: '#ccff00', marginBottom: 4 },
  creditBoxLabel: { fontSize: 11, color: '#666', textAlign: 'center' },
  cancelAllBtn: { backgroundColor: 'rgba(255,68,68,0.08)', borderRadius: 8, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,68,68,0.25)', marginBottom: 14 },
  cancelAllBtnText: { fontSize: 13, fontWeight: '600', color: '#ff5050' },
  tcBtnTransfer: { backgroundColor: 'rgba(204,255,0,0.1)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(204,255,0,0.3)' },
  tcBtnTransferText: { fontSize: 12, fontWeight: '600', color: '#ccff00' },
  tcBtnCancel: { backgroundColor: 'rgba(255,68,68,0.08)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,68,68,0.25)' },
  tcBtnCancelText: { fontSize: 12, fontWeight: '600', color: '#ff5050' },
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

  // Balance banner
  balanceBanner: { borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  balanceBannerOwing: { backgroundColor: 'rgba(255,80,80,0.07)', borderColor: 'rgba(255,80,80,0.3)' },
  balanceBannerCredit: { backgroundColor: 'rgba(204,255,0,0.07)', borderColor: 'rgba(204,255,0,0.3)' },
  balanceBannerClear: { backgroundColor: '#111', borderColor: '#222' },
  balanceBannerLabel: { fontSize: 9, fontWeight: '700', color: '#555', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  balanceBannerAmount: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5, marginBottom: 2 },
  balanceBannerSub: { fontSize: 12, color: '#555' },
  balanceBannerArrow: { fontSize: 28, color: '#ff5050', marginLeft: 8 },

  // Important notes on overview
  importantNoteCard: { backgroundColor: 'rgba(255,170,0,0.06)', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,170,0,0.25)' },
  importantNoteTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  importantNoteIcon: { fontSize: 16 },
  importantNoteTags: { flexDirection: 'row', gap: 6, flex: 1 },
  importantNoteDate: { fontSize: 10, color: '#555' },
  importantNoteBody: { fontSize: 13, color: '#ccc', lineHeight: 19 },
})
