import { useState, useMemo, useEffect } from 'react'
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, Modal, ActivityIndicator, TextInput, Platform, StatusBar,
} from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { enrolments, seasons, attendance as attendanceApi, skills as skillsApi, announcements as announcementsApi, payments, notifications as notificationsApi } from '../../api'

const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function CancellationOfferModal({ offers, onResolved }) {
  const [current, setCurrent] = useState(0)
  const [choosing, setChoosing] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const offer = offers[current]
  if (!offer) return null

  async function choose(choice) {
    setChoosing(true)
    setError('')
    try {
      await payments.cancellationOffers.resolve(offer.id, choice)
      setDone(true)
      setTimeout(() => {
        setDone(false)
        if (current + 1 < offers.length) {
          setCurrent(c => c + 1)
        } else {
          onResolved()
        }
      }, 1400)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong.')
    } finally {
      setChoosing(false)
    }
  }

  const dateLabel = offer.occurrence_date
    ? new Date(offer.occurrence_date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''

  return (
    <Modal visible transparent animationType="fade">
      <View style={co.overlay}>
        <View style={co.sheet}>
          <View style={co.sheetHeader}>
            <Text style={co.cancelledLabel}>CLASS CANCELLED</Text>
            <Text style={co.sessionName}>{offer.session_name}</Text>
            <Text style={co.dateLabel}>{dateLabel}</Text>
            {offers.length > 1 && (
              <Text style={co.counter}>{current + 1} of {offers.length}</Text>
            )}
          </View>
          <View style={co.body}>
            <Text style={co.intro}>We're sorry your class was cancelled. Please choose one of the following:</Text>
            {!!error && <Text style={co.errorText}>{error}</Text>}
            {done ? (
              <Text style={co.doneText}>✓ Got it — thanks!</Text>
            ) : (
              <>
                <TouchableOpacity
                  style={[co.option, co.optionLime]}
                  onPress={() => choose('credit')}
                  disabled={choosing}
                  activeOpacity={0.7}
                >
                  {choosing ? <ActivityIndicator color="#ccff00" size="small" /> : (
                    <>
                      <Text style={co.optionTitle}>${parseFloat(offer.credit_amount ?? 0).toFixed(2)} Account Credit</Text>
                      <Text style={co.optionSub}>Added directly to your account balance — use it towards any future invoice.</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[co.option, co.optionLav]}
                  onPress={() => choose('makeup')}
                  disabled={choosing}
                  activeOpacity={0.7}
                >
                  <Text style={co.optionTitleLav}>Makeup Class Credit</Text>
                  <Text style={co.optionSub}>A credit to attend one makeup class in any session — arrange with reception.</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const co = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { backgroundColor: '#111', borderRadius: 16, width: '100%', overflow: 'hidden', borderWidth: 1, borderColor: '#222' },
  sheetHeader: { backgroundColor: 'rgba(255,68,68,0.1)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,68,68,0.2)', padding: 20 },
  cancelledLabel: { fontSize: 11, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700', marginBottom: 4 },
  sessionName: { fontSize: 18, fontWeight: '700', color: '#fff', lineHeight: 24 },
  dateLabel: { fontSize: 13, color: '#888', marginTop: 4 },
  counter: { fontSize: 11, color: '#666', marginTop: 6 },
  body: { padding: 20 },
  intro: { fontSize: 14, color: '#aaa', lineHeight: 22, marginBottom: 16 },
  errorText: { color: '#ef4444', fontSize: 12, marginBottom: 12 },
  doneText: { textAlign: 'center', color: '#ccff00', fontWeight: '600', fontSize: 15, paddingVertical: 16 },
  option: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  optionLime: { backgroundColor: 'rgba(204,255,0,0.06)', borderColor: 'rgba(204,255,0,0.3)' },
  optionLav: { backgroundColor: 'rgba(176,160,255,0.06)', borderColor: 'rgba(176,160,255,0.3)' },
  optionTitle: { fontWeight: '700', fontSize: 15, color: '#ccff00', marginBottom: 4 },
  optionTitleLav: { fontWeight: '700', fontSize: 15, color: '#b0a0ff', marginBottom: 4 },
  optionSub: { fontSize: 12, color: '#888', lineHeight: 18 },
})

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function KpiCard({ label, value, color = '#ccff00' }) {
  return (
    <View style={s.kpi}>
      <Text style={[s.kpiVal, { color }]}>{value ?? '—'}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  )
}

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth()
  const { data: enrolData, loading, refetch: refetchEnrol } = useApi(
    () => enrolments.list({ student: user?.id, status: 'active' }), [user?.id]
  )
  const { data: seasonData } = useApi(() => seasons.list(), [])
  const { data: skillsData } = useApi(() => user?.id ? skillsApi.list(user.id) : null, [user?.id])
  const { data: creditsData } = useApi(
    () => attendanceApi.makeupCredits.list({ student: user?.id, status: 'available' }), [user?.id]
  )
  const { data: annData, refetch: refetchAnn } = useApi(
    () => announcementsApi.list({ note_type: 'announcement' }), []
  )
  const { data: notifData } = useApi(() => notificationsApi.list(), [])
  const { data: offersData, refetch: refetchOffers } = useApi(
    () => payments.cancellationOffers.mine(), []
  )
  const { data: trialPendingData, refetch: refetchTrialFeedback } = useApi(
    () => enrolments.trialFeedback.pending(), []
  )

  const [markingAway, setMarkingAway] = useState({})
  const [cancellingAway, setCancellingAway] = useState({})
  const [acknowledging, setAcknowledging] = useState({})
  const [trialScreen, setTrialScreen] = useState('prompt')
  const [trialRatings, setTrialRatings] = useState({ class: 0, instructor: 0, facilities: 0, structure: 0 })
  const [trialReason, setTrialReason] = useState('')
  const [trialSubmitting, setTrialSubmitting] = useState(false)

  const pendingOffers = offersData?.results ?? offersData ?? []
  const pendingTrialFeedback = trialPendingData ?? []
  const trialItem = pendingTrialFeedback[0] ?? null

  const allAnnouncements = annData?.results || annData || []
  const pendingAnnouncements = allAnnouncements.filter(a => !a.is_acknowledged)

  const allNotifs = notifData?.results || notifData || []
  const unreadNotifs = allNotifs.filter(n => !n.read).length
  const unackAnns = allAnnouncements.filter(a => a.requires_acknowledgement && !a.is_acknowledged).length
  const bellBadge = unreadNotifs + unackAnns

  useEffect(() => {
    navigation.setOptions({ headerShown: false })
  }, [navigation])

  async function handleMarkAway(occ, enrolId) {
    const dateLabel = new Date(occ.date + 'T00:00').toLocaleDateString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
    let withinCutoff = false
    if (occ.start_time) {
      const [h, m] = occ.start_time.split(':').map(Number)
      const classDateTime = new Date(occ.date + 'T00:00')
      classDateTime.setHours(h, m, 0, 0)
      withinCutoff = (classDateTime - Date.now()) < 4 * 60 * 60 * 1000
    }
    const creditMsg = withinCutoff
      ? 'This is within 4 hours of your class — no catch-up credit will be issued.'
      : "You'll receive a catch-up credit to use within this season."

    Alert.alert(
      'Mark away?',
      `${dateLabel}\n\n${creditMsg}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm away',
          onPress: async () => {
            setMarkingAway(prev => ({ ...prev, [occ.id]: true }))
            try {
              await attendanceApi.markAway(occ.id, enrolId)
              refetchEnrol()
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail || 'Could not mark away')
            } finally {
              setMarkingAway(prev => ({ ...prev, [occ.id]: false }))
            }
          },
        },
      ]
    )
  }

  async function handleCancelAway(occId) {
    setCancellingAway(prev => ({ ...prev, [occId]: true }))
    try {
      await attendanceApi.cancelAway(occId)
      refetchEnrol()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not update')
    } finally {
      setCancellingAway(prev => ({ ...prev, [occId]: false }))
    }
  }

  async function acknowledgeAnn(id) {
    setAcknowledging(prev => ({ ...prev, [id]: true }))
    try {
      await announcementsApi.acknowledge(id)
      refetchAnn()
    } finally {
      setAcknowledging(prev => ({ ...prev, [id]: false }))
    }
  }

  const enrolList = enrolData?.results || enrolData || []
  const tricksUnlocked = (skillsData?.results || skillsData || []).filter(sk => sk.achieved).length
  const creditCount = (creditsData?.results || creditsData || []).length

  // Current active season
  const allSeasons = seasonData?.results || seasonData || []
  const now = new Date()
  const currentSeason = allSeasons.find(s => s.status === 'active') ||
    allSeasons.find(s => {
      const start = s.start_date ? new Date(s.start_date) : null
      const end = s.end_date ? new Date(s.end_date) : null
      return start && end && now >= start && now <= end
    }) || allSeasons[0]

  let weeksRemaining = '—'
  if (currentSeason?.end_date) {
    const end = new Date(currentSeason.end_date)
    const msLeft = end - now
    if (msLeft > 0) weeksRemaining = Math.ceil(msLeft / (1000 * 60 * 60 * 24 * 7))
  }

  const hasEnrolments = enrolList.length > 0
  const profileIncomplete = !user?.phone || !user?.emergency_contact_name || !user?.emergency_contact_phone

  // Level progression
  const allSkills = skillsData?.results || skillsData || []
  const nextLevelSkills = allSkills.filter(sk => !sk.achieved && sk.required_for_next_level)

  function onRefresh() {
    refetchEnrol()
    refetchAnn()
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#ccff00" />}
    >
      {/* Custom header row with bell */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text style={[s.greeting, { marginBottom: 0 }]}>{greeting()}, {user?.first_name || 'there'} 👋</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          style={{ position: 'relative', padding: 4 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View style={{ width: 16, height: 13, backgroundColor: '#ccff00', borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
            <View style={{ width: 20, height: 2.5, backgroundColor: '#ccff00', borderRadius: 1, marginBottom: 1 }} />
            <View style={{ width: 6, height: 6, backgroundColor: '#ccff00', borderRadius: 3 }} />
          </View>
          {bellBadge > 0 && (
            <View style={{
              position: 'absolute', top: -2, right: -4,
              backgroundColor: '#ccff00', borderRadius: 9,
              minWidth: 17, height: 17,
              alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: 3,
            }}>
              <Text style={{ color: '#000', fontSize: 10, fontWeight: '800' }}>
                {bellBadge > 99 ? '99+' : bellBadge}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <Text style={s.dateText}>
        {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </Text>

      {/* Season open banner — shown when no active enrolments */}
      {!loading && !hasEnrolments && (
        <View style={s.seasonBanner}>
          <Text style={s.seasonBannerText}>
            {currentSeason ? `${currentSeason.name} is now open` : 'New season is now open'} — book your spot
          </Text>
          <TouchableOpacity style={s.seasonBannerBtn} onPress={() => navigation.navigate('Book')}>
            <Text style={s.seasonBannerBtnText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Profile incomplete banner */}
      {profileIncomplete && (
        <View style={s.profileBanner}>
          <View style={{ flex: 1 }}>
            <Text style={s.profileBannerTitle}>Complete your profile</Text>
            <Text style={s.profileBannerBody}>Add your phone number and emergency contact.</Text>
          </View>
          <TouchableOpacity style={s.profileBannerBtn} onPress={() => navigation.navigate('Account')}>
            <Text style={s.profileBannerBtnText}>Update</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Enrolled classes summary */}
      {hasEnrolments && (
        <Text style={s.enrolledSummary}>
          You're enrolled in {enrolList.map(e => e.class_session_detail?.name).filter(Boolean).join(' and ')} this season.
        </Text>
      )}

      {/* KPI grid */}
      <View style={s.kpiRow}>
        <KpiCard label="Classes This Season" value={loading ? '—' : enrolList.length} />
        <KpiCard label="Catch-up Credits" value={creditCount} color="#b0a0ff" />
      </View>
      <View style={s.kpiRow}>
        <KpiCard label="Tricks Unlocked" value={skillsData ? tricksUnlocked : '—'} />
        <KpiCard label="Weeks Remaining" value={weeksRemaining} color="#b0a0ff" />
      </View>

      {/* Announcements */}
      {pendingAnnouncements.length > 0 && (
        <View style={s.announcementsSection}>
          {pendingAnnouncements.map(a => (
            <View key={a.id} style={[s.announcementCard, a.requires_acknowledgement ? s.announcementCardAmber : s.announcementCardLav]}>
              <View style={s.announcementRow}>
                <View style={{ flex: 1 }}>
                  {a.is_pinned && <Text style={s.pinnedLabel}>PINNED</Text>}
                  <Text style={s.announcementTitle}>{a.title}</Text>
                </View>
                {a.requires_acknowledgement && (
                  <TouchableOpacity
                    style={[s.ackBtn, acknowledging[a.id] && s.ackBtnDisabled]}
                    onPress={() => acknowledgeAnn(a.id)}
                    disabled={!!acknowledging[a.id]}
                  >
                    <Text style={s.ackBtnText}>{acknowledging[a.id] ? '…' : 'Acknowledge'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={s.announcementBody}>{a.body}</Text>
              {a.requires_acknowledgement && (
                <Text style={s.ackHint}>Please read and acknowledge this notice to dismiss it.</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Classes This Week */}
      <Text style={s.sectionTitle}>Classes This Week</Text>
      <TouchableOpacity onPress={() => navigation.navigate('UpcomingClasses')} style={{ alignSelf: 'flex-end', marginTop: -8, marginBottom: 8 }}>
        <Text style={{ fontSize: 12, color: '#ccff00', fontWeight: '600' }}>View all upcoming →</Text>
      </TouchableOpacity>
      {enrolList.length === 0 && !loading ? (
        <Text style={s.empty}>No classes enrolled yet. Contact your studio to get set up.</Text>
      ) : (
        enrolList.map(e => {
          const sess = e.class_session_detail
          const instructorName = sess?.instructor_detail
            ? `${sess.instructor_detail.first_name || ''} ${sess.instructor_detail.last_name || ''}`.trim()
            : (sess?.instructor_name || '—')
          return (
            <View key={e.id} style={s.classCard}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  {sess?.day_of_week != null && (
                    <Text style={s.classDay}>
                      {DAYS_FULL[sess.day_of_week]} · {sess.start_time?.slice(0, 5)}
                    </Text>
                  )}
                  <Text style={s.className}>{sess?.name} · {sess?.studio_detail?.name}</Text>
                  <Text style={s.classInstructor}>with {instructorName}</Text>
                </View>
              </View>
              {(e.upcoming_occurrences ?? []).length > 0 && (
                <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#222', paddingTop: 10, gap: 8 }}>
                  {(e.upcoming_occurrences ?? []).map((occ, idx) => {
                    const isAway = occ.marked_away
                    const dateStr = new Date(occ.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
                    return (
                      <View key={occ.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={[s.nextDate, isAway && { color: '#ffaa00' }]}>
                          {dateStr}{isAway ? '  · AWAY' : ''}
                        </Text>
                        {isAway ? (
                          <TouchableOpacity
                            style={s.canMakeItBtn}
                            disabled={!!cancellingAway[occ.id]}
                            onPress={() => handleCancelAway(occ.id)}
                          >
                            {cancellingAway[occ.id]
                              ? <ActivityIndicator size="small" color="#ccff00" />
                              : <Text style={s.canMakeItText}>I can make it!</Text>
                            }
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={s.awayBtn}
                            disabled={!!markingAway[occ.id]}
                            onPress={() => handleMarkAway(occ, e.id)}
                          >
                            {markingAway[occ.id]
                              ? <ActivityIndicator size="small" color="#ccff00" />
                              : <Text style={s.awayBtnText}>Mark away</Text>
                            }
                          </TouchableOpacity>
                        )}
                      </View>
                    )
                  })}
                </View>
              )}
            </View>
          )
        })
      )}

      {/* Level Progression Tracker */}
      {hasEnrolments && nextLevelSkills.length > 0 && (
        <View style={s.progressCard}>
          <View style={s.progressHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.progressTitle}>Ready for the next level?</Text>
              <Text style={s.progressSubtitle}>
                Tick off these moves as you nail them. Your instructor signs you off when ready.
              </Text>
            </View>
            <Text style={s.progressCount}>
              {nextLevelSkills.filter(sk => sk.self_marked).length} / {nextLevelSkills.length}
            </Text>
          </View>
          {nextLevelSkills.map(skill => (
            <View key={skill.id} style={[s.skillRow, skill.self_marked && s.skillRowActive]}>
              <View style={[s.skillDot, skill.self_marked && s.skillDotActive]}>
                {skill.self_marked && <Text style={s.skillCheck}>✓</Text>}
              </View>
              <Text style={[s.skillName, skill.self_marked && s.skillNameActive]}>{skill.name}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Quick Links */}
      <Text style={s.sectionTitle}>Quick links</Text>
      <View style={s.quickLinks}>
        <TouchableOpacity style={s.quickLink} onPress={() => navigation.navigate('Book')}>
          <View style={s.quickLinkIconWrap}>
            <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#000' }} />
          </View>
          <Text style={s.quickLinkLabel}>Makeup or casual class</Text>
          <Text style={s.quickLinkSub}>Drop into any eligible class</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickLink} onPress={() => navigation.navigate('Book', { screen: 'Practice' })}>
          <View style={s.quickLinkIconWrap}>
            <View style={{ width: 10, height: 10, backgroundColor: '#000', borderRadius: 2 }} />
          </View>
          <Text style={s.quickLinkLabel}>Book practice time</Text>
          <Text style={s.quickLinkSub}>Open studio – $20</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickLink} onPress={() => navigation.navigate('Progress')}>
          <View style={s.quickLinkIconWrap}>
            <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 11, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#000' }} />
          </View>
          <Text style={s.quickLinkLabel}>See my progress</Text>
          <Text style={s.quickLinkSub}>Tricks, levels and resources</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickLink} onPress={() => navigation.navigate('Support')}>
          <View style={s.quickLinkIconWrap}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#000' }}>?</Text>
          </View>
          <Text style={s.quickLinkLabel}>I need help</Text>
          <Text style={s.quickLinkSub}>FAQs and contact</Text>
        </TouchableOpacity>
      </View>

      {/* Upsell strip */}
      {hasEnrolments && (
        <View style={s.upsellCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.upsellTitle}>
              You're on {enrolList.length} class{enrolList.length !== 1 ? 'es' : ''} per week
            </Text>
            <Text style={s.upsellBody}>
              Add a 3rd class to unlock <Text style={{ color: '#ccff00' }}>1 free practice session per week</Text>.
            </Text>
          </View>
          <TouchableOpacity style={s.upsellBtn} onPress={() => navigation.navigate('Book')}>
            <Text style={s.upsellBtnText}>Add a class</Text>
          </TouchableOpacity>
        </View>
      )}

      {pendingOffers.length > 0 && !trialItem && (
        <CancellationOfferModal
          offers={pendingOffers}
          onResolved={refetchOffers}
        />
      )}

      {/* Post-trial feedback modal */}
      {trialItem && (
        <Modal transparent animationType="fade" visible>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ backgroundColor: '#111', borderRadius: 16, width: '100%', maxWidth: 440, padding: 24 }}>

              {trialScreen === 'prompt' && (
                <>
                  <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 14 }}>🎉</Text>
                  <Text style={{ fontWeight: '800', fontSize: 20, color: '#fff', textAlign: 'center', marginBottom: 8 }}>We loved having you in class!</Text>
                  <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 22 }}>
                    Did you love it as much as we did? Would you like to enrol in the rest of the course?
                  </Text>
                  <View style={{ backgroundColor: 'rgba(219,255,0,0.06)', borderWidth: 1, borderColor: 'rgba(219,255,0,0.2)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                    <Text style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                      {trialItem.season_name ? `${trialItem.season_name} · ` : ''}{trialItem.session_name}
                      {trialItem.remaining_classes > 0 ? ` · ${trialItem.remaining_classes} classes remaining` : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 15, color: '#fff', fontWeight: '500' }}>Enrol and lock in your spot</Text>
                      <Text style={{ fontWeight: '800', fontSize: 20, color: '#DBFF00' }}>${trialItem.enrol_price}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Your trial class is credited toward the season price</Text>
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: '#DBFF00', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 10 }}
                    disabled={trialSubmitting}
                    onPress={async () => {
                      setTrialSubmitting(true)
                      try { await enrolments.trialFeedback.submit(trialItem.id, { enrolled: true }) } catch {}
                      setTrialSubmitting(false)
                      refetchTrialFeedback()
                      navigation.navigate('Book')
                    }}
                  >
                    <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>Yes — enrol now · ${trialItem.enrol_price}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 14, alignItems: 'center' }}
                    onPress={() => setTrialScreen('feedback')}
                  >
                    <Text style={{ color: '#fff', fontSize: 15 }}>No thanks</Text>
                  </TouchableOpacity>
                </>
              )}

              {trialScreen === 'feedback' && (
                <>
                  <Text style={{ fontWeight: '800', fontSize: 18, color: '#fff', marginBottom: 6 }}>Thanks for trying us out</Text>
                  <Text style={{ fontSize: 14, color: '#888', marginBottom: 18, lineHeight: 20 }}>We'd love to know what you thought — takes 30 seconds.</Text>
                  {[['class', 'Did you enjoy the class?'], ['instructor', 'Did you enjoy the instructor?'], ['facilities', 'Did you like the facilities?'], ['structure', 'Did you like the class structure?']].map(([key, label]) => (
                    <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={{ fontSize: 13, color: '#aaa', flex: 1 }}>{label}</Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {[1,2,3,4,5].map(n => (
                          <TouchableOpacity key={n} onPress={() => setTrialRatings(r => ({ ...r, [key]: n }))}>
                            <Text style={{ fontSize: 22, color: n <= (trialRatings[key] || 0) ? '#DBFF00' : '#333' }}>★</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 6, marginTop: 4 }}>Why aren't you joining us for the season?</Text>
                  <TextInput
                    value={trialReason}
                    onChangeText={setTrialReason}
                    multiline
                    numberOfLines={3}
                    placeholder="e.g. timing doesn't work, trying another class first, budget..."
                    placeholderTextColor="#555"
                    style={{ backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, color: '#fff', fontSize: 14, marginBottom: 14, minHeight: 72 }}
                  />
                  <TouchableOpacity
                    style={{ backgroundColor: '#DBFF00', borderRadius: 10, padding: 14, alignItems: 'center' }}
                    disabled={trialSubmitting}
                    onPress={async () => {
                      const allRated = Object.values(trialRatings).every(v => v > 0)
                      if (!allRated || trialReason.trim().length < 5) {
                        Alert.alert('Missing info', 'Please rate each category and share a few words.')
                        return
                      }
                      setTrialSubmitting(true)
                      try {
                        await enrolments.trialFeedback.submit(trialItem.id, {
                          enrolled: false,
                          class_rating: trialRatings.class,
                          instructor_rating: trialRatings.instructor,
                          facilities_rating: trialRatings.facilities,
                          structure_rating: trialRatings.structure,
                          reason: trialReason,
                        })
                        setTrialScreen('thanks')
                      } catch { Alert.alert('Error', 'Could not submit feedback. Please try again.') }
                      setTrialSubmitting(false)
                    }}
                  >
                    <Text style={{ color: '#000', fontWeight: '700' }}>{trialSubmitting ? 'Submitting…' : 'Submit feedback'}</Text>
                  </TouchableOpacity>
                </>
              )}

              {trialScreen === 'thanks' && (
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <Text style={{ fontSize: 42, marginBottom: 14 }}>💜</Text>
                  <Text style={{ fontWeight: '800', fontSize: 20, color: '#fff', marginBottom: 10 }}>Thank you!</Text>
                  <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
                    Your feedback means a lot. We hope to see you again — drop in for a casual class any time, or keep an eye out when the next season opens.
                  </Text>
                  <TouchableOpacity
                    style={{ borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 28 }}
                    onPress={() => refetchTrialFeedback()}
                  >
                    <Text style={{ color: '#fff', fontSize: 15 }}>Go to my dashboard</Text>
                  </TouchableOpacity>
                </View>
              )}

            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, width: '100%', backgroundColor: '#000' },
  content: {
    padding: 20, paddingBottom: 40, width: '100%',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 12 : 56,
  },

  greeting: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 2 },
  dateText: { fontSize: 13, color: '#666', marginBottom: 16 },

  // Season banner
  seasonBanner: {
    backgroundColor: '#ccff00', borderRadius: 12, padding: 14, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  seasonBannerText: { flex: 1, fontWeight: '700', fontSize: 14, color: '#000' },
  seasonBannerBtn: { backgroundColor: '#000', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  seasonBannerBtnText: { color: '#ccff00', fontSize: 13, fontWeight: '700' },

  // Profile banner
  profileBanner: {
    backgroundColor: 'rgba(176,160,255,0.08)', borderWidth: 1, borderColor: 'rgba(176,160,255,0.25)',
    borderRadius: 12, padding: 14, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  profileBannerTitle: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7, color: '#b0a0ff', marginBottom: 4, fontWeight: '700' },
  profileBannerBody: { fontSize: 13, color: '#666' },
  profileBannerBtn: { backgroundColor: '#b0a0ff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  profileBannerBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },

  enrolledSummary: { fontSize: 14, color: '#666', marginBottom: 20 },

  // KPI
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpi: { flex: 1, backgroundColor: '#111', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  kpiVal: { fontSize: 28, fontWeight: '800', color: '#ccff00' },
  kpiLabel: { fontSize: 11, color: '#666', marginTop: 4, textAlign: 'center' },

  // Announcements
  announcementsSection: { marginBottom: 20, marginTop: 8 },
  announcementCard: { borderRadius: 12, padding: 14, marginBottom: 10 },
  announcementCardAmber: { backgroundColor: 'rgba(255,170,0,0.07)', borderWidth: 1, borderColor: 'rgba(255,170,0,0.3)' },
  announcementCardLav: { backgroundColor: 'rgba(176,160,255,0.07)', borderWidth: 1, borderColor: 'rgba(176,160,255,0.25)' },
  announcementRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 6 },
  pinnedLabel: { fontSize: 10, fontWeight: '700', color: '#ccff00', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  announcementTitle: { fontWeight: '700', fontSize: 14, color: '#fff' },
  announcementBody: { fontSize: 13, color: '#666', lineHeight: 20 },
  ackBtn: { backgroundColor: '#ffaa00', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, flexShrink: 0 },
  ackBtnDisabled: { opacity: 0.5 },
  ackBtnText: { color: '#000', fontSize: 12, fontWeight: '700' },
  ackHint: { fontSize: 11, color: '#ffaa00', marginTop: 8 },

  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8, marginBottom: 12 },
  empty: { color: '#666', textAlign: 'center', padding: 20 },

  // Class cards
  classCard: {
    backgroundColor: '#111', borderRadius: 12, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#222',
  },
  classDay: { fontSize: 12, color: '#666', marginBottom: 2 },
  className: { fontWeight: '600', color: '#fff', fontSize: 14, marginBottom: 2 },
  classInstructor: { fontSize: 12, color: '#666' },
  awayBtn: { backgroundColor: '#1a1a1a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#333' },
  awayBtnText: { fontSize: 12, fontWeight: '600', color: '#ccff00' },
  canMakeItBtn: { backgroundColor: '#0f1600', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#ccff00' },
  canMakeItText: { fontSize: 12, fontWeight: '600', color: '#ccff00' },
  nextDate: { fontSize: 13, color: '#ccc', fontWeight: '500', flex: 1 },

  // Level progression
  progressCard: {
    backgroundColor: '#111', borderRadius: 14, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: '#222',
  },
  progressHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 12 },
  progressTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  progressSubtitle: { fontSize: 13, color: '#666', lineHeight: 18 },
  progressCount: { fontSize: 11, fontWeight: '700', color: '#666', textTransform: 'uppercase', flexShrink: 0 },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  skillRowActive: { backgroundColor: 'rgba(204,255,0,0.05)' },
  skillDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#333', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  skillDotActive: { borderColor: '#ccff00', backgroundColor: 'rgba(204,255,0,0.15)' },
  skillCheck: { fontSize: 12, color: '#ccff00' },
  skillName: { fontSize: 13, color: '#666', flex: 1 },
  skillNameActive: { color: '#fff' },

  // Quick links
  quickLinks: { gap: 10, marginBottom: 24 },
  quickLink: { backgroundColor: '#111', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#222' },
  quickLinkIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#ccff00', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  quickLinkLabel: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 4 },
  quickLinkSub: { fontSize: 13, color: '#666' },

  // Upsell
  upsellCard: {
    backgroundColor: '#0d0d0d', borderRadius: 12, padding: 20, marginBottom: 8,
    borderWidth: 1, borderColor: '#222',
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  upsellTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 6 },
  upsellBody: { fontSize: 14, color: '#666' },
  upsellBtn: { borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  upsellBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  // Mark Away Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { backgroundColor: '#111', borderRadius: 16, width: '100%', maxWidth: 420, borderWidth: 1, borderColor: '#222' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  modalClose: { fontSize: 18, color: '#666' },
  modalBody: { padding: 18 },
  modalClassName: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 4 },
  modalClassMeta: { fontSize: 13, color: '#666', marginBottom: 4 },
  modalNextDate: { fontSize: 12, color: '#666', marginBottom: 16 },
  infoBox: { backgroundColor: 'rgba(204,255,0,0.05)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.15)', borderRadius: 10, padding: 14, marginBottom: 16 },
  infoBoxHeading: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  infoBoxText: { fontSize: 13, color: '#666', lineHeight: 20 },
  errorText: { color: '#ff4444', fontSize: 12, marginBottom: 12 },
  doneText: { textAlign: 'center', color: '#ccff00', fontWeight: '700', paddingVertical: 8 },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  confirmBtn: { flex: 1, backgroundColor: '#ccff00', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
  btnDisabled: { opacity: 0.5 },
})
