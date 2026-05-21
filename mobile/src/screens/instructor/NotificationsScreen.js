import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { notifications as notificationsApi } from '../../api'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function NotifRow({ item, onPress }) {
  const isUnread = !item.is_read && !item.read_at
  return (
    <TouchableOpacity
      style={[s.row, isUnread && s.rowUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      {isUnread && <View style={s.unreadDot} />}
      <View style={s.rowBody}>
        <View style={s.rowTop}>
          <Text style={[s.title, isUnread && s.titleUnread]} numberOfLines={2}>
            {item.title || item.verb || 'Notification'}
          </Text>
          <Text style={s.time}>{timeAgo(item.created_at ?? item.timestamp)}</Text>
        </View>
        {item.body || item.description ? (
          <Text style={s.body} numberOfLines={3}>{item.body ?? item.description}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  )
}

export default function NotificationsScreen() {
  const { data, loading, error, refetch } = useApi(() => notificationsApi.list(), [])
  const [marking, setMarking] = useState(false)
  const allNotifs = data?.results ?? data ?? []

  async function handlePress(item) {
    if (item.is_read || item.read_at) return
    try {
      await notificationsApi.markRead([item.id])
      refetch()
    } catch {
      // silently ignore
    }
  }

  async function markAllRead() {
    setMarking(true)
    try {
      await notificationsApi.markRead(null)
      refetch()
    } catch {
      // silently ignore
    } finally {
      setMarking(false)
    }
  }

  const unreadCount = allNotifs.filter(n => !n.is_read && !n.read_at).length

  return (
    <View style={s.root}>
      <View style={s.headerRow}>
        <Text style={s.heading}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} disabled={marking} style={s.markAllBtn}>
            {marking
              ? <ActivityIndicator size="small" color="#ccff00" />
              : <Text style={s.markAllText}>Mark all read</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      {loading && !allNotifs.length ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#ccff00" />
      ) : error ? (
        <Text style={s.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={allNotifs}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#ccff00" />}
          ListEmptyComponent={<Text style={s.emptyText}>No notifications.</Text>}
          renderItem={({ item }) => <NotifRow item={item} onPress={handlePress} />}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  heading: { fontSize: 20, fontWeight: '700', color: '#fff' },
  markAllBtn: { padding: 4 },
  markAllText: { color: '#ccff00', fontSize: 13, fontWeight: '600' },
  list: { paddingBottom: 40 },
  emptyText: { textAlign: 'center', color: '#555', marginTop: 40 },
  errorText: { textAlign: 'center', color: '#ff5050', marginTop: 40, paddingHorizontal: 24 },

  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowUnread: { backgroundColor: 'rgba(204,255,0,0.04)' },
  unreadDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#ccff00', marginRight: 10, marginTop: 5, flexShrink: 0,
  },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  title: { fontSize: 14, fontWeight: '500', color: '#ccc', flex: 1 },
  titleUnread: { fontWeight: '700', color: '#fff' },
  time: { fontSize: 11, color: '#555', flexShrink: 0, marginTop: 1 },
  body: { fontSize: 13, color: '#888', lineHeight: 18 },
})
