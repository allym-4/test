import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { classes, attendance, announcements } from '../../api'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function KpiCard({ label, value }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiVal}>{value ?? '—'}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  )
}

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth()
  const { data: occurrences, loading, refetch } = useApi(
    () => classes.occurrences({ upcoming: true, enrolled: true, limit: 5 }), []
  )
  const { data: credits } = useApi(
    () => attendance.makeupCredits.list({ status: 'available' }), []
  )
  const { data: announceData, refetch: refetchAnnounce } = useApi(
    () => announcements.list({ unacknowledged: true }), []
  )

  const upcomingList = occurrences?.results ?? occurrences ?? []
  const creditCount = credits?.results?.length ?? credits?.length ?? 0
  const unackAnnouncements = announceData?.results ?? announceData ?? []

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
    >
      <Text style={s.greeting}>{greeting()}, {user?.first_name || 'there'}</Text>

      {unackAnnouncements.length > 0 && (
        <View style={s.announceBanner}>
          <Text style={s.announceTitle}>📢 {unackAnnouncements[0].title}</Text>
          <Text style={s.announceBody}>{unackAnnouncements[0].body}</Text>
        </View>
      )}

      <View style={s.kpiRow}>
        <KpiCard label="Classes this week" value={upcomingList.filter(o => {
          const d = new Date(o.date)
          const now = new Date()
          const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7)
          return d >= now && d <= weekEnd
        }).length} />
        <KpiCard label="Catch-up credits" value={creditCount} />
      </View>

      <Text style={s.sectionTitle}>Coming up</Text>
      {upcomingList.length === 0 && !loading && (
        <Text style={s.empty}>No upcoming classes. Book a class to get started.</Text>
      )}
      {upcomingList.map(occ => (
        <View key={occ.id} style={s.classCard}>
          <View style={s.classInfo}>
            <Text style={s.className}>{occ.session?.name ?? 'Class'}</Text>
            <Text style={s.classMeta}>
              {new Date(occ.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
              {occ.start_time ? `  ·  ${occ.start_time.slice(0, 5)}` : ''}
            </Text>
            {occ.session?.studio?.name && (
              <Text style={s.classMeta}>{occ.session.studio.name}</Text>
            )}
          </View>
          <TouchableOpacity
            style={s.awayBtn}
            onPress={() => navigation.navigate('MyClasses')}
          >
            <Text style={s.awayBtnText}>Mark away</Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={s.quickLinks}>
        <TouchableOpacity style={s.quickLink} onPress={() => navigation.navigate('Book')}>
          <Text style={s.quickLinkText}>📅  Book a class</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickLink} onPress={() => navigation.navigate('Support')}>
          <Text style={s.quickLinkText}>💬  Get support</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 16 },
  announceBanner: { backgroundColor: '#fef3c7', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  announceTitle: { fontWeight: '700', color: '#92400e', marginBottom: 4 },
  announceBody: { color: '#78350f', fontSize: 14 },
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  kpi: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  kpiVal: { fontSize: 28, fontWeight: '800', color: '#6366f1' },
  kpiLabel: { fontSize: 12, color: '#6b7280', marginTop: 4, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 12 },
  empty: { color: '#9ca3af', textAlign: 'center', padding: 20 },
  classCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  classInfo: { flex: 1 },
  className: { fontWeight: '600', color: '#111827', fontSize: 15 },
  classMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  awayBtn: { backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  awayBtnText: { fontSize: 12, fontWeight: '600', color: '#92400e' },
  quickLinks: { marginTop: 20, gap: 10 },
  quickLink: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  quickLinkText: { fontSize: 15, fontWeight: '600', color: '#374151' },
})
