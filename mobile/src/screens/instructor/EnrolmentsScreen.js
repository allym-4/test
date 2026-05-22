import { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../contexts/AuthContext'
import { classes } from '../../api'

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function sevenDaysFromNow() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

function formatOccurrenceDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')}${ampm}`
}

function dedupe(arr) {
  const seen = new Set()
  return arr.filter(x => {
    if (seen.has(x.id)) return false
    seen.add(x.id)
    return true
  })
}

// ── My Classes occurrence card ─────────────────────────────────────────────────

function MyOccurrenceCard({ occ, isCover, onPress }) {
  const name = occ.class_session?.name ?? occ.session_name ?? occ.session_detail?.name ?? occ.name ?? 'Class'
  const studio = occ.studio?.name ?? occ.studio_name ?? occ.session_detail?.studio_detail?.name ?? null
  const enrolled = occ.enrolled_count ?? occ.enrolment_count ?? null
  const dateLabel = formatOccurrenceDate(occ.date)
  const startTime = occ.start_time ? formatTime(occ.start_time) : null
  const endTime = occ.end_time ? formatTime(occ.end_time) : null
  const timeLabel = startTime
    ? endTime ? `${startTime} – ${endTime}` : startTime
    : null

  return (
    <TouchableOpacity style={s.occCard} onPress={onPress} activeOpacity={0.75}>
      <View style={s.occCardTop}>
        <Text style={s.occName} numberOfLines={1}>{name}</Text>
        <View style={s.occBadges}>
          {isCover && (
            <View style={s.coverBadge}><Text style={s.coverBadgeText}>COVER</Text></View>
          )}
          {enrolled !== null && (
            <View style={s.enrolledChip}>
              <Text style={s.enrolledChipText}>{enrolled} enrolled</Text>
            </View>
          )}
        </View>
      </View>
      <View style={s.occMeta}>
        {dateLabel ? <Text style={s.occMetaText}>{dateLabel}</Text> : null}
        {timeLabel ? <Text style={s.occMetaDot}> · </Text> : null}
        {timeLabel ? <Text style={s.occMetaText}>{timeLabel}</Text> : null}
        {studio ? <Text style={s.occMetaDot}> · </Text> : null}
        {studio ? <Text style={s.occMetaText}>{studio}</Text> : null}
      </View>
      <Text style={s.tapHint}>View register →</Text>
    </TouchableOpacity>
  )
}

// ── All Classes occurrence card (read-only) ───────────────────────────────────

function AllOccurrenceCard({ occ, isOwn }) {
  const name = occ.class_session?.name ?? occ.session_name ?? occ.session_detail?.name ?? occ.name ?? 'Class'
  const studio = occ.studio?.name ?? occ.studio_name ?? occ.session_detail?.studio_detail?.name ?? null
  const enrolled = occ.enrolled_count ?? occ.enrolment_count ?? null
  const instructorName = occ.instructor_detail?.display_name
    ?? occ.instructor_name
    ?? occ.session_detail?.instructor_detail?.display_name
    ?? null
  const startTime = occ.start_time ? formatTime(occ.start_time) : null
  const endTime = occ.end_time ? formatTime(occ.end_time) : null
  const timeLabel = startTime
    ? endTime ? `${startTime} – ${endTime}` : startTime
    : null

  return (
    <View style={[s.allCard, isOwn && s.allCardOwn]}>
      {isOwn && <View style={s.ownAccent} />}
      <View style={s.allCardBody}>
        <View style={s.allCardTop}>
          <Text style={s.occName} numberOfLines={1}>{name}</Text>
          <View style={s.occBadges}>
            {isOwn && <View style={s.ownBadge}><Text style={s.ownBadgeText}>YOURS</Text></View>}
            {enrolled !== null && (
              <View style={s.enrolledChip}>
                <Text style={s.enrolledChipText}>{enrolled} enrolled</Text>
              </View>
            )}
          </View>
        </View>
        <View style={s.occMeta}>
          {timeLabel ? <Text style={s.occMetaText}>{timeLabel}</Text> : null}
          {studio ? <Text style={s.occMetaDot}> · </Text> : null}
          {studio ? <Text style={s.occMetaText}>{studio}</Text> : null}
          {instructorName ? <Text style={s.occMetaDot}> · </Text> : null}
          {instructorName ? <Text style={s.occMetaText}>{instructorName}</Text> : null}
        </View>
      </View>
    </View>
  )
}

// ── My Classes tab ─────────────────────────────────────────────────────────────

const SCHEDULE_FILTERS = [
  { id: 'past',     label: 'Past' },
  { id: 'today',    label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
]

function MyClassesTab({ navigation, currentUserId }) {
  const [filter, setFilter] = useState('today')

  const { data: myOccData, loading: myLoading, refetch: refetchMy } = useApi(
    () => classes.occurrences({ instructor: 'me' }),
    []
  )

  const { data: subOccData, loading: subLoading, refetch: refetchSub } = useApi(
    () => currentUserId
      ? classes.occurrences({ substitute_instructor: currentUserId })
      : null,
    [currentUserId]
  )

  const loading = myLoading || subLoading

  function refetch() {
    refetchMy()
    refetchSub()
  }

  const myOccs = myOccData?.results ?? myOccData ?? []
  const subOccs = subOccData?.results ?? subOccData ?? []
  const subIds = new Set(subOccs.map(o => o.id))

  const allOccs = useMemo(() => dedupe([...myOccs, ...subOccs]), [myOccs, subOccs])

  const today = todayStr()
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
          renderItem={({ item }) => (
            <MyOccurrenceCard
              occ={item}
              isCover={subIds.has(item.id)}
              onPress={() => navigation.navigate('ClassDetail', { occurrence: item })}
            />
          )}
        />
      )}
    </View>
  )
}

