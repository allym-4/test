import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  TextInput, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../contexts/AuthContext'
import { helpdesk } from '../../api'

// ── Conversation list ─────────────────────────────────────────────────────────

function ConversationList({ onSelect }) {
  const { data, loading } = useApi(() => helpdesk.conversations(), [])
  const convs = data?.results ?? data ?? []

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" />
  }

  if (convs.length === 0) {
    return <Text style={s.empty}>No conversations yet.</Text>
  }

  return (
    <FlatList
      data={convs}
      keyExtractor={c => String(c.id)}
      contentContainerStyle={s.list}
      renderItem={({ item }) => {
        const studentName =
          item.student_name ?? item.student?.display_name ?? `Student #${item.student}`
        const lastMsg = item.last_message
        const hasUnread = item.unread_count > 0

        return (
          <TouchableOpacity style={s.convRow} onPress={() => onSelect(item)}>
            <View style={s.convRowInner}>
              {hasUnread && <View style={s.unreadDot} />}
              <View style={s.convText}>
                <View style={s.convMeta}>
                  <Text style={[s.convName, hasUnread && s.convNameUnread]}>
                    {studentName}
                  </Text>
                  {hasUnread && (
                    <View style={s.unreadBadge}>
                      <Text style={s.unreadBadgeText}>{item.unread_count}</Text>
                    </View>
                  )}
                </View>
                {lastMsg?.body ? (
                  <Text style={s.convPreview} numberOfLines={1}>
                    {lastMsg.body}
                  </Text>
                ) : null}
              </View>
              <Text style={s.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        )
      }}
    />
  )
}

// ── Thread view ───────────────────────────────────────────────────────────────

function Thread({ conv, onBack }) {
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
      {/* Header */}
      <View style={s.threadHeader}>
        <TouchableOpacity onPress={onBack} style={s.back}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.threadTitle} numberOfLines={1}>{studentName}</Text>
      </View>

      {/* Messages */}
      {loadingMsgs ? (
        <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => String(m.id)}
          contentContainerStyle={s.messageList}
          ListEmptyComponent={
            <Text style={s.empty}>No messages yet. Say hello!</Text>
          }
          onContentSizeChange={() =>
            messages.length > 0 && flatRef.current?.scrollToEnd({ animated: false })
          }
          renderItem={({ item }) => {
            const fromStudent =
              item.sender_role === 'student' || item.sender?.role === 'student'
            return (
              <View
                style={[
                  s.bubbleWrap,
                  fromStudent ? s.bubbleWrapLeft : s.bubbleWrapRight,
                ]}
              >
                <View style={[s.bubble, fromStudent ? s.bubbleLeft : s.bubbleRight]}>
                  {fromStudent && (
                    <Text style={s.bubbleSender}>
                      {item.sender?.display_name ?? studentName}
                    </Text>
                  )}
                  <Text style={[s.bubbleBody, fromStudent ? s.bubbleBodyLeft : s.bubbleBodyRight]}>
                    {item.body}
                  </Text>
                  {item.created_at ? (
                    <Text style={s.bubbleTime}>
                      {new Date(item.created_at).toLocaleTimeString('en-AU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  ) : null}
                </View>
              </View>
            )
          }}
        />
      )}

      {/* Input */}
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor="#9ca3af"
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

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MessagesScreen() {
  const [selected, setSelected] = useState(null)

  if (selected) {
    return <Thread conv={selected} onBack={() => setSelected(null)} />
  }

  return (
    <View style={s.root}>
      <Text style={s.heading}>Messages</Text>
      <Text style={s.subheading}>Student conversations</Text>
      <ConversationList onSelect={setSelected} />
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },

  // List view
  heading: { fontSize: 20, fontWeight: '700', color: '#111827', padding: 16, paddingBottom: 2 },
  subheading: { fontSize: 13, color: '#6b7280', paddingHorizontal: 16, marginBottom: 8 },
  list: { paddingBottom: 24 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, paddingHorizontal: 24 },

  convRow: {
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  convRowInner: { flexDirection: 'row', alignItems: 'center' },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#6366f1', marginRight: 8, flexShrink: 0,
  },
  convText: { flex: 1, minWidth: 0 },
  convMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  convName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  convNameUnread: { color: '#6366f1' },
  unreadBadge: {
    backgroundColor: '#6366f1', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 1,
  },
  unreadBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  convPreview: { fontSize: 12, color: '#6b7280' },
  chevron: { fontSize: 20, color: '#d1d5db', marginLeft: 8 },

  // Thread header
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  back: { paddingHorizontal: 12, paddingVertical: 4 },
  backText: { color: '#6366f1', fontWeight: '600', fontSize: 15 },
  threadTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827', marginRight: 16 },

  // Messages
  messageList: { padding: 16, paddingBottom: 8 },
  bubbleWrap: { marginBottom: 10 },
  bubbleWrapLeft: { alignItems: 'flex-start' },
  bubbleWrapRight: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '75%', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
  },
  bubbleLeft: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  bubbleRight: { backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe' },
  bubbleSender: { fontSize: 10, color: '#9ca3af', marginBottom: 3 },
  bubbleBody: { fontSize: 14, lineHeight: 20 },
  bubbleBodyLeft: { color: '#111827' },
  bubbleBodyRight: { color: '#3730a3' },
  bubbleTime: { fontSize: 10, color: '#9ca3af', marginTop: 4, textAlign: 'right' },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: '#111827',
    maxHeight: 100,
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 64,
  },
  sendBtnDisabled: { backgroundColor: '#a5b4fc' },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
