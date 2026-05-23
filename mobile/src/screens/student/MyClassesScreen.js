import { useState, useEffect, useMemo } from 'react'
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, ActivityIndicator, Share, Modal,
} from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { enrolments, attendance, roster, settings as settingsApi, helpdesk as helpdeskApi, classes as classesApi } from '../../api'
import { TextInput } from 'react-native'

function WhoComing({ sessionId }) {
  const [open, setOpen] = useState(false)
  const { data, loading } = useApi(
    () => open ? roster.get(sessionId) : null, [open, sessionId]
  )
  const names = data?.names ?? data ?? []

  if (!sessionId) return null

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

function MarkAwayModal({ occurrence, session, cancellationWindowHours, noShowFee, onClose, onConfirm, confirming }) {
  const occDate = new Date(
    (occurrence.date || '') + 'T' + (occurrence.start_time || session?.start_time || '00:00')
  )
  const hoursUntil = (occDate - new Date()) / (1000 * 60 * 60)
  const windowHours = cancellationWindowHours || 4
  const isLate = hoursUntil > 0 && hoursUntil < windowHours
  const isPast = hoursUntil <= 0

  const dateLabel = new Date(occurrence.date + 'T00:00').toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
  const timeLabel = (occurrence.start_time || session?.start_time || '').slice(0, 5)
  const feeAmount = noShowFee ? `$${parseFloat(noShowFee).toFixed(0)}` : '$20'

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={ma.overlay}>
        <View style={ma.sheet}>
          <View style={ma.header}>
            <Text style={ma.title}>Mark Away — {session?.name || 'Class'}</Text>
            <TouchableOpacity onPress={onClose} style={ma.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={ma.closeText}>CLOSE</Text>
            </TouchableOpacity>
          </View>

          <Text style={ma.classMeta}>{dateLabel}{timeLabel ? `, ${timeLabel}` : ''}</Text>

          {isPast ? (
            <View style={ma.warnBox}>
              <Text style={ma.warnTitle}>Class has passed</Text>
              <Text style={ma.warnBody}>This class has already started or passed.</Text>
            </View>
          ) : isLate ? (
            <View style={ma.warnBox}>
              <Text style={ma.warnTitle}>No catch-up credit for this one</Text>
              <Text style={ma.warnBody}>
                {'This is within '}
                <Text style={{ fontWeight: '700' }}>{windowHours} hours</Text>
                {' of your class — the cancellation window has passed. You can still mark away so we know you\'re not coming, but no credit will be issued. If you don\'t mark away and don\'t attend, a '}
                <Text style={{ fontWeight: '700', color: '#f59e0b' }}>{feeAmount} no-show fee</Text>
                {' will be charged.'}
              </Text>
            </View>
          ) : (
            <View style={ma.infoBox}>
              <Text style={ma.infoTitle}>You'll receive a catch-up credit</Text>
              <Text style={ma.infoBody}>
                {'This is more than '}
                <Text style={{ fontWeight: '700' }}>{windowHours} hours</Text>
                {' before your class — you\'re outside the cancellation window. A catch-up credit will be added to your account to use within this season.'}
              </Text>
            </View>
          )}

          <View style={ma.actions}>
            {isLate ? (
              <TouchableOpacity style={ma.lateConfirmBtn} onPress={onConfirm} disabled={confirming || isPast}>
                {confirming
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={ma.lateConfirmText}>MARK AWAY ANYWAY</Text>
                }
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[ma.confirmBtn, isPast && { opacity: 0.4 }]} onPress={onConfirm} disabled={confirming || isPast}>
                {confirming
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={ma.confirmBtnText}>CONFIRM — MARK ME AWAY</Text>
                }
              </TouchableOpacity>
            )}
            <TouchableOpacity style={ma.cancelBtn} onPress={onClose}>
              <Text style={ma.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const ma = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { backgroundColor: '#1a1a1a', borderRadius: 20, width: '100%', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '900', color: '#fff', flex: 1, marginRight: 12 },
  closeBtn: { borderWidth: 1, borderColor: '#444', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  closeText: { color: '#fff', fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },
  classMeta: { fontSize: 14, color: '#888', paddingHorizontal: 20, marginBottom: 16 },
  infoBox: { marginHorizontal: 20, marginBottom: 20, backgroundColor: 'rgba(204,255,0,0.07)', borderWidth: 1.5, borderColor: '#ccff00', borderRadius: 12, padding: 16 },
  infoTitle: { fontSize: 15, fontWeight: '800', color: '#ccff00', marginBottom: 8 },
  infoBody: { fontSize: 14, color: '#ccc', lineHeight: 22 },
  warnBox: { marginHorizontal: 20, marginBottom: 20, backgroundColor: 'rgba(180,80,0,0.25)', borderWidth: 1.5, borderColor: '#f59e0b', borderRadius: 12, padding: 16 },
  warnTitle: { fontSize: 15, fontWeight: '800', color: '#f59e0b', marginBottom: 8 },
  warnBody: { fontSize: 14, color: '#ccc', lineHeight: 22 },
  actions: { flexDirection: 'column', gap: 10, paddingHorizontal: 20, paddingBottom: 20 },
  confirmBtn: { backgroundColor: '#ccff00', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  confirmBtnText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  lateConfirmBtn: { borderWidth: 1.5, borderColor: '#555', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  lateConfirmText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  cancelBtn: { borderWidth: 1, borderColor: '#444', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  cancelBtnText: { color: '#aaa', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },
})

function CancelPolicyModal({ enrolment, onClose }) {
  const [subView, setSubView] = useState(null)
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
      await helpdeskApi.submitTicket({
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
            <>
              <View style={cp.infoBox}>
                <Text style={cp.infoText}>You'll be removed from the waitlist for this class. You can rejoin at any time if a spot opens up.</Text>
              </View>
              <TouchableOpacity style={cp.dangerBtn} onPress={handleLeaveWaitlist}>
                <Text style={cp.dangerBtnText}>LEAVE WAITLIST</Text>
              </TouchableOpacity>
            </>
          ) : submitted ? (
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
            <>
              <View style={cp.policyBox}>
                <Text style={cp.policyText}>Transfers are handled case-by-case. The studio will review your request and propose options for a different class.</Text>
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
            <>
              <View style={cp.policyBox}>
                <Text style={cp.policyTitle}>Non-refundable enrolment</Text>
                <Text style={cp.policyText}>
                  When you enrolled, we reserved a pole and planned the season around you. As a small studio, every confirmed booking directly supports our ability to keep classes running — which is why season enrolments are non-refundable once you've committed to your class through enrolling, in line with our terms and conditions.{'\n\n'}If your circumstances have changed, we'd love to find a solution which works for you.
                </Text>
              </View>
              <TouchableOpacity style={cp.transferBtn} onPress={() => setSubView('transfer')}>
                <Text style={cp.transferBtnText}>CONTACT US</Text>
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

  let hoursUntil = null
  if (sess?.day_of_week != null && sess?.start_time) {
    const now = new Date()
    const targetDay = sess.day_of_week
    const jsDay = (targetDay + 1) % 7
    let daysUntil = (jsDay - now.getDay() + 7) % 7
    if (daysUntil === 0) {
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
  const windowHours = cancellationWindowHours ?? 4
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

function DisplacementModal({ booking, onClose, onAction }) {
  const [actioning, setActioning] = useState(null)
  const [messageSent, setMessageSent] = useState(false)
  const d = booking.occurrence_detail
  const dateLabel = d?.date
    ? new Date(d.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
    : '—'
  const expiresAt = booking.displacement_expires_at ? new Date(booking.displacement_expires_at) : null
  const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt - new Date()) / 3600000)) : null
  const busy = !!actioning

  async function upgrade() {
    Alert.alert(
      'Upgrade to Full Season?',
      'Your casual spot will be converted to a full season enrolment. The casual fee paid will be credited towards the season price.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade', onPress: async () => {
            setActioning('upgrade')
            try {
              await classesApi.casual.upgrade(booking.id)
              onAction()
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail ?? 'Could not upgrade.')
            } finally { setActioning(null) }
          }
        }
      ]
    )
  }

  async function release() {
    Alert.alert(
      'Release Spot?',
      'Your spot will be released and your account credited with the amount paid.',
      [
        { text: 'Keep My Spot', style: 'cancel' },
        {
          text: 'Release', style: 'destructive', onPress: async () => {
            setActioning('release')
            try {
              await classesApi.casual.release(booking.id)
              onAction()
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail ?? 'Could not release.')
            } finally { setActioning(null) }
          }
        }
      ]
    )
  }

  async function messageDuality() {
    setActioning('message')
    try {
      await helpdeskApi.submitTicket({
        subject: `Displacement Offer Question — ${d?.session_name || 'Class'}`,
        body: `Student has a question about their casual displacement offer for ${d?.session_name || 'class'} on ${d?.date || 'upcoming date'}.`,
      })
      setMessageSent(true)
    } catch { } finally { setActioning(null) }
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={dm.overlay}>
        <View style={dm.sheet}>
          <View style={dm.header}>
            <Text style={dm.headerTitle}>Action Required</Text>
            <TouchableOpacity onPress={onClose} style={dm.closeBtn}>
              <Text style={dm.closeBtnText}>LATER</Text>
            </TouchableOpacity>
          </View>

          <Text style={dm.sessName}>{d?.session_name ?? 'Class'}</Text>
          <Text style={dm.dateMeta}>
            {[dateLabel, d?.start_time ? d.start_time.slice(0, 5) : null, d?.studio_name].filter(Boolean).join('  ·  ')}
          </Text>

          <View style={dm.infoBox}>
            <Text style={dm.infoText}>
              A student wants to enrol for the full season of {d?.session_name || 'this class'}. Upgrade your casual booking
              {hoursLeft !== null ? <Text style={{ color: '#fff', fontWeight: '700' }}> within {hoursLeft} hour{hoursLeft !== 1 ? 's' : ''}</Text> : ''}, or your spot will be released and your account credited with the amount paid.
            </Text>
          </View>

          <TouchableOpacity style={[dm.upgradeBtn, busy && { opacity: 0.5 }]} onPress={upgrade} disabled={busy}>
            {actioning === 'upgrade' ? <ActivityIndicator color="#000" /> : <Text style={dm.upgradeBtnText}>UPGRADE TO FULL SEASON</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[dm.releaseBtn, busy && { opacity: 0.5 }]} onPress={release} disabled={busy}>
            <Text style={dm.releaseBtnText}>RELEASE SPOT</Text>
          </TouchableOpacity>
          {messageSent ? (
            <Text style={dm.messageSent}>Message sent — we'll be in touch!</Text>
          ) : (
            <TouchableOpacity style={[dm.messageBtn, busy && { opacity: 0.5 }]} onPress={messageDuality} disabled={busy}>
              {actioning === 'message' ? <ActivityIndicator color="#888" size="small" /> : <Text style={dm.messageBtnText}>MESSAGE DUALITY</Text>}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  )
}

const dm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
  sheet: { backgroundColor: '#111', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, paddingBottom: 44, borderTopWidth: 2, borderTopColor: 'rgba(255,170,0,0.4)' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#f59e0b' },
  closeBtn: { paddingLeft: 12 },
  closeBtnText: { color: '#555', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  sessName: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 3 },
  dateMeta: { fontSize: 13, color: '#888', marginBottom: 18 },
  infoBox: { backgroundColor: 'rgba(255,170,0,0.06)', borderWidth: 1, borderColor: 'rgba(255,170,0,0.2)', borderRadius: 12, padding: 14, marginBottom: 20 },
  infoText: { fontSize: 13, color: '#aaa', lineHeight: 20 },
  upgradeBtn: { backgroundColor: '#ccff00', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  upgradeBtnText: { color: '#000', fontWeight: '800', fontSize: 14, letterSpacing: 0.4 },
  releaseBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.07)', marginBottom: 10 },
  releaseBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 13 },
  messageBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  messageBtnText: { color: '#888', fontWeight: '700', fontSize: 13 },
  messageSent: { fontSize: 12, color: '#ccff00', textAlign: 'center', paddingVertical: 10 },
})

function PendingDisplacementBanner({ enrolment }) {
  const sess = enrolment.class_session_detail
  const expiresAt = enrolment.displacement_expires_at ? new Date(enrolment.displacement_expires_at) : null
  const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt - new Date()) / 3600000)) : null
  return (
    <View style={pd.banner}>
      <Text style={pd.title}>Spot Pending Confirmation</Text>
      <Text style={pd.sessName}>{sess?.name}</Text>
      <Text style={pd.body}>
        There is a spot in the season, however a casual is taking up one of those spots. We've given the casual{hoursLeft !== null ? ` ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}` : ' some time'} to upgrade to a full season enrolment — and if they don't, the spot is yours! We'll confirm your enrolment as soon as it's resolved.
      </Text>
    </View>
  )
}

const pd = StyleSheet.create({
  banner: { backgroundColor: 'rgba(255,170,0,0.06)', borderWidth: 2, borderColor: 'rgba(255,170,0,0.25)', borderRadius: 14, padding: 16, marginBottom: 12 },
  title: { fontSize: 13, fontWeight: '800', color: '#f59e0b', marginBottom: 4 },
  sessName: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 6 },
  body: { fontSize: 13, color: '#888', lineHeight: 19 },
})

