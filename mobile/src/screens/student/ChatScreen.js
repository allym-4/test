import { useState, useRef, useEffect, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { helpdesk, assistant } from '../../api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

const TABS = ['Studio', 'Assistant']

function TabBar({ active, onChange }) {
  return (
    <View style={s.tabBar}>
      {TABS.map((tab, i) => (
        <TouchableOpacity
          key={tab}
          style={[s.tabBtn, active === i && s.tabBtnActive]}
          onPress={() => onChange(i)}
          activeOpacity={0.8}
        >
          <Text style={[s.tabBtnText, active === i && s.tabBtnTextActive]}>{tab}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

// ─── Studio tab (DM with studio team) ────────────────────────────────────────

function StudioMessage({ msg, userId }) {
  const mine = msg.sender === userId || msg.sender?.id === userId
  return (
    <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
      {!mine && (
        <Text style={s.senderName}>{msg.sender?.display_name ?? 'Studio'}</Text>
      )}
      <Text style={[s.bubbleText, mine && s.bubbleTextMine]}>
        {msg.body ?? msg.message}
      </Text>
      <Text style={[s.bubbleTime, mine && s.bubbleTimeMine]}>
        {formatTime(msg.created_at)}
      </Text>
    </View>
  )
}

function StudioTab({ userId }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const flatRef = useRef(null)

  const { data: convData, loading, refetch } = useApi(
    () => helpdesk.myConversation(),
    [],
  )
  const messages = convData?.messages ?? []

  async function send() {
    const body = text.trim()
    if (!body) return
    setSending(true)
    setText('')
    try {
      await helpdesk.sendMyDm({ body })
      refetch()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not send message.')
      setText(body)
    } finally {
      setSending(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={110}
    >
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => String(m.id)}
        renderItem={({ item }) => <StudioMessage msg={item} userId={userId} />}
        contentContainerStyle={s.messageList}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#ccff00" style={s.centered} />
          ) : (
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>Send us a message</Text>
              <Text style={s.emptyBody}>Our team usually replies within a few hours.</Text>
            </View>
          )
        }
      />
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="Message..."
          placeholderTextColor="#555"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
          onPress={send}
          disabled={!text.trim() || sending}
          activeOpacity={0.8}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.sendBtnText}>Send</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Assistant tab ────────────────────────────────────────────────────────────

const GREETING = {
  id: '__greeting__',
  role: 'assistant',
  text: "Hi! I'm your studio assistant. Ask me anything about classes, bookings, or studio policies.",
}

function AssistantBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <View style={[s.bubble, isUser ? s.bubbleMine : s.bubbleTheirs]}>
      {!isUser && <Text style={s.senderName}>Studio Assistant</Text>}
      <Text style={[s.bubbleText, isUser && s.bubbleTextMine]}>{msg.text}</Text>
    </View>
  )
}

function TypingIndicator() {
  return (
    <View style={[s.bubble, s.bubbleTheirs, s.typingBubble]}>
      <Text style={s.typingDots}>● ● ●</Text>
    </View>
  )
}

function AssistantTab() {
  const [messages, setMessages] = useState([GREETING])
  const [text, setText] = useState('')
  const [thinking, setThinking] = useState(false)
  const flatRef = useRef(null)

  useEffect(() => {
    if (flatRef.current) {
      flatRef.current.scrollToEnd({ animated: true })
    }
  }, [messages, thinking])

  async function send() {
    const body = text.trim()
    if (!body || thinking) return
    setText('')
    const userMsg = { id: Date.now(), role: 'user', text: body }
    setMessages(prev => [...prev, userMsg])
    setThinking(true)
    try {
      const res = await assistant.chat(body)
      const reply = res?.data?.reply ?? 'Sorry, I didn\'t understand that.'
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: reply }])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', text: 'Sorry, something went wrong. Please try again.' },
      ])
    } finally {
      setThinking(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={110}
    >
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => String(m.id)}
        renderItem={({ item }) => <AssistantBubble msg={item} />}
        contentContainerStyle={s.messageList}
        ListFooterComponent={thinking ? <TypingIndicator /> : null}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
      />
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="Ask anything..."
          placeholderTextColor="#555"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          editable={!thinking}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!text.trim() || thinking) && s.sendBtnDisabled]}
          onPress={send}
          disabled={!text.trim() || thinking}
          activeOpacity={0.8}
        >
          {thinking
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.sendBtnText}>Send</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(0)

  return (
    <View style={s.root}>
      <TabBar active={activeTab} onChange={setActiveTab} />
      {activeTab === 0
        ? <StudioTab userId={user?.id} />
        : <AssistantTab />
      }
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  centered: { marginTop: 60 },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: '#ccff00' },
  tabBtnText: { fontSize: 15, fontWeight: '600', color: '#555' },
  tabBtnTextActive: { color: '#ccff00' },

  // Messages
  messageList: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },

  // Bubbles
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  bubbleMine: {
    backgroundColor: '#ccff00',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: '#111',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#222',
  },
  senderName: { fontSize: 11, fontWeight: '600', color: '#666', marginBottom: 2 },
  bubbleText: { fontSize: 15, color: '#fff' },
  bubbleTextMine: { color: '#000' },
  bubbleTime: { fontSize: 10, color: '#666', marginTop: 4, textAlign: 'right' },
  bubbleTimeMine: { color: 'rgba(0,0,0,0.5)' },

  // Typing indicator
  typingBubble: { paddingVertical: 10, paddingHorizontal: 16 },
  typingDots: { fontSize: 12, color: '#555', letterSpacing: 4 },

  // Input row
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#222',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#fff',
    backgroundColor: '#111',
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#ccff00',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendBtnDisabled: { backgroundColor: '#3a4a00' },
  sendBtnText: { color: '#000', fontWeight: '600' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 6 },
  emptyBody: { fontSize: 14, color: '#666', textAlign: 'center' },
})
