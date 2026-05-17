import { useState, useEffect } from 'react'
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { useStripePayment } from '../../hooks/useStripePayment'
import { classes, enrolments, seasons, attendance, settings as settingsApi } from '../../api'
import LevelFilterBar from '../../components/LevelFilterBar'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const TABS = [
  { key: 'season', label: 'Season' },
  { key: 'casual', label: 'Casual' },
  { key: 'trial', label: 'Trial' },
  { key: 'catchup', label: 'Catch-up' },
  { key: 'workshops', label: 'Workshops' },
]

function ClassCard({ session, actionLabel, actionColor = '#6366f1', onPress, loading, done, doneLabel = '✓ Booked', accent }) {
  return (
    <View style={[s.card, accent && { borderColor: accent, borderWidth: 1.5 }]}>
      <View style={s.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{session.name}</Text>
          <Text style={s.cardMeta}>
            {session.day_of_week != null ? DAYS[session.day_of_week] : ''}
            {session.start_time ? `  ·  ${session.start_time.slice(0, 5)}` : ''}
            {session.end_time ? ` – ${session.end_time.slice(0, 5)}` : ''}
          </Text>
          {(session.studio_detail?.name || session.studio?.name) && (
            <Text style={s.cardMeta}>{session.studio_detail?.name ?? session.studio?.name}</Text>
          )}
          {session.instructor_detail && (
            <Text style={s.cardMeta}>
              {session.instructor_detail.display_name ?? session.instructor_detail.first_name}
            </Text>
          )}
        </View>
      </View>
      {done ? (
        <View style={[s.doneTag, { backgroundColor: actionColor + '22' }]}>
          <Text style={[s.doneTagText, { color: actionColor }]}>{doneLabel}</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[s.bookBtn, { backgroundColor: actionColor }, loading && s.bookBtnDisabled]}
          onPress={onPress}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.bookBtnText}>{actionLabel}</Text>
          }
        </TouchableOpacity>
      )}
    </View>
  )
}

