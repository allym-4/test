import { useState, useRef, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { assistant } from '../../api'

const SUGGESTIONS = [
  'Mark all my classes from last week as everyone present',
  'Who has a no-show fee this week?',
  'Send a message to Dana saying she did amazing tonight',
  'Move Jess from Level 2 Monday to Level 2 Thursday',
  "Who's coming to my class today?",
  'Issue a makeup credit to Tara — she was sick',
  'Add a $20 no-show fee to Emma from Tuesday',
  "What's on the waitlist for Level 3?",
]

const INITIAL = {
  id: 0,
  role: 'assistant',
  text: "Hey! I'm your studio assistant. I can look up students, mark attendance in bulk, move people between classes, send messages, issue credits, check waitlists, and more. Try one of the suggestions above, or just ask.",
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <View style={[b.row, isUser && b.rowUser]}>
      <View style={[b.avatar, isUser ? b.avatarUser : b.avatarBot]}>
        <Text style={b.avatarText}>{isUser ? '👤' : '🤖'}</Text>
      </View>
      <View style={[b.bubble, isUser ? b.bubbleUser : b.bubbleBot]}>
        {msg.text.split('\n').map((line, i) => (
          <Text key={i} style={b.bubbleText}>{line || ' '}</Text>
        ))}
      </View>
    </View>
  )
}

export default function AssistantScreen() {
  const [messages, setMessages] = useState([INITIAL])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef(null)

  const ask = useCallback(async (query) => {
    const q = query.trim()
    if (!q || loading) return
    setInput('')
    const userMsg = { id: Date.now(), role: 'user', text: q }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const res = await assistant.chat(q)
      const reply = res.data?.response || res.data?.reply || 'No response received.'
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: reply }])
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Something went wrong. Please try again.'
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: errMsg }])
    } finally {
      setLoading(false)
    }
  }, [loading])

  function clear() {
    setMessages([INITIAL])
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Assistant</Text>
          <Text style={s.sub}>Ask anything about students, attendance, or the studio</Text>
        </View>
        <TouchableOpacity style={s.clearBtn} onPress={clear}>
          <Text style={s.clearBtnText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={s.suggestions}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SUGGESTIONS}
          keyExtractor={item => item}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 4 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.chip} onPress={() => ask(item)}>
              <Text style={s.chipText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        ref={listRef}
        style={s.messageList}
        contentContainerStyle={{ padding: 16, gap: 14 }}
        data={loading ? [...messages, { id: 'loading', role: 'loading' }] : messages}
        keyExtractor={item => String(item.id)}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          if (item.role === 'loading') {
            return (
              <View style={[b.row]}>
                <View style={[b.avatar, b.avatarBot]}><Text style={b.avatarText}>🤖</Text></View>
                <View style={[b.bubble, b.bubbleBot]}><Text style={[b.bubbleText, { color: '#555' }]}>Thinking…</Text></View>
              </View>
            )
          }
          return <MessageBubble msg={item} />
        }}
      />

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask anything…"
          placeholderTextColor="#444"
          onSubmitEditing={() => ask(input)}
          returnKeyType="send"
          editable={!loading}
        />
        <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]} onPress={() => ask(input)} disabled={!input.trim() || loading}>
          {loading
            ? <ActivityIndicator size="small" color="#000" />
            : <Text style={s.sendBtnText}>→</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  sub: { fontSize: 12, color: '#555', marginTop: 2 },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#333', backgroundColor: '#1a1a1a' },
  clearBtnText: { fontSize: 12, fontWeight: '600', color: '#888' },
  suggestions: { borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  chip: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 12, color: '#ccc' },
  messageList: { flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: '#1a1a1a' },
  input: { flex: 1, backgroundColor: '#111', borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#fff' },
  sendBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#ccff00', alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { fontSize: 20, fontWeight: '700', color: '#000' },
})

const b = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowUser: { flexDirection: 'row-reverse' },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  avatarBot: { backgroundColor: '#ccff00' },
  avatarUser: { backgroundColor: '#b0a0ff' },
  avatarText: { fontSize: 14 },
  bubble: { borderRadius: 12, padding: 12, maxWidth: '85%' },
  bubbleBot: { backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderTopLeftRadius: 0 },
  bubbleUser: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#333', borderTopRightRadius: 0 },
  bubbleText: { fontSize: 13, color: '#e0e0e0', lineHeight: 20 },
})
