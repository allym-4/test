import { useState } from 'react'
import {
  ScrollView, View, Text, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { notifications, announcements } from '../../api'

const TYPE_ICON = {
  reminder: '📅',
  waitlist: '🔔',
  payment: '💳',
  form: '📋',
  info: '🎉',
  message: '💬',
  cancellation: '⚠️',
  billing: '💰',
  success: '✅',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export default function NotificationsScreen() {
  const {
    data: notifData,
    loading: notifLoading,
    refetch: refetchNotifs,
  } = useApi(() => notifications.list(), [])

  const {
    data: announceData,
    loading: announceLoading,
    refetch: refetchAnnounce,
  } = useApi(() => announcements.list({ note_type: 'announcement' }), [])

  const [markingAll, setMarkingAll] = useState(false)
  const [acknowledging, setAcknowledging] = useState({})
  const [localRead, setLocalRead] = useState({})

  const notifList = notifData?.results ?? notifData ?? []
  const announceList = announceData?.results ?? announceData ?? []
  const loading = notifLoading || announceLoading

  const unacknowledged = announceList.filter(
    (a) => a.requires_acknowledgement && !a.is_acknowledged,
  )

  const unread = notifList.filter((n) => !n.read && !localRead[n.id])

  function refresh() {
    refetchNotifs()
    refetchAnnounce()
  }

  async function handleNotifPress(notif) {
    if (notif.read || localRead[notif.id]) return
    setLocalRead((prev) => ({ ...prev, [notif.id]: true }))
    try {
      await notifications.markRead([notif.id])
    } catch {
      setLocalRead((prev) => { const next = { ...prev }; delete next[notif.id]; return next })
    }
  }

  async function handleMarkAllRead() {
    if (markingAll || unread.length === 0) return
    setMarkingAll(true)
    const ids = unread.map((n) => n.id)
    const patch = {}
    ids.forEach((id) => { patch[id] = true })
    setLocalRead((prev) => ({ ...prev, ...patch }))
    try {
      await notifications.markRead(ids)
      refetchNotifs()
    } catch {
      setLocalRead((prev) => {
        const next = { ...prev }
        ids.forEach((id) => delete next[id])
        return next
      })
    } finally {
      setMarkingAll(false)
    }
  }

  async function handleAcknowledge(id) {
    if (acknowledging[id]) return
    setAcknowledging((prev) => ({ ...prev, [id]: true }))
    try {
      await announcements.acknowledge(id)
      refetchAnnounce()
    } finally {
      setAcknowledging((prev) => { const next = { ...prev }; delete next[id]; return next })
    }
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      {/* Header row */}
      <View style={s.headerRow}>
        <Text style={s.pageTitle}>Notifications</Text>
        {unread.length > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} disabled={markingAll}>
            <Text style={s.markAllText}>
              {markingAll ? 'Marking…' : 'Mark all read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Announcements section */}
      {unacknowledged.length > 0 && (
        <>
          <Text style={s.sectionLabel}>Announcements</Text>
          {unacknowledged.map((item) => (
            <View key={item.id} style={s.announceCard}>
              <Text style={s.announceTitle}>📢  {item.title}</Text>
              {!!item.body && (
                <Text style={s.announceBody} numberOfLines={4}>{item.body}</Text>
              )}
              {item.requires_acknowledgement && (
                <TouchableOpacity
                  style={[s.ackBtn, acknowledging[item.id] && s.ackBtnDisabled]}
                  onPress={() => handleAcknowledge(item.id)}
                  disabled={!!acknowledging[item.id]}
                >
                  <Text style={s.ackBtnText}>
                    {acknowledging[item.id] ? 'Acknowledging…' : 'Acknowledge'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </>
      )}

      {/* Notifications section */}
      <Text style={s.sectionLabel}>Notifications</Text>
      {loading && notifList.length === 0 && (
        <ActivityIndicator color="#ccff00" style={{ marginTop: 24 }} />
      )}
      {!loading && notifList.length === 0 && (
        <Text style={s.empty}>No notifications yet.</Text>
      )}
      {notifList.map((item) => {
        const isRead = item.read || !!localRead[item.id]
        const icon = TYPE_ICON[item.notification_type] ?? '🔔'
        return (
          <TouchableOpacity
            key={item.id}
            style={[s.notifRow, isRead && s.notifRowRead]}
            onPress={() => handleNotifPress(item)}
            activeOpacity={0.7}
          >
            <Text style={s.notifIcon}>{icon}</Text>
            <View style={s.notifBody}>
              <Text style={[s.notifTitle, isRead && s.notifTitleRead]} numberOfLines={1}>
                {item.title}
              </Text>
              {!!item.body && (
                <Text style={s.notifPreview} numberOfLines={2}>{item.body}</Text>
              )}
              <Text style={s.notifTime}>{timeAgo(item.created_at)}</Text>
            </View>
            {!isRead && <View style={s.unreadDot} />}
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingBottom: 40 },

  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  markAllText: { fontSize: 14, fontWeight: '600', color: '#ccff00' },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#666',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, marginTop: 4,
  },

  // Announcement card
  announceCard: {
    backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: '#ccff00', borderWidth: 1, borderColor: '#222',
  },
  announceTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 6 },
  announceBody: { fontSize: 14, color: '#aaa', lineHeight: 20, marginBottom: 12 },
  ackBtn: {
    alignSelf: 'flex-start', backgroundColor: '#ccff00',
    borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8,
  },
  ackBtnDisabled: { opacity: 0.5 },
  ackBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },

  // Notification row
  notifRow: {
    backgroundColor: '#111', borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'flex-start',
    borderWidth: 1, borderColor: '#222',
  },
  notifRowRead: { opacity: 0.6 },
  notifIcon: { fontSize: 22, marginRight: 12, marginTop: 1 },
  notifBody: { flex: 1 },
  notifTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  notifTitleRead: { fontWeight: '500', color: '#aaa' },
  notifPreview: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 12, color: '#555' },
  unreadDot: {
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: '#ccff00', marginTop: 4, marginLeft: 8, flexShrink: 0,
  },

  empty: { color: '#555', textAlign: 'center', marginTop: 32, fontSize: 14 },
})
