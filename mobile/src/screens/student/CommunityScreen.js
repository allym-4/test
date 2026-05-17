import { useState, useCallback, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ScrollView, Modal, ActivityIndicator,
  KeyboardAvoidingView, Platform, RefreshControl, Alert,
} from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { community } from '../../api'

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name, size = 36 }) {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
  const idx = (name ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length
  return (
    <View style={[av.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors[idx] }]}>
      <Text style={[av.text, { fontSize: size * 0.36 }]}>{initials(name)}</Text>
    </View>
  )
}
const av = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '700' },
})

// ─── Reply row ───────────────────────────────────────────────────────────────

function ReplyRow({ reply }) {
  return (
    <View style={s.replyRow}>
      <Avatar name={reply.author?.display_name} size={28} />
      <View style={s.replyContent}>
        <Text style={s.replyAuthor}>{reply.author?.display_name ?? 'Unknown'}</Text>
        <Text style={s.replyBody}>{reply.body}</Text>
        <Text style={s.replyTime}>{timeAgo(reply.created_at)}</Text>
      </View>
    </View>
  )
}

// ─── Post card ───────────────────────────────────────────────────────────────

function PostCard({ post, onLike, liking }) {
  const [showReplies, setShowReplies] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [localReplies, setLocalReplies] = useState(null)

  const { data: replyData, loading: repliesLoading, refetch: refetchReplies } = useApi(
    showReplies ? () => community.replies(post.id) : null,
    [showReplies, post.id],
  )

  const replies = localReplies ?? replyData?.results ?? replyData ?? []

  async function sendReply() {
    const body = replyText.trim()
    if (!body) return
    setSending(true)
    setReplyText('')
    try {
      await community.createReply({ post: post.id, body })
      const res = await community.replies(post.id)
      setLocalReplies(res.data?.results ?? res.data ?? [])
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not send reply.')
      setReplyText(body)
    } finally {
      setSending(false)
    }
  }

  async function toggleReplies() {
    if (!showReplies) {
      setShowReplies(true)
    } else {
      setShowReplies(false)
      setLocalReplies(null)
    }
  }

  return (
    <View style={s.postCard}>
      <View style={s.postHeader}>
        <Avatar name={post.author?.display_name} size={38} />
        <View style={s.postMeta}>
          <Text style={s.postAuthor}>{post.author?.display_name ?? 'Unknown'}</Text>
          <Text style={s.postTime}>{timeAgo(post.created_at)}</Text>
        </View>
      </View>
      <Text style={s.postBody}>{post.body}</Text>
      <View style={s.postActions}>
        <TouchableOpacity
          onPress={() => onLike(post)}
          disabled={liking}
          style={s.actionBtn}
          activeOpacity={0.7}
        >
          <Text style={[s.actionText, post.liked_by_me && s.actionTextActive]}>
            {post.liked_by_me ? '♥' : '♡'} {post.like_count ?? 0}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleReplies} style={s.actionBtn} activeOpacity={0.7}>
          <Text style={[s.actionText, showReplies && s.actionTextActive]}>
            💬 {post.reply_count ?? 0} {showReplies ? 'Hide' : 'View replies'}
          </Text>
        </TouchableOpacity>
      </View>

      {showReplies && (
        <View style={s.replySection}>
          {repliesLoading
            ? <ActivityIndicator size="small" color="#ccff00" style={{ marginVertical: 8 }} />
            : replies.map(r => <ReplyRow key={r.id} reply={r} />)
          }
          <View style={s.replyInputRow}>
            <TextInput
              style={s.replyInput}
              placeholder="Write a reply…"
              placeholderTextColor="#555"
              value={replyText}
              onChangeText={setReplyText}
              multiline
            />
            <TouchableOpacity
              style={[s.replyBtn, !replyText.trim() && s.replyBtnDisabled]}
              onPress={sendReply}
              disabled={!replyText.trim() || sending}
              activeOpacity={0.8}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.replyBtnText}>Send</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

// ─── New post modal ──────────────────────────────────────────────────────────

function NewPostModal({ visible, onClose, onSubmit }) {
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)

  async function submit() {
    const body = text.trim()
    if (!body) return
    setPosting(true)
    try {
      await onSubmit(body)
      setText('')
      onClose()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not create post.')
    } finally {
      setPosting(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.modalSheet}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>New Post</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={s.modalInput}
            placeholder="What's on your mind?"
            placeholderTextColor="#555"
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
          />
          <TouchableOpacity
            style={[s.modalPostBtn, (!text.trim() || posting) && s.modalPostBtnDisabled]}
            onPress={submit}
            disabled={!text.trim() || posting}
            activeOpacity={0.8}
          >
            {posting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.modalPostBtnText}>Post</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Feed ────────────────────────────────────────────────────────────────────

function Feed({ groupId }) {
  const [refreshing, setRefreshing] = useState(false)
  const [likingId, setLikingId] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const { data, loading, error, refetch } = useApi(
    groupId != null ? () => community.posts(groupId) : null,
    [groupId],
  )

  async function onRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  async function handleLike(post) {
    setLikingId(post.id)
    try {
      await community.likePost(post.id)
      refetch()
    } catch (_) {
      // silent
    } finally {
      setLikingId(null)
    }
  }

  async function handleNewPost(body) {
    await community.createPost({ group: groupId, body })
    refetch()
  }

  const posts = data?.results ?? data ?? []

  if (loading && !refreshing) {
    return <ActivityIndicator size="large" color="#ccff00" style={s.centered} />
  }
  if (error) {
    return <Text style={s.errorText}>{error}</Text>
  }

  return (
    <View style={s.feedRoot}>
      <FlatList
        data={posts}
        keyExtractor={p => String(p.id)}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={handleLike}
            liking={likingId === item.id}
          />
        )}
        contentContainerStyle={s.feedPad}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ccff00" />}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>No posts yet</Text>
            <Text style={s.emptyBody}>Be the first to post in this group.</Text>
          </View>
        }
      />
      <TouchableOpacity style={s.fab} onPress={() => setShowModal(true)} activeOpacity={0.85}>
        <Text style={s.fabText}>＋</Text>
      </TouchableOpacity>
      <NewPostModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleNewPost}
      />
    </View>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const { data: groupsData, loading: groupsLoading } = useApi(() => community.groups(), [])
  const groups = groupsData?.results ?? groupsData ?? []
  const [selectedGroupId, setSelectedGroupId] = useState(null)

  const activeGroupId = selectedGroupId ?? (groups[0]?.id ?? null)

  if (groupsLoading) {
    return <ActivityIndicator size="large" color="#ccff00" style={s.centered} />
  }

  // Use top tabs if few groups (≤5), else side rail
  const useTabs = groups.length <= 5

  if (useTabs) {
    return (
      <View style={s.root}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.groupTabBar} contentContainerStyle={s.groupTabBarContent}>
          {groups.map(g => (
            <TouchableOpacity
              key={g.id}
              style={[s.groupTab, activeGroupId === g.id && s.groupTabActive]}
              onPress={() => setSelectedGroupId(g.id)}
              activeOpacity={0.8}
            >
              <Text style={[s.groupTabText, activeGroupId === g.id && s.groupTabTextActive]}>{g.name}</Text>
              {g.member_count != null && (
                <Text style={[s.groupTabCount, activeGroupId === g.id && s.groupTabCountActive]}>{g.member_count}</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Feed groupId={activeGroupId} />
      </View>
    )
  }

  return (
    <View style={s.root}>
      <View style={s.rail}>
        <ScrollView>
          {groups.map(g => (
            <TouchableOpacity
              key={g.id}
              style={[s.railItem, activeGroupId === g.id && s.railItemActive]}
              onPress={() => setSelectedGroupId(g.id)}
              activeOpacity={0.8}
            >
              <Text style={[s.railItemText, activeGroupId === g.id && s.railItemTextActive]} numberOfLines={2}>{g.name}</Text>
              {g.member_count != null && <Text style={s.railItemCount}>{g.member_count}</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={s.feedPane}>
        <Feed groupId={activeGroupId} />
      </View>
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, marginTop: 80 },
  errorText: { textAlign: 'center', color: '#ef4444', marginTop: 40, fontSize: 14 },

  // Group tabs (top, few groups)
  groupTabBar: { backgroundColor: '#000', borderBottomWidth: 1, borderBottomColor: '#222', flexGrow: 0 },
  groupTabBarContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  groupTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#111', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#222' },
  groupTabActive: { backgroundColor: '#1a2a00', borderColor: '#ccff00' },
  groupTabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  groupTabTextActive: { color: '#ccff00' },
  groupTabCount: { fontSize: 12, color: '#666', backgroundColor: '#222', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
  groupTabCountActive: { backgroundColor: '#2a3a00', color: '#ccff00' },

  // Side rail (many groups)
  rail: { width: 96, backgroundColor: '#000', borderRightWidth: 1, borderRightColor: '#222' },
  railItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  railItemActive: { backgroundColor: '#111' },
  railItemText: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 2 },
  railItemTextActive: { color: '#ccff00' },
  railItemCount: { fontSize: 11, color: '#555' },
  feedPane: { flex: 1 },

  // Feed
  feedRoot: { flex: 1 },
  feedPad: { padding: 14, paddingBottom: 100 },

  // Post card
  postCard: { backgroundColor: '#111', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  postMeta: { flex: 1 },
  postAuthor: { fontSize: 14, fontWeight: '700', color: '#fff' },
  postTime: { fontSize: 12, color: '#666', marginTop: 1 },
  postBody: { fontSize: 15, color: '#ccc', lineHeight: 22, marginBottom: 12 },
  postActions: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: '#222', paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  actionText: { fontSize: 14, color: '#666', fontWeight: '500' },
  actionTextActive: { color: '#ccff00' },

  // Replies
  replySection: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#222', paddingTop: 10 },
  replyRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  replyContent: { flex: 1 },
  replyAuthor: { fontSize: 13, fontWeight: '700', color: '#ccc' },
  replyBody: { fontSize: 14, color: '#888', lineHeight: 20, marginTop: 2 },
  replyTime: { fontSize: 11, color: '#555', marginTop: 3 },
  replyInputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginTop: 8 },
  replyInput: { flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#fff', backgroundColor: '#1a1a1a', maxHeight: 80 },
  replyBtn: { backgroundColor: '#ccff00', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  replyBtnDisabled: { backgroundColor: '#3a4a00' },
  replyBtnText: { color: '#000', fontSize: 13, fontWeight: '600' },

  // FAB
  fab: { position: 'absolute', bottom: 24, right: 20, width: 54, height: 54, borderRadius: 27, backgroundColor: '#ccff00', alignItems: 'center', justifyContent: 'center', shadowColor: '#ccff00', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  fabText: { color: '#000', fontSize: 28, lineHeight: 34 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: '#222' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  modalClose: { fontSize: 18, color: '#666', padding: 4 },
  modalInput: { borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 14, fontSize: 15, color: '#fff', backgroundColor: '#1a1a1a', minHeight: 110, textAlignVertical: 'top', marginBottom: 14 },
  modalPostBtn: { backgroundColor: '#ccff00', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  modalPostBtnDisabled: { backgroundColor: '#3a4a00' },
  modalPostBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 6 },
  emptyBody: { fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 32 },
})
