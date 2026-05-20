import { useState, useEffect } from 'react'
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, ActivityIndicator, Modal,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { classes as classesApi, payments as paymentsApi } from '../../api'

const CASH_DISCOUNT = 5

function fmt(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr > 12 ? hr - 12 : hr || 12}:${m}${hr >= 12 ? 'pm' : 'am'}`
}

function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

export default function PracticeScreen() {
  const today = new Date().toISOString().split('T')[0]

  const { data: slotsData, loading: slotsLoading, refetch } = useApi(
    () => classesApi.practice.list({ date_from: today }), []
  )
  const { data: myData, loading: myLoading, refetch: refetchMy } = useApi(
    () => classesApi.practice.myBookings(), []
  )

  const [booking, setBooking] = useState(null)
  const [cancelling, setCancelling] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [savedCard, setSavedCard] = useState(null)
  const [cardLoading, setCardLoading] = useState(false)

  const slots = slotsData?.results ?? slotsData ?? []
  const myBookings = myData?.results ?? myData ?? []
  const upcomingBookings = myBookings.filter(b => b.status === 'confirmed' && (b.slot?.date ?? '') >= today)
  const availableSlots = slots.filter(s => (s.spots_left > 0 || s.is_booked))

  useEffect(() => {
    if (!booking || booking.price_for_me === 0) return
    setCardLoading(true)
    paymentsApi.stripe.paymentMethods()
      .then(r => {
        const cards = r.data?.payment_methods || []
        setSavedCard(cards[0] || null)
      })
      .catch(() => setSavedCard(null))
      .finally(() => setCardLoading(false))
  }, [booking])

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([refetch(), refetchMy()])
    setRefreshing(false)
  }

  async function handleBook(paymentMethod) {
    if (!booking || busy) return
    setBusy(true)
    try {
      await classesApi.practice.book(booking.id, { payment_method: paymentMethod })
      setResult({ type: 'booked', slot: booking, price: booking.price_for_me, paymentMethod })
      setBooking(null)
      refetch()
      refetchMy()
    } catch (e) {
      const data = e.response?.data
      if (data?.requires_card) {
        setResult({ type: 'error', msg: 'A saved card is required to book practice time. Add one in Account → Billing.' })
      } else {
        setResult({ type: 'error', msg: data?.detail || 'Something went wrong.' })
      }
      setBooking(null)
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel() {
    if (!cancelling || busy) return
    setBusy(true)
    try {
      await classesApi.practice.cancel(cancelling.slot.id)
      setCancelling(null)
      refetch()
      refetchMy()
    } catch {
      Alert.alert('Error', 'Could not cancel booking. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const loading = slotsLoading || myLoading
  const isPaid = booking && booking.price_for_me > 0
  const cashPrice = isPaid ? Math.max(0, booking.price_for_me - CASH_DISCOUNT) : 0

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ccff00" />}
    >
      <Text style={s.heading}>Practice Time</Text>
      <Text style={s.sub}>
        Book open practice sessions in the studio.{'\n'}
        Enrolled students $20/hr · Non-enrolled $30/hr · 3 classes = 1 free/week · 4+ = unlimited free.
      </Text>

      {/* My upcoming bookings */}
      {upcomingBookings.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>Your bookings</Text>
          {upcomingBookings.map(b => (
            <View key={b.id} style={s.myBookingCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.myBookingStudio}>{b.slot?.studio_detail?.name}</Text>
                <Text style={s.myBookingTime}>
                  {fmtDate(b.slot?.date)} · {fmt(b.slot?.start_time)}–{fmt(b.slot?.end_time)}
                </Text>
                <Text style={[s.myBookingPrice, b.is_free ? s.priceGreen : b.payment_type === 'cash' ? s.priceAmber : s.priceLav]}>
                  {b.is_free
                    ? '✓ Free'
                    : b.payment_type === 'cash'
                    ? `$${parseFloat(b.price_charged ?? 0).toFixed(0)} — pay cash at reception`
                    : b.payment_type === 'card'
                    ? `$${parseFloat(b.price_charged ?? 0).toFixed(0)} — paid by card`
                    : `$${parseFloat(b.price_charged ?? 0).toFixed(0)}`}
                </Text>
              </View>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setCancelling(b)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Available slots */}
      <Text style={s.sectionLabel}>Available sessions</Text>
      {loading && slots.length === 0 ? (
        <ActivityIndicator color="#ccff00" style={{ marginTop: 24 }} />
      ) : availableSlots.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>
            {slots.length === 0
              ? 'No practice sessions scheduled yet — check back soon.'
              : 'All upcoming sessions are full or already booked.'}
          </Text>
        </View>
      ) : (
        availableSlots.map(slot => (
          <View key={slot.id} style={[s.slotCard, slot.is_booked && s.slotCardBooked]}>
            <View style={{ flex: 1 }}>
              <View style={s.slotTitleRow}>
                <Text style={s.slotStudio}>{slot.studio_detail?.name}</Text>
                {slot.is_booked && <View style={s.bookedBadge}><Text style={s.bookedBadgeText}>BOOKED</Text></View>}
              </View>
              <Text style={s.slotTime}>
                {fmtDate(slot.date)} · {fmt(slot.start_time)}–{fmt(slot.end_time)}
              </Text>
              <View style={s.slotMeta}>
                <Text style={[s.slotPrice, slot.price_for_me === 0 ? s.priceGreen : s.priceLav]}>
                  {slot.price_for_me === 0 ? 'Free' : `$${slot.price_for_me}`}
                </Text>
                <Text style={s.spotsLeft}>
                  {slot.spots_left} spot{slot.spots_left !== 1 ? 's' : ''} left
                </Text>
              </View>
              {!!slot.notes && <Text style={s.slotNotes}>{slot.notes}</Text>}
            </View>
            {!slot.is_booked && (
              <TouchableOpacity style={s.bookBtn} onPress={() => { setBooking(slot); setResult(null) }}>
                <Text style={s.bookBtnText}>Book</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}

      <View style={{ height: 40 }} />

      {/* Confirm booking modal */}
      <Modal visible={!!booking && !result} transparent animationType="fade" onRequestClose={() => setBooking(null)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setBooking(null)}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Confirm booking</Text>
            <Text style={s.modalStudio}>{booking?.studio_detail?.name}</Text>
            <Text style={s.modalTime}>{booking ? `${fmtDate(booking.date)} · ${fmt(booking.start_time)}–${fmt(booking.end_time)}` : ''}</Text>

            {!isPaid ? (
              <>
                <Text style={[s.modalPrice, s.priceGreen]}>Free — no charge</Text>
                <View style={s.modalActions}>
                  <TouchableOpacity style={s.modalGhostBtn} onPress={() => setBooking(null)}>
                    <Text style={s.modalGhostBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.modalConfirmBtn, busy && { opacity: 0.6 }]} onPress={() => handleBook('free')} disabled={busy}>
                    {busy ? <ActivityIndicator color="#000" size="small" /> : <Text style={s.modalConfirmBtnText}>Confirm</Text>}
                  </TouchableOpacity>
                </View>
              </>
            ) : cardLoading ? (
              <ActivityIndicator color="#ccff00" style={{ marginVertical: 20 }} />
            ) : (
              <>
                <Text style={s.payLabel}>How would you like to pay?</Text>

                {/* Card option */}
                <TouchableOpacity
                  style={[s.payOption, savedCard ? s.payOptionCard : s.payOptionDisabled]}
                  onPress={() => savedCard && handleBook('card')}
                  disabled={busy || !savedCard}
                  activeOpacity={savedCard ? 0.8 : 1}
                >
                  <Text style={[s.payOptionTitle, { color: savedCard ? '#b0a0ff' : '#555' }]}>
                    Pay by card — ${booking?.price_for_me}
                  </Text>
                  <Text style={s.payOptionSub}>
                    {savedCard ? `Charge •••• ${savedCard.last4} now` : 'No saved card — add one in Account → Billing'}
                  </Text>
                </TouchableOpacity>

                {/* Cash option */}
                <TouchableOpacity
                  style={[s.payOption, savedCard ? s.payOptionCash : s.payOptionDisabled]}
                  onPress={() => savedCard && handleBook('cash')}
                  disabled={busy || !savedCard}
                  activeOpacity={savedCard ? 0.8 : 1}
                >
                  <Text style={[s.payOptionTitle, { color: savedCard ? '#ffaa00' : '#555' }]}>
                    Pay cash at reception — ${cashPrice}{'  '}
                    <Text style={{ fontSize: 11, fontWeight: '400' }}>($5 off)</Text>
                  </Text>
                  <Text style={s.payOptionSub}>
                    Your card is held as security but won't be charged unless you don't show up or don't pay.
                  </Text>
                </TouchableOpacity>

                {busy && <ActivityIndicator color="#ccff00" style={{ marginBottom: 12 }} />}
                <TouchableOpacity style={s.modalGhostBtn} onPress={() => setBooking(null)}>
                  <Text style={s.modalGhostBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Result modal */}
      <Modal visible={!!result} transparent animationType="fade" onRequestClose={() => setResult(null)}>
        <View style={s.overlay}>
          <View style={s.modalSheet}>
            {result?.type === 'booked' ? (
              <>
                <Text style={s.resultEmoji}>🎉</Text>
                <Text style={s.modalTitle}>You're in!</Text>
                <Text style={s.resultBody}>
                  {result.slot ? `${fmtDate(result.slot.date)} · ${fmt(result.slot.start_time)}–${fmt(result.slot.end_time)}\n` : ''}
                  {result.price === 0
                    ? 'No charge — enjoy your free session!'
                    : result.paymentMethod === 'card'
                    ? `$${result.price} charged to your saved card.`
                    : `$${Math.max(0, result.price - CASH_DISCOUNT)} — pay cash at reception when you arrive. Your card is held but not charged.`}
                </Text>
              </>
            ) : (
              <>
                <Text style={s.resultEmoji}>😬</Text>
                <Text style={s.modalTitle}>Couldn't book</Text>
                <Text style={s.resultBody}>{result?.msg}</Text>
              </>
            )}
            <TouchableOpacity style={[s.modalConfirmBtn, { marginTop: 4 }]} onPress={() => setResult(null)}>
              <Text style={s.modalConfirmBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cancel confirm modal */}
      <Modal visible={!!cancelling} transparent animationType="fade" onRequestClose={() => setCancelling(null)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setCancelling(null)}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Cancel practice booking?</Text>
            <Text style={s.modalTime}>
              {cancelling ? `${fmtDate(cancelling.slot?.date)} · ${fmt(cancelling.slot?.start_time)}–${fmt(cancelling.slot?.end_time)} at ${cancelling.slot?.studio_detail?.name}` : ''}
            </Text>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalGhostBtn} onPress={() => setCancelling(null)}>
                <Text style={s.modalGhostBtnText}>Keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalCancelConfirmBtn, busy && { opacity: 0.6 }]} onPress={handleCancel} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.modalCancelConfirmBtnText}>Yes, cancel</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20 },
  heading: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6 },
  sub: { fontSize: 13, color: '#666', lineHeight: 20, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  myBookingCard: { backgroundColor: '#111', borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#222', flexDirection: 'row', alignItems: 'center', gap: 12 },
  myBookingStudio: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 },
  myBookingTime: { fontSize: 13, color: '#888', marginBottom: 4 },
  myBookingPrice: { fontSize: 12, fontWeight: '600' },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#333', borderRadius: 8 },
  cancelBtnText: { fontSize: 13, color: '#ef4444', fontWeight: '500' },

  slotCard: { backgroundColor: '#111', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#222', flexDirection: 'row', alignItems: 'center', gap: 12 },
  slotCardBooked: { borderColor: '#ccff00' },
  slotTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  slotStudio: { fontSize: 14, fontWeight: '600', color: '#fff' },
  bookedBadge: { backgroundColor: '#ccff00', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  bookedBadgeText: { fontSize: 10, fontWeight: '700', color: '#000' },
  slotTime: { fontSize: 13, color: '#888', marginBottom: 6 },
  slotMeta: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  slotPrice: { fontSize: 12, fontWeight: '600' },
  spotsLeft: { fontSize: 12, color: '#666' },
  slotNotes: { fontSize: 11, color: '#555', marginTop: 4 },
  bookBtn: { backgroundColor: '#ccff00', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, flexShrink: 0 },
  bookBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },

  priceGreen: { color: '#ccff00' },
  priceLav: { color: '#b0a0ff' },
  priceAmber: { color: '#ffaa00' },

  emptyCard: { backgroundColor: '#111', borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  emptyText: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalSheet: { backgroundColor: '#111', borderRadius: 16, padding: 24, width: '100%', borderWidth: 1, borderColor: '#222' },
  resultEmoji: { fontSize: 36, textAlign: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 6 },
  modalStudio: { fontSize: 14, color: '#888', marginBottom: 2 },
  modalTime: { fontSize: 14, color: '#ccc', marginBottom: 8 },
  modalPrice: { fontSize: 16, fontWeight: '700', marginBottom: 20 },
  resultBody: { fontSize: 13, color: '#888', lineHeight: 20, marginBottom: 20, textAlign: 'center' },
  payLabel: { fontSize: 12, color: '#666', marginBottom: 10 },
  payOption: { borderRadius: 12, padding: 14, marginBottom: 10 },
  payOptionCard: { backgroundColor: 'rgba(176,160,255,0.08)', borderWidth: 1, borderColor: 'rgba(176,160,255,0.3)' },
  payOptionCash: { backgroundColor: 'rgba(255,170,0,0.06)', borderWidth: 1, borderColor: 'rgba(255,170,0,0.3)' },
  payOptionDisabled: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: '#222' },
  payOptionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  payOptionSub: { fontSize: 12, color: '#666', lineHeight: 18 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalGhostBtn: { flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalGhostBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  modalConfirmBtn: { flex: 1, backgroundColor: '#ccff00', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalConfirmBtnText: { fontSize: 14, fontWeight: '800', color: '#000' },
  modalCancelConfirmBtn: { flex: 1, backgroundColor: '#ef4444', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalCancelConfirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
})