export default function BookScreen() {
  const { user } = useAuth()
  const { pay } = useStripePayment()
  const [tab, setTab] = useState('season')
  const [booking, setBooking] = useState(null)
  const [booked, setBooked] = useState({})
  const [experienceLevel, setExperienceLevel] = useState(null)
  const [levelFilter, setLevelFilter] = useState(null)

  useEffect(() => {
    if (user?.id) {
      AsyncStorage.getItem(`experience_level_${user.id}`).then(val => setExperienceLevel(val))
      AsyncStorage.getItem(`class_level_${user.id}`).then(val => setLevelFilter(val))
    }
  }, [user?.id])

  const { data: studioSettings } = useApi(() => settingsApi.get(), [])
  const { data: sessionsData, loading: sessLoading, refetch: refetchSessions } = useApi(
    () => classes.list(), []
  )
  const { data: workshopsData, loading: wsLoading, refetch: refetchWorkshops } = useApi(
    () => classes.workshops.list(), []
  )
  const { data: seasonsData } = useApi(() => seasons.list(), [])
  const { data: creditsData, refetch: refetchCredits } = useApi(
    () => user?.id ? attendance.makeupCredits.list({ student: user.id, status: 'available' }) : null,
    [user?.id]
  )
  const { data: activeEnrolData } = useApi(
    () => user?.id ? enrolments.list({ student: user.id, status: 'active' }) : null,
    [user?.id]
  )

  const allSessions = sessionsData?.results ?? sessionsData ?? []
  const availableLevels = [...new Set(allSessions.map(s => s.level).filter(Boolean))].sort()
  const sessionList = levelFilter
    ? allSessions.filter(s => s.level === levelFilter)
    : allSessions
  const workshopList = workshopsData?.results ?? workshopsData ?? []
  const allSeasons = seasonsData?.results ?? seasonsData ?? []
  const credits = creditsData?.results ?? creditsData ?? []
  const availableCredits = credits.length

  const priceCasual = parseFloat(studioSettings?.price_casual ?? 35)
  const priceTrial = parseFloat(studioSettings?.price_trial ?? 25)

  const activeSeasonCount = (activeEnrolData?.results ?? activeEnrolData ?? [])
    .filter(e => e.enrolment_type === 'course').length
  const seasonPricingConfig = studioSettings?.season_pricing_config ?? []
  function getSeasonPrice() {
    const totalClasses = activeSeasonCount + 1
    const tier = seasonPricingConfig.find(r => {
      const n = parseInt((r.label ?? '').match(/(\d+)/)?.[1] ?? '0')
      return n === totalClasses
    })
    return tier ? parseFloat(tier.price) : parseFloat(studioSettings?.price_season ?? 270)
  }
  const seasonPrice = getSeasonPrice()

  const upcomingSeason = allSeasons.find(s => s.status === 'upcoming')
    ?? allSeasons.find(s => s.start_date && new Date(s.start_date) > new Date())
    ?? allSeasons.find(s => s.status === 'active')

  async function handleEnrol(session, type, price) {
    setBooking(session.id)
    try {
      if (type === 'catchup') {
        await enrolments.create({ session: session.id, status: 'active', enrolment_type: 'catchup' })
        refetchCredits()
        setBooked(b => ({ ...b, [session.id + '-catchup']: true }))
      } else {
        const succeeded = await pay({
          amountCents: Math.round(price * 100),
          description: `${session.name} — ${type}`,
          sessionId: session.id,
          enrolmentType: type,
          onSuccess: () => setBooked(b => ({ ...b, [session.id + '-' + type]: true })),
        })
        if (!succeeded) return // user cancelled — no error
      }
    } catch (err) {
      Alert.alert('Payment failed', err.message ?? 'Could not complete booking.')
    } finally {
      setBooking(null)
    }
  }

  async function handleWorkshopBook(workshop) {
    setBooking(workshop.id)
    try {
      const res = await classes.workshops.book(workshop.id)
      setBooked(b => ({ ...b, ['w-' + workshop.id]: res.data?.status ?? 'confirmed' }))
      refetchWorkshops()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail ?? 'Could not book workshop.')
    } finally {
      setBooking(null)
    }
  }

  async function handleWorkshopCancel(workshop) {
    Alert.alert('Cancel booking', `Cancel your booking for ${workshop.name}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel booking', style: 'destructive',
        onPress: async () => {
          setBooking(workshop.id)
          try {
            await classes.workshops.cancel(workshop.id)
            setBooked(b => { const n = { ...b }; delete n['w-' + workshop.id]; return n })
            refetchWorkshops()
          } catch (err) {
            Alert.alert('Error', err.response?.data?.detail ?? 'Could not cancel.')
          } finally {
            setBooking(null)
          }
        },
      },
    ])
  }

  const isLoading = tab === 'workshops' ? wsLoading : sessLoading
  const onRefresh = tab === 'workshops' ? refetchWorkshops : refetchSessions

  return (
    <View style={s.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabBarContent}>
        {TABS.map(({ key, label }) => (
          <TouchableOpacity key={key} style={[s.tab, tab === key && s.tabActive]} onPress={() => setTab(key)}>
            <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {['season', 'casual', 'trial'].includes(tab) && availableLevels.length > 0 && (
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

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
      >

        {/* ── Season ── */}
        {tab === 'season' && (
          <>
            {upcomingSeason && (
              <View style={s.infoBanner}>
                <Text style={s.infoBannerTitle}>{upcomingSeason.name}</Text>
                <Text style={s.infoBannerBody}>
                  Reserve your spot for the full term.
                  {upcomingSeason.start_date && upcomingSeason.end_date
                    ? ` Runs ${new Date(upcomingSeason.start_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${new Date(upcomingSeason.end_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}.`
                    : ''}
                </Text>
                <Text style={s.infoBannerPrice}>${seasonPrice} per class / season</Text>
              </View>
            )}
            {sessionList.length === 0 && !sessLoading && <Text style={s.empty}>No classes available.</Text>}
            {sessionList.map(session => (
              <ClassCard
                key={session.id}
                session={session}
                actionLabel={`Enrol — $${seasonPrice}`}
                onPress={() => handleEnrol(session, 'season', seasonPrice)}
                loading={booking === session.id}
                done={booked[session.id + '-season']}
              />
            ))}
          </>
        )}

        {/* ── Casual ── */}
        {tab === 'casual' && (
          <>
            <View style={s.infoBanner}>
              <Text style={s.infoBannerTitle}>Drop-in rate</Text>
              <Text style={s.infoBannerPrice}>${priceCasual} per class</Text>
            </View>
            {sessionList.length === 0 && !sessLoading && <Text style={s.empty}>No classes available.</Text>}
            {sessionList.map(session => (
              <ClassCard
                key={session.id}
                session={session}
                actionLabel={`Book — $${priceCasual}`}
                onPress={() => handleEnrol(session, 'casual', priceCasual)}
                loading={booking === session.id}
                done={booked[session.id + '-casual']}
              />
            ))}
          </>
        )}

        {/* ── Trial ── */}
        {tab === 'trial' && (
          <>
            <View style={[s.infoBanner, s.trialBanner]}>
              <Text style={[s.infoBannerTitle, { color: '#92400e' }]}>
                {experienceLevel === 'beginner' ? 'Perfect for beginners' :
                 experienceLevel === 'some' ? 'Find your level' :
                 experienceLevel === 'experienced' ? 'Jump back in' :
                 'Try your first class'}
              </Text>
              <Text style={s.infoBannerBody}>
                {experienceLevel === 'beginner' ? 'All our trial classes welcome complete beginners. No experience needed — just wear comfortable activewear and bring water.' :
                 experienceLevel === 'some' ? 'These classes are great for picking up where you left off. Try a few and see what clicks.' :
                 experienceLevel === 'experienced' ? 'Jump into any class — our instructors will work with your level.' :
                 'No experience needed. Wear comfortable activewear and bring water.'}
              </Text>
              <Text style={[s.infoBannerPrice, { color: '#92400e' }]}>${priceTrial} trial rate</Text>
            </View>

            {experienceLevel === 'beginner' && (
              <View style={s.filterNote}>
                <Text style={s.filterNoteText}>Showing beginner-friendly classes first</Text>
              </View>
            )}

            {sessionList.length === 0 && !sessLoading && <Text style={s.empty}>No classes available.</Text>}
            {[...sessionList]
              .sort((a, b) => {
                if (experienceLevel !== 'beginner') return 0
                const aLevel = (a.level?.name ?? a.name ?? '').toLowerCase()
                const bLevel = (b.level?.name ?? b.name ?? '').toLowerCase()
                const aIsBeginner = /level.?1|beginner|intro/i.test(aLevel)
                const bIsBeginner = /level.?1|beginner|intro/i.test(bLevel)
                if (aIsBeginner && !bIsBeginner) return -1
                if (!aIsBeginner && bIsBeginner) return 1
                return 0
              })
              .map(session => (
                <ClassCard
                  key={session.id}
                  session={session}
                  actionLabel={`Book trial — $${priceTrial}`}
                  actionColor="#d97706"
                  accent="#f59e0b"
                  onPress={() => handleEnrol(session, 'trial', priceTrial)}
                  loading={booking === session.id}
                  done={booked[session.id + '-trial']}
                />
              ))
            }
          </>
        )}

        {/* ── Catch-up ── */}
        {tab === 'catchup' && (
          <>
            <View style={[s.infoBanner, availableCredits === 0 && s.noCreditsBanner]}>
              <Text style={s.infoBannerTitle}>
                {availableCredits > 0
                  ? `${availableCredits} catch-up credit${availableCredits !== 1 ? 's' : ''} available`
                  : 'No catch-up credits'}
              </Text>
              <Text style={s.infoBannerBody}>
                {availableCredits > 0
                  ? 'Each credit lets you attend one class at no charge.'
                  : 'Credits are issued when you notify the studio of an absence in time. Contact us if you think this is wrong.'}
              </Text>
            </View>
            {availableCredits > 0 && sessionList.map(session => (
              <ClassCard
                key={session.id}
                session={session}
                actionLabel="Book (uses 1 credit)"
                actionColor="#10b981"
                accent="#6ee7b7"
                onPress={() => handleEnrol(session, 'catchup', 0)}
                loading={booking === session.id}
                done={booked[session.id + '-catchup']}
                doneLabel="✓ Credit used"
              />
            ))}
          </>
        )}

        {/* ── Workshops ── */}
        {tab === 'workshops' && (
          <>
            {workshopList.length === 0 && !wsLoading && <Text style={s.empty}>No workshops coming up.</Text>}
            {workshopList.map(w => {
              const liveStatus = booked['w-' + w.id] ?? w.booking_status
              const confirmed = liveStatus === 'confirmed'
              const waitlisted = liveStatus === 'waitlisted'
              const isFull = w.spots_left === 0 || (w.capacity != null && (w.capacity - (w.bookings_count ?? 0)) <= 0)
              return (
                <View key={w.id} style={[s.card, confirmed && { borderColor: '#10b981', borderWidth: 1.5 }]}>
                  <Text style={s.cardTitle}>{w.name}</Text>
                  {w.date && (
                    <Text style={s.cardMeta}>
                      {new Date(w.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {w.start_time ? `  ·  ${w.start_time.slice(0, 5)}` : ''}
                    </Text>
                  )}
                  {w.studio_detail?.name && <Text style={s.cardMeta}>{w.studio_detail.name}</Text>}
                  {w.description ? <Text style={s.cardDesc} numberOfLines={2}>{w.description}</Text> : null}
                  {w.price != null && <Text style={s.workshopPrice}>${parseFloat(w.price).toFixed(0)}</Text>}

                  {confirmed ? (
                    <View style={s.confirmedRow}>
                      <Text style={s.confirmedText}>✓ Booked</Text>
                      <TouchableOpacity onPress={() => handleWorkshopCancel(w)}>
                        <Text style={s.cancelLink}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  ) : waitlisted ? (
                    <View style={s.confirmedRow}>
                      <Text style={s.waitlistText}>On waitlist</Text>
                      <TouchableOpacity onPress={() => handleWorkshopCancel(w)}>
                        <Text style={s.cancelLink}>Leave</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[s.bookBtn, booking === w.id && s.bookBtnDisabled]}
                      onPress={() => handleWorkshopBook(w)}
                      disabled={booking === w.id}
                    >
                      {booking === w.id
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={s.bookBtnText}>{isFull ? 'Join waitlist' : `Book — $${parseFloat(w.price ?? 0).toFixed(0)}`}</Text>
                      }
                    </TouchableOpacity>
                  )}
                </View>
              )
            })}
          </>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  tabBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexGrow: 0 },
  tabBarContent: { paddingHorizontal: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 14 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  tabTextActive: { color: '#6366f1', fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  infoBanner: { backgroundColor: '#e0e7ff', borderRadius: 12, padding: 14, marginBottom: 16 },
  trialBanner: { backgroundColor: '#fef3c7' },
  noCreditsBanner: { backgroundColor: '#fee2e2' },
  infoBannerTitle: { fontWeight: '700', color: '#3730a3', fontSize: 15, marginBottom: 4 },
  infoBannerBody: { fontSize: 13, color: '#4338ca', lineHeight: 18, marginBottom: 4 },
  infoBannerPrice: { fontSize: 16, fontWeight: '700', color: '#4338ca', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 3 },
  cardMeta: { fontSize: 13, color: '#6b7280', marginTop: 1 },
  cardDesc: { fontSize: 13, color: '#6b7280', marginTop: 6, marginBottom: 8 },
  workshopPrice: { fontSize: 20, fontWeight: '800', color: '#111827', marginVertical: 8 },
  bookBtn: { backgroundColor: '#6366f1', borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 8 },
  bookBtnDisabled: { backgroundColor: '#a5b4fc' },
  bookBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  doneTag: { borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  doneTagText: { fontWeight: '700', fontSize: 14 },
  filterNote: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginBottom: 12 },
  filterNoteText: { fontSize: 12, color: '#92400e', fontWeight: '600' },
  confirmedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  confirmedText: { fontSize: 14, fontWeight: '700', color: '#10b981' },
  waitlistText: { fontSize: 14, fontWeight: '700', color: '#d97706' },
  cancelLink: { fontSize: 13, color: '#ef4444' },
})
