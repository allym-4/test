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
      <Text style={s.sessionName}>{enr.session?.name ?? 'Class'}</Text>
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
        {sessLoading && <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" />}
        {!sessLoading && sessionList.length === 0 && (
          <Text style={s.empty}>No classes assigned to you.</Text>
        )}
        <FlatList
          data={sessionList}
          keyExtractor={s => String(s.id)}
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
        placeholderTextColor="#9ca3af"
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filtered}
        keyExtractor={e => String(e.id)}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={enrLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          <Text style={s.empty}>{enrLoading ? '' : 'No enrolments found.'}</Text>
        }
        renderItem={({ item }) => <EnrolmentCard enr={item} />}
      />
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827', padding: 16, paddingBottom: 4 },
  subheading: { fontSize: 13, color: '#6b7280', paddingHorizontal: 16, marginBottom: 8 },
  back: { padding: 16, paddingBottom: 4 },
  backText: { color: '#6366f1', fontWeight: '600', fontSize: 15 },
  search: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827', backgroundColor: '#fff' },
  list: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  sessionCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sessionName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sessionMeta: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  sessionArrow: { fontSize: 13, color: '#6366f1', fontWeight: '600', marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  studentName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  typeBadge: { backgroundColor: '#e0e7ff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 11, fontWeight: '600', color: '#4338ca', textTransform: 'capitalize' },
  trialBadge: { backgroundColor: '#fef3c7' },
  trialBadgeText: { color: '#92400e' },
  email: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
})
