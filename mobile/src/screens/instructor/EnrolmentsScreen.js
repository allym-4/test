import { useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, TextInput, ActivityIndicator,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { classes, enrolments } from '../../api'

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function formatOccurrenceDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  // timeStr may be "HH:MM:SS" or "HH:MM"
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')}${ampm}`
}

// ── Enrolment card (Roster tab) ───────────────────────────────────────────────

function EnrolmentCard({ enr }) {
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <Text style={s.studentName}>{enr.student?.display_name ?? enr.student?.email ?? 'Student'}</Text>
        <View style={[s.typeBadge, enr.enrolment_type === 'trial' && s.trialBadge]}>
          <Text style={[s.typeBadgeText, enr.enrolment_type === 'trial' && s.trialBadgeText]}>
            {enr.enrolment_type}
          </Text>
        </View>
      </View>
      <Text style={s.sessionName}>{enr.class_session_detail?.name ?? enr.session?.name ?? 'Class'}</Text>
      {enr.student?.email && <Text style={s.email}>{enr.student.email}</Text>}
      {enr.student?.phone && <Text style={s.email}>{enr.student.phone}</Text>}
    </View>
  )
}

// ── Occurrence card (Schedule tab) ────────────────────────────────────────────

function OccurrenceCard({ occ }) {
  const name = occ.class_session?.name ?? occ.session_name ?? occ.name ?? 'Class'
  const studio = occ.studio?.name ?? occ.studio_name ?? null
  const enrolled = occ.enrolled_count ?? occ.enrolment_count ?? null
  const dateLabel = formatOccurrenceDate(occ.date)
  const startTime = occ.start_time ? formatTime(occ.start_time) : null
  const endTime = occ.end_time ? formatTime(occ.end_time) : null
  const timeLabel = startTime
    ? endTime ? `${startTime} – ${endTime}` : startTime
    : null

  return (
    <View style={s.occCard}>
      <View style={s.occCardTop}>
        <Text style={s.occName} numberOfLines={1}>{name}</Text>
        {enrolled !== null && (
          <View style={s.enrolledChip}>
            <Text style={s.enrolledChipText}>{enrolled} enrolled</Text>
          </View>
        )}
      </View>
      <View style={s.occMeta}>
        {dateLabel ? <Text style={s.occMetaText}>{dateLabel}</Text> : null}
        {timeLabel ? <Text style={s.occMetaDot}> · </Text> : null}
        {timeLabel ? <Text style={s.occMetaText}>{timeLabel}</Text> : null}
        {studio ? <Text style={s.occMetaDot}> · </Text> : null}
        {studio ? <Text style={s.occMetaText}>{studio}</Text> : null}
      </View>
    </View>
  )
}

// ── Schedule tab ──────────────────────────────────────────────────────────────

