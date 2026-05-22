import { useState, useRef, useEffect } from 'react'
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, FlatList, KeyboardAvoidingView, Platform,
  Modal, ActivityIndicator, Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useApi } from '../../hooks/useApi'
import { helpdesk, settings as settingsApi } from '../../api'

const LOCAL_FAQS = [
  { q: "I can't access the studio", a: "Download the Kisi app — you'll receive a separate email with access before your first class. You only need it if you're more than 15 minutes early or a couple of minutes late.\n\nThe door auto-unlocks 15 minutes before each class and stays open until 1 minute after start — just push the door during that window, no app needed.\n\nIf you're 5 or more minutes late, you're too late and will forfeit the class. Missing warm-up is a safety issue and the class cannot be disrupted — no exceptions." },
  { q: "I need to cancel a class", a: "You can mark yourself away from My Classes. If you cancel more than 4 hours before class, you'll receive a catch-up credit. Within 4 hours, no credit is issued — but please still mark away so your instructor knows." },
  { q: "How do catch-up credits work?", a: "When you mark away more than 4 hours before class, a catch-up credit is added to your account. You can use it to book into another class in the same season — any class you're eligible for. Credits don't carry over between seasons." },
  { q: "What classes can I catch up in?", a: "For conditioning classes (Invert Tech, Tricks, Kiki, Unravel, etc.) and dance classes, you can catch up any week. For level classes (Level 1–6) and routine classes, catch-ups can only be booked up to and including Week 3 — after that, the class has a set routine." },
  { q: "How does practice time work?", a: "If you're enrolled in 3 classes this season, you get 1 free practice session per week (Mon–Sun). 4 or more classes = unlimited free practice. Non-enrolled rates are $20/hr if enrolled in the season, $30/hr otherwise." },
  { q: "How does the waitlist work?", a: "Join the waitlist from the booking screen. If a spot opens up, you'll receive a notification and have a window to claim it — the timing varies depending on how close the class is." },
]

const CATEGORIES = [
  'Attendance & Make-ups',
  'Billing & Payments',
  'Enrolment & Class Changes',
  'Injury & Medical',
  'Locker & Access',
  'Technical Issue',
  'Other',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
}

function statusColor(status) {
  if (!status) return '#555'
  const s = status.toLowerCase()
  if (s === 'open') return '#ccff00'
  if (s === 'pending') return '#f59e0b'
  return '#555'
}

// ─── FAQ Accordion ────────────────────────────────────────────────────────────

