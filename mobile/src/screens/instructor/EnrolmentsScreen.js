import { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../contexts/AuthContext'
import { classes, seasons as seasonsApi } from '../../api'

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

function formatFullDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
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

function getSeasonWeek(dateStr, seasons) {
  if (!dateStr || !seasons?.length) return null
  const date = new Date(dateStr + 'T00:00')
  // Sort seasons newest first so most recent match wins
  const sorted = [...seasons].sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''))
  for (const season of sorted) {
    if (!season.start_date) continue
    const start = new Date(season.start_date + 'T00:00')
    const end = season.end_date ? new Date(season.end_date + 'T00:00') : null
    if (date >= start && (!end || date <= end)) {
      const weekNum = Math.floor((date - start) / (7 * 24 * 60 * 60 * 1000)) + 1
      return { seasonName: season.name ?? 'Season', weekNum }
    }
  }
  return null
}

function weekGroupKey(dateStr, seasons) {
  const sw = getSeasonWeek(dateStr, seasons)
  if (!sw) return `date:${dateStr}`
  return `${sw.seasonName}||${sw.weekNum}`
}

function weekGroupLabel(dateStr, seasons) {
  const sw = getSeasonWeek(dateStr, seasons)
  if (!sw) return formatOccurrenceDate(dateStr)
  return `${sw.seasonName} — Week ${sw.weekNum}`
}

function dayGroupLabel(dateStr, seasons) {
  const sw = getSeasonWeek(dateStr, seasons)
  const dayStr = formatFullDate(dateStr)
  if (!sw) return dayStr
  return `${dayStr} — Week ${sw.weekNum}, ${sw.seasonName}`
}

// Build a mixed header+item array for FlatList
function groupOccurrences(occs, keyFn, labelFn) {
  const groups = []
  const seen = new Map()
  for (const occ of occs) {
    const key = keyFn(occ.date)
    if (!seen.has(key)) {
      seen.set(key, true)
      groups.push({ _type: 'header', key, label: labelFn(occ.date) })
    }
    groups.push({ _type: 'item', occ })
  }
  return groups
}


// ── My Classes occurrence card ─────────────────────────────────────────────────

