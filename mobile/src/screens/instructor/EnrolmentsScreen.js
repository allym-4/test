import { useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, TextInput, ActivityIndicator,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { classes, enrolments } from '../../api'

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

export default function EnrolmentsScreen() {
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
      <View style={s.root}>
        <Text style={s.heading}>My Classes</Text>
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
    <View style={s.root}>
      <TouchableOpacity style={s.back} onPress={() => { setSelectedSession(null); setSearch('') }}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={s.heading}>{selectedSession.name}</Text>
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  heading: { fontSize: 20, fontWeight: '700', color: '#fff', padding: 16, paddingBottom: 4 },
  subheading: { fontSize: 13, color: '#888', paddingHorizontal: 16, marginBottom: 8 },
  back: { padding: 16, paddingBottom: 4 },
  backText: { color: '#ccff00', fontWeight: '600', fontSize: 15 },
  search: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#fff', backgroundColor: '#111' },
  list: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: '#555', marginTop: 40 },
  sessionCard: { backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  sessionName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  sessionMeta: { fontSize: 13, color: '#888', marginTop: 4 },
  sessionArrow: { fontSize: 13, color: '#ccff00', fontWeight: '600', marginTop: 8 },
  card: { backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#222' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  studentName: { fontSize: 15, fontWeight: '600', color: '#fff', flex: 1 },
  typeBadge: { backgroundColor: 'rgba(176,160,255,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 11, fontWeight: '600', color: '#b0a0ff', textTransform: 'capitalize' },
  trialBadge: { backgroundColor: 'rgba(245,158,11,0.15)' },
  trialBadgeText: { color: '#f59e0b' },
  email: { fontSize: 12, color: '#555', marginTop: 2 },
})