function FaqItem({ faq, open, onToggle }) {
  return (
    <View style={[s.faqCard, open && s.faqCardOpen]}>
      <TouchableOpacity style={s.faqHeader} onPress={onToggle} activeOpacity={0.7}>
        {faq.icon ? <Text style={s.faqIcon}>{faq.icon}</Text> : null}
        <Text style={s.faqQ}>{faq.q}</Text>
        <Text style={[s.faqChevron, open && s.faqChevronOpen]}>{open ? '×' : '+'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={s.faqBody}>
          {faq.a.split('\n\n').map((para, i) => (
            <View key={i} style={i > 0 ? { marginTop: 10 } : {}}>
              {para.split('\n').map((line, j) => (
                <Text key={j} style={[s.faqA, j > 0 && { marginTop: 3 }]}>{line}</Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

// ─── Ticket Thread Modal ──────────────────────────────────────────────────────

function TicketThreadModal({ ticket, onClose }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const flatRef = useRef(null)

  useEffect(() => {
    helpdesk.myTicketMessages(ticket.id)
      .then(r => setMessages(r.data?.results ?? r.data ?? []))
      .finally(() => setLoading(false))
  }, [ticket.id])

  useEffect(() => {
    if (flatRef.current && messages.length > 0) {
      flatRef.current.scrollToEnd({ animated: true })
    }
  }, [messages])

  async function handleReply() {
    const body = reply.trim()
    if (!body || sending) return
    setSending(true)
    setReply('')
    try {
      const res = await helpdesk.myTicketReply(ticket.id, { body })
      setMessages(prev => [...prev, res.data])
    } catch {
      Alert.alert('Error', 'Failed to send reply — please try again.')
      setReply(body)
    } finally {
      setSending(false)
    }
  }

  const isClosed = ticket.status === 'resolved' || ticket.status === 'closed'

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.threadRoot}>
        <View style={s.threadHeader}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={s.threadTitle} numberOfLines={1}>{ticket.subject}</Text>
            <View style={s.threadMeta}>
              <Text style={s.threadMetaText}>#{ticket.id}</Text>
              <Text style={[s.threadStatus, { color: statusColor(ticket.status) }]}>
                {ticket.status?.toUpperCase()}
              </Text>
              {!!ticket.category && <Text style={s.threadMetaText}>{ticket.category}</Text>}
              <Text style={s.threadMetaText}>{fmtDate(ticket.created_at)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.threadClose}>✕</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={80}
        >
          {loading ? (
            <ActivityIndicator color="#ccff00" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              ref={flatRef}
              data={messages}
              keyExtractor={m => String(m.id)}
              contentContainerStyle={s.messageList}
              onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={s.emptyState}>
                  <Text style={s.emptyText}>No messages yet — we'll be in touch soon.</Text>
                </View>
              }
              renderItem={({ item }) => {
                const isMe = item.sender_detail?.role === 'student'
                return (
                  <View style={[s.msgRow, isMe ? s.msgRowMine : s.msgRowTheirs]}>
                    <View style={[s.msgBubble, isMe ? s.msgBubbleMine : s.msgBubbleTheirs]}>
                      {!isMe && <Text style={s.msgSender}>{studioSettings?.studio_name || 'Studio'}</Text>}
                      <Text style={[s.msgBody, isMe && s.msgBodyMine]}>{item.body}</Text>
                      <Text style={[s.msgTime, isMe && s.msgTimeMine]}>{fmtTime(item.created_at)}</Text>
                    </View>
                  </View>
                )
              }}
            />
          )}

          <View style={s.replyRow}>
            {isClosed ? (
              <View style={s.closedNote}>
                <Text style={s.closedNoteText}>This ticket is {ticket.status}. Contact us to reopen.</Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={s.replyInput}
                  value={reply}
                  onChangeText={setReply}
                  placeholder="Add a reply…"
                  placeholderTextColor="#555"
                  multiline
                  maxLength={2000}
                  editable={!sending}
                />
                <TouchableOpacity
                  style={[s.replySendBtn, (!reply.trim() || sending) && s.replySendBtnDisabled]}
                  onPress={handleReply}
                  disabled={!reply.trim() || sending}
                >
                  {sending
                    ? <ActivityIndicator size="small" color="#000" />
                    : <Text style={s.replySendBtnText}>Send</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const TABS = ['faqs', 'contact', 'tickets']
const TAB_LABELS = { faqs: 'FAQs', contact: 'Contact Us', tickets: 'My Tickets' }

export default function SupportScreen() {
  const navigation = useNavigation()
  const [tab, setTab] = useState('faqs')
  const [openFaq, setOpenFaq] = useState(null)

  const { data: faqData, loading: faqLoading } = useApi(() => helpdesk.faqs(), [])
  const apiFaqs = (faqData?.results ?? faqData ?? []).map(f => ({ icon: f.icon, q: f.question, a: f.answer }))
  const faqs = apiFaqs.length > 0 ? apiFaqs : LOCAL_FAQS
  const { data: studioSettings } = useApi(() => settingsApi.get(), [])

  const [category, setCategory] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const { data: ticketsData, refetch: refetchTickets } = useApi(() => helpdesk.myTickets(), [])
  const [viewTicket, setViewTicket] = useState(null)

  const tickets = ticketsData?.results ?? ticketsData ?? []

  async function handleSubmit() {
    if (!category || !subject.trim() || !message.trim() || submitting) return
    setSubmitting(true)
    try {
      await helpdesk.submitTicket({ subject: subject.trim(), category, body: message.trim() })
      setSent(true)
      setCategory('')
      setSubject('')
      setMessage('')
      refetchTickets()
    } catch {
      Alert.alert('Error', 'Failed to send message — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function selectCategory() {
    Alert.alert('Category', 'Select a category', [
      ...CATEGORIES.map(c => ({ text: c, onPress: () => setCategory(c) })),
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  return (
    <View style={s.root}>
      <View style={s.tabBar}>
        {TABS.map(key => (
          <TouchableOpacity
            key={key}
            style={[s.tabBtn, tab === key && s.tabBtnActive]}
            onPress={() => setTab(key)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabBtnText, tab === key && s.tabBtnTextActive]}>
              {key === 'tickets' && tickets.length > 0
                ? `${TAB_LABELS[key]} (${tickets.length})`
                : TAB_LABELS[key]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'faqs' && (
        <ScrollView contentContainerStyle={s.content}>
          <TouchableOpacity
            style={s.chatBtn}
            onPress={() => navigation.navigate('Community', { screen: 'Chat' })}
            activeOpacity={0.85}
          >
            <View>
              <Text style={s.chatBtnTitle}>Chat with assistant</Text>
              <Text style={s.chatBtnSub}>Get instant answers about classes, bookings & policies</Text>
            </View>
            <Text style={s.chatBtnArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.dmBtn}
            onPress={() => navigation.navigate('Community', { screen: 'CommunityHome' })}
            activeOpacity={0.85}
          >
            <View>
              <Text style={s.dmBtnTitle}>Message Mimi & Chloe</Text>
              <Text style={s.dmBtnSub}>Chat directly with the studio team</Text>
            </View>
            <Text style={s.dmBtnArrow}>→</Text>
          </TouchableOpacity>

          <Text style={[s.sectionHeading, { marginTop: 20 }]}>Frequently Asked Questions</Text>
          {faqLoading ? (
            <ActivityIndicator color="#ccff00" style={{ marginTop: 24 }} />
          ) : faqs.map((faq, i) => (
            <FaqItem
              key={i}
              faq={faq}
              open={openFaq === i}
              onToggle={() => setOpenFaq(openFaq === i ? null : i)}
            />
          ))}
          <View style={s.contactPrompt}>
            <Text style={s.contactPromptText}>Can't find what you're looking for?</Text>
            <TouchableOpacity onPress={() => setTab('contact')}>
              <Text style={s.contactPromptLink}>Contact us →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {tab === 'contact' && (
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {sent ? (
            <View style={s.sentState}>
              <Text style={s.sentEmoji}>✓</Text>
              <Text style={s.sentTitle}>Message sent!</Text>
              <Text style={s.sentBody}>We'll get back to you within 24 hours. Track your request in the My Tickets tab.</Text>
              <View style={s.sentActions}>
                <TouchableOpacity style={s.ghostBtn} onPress={() => setSent(false)}>
                  <Text style={s.ghostBtnText}>Send another</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.limeBtn} onPress={() => setTab('tickets')}>
                  <Text style={s.limeBtnText}>View my tickets</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={s.infoCard}>
                <Text style={s.infoCardTitle}>Get in touch</Text>
                <Text style={s.infoCardBody}>We try to respond within 24 hours. Submitted messages appear in the My Tickets tab so you can track the conversation.</Text>
              </View>

              <Text style={s.fieldLabel}>Category</Text>
              <TouchableOpacity style={s.selectBtn} onPress={selectCategory}>
                <Text style={category ? s.selectBtnText : s.selectBtnPlaceholder}>
                  {category || 'Select a category…'}
                </Text>
                <Text style={s.selectArrow}>›</Text>
              </TouchableOpacity>

              <Text style={[s.fieldLabel, { marginTop: 14 }]}>Subject</Text>
              <TextInput
                style={s.textInput}
                value={subject}
                onChangeText={setSubject}
                placeholder="Brief description of your issue…"
                placeholderTextColor="#555"
                maxLength={200}
              />

              <Text style={[s.fieldLabel, { marginTop: 14 }]}>Message</Text>
              <TextInput
                style={[s.textInput, s.textArea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Tell us what's going on…"
                placeholderTextColor="#555"
                multiline
                textAlignVertical="top"
                maxLength={2000}
              />

              <TouchableOpacity
                style={[s.limeBtn, { marginTop: 16 }, (!category || !subject.trim() || !message.trim() || submitting) && s.limeBtnDisabled]}
                onPress={handleSubmit}
                disabled={!category || !subject.trim() || !message.trim() || submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#000" />
                  : <Text style={s.limeBtnText}>Send Message</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {tab === 'tickets' && (
        <ScrollView contentContainerStyle={s.content}>
          {tickets.length === 0 ? (
            <View style={s.emptyTickets}>
              <Text style={s.emptyTicketsEmoji}>📬</Text>
              <Text style={s.emptyTicketsTitle}>No support requests yet</Text>
              <Text style={s.emptyTicketsBody}>Use the Contact Us tab to get in touch.</Text>
              <TouchableOpacity style={[s.ghostBtn, { marginTop: 16 }]} onPress={() => setTab('contact')}>
                <Text style={s.ghostBtnText}>Contact Us</Text>
              </TouchableOpacity>
            </View>
          ) : (
            tickets.map(ticket => (
              <TouchableOpacity
                key={ticket.id}
                style={s.ticketCard}
                onPress={() => setViewTicket(ticket)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.ticketSubject} numberOfLines={1}>{ticket.subject}</Text>
                  <View style={s.ticketMeta}>
                    {!!ticket.category && <Text style={s.ticketMetaText}>{ticket.category}</Text>}
                    <Text style={s.ticketMetaText}>{fmtDate(ticket.created_at)}</Text>
                    {ticket.message_count > 0 && (
                      <Text style={s.ticketMetaText}>{ticket.message_count} message{ticket.message_count !== 1 ? 's' : ''}</Text>
                    )}
                  </View>
                </View>
                <View style={s.ticketRight}>
                  <View style={[s.statusBadge, { borderColor: statusColor(ticket.status) + '44', backgroundColor: statusColor(ticket.status) + '18' }]}>
                    <Text style={[s.statusText, { color: statusColor(ticket.status) }]}>{ticket.status?.toUpperCase()}</Text>
                  </View>
                  <Text style={s.ticketViewLink}>View →</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {viewTicket && (
        <TicketThreadModal ticket={viewTicket} onClose={() => setViewTicket(null)} />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  tabBar: { flexDirection: 'row', backgroundColor: '#000', borderBottomWidth: 1, borderBottomColor: '#222' },
  tabBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#ccff00' },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: '#555' },
  tabBtnTextActive: { color: '#ccff00' },

  content: { padding: 16, paddingBottom: 40 },
  sectionHeading: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 14 },

  chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(204,255,0,0.08)', borderWidth: 1.5, borderColor: 'rgba(204,255,0,0.3)', borderRadius: 14, padding: 16, marginBottom: 10 },
  chatBtnTitle: { fontSize: 15, fontWeight: '700', color: '#ccff00', marginBottom: 3 },
  chatBtnSub: { fontSize: 12, color: '#888' },
  chatBtnArrow: { fontSize: 18, color: '#ccff00', fontWeight: '700' },
  dmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 14, padding: 16, marginBottom: 10 },
  dmBtnTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  dmBtnSub: { fontSize: 12, color: '#666' },
  dmBtnArrow: { fontSize: 18, color: '#888', fontWeight: '700' },

  faqCard: { backgroundColor: '#111', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#222', overflow: 'hidden' },
  faqCardOpen: { borderColor: 'rgba(204,255,0,0.2)' },
  faqHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  faqIcon: { fontSize: 18, flexShrink: 0 },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '600', color: '#fff', lineHeight: 20 },
  faqChevron: { fontSize: 20, color: '#555', fontWeight: '300', lineHeight: 24 },
  faqChevronOpen: { color: '#ccff00' },
  faqBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#1a1a1a', paddingTop: 12 },
  faqA: { fontSize: 13, color: '#aaa', lineHeight: 21 },

  contactPrompt: { marginTop: 20, alignItems: 'center', gap: 6 },
  contactPromptText: { fontSize: 13, color: '#555' },
  contactPromptLink: { fontSize: 14, fontWeight: '600', color: '#ccff00' },

  infoCard: { backgroundColor: 'rgba(204,255,0,0.06)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.15)', borderRadius: 12, padding: 14, marginBottom: 20 },
  infoCardTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 4 },
  infoCardBody: { fontSize: 12, color: '#888', lineHeight: 19 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#0a0a0a' },
  selectBtnText: { fontSize: 15, color: '#fff' },
  selectBtnPlaceholder: { fontSize: 15, color: '#555' },
  selectArrow: { fontSize: 18, color: '#555' },
  textInput: { borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#fff', backgroundColor: '#0a0a0a' },
  textArea: { height: 120, textAlignVertical: 'top' },

  limeBtn: { backgroundColor: '#ccff00', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  limeBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  limeBtnDisabled: { opacity: 0.4 },
  ghostBtn: { borderWidth: 1, borderColor: '#333', borderRadius: 12, paddingVertical: 12, alignItems: 'center', paddingHorizontal: 20 },
  ghostBtnText: { fontSize: 14, fontWeight: '600', color: '#ccc' },

  sentState: { alignItems: 'center', paddingVertical: 48 },
  sentEmoji: { fontSize: 52, color: '#ccff00', fontWeight: '700', marginBottom: 12 },
  sentTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 8 },
  sentBody: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 20 },
  sentActions: { flexDirection: 'row', gap: 10 },

  ticketCard: { backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#222', flexDirection: 'row', alignItems: 'center', gap: 12 },
  ticketSubject: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 4 },
  ticketMeta: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  ticketMetaText: { fontSize: 11, color: '#555' },
  ticketRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  statusBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '700' },
  ticketViewLink: { fontSize: 11, color: '#b0a0ff' },

  emptyTickets: { alignItems: 'center', paddingVertical: 60 },
  emptyTicketsEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTicketsTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 6 },
  emptyTicketsBody: { fontSize: 13, color: '#555', textAlign: 'center' },

  threadRoot: { flex: 1, backgroundColor: '#000' },
  threadHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  threadTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  threadMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  threadMetaText: { fontSize: 10, color: '#555' },
  threadStatus: { fontSize: 10, fontWeight: '700' },
  threadClose: { fontSize: 18, color: '#555', padding: 2 },

  messageList: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 13, color: '#555', textAlign: 'center' },

  msgRow: { marginBottom: 10 },
  msgRowMine: { alignItems: 'flex-end' },
  msgRowTheirs: { alignItems: 'flex-start' },
  msgBubble: { maxWidth: '80%', borderRadius: 14, padding: 12 },
  msgBubbleMine: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderBottomRightRadius: 3 },
  msgBubbleTheirs: { backgroundColor: 'rgba(176,160,255,0.12)', borderWidth: 1, borderColor: 'rgba(176,160,255,0.25)', borderBottomLeftRadius: 3 },
  msgSender: { fontSize: 10, fontWeight: '700', color: '#b0a0ff', marginBottom: 4 },
  msgBody: { fontSize: 14, color: '#fff', lineHeight: 21 },
  msgBodyMine: { color: '#ddd' },
  msgTime: { fontSize: 9, color: '#555', marginTop: 4, textAlign: 'right' },
  msgTimeMine: { color: '#444' },

  replyRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#222', alignItems: 'flex-end', gap: 8, backgroundColor: '#000' },
  replyInput: { flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, color: '#fff', backgroundColor: '#111', maxHeight: 100 },
  replySendBtn: { backgroundColor: '#ccff00', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 9 },
  replySendBtnDisabled: { backgroundColor: '#3a4a00' },
  replySendBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
  closedNote: { flex: 1, alignItems: 'center', padding: 12 },
  closedNoteText: { fontSize: 12, color: '#555', textAlign: 'center' },
})
