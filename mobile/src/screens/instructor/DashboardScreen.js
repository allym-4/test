import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { classes, homework, helpdesk } from '../../api'
import client from '../../api/client'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${ampm}`
}

function dateLabel() {
  return new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
}

function ActionItemCard({ item, onDone }) {
  const [marking, setMarking] = useState(false)

  async function handleDone() {
    setMarking(true)
    try {
      await client.patch(`/api/users/action-items/${item.id}/`, { is_done: true })
      onDone(item.id)
    } catch {
      // silently ignore
    } finally {
      setMarking(false)
    }
  }

  return (
    <View style={[s.actionCard, item.urgent && s.actionCardUrgent]}>
      <View style={s.actionCardBody}>
        <Text style={[s.actionTitle, item.urgent && s.actionTitleUrgent]}>{item.title}</Text>
        {item.body ? <Text style={s.actionBody}>{item.body}</Text> : null}
      </View>
      <TouchableOpacity
        style={[s.doneBtn, marking && { opacity: 0.5 }]}
        onPress={handleDone}
        disabled={marking}
      >
        {marking
          ? <ActivityIndicator size="small" color="#000" />
          : <Text style={s.doneBtnText}>✓</Text>
        }
      </TouchableOpacity>
    </View>
  )
}

function KpiCard({ label, value, color }) {
  return (
    <View style={s.kpiCard}>
      <Text style={[s.kpiValue, { color: color ?? '#fff' }]}>{value ?? '—'}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  )
}

function ClassCard({ occ, onAttendance }) {
  const name = occ.session_name || occ.session_detail?.name || 'Class'
  const studio = occ.studio_name || occ.session_detail?.studio_detail?.name || ''
  const time = occ.start_time ? formatTime(occ.start_time) : ''
  const count = occ.enrolled_count != null ? occ.enrolled_count : null

  return (
    <View style={s.classCard}>
      <View style={s.classCardAccent} />
      <View style={s.classCardBody}>
        <Text style={s.className}>{name}</Text>
        <Text style={s.classMeta}>
          {[time, studio, count != null ? `${count} enrolled` : null].filter(Boolean).join('  ·  ')}
        </Text>
        <TouchableOpacity style={s.attendBtn} onPress={onAttendance}>
          <Text style={s.attendBtnText}>Take Attendance →</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function AllClassCard({ occ, isMine }) {
  const name = occ.session_name || occ.session_detail?.name || 'Class'
  const studio = occ.studio_name || occ.session_detail?.studio_detail?.name || ''
  const time = occ.start_time ? formatTime(occ.start_time) : ''
  const count = occ.enrolled_count != null ? occ.enrolled_count : null

  return (
    <View style={[s.allClassCard, !isMine && s.allClassCardDim]}>
      <Text style={[s.allClassName, !isMine && s.allClassNameDim]}>{name}</Text>
      <Text style={s.allClassMeta}>
        {[time, studio, count != null ? `${count} enrolled` : null].filter(Boolean).join('  ·  ')}
      </Text>
    </View>
  )
}

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth()
  const today = todayStr()

  const [actionItems, setActionItems] = useState([])
  const [actionLoading, setActionLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const { data: myOccData, loading: myOccLoading, refetch: refetchMyOcc } = useApi(
    () => classes.occurrences({ date: today, instructor: 'me' }), [today]
  )
  const myOccs = myOccData?.results ?? myOccData ?? []

  const { data: allOccData, loading: allOccLoading, refetch: refetchAllOcc } = useApi(
    () => classes.occurrences({ date: today }), [today]
  )
  const allOccs = allOccData?.results ?? allOccData ?? []

  const { data: hwData, loading: hwLoading, refetch: refetchHw } = useApi(
    () => homework.list({ status: 'active' }), []
  )
  const hwCount = (hwData?.results ?? hwData ?? []).length

  const { data: convData, loading: convLoading, refetch: refetchConv } = useApi(
    () => helpdesk.conversations(), []
  )
  const convs = convData?.results ?? convData ?? []
  const unreadCount = convs.reduce((acc, c) => acc + (c.unread_count || 0), 0)

  const studentsToday = myOccs.reduce((acc, o) => acc + (o.enrolled_count || 0), 0)

  const newStudentsToday = allOccs.reduce((acc, o) => {
    if (Array.isArray(o.attendances)) {
      return acc + o.attendances.filter(a => a.is_first_class).length
    }
    return acc
  }, 0)

  async function loadActionItems() {
    setActionLoading(true)
    try {
      const res = await client.get('/api/users/action-items/')
      const items = res.data?.results ?? res.data ?? []
      setActionItems(items.filter(i => !i.is_done))
    } catch {
      setActionItems([])
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => { loadActionItems() }, [])

  function handleActionDone(id) {
    setActionItems(prev => prev.filter(i => i.id !== id))
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.allSettled([
      loadActionItems(),
      refetchMyOcc(),
      refetchAllOcc(),
      refetchHw(),
      refetchConv(),
    ])
    setRefreshing(false)
  }, [refetchMyOcc, refetchAllOcc, refetchHw, refetchConv])

  const firstName = user?.first_name || user?.display_name || 'Instructor'

  const myOccIds = new Set(myOccs.map(o => o.id))

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ccff00" />}
    >
      <View style={s.topRow}>
        <View>
          <Text style={s.greetingText}>{greeting()}, {firstName}</Text>
          <Text style={s.dateText}>{dateLabel()}</Text>
        </View>
        <TouchableOpacity
          style={s.notifBtn}
          onPress={() => navigation.navigate('AccountHome')}
        >
          <Text style={s.notifBtnText}>👤</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>Action Items</Text>
      {actionLoading ? (
        <ActivityIndicator color="#ccff00" style={{ marginBottom: 16 }} />
      ) : actionItems.length === 0 ? (
        <View style={s.allClearCard}>
          <Text style={s.allClearText}>All clear ✓</Text>
        </View>
      ) : (
        actionItems.map(item => (
          <ActionItemCard key={item.id} item={item} onDone={handleActionDone} />
        ))
      )}

      <Text style={s.sectionTitle}>Overview</Text>
      <View style={s.kpiGrid}>
        <KpiCard label="Students Today" value={studentsToday} color="#ccff00" />
        <KpiCard label="Homework Pending" value={hwLoading ? null : hwCount} color="#ffaa00" />
        <KpiCard label="Unread Messages" value={convLoading ? null : unreadCount} color="#b0a0ff" />
        <KpiCard label="New Today" value={newStudentsToday} color="#ff5050" />
      </View>

      <View style={s.sectionRow}>
        <Text style={s.sectionTitle}>Your Classes Today</Text>
      </View>
      {myOccLoading ? (
        <ActivityIndicator color="#ccff00" style={{ marginBottom: 16 }} />
      ) : myOccs.length === 0 ? (
        <Text style={s.emptyText}>No classes for you today.</Text>
      ) : (
        myOccs.map(occ => (
          <ClassCard
            key={occ.id}
            occ={occ}
            onAttendance={() => navigation.navigate('AttendanceHome', { occurrence: occ })}
          />
        ))
      )}
      <TouchableOpacity
        style={s.viewAllLink}
        onPress={() => navigation.navigate('MyClassesTab')}
      >
        <Text style={s.viewAllLinkText}>View all my classes →</Text>
      </TouchableOpacity>

      <Text style={s.sectionTitle}>All Classes Today</Text>
      {allOccLoading ? (
        <ActivityIndicator color="#ccff00" style={{ marginBottom: 16 }} />
      ) : allOccs.length === 0 ? (
        <Text style={s.emptyText}>No classes today.</Text>
      ) : (
        allOccs.map(occ => (
          <AllClassCard key={occ.id} occ={occ} isMine={myOccIds.has(occ.id)} />
        ))
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { padding: 16, paddingBottom: 40 },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greetingText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  dateText: { fontSize: 13, color: '#888', marginTop: 2 },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', borderWidth: 1, borderColor: '#222', alignItems: 'center', justifyContent: 'center' },
  notifBtnText: { fontSize: 18 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 8 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  allClearCard: { backgroundColor: '#111', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#222', marginBottom: 16, alignItems: 'center' },
  allClearText: { color: '#ccff00', fontWeight: '600', fontSize: 15 },

  actionCard: { backgroundColor: '#111', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#222', marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  actionCardUrgent: { borderColor: '#ff5050', backgroundColor: 'rgba(255,80,80,0.06)' },
  actionCardBody: { flex: 1 },
  actionTitle: { fontSize: 14, fontWeight: '600', color: '#fff' },
  actionTitleUrgent: { color: '#ff5050' },
  actionBody: { fontSize: 13, color: '#888', marginTop: 4 },
  doneBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ccff00', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  doneBtnText: { color: '#000', fontWeight: '700', fontSize: 16 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  kpiCard: { flex: 1, minWidth: '45%', backgroundColor: '#111', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#222', alignItems: 'center' },
  kpiValue: { fontSize: 28, fontWeight: '700' },
  kpiLabel: { fontSize: 11, color: '#888', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

  classCard: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#222', overflow: 'hidden' },
  classCardAccent: { width: 4, backgroundColor: '#ccff00' },
  classCardBody: { flex: 1, padding: 14 },
  className: { fontSize: 16, fontWeight: '700', color: '#fff' },
  classMeta: { fontSize: 13, color: '#888', marginTop: 4 },
  attendBtn: { marginTop: 10, alignSelf: 'flex-start' },
  attendBtnText: { fontSize: 13, color: '#ccff00', fontWeight: '600' },

  viewAllLink: { marginBottom: 20, marginTop: 4 },
  viewAllLinkText: { color: '#ccff00', fontSize: 13, fontWeight: '600' },

  emptyText: { color: '#555', fontSize: 14, marginBottom: 16 },

  allClassCard: { backgroundColor: '#111', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#222' },
  allClassCardDim: { opacity: 0.45 },
  allClassName: { fontSize: 14, fontWeight: '600', color: '#fff' },
  allClassNameDim: { color: '#888' },
  allClassMeta: { fontSize: 12, color: '#555', marginTop: 3 },
})
