import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
} from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { helpdesk, assistant } from '../../api'

const T = { bg: '#000', card: '#111', border: '#222', lime: '#ccff00', muted: '#555', text: '#fff', sub: '#888' }

export default function CommunityScreen() {
  const { user: me } = useAuth()
  const [thread, setThread] = useState('assistant')

  const [conv, setConv] = useState(null)
  const [convLoading, setConvLoading] = useState(true)
  const [humanMsg, setHumanMsg] = useState('')
  const [sending, setSending] = useState(false)
  const humanListRef = useRef(null)

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

  const humanMessages = conv?.messages || []

  function Bubble({ msg, isMe }) {
    return (
      <View style={[s.row, isMe ? s.rowMe : s.rowThem]}>
        <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
          <Text style={[s.bubbleText, isMe && s.bubbleTextMe]}>{msg.body}</Text>
          {msg.created_at && (
            <Text style={[s.bubbleTime, isMe && s.bubbleTimeMe]}>
              {msg.sender_detail?.display_name ? `${msg.sender_detail.display_name} · ` : ''}
              {new Date(msg.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, thread === 'assistant' && s.tabActive]} onPress={() => setThread('assistant')}>
          <Text style={[s.tabText, thread === 'assistant' && s.tabTextActive]}>🤖  Assistant</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, thread === 'human' && s.tabActive]} onPress={() => setThread('human')}>
          <Text style={[s.tabText, thread === 'human' && s.tabTextActive]}>💬  Studio Team</Text>
        </TouchableOpacity>
      </View>

      {thread === 'assistant' && (
        <>
          <View style={s.header}>
            <View style={s.avatarLav}><Text style={{ fontSize: 18 }}>🤖</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.headerName}>Duality Assistant</Text>
              <Text style={s.headerSub}>AI powered · usually instant</Text>
            </View>
            <TouchableOpacity onPress={() => setThread('human')}>
              <Text style={s.switchBtn}>Talk to team →</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            ref={aiListRef}
            data={aiLoading ? [...aiMessages, { id: 'typing', role: 'bot', body: '...' }] : aiMessages}
            keyExtractor={m => String(m.id)}
            contentContainerStyle={s.list}
            onContentSizeChange={() => aiListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => <Bubble msg={item} isMe={item.role === 'user'} />}
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
        </>
      )}

      {thread === 'human' && (
        <>
          <View style={s.header}>
            <View style={s.avatarLime}><Text style={{ fontSize: 16, fontWeight: '700', color: '#000' }}>D</Text></View>
            <View>
              <Text style={s.headerName}>Mimi & the Team</Text>
              <Text style={s.headerSub}>Studio team · replies within a few hours</Text>
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
              renderItem={({ item }) => <Bubble msg={item} isMe={item.sender === me?.id} />}
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
        </>
      )}
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: T.lime },
  tabText: { fontSize: 14, color: T.muted },
  tabTextActive: { color: T.lime, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  avatarLav: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3a2060', alignItems: 'center', justifyContent: 'center' },
  avatarLime: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.lime, alignItems: 'center', justifyContent: 'center' },
  headerName: { fontSize: 15, fontWeight: '700', color: T.text },
  headerSub: { fontSize: 12, color: T.sub, marginTop: 1 },
  switchBtn: { fontSize: 12, color: T.lime },
  list: { padding: 14, gap: 6, flexGrow: 1 },
  row: { flexDirection: 'row', marginVertical: 2 },
  rowMe: { justifyContent: 'flex-end' },
  rowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMe: { backgroundColor: T.lime, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#1a1a1a', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: T.text, lineHeight: 20 },
  bubbleTextMe: { color: '#000' },
  bubbleTime: { fontSize: 10, color: T.sub, marginTop: 3, textAlign: 'right' },
  bubbleTimeMe: { color: 'rgba(0,0,0,0.4)' },
  inputRow: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: T.border, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#111', borderWidth: 1, borderColor: T.border, borderRadius: 22, color: T.text, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
  sendBtn: { backgroundColor: T.lime, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 10 },
  disabled: { opacity: 0.4 },
  sendBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 6 },
  emptySub: { fontSize: 13, color: T.sub },
})
