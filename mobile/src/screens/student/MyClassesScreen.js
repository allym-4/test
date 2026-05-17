import { useState, useEffect } from 'react'
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, ActivityIndicator, Share, Modal,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { enrolments, attendance, roster, settings as settingsApi, helpdesk } from '../../api'
import { TextInput } from 'react-native'
import LevelFilterBar from '../../components/LevelFilterBar'

function WhoComing({ sessionId }) {
  const [open, setOpen] = useState(false)
  const { data, loading, refetch } = useApi(
    () => open ? roster.get(sessionId) : null, [open, sessionId]
  )
  const names = data?.names ?? data ?? []

  if (!open) {
    return (
      <TouchableOpacity onPress={() => setOpen(true)} style={s.whoBtn}>
        <Text style={s.whoBtnText}>Who's coming?</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={s.whoPanel}>
      <Text style={s.whoLabel}>Who's coming</Text>
      {loading && <ActivityIndicator size="small" color="#ccff00" />}
      {!loading && names.length === 0 && (
        <Text style={s.whoEmpty}>No one's opted in yet.</Text>
      )}
      {!loading && names.length > 0 && (
        <Text style={s.whoNames}>{names.join('  ·  ')}</Text>
      )}
    </View>
  )
}

const STATUS_COLORS = {
  present: '#0a2a1a',
  absent: '#2a1a00',
  no_show: '#2a0a0a',
  late: '#1a1a2a',
  cancelled: '#1a1a1a',
}
const STATUS_TEXT = {
  present: '#ccff00',
  absent: '#f59e0b',
  no_show: '#ef4444',
  late: '#a78bfa',
  cancelled: '#666',
}

function StatusBadge({ status }) {
  return (
    <View style={[s.badge, { backgroundColor: STATUS_COLORS[status] ?? '#1a1a1a' }]}>
      <Text style={[s.badgeText, { color: STATUS_TEXT[status] ?? '#888' }]}>
        {status?.replace('_', ' ')}
      </Text>
    </View>
  )
}

function WaitlistClaimBanner({ enrolment, onClaimed }) {
  const [claiming, setClaiming] = useState(false)
  const session = enrolment.class_session_detail
  const expiresAt = enrolment.waitlist_expires_at ? new Date(enrolment.waitlist_expires_at) : null
  const minutesLeft = expiresAt ? Math.max(0, Math.round((expiresAt - new Date()) / 60000)) : null

  async function claim() {
    setClaiming(true)
    try {
      await enrolments.claimSpot(enrolment.id)
      onClaimed()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to claim spot.')
    } finally {
      setClaiming(false)
    }
  }

  return (
    <View style={wl.banner}>
      <View style={{ flex: 1 }}>
        <Text style={wl.title}>🎉 A spot opened up!</Text>
        <Text style={wl.sessionName}>{session?.name}</Text>
        <Text style={wl.timeLeft}>
          {enrolment.waitlist_urgent
            ? 'Class starts soon — first to confirm gets it!'
            : minutesLeft != null
              ? minutesLeft > 60
                ? `${Math.round(minutesLeft / 60)}h ${minutesLeft % 60}m to claim`
                : minutesLeft > 0
                  ? `⏰ Only ${minutesLeft} minutes left!`
                  : 'Claim your spot — offer may have expired.'
              : 'Claim before it\'s offered to the next person.'
          }
        </Text>
      </View>
      <TouchableOpacity style={wl.claimBtn} onPress={claim} disabled={claiming}>
        {claiming ? <ActivityIndicator color="#000" size="small" /> : <Text style={wl.claimBtnText}>Claim Spot →</Text>}
      </TouchableOpacity>
    </View>
  )
}

const wl = StyleSheet.create({
  banner: { backgroundColor: 'rgba(204,255,0,0.08)', borderWidth: 2, borderColor: '#ccff00', borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 14, fontWeight: '700', color: '#ccff00', marginBottom: 3 },
  sessionName: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 },
  timeLeft: { fontSize: 12, color: '#888', lineHeight: 18 },
  claimBtn: { backgroundColor: '#ccff00', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, flexShrink: 0 },
  claimBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },
})