const SCHEDULE_FILTERS = [
  { id: 'past',     label: 'Past' },
  { id: 'today',    label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
]

function ScheduleTab() {
  const [filter, setFilter] = useState('today')
  const { data: occData, loading, refetch } = useApi(
    () => classes.occurrences({ instructor: 'me' }),
    []
  )
  const today = todayStr()
  const allOccs = occData?.results ?? occData ?? []

  const filtered = allOccs.filter(occ => {
    const d = occ.date
    if (!d) return false
    if (filter === 'past')     return d < today
    if (filter === 'today')    return d === today
    if (filter === 'upcoming') return d > today
    return false
  })

  return (
    <View style={{ flex: 1 }}>
      {/* Sub-toggle */}
      <View style={s.subToggleRow}>
        {SCHEDULE_FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[s.subToggleBtn, filter === f.id && s.subToggleBtnActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[s.subToggleBtnText, filter === f.id && s.subToggleBtnTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#ccff00" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#ccff00" />}
          ListEmptyComponent={
            <Text style={s.empty}>
              {filter === 'today' ? 'No classes today.' : filter === 'past' ? 'No past classes.' : 'No upcoming classes.'}
            </Text>
          }
          renderItem={({ item }) => <OccurrenceCard occ={item} />}
        />
      )}
    </View>
  )
}

// ── Roster tab ────────────────────────────────────────────────────────────────

function RosterTab() {
  const [search, setSearch] = useState('')
  const [selectedSession, setSelectedSession] = useState(null)

  const { data: sessionsData, loading: sessLoading } = useApi(() => classes.list({ instructor: 'me' }), [])
  const sessionList = sessionsData?.results ?? sessionsData ?? []

  const { data: enrData, loading: enrLoading, refetch } = useApi(
    () => selectedSession ? enrolments.list({ session: selectedSession.id, status: 'active' }) : null,
    [selectedSession?.id]
  )

  const allEnrolments = enrData?.results ?? enrData ?? []
  const filtered = search
    ? allEnrolments.filter(e => {
        const name = (e.student?.display_name ?? e.student?.email ?? '').toLowerCase()
        return name.includes(search.toLowerCase())
      })
    : allEnrolments

  if (!selectedSession) {
    return (
      <View style={{ flex: 1 }}>
        {sessLoading && <ActivityIndicator style={{ marginTop: 40 }} color="#ccff00" />}
        {!sessLoading && sessionList.length === 0 && (
          <Text style={s.empty}>No classes assigned to you.</Text>
        )}
        <FlatList
          data={sessionList}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.sessionCard} onPress={() => setSelectedSession(item)}>
              <Text style={s.sessionName}>{item.name}</Text>
              {item.studio?.name && <Text style={s.sessionMeta}>{item.studio.name}</Text>}
              <Text style={s.sessionArrow}>View enrolments →</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity style={s.back} onPress={() => { setSelectedSession(null); setSearch('') }}>
        <Text style={s.backText}>← Back to classes</Text>
      </TouchableOpacity>
      <Text style={s.drillHeading}>{selectedSession.name}</Text>
      <Text style={s.subheading}>{allEnrolments.length} enrolled</Text>

      <TextInput
        style={s.search}
        placeholder="Search students..."
        placeholderTextColor="#555"
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filtered}
        keyExtractor={e => String(e.id)}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={enrLoading} onRefresh={refetch} tintColor="#ccff00" />}
        ListEmptyComponent={
          <Text style={s.empty}>{enrLoading ? '' : 'No enrolments found.'}</Text>
        }
        renderItem={({ item }) => <EnrolmentCard enr={item} />}
      />
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

const MAIN_TABS = [
  { id: 'schedule', label: 'Schedule' },
  { id: 'roster',   label: 'Roster' },
]

export default function EnrolmentsScreen() {
  const [activeTab, setActiveTab] = useState('schedule')

  return (
    <View style={s.root}>
      <Text style={s.heading}>My Classes</Text>

      {/* Main tab strip */}
      <View style={s.tabRow}>
        {MAIN_TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[s.tab, activeTab === tab.id && s.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[s.tabText, activeTab === tab.id && s.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'schedule' ? <ScheduleTab /> : <RosterTab />}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  heading: { fontSize: 20, fontWeight: '700', color: '#fff', padding: 16, paddingBottom: 4 },
  subheading: { fontSize: 13, color: '#888', paddingHorizontal: 16, marginBottom: 8 },
  drillHeading: { fontSize: 18, fontWeight: '700', color: '#fff', paddingHorizontal: 16, paddingBottom: 2 },
  back: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  backText: { color: '#ccff00', fontWeight: '600', fontSize: 15 },
  search: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#fff', backgroundColor: '#111' },
  list: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: '#555', marginTop: 40 },

  // Main tab strip
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#1a1a1a', borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#111' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#ccff00' },

  // Schedule sub-toggle
  subToggleRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 8 },
  subToggleBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8, backgroundColor: '#111', borderWidth: 1, borderColor: '#222' },
  subToggleBtnActive: { backgroundColor: 'rgba(204,255,0,0.12)', borderColor: 'rgba(204,255,0,0.3)' },
  subToggleBtnText: { fontSize: 13, fontWeight: '600', color: '#888' },
  subToggleBtnTextActive: { color: '#ccff00' },

  // Occurrence card
  occCard: { backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#222' },
  occCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  occName: { fontSize: 15, fontWeight: '700', color: '#fff', flex: 1, marginRight: 8 },
  enrolledChip: { backgroundColor: 'rgba(204,255,0,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  enrolledChipText: { fontSize: 11, fontWeight: '600', color: '#ccff00' },
  occMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  occMetaText: { fontSize: 12, color: '#888' },
  occMetaDot: { fontSize: 12, color: '#444' },

  // Session cards (Roster tab)
  sessionCard: { backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  sessionName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  sessionMeta: { fontSize: 13, color: '#888', marginTop: 4 },
  sessionArrow: { fontSize: 13, color: '#ccff00', fontWeight: '600', marginTop: 8 },

  // Enrolment cards
  card: { backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#222' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  studentName: { fontSize: 15, fontWeight: '600', color: '#fff', flex: 1 },
  typeBadge: { backgroundColor: 'rgba(176,160,255,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 11, fontWeight: '600', color: '#b0a0ff', textTransform: 'capitalize' },
  trialBadge: { backgroundColor: 'rgba(245,158,11,0.15)' },
  trialBadgeText: { color: '#f59e0b' },
  email: { fontSize: 12, color: '#555', marginTop: 2 },
})
