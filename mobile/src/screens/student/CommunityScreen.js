import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
  ScrollView, RefreshControl,
} from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { helpdesk, assistant, community as communityApi } from '../../api'

const T = {
  bg: '#000', card: '#111', border: '#222', lime: '#ccff00',
  muted: '#555', text: '#fff', sub: '#888', lav: '#b0a0ff',
}

// ─── Bubble ───────────────────────────────────────────────────────────────────
function Bubble({ msg, isMe, showAuthor }) {
  const ts = msg.created_at
    ? new Date(msg.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
    : ''
  const authorName = msg.author || msg.author_name || msg.user_display || msg.sender_detail?.display_name || ''
  const initial = (authorName || '?').charAt(0).toUpperCase()
  return (
    <View style={[s.row, isMe ? s.rowMe : s.rowThem]}>
      {!isMe && showAuthor && (
        <View style={s.avatar}><Text style={s.avatarText}>{initial}</Text></View>
      )}
      {!isMe && !showAuthor && <View style={s.avatarSpacer} />}
      <View style={{ maxWidth: '75%' }}>
        {!isMe && showAuthor && !!authorName && (
          <Text style={s.authorName}>{authorName}</Text>
        )}
        <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
          <Text style={[s.bubbleText, isMe && s.bubbleTextMe]}>{msg.body || msg.text || msg.content}</Text>
        </View>
        {!!ts && <Text style={[s.bubbleTime, isMe && s.bubbleTimeMe]}>{ts}</Text>}
      </View>
    </View>
  )
}

// ─── GroupChat ────────────────────────────────────────────────────────────────
function GroupChat({ group, userId, onBack, onLeave }) {
  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [msgInput, setMsgInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    setLoadingPosts(true)
    communityApi.groupPosts(group.id)
      .then(r => setPosts(r.data?.results ?? r.data ?? []))
      .catch(() => setPosts([]))
      .finally(() => setLoadingPosts(false))
  }, [group.id])

  async function sendMessage() {
    const text = msgInput.trim()
    if (!text || sending) return
    setMsgInput('')
    const optimistic = {
      id: 'opt-' + Date.now(),
      body: text,
      author_id: userId,
      created_at: new Date().toISOString(),
      _mine: true,
    }
    setPosts(prev => [...prev, optimistic])
    setSending(true)
    try {
      const r = await communityApi.createGroupPost(group.id, { body: text })
      setPosts(prev => prev.map(p => p.id === optimistic.id ? r.data : p))
    } catch {
      setPosts(prev => prev.filter(p => p.id !== optimistic.id))
      setMsgInput(text)
    } finally {
      setSending(false)
    }
  }

  const memberCount = group.member_count ?? group.members_count ?? group.members

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {/* Chat header */}
      <View style={s.chatHeader}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.chatTitle}>{group.name}</Text>
          {memberCount != null && (
            <Text style={s.chatSub}>{memberCount} members</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => onLeave(group)} style={s.leaveBtn}>
          <Text style={s.leaveBtnText}>Leave</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {loadingPosts ? (
        <View style={s.center}><ActivityIndicator color={T.lime} /></View>
      ) : posts.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyTitle}>No messages yet</Text>
          <Text style={s.emptySub}>Say hi to the group!</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={posts}
          keyExtractor={p => String(p.id)}
          contentContainerStyle={s.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item, index }) => {
            const mine = item._mine || item.author_id === userId || item.user_id === userId || item.user === userId
            const prevItem = posts[index - 1]
            const prevAuthor = prevItem?.author_id ?? prevItem?.user_id ?? prevItem?.user
            const thisAuthor = item.author_id ?? item.user_id ?? item.user
            const showAuthor = !mine && prevAuthor !== thisAuthor
            return <Bubble key={item.id} msg={item} isMe={mine} showAuthor={showAuthor} />
          }}
        />
      )}

      {/* Input */}
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder={`Message ${group.name}…`}
          placeholderTextColor={T.muted}
          value={msgInput}
          onChangeText={setMsgInput}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!msgInput.trim() || sending) && s.disabled]}
          onPress={sendMessage}
          disabled={!msgInput.trim() || sending}
        >
          {sending ? <ActivityIndicator color="#000" size="small" /> : <Text style={s.sendBtnText}>Send</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── GroupsList ───────────────────────────────────────────────────────────────
function GroupsList({ onSelectGroup }) {
  const [joiningId, setJoiningId] = useState(null)
  const { data: groupData, loading, refetch } = useApi(() => communityApi.groups(), [])
  const allGroups = groupData?.results ?? groupData ?? []
  const joinedGroups = allGroups.filter(g => g.is_member || g.joined || g.member)
  const discoverGroups = allGroups.filter(g => !g.is_member && !g.joined && !g.member)

  async function joinGroup(groupId) {
    setJoiningId(groupId)
    try {
      await communityApi.joinGroup(groupId)
      refetch()
    } finally {
      setJoiningId(null)
    }
  }

  if (loading && allGroups.length === 0) {
    return <View style={s.center}><ActivityIndicator color={T.lime} /></View>
  }

  if (allGroups.length === 0) {
    return (
      <View style={s.center}>
        <Text style={s.emptyTitle}>No groups yet</Text>
        <Text style={s.emptySub}>Your studio will set these up</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 14 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={T.lime} />}
    >
      {joinedGroups.length > 0 && (
        <>
          <Text style={s.groupSectionLabel}>Groups</Text>
          {joinedGroups.map(g => {
            const memberCount = g.member_count ?? g.members_count ?? g.members
            const unread = g.unread_count ?? g.unread ?? 0
            return (
              <TouchableOpacity key={g.id} style={s.groupRow} onPress={() => onSelectGroup(g)} activeOpacity={0.7}>
                <View style={s.groupAvatar}>
                  <Text style={s.groupAvatarText}>{g.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.groupName}>{g.name}</Text>
                  {memberCount != null && (
                    <Text style={s.groupMeta}>{memberCount} members</Text>
                  )}
                </View>
                {unread > 0 && (
                  <View style={s.unreadBadge}>
                    <Text style={s.unreadText}>{unread > 9 ? '9+' : unread}</Text>
                  </View>
                )}
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            )
          })}
        </>
      )}

      {discoverGroups.length > 0 && (
        <>
          <Text style={[s.groupSectionLabel, { marginTop: 20 }]}>Discover Groups</Text>
          {discoverGroups.map(g => {
            const memberCount = g.member_count ?? g.members_count ?? g.members
            return (
              <View key={g.id} style={s.discoverRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.groupName}>{g.name}</Text>
                  {memberCount != null && (
                    <Text style={s.groupMeta}>{memberCount} members</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[s.joinBtn, joiningId === g.id && s.disabled]}
                  onPress={() => joinGroup(g.id)}
                  disabled={joiningId === g.id}
                >
                  <Text style={s.joinBtnText}>{joiningId === g.id ? 'Joining…' : 'Join'}</Text>
                </TouchableOpacity>
              </View>
            )
          })}
        </>
      )}
    </ScrollView>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CommunityScreen() {
  const { user: me } = useAuth()
  const [tab, setTab] = useState('groups')
  const [activeGroup, setActiveGroup] = useState(null)

  // Studio DM
  const [conv, setConv] = useState(null)
  const [convLoading, setConvLoading] = useState(true)
  const [humanMsg, setHumanMsg] = useState('')
  const [sending, setSending] = useState(false)
  const humanListRef = useRef(null)

  // AI Assistant
  const [aiMessages, setAiMessages] = useState([
    { id: 'greeting', role: 'bot', body: `Hi ${me?.first_name || 'there'}! I'm the Duality assistant. Ask me anything about classes, bookings, or studio policies.` },
  ])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const aiListRef = useRef(null)

  useEffect(() => {
    helpdesk.myConversation()
      .then(r => setConv(r.data))
      .catch(() => {})
      .finally(() => setConvLoading(false))
  }, [])

  async function sendHuman() {
    if (!humanMsg.trim() || sending) return
    const text = humanMsg
    setHumanMsg('')
    setSending(true)
    try {
      const r = await helpdesk.sendMyDm({ body: text })
      setConv(prev => ({ ...prev, messages: [...(prev?.messages || []), r.data] }))
    } catch {
      setHumanMsg(text)
    } finally {
      setSending(false)
    }
  }

  async function sendAi() {
    if (!aiInput.trim() || aiLoading) return
    const text = aiInput
    setAiInput('')
    setAiMessages(prev => [...prev, { id: Date.now(), role: 'user', body: text }])
    setAiLoading(true)
    try {
      const { data } = await assistant.chat(text)
      setAiMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', body: data.response || data.message || "Sorry, I couldn't process that." }])
    } catch {
      setAiMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', body: 'Sorry, something went wrong. Try again.' }])
    } finally {
      setAiLoading(false)
    }
  }

  async function handleLeaveGroup(group) {
    try {
      await communityApi.leaveGroup(group.id)
      setActiveGroup(null)
    } catch {
      // silently ignore
    }
  }

  const humanMessages = conv?.messages || []

  return (
    <View style={s.root}>
      {/* Tab bar */}
      <View style={s.tabs}>
        {[['groups', '👥  Groups'], ['assistant', '🤖  Assistant'], ['human', '💬  Studio']].map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[s.tab, tab === key && s.tabActive]}
            onPress={() => { setTab(key); if (key !== 'groups') setActiveGroup(null) }}
          >
            <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Groups */}
      {tab === 'groups' && (
        activeGroup
          ? <GroupChat group={activeGroup} userId={me?.id} onBack={() => setActiveGroup(null)} onLeave={handleLeaveGroup} />
          : <GroupsList onSelectGroup={setActiveGroup} />
      )}

      {/* AI Assistant */}
      {tab === 'assistant' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
          <View style={s.chatHeader}>
            <View style={s.avatarLav}><Text style={{ fontSize: 18 }}>🤖</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.chatTitle}>Duality Assistant</Text>
              <Text style={s.chatSub}>AI powered · usually instant</Text>
            </View>
            <TouchableOpacity onPress={() => setTab('human')}>
              <Text style={s.switchBtn}>Talk to team →</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            ref={aiListRef}
            data={aiLoading ? [...aiMessages, { id: 'typing', role: 'bot', body: '...' }] : aiMessages}
            keyExtractor={m => String(m.id)}
            contentContainerStyle={s.list}
            onContentSizeChange={() => aiListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => <Bubble msg={item} isMe={item.role === 'user'} showAuthor={false} />}
          />
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="Ask the assistant…"
              placeholderTextColor={T.muted}
              value={aiInput}
              onChangeText={setAiInput}
              returnKeyType="send"
              onSubmitEditing={sendAi}
            />
            <TouchableOpacity style={[s.sendBtn, (!aiInput.trim() || aiLoading) && s.disabled]} onPress={sendAi} disabled={!aiInput.trim() || aiLoading}>
              {aiLoading ? <ActivityIndicator color="#000" size="small" /> : <Text style={s.sendBtnText}>Send</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Studio Team DM */}
      {tab === 'human' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
          <View style={s.chatHeader}>
            <View style={s.avatarLime}><Text style={{ fontSize: 16, fontWeight: '700', color: '#000' }}>D</Text></View>
            <View>
              <Text style={s.chatTitle}>Mimi & the Team</Text>
              <Text style={s.chatSub}>Studio team · replies within a few hours</Text>
            </View>
          </View>
          {convLoading ? (
            <View style={s.center}><ActivityIndicator color={T.lime} /></View>
          ) : humanMessages.length === 0 ? (
            <View style={s.center}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>💬</Text>
              <Text style={s.emptyTitle}>Send us a message</Text>
              <Text style={s.emptySub}>We'd love to hear from you!</Text>
            </View>
          ) : (
            <FlatList
              ref={humanListRef}
              data={humanMessages}
              keyExtractor={m => String(m.id)}
              contentContainerStyle={s.list}
              onContentSizeChange={() => humanListRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item }) => <Bubble msg={item} isMe={item.sender === me?.id} showAuthor={item.sender !== me?.id} />}
            />
          )}
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="Type a message…"
              placeholderTextColor={T.muted}
              value={humanMsg}
              onChangeText={setHumanMsg}
              returnKeyType="send"
              onSubmitEditing={sendHuman}
            />
            <TouchableOpacity style={[s.sendBtn, (!humanMsg.trim() || sending) && s.disabled]} onPress={sendHuman} disabled={!humanMsg.trim() || sending}>
              {sending ? <ActivityIndicator color="#000" size="small" /> : <Text style={s.sendBtnText}>Send</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  // Tabs
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: T.lime },
  tabText: { fontSize: 12, color: T.muted },
  tabTextActive: { color: T.lime, fontWeight: '700' },

  // Chat header
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  chatTitle: { fontSize: 15, fontWeight: '700', color: T.text },
  chatSub: { fontSize: 12, color: T.sub, marginTop: 1 },
  avatarLav: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3a2060', alignItems: 'center', justifyContent: 'center' },
  avatarLime: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.lime, alignItems: 'center', justifyContent: 'center' },
  switchBtn: { fontSize: 12, color: T.lime },
  backBtn: { paddingRight: 8 },
  backBtnText: { fontSize: 13, color: T.lime, fontWeight: '600' },
  leaveBtn: { paddingLeft: 8 },
  leaveBtnText: { fontSize: 12, color: '#ef4444' },

  // Messages
  list: { padding: 14, gap: 4, flexGrow: 1 },
  row: { flexDirection: 'row', marginVertical: 1, alignItems: 'flex-end', gap: 6 },
  rowMe: { justifyContent: 'flex-end' },
  rowThem: { justifyContent: 'flex-start' },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 2 },
  avatarText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  avatarSpacer: { width: 28, flexShrink: 0 },
  authorName: { fontSize: 10, color: T.sub, marginBottom: 2, marginLeft: 2 },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMe: { backgroundColor: T.lime, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#1a1a1a', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: T.text, lineHeight: 20 },
  bubbleTextMe: { color: '#000' },
  bubbleTime: { fontSize: 10, color: T.sub, marginTop: 2, marginLeft: 2 },
  bubbleTimeMe: { color: T.sub, textAlign: 'right', marginRight: 2 },

  // Input
  inputRow: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: T.border, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#111', borderWidth: 1, borderColor: T.border, borderRadius: 22, color: T.text, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
  sendBtn: { backgroundColor: T.lime, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 10 },
  disabled: { opacity: 0.4 },
  sendBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },

  // Empty / center
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 6 },
  emptySub: { fontSize: 13, color: T.sub },

  // Groups list
  groupSectionLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: T.sub, fontWeight: '600', marginBottom: 8 },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: T.border },
  groupAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1a0f2e', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  groupAvatarText: { fontSize: 16, fontWeight: '700', color: T.lav },
  groupName: { fontSize: 14, fontWeight: '600', color: T.text, marginBottom: 2 },
  groupMeta: { fontSize: 12, color: T.sub },
  unreadBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: T.lime, alignItems: 'center', justifyContent: 'center' },
  unreadText: { fontSize: 10, fontWeight: '700', color: '#000' },
  chevron: { fontSize: 20, color: T.muted, marginLeft: 4 },
  discoverRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: T.border, gap: 12 },
  joinBtn: { backgroundColor: T.lime, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  joinBtnText: { color: '#000', fontWeight: '700', fontSize: 12 },
})
