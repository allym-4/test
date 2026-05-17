import { useState } from 'react'
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { enrolments, attendance, roster } from '../../api'

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
      {loading && <ActivityIndicator size="small" color="#6366f1" />}
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
  present: '#d1fae5',
  absent: '#fef3c7',
  no_show: '#fee2e2',
  late: '#e0e7ff',
  cancelled: '#f3f4f6',
}
const STATUS_TEXT = {
  present: '#065f46',
  absent: '#92400e',
  no_show: '#991b1b',
  late: '#3730a3',
  cancelled: '#6b7280',
}

function StatusBadge({ status }) {
  return (
    <View style={[s.badge, { backgroundColor: STATUS_COLORS[status] ?? '#f3f4f6' }]}>
      <Text style={[s.badgeText, { color: STATUS_TEXT[status] ?? '#374151' }]}>
        {status?.replace('_', ' ')}
      </Text>
    </View>
  )
}

export default function MyClassesScreen() {
  const [tab, setTab] = useState('active')
  const [markingAway, setMarkingAway] = useState(null)

  const { data: enrolData, loading, refetch } = useApi(
    () => enrolments.list({ status: 'active' }), []
  )
  const { data: historyData, loading: histLoading, refetch: refetchHistory } = useApi(
    () => attendance.list({ limit: 30 }), []
  )

  const activeEnrolments = enrolData?.results ?? enrolData ?? []
  const history = historyData?.results ?? historyData ?? []

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
              await attendance.markAway(occurrenceId)
              Alert.alert('Done', 'You\'ve been marked away.')
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
          {activeEnrolments.length === 0 && !loading && (
            <Text style={s.empty}>No active enrolments.</Text>
          )}
          {activeEnrolments.map(enr => (
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
                  <TouchableOpacity
                    style={s.awayBtn}
                    disabled={markingAway === enr.next_occurrence.id}
                    onPress={() => handleMarkAway(enr.next_occurrence.id, enr.session?.name)}
                  >
                    {markingAway === enr.next_occurrence.id
                      ? <ActivityIndicator size="small" color="#92400e" />
                      : <Text style={s.awayBtnText}>Mark away</Text>
                    }
                  </TouchableOpacity>
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
  root: { flex: 1, backgroundColor: '#f9fafb' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  tabTextActive: { color: '#6366f1', fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  typeBadge: { backgroundColor: '#e0e7ff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 11, fontWeight: '600', color: '#4338ca', textTransform: 'capitalize' },
  cardMeta: { fontSize: 13, color: '#6b7280', marginBottom: 10 },
  nextClass: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 10 },
  nextLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  nextDate: { fontSize: 14, color: '#111827', fontWeight: '500', marginBottom: 8 },
  awayBtn: { alignSelf: 'flex-start', backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  awayBtnText: { fontSize: 13, fontWeight: '600', color: '#92400e' },
  cancelBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  cancelBtnText: { fontSize: 13, color: '#ef4444' },
  histRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8 },
  histInfo: { flex: 1 },
  histClass: { fontWeight: '600', color: '#111827', fontSize: 14 },
  histDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  whoBtn: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 4 },
  whoBtnText: { fontSize: 13, color: '#6366f1', fontWeight: '600' },
  whoPanel: { backgroundColor: '#f5f3ff', borderRadius: 8, padding: 10, marginBottom: 8 },
  whoLabel: { fontSize: 11, fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  whoEmpty: { fontSize: 13, color: '#9ca3af' },
  whoNames: { fontSize: 14, color: '#374151', lineHeight: 20 },
})