// ── All Classes tab ────────────────────────────────────────────────────────────

function AllClassesTab({ currentUserId }) {
  const [showUpcoming, setShowUpcoming] = useState(false)
  const today = todayStr()
  const upcoming7 = sevenDaysFromNow()

  const { data: todayData, loading: todayLoading, refetch: refetchToday } = useApi(
    () => classes.occurrences({ date: today }),
    [today]
  )

  const { data: upcomingData, loading: upcomingLoading, refetch: refetchUpcoming } = useApi(
    () => showUpcoming ? classes.occurrences({ date_after: today, date_before: upcoming7 }) : null,
    [showUpcoming, today]
  )

  const loading = showUpcoming ? upcomingLoading : todayLoading
  const rawOccs = showUpcoming
    ? (upcomingData?.results ?? upcomingData ?? [])
    : (todayData?.results ?? todayData ?? [])

  // Sort by date then time
  const occs = [...rawOccs].sort((a, b) => {
    if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '')
    return (a.start_time || '').localeCompare(b.start_time || '')
  })

  function refetch() {
    if (showUpcoming) refetchUpcoming(); else refetchToday()
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Toggle: Today / Upcoming */}
      <View style={s.subToggleRow}>
        <TouchableOpacity
          style={[s.subToggleBtn, !showUpcoming && s.subToggleBtnActive]}
          onPress={() => setShowUpcoming(false)}
        >
          <Text style={[s.subToggleBtnText, !showUpcoming && s.subToggleBtnTextActive]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.subToggleBtn, showUpcoming && s.subToggleBtnActive]}
          onPress={() => setShowUpcoming(true)}
        >
          <Text style={[s.subToggleBtnText, showUpcoming && s.subToggleBtnTextActive]}>Next 7 Days</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#ccff00" />
      ) : (
        <FlatList
          data={occs}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#ccff00" />}
          ListEmptyComponent={
            <Text style={s.empty}>
              {showUpcoming ? 'No classes in the next 7 days.' : 'No classes today.'}
            </Text>
          }
          renderItem={({ item }) => {
            const isOwn = (
              item.instructor === currentUserId ||
              item.instructor_detail?.id === currentUserId ||
              item.substitute_instructor === currentUserId
            )
            return <AllOccurrenceCard occ={item} isOwn={isOwn} />
          }}
        />
      )}
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

const MAIN_TABS = [
  { id: 'mine', label: 'My Classes' },
  { id: 'all',  label: 'All Classes' },
]

export default function EnrolmentsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('mine')
  const { user } = useAuth()
  const currentUserId = user?.id ?? null

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

      {activeTab === 'mine'
        ? <MyClassesTab navigation={navigation} currentUserId={currentUserId} />
        : <AllClassesTab currentUserId={currentUserId} />
      }
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  heading: { fontSize: 20, fontWeight: '700', color: '#fff', padding: 16, paddingBottom: 4 },
  list: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: '#555', marginTop: 40 },

  // Main tab strip
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#1a1a1a', borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#111' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#ccff00' },

  // Sub-toggle
  subToggleRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 8 },
  subToggleBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8, backgroundColor: '#111', borderWidth: 1, borderColor: '#222' },
  subToggleBtnActive: { backgroundColor: 'rgba(204,255,0,0.12)', borderColor: 'rgba(204,255,0,0.3)' },
  subToggleBtnText: { fontSize: 13, fontWeight: '600', color: '#888' },
  subToggleBtnTextActive: { color: '#ccff00' },

  // My Classes occurrence card
  occCard: { backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#222' },
  occCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  occName: { fontSize: 15, fontWeight: '700', color: '#fff', flex: 1, marginRight: 8 },
  occBadges: { flexDirection: 'row', gap: 6, alignItems: 'center', flexShrink: 0 },
  coverBadge: { backgroundColor: 'rgba(255,170,0,0.15)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  coverBadgeText: { fontSize: 10, fontWeight: '700', color: '#ffaa00' },
  enrolledChip: { backgroundColor: 'rgba(204,255,0,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  enrolledChipText: { fontSize: 11, fontWeight: '600', color: '#ccff00' },
  occMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  occMetaText: { fontSize: 12, color: '#888' },
  occMetaDot: { fontSize: 12, color: '#444' },
  tapHint: { fontSize: 12, color: '#ccff00', fontWeight: '600', marginTop: 8 },

  // All Classes card
  allCard: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#222', overflow: 'hidden' },
  allCardOwn: { borderColor: 'rgba(204,255,0,0.25)' },
  ownAccent: { width: 3, backgroundColor: '#ccff00' },
  allCardBody: { flex: 1, padding: 14 },
  allCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  ownBadge: { backgroundColor: 'rgba(204,255,0,0.12)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  ownBadgeText: { fontSize: 10, fontWeight: '700', color: '#ccff00' },
})
