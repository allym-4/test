import { useState, useEffect } from 'react'
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { enrolments, attendance, roster, settings as settingsApi } from '../../api'
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

export default function MyClassesScreen({ navigation }) {
  const { user } = useAuth()
  const [tab, setTab] = useState('active')
  const [markingAway, setMarkingAway] = useState(null)
  const [cancellingAway, setCancellingAway] = useState(null)
  const [levelFilter, setLevelFilter] = useState(null)

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
    activeEnrolments.map(e => e.session?.level).filter(Boolean)
  )].sort()

  const filteredEnrolments = levelFilter
    ? activeEnrolments.filter(e => e.session?.level === levelFilter)
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

  async function handleMarkAway(occurrenceId, name) {
    Alert.alert(
      'Mark away',
      `Mark yourself away from ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark away',
          onPress: async () => {
            setMarkingAway(occurrenceId)
            try {
              const res = await attendance.markAway(occurrenceId)
              const creditIssued = res.data?.credit_issued
              Alert.alert(
                'Marked away',
                creditIssued
                  ? "You've been marked away and a catch-up credit has been added to your account. 🎉"
                  : "You've been marked away. No catch-up credit was issued as you're within the cancellation window.",
              )
              refetch()
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail || 'Could not mark away.')
            } finally {
              setMarkingAway(null)
            }
          },
        },
      ]
    )
  }

  async function handleCancelEnrolment(id, name) {
    Alert.alert(
      'Cancel enrolment',
      `Are you sure you want to cancel your enrolment in ${name}?`,
      [
        { text: 'Keep enrolment', style: 'cancel' },
        {
          text: 'Cancel enrolment',
          style: 'destructive',
          onPress: async () => {
            try {
              await enrolments.delete(id)
              refetch()
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail || 'Could not cancel.')
            }
          },
        },
      ]
    )
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
          {filteredEnrolments.map(enr => (
            <View key={enr.id} style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>{enr.session?.name ?? 'Class'}</Text>
                {enr.enrolment_type && (
                  <View style={s.typeBadge}>
                    <Text style={s.typeBadgeText}>{enr.enrolment_type}</Text>
                  </View>
                )}
              </View>
              {enr.session?.studio?.name && (
                <Text style={s.cardMeta}>{enr.session.studio.name}</Text>
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
                        onPress={() => handleCancelAway(enr.next_occurrence.id, enr.session?.name)}
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
                      onPress={() => handleMarkAway(enr.next_occurrence.id, enr.session?.name)}
                    >
                      {markingAway === enr.next_occurrence.id
                        ? <ActivityIndicator size="small" color="#ccff00" />
                        : <Text style={s.awayBtnText}>Mark away</Text>
                      }
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {enr.session?.id && <WhoComing sessionId={enr.session.id} />}

              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => handleCancelEnrolment(enr.id, enr.session?.name)}
              >
                <Text style={s.cancelBtnText}>Cancel enrolment</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Waitlisted */}
          {waitlistedEnrolments.filter(e => !e.waitlist_offered_at).length > 0 && (
            <View style={s.waitlistSection}>
              <Text style={s.waitlistSectionTitle}>Waitlisted</Text>
              {waitlistedEnrolments.filter(e => !e.waitlist_offered_at).map(e => {
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
                    <TouchableOpacity onPress={() => handleCancelEnrolment(e.id, s2?.name)}>
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
