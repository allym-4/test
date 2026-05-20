import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ScrollView, ActivityIndicator, Animated,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useApi } from '../hooks/useApi'
import { helpdesk } from '../api'

const LOCAL_FAQS = [
  {
    q: "I can't access the studio",
    a: "Download the Kisi app — you'll receive a separate email with access before your first class. You only need it if you're more than 15 minutes early or a couple of minutes late.\n\nThe door auto-unlocks 15 minutes before each class and stays open until 1 minute after start — just push the door during that window, no app needed.\n\nIf you're 5 or more minutes late, you're too late and will forfeit the class. Missing warm-up is a safety issue and the class cannot be disrupted — no exceptions.\n\nExample for a 7:30pm class: door open 7:15–7:31pm · Kisi access 6:45–7:34:59pm · door locked from 7:35pm.\n\nIf you have questions, chat with us below, email us or speak to your instructor.",
  },
  {
    q: "I need to cancel a class",
    a: "You can mark yourself away from My Classes. If you cancel more than 4 hours before class, you'll receive a catch-up credit. Within 4 hours, no credit is issued — but please still mark away so your instructor knows.",
  },
  {
    q: "How do catch-up credits work?",
    a: "When you mark away more than 4 hours before class, a catch-up credit is added to your account. You can use it to book into another class in the same season — any class you're eligible for. Credits don't carry over between seasons.",
  },
  {
    q: "What classes can I catch up in?",
    a: "For conditioning classes (Invert Tech, Tricks, Kiki, Unravel, etc.) and dance classes, you can catch up any week. For level classes (Level 1–6) and routine classes, catch-ups can only be booked up to and including Week 3 — after that, the class has a set routine.",
  },
  {
    q: "How does practice time work?",
    a: "If you're enrolled in 3 classes this season, you get 1 free practice session per week (Mon–Sun). 4 or more classes = unlimited free practice. Non-enrolled rates are $20/hr if enrolled in the season, $30/hr otherwise.",
  },
  {
    q: "How does the waitlist work?",
    a: "Join the waitlist from the booking screen. If a spot opens up, you'll receive a notification and have a window to claim it — the timing varies depending on how close the class is.",
  },
]

function FaqItem({ faq }) {
  const [open, setOpen] = useState(false)
  return (
    <View style={h.faqItem}>
      <TouchableOpacity style={h.faqHeader} onPress={() => setOpen(o => !o)} activeOpacity={0.7}>
        <Text style={h.faqQ}>{faq.q}</Text>
        <Text style={h.faqToggle}>{open ? '×' : '+'}</Text>
      </TouchableOpacity>
      {open && (
        <Text style={h.faqA}>{faq.a}</Text>
      )}
    </View>
  )
}

export default function HelpFloatingButton() {
  const [open, setOpen] = useState(false)
  const navigation = useNavigation()

  const { data: faqData, loading: faqLoading } = useApi(
    () => open ? helpdesk.faqs() : null, [open]
  )

  const apiFaqs = (faqData?.results ?? faqData ?? []).map(f => ({
    q: f.question,
    a: f.answer,
  }))
  const faqs = apiFaqs.length > 0 ? apiFaqs : LOCAL_FAQS

  function goToChat() {
    setOpen(false)
    // Small delay so modal closes before navigation
    setTimeout(() => {
      navigation.navigate('Community', { screen: 'Chat' })
    }, 200)
  }

  function goToSupport() {
    setOpen(false)
    setTimeout(() => {
      navigation.navigate('Account', { screen: 'Support' })
    }, 200)
  }

  return (
    <>
      {/* Floating button */}
      <TouchableOpacity style={h.fab} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Text style={h.fabText}>?</Text>
      </TouchableOpacity>

      {/* Help panel */}
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={h.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        />
        <View style={h.sheet}>
          {/* Header */}
          <View style={h.sheetHeader}>
            <View>
              <Text style={h.sheetTitle}>I need help</Text>
              <Text style={h.sheetSub}>Quick answers & ways to reach us</Text>
            </View>
            <TouchableOpacity onPress={() => setOpen(false)} style={h.closeBtn}>
              <Text style={h.closeBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={h.scroll} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            {/* FAQ section */}
            <Text style={h.sectionLabel}>COMMON QUESTIONS</Text>
            {faqLoading ? (
              <ActivityIndicator color="#ccff00" style={{ marginVertical: 20 }} />
            ) : (
              faqs.map((faq, i) => <FaqItem key={i} faq={faq} />)
            )}

            {/* Action buttons */}
            <Text style={[h.sectionLabel, { marginTop: 20 }]}>GET IN TOUCH</Text>

            <TouchableOpacity style={h.chatBtn} onPress={goToChat} activeOpacity={0.85}>
              <View>
                <Text style={h.chatBtnTitle}>Chat with assistant</Text>
                <Text style={h.chatBtnSub}>Get instant answers about classes, bookings & policies</Text>
              </View>
              <Text style={h.chatBtnArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity style={h.supportBtn} onPress={goToSupport} activeOpacity={0.85}>
              <View>
                <Text style={h.supportBtnTitle}>Contact the team</Text>
                <Text style={h.supportBtnSub}>Lodge a ticket or message us directly</Text>
              </View>
              <Text style={h.supportBtnArrow}>→</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </>
  )
}

const h = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ccff00',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    shadowColor: '#ccff00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: { fontSize: 22, fontWeight: '900', color: '#000', lineHeight: 26 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 2 },
  sheetSub: { fontSize: 13, color: '#666' },
  closeBtn: { borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginTop: 2 },
  closeBtnText: { color: '#666', fontWeight: '700', fontSize: 11, letterSpacing: 0.5 },
  scroll: { flex: 0 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#444', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  faqItem: { borderBottomWidth: 1, borderBottomColor: '#1e1e1e', paddingVertical: 2 },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 12 },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '600', color: '#ddd' },
  faqToggle: { fontSize: 20, color: '#ccff00', fontWeight: '300', width: 24, textAlign: 'center' },
  faqA: { fontSize: 13, color: '#888', lineHeight: 21, paddingBottom: 14, paddingRight: 32 },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(204,255,0,0.08)', borderWidth: 1.5, borderColor: 'rgba(204,255,0,0.3)',
    borderRadius: 14, padding: 16, marginBottom: 10,
  },
  chatBtnTitle: { fontSize: 15, fontWeight: '700', color: '#ccff00', marginBottom: 3 },
  chatBtnSub: { fontSize: 12, color: '#888' },
  chatBtnArrow: { fontSize: 18, color: '#ccff00', fontWeight: '700' },
  supportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333',
    borderRadius: 14, padding: 16,
  },
  supportBtnTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  supportBtnSub: { fontSize: 12, color: '#666' },
  supportBtnArrow: { fontSize: 18, color: '#888', fontWeight: '700' },
})
