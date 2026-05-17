import { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { helpdesk } from '../../api'

function Message({ msg, userId }) {
  const mine = msg.sender === userId || msg.sender?.id === userId
  return (
    <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
      {!mine && <Text style={s.senderName}>{msg.sender?.display_name ?? 'Support'}</Text>}
      <Text style={[s.bubbleText, mine && s.bubbleTextMine]}>{msg.body ?? msg.message}</Text>
      <Text style={[s.bubbleTime, mine && s.bubbleTimeMine]}>
        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : ''}
      </Text>
    </View>
  )
}

export default function SupportScreen() {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const flatListRef = useRef(null)

  const { data: convData, loading, refetch } = useApi(() => helpdesk.myConversation(), [])
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
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={m => String(m.id)}
        renderItem={({ item }) => <Message msg={item} userId={user?.id} />}
        contentContainerStyle={s.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          loading ? null : (
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
          placeholderTextColor="#9ca3af"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]} onPress={send} disabled={!text.trim() || sending}>
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.sendBtnText}>Send</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  messageList: { padding: 16, paddingBottom: 8, flexGrow: 1, justifyContent: 'flex-end' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptyBody: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12, marginBottom: 8 },
  bubbleMine: { backgroundColor: '#6366f1', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  senderName: { fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 2 },
  bubbleText: { fontSize: 15, color: '#111827' },
  bubbleTextMine: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: '#9ca3af', marginTop: 4, textAlign: 'right' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)' },
  inputRow: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#111827', maxHeight: 100 },
  sendBtn: { backgroundColor: '#6366f1', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10 },
  sendBtnDisabled: { backgroundColor: '#a5b4fc' },
  sendBtnText: { color: '#fff', fontWeight: '600' },
})
