import { useState } from 'react'
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { classes, enrolments, seasons } from '../../api'

const TABS = [
  { key: 'season', label: 'Season' },
  { key: 'workshops', label: 'Workshops' },
]

function LevelBadge({ level }) {
  if (!level) return null
  return (
    <View style={s.levelBadge}>
      <Text style={s.levelText}>{level}</Text>
    </View>
  )
}

function SessionCard({ session, onEnrol, enrolling }) {
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{session.name}</Text>
          {session.studio?.name && <Text style={s.cardMeta}>{session.studio.name}</Text>}
          {session.day_of_week !== undefined && (
            <Text style={s.cardMeta}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][session.day_of_week]}
              {session.start_time ? `  ·  ${session.start_time.slice(0, 5)}` : ''}
            </Text>
          )}
        </View>
        <LevelBadge level={session.level?.name} />
      </View>
      {session.description ? <Text style={s.cardDesc} numberOfLines={2}>{session.description}</Text> : null}
      <TouchableOpacity
        style={[s.enrolBtn, enrolling && s.enrolBtnDisabled]}
        disabled={enrolling}
        onPress={() => onEnrol(session)}
      >
        {enrolling
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={s.enrolBtnText}>Enrol</Text>
        }
      </TouchableOpacity>
    </View>
  )
}

function WorkshopCard({ workshop, onBook, booking }) {
  const spotsLeft = workshop.capacity != null ? workshop.capacity - (workshop.bookings_count ?? 0) : null

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{workshop.name}</Text>
      {workshop.date && (
        <Text style={s.cardMeta}>
          {new Date(workshop.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
          {workshop.start_time ? `  ·  ${workshop.start_time.slice(0, 5)}` : ''}
        </Text>
      )}
      {workshop.studio?.name && <Text style={s.cardMeta}>{workshop.studio.name}</Text>}
      {spotsLeft === 0 && (
        <Text style={[s.cardMeta, { color: '#ef4444' }]}>Fully booked</Text>
      )}
      {workshop.price != null && <Text style={s.price}>${workshop.price}</Text>}
      <TouchableOpacity
        style={[s.enrolBtn, (booking || spotsLeft === 0) && s.enrolBtnDisabled]}
        disabled={booking || spotsLeft === 0}
        onPress={() => onBook(workshop)}
      >
        {booking
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={s.enrolBtnText}>{spotsLeft === 0 ? 'Join waitlist' : 'Book'}</Text>
        }
      </TouchableOpacity>
    </View>
  )
}

export default function BookScreen() {
  const [tab, setTab] = useState('season')
  const [enrolling, setEnrolling] = useState(null)
  const [booking, setBooking] = useState(null)

  const { data: seasonData } = useApi(() => seasons.list(), [])
  const activeSeason = (seasonData?.results ?? seasonData ?? []).find(s => s.is_active) ?? null

  const { data: sessionsData, loading: sessionsLoading, refetch: refetchSessions } = useApi(
    () => activeSeason ? classes.list({ season: activeSeason.id, bookable: true }) : null,
    [activeSeason?.id]
  )
  const { data: workshopsData, loading: workshopsLoading, refetch: refetchWorkshops } = useApi(
    () => classes.workshops.list(), []
  )

  const sessionList = sessionsData?.results ?? sessionsData ?? []
  const workshopList = workshopsData?.results ?? workshopsData ?? []

  async function handleEnrol(session) {
    Alert.alert(
      'Confirm enrolment',
      `Enrol in ${session.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enrol',
          onPress: async () => {
            setEnrolling(session.id)
            try {
              await enrolments.create({ session: session.id, enrolment_type: 'season' })
              Alert.alert('Enrolled!', `You've been enrolled in ${session.name}.`)
              refetchSessions()
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail || 'Could not enrol.')
            } finally {
              setEnrolling(null)
            }
          },
        },
      ]
    )
  }

  async function handleBook(workshop) {
    setBooking(workshop.id)
    try {
      await classes.workshops.book(workshop.id)
      Alert.alert('Booked!', `You've booked ${workshop.name}.`)
      refetchWorkshops()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not book.')
    } finally {
      setBooking(null)
    }
  }

  const isLoading = tab === 'season' ? sessionsLoading : workshopsLoading
  const onRefresh = tab === 'season' ? refetchSessions : refetchWorkshops

  return (
    <View style={s.root}>
      <View style={s.tabs}>
        {TABS.map(({ key, label }) => (
          <TouchableOpacity key={key} style={[s.tab, tab === key && s.tabActive]} onPress={() => setTab(key)}>
            <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
      >
        {tab === 'season' && (
          <>
            {activeSeason && (
              <View style={s.seasonBanner}>
                <Text style={s.seasonLabel}>Enrolling for {activeSeason.name}</Text>
              </View>
            )}
            {sessionList.length === 0 && !isLoading && (
              <Text style={s.empty}>No classes available right now.</Text>
            )}
            {sessionList.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                onEnrol={handleEnrol}
                enrolling={enrolling === session.id}
              />
            ))}
          </>
        )}

        {tab === 'workshops' && (
          <>
            {workshopList.length === 0 && !isLoading && (
              <Text style={s.empty}>No workshops coming up.</Text>
            )}
            {workshopList.map(w => (
              <WorkshopCard
                key={w.id}
                workshop={w}
                onBook={handleBook}
                booking={booking === w.id}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  tabTextActive: { color: '#6366f1', fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  seasonBanner: { backgroundColor: '#e0e7ff', borderRadius: 10, padding: 12, marginBottom: 14 },
  seasonLabel: { color: '#4338ca', fontWeight: '600', fontSize: 14 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardMeta: { fontSize: 13, color: '#6b7280', marginTop: 1 },
  cardDesc: { fontSize: 13, color: '#6b7280', marginBottom: 10, marginTop: 4 },
  price: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 10 },
  levelBadge: { backgroundColor: '#f0fdf4', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  levelText: { fontSize: 11, fontWeight: '600', color: '#166534' },
  enrolBtn: { backgroundColor: '#6366f1', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 4 },
  enrolBtnDisabled: { backgroundColor: '#a5b4fc' },
  enrolBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
})