function MyOccurrenceCard({ occ, isCover, onPress, onCoverRequested }) {
  const name = occ.class_session?.name ?? occ.session_name ?? occ.session_detail?.name ?? occ.name ?? 'Class'
  const studio = occ.studio?.name ?? occ.studio_name ?? occ.session_detail?.studio_detail?.name ?? null
  const enrolled = occ.enrolled_count ?? occ.enrolment_count ?? null
  const dateLabel = formatOccurrenceDate(occ.date)
  const startTime = occ.start_time ? formatTime(occ.start_time) : null
  const endTime = occ.end_time ? formatTime(occ.end_time) : null
  const timeLabel = startTime ? (endTime ? `${startTime} – ${endTime}` : startTime) : null
  const [requesting, setRequesting] = useState(false)
  const [coverRequested, setCoverRequested] = useState(occ.cover_needed ?? false)

  async function handleRequestCover() {
    Alert.alert(
      'Request Cover?',
      `This will notify admin that you need someone to cover ${name} on ${dateLabel}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Cover',
          onPress: async () => {
            setRequesting(true)
            try {
              await classes.requestCover(occ.id)
              setCoverRequested(true)
              Alert.alert('Sent', 'Admin has been notified and will arrange cover.')
              onCoverRequested?.()
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail || 'Could not send cover request.')
            } finally {
              setRequesting(false)
            }
          },
        },
      ]
    )
  }

  return (
    <TouchableOpacity style={[s.occCard, coverRequested && s.occCardCoverNeeded]} onPress={onPress} activeOpacity={0.75}>
      <View style={s.occCardTop}>
        <Text style={s.occName} numberOfLines={1}>{name}</Text>
        <View style={s.occBadges}>
          {isCover && (
            <View style={s.coverBadge}><Text style={s.coverBadgeText}>COVER</Text></View>
          )}
          {coverRequested && (
            <View style={s.coverNeededBadge}><Text style={s.coverNeededBadgeText}>COVER NEEDED</Text></View>
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
      <View style={s.occCardFooter}>
        <Text style={s.tapHint}>View register →</Text>
        {!coverRequested && (
          <TouchableOpacity
            style={[s.coverBtn, requesting && { opacity: 0.5 }]}
            onPress={handleRequestCover}
            disabled={requesting}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.coverBtnText}>{requesting ? 'Sending…' : 'Request Cover'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ── All Classes occurrence card ───────────────────────────────────────────────

function AllOccurrenceCard({ occ, isOwn, onPress }) {
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
    <TouchableOpacity style={[s.allCard, isOwn && s.allCardOwn]} onPress={onPress} activeOpacity={0.75}>
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
    </TouchableOpacity>
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
    () => currentUserId ? classes.occurrences({ substitute_instructor: currentUserId }) : null,
    [currentUserId]
  )
  const { data: seasonsData } = useApi(() => seasonsApi.list(), [])
  const seasonsList = seasonsData?.results ?? seasonsData ?? []

  const loading = myLoading || subLoading

  function refetch() { refetchMy(); refetchSub() }

  const myOccs = myOccData?.results ?? myOccData ?? []
  const subOccs = subOccData?.results ?? subOccData ?? []
  const subIds = new Set(subOccs.map(o => o.id))
  const allOccs = useMemo(() => dedupe([...myOccs, ...subOccs]), [myOccs, subOccs])

  const today = todayStr()
  const filtered = allOccs
    .filter(occ => {
      const d = occ.date
      if (!d) return false
      if (filter === 'past')     return d < today
      if (filter === 'today')    return d === today
      if (filter === 'upcoming') return d > today
      return false
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.start_time || '').localeCompare(b.start_time || ''))

  // For upcoming, group by season+week; otherwise flat
  const listData = useMemo(() => {
    if (filter !== 'upcoming' || !filtered.length) return filtered
    return groupOccurrences(
      filtered,
      date => weekGroupKey(date, seasonsList),
      date => weekGroupLabel(date, seasonsList),
    )
  }, [filtered, filter, seasonsList])

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
          data={listData}
          keyExtractor={(item, i) => item._type === 'header' ? `hdr-${item.key}` : String(item.id ?? item.occ?.id ?? i)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#ccff00" />}
          ListEmptyComponent={
            <Text style={s.empty}>
              {filter === 'today' ? 'No classes today.' : filter === 'past' ? 'No past classes.' : 'No upcoming classes.'}
            </Text>
          }
          renderItem={({ item }) => {
            if (item._type === 'header') {
              return <View style={s.groupHeader}><Text style={s.groupHeaderText}>{item.label}</Text></View>
            }
            const occ = item.occ ?? item
            return (
              <MyOccurrenceCard
                occ={occ}
                isCover={subIds.has(occ.id)}
                onPress={() => navigation.navigate('ClassDetail', { occurrence: occ })}
              />
            )
          }}
        />
      )}
    </View>
  )
}

// ── All Classes tab ────────────────────────────────────────────────────────────

function AllClassesTab({ currentUserId, navigation }) {
  const [showUpcoming, setShowUpcoming] = useState(false)
  const today = todayStr()
  const upcoming7 = sevenDaysFromNow()

  const { data: todayData, loading: todayLoading, refetch: refetchToday } = useApi(
    () => classes.occurrences({ date: today }), [today]
  )
  const { data: upcomingData, loading: upcomingLoading, refetch: refetchUpcoming } = useApi(
    () => showUpcoming ? classes.occurrences({ date_after: today, date_before: upcoming7 }) : null,
    [showUpcoming, today]
  )
  const { data: seasonsData } = useApi(() => seasonsApi.list(), [])
  const seasonsList = seasonsData?.results ?? seasonsData ?? []

  const loading = showUpcoming ? upcomingLoading : todayLoading
  const rawOccs = showUpcoming
    ? (upcomingData?.results ?? upcomingData ?? [])
    : (todayData?.results ?? todayData ?? [])

  const occs = [...rawOccs].sort((a, b) =>
    (a.date || '').localeCompare(b.date || '') || (a.start_time || '').localeCompare(b.start_time || '')
  )

  // For next 7 days, group by date with week/season header
  const listData = useMemo(() => {
    if (!showUpcoming || !occs.length) return occs
    return groupOccurrences(
      occs,
      date => date,
      date => dayGroupLabel(date, seasonsList),
    )
  }, [occs, showUpcoming, seasonsList])

  function refetch() { if (showUpcoming) refetchUpcoming(); else refetchToday() }

  return (
    <View style={{ flex: 1 }}>
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
          data={listData}
          keyExtractor={(item, i) => item._type === 'header' ? `hdr-${item.key}` : String(item.id ?? item.occ?.id ?? i)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#ccff00" />}
          ListEmptyComponent={
            <Text style={s.empty}>
              {showUpcoming ? 'No classes in the next 7 days.' : 'No classes today.'}
            </Text>
          }
          renderItem={({ item }) => {
            if (item._type === 'header') {
              return <View style={s.groupHeader}><Text style={s.groupHeaderText}>{item.label}</Text></View>
            }
            const occ = item.occ ?? item
            const isOwn = (
              occ.instructor === currentUserId ||
              occ.instructor_detail?.id === currentUserId ||
              occ.substitute_instructor === currentUserId
            )
            return (
              <AllOccurrenceCard
                occ={occ}
                isOwn={isOwn}
                onPress={() => navigation?.navigate('ClassDetail', { occurrence: occ })}
              />
            )
          }}
        />
      )}
    </View>
  )
}

// ── Season Enrolments tab ──────────────────────────────────────────────────────

function SeasonEnrolmentsTab({ currentUserId }) {
  const { data: seasonsData, loading: loadingSeasons } = useApi(() => seasonsApi.list(), [])
  const allSeasons = seasonsData?.results ?? (Array.isArray(seasonsData) ? seasonsData : [])
  const relevantSeasons = allSeasons.filter(s => s.status === 'active' || s.status === 'upcoming')
  const [selectedSeasonId, setSelectedSeasonId] = useState(null)
  const [showAll, setShowAll] = useState(false)

  const activeSeason = relevantSeasons.find(s => s.id === selectedSeasonId)
    ?? relevantSeasons.find(s => s.status === 'active')
    ?? relevantSeasons[0]
    ?? null

  const { data: sessionsData, loading: loadingSessions, refetch } = useApi(
    () => activeSeason ? classes.list({ season: activeSeason.id, page_size: 200 }) : null,
    [activeSeason?.id]
  )
  const allSessions = sessionsData?.results ?? (Array.isArray(sessionsData) ? sessionsData : [])
  const mySessions = allSessions.filter(s =>
    s.instructor === currentUserId || s.instructor_detail?.id === currentUserId
  )
  const sessions = showAll ? allSessions : mySessions

  const sorted = [...sessions].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
    return (a.start_time || '').localeCompare(b.start_time || '')
  })

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const totalEnrolled = sessions.reduce((sum, s) => sum + (s.enrolled_count ?? 0), 0)
  const totalCapacity = sessions.reduce((sum, s) => sum + (s.capacity ?? 0), 0)
  const loading = loadingSeasons || loadingSessions

  return (
    <View style={{ flex: 1 }}>
      {/* Season picker */}
      {relevantSeasons.length > 1 && (
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, gap: 8 }}>
          {relevantSeasons.map(season => {
            const isActive = activeSeason?.id === season.id
            return (
              <TouchableOpacity
                key={season.id}
                onPress={() => setSelectedSeasonId(season.id)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
                  backgroundColor: isActive ? 'rgba(204,255,0,0.1)' : 'transparent',
                  borderColor: isActive ? 'rgba(204,255,0,0.35)' : '#333',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? '#ccff00' : '#888' }}>
                  {season.name}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {/* My/All toggle + summary */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 }}>
        <Text style={{ fontSize: 12, color: '#666' }}>
          {activeSeason ? `${totalEnrolled}/${totalCapacity} enrolled` : 'No active season'}
        </Text>
        <View style={{ flexDirection: 'row', backgroundColor: '#111', borderRadius: 8, borderWidth: 1, borderColor: '#222', overflow: 'hidden' }}>
          {[['mine', 'My Classes'], ['all', 'All']].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setShowAll(key === 'all')}
              style={{
                paddingHorizontal: 12, paddingVertical: 5,
                backgroundColor: showAll === (key === 'all') ? '#222' : 'transparent',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: showAll === (key === 'all') ? '#fff' : '#666' }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#ccff00" />
      ) : !activeSeason ? (
        <Text style={[s.empty, { paddingHorizontal: 16 }]}>No active or upcoming seasons.</Text>
      ) : sorted.length === 0 ? (
        <Text style={[s.empty, { paddingHorizontal: 16 }]}>
          {showAll ? 'No classes in this season.' : 'You have no classes in this season.'}
        </Text>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#ccff00" />}
          renderItem={({ item: sess }) => {
            const isOwn = sess.instructor === currentUserId || sess.instructor_detail?.id === currentUserId
            const isFull = sess.enrolled_count >= sess.capacity
            const pct = sess.capacity > 0 ? Math.min(1, (sess.enrolled_count ?? 0) / sess.capacity) : 0
            const barColor = isFull ? '#ff4444' : pct > 0.75 ? '#ffaa00' : '#ccff00'
            const hasWaitlist = (sess.waitlist_count ?? 0) > 0
            return (
              <View style={[
                s.seasonCard,
                isOwn && s.seasonCardOwn,
                isFull && s.seasonCardFull,
              ]}>
                {isOwn && <View style={s.seasonOwnAccent} />}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <Text style={s.seasonClassName} numberOfLines={1}>{sess.name}</Text>
                      {isOwn && (
                        <View style={s.ownBadge}><Text style={s.ownBadgeText}>MINE</Text></View>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[s.seasonEnrolCount, isFull && { color: '#ff4444' }]}>
                        {sess.enrolled_count ?? 0}<Text style={s.seasonCapacity}>/{sess.capacity}</Text>
                      </Text>
                      {hasWaitlist && (
                        <Text style={s.waitlistText}>+{sess.waitlist_count} waitlist</Text>
                      )}
                    </View>
                  </View>
                  <Text style={s.seasonMeta}>
                    {DAYS[sess.day_of_week]} · {sess.start_time?.slice(0, 5)}
                    {sess.instructor_detail?.display_name ? ` · ${sess.instructor_detail.display_name}` : ''}
                    {sess.studio_detail?.name ? ` · ${sess.studio_detail.name}` : ''}
                  </Text>
                  {/* Progress bar */}
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: barColor }]} />
                  </View>
                </View>
              </View>
            )
          }}
        />
      )}
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

const MAIN_TABS = [
  { id: 'mine',   label: 'My Classes' },
  { id: 'all',    label: 'All Classes' },
  { id: 'season', label: 'Season' },
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
        : activeTab === 'all'
          ? <AllClassesTab navigation={navigation} currentUserId={currentUserId} />
          : <SeasonEnrolmentsTab currentUserId={currentUserId} />
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
  occCardCoverNeeded: { borderColor: 'rgba(255,80,80,0.35)', backgroundColor: 'rgba(255,80,80,0.04)' },
  occCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  occName: { fontSize: 15, fontWeight: '700', color: '#fff', flex: 1, marginRight: 8 },
  occBadges: { flexDirection: 'row', gap: 6, alignItems: 'center', flexShrink: 0 },
  coverBadge: { backgroundColor: 'rgba(255,170,0,0.15)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  coverBadgeText: { fontSize: 10, fontWeight: '700', color: '#ffaa00' },
  coverNeededBadge: { backgroundColor: 'rgba(255,80,80,0.15)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  coverNeededBadgeText: { fontSize: 10, fontWeight: '700', color: '#ff5050' },
  enrolledChip: { backgroundColor: 'rgba(204,255,0,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  enrolledChipText: { fontSize: 11, fontWeight: '600', color: '#ccff00' },
  occMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  occMetaText: { fontSize: 12, color: '#888' },
  occMetaDot: { fontSize: 12, color: '#444' },
  occCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  tapHint: { fontSize: 12, color: '#ccff00', fontWeight: '600' },
  coverBtn: { backgroundColor: 'rgba(255,80,80,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,80,80,0.3)' },
  coverBtnText: { fontSize: 11, fontWeight: '700', color: '#ff5050' },

  // All Classes card
  allCard: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#222', overflow: 'hidden' },
  allCardOwn: { borderColor: 'rgba(204,255,0,0.25)' },
  ownAccent: { width: 3, backgroundColor: '#ccff00' },
  allCardBody: { flex: 1, padding: 14 },
  allCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  ownBadge: { backgroundColor: 'rgba(204,255,0,0.12)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  ownBadgeText: { fontSize: 10, fontWeight: '700', color: '#ccff00' },

  // Group headers
  groupHeader: { paddingTop: 20, paddingBottom: 8, paddingHorizontal: 2 },
  groupHeaderText: { fontSize: 12, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.7 },

  // Season enrolments cards
  seasonCard: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#222', padding: 14, overflow: 'hidden' },
  seasonCardOwn: { borderColor: 'rgba(204,255,0,0.2)' },
  seasonCardFull: { borderColor: 'rgba(255,68,68,0.3)' },
  seasonOwnAccent: { width: 3, backgroundColor: '#ccff00', marginRight: 12, borderRadius: 2, alignSelf: 'stretch' },
  seasonClassName: { fontSize: 15, fontWeight: '700', color: '#fff', flex: 1 },
  seasonEnrolCount: { fontSize: 18, fontWeight: '700', color: '#fff' },
  seasonCapacity: { fontSize: 13, fontWeight: '400', color: '#666' },
  seasonMeta: { fontSize: 12, color: '#666', marginBottom: 8 },
  waitlistText: { fontSize: 11, color: '#ffaa00', marginTop: 2 },
  barTrack: { height: 3, backgroundColor: '#1e1e1e', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 3, borderRadius: 2 },
})
