import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  TextInput, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, Modal, RefreshControl,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { helpdesk, users, community } from '../../api'
import client from '../../api/client'

// ── Thread view ───────────────────────────────────────────────────────────────

function Thread({ conv, onBack, navigation }) {
  const [messages, setMessages] = useState([])
  const [loadingMsgs, setLoadingMsgs] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const flatRef = useRef(null)

  const studentName =
    conv.student_name ?? conv.student?.display_name ?? `Student #${conv.student}`

  useEffect(() => {
    setLoadingMsgs(true)
    helpdesk.dms(conv.id)
      .then(res => {
        const msgs = res.data?.results ?? res.data ?? []
        setMessages(msgs)
      })
      .catch(() => {})
      .finally(() => setLoadingMsgs(false))
  }, [conv.id])

  async function handleSend() {
    const body = text.trim()
    if (!body) return
    setSending(true)
    setText('')
    try {
      const res = await helpdesk.sendDm(conv.id, { body })
      setMessages(prev => [...prev, res.data])
    } catch {
      setText(body)
    } finally {
      setSending(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={s.threadHeader}>
        <TouchableOpacity onPress={onBack} style={s.back}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => {
            const studentId = conv.student?.id ?? conv.student
            if (studentId && navigation) {
              navigation.navigate('StudentDetail', { studentId, studentName })
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={[s.threadTitle, s.threadTitleTappable]} numberOfLines={1}>{studentName} ›</Text>
        </TouchableOpacity>
      </View>

      {loadingMsgs ? (
        <ActivityIndicator style={{ flex: 1 }} color="#ccff00" />
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => String(m.id)}
          contentContainerStyle={s.messageList}
          ListEmptyComponent={<Text style={s.empty}>No messages yet. Say hello!</Text>}
          onContentSizeChange={() =>
            messages.length > 0 && flatRef.current?.scrollToEnd({ animated: false })
          }
          renderItem={({ item }) => {
            const fromStudent =
              item.sender_role === 'student' || item.sender?.role === 'student'
            return (
              <View style={[s.bubbleWrap, fromStudent ? s.bubbleWrapLeft : s.bubbleWrapRight]}>
                <View style={[s.bubble, fromStudent ? s.bubbleLeft : s.bubbleRight]}>
                  {fromStudent && (
                    <Text style={s.bubbleSender}>{item.sender?.display_name ?? studentName}</Text>
                  )}
                  <Text style={[s.bubbleBody, fromStudent ? s.bubbleBodyLeft : s.bubbleBodyRight]}>
                    {item.body}
                  </Text>
                  {item.created_at ? (
                    <Text style={s.bubbleTime}>
                      {new Date(item.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  ) : null}
                </View>
              </View>
            )
          }}
        />
      )}

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor="#555"
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.sendBtnText}>Send</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// ── New message picker ────────────────────────────────────────────────────────

function NewMessageModal({ visible, onClose, onStart }) {
  const [search, setSearch] = useState('')
  const { data, loading } = useApi(() => users.list({ role: 'student' }), [])
  const allStudents = data?.results ?? data ?? []
  const filtered = search.trim()
    ? allStudents.filter(u => {
        const q = search.toLowerCase()
        const name = (u.display_name || `${u.first_name ?? ''} ${u.last_name ?? ''}`).toLowerCase()
        return name.includes(q) || (u.email ?? '').toLowerCase().includes(q)
      })
    : allStudents

  async function handleSelect(student) {
    try {
      const res = await client.post('/api/helpdesk/conversations/', { student: student.id })
      const conv = res.data
      onStart(conv)
      onClose()
    } catch (err) {
      const existing = err.response?.data?.conversation
      if (existing) {
        onStart(existing)
        onClose()
      } else {
        Alert.alert('Error', 'Could not start conversation.')
      }
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.modalRoot}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose} style={s.back}>
            <Text style={s.backText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={s.modalTitle}>New Message</Text>
          <View style={{ width: 60 }} />
        </View>
        <TextInput
          style={s.newMsgSearch}
          placeholder="Search students..."
          placeholderTextColor="#555"
          value={search}
          onChangeText={setSearch}
        />
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#ccff00" />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={<Text style={s.empty}>No students found.</Text>}
            renderItem={({ item }) => {
              const name = item.display_name || `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() || item.email
              return (
                <TouchableOpacity style={s.studentPickRow} onPress={() => handleSelect(item)}>
                  <Text style={s.studentPickName}>{name}</Text>
                  {item.email ? <Text style={s.studentPickEmail}>{item.email}</Text> : null}
                </TouchableOpacity>
              )
            }}
          />
        )}
      </View>
    </Modal>
  )
}

// ── DMs tab ───────────────────────────────────────────────────────────────────

function DmsTab({ navigation }) {
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const { data, loading, refetch } = useApi(() => helpdesk.conversations(), [])
  const convs = data?.results ?? data ?? []

  if (selected) {
    return <Thread conv={selected} onBack={() => setSelected(null)} navigation={navigation} />
  }

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity style={s.newMsgBtn} onPress={() => setShowNew(true)}>
        <Text style={s.newMsgBtnText}>+ New Message</Text>
      </TouchableOpacity>

      {loading && !convs.length ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#ccff00" />
      ) : convs.length === 0 ? (
        <Text style={s.empty}>No conversations yet.</Text>
      ) : (
        <FlatList
          data={convs}
          keyExtractor={c => String(c.id)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#ccff00" />}
          renderItem={({ item }) => {
            const studentName =
              item.student_name ?? item.student?.display_name ?? `Student #${item.student}`
            const lastMsg = item.last_message
            const hasUnread = item.unread_count > 0
            return (
              <TouchableOpacity style={s.convRow} onPress={() => setSelected(item)}>
                <View style={s.convRowInner}>
                  {hasUnread && <View style={s.unreadDot} />}
                  <View style={s.convText}>
                    <View style={s.convMeta}>
                      <Text style={[s.convName, hasUnread && s.convNameUnread]}>{studentName}</Text>
                      {hasUnread && (
                        <View style={s.unreadBadge}>
                          <Text style={s.unreadBadgeText}>{item.unread_count}</Text>
                        </View>
                      )}
                    </View>
                    {lastMsg?.body ? (
                      <Text style={s.convPreview} numberOfLines={1}>{lastMsg.body}</Text>
                    ) : null}
                  </View>
                  <Text style={s.chevron}>›</Text>
                </View>
              </TouchableOpacity>
            )
          }}
        />
      )}

      <NewMessageModal
        visible={showNew}
        onClose={() => setShowNew(false)}
        onStart={conv => setSelected(conv)}
      />
    </View>
  )
}

// ── Community tab ─────────────────────────────────────────────────────────────

function CommunityGroupView({ group, onBack }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    setLoading(true)
    community.groupPosts(group.id)
      .then(res => setPosts(res.data?.results ?? res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [group.id])

  async function handlePost() {
    const content = text.trim()
    if (!content) return
    setSending(true)
    setText('')
    try {
      const res = await community.createGroupPost(group.id, { content })
      setPosts(prev => [res.data, ...prev])
    } catch {
      setText(content)
    } finally {
      setSending(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#000' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={s.threadHeader}>
        <TouchableOpacity onPress={onBack} style={s.back}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.threadTitle} numberOfLines={1}>{group.name}</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#ccff00" />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={p => String(p.id)}
          contentContainerStyle={s.messageList}
          ListEmptyComponent={<Text style={s.empty}>No posts yet.</Text>}
          renderItem={({ item }) => (
            <View style={s.communityPost}>
              <Text style={s.communityPostAuthor}>{item.author?.display_name ?? 'Instructor'}</Text>
              <Text style={s.communityPostContent}>{item.content || item.body || ''}</Text>
              {item.created_at ? (
                <Text style={s.bubbleTime}>{new Date(item.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
              ) : null}
            </View>
          )}
        />
      )}
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Post to group…"
          placeholderTextColor="#555"
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
          onPress={handlePost}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.sendBtnText}>Post</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

function CommunityTab() {
  const [selectedGroup, setSelectedGroup] = useState(null)
  const { data, loading, error, refetch } = useApi(() => community.groups(), [])
  const groups = data?.results ?? data ?? []

  if (selectedGroup) {
    return <CommunityGroupView group={selectedGroup} onBack={() => setSelectedGroup(null)} />
  }

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#ccff00" />
      ) : error ? (
        <Text style={s.empty}>{error}</Text>
      ) : groups.length === 0 ? (
        <Text style={s.empty}>No community groups.</Text>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={g => String(g.id)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#ccff00" />}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.convRow} onPress={() => setSelectedGroup(item)}>
              <View style={s.convRowInner}>
                <View style={s.convText}>
                  <Text style={s.convName}>{item.name}</Text>
                  {item.description ? (
                    <Text style={s.convPreview} numberOfLines={1}>{item.description}</Text>
                  ) : null}
                </View>
                <Text style={s.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

// ── Requests tab ──────────────────────────────────────────────────────────────

function RequestsTab() {
  const { data, loading, error, refetch } = useApi(() => helpdesk.myTickets(), [])
  const tickets = data?.results ?? data ?? []

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#ccff00" />
      ) : error ? (
        <Text style={s.empty}>{error}</Text>
      ) : tickets.length === 0 ? (
        <Text style={s.empty}>No requests.</Text>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={t => String(t.id)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#ccff00" />}
          renderItem={({ item }) => (
            <View style={s.convRow}>
              <View style={s.convRowInner}>
                <View style={s.convText}>
                  <Text style={s.convName}>{item.subject || item.title || `Ticket #${item.id}`}</Text>
                  {item.status ? <Text style={s.convPreview}>{item.status}</Text> : null}
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  )
}

// ── Sent tab ──────────────────────────────────────────────────────────────────

function SentTab() {
  const { data, loading, error, refetch } = useApi(() => helpdesk.conversations(), [])
  const convs = data?.results ?? data ?? []

  const sentMsgs = convs.filter(c => c.last_message && c.last_message.sender_role !== 'student')

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#ccff00" />
      ) : error ? (
        <Text style={s.empty}>{error}</Text>
      ) : sentMsgs.length === 0 ? (
        <Text style={s.empty}>No sent messages.</Text>
      ) : (
        <FlatList
          data={sentMsgs}
          keyExtractor={c => String(c.id)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#ccff00" />}
          renderItem={({ item }) => {
            const studentName =
              item.student_name ?? item.student?.display_name ?? `Student #${item.student}`
            return (
              <View style={s.convRow}>
                <View style={s.convRowInner}>
                  <View style={s.convText}>
                    <Text style={s.convName}>{studentName}</Text>
                    {item.last_message?.body ? (
                      <Text style={s.convPreview} numberOfLines={1}>{item.last_message.body}</Text>
                    ) : null}
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

const TABS = [
  { id: 'dms', label: 'DMs' },
  { id: 'community', label: 'Community' },
  { id: 'requests', label: 'Requests' },
  { id: 'sent', label: 'Sent' },
]

export default function MessagesScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('dms')

  return (
    <View style={s.root}>
      <Text style={s.heading}>Messages</Text>

      <View style={s.tabStrip}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[s.tabBtn, activeTab === tab.id && s.tabBtnActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[s.tabBtnText, activeTab === tab.id && s.tabBtnTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'dms' && <DmsTab navigation={navigation} />}
      {activeTab === 'community' && <CommunityTab />}
      {activeTab === 'requests' && <RequestsTab />}
      {activeTab === 'sent' && <SentTab />}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  heading: { fontSize: 20, fontWeight: '700', color: '#fff', padding: 16, paddingBottom: 8 },

  tabStrip: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#1a1a1a', borderRadius: 10, padding: 3, gap: 2,
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#111' },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: '#888' },
  tabBtnTextActive: { color: '#ccff00' },

  newMsgBtn: {
    marginHorizontal: 16, marginBottom: 10, backgroundColor: '#111',
    borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: '#333',
    alignItems: 'center',
  },
  newMsgBtnText: { color: '#ccff00', fontWeight: '700', fontSize: 14 },

  list: { paddingBottom: 24 },
  empty: { textAlign: 'center', color: '#555', marginTop: 40, paddingHorizontal: 24 },

  convRow: {
    backgroundColor: '#111',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2a2a2a',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  convRowInner: { flexDirection: 'row', alignItems: 'center' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ccff00', marginRight: 8, flexShrink: 0 },
  convText: { flex: 1, minWidth: 0 },
  convMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  convName: { fontSize: 14, fontWeight: '600', color: '#fff' },
  convNameUnread: { color: '#ccff00' },
  unreadBadge: { backgroundColor: '#ccff00', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  unreadBadgeText: { fontSize: 10, fontWeight: '700', color: '#000' },
  convPreview: { fontSize: 12, color: '#888' },
  chevron: { fontSize: 20, color: '#444', marginLeft: 8 },

  threadHeader: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#111',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2a2a2a',
    paddingHorizontal: 4, paddingVertical: 10,
  },
  back: { paddingHorizontal: 12, paddingVertical: 4 },
  backText: { color: '#ccff00', fontWeight: '600', fontSize: 15 },
  threadTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginRight: 16 },
  threadTitleTappable: { color: '#ccff00' },

  messageList: { padding: 16, paddingBottom: 8 },
  bubbleWrap: { marginBottom: 10 },
  bubbleWrapLeft: { alignItems: 'flex-start' },
  bubbleWrapRight: { alignItems: 'flex-end' },
  bubble: { maxWidth: '75%', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleLeft: { backgroundColor: '#111', borderWidth: 1, borderColor: '#333' },
  bubbleRight: { backgroundColor: 'rgba(204,255,0,0.08)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.2)' },
  bubbleSender: { fontSize: 10, color: '#555', marginBottom: 3 },
  bubbleBody: { fontSize: 14, lineHeight: 20 },
  bubbleBodyLeft: { color: '#fff' },
  bubbleBodyRight: { color: '#ccff00' },
  bubbleTime: { fontSize: 10, color: '#555', marginTop: 4, textAlign: 'right' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#111', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#2a2a2a',
  },
  input: {
    flex: 1, backgroundColor: '#1a1a1a', borderRadius: 20,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    fontSize: 14, color: '#fff', maxHeight: 100, marginRight: 10,
  },
  sendBtn: {
    backgroundColor: '#ccff00', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10,
    justifyContent: 'center', alignItems: 'center', minWidth: 64,
  },
  sendBtnDisabled: { backgroundColor: 'rgba(204,255,0,0.3)' },
  sendBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },

  communityPost: {
    backgroundColor: '#111', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#222',
  },
  communityPostAuthor: { fontSize: 12, fontWeight: '700', color: '#ccff00', marginBottom: 4 },
  communityPostContent: { fontSize: 14, color: '#fff', lineHeight: 20 },

  modalRoot: { flex: 1, backgroundColor: '#000' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#222',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  newMsgSearch: {
    margin: 16, backgroundColor: '#111', borderWidth: 1, borderColor: '#333',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#fff',
  },
  studentPickRow: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2a2a2a',
    backgroundColor: '#111',
  },
  studentPickName: { fontSize: 14, fontWeight: '600', color: '#fff' },
  studentPickEmail: { fontSize: 12, color: '#888', marginTop: 2 },
})