function MarkAwayModal({ occurrence, session, cancellationWindowHours, onClose, onConfirm, confirming }) {
  const occDate = new Date(
    (occurrence.date || '') + 'T' + (occurrence.start_time || session?.start_time || '00:00')
  )
  const hoursUntil = (occDate - new Date()) / (1000 * 60 * 60)
  const windowHours = cancellationWindowHours || 24
  const isLate = hoursUntil > 0 && hoursUntil < windowHours
  const isPast = hoursUntil <= 0

  const dateLabel = new Date(occurrence.date + 'T00:00').toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const timeLabel = (occurrence.start_time || session?.start_time || '').slice(0, 5)

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={ma.overlay}>
        <View style={ma.sheet}>
          <View style={ma.header}>
            <Text style={ma.title}>Mark Away</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={ma.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={ma.className}>{session?.name || 'Class'}</Text>
          <Text style={ma.classMeta}>{dateLabel}{timeLabel ? `  ·  ${timeLabel}` : ''}</Text>

          {isLate ? (
            <View style={ma.warnBox}>
              <Text style={ma.warnText}>
                <Text style={{ fontWeight: '700' }}>Late cancellation: </Text>
                This class is within the {windowHours}-hour cancellation window. A late cancel fee may apply and a makeup credit will not be issued.
              </Text>
            </View>
          ) : isPast ? (
            <View style={ma.infoBox}>
              <Text style={ma.infoText}>This class has already started or passed.</Text>
            </View>
          ) : (
            <View style={ma.infoBox}>
              <Text style={ma.infoText}>
                Marking away lets your instructor plan ahead. A makeup credit may be issued if eligible.
              </Text>
            </View>
          )}

          <View style={ma.actions}>
            <TouchableOpacity style={ma.cancelBtn} onPress={onClose}>
              <Text style={ma.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[ma.confirmBtn, isPast && { opacity: 0.5 }]} onPress={onConfirm} disabled={confirming || isPast}>
              {confirming
                ? <ActivityIndicator size="small" color="#000" />
                : <Text style={ma.confirmBtnText}>Confirm Away</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const ma = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: { backgroundColor: '#1a1a1a', borderRadius: 16, width: '100%', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  title: { fontSize: 16, fontWeight: '800', color: '#fff' },
  close: { fontSize: 18, color: '#666' },
  className: { fontSize: 15, fontWeight: '700', color: '#fff', paddingHorizontal: 18, paddingTop: 16, marginBottom: 4 },
  classMeta: { fontSize: 13, color: '#666', paddingHorizontal: 18, marginBottom: 14 },
  infoBox: { marginHorizontal: 18, marginBottom: 18, backgroundColor: 'rgba(204,255,0,0.05)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.15)', borderRadius: 10, padding: 14 },
  infoText: { fontSize: 13, color: '#aaa', lineHeight: 20 },
  warnBox: { marginHorizontal: 18, marginBottom: 18, backgroundColor: 'rgba(255,170,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,170,0,0.25)', borderRadius: 10, padding: 14 },
  warnText: { fontSize: 13, color: '#f59e0b', lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, padding: 18, paddingTop: 0 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  confirmBtn: { flex: 1, backgroundColor: '#ccff00', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  confirmBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
})

// ─── CancelPolicyModal ────────────────────────────────────────────────────────
function CancelPolicyModal({ enrolment, onClose }) {
  const [subView, setSubView] = useState(null) // null | 'transfer'
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const sessionName = enrolment?.class_session_detail?.name ?? enrolment?.class_name ?? 'this class'
  const isWaitlist = enrolment?.status === 'waitlisted'

  async function handleLeaveWaitlist() {
    try {
      await enrolments.delete(enrolment.id)
      onClose(true)
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not remove from waitlist.')
    }
  }

  async function submitTransferRequest() {
    setSubmitting(true)
    try {
      await helpdesk.submitTicket({
        subject: `Transfer request — ${sessionName}`,
        body: `Student is requesting a transfer out of ${sessionName}.\n\n${note.trim()}`,
      })
      setSubmitted(true)
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not submit request. Please contact the studio directly.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={cp.overlay}>
        <View style={cp.sheet}>
          <View style={cp.header}>
            <Text style={cp.title}>{isWaitlist ? 'Leave Waitlist' : 'Season Enrolment'}</Text>
            <TouchableOpacity onPress={onClose} style={cp.closeBtn}>
              <Text style={cp.closeBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>

          <Text style={cp.sessionName}>{sessionName}</Text>

          {isWaitlist ? (
            // Waitlist — simple confirm leave
            <>
              <View style={cp.infoBox}>
                <Text style={cp.infoText}>You'll be removed from the waitlist for this class. You can rejoin at any time if a spot opens up.</Text>
              </View>
              <TouchableOpacity style={cp.dangerBtn} onPress={handleLeaveWaitlist}>
                <Text style={cp.dangerBtnText}>LEAVE WAITLIST</Text>
              </TouchableOpacity>
            </>
          ) : submitted ? (
            // Transfer request submitted
            <>
              <View style={cp.successBox}>
                <Text style={cp.successText}>✓  Transfer request submitted</Text>
                <Text style={cp.successSub}>The studio team will review your request and be in touch. Your enrolment remains active in the meantime.</Text>
              </View>
              <TouchableOpacity style={cp.keepBtn} onPress={onClose}>
                <Text style={cp.keepBtnText}>DONE</Text>
              </TouchableOpacity>
            </>
          ) : subView === 'transfer' ? (
            // Transfer request form
            <>
              <View style={cp.policyBox}>
                <Text style={cp.policyText}>Transfers are handled case-by-case. The studio will review your request and propose options (e.g. different class, future season credit).</Text>
              </View>
              <Text style={cp.inputLabel}>Reason for transfer (optional)</Text>
              <TextInput
                style={cp.noteInput}
                placeholder="Add a note for the studio..."
                placeholderTextColor="#555"
                multiline
                value={note}
                onChangeText={setNote}
              />
              <TouchableOpacity
                style={[cp.transferBtn, submitting && { opacity: 0.6 }]}
                onPress={submitTransferRequest}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#000" />
                  : <Text style={cp.transferBtnText}>SUBMIT TRANSFER REQUEST</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={cp.backLink} onPress={() => setSubView(null)}>
                <Text style={cp.backLinkText}>← Back</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Default: policy + options
            <>
              <View style={cp.policyBox}>
                <Text style={cp.policyTitle}>Non-refundable enrolment</Text>
                <Text style={cp.policyText}>
                  Season enrolments are non-refundable in line with our terms and conditions. If your circumstances have changed, you can request a transfer to a different class or a future season.
                </Text>
              </View>
              <TouchableOpacity style={cp.transferBtn} onPress={() => setSubView('transfer')}>
                <Text style={cp.transferBtnText}>REQUEST A TRANSFER</Text>
              </TouchableOpacity>
              <TouchableOpacity style={cp.keepBtn} onPress={onClose}>
                <Text style={cp.keepBtnText}>KEEP MY ENROLMENT</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

const cp = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
  sheet: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 44 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: '#fff' },
  closeBtn: { paddingLeft: 12 },
  closeBtnText: { color: '#555', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  sessionName: { fontSize: 15, color: '#aaa', marginBottom: 20 },
  policyBox: { backgroundColor: 'rgba(239,68,68,0.07)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 12, padding: 14, marginBottom: 20 },
  policyTitle: { fontSize: 13, fontWeight: '700', color: '#ef4444', marginBottom: 6 },
  policyText: { fontSize: 13, color: '#ccc', lineHeight: 20 },
  infoBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 14, marginBottom: 20 },
  infoText: { fontSize: 13, color: '#aaa', lineHeight: 20 },
  successBox: { backgroundColor: 'rgba(204,255,0,0.06)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.2)', borderRadius: 12, padding: 16, marginBottom: 20 },
  successText: { fontSize: 15, fontWeight: '700', color: '#ccff00', marginBottom: 8 },
  successSub: { fontSize: 13, color: '#aaa', lineHeight: 20 },
  transferBtn: { backgroundColor: '#ccff00', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  transferBtnText: { color: '#000', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  keepBtn: { backgroundColor: '#1a1a1a', borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  keepBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  dangerBtn: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  dangerBtnText: { color: '#ef4444', fontWeight: '800', fontSize: 14 },
  inputLabel: { fontSize: 13, color: '#666', marginBottom: 8 },
  noteInput: { backgroundColor: '#1a1a1a', borderRadius: 10, borderWidth: 1, borderColor: '#333', color: '#fff', fontSize: 14, padding: 12, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  backLink: { alignItems: 'center', paddingTop: 12 },
  backLinkText: { color: '#555', fontSize: 13 },
})

function ClassWaitlistLeaveModal({ enrolment, cancellationWindowHours, onClose }) {
  const [leaving, setLeaving] = useState(false)
  const [upgradingToSeason, setUpgradingToSeason] = useState(false)
  const sess = enrolment?.class_session_detail
  const sessName = sess?.name ?? enrolment?.class_name ?? 'this class'

  // Calculate hours until next occurrence
  let hoursUntil = null
  if (sess?.day_of_week != null && sess?.start_time) {
    const now = new Date()
    const targetDay = sess.day_of_week // 0=Mon, 1=Tue, ... 6=Sun
    // JS day: 0=Sun,1=Mon...6=Sat; model day: 0=Mon...6=Sun
    const jsDay = (targetDay + 1) % 7
    let daysUntil = (jsDay - now.getDay() + 7) % 7
    if (daysUntil === 0) {
      // same day — check if time has passed
      const [h, m] = sess.start_time.split(':').map(Number)
      const todayOcc = new Date(now); todayOcc.setHours(h, m, 0, 0)
      if (todayOcc <= now) daysUntil = 7
    }
    const nextDate = new Date(now)
    nextDate.setDate(nextDate.getDate() + daysUntil)
    const [h, m] = sess.start_time.split(':').map(Number)
    nextDate.setHours(h, m, 0, 0)
    hoursUntil = (nextDate - now) / (1000 * 60 * 60)
  }
  const windowHours = cancellationWindowHours ?? 24
  const isLate = hoursUntil != null && hoursUntil > 0 && hoursUntil < windowHours

  async function handleLeave() {
    setLeaving(true)
    try {
      await enrolments.delete(enrolment.id)
      onClose(true)
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not leave waitlist.')
    } finally { setLeaving(false) }
  }

  async function handleUpgradeToSeason() {
    setUpgradingToSeason(true)
    try {
      const sessionId = enrolment.class_session ?? sess?.id
      await enrolments.create({ student: enrolment.student, class_session: sessionId, status: 'waitlisted', enrolment_type: 'course' })
      await enrolments.delete(enrolment.id)
      onClose(true)
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not update waitlist.')
    } finally { setUpgradingToSeason(false) }
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={() => onClose(false)}>
      <View style={cwl.overlay}>
        <View style={cwl.sheet}>
          <View style={cwl.header}>
            <Text style={cwl.title}>Leave Class Waitlist</Text>
            <TouchableOpacity onPress={() => onClose(false)} style={cwl.closeBtn}>
              <Text style={cwl.closeBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
          <Text style={cwl.sessName}>{sessName}</Text>

          {isLate ? (
            <View style={cwl.warnBox}>
              <Text style={cwl.warnText}>
                <Text style={{ fontWeight: '700' }}>Late notice: </Text>
                This class is within the {windowHours}-hour window. The studio will be notified of the late withdrawal.
              </Text>
            </View>
          ) : (
            <View style={cwl.infoBox}>
              <Text style={cwl.infoText}>You'll be removed from the waitlist for this class. The next person on the list will be offered your spot.</Text>
            </View>
          )}

          <TouchableOpacity
            style={[cwl.seasonUpgradeBtn, (upgradingToSeason || leaving) && { opacity: 0.6 }]}
            onPress={handleUpgradeToSeason}
            disabled={upgradingToSeason || leaving}
          >
            {upgradingToSeason
              ? <ActivityIndicator color="#7c3aed" />
              : <Text style={cwl.seasonUpgradeBtnText}>JOIN SEASON WAITLIST INSTEAD</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[cwl.leaveBtn, (leaving || upgradingToSeason) && { opacity: 0.6 }]}
            onPress={handleLeave}
            disabled={leaving || upgradingToSeason}
          >
            {leaving
              ? <ActivityIndicator color="#ef4444" />
              : <Text style={cwl.leaveBtnText}>LEAVE CLASS WAITLIST</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const cwl = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
  sheet: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 44 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: '#fff' },
  closeBtn: { paddingLeft: 12 },
  closeBtnText: { color: '#555', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  sessName: { fontSize: 14, color: '#888', marginBottom: 18 },
  warnBox: { backgroundColor: 'rgba(255,170,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,170,0,0.25)', borderRadius: 12, padding: 14, marginBottom: 18 },
  warnText: { fontSize: 13, color: '#f59e0b', lineHeight: 20 },
  infoBox: { backgroundColor: 'rgba(204,255,0,0.05)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.15)', borderRadius: 12, padding: 14, marginBottom: 18 },
  infoText: { fontSize: 13, color: '#aaa', lineHeight: 20 },
  seasonUpgradeBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#7c3aed', marginBottom: 10 },
  seasonUpgradeBtnText: { color: '#b0a0ff', fontWeight: '800', fontSize: 13, letterSpacing: 0.3 },
  leaveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.07)' },
  leaveBtnText: { color: '#ef4444', fontWeight: '800', fontSize: 13 },
})

export default function MyClassesScreen({ navigation }) {
  const { user } = useAuth()
  const [tab, setTab] = useState('active')
  const [markingAway, setMarkingAway] = useState(null)
  const [markAwayModal, setMarkAwayModal] = useState(null) // { occurrence, session }
  const [cancelPolicyEnrol, setCancelPolicyEnrol] = useState(null)
  const [cancellingAway, setCancellingAway] = useState(null)
  const [levelFilter, setLevelFilter] = useState(null)
  const [classWaitlistLeaveEnrol, setClassWaitlistLeaveEnrol] = useState(null)

  useEffect(() => {
    if (user?.id) {
      AsyncStorage.getItem(`class_level_${user.id}`).then(val => setLevelFilter(val))
    }
  }, [user?.id])

  const { data: enrolData, loading, refetch } = useApi(
    () => enrolments.list({ status: 'active' }), []
  )
  const { data: waitlistData, refetch: refetchWaitlist } = useApi(
    () => enrolments.list({ status: 'waitlisted' }), []
  )
  const { data: historyData, loading: histLoading, refetch: refetchHistory } = useApi(
    () => attendance.list({ limit: 30 }), []
  )
  const { data: settingsData } = useApi(() => settingsApi.get(), [])

  const activeEnrolments = enrolData?.results ?? enrolData ?? []
  const waitlistedEnrolments = waitlistData?.results ?? waitlistData ?? []
  const history = historyData?.results ?? historyData ?? []
  const cancellationWindowHours = settingsData?.cancellation_window_hours ?? 24

  const availableLevels = [...new Set(
    activeEnrolments.map(e => e.class_session_detail?.level).filter(Boolean)
  )].sort()

  const filteredEnrolments = levelFilter
    ? activeEnrolments.filter(e => e.class_session_detail?.level === levelFilter)
    : activeEnrolments

  async function handleCancelAway(occurrenceId, name) {
    Alert.alert(
      'I can make it!',
      `Changed your mind? We'll check if your spot in ${name} is still available.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: "Yes, I'm coming!",
          onPress: async () => {
            setCancellingAway(occurrenceId)
            try {
              const res = await attendance.cancelAway(occurrenceId)
              const msg = res.data?.message
              const isWaitlisted = res.data?.status === 'waitlisted'
              Alert.alert(
                isWaitlisted ? 'Spot Taken' : "You're Back In!",
                msg || (isWaitlisted ? "Your spot was taken but you've been added to the waitlist." : "You're back on the register!")
              )
              refetch()
              refetchHistory()
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail || 'Could not process request.')
            } finally {
              setCancellingAway(null)
            }
          },
        },
      ]
    )
  }

  function handleMarkAway(occurrence, session) {
    setMarkAwayModal({ occurrence, session })
  }

  async function confirmMarkAway() {
    if (!markAwayModal) return
    setMarkingAway(markAwayModal.occurrence.id)
    try {
      const res = await attendance.markAway(markAwayModal.occurrence.id)
      const creditIssued = res.data?.credit_issued
      setMarkAwayModal(null)
      Alert.alert(
        'Marked away',
        creditIssued
          ? "You've been marked away and a catch-up credit has been added to your account."
          : "You've been marked away. No makeup credit was issued as this is within the cancellation window.",
      )
      refetch()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not mark away.')
    } finally {
      setMarkingAway(null)
    }
  }

  function handleExportCalendar() {
    if (activeEnrolments.length === 0) {
      Alert.alert('No classes', 'You have no active enrolments to export.')
      return
    }
    const DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Duality Pole Studio//Mobile//EN']
    activeEnrolments.forEach(enr => {
      const sess = enr.class_session_detail ?? enr.session
      const name = sess?.name ?? 'Pole Class'
      const studio = sess?.studio_detail?.name ?? sess?.studio?.name ?? 'Duality Pole Studio'
      const startTime = sess?.start_time?.replace(/:/g, '').slice(0, 4) ?? '0900'
      const endTime = sess?.end_time?.replace(/:/g, '').slice(0, 4) ?? '1000'
      const dayNum = sess?.day_of_week // 0=Mon..6=Sun
      const byday = dayNum != null ? DAYS[dayNum] : null
      const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
      lines.push(
        'BEGIN:VEVENT',
        `UID:${enr.id}@dualitypolestudio`,
        `DTSTAMP:${now}`,
        `SUMMARY:${name}`,
        `LOCATION:${studio}`,
        byday ? `RRULE:FREQ=WEEKLY;BYDAY=${byday}` : '',
        `DTSTART;TZID=Australia/Sydney:20250101T${startTime}00`,
        `DTEND;TZID=Australia/Sydney:20250101T${endTime}00`,
        'END:VEVENT',
      ).filter(Boolean)
    })
    lines.push('END:VCALENDAR')
    const ics = lines.join('\r\n')
    Share.share({ message: ics, title: 'My Pole Classes' })
  }

  function handleCancelEnrolment(enrolment) {
    setCancelPolicyEnrol(enrolment)
  }

  return (
    <View style={s.root}>
      <View style={s.topLinks}>
        <TouchableOpacity style={s.topLink} onPress={() => navigation.navigate('Progress')}>
          <Text style={s.topLinkText}>⭐ Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.topLink} onPress={() => navigation.navigate('Homework')}>
          <Text style={s.topLinkText}>📚 Homework</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.topLink} onPress={handleExportCalendar}>
          <Text style={s.topLinkText}>📅 Export</Text>
        </TouchableOpacity>
      </View>

      {availableLevels.length > 0 && (
        <LevelFilterBar
          levels={availableLevels}
          selected={levelFilter}
          onSelect={level => {
            setLevelFilter(level)
            if (user?.id) {
              level
                ? AsyncStorage.setItem(`class_level_${user.id}`, level)
                : AsyncStorage.removeItem(`class_level_${user.id}`)
            }
          }}
        />
      )}

      <View style={s.tabs}>
        {[['active', 'My Classes'], ['history', 'Attendance']].map(([key, label]) => (
          <TouchableOpacity key={key} style={[s.tab, tab === key && s.tabActive]} onPress={() => setTab(key)}>
            <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'active' && (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        >
          {/* Waitlist claim banners */}
          {waitlistedEnrolments.filter(e => e.waitlist_offered_at).map(e => (
            <WaitlistClaimBanner key={e.id} enrolment={e} onClaimed={() => { refetch(); refetchWaitlist() }} />
          ))}

          {/* Pricing summary strip */}
          {activeEnrolments.length > 0 && (
            <View style={s.pricingStrip}>
              <Text style={s.pricingText}>
                {activeEnrolments.length} class{activeEnrolments.length !== 1 ? 'es' : ''} · Active season
              </Text>
              {activeEnrolments.length === 1 && (
                <Text style={s.pricingHint}>Add a 2nd class for a better rate</Text>
              )}
            </View>
          )}

          {filteredEnrolments.length === 0 && !loading && (
            <Text style={s.empty}>
              {levelFilter && activeEnrolments.length > 0
                ? `No ${levelFilter} classes. Try a different level or tap All.`
                : 'No active enrolments.'}
            </Text>
          )}
          {filteredEnrolments.map(enr => {
            const sess = enr.class_session_detail
            const sessName = sess?.name ?? enr.class_name ?? 'Class'
            return (
              <View key={enr.id} style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardTitle}>{sessName}</Text>
                  {enr.enrolment_type && (
                    <View style={s.typeBadge}>
                      <Text style={s.typeBadgeText}>{enr.enrolment_type}</Text>
                    </View>
                  )}
                </View>
                {sess?.studio_detail?.name && (
                  <Text style={s.cardMeta}>{sess.studio_detail.name}</Text>
                )}
                {enr.next_occurrence && (
                  <View style={s.nextClass}>
                    <Text style={s.nextLabel}>Next class</Text>
                    <Text style={s.nextDate}>
                      {new Date(enr.next_occurrence.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}
                      {enr.next_occurrence.start_time ? `  ·  ${enr.next_occurrence.start_time.slice(0, 5)}` : ''}
                    </Text>
                    {enr.next_occurrence.my_status === 'absent' || enr.next_occurrence.marked_away ? (
                      <View style={s.awayRow}>
                        <View style={s.awayBadge}><Text style={s.awayBadgeText}>Marked away</Text></View>
                        <TouchableOpacity
                          style={s.canMakeItBtn}
                          disabled={cancellingAway === enr.next_occurrence.id}
                          onPress={() => handleCancelAway(enr.next_occurrence.id, sessName)}
                        >
                          {cancellingAway === enr.next_occurrence.id
                            ? <ActivityIndicator size="small" color="#ccff00" />
                            : <Text style={s.canMakeItText}>I can make it!</Text>
                          }
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={s.awayBtn}
                        disabled={markingAway === enr.next_occurrence.id}
                        onPress={() => handleMarkAway(enr.next_occurrence, sess)}
                      >
                        {markingAway === enr.next_occurrence.id
                          ? <ActivityIndicator size="small" color="#ccff00" />
                          : <Text style={s.awayBtnText}>Mark away</Text>
                        }
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                {(sess?.id ?? enr.class_session) && (
                  <WhoComing sessionId={sess?.id ?? enr.class_session} />
                )}

                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => handleCancelEnrolment(enr)}
                >
                  <Text style={s.cancelBtnText}>Cancel enrolment</Text>
                </TouchableOpacity>
              </View>
            )
          })}

          {/* Season Waitlist */}
          {waitlistedEnrolments.filter(e => !e.waitlist_offered_at && e.enrolment_type === 'course').length > 0 && (
            <View style={s.waitlistSection}>
              <Text style={s.waitlistSectionTitle}>SEASON WAITLIST</Text>
              {waitlistedEnrolments.filter(e => !e.waitlist_offered_at && e.enrolment_type === 'course').map(e => {
                const s2 = e.class_session_detail
                return (
                  <View key={e.id} style={s.waitlistCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.waitlistName}>{s2?.name ?? 'Class'}</Text>
                      <Text style={s.waitlistMeta}>
                        {[s2?.day_of_week != null ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][s2.day_of_week] : null, s2?.studio_detail?.name].filter(Boolean).join(' · ')}
                      </Text>
                      {e.waitlist_position != null && (
                        <Text style={s.waitlistPos}>Position #{e.waitlist_position}</Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => handleCancelEnrolment(e)}>
                      <Text style={s.leaveWaitlist}>Leave</Text>
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          )}

          {/* Class Waitlist */}
          {waitlistedEnrolments.filter(e => !e.waitlist_offered_at && e.enrolment_type !== 'course').length > 0 && (
            <View style={s.waitlistSection}>
              <Text style={s.waitlistSectionTitle}>CLASS WAITLIST</Text>
              {waitlistedEnrolments.filter(e => !e.waitlist_offered_at && e.enrolment_type !== 'course').map(e => {
                const s2 = e.class_session_detail
                return (
                  <View key={e.id} style={s.waitlistCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.waitlistName}>{s2?.name ?? 'Class'}</Text>
                      <Text style={s.waitlistMeta}>
                        {[s2?.day_of_week != null ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][s2.day_of_week] : null, s2?.studio_detail?.name].filter(Boolean).join(' · ')}
                      </Text>
                      {e.waitlist_position != null && (
                        <Text style={s.waitlistPos}>Position #{e.waitlist_position}</Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => setClassWaitlistLeaveEnrol(e)}>
                      <Text style={s.leaveWaitlist}>Leave</Text>
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          )}
        </ScrollView>
      )}

      {tab === 'history' && (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={histLoading} onRefresh={refetchHistory} />}
        >
          {history.length === 0 && !histLoading && (
            <Text style={s.empty}>No attendance history yet.</Text>
          )}
          {history.map(rec => (
            <View key={rec.id} style={s.histRow}>
              <View style={s.histInfo}>
                <Text style={s.histClass}>{rec.occurrence?.session?.name ?? 'Class'}</Text>
                <Text style={s.histDate}>
                  {rec.occurrence?.date
                    ? new Date(rec.occurrence.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                    : ''}
                </Text>
              </View>
              <StatusBadge status={rec.status} />
            </View>
          ))}
        </ScrollView>
      )}

      {markAwayModal && (
        <MarkAwayModal
          occurrence={markAwayModal.occurrence}
          session={markAwayModal.session}
          cancellationWindowHours={cancellationWindowHours}
          onClose={() => setMarkAwayModal(null)}
          onConfirm={confirmMarkAway}
          confirming={!!markingAway}
        />
      )}

      {cancelPolicyEnrol && (
        <CancelPolicyModal
          enrolment={cancelPolicyEnrol}
          onClose={(didLeave) => {
            setCancelPolicyEnrol(null)
            if (didLeave) { refetch(); refetchWaitlist() }
          }}
        />
      )}

      {classWaitlistLeaveEnrol && (
        <ClassWaitlistLeaveModal
          enrolment={classWaitlistLeaveEnrol}
          cancellationWindowHours={cancellationWindowHours}
          onClose={(didLeave) => {
            setClassWaitlistLeaveEnrol(null)
            if (didLeave) { refetch(); refetchWaitlist() }
          }}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  tabs: { flexDirection: 'row', backgroundColor: '#000', borderBottomWidth: 1, borderBottomColor: '#222' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#ccff00' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#666' },
  tabTextActive: { color: '#ccff00', fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: '#666', marginTop: 40 },
  card: { backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  typeBadge: { backgroundColor: '#1a1a2a', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#333' },
  typeBadgeText: { fontSize: 11, fontWeight: '600', color: '#ccff00', textTransform: 'capitalize' },
  cardMeta: { fontSize: 13, color: '#888', marginBottom: 10 },
  nextClass: { backgroundColor: '#0a0a0a', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  nextLabel: { fontSize: 11, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  nextDate: { fontSize: 14, color: '#fff', fontWeight: '500', marginBottom: 8 },
  awayBtn: { alignSelf: 'flex-start', backgroundColor: '#1a1a1a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#333' },
  awayBtnText: { fontSize: 13, fontWeight: '600', color: '#ccff00' },
  awayRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  awayBadge: { backgroundColor: 'rgba(255,170,0,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,170,0,0.3)' },
  awayBadgeText: { fontSize: 11, fontWeight: '700', color: '#f59e0b' },
  canMakeItBtn: { paddingVertical: 4 },
  canMakeItText: { fontSize: 13, fontWeight: '600', color: '#ccff00' },
  pricingStrip: { backgroundColor: 'rgba(176,160,255,0.08)', borderWidth: 1, borderColor: 'rgba(176,160,255,0.2)', borderRadius: 12, padding: 14, marginBottom: 12 },
  pricingText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  pricingHint: { fontSize: 12, color: '#888', marginTop: 2 },
  waitlistSection: { marginTop: 8 },
  waitlistSectionTitle: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  waitlistCard: { backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#222', flexDirection: 'row', alignItems: 'center', gap: 12 },
  waitlistName: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 },
  waitlistMeta: { fontSize: 12, color: '#888' },
  waitlistPos: { fontSize: 11, fontWeight: '700', color: '#b0a0ff', marginTop: 3 },
  leaveWaitlist: { fontSize: 13, color: '#ef4444', fontWeight: '500' },
  cancelBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  cancelBtnText: { fontSize: 13, color: '#ef4444' },
  topLinks: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: '#000', borderBottomWidth: 1, borderBottomColor: '#222' },
  topLink: { flex: 1, backgroundColor: '#111', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  topLinkText: { fontSize: 13, fontWeight: '600', color: '#ccff00' },
  histRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#222' },
  histInfo: { flex: 1 },
  histClass: { fontWeight: '600', color: '#fff', fontSize: 14 },
  histDate: { fontSize: 12, color: '#888', marginTop: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  whoBtn: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 4 },
  whoBtnText: { fontSize: 13, color: '#ccff00', fontWeight: '600' },
  whoPanel: { backgroundColor: '#0a0a0a', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#222' },
  whoLabel: { fontSize: 11, fontWeight: '700', color: '#ccff00', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  whoEmpty: { fontSize: 13, color: '#666' },
  whoNames: { fontSize: 14, color: '#ccc', lineHeight: 20 },
})