// ─── Current Tab ─────────────────────────────────────────────────────────────

function CurrentTab({
  currentEnrolments,
  casualBookings,
  waitlistedEnrolments,
  pendingDisplacementEnrolments,
  cancellationWindowHours,
  noShowFee,
  cancellingAway,
  markingAway,
  onMarkAway,
  onCancelAway,
  onCancelEnrolment,
  onCancelCasual,
  onUpgradeCasual,
  onDisplacementAction,
  refetch,
  refetchWaitlist,
  loading,
  navigation,
}) {
  // Build a flat list of upcoming items: enrolled occurrences + casual bookings
  const items = useMemo(() => {
    const list = []

    // Add upcoming occurrences from enrolled classes
    currentEnrolments.forEach(enr => {
      const sess = enr.class_session_detail
      const occurrences = enr.upcoming_occurrences ?? (enr.next_occurrence ? [enr.next_occurrence] : [])
      occurrences.forEach(occ => {
        list.push({
          key: `enr-${enr.id}-${occ.id}`,
          type: 'enrolled',
          date: occ.date,
          time: occ.start_time || sess?.start_time || '',
          sessionName: sess?.name ?? enr.class_name ?? 'Class',
          studio: sess?.studio_detail?.name ?? null,
          sessionId: sess?.id ?? enr.class_session,
          enrolment: enr,
          occurrence: occ,
          isAway: occ.marked_away || occ.my_status === 'absent',
        })
      })
    })

    // Add confirmed casual/catch-up bookings (non-displaced)
    const casuals = casualBookings?.results ?? casualBookings ?? []
    casuals
      .filter(b => b.status === 'confirmed' && !b.displacement_offered_at)
      .forEach(b => {
        const d = b.occurrence_detail
        if (!d?.date) return
        list.push({
          key: `casual-${b.id}`,
          type: b.enrolment_type === 'catchup' ? 'catchup' : 'casual',
          date: d.date,
          time: d.start_time || '',
          sessionName: d.session_name ?? 'Class',
          studio: d.studio_name ?? null,
          sessionId: d.session_id ?? d.session ?? null,
          booking: b,
        })
      })

    // Sort chronologically
    list.sort((a, b) => {
      const da = `${a.date}T${a.time || '00:00'}`
      const db = `${b.date}T${b.time || '00:00'}`
      return da < db ? -1 : da > db ? 1 : 0
    })

    return list
  }, [currentEnrolments, casualBookings])

  // Derive season info from the first current enrolment
  const seasonInfo = useMemo(() => {
    const enr = currentEnrolments[0]
    if (!enr) return null
    const sess = enr.class_session_detail
    const name = enr.season_detail?.name ?? sess?.season_name ?? null
    const start = sess?.season_start_date ?? null
    const end = sess?.season_end_date ?? null
    if (!name && !start) return null
    const fmt = (d) => d ? new Date(d + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : null
    return { name, start: fmt(start), end: fmt(end) }
  }, [currentEnrolments])

  // Displaced casual bookings needing action
  const displacedBookings = useMemo(() => {
    const casuals = casualBookings?.results ?? casualBookings ?? []
    return casuals.filter(b => b.status === 'confirmed' && b.displacement_offered_at)
  }, [casualBookings])

  // Waitlisted casual bookings
  const waitlistedCasuals = useMemo(() => {
    const casuals = casualBookings?.results ?? casualBookings ?? []
    return casuals.filter(b => b.status === 'waitlisted')
  }, [casualBookings])

  // Group items by date for display
  const groupedByDate = useMemo(() => {
    const groups = []
    let lastDate = null
    items.forEach(item => {
      if (item.date !== lastDate) {
        groups.push({ date: item.date, items: [] })
        lastDate = item.date
      }
      groups[groups.length - 1].items.push(item)
    })
    return groups
  }, [items])

  function formatDateHeader(dateStr) {
    return new Date(dateStr + 'T00:00').toLocaleDateString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
    >
      {/* Season header */}
      {seasonInfo && (
        <View style={ct.seasonHeader}>
          <Text style={ct.seasonName}>{seasonInfo.name ?? 'Current Season'}</Text>
          {seasonInfo.start && seasonInfo.end && (
            <Text style={ct.seasonDates}>{seasonInfo.start} — {seasonInfo.end}</Text>
          )}
        </View>
      )}

      {/* Waitlist claim banners */}
      {waitlistedEnrolments.filter(e => e.waitlist_offered_at).map(e => (
        <WaitlistClaimBanner key={e.id} enrolment={e} onClaimed={() => { refetch(); refetchWaitlist() }} />
      ))}

      {/* Displacement action banners */}
      {pendingDisplacementEnrolments.map(e => (
        <PendingDisplacementBanner key={e.id} enrolment={e} />
      ))}

      {/* Displaced casual action cards */}
      {displacedBookings.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={ct.sectionLabel}>ACTION REQUIRED</Text>
          {displacedBookings.map(b => {
            const d = b.occurrence_detail
            const dateLabel = d?.date
              ? new Date(d.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
              : '—'
            const expiresAt = b.displacement_expires_at ? new Date(b.displacement_expires_at) : null
            const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt - new Date()) / 3600000)) : null
            return (
              <TouchableOpacity key={b.id} style={ct.displacedCard} onPress={() => onDisplacementAction(b)}>
                <Text style={ct.displacedTitle}>{d?.session_name ?? 'Class'}</Text>
                <Text style={ct.displacedMeta}>
                  {[dateLabel, d?.start_time?.slice(0, 5), d?.studio_name].filter(Boolean).join('  ·  ')}
                </Text>
                <Text style={ct.displacedBody}>
                  Season enrolment offer — {hoursLeft !== null ? `respond within ${hoursLeft}h` : 'respond now'}
                </Text>
                <Text style={ct.displacedCta}>Tap to upgrade or release →</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {/* Empty state */}
      {items.length === 0 && !loading && displacedBookings.length === 0 && (
        <View style={ct.emptyBox}>
          <Text style={ct.emptyText}>No upcoming classes this season.</Text>
          <TouchableOpacity style={ct.bookBtn} onPress={() => navigation.navigate('Book')}>
            <Text style={ct.bookBtnText}>+ BOOK A CLASS</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Chronological list grouped by date */}
      {groupedByDate.map(group => (
        <View key={group.date} style={{ marginBottom: 8 }}>
          <Text style={ct.dateHeader}>{formatDateHeader(group.date)}</Text>
          {group.items.map(item => (
            <ClassItem
              key={item.key}
              item={item}
              cancellationWindowHours={cancellationWindowHours}
              noShowFee={noShowFee}
              cancellingAway={cancellingAway}
              markingAway={markingAway}
              onMarkAway={onMarkAway}
              onCancelAway={onCancelAway}
              onCancelEnrolment={onCancelEnrolment}
              onCancelCasual={onCancelCasual}
            />
          ))}
        </View>
      ))}

      {/* Waitlisted casuals */}
      {waitlistedCasuals.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={ct.sectionLabel}>ON WAITLIST</Text>
          {waitlistedCasuals.map(b => {
            const d = b.occurrence_detail
            const dateLabel = d?.date
              ? new Date(d.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
              : '—'
            return (
              <View key={b.id} style={ct.waitlistRow}>
                <View style={{ flex: 1 }}>
                  <Text style={ct.waitlistName}>{d?.session_name ?? 'Class'}</Text>
                  <Text style={ct.waitlistMeta}>
                    {[dateLabel, d?.start_time?.slice(0, 5), d?.studio_name].filter(Boolean).join('  ·  ')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={ct.waitBadge}><Text style={ct.waitBadgeText}>Waitlist</Text></View>
                  <TouchableOpacity onPress={() => onCancelCasual(b)}>
                    <Text style={ct.leaveText}>Leave</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })}
        </View>
      )}

      {items.length > 0 && (
        <TouchableOpacity style={ct.bookMoreBtn} onPress={() => navigation.navigate('Book')}>
          <Text style={ct.bookMoreBtnText}>+ BOOK A CASUAL OR CATCH-UP</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}

function ClassItem({ item, cancellationWindowHours, noShowFee, cancellingAway, markingAway, onMarkAway, onCancelAway, onCancelEnrolment, onCancelCasual }) {
  const timeStr = item.time ? item.time.slice(0, 5) : null
  const isEnrolled = item.type === 'enrolled'
  const isCatchup = item.type === 'catchup'
  const isCasual = item.type === 'casual'

  const windowHours = cancellationWindowHours || 4
  const feeLabel = noShowFee ? `$${parseFloat(noShowFee).toFixed(0)}` : '$20'
  let withinWindow = false
  if (item.date && item.time) {
    const classAt = new Date(`${item.date}T${item.time}`)
    withinWindow = (classAt - new Date()) / 3600000 < windowHours && (classAt - new Date()) > 0
  }

  return (
    <View style={ct.classCard}>
      <View style={ct.classCardTop}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={ct.className}>{item.sessionName}</Text>
            {(isCasual || isCatchup) && (
              <View style={[ct.typePill, isCatchup && ct.typePillCatchup]}>
                <Text style={ct.typePillText}>{isCatchup ? 'Catch-up' : 'Casual'}</Text>
              </View>
            )}
            {item.isAway && (
              <View style={ct.awayPill}><Text style={ct.awayPillText}>AWAY</Text></View>
            )}
          </View>
          {(timeStr || item.studio) && (
            <Text style={ct.classMeta}>
              {[timeStr, item.studio].filter(Boolean).join('  ·  ')}
            </Text>
          )}
        </View>

        {/* Action buttons */}
        {isEnrolled && !item.isAway && (
          <TouchableOpacity
            style={ct.awayBtn}
            disabled={markingAway === item.occurrence?.id}
            onPress={() => onMarkAway(item.occurrence, item.enrolment.class_session_detail)}
          >
            {markingAway === item.occurrence?.id
              ? <ActivityIndicator size="small" color="#ccff00" />
              : <Text style={ct.awayBtnText}>Mark away</Text>
            }
          </TouchableOpacity>
        )}
        {isEnrolled && item.isAway && (
          <TouchableOpacity
            style={ct.canMakeItBtn}
            disabled={cancellingAway === item.occurrence?.id}
            onPress={() => onCancelAway(item.occurrence?.id, item.sessionName)}
          >
            {cancellingAway === item.occurrence?.id
              ? <ActivityIndicator size="small" color="#ccff00" />
              : <Text style={ct.canMakeItText}>I can make it!</Text>
            }
          </TouchableOpacity>
        )}
        {(isCasual || isCatchup) && (
          <TouchableOpacity onPress={() => onCancelCasual(item.booking)}>
            <Text style={ct.cancelCasualText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Who's coming */}
      <WhoComing sessionId={item.sessionId} />

      {/* Cancel enrolment link */}
      {isEnrolled && (
        <TouchableOpacity style={ct.cancelEnrolLink} onPress={() => onCancelEnrolment(item.enrolment)}>
          <Text style={ct.cancelEnrolText}>Cancel enrolment</Text>
        </TouchableOpacity>
      )}

      {/* No-show fee warning when within cancellation window */}
      {isEnrolled && !item.isAway && withinWindow && (
        <View style={ct.noShowWarning}>
          <Text style={ct.noShowWarningText}>
            Cancellation window has passed — if you don't attend or mark away, a {feeLabel} no-show fee applies.
          </Text>
        </View>
      )}
    </View>
  )
}

const ct = StyleSheet.create({
  seasonHeader: { backgroundColor: 'rgba(204,255,0,0.06)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.15)', borderRadius: 12, padding: 14, marginBottom: 16 },
  seasonName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  seasonDates: { fontSize: 13, color: '#888' },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#555', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  dateHeader: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 8 },
  classCard: { backgroundColor: '#111', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#222' },
  classCardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  className: { fontSize: 15, fontWeight: '700', color: '#fff' },
  classMeta: { fontSize: 13, color: '#666', marginTop: 3 },
  typePill: { backgroundColor: 'rgba(204,255,0,0.1)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  typePillCatchup: { backgroundColor: 'rgba(124,58,237,0.15)' },
  typePillText: { fontSize: 10, fontWeight: '800', color: '#ccff00' },
  awayPill: { backgroundColor: 'rgba(255,170,0,0.12)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  awayPillText: { fontSize: 10, fontWeight: '800', color: '#f59e0b' },
  awayBtn: { backgroundColor: '#1a1a1a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#333', flexShrink: 0 },
  awayBtnText: { fontSize: 12, fontWeight: '600', color: '#ccff00' },
  canMakeItBtn: { paddingVertical: 4, flexShrink: 0 },
  canMakeItText: { fontSize: 13, fontWeight: '600', color: '#ccff00' },
  cancelCasualText: { fontSize: 12, color: '#ef4444', fontWeight: '600', paddingTop: 4 },
  cancelEnrolLink: { marginTop: 6, alignSelf: 'flex-start' },
  cancelEnrolText: { fontSize: 12, color: '#444' },
  noShowWarning: { marginTop: 10, backgroundColor: 'rgba(239,68,68,0.07)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 8, padding: 10 },
  noShowWarningText: { fontSize: 12, color: '#ef4444', lineHeight: 18 },
  displacedCard: { backgroundColor: 'rgba(255,170,0,0.05)', borderWidth: 2, borderColor: 'rgba(255,170,0,0.3)', borderRadius: 14, padding: 14, marginBottom: 8 },
  displacedTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  displacedMeta: { fontSize: 12, color: '#888', marginBottom: 8 },
  displacedBody: { fontSize: 13, color: '#f59e0b', marginBottom: 4 },
  displacedCta: { fontSize: 12, color: '#ccff00', fontWeight: '600' },
  waitlistRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#222', padding: 14, marginBottom: 8 },
  waitlistName: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 },
  waitlistMeta: { fontSize: 12, color: '#666' },
  waitBadge: { backgroundColor: 'rgba(255,170,0,0.1)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  waitBadgeText: { fontSize: 10, fontWeight: '800', color: '#f59e0b' },
  leaveText: { fontSize: 11, color: '#ef4444', fontWeight: '700' },
  emptyBox: { alignItems: 'center', marginTop: 40, gap: 16 },
  emptyText: { fontSize: 15, color: '#555' },
  bookBtn: { backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#333', paddingHorizontal: 20, paddingVertical: 14 },
  bookBtnText: { fontSize: 13, fontWeight: '800', color: '#ccff00', letterSpacing: 0.5 },
  bookMoreBtn: { borderRadius: 12, borderWidth: 1, borderColor: '#333', padding: 16, alignItems: 'center', marginTop: 16 },
  bookMoreBtnText: { fontSize: 13, fontWeight: '800', color: '#666', letterSpacing: 0.5 },
})

// ─── Future Tab ───────────────────────────────────────────────────────────────

function FutureTab({ upcomingEnrolments, waitlistedEnrolments, onCancelEnrolment, refetch, refetchWaitlist, loading, setClassWaitlistLeaveEnrol }) {
  const seasonWaitlist = waitlistedEnrolments.filter(e => !e.waitlist_offered_at && e.enrolment_type === 'course')
  const classWaitlist = waitlistedEnrolments.filter(e => !e.waitlist_offered_at && e.enrolment_type !== 'course')
  const claimable = waitlistedEnrolments.filter(e => e.waitlist_offered_at)

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { refetch(); refetchWaitlist() }} />}
    >
      {claimable.map(e => (
        <WaitlistClaimBanner key={e.id} enrolment={e} onClaimed={() => { refetch(); refetchWaitlist() }} />
      ))}

      {upcomingEnrolments.length === 0 && seasonWaitlist.length === 0 && classWaitlist.length === 0 && (
        <Text style={{ fontSize: 14, color: '#555', textAlign: 'center', marginTop: 40 }}>No upcoming season enrolments.</Text>
      )}

      {upcomingEnrolments.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={ft.sectionLabel}>ENROLLED — UPCOMING SEASON</Text>
          {upcomingEnrolments.map(enr => {
            const sess = enr.class_session_detail
            const sessName = sess?.name ?? enr.class_name ?? 'Class'
            const seasonName = enr.season_detail?.name ?? sess?.season_name ?? null
            const DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            const meta = [
              sess?.day_of_week != null ? DAY[sess.day_of_week] : null,
              sess?.start_time ? sess.start_time.slice(0, 5) : null,
              sess?.studio_detail?.name ?? null,
            ].filter(Boolean).join(' · ')
            return (
              <View key={enr.id} style={ft.card}>
                <View style={{ flex: 1 }}>
                  <Text style={ft.name}>{sessName}</Text>
                  {!!meta && <Text style={ft.meta}>{meta}</Text>}
                  {seasonName && <Text style={ft.season}>{seasonName}</Text>}
                </View>
                <TouchableOpacity onPress={() => onCancelEnrolment(enr)}>
                  <Text style={ft.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )
          })}
        </View>
      )}

      {seasonWaitlist.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={ft.sectionLabel}>SEASON WAITLIST</Text>
          {seasonWaitlist.map(e => {
            const s2 = e.class_session_detail
            return (
              <View key={e.id} style={ft.card}>
                <View style={{ flex: 1 }}>
                  <Text style={ft.name}>{s2?.name ?? 'Class'}</Text>
                  <Text style={ft.meta}>
                    {[s2?.day_of_week != null ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][s2.day_of_week] : null, s2?.studio_detail?.name].filter(Boolean).join(' · ')}
                  </Text>
                  {e.waitlist_position != null && (
                    <Text style={ft.position}>Position #{e.waitlist_position}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => onCancelEnrolment(e)}>
                  <Text style={ft.cancelText}>Leave</Text>
                </TouchableOpacity>
              </View>
            )
          })}
        </View>
      )}

      {classWaitlist.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={ft.sectionLabel}>CLASS WAITLIST</Text>
          {classWaitlist.map(e => {
            const s2 = e.class_session_detail
            return (
              <View key={e.id} style={ft.card}>
                <View style={{ flex: 1 }}>
                  <Text style={ft.name}>{s2?.name ?? 'Class'}</Text>
                  <Text style={ft.meta}>
                    {[s2?.day_of_week != null ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][s2.day_of_week] : null, s2?.studio_detail?.name].filter(Boolean).join(' · ')}
                  </Text>
                  {e.waitlist_position != null && (
                    <Text style={ft.position}>Position #{e.waitlist_position}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setClassWaitlistLeaveEnrol(e)}>
                  <Text style={ft.cancelText}>Leave</Text>
                </TouchableOpacity>
              </View>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

const ft = StyleSheet.create({
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#555', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  card: { backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#222', flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 },
  meta: { fontSize: 12, color: '#666' },
  season: { fontSize: 11, color: '#888', marginTop: 3 },
  position: { fontSize: 11, fontWeight: '700', color: '#b0a0ff', marginTop: 3 },
  cancelText: { fontSize: 13, color: '#ef4444', fontWeight: '500' },
})

// ─── Past Tab ─────────────────────────────────────────────────────────────────

function PastTab({ history, pastEnrolments, loading, refetchHistory }) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetchHistory} />}
    >
      {history.length === 0 && !loading && pastEnrolments.length === 0 && (
        <Text style={{ textAlign: 'center', color: '#555', marginTop: 40 }}>No history yet.</Text>
      )}

      {history.length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <Text style={pt.sectionLabel}>ATTENDANCE</Text>
          {history.map(rec => (
            <View key={rec.id} style={pt.row}>
              <View style={pt.info}>
                <Text style={pt.className}>{rec.occurrence?.session?.name ?? 'Class'}</Text>
                <Text style={pt.date}>
                  {rec.occurrence?.date
                    ? new Date(rec.occurrence.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                    : ''}
                </Text>
              </View>
              <StatusBadge status={rec.status} />
            </View>
          ))}
        </View>
      )}

      {pastEnrolments.length > 0 && (
        <View>
          <Text style={pt.sectionLabel}>PREVIOUS SEASONS</Text>
          {pastEnrolments.map(enr => {
            const sess = enr.class_session_detail
            const sessName = sess?.name ?? enr.class_name ?? 'Class'
            const DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            const meta = [
              sess?.day_of_week != null ? DAY[sess.day_of_week] : null,
              sess?.start_time ? sess.start_time.slice(0, 5) : null,
              sess?.studio_detail?.name ?? null,
            ].filter(Boolean).join(' · ')
            return (
              <View key={enr.id} style={pt.pastCard}>
                <View style={{ flex: 1 }}>
                  <Text style={pt.pastName}>{sessName}</Text>
                  {!!meta && <Text style={pt.pastMeta}>{meta}</Text>}
                  {enr.season_detail?.name && <Text style={pt.pastSeason}>{enr.season_detail.name}</Text>}
                </View>
                <View style={pt.completedBadge}>
                  <Text style={pt.completedBadgeText}>Completed</Text>
                </View>
              </View>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

const pt = StyleSheet.create({
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#555', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#222' },
  info: { flex: 1 },
  className: { fontWeight: '600', color: '#fff', fontSize: 14 },
  date: { fontSize: 12, color: '#888', marginTop: 2 },
  pastCard: { backgroundColor: '#0d0d0d', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#1c1c1c', flexDirection: 'row', alignItems: 'center', gap: 12 },
  pastName: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 2 },
  pastMeta: { fontSize: 12, color: '#444' },
  pastSeason: { fontSize: 11, color: '#444', marginTop: 3 },
  completedBadge: { backgroundColor: '#1a1a1a', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  completedBadgeText: { fontSize: 10, fontWeight: '700', color: '#444', textTransform: 'uppercase', letterSpacing: 0.5 },
})

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MyClassesScreen({ navigation }) {
  const { user } = useAuth()
  const [tab, setTab] = useState('current')
  const [markingAway, setMarkingAway] = useState(null)
  const [markAwayModal, setMarkAwayModal] = useState(null)
  const [cancelPolicyEnrol, setCancelPolicyEnrol] = useState(null)
  const [cancellingAway, setCancellingAway] = useState(null)
  const [classWaitlistLeaveEnrol, setClassWaitlistLeaveEnrol] = useState(null)
  const [displacementModal, setDisplacementModal] = useState(null)

  const { data: enrolData, loading, refetch } = useApi(
    () => enrolments.list({ status: 'active' }), []
  )
  const { data: waitlistData, refetch: refetchWaitlist } = useApi(
    () => enrolments.list({ status: 'waitlisted' }), []
  )
  const { data: pendingDispData, refetch: refetchPendingDisp } = useApi(
    () => enrolments.list({ status: 'pending_displacement' }), []
  )
  const { data: historyData, loading: histLoading, refetch: refetchHistory } = useApi(
    () => attendance.list({ limit: 30 }), []
  )
  const { data: settingsData } = useApi(() => settingsApi.get(), [])
  const { data: casualBookingsData, refetch: refetchCasual } = useApi(() => classesApi.casual.myBookings(), [])
  const { data: pastEnrolData } = useApi(() => enrolments.list({ status: 'completed' }), [])

  const activeEnrolments = enrolData?.results ?? enrolData ?? []
  const waitlistedEnrolments = waitlistData?.results ?? waitlistData ?? []
  const pendingDisplacementEnrolments = pendingDispData?.results ?? pendingDispData ?? []
  const pastEnrolments = pastEnrolData?.results ?? pastEnrolData ?? []
  const history = historyData?.results ?? historyData ?? []
  const cancellationWindowHours = settingsData?.cancellation_window_hours ?? 4

  useEffect(() => {
    const items = casualBookingsData?.results ?? casualBookingsData ?? []
    const displaced = items.find(b => b.status === 'confirmed' && b.displacement_offered_at)
    if (displaced) setDisplacementModal(displaced)
  }, [casualBookingsData])

  const today = new Date().toISOString().slice(0, 10)
  const currentEnrolments = activeEnrolments.filter(e => {
    const start = e.class_session_detail?.season_start_date
    return !start || start <= today
  })
  const upcomingEnrolments = activeEnrolments.filter(e => {
    const start = e.class_session_detail?.season_start_date
    return start && start > today
  })

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

  async function handleCancelCasual(booking) {
    Alert.alert(
      booking.status === 'waitlisted' ? 'Leave Waitlist?' : 'Cancel Booking?',
      booking.status === 'waitlisted'
        ? 'You will lose your waitlist position for this date.'
        : 'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes', style: 'destructive',
          onPress: async () => {
            try {
              await classesApi.casual.cancel(booking.occurrence)
              refetchCasual()
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail ?? 'Could not cancel. Please try again.')
            }
          }
        }
      ]
    )
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
      let endTime = sess?.end_time?.replace(/:/g, '').slice(0, 4) ?? null
      if (!endTime) {
        // Compute end time from start_time + duration_minutes
        if (sess?.start_time && sess?.duration_minutes) {
          const [sh, sm] = sess.start_time.split(':').map(Number)
          const totalMins = sh * 60 + sm + Number(sess.duration_minutes)
          const eh = Math.floor(totalMins / 60) % 24
          const em = totalMins % 60
          endTime = String(eh).padStart(2, '0') + String(em).padStart(2, '0')
        } else {
          endTime = '1000'
        }
      }
      const dayNum = sess?.day_of_week
      const byday = dayNum != null ? DAYS[dayNum] : null
      const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
      lines.push(...[
        'BEGIN:VEVENT',
        `UID:${enr.id}@dualitypolestudio`,
        `DTSTAMP:${now}`,
        `SUMMARY:${name}`,
        `LOCATION:${studio}`,
        byday ? `RRULE:FREQ=WEEKLY;BYDAY=${byday}` : '',
        `DTSTART;TZID=Australia/Sydney:20250101T${startTime}00`,
        `DTEND;TZID=Australia/Sydney:20250101T${endTime}00`,
        'END:VEVENT',
      ].filter(Boolean))
    })
    lines.push('END:VCALENDAR')
    const ics = lines.join('\r\n')
    Share.share({ message: ics, title: 'My Pole Classes' })
  }

  return (
    <View style={s.root}>
      {/* Quick links */}
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

      {/* Tabs */}
      <View style={s.tabs}>
        {[['current', 'Current'], ['future', 'Future'], ['past', 'Past']].map(([key, label]) => (
          <TouchableOpacity key={key} style={[s.tab, tab === key && s.tabActive]} onPress={() => setTab(key)}>
            <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'current' && (
        <CurrentTab
          currentEnrolments={currentEnrolments}
          casualBookings={casualBookingsData}
          waitlistedEnrolments={waitlistedEnrolments}
          pendingDisplacementEnrolments={pendingDisplacementEnrolments}
          cancellationWindowHours={cancellationWindowHours}
          noShowFee={settingsData?.no_show_fee}
          cancellingAway={cancellingAway}
          markingAway={markingAway}
          onMarkAway={(occ, sess) => setMarkAwayModal({ occurrence: occ, session: sess })}
          onCancelAway={handleCancelAway}
          onCancelEnrolment={enr => setCancelPolicyEnrol(enr)}
          onCancelCasual={handleCancelCasual}
          onDisplacementAction={booking => setDisplacementModal(booking)}
          refetch={refetch}
          refetchWaitlist={refetchWaitlist}
          loading={loading}
          navigation={navigation}
        />
      )}

      {tab === 'future' && (
        <FutureTab
          upcomingEnrolments={upcomingEnrolments}
          waitlistedEnrolments={waitlistedEnrolments}
          onCancelEnrolment={enr => setCancelPolicyEnrol(enr)}
          refetch={refetch}
          refetchWaitlist={refetchWaitlist}
          loading={loading}
          setClassWaitlistLeaveEnrol={setClassWaitlistLeaveEnrol}
        />
      )}

      {tab === 'past' && (
        <PastTab
          history={history}
          pastEnrolments={pastEnrolments}
          loading={histLoading}
          refetchHistory={refetchHistory}
        />
      )}

      {markAwayModal && (
        <MarkAwayModal
          occurrence={markAwayModal.occurrence}
          session={markAwayModal.session}
          cancellationWindowHours={cancellationWindowHours}
          noShowFee={settingsData?.no_show_fee}
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

      {displacementModal && (
        <DisplacementModal
          booking={displacementModal}
          onClose={() => setDisplacementModal(null)}
          onAction={() => {
            setDisplacementModal(null)
            refetchCasual()
            refetchPendingDisp()
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
  topLinks: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: '#000', borderBottomWidth: 1, borderBottomColor: '#222' },
  topLink: { flex: 1, backgroundColor: '#111', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  topLinkText: { fontSize: 13, fontWeight: '600', color: '#ccff00' },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  whoBtn: { alignSelf: 'flex-start', paddingVertical: 6, marginTop: 6 },
  whoBtnText: { fontSize: 13, color: '#ccff00', fontWeight: '600' },
  whoPanel: { backgroundColor: '#0a0a0a', borderRadius: 8, padding: 10, marginTop: 6, borderWidth: 1, borderColor: '#222' },
  whoLabel: { fontSize: 11, fontWeight: '700', color: '#ccff00', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  whoEmpty: { fontSize: 13, color: '#666' },
  whoNames: { fontSize: 14, color: '#ccc', lineHeight: 20 },
})
