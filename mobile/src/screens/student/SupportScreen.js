import { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, FlatList, KeyboardAvoidingView, Platform,
  ActivityIndicator, Modal,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { helpdesk } from '../../api'

const T = { bg: '#000', card: '#111', border: '#222', lime: '#ccff00', muted: '#555', text: '#fff', sub: '#888' }

const FAQS = [
  { q: 'How do I cancel or reschedule a class?', a: 'You can cancel a booking up to 24 hours before the class starts without a fee. To cancel, go to My Classes and tap the booking. Cancellations within 24 hours may incur a late cancellation fee of $10. If you miss a class without cancelling, a $20 no-show fee applies.' },
  { q: 'Can I freeze my membership?', a: 'Yes! You can freeze your season membership for up to 8 weeks once per season. Freezes require 7 days notice. To request a freeze, message us via the Studio Team tab in Community or email hello@dualitypole.com.au.' },
  { q: 'How do makeup credits work?', a: 'If you have an approved absence (e.g., illness, injury), we may issue a makeup credit. Credits can be used to book any equivalent or lower level class within 60 days. You can see your credits in your Billing section.' },
  { q: 'What should I wear to class?', a: 'Wear comfortable activewear that leaves your legs, arms, and midriff exposed — your skin helps you grip the pole! Avoid moisturisers or fake tan before class. Bring grippy socks for warm-up and cool-down.' },
  { q: 'Is there parking nearby?', a: 'The Box (Surry Hills): Street parking on Kippax St and surrounding streets. Rhapsody (Crown St): Limited street parking. The nearest train station is Central.' },
  { q: 'What happens if a class is cancelled?', a: "If we cancel a class, you'll be notified by email as soon as possible. A makeup credit will automatically be added to your account. You can use this credit to book any equivalent class within 60 days." },
  { q: 'How do I enrol for a new season?', a: "Season enrolments open approximately 4 weeks before the new season starts. Current students get priority access for the first 48 hours. You'll receive an email when enrolments open." },
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

function statusColor(status) {
  if (!status) return T.sub
  const s = status.toLowerCase()
  if (s === 'open') return T.lime
  if (s === 'pending') return '#f59e0b'
  return T.sub
}

function TicketThreadModal({ ticket, onClose }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)
  const isClosed = ticket.status === 'resolved' || ticket.status === 'closed'

  useEffect(() => {
    helpdesk.myTicketMessages(ticket.id)
      .then(r => setMessages(r.data?.results || r.data || []))
      .finally(() => setLoading(false))
  }, [ticket.id])

  async function handleReply() {
    if (!reply.trim() || sending) return
    const body = reply
    setReply('')
    setSending(true)
    try {
      const res = await helpdesk.myTicketReply(ticket.id, { body })
      setMessages(m => [...m, res.data])
    } catch {
      setReply(body)
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={tt.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        {/* Header */}
        <View style={tt.header}>
          <View style={{ flex: 1 }}>
            <Text style={tt.subject} numberOfLines={1}>{ticket.subject}</Text>
            <View style={tt.meta}>
              <Text style={tt.metaItem}>#{ticket.id}</Text>
              <Text style={[tt.metaItem, { color: statusColor(ticket.status), fontWeight: '700' }]}>{ticket.status?.toUpperCase()}</Text>
              {ticket.category ? <Text style={tt.metaItem}>{ticket.category}</Text> : null}
            </View>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={tt.close}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        {loading ? (
          <View style={tt.center}><ActivityIndicator color={T.lime} /></View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => String(m.id)}
            contentContainerStyle={tt.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={<Text style={tt.empty}>No messages yet — we'll be in touch soon.</Text>}
            renderItem={({ item }) => {
              const isMe = item.sender_detail?.role === 'student'
              return (
                <View style={[tt.row, isMe ? tt.rowMe : tt.rowThem]}>
                  <View style={[tt.bubble, isMe ? tt.bubbleMe : tt.bubbleThem]}>
                    {!isMe && <Text style={tt.bubbleSender}>Duality Studio</Text>}
                    <Text style={[tt.bubbleText, isMe && tt.bubbleTextMe]}>{item.body}</Text>
                    <Text style={[tt.bubbleTime, isMe && tt.bubbleTimeMe]}>
                      {item.created_at ? new Date(item.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                  </View>
                </View>
              )
            }}
          />
        )}

        {/* Reply */}
        {isClosed ? (
          <View style={tt.closedBar}>
            <Text style={tt.closedText}>This ticket is {ticket.status}. Contact us to reopen.</Text>
          </View>
        ) : (
          <View style={tt.inputRow}>
            <TextInput
              style={tt.input}
              value={reply}
              onChangeText={setReply}
              placeholder="Add a reply…"
              placeholderTextColor={T.muted}
              multiline
            />
            <TouchableOpacity
              style={[tt.sendBtn, (!reply.trim() || sending) && tt.sendBtnDisabled]}
              onPress={handleReply}
              disabled={!reply.trim() || sending}
            >
              {sending ? <ActivityIndicator color="#000" size="small" /> : <Text style={tt.sendBtnText}>Send</Text>}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  )
}

const tt = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: T.border, gap: 12 },
  subject: { fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 4 },
  meta: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  metaItem: { fontSize: 11, color: T.sub },
  close: { fontSize: 20, color: T.sub, paddingTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 8, flexGrow: 1 },
  empty: { textAlign: 'center', color: T.sub, fontSize: 13, marginTop: 40 },
  row: { flexDirection: 'row', marginVertical: 2 },
  rowMe: { justifyContent: 'flex-end' },
  rowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: T.border, borderBottomRightRadius: 3 },
  bubbleThem: { backgroundColor: 'rgba(176,160,255,0.12)', borderWidth: 1, borderColor: 'rgba(176,160,255,0.2)', borderBottomLeftRadius: 3 },
  bubbleSender: { fontSize: 10, fontWeight: '700', color: '#b0a0ff', marginBottom: 3 },
  bubbleText: { fontSize: 14, color: T.text, lineHeight: 20 },
  bubbleTextMe: { color: T.text },
  bubbleTime: { fontSize: 9, color: T.sub, marginTop: 4, textAlign: 'right' },
  bubbleTimeMe: { color: T.sub },
  closedBar: { padding: 16, borderTopWidth: 1, borderTopColor: T.border, alignItems: 'center' },
  closedText: { fontSize: 13, color: T.sub },
  inputRow: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: T.border, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#111', borderWidth: 1, borderColor: T.border, borderRadius: 16, color: T.text, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendBtn: { backgroundColor: T.lime, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 10 },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
})

export default function SupportScreen() {
  const { data: ticketsData, refetch: refetchTickets } = useApi(() => helpdesk.myTickets(), [])
  const tickets = ticketsData?.results || ticketsData || []

  const [tab, setTab] = useState('faq')
  const [openFaq, setOpenFaq] = useState(null)
  const [viewTicket, setViewTicket] = useState(null)

  // Contact form state
  const [category, setCategory] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)

  async function handleSubmit() {
    if (!category || !subject.trim() || !message.trim() || submitting) return
    setSubmitting(true)
    try {
      await helpdesk.submitTicket({ subject, category, body: message })
      setSent(true)
      setCategory('')
      setSubject('')
      setMessage('')
      refetchTickets()
    } catch {
      // silent — form stays filled
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={s.root}>
      {/* Tab bar */}
      <View style={s.tabs}>
        {[['faq', 'FAQs'], ['contact', 'Contact Us'], ['tickets', `My Tickets${tickets.length ? ` (${tickets.length})` : ''}`]].map(([key, label]) => (
          <TouchableOpacity key={key} style={[s.tab, tab === key && s.tabActive]} onPress={() => setTab(key)}>
            <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* FAQs */}
      {tab === 'faq' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.content}>
          {FAQS.map((faq, i) => (
            <TouchableOpacity
              key={i}
              style={s.faqCard}
              onPress={() => setOpenFaq(openFaq === i ? null : i)}
              activeOpacity={0.8}
            >
              <View style={s.faqRow}>
                <Text style={s.faqQ}>{faq.q}</Text>
                <Text style={[s.faqChevron, openFaq === i && s.faqChevronOpen]}>+</Text>
              </View>
              {openFaq === i && (
                <Text style={s.faqA}>{faq.a}</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Contact Us */}
      {tab === 'contact' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {sent ? (
            <View style={s.sentState}>
              <Text style={s.sentIcon}>✓</Text>
              <Text style={s.sentTitle}>Message sent!</Text>
              <Text style={s.sentSub}>We'll get back to you within 24 hours. Track your request in the My Tickets tab.</Text>
              <TouchableOpacity style={s.sentBtn} onPress={() => setSent(false)}>
                <Text style={s.sentBtnText}>Send another</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.sentBtn, s.sentBtnLime]} onPress={() => { setSent(false); setTab('tickets') }}>
                <Text style={[s.sentBtnText, { color: '#000' }]}>View my tickets</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={s.contactBanner}>
                <Text style={s.contactBannerTitle}>Get in touch</Text>
                <Text style={s.contactBannerSub}>We try to respond within 24 hours. Submitted messages appear in the My Tickets tab so you can track the conversation.</Text>
              </View>

              <Text style={s.fieldLabel}>Category</Text>
              <TouchableOpacity style={s.selectBtn} onPress={() => setShowCategoryPicker(true)}>
                <Text style={category ? s.selectText : s.selectPlaceholder}>{category || 'Select a category…'}</Text>
                <Text style={s.selectArrow}>›</Text>
              </TouchableOpacity>

              <Text style={s.fieldLabel}>Subject</Text>
              <TextInput
                style={s.textInput}
                value={subject}
                onChangeText={setSubject}
                placeholder="Brief description of your issue…"
                placeholderTextColor={T.muted}
              />

              <Text style={s.fieldLabel}>Message</Text>
              <TextInput
                style={[s.textInput, { height: 120, textAlignVertical: 'top' }]}
                value={message}
                onChangeText={setMessage}
                placeholder="Tell us what's going on…"
                placeholderTextColor={T.muted}
                multiline
              />

              <TouchableOpacity
                style={[s.submitBtn, (!category || !subject.trim() || !message.trim() || submitting) && s.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!category || !subject.trim() || !message.trim() || submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#000" />
                  : <Text style={s.submitBtnText}>Send Message</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {/* My Tickets */}
      {tab === 'tickets' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.content}>
          {tickets.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>📬</Text>
              <Text style={s.emptyTitle}>No support requests yet</Text>
              <Text style={s.emptySub}>Use the Contact Us tab to get in touch.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setTab('contact')}>
                <Text style={s.emptyBtnText}>Contact Us</Text>
              </TouchableOpacity>
            </View>
          ) : tickets.map(ticket => (
            <TouchableOpacity key={ticket.id} style={s.ticketCard} onPress={() => setViewTicket(ticket)} activeOpacity={0.8}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.ticketSubject} numberOfLines={1}>{ticket.subject}</Text>
                <View style={s.ticketMeta}>
                  {ticket.category ? <Text style={s.ticketMetaText}>{ticket.category}</Text> : null}
                  <Text style={s.ticketMetaText}>{new Date(ticket.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  {ticket.message_count > 0 ? <Text style={s.ticketMetaText}>{ticket.message_count} message{ticket.message_count !== 1 ? 's' : ''}</Text> : null}
                </View>
              </View>
              <View style={s.ticketRight}>
                <View style={[s.statusBadge, { borderColor: statusColor(ticket.status) + '44', backgroundColor: statusColor(ticket.status) + '11' }]}>
                  <Text style={[s.statusBadgeText, { color: statusColor(ticket.status) }]}>{ticket.status?.toUpperCase()}</Text>
                </View>
                <Text style={s.ticketArrow}>View →</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Category picker modal */}
      <Modal visible={showCategoryPicker} transparent animationType="slide" onRequestClose={() => setShowCategoryPicker(false)}>
        <TouchableOpacity style={s.pickerOverlay} activeOpacity={1} onPress={() => setShowCategoryPicker(false)}>
          <View style={s.pickerSheet}>
            <Text style={s.pickerTitle}>Select category</Text>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c} style={s.pickerItem} onPress={() => { setCategory(c); setShowCategoryPicker(false) }}>
                <Text style={[s.pickerItemText, category === c && s.pickerItemTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {viewTicket && <TicketThreadModal ticket={viewTicket} onClose={() => setViewTicket(null)} />}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.border },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: T.lime },
  tabText: { fontSize: 13, color: T.muted },
  tabTextActive: { color: T.lime, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  // FAQs
  faqCard: { backgroundColor: T.card, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  faqRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '600', color: T.text, lineHeight: 20 },
  faqChevron: { fontSize: 20, color: T.sub, flexShrink: 0 },
  faqChevronOpen: { color: T.lime },
  faqA: { fontSize: 13, color: T.sub, lineHeight: 21, paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#111', paddingTop: 12 },

  // Contact form
  contactBanner: { backgroundColor: 'rgba(204,255,0,0.06)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.15)', borderRadius: 12, padding: 16, marginBottom: 20 },
  contactBannerTitle: { fontSize: 14, fontWeight: '700', color: T.text, marginBottom: 6 },
  contactBannerSub: { fontSize: 13, color: T.sub, lineHeight: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: T.sub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 4 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 14 },
  selectText: { flex: 1, fontSize: 14, color: T.text },
  selectPlaceholder: { flex: 1, fontSize: 14, color: T.muted },
  selectArrow: { fontSize: 18, color: T.sub },
  textInput: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: T.border, borderRadius: 10, color: T.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 14 },
  submitBtn: { backgroundColor: T.lime, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },

  // Sent state
  sentState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  sentIcon: { fontSize: 52, color: T.lime, fontWeight: '800' },
  sentTitle: { fontSize: 20, fontWeight: '800', color: T.text },
  sentSub: { fontSize: 13, color: T.sub, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  sentBtn: { borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  sentBtnLime: { backgroundColor: T.lime, borderColor: T.lime },
  sentBtnText: { fontSize: 14, fontWeight: '600', color: T.text },

  // My Tickets
  ticketCard: { backgroundColor: T.card, borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: T.border, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  ticketSubject: { fontSize: 14, fontWeight: '600', color: T.text, marginBottom: 4 },
  ticketMeta: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  ticketMetaText: { fontSize: 11, color: T.sub },
  ticketRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  ticketArrow: { fontSize: 11, color: '#b0a0ff' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 6, marginTop: 8 },
  emptySub: { fontSize: 13, color: T.sub, marginBottom: 20, textAlign: 'center' },
  emptyBtn: { borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: T.text },

  // Category picker
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  pickerSheet: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 44 },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 16 },
  pickerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  pickerItemText: { fontSize: 15, color: T.text },
  pickerItemTextActive: { color: T.lime, fontWeight: '700' },
})
