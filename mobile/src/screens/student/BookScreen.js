import { useState, useEffect, useMemo } from 'react'
import {
  ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, ActivityIndicator, Modal, Switch,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useStripe } from '@stripe/stripe-react-native'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { classes, enrolments, seasons, attendance, settings as settingsApi, payments } from '../../api'
import client from '../../api/client'

// ─── theme ───────────────────────────────────────────────────────────────────
const T = {
  bg: '#000',
  card: '#111',
  border: '#222',
  text: '#fff',
  muted: '#666',
  lime: '#ccff00',
  purple: '#7c3aed',
  purpleDark: '#1a0f2e',
}

// ─── tabs ────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'season',    label: 'Book a Season' },
  { key: 'casual',    label: 'Casual / Drop-in' },
  { key: 'trial',     label: 'Trial Class' },
  { key: 'workshops', label: 'Workshops & Events' },
]

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmtDateHeader(dateStr) {
  // dateStr: "2025-05-12" → "MON 12 MAY"
  const d = new Date(dateStr + 'T00:00')
  const day = d.toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase()
  const num = d.getDate()
  const mon = d.toLocaleDateString('en-AU', { month: 'short' }).toUpperCase()
  return `${day} ${num} ${mon}`
}

function fmtTime(t) {
  if (!t) return ''
  return t.slice(0, 5)
}

function groupByDate(occurrences) {
  const map = {}
  const order = []
  for (const occ of occurrences) {
    const key = occ.date ?? ''
    if (!map[key]) { map[key] = []; order.push(key) }
    map[key].push(occ)
  }
  return order.map(date => ({ date, items: map[date] }))
}

function getSessionName(occ) {
  return occ.session?.name ?? occ.session_name ?? occ.name ?? 'Class'
}

function getInstructor(occ) {
  const inst = occ.session?.instructor_detail ?? occ.instructor_detail
  if (!inst) return null
  return inst.display_name ?? inst.first_name ?? null
}

function getSessionId(occ) {
  // occ.session is the raw FK integer from the API; occ.session_detail?.id is the nested form
  return (typeof occ.session === 'number' ? occ.session : null)
    ?? occ.session_detail?.id
    ?? occ.session?.id
    ?? occ.session_id
    ?? occ.id
}

function isEligible(occ, userLevel) {
  if (!userLevel) return true
  const sessLevel = occ.session?.level ?? occ.level
  if (!sessLevel) return true
  if (typeof sessLevel === 'object') return sessLevel.name === userLevel || String(sessLevel.id) === String(userLevel)
  return String(sessLevel) === String(userLevel)
}

function getLevelBadge(name) {
  if (!name) return null
  if (/level\s*1/i.test(name)) return { label: 'Level 1', color: '#ccff00', bg: 'rgba(204,255,0,0.12)' }
  if (/level\s*2/i.test(name)) return { label: 'Level 2', color: '#b0a0ff', bg: 'rgba(176,160,255,0.12)' }
  if (/level\s*[3-9]/i.test(name)) return { label: 'Level 3+', color: '#ffaa00', bg: 'rgba(255,170,0,0.12)' }
  return null
}

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── HeadsUpModal ────────────────────────────────────────────────────────────
function HeadsUpModal({ session, onConfirm, onCancel }) {
  if (!session) return null
  const name = getSessionName(session)
  const day = session.day_of_week != null ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][session.day_of_week] : ''
  const time = fmtTime(session.start_time)
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onCancel}>
      <View style={hu.overlay}>
        <View style={hu.sheet}>
          <View style={hu.header}>
            <Text style={hu.title}>Heads up</Text>
            <TouchableOpacity onPress={onCancel} style={hu.closeBtn}>
              <Text style={hu.closeBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
          <Text style={hu.warn}>⚠</Text>
          <Text style={hu.classLine}>{name}{day ? ` · ${day}` : ''}{time ? ` ${time}` : ''}</Text>
          <Text style={hu.body}>
            Your current level doesn't match this class. Please make sure you've checked with your instructor before enrolling — they'll be able to confirm if you're ready to step up.
          </Text>
          <View style={hu.actions}>
            <TouchableOpacity style={hu.confirmBtn} onPress={onConfirm}>
              <Text style={hu.confirmText}>I'VE CHECKED — BOOK IT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={hu.cancelBtn} onPress={onCancel}>
              <Text style={hu.cancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const hu = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 44 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  title: { flex: 1, fontSize: 26, fontWeight: '800', color: T.text },
  closeBtn: { paddingLeft: 12 },
  closeBtnText: { color: T.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  warn: { fontSize: 36, textAlign: 'center', marginBottom: 12 },
  classLine: { fontSize: 17, fontWeight: '700', color: T.text, marginBottom: 12 },
  body: { fontSize: 14, color: '#bbb', lineHeight: 22, marginBottom: 28 },
  actions: { flexDirection: 'row', gap: 12 },
  confirmBtn: { flex: 1, backgroundColor: T.lime, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  confirmText: { color: '#000', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  cancelBtn: { backgroundColor: T.card, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: T.border },
  cancelText: { color: T.muted, fontWeight: '700', fontSize: 13 },
})

// ─── SeasonCheckoutModal ──────────────────────────────────────────────────────
const STRIPE_APPEARANCE = {
  colors: {
    primary: '#ccff00',
    background: '#111111',
    componentBackground: '#1a1a1a',
    componentText: '#ffffff',
    primaryText: '#ffffff',
    secondaryText: '#888888',
    placeholderText: '#555555',
    icon: '#888888',
    error: '#ff4444',
  },
}

function calcPlanSchedule(frequency, startFromSeason, upcomingSeason, total) {
  const start = (!startFromSeason || !upcomingSeason?.start_date)
    ? new Date()
    : new Date(upcomingSeason.start_date + 'T00:00')
  const end = upcomingSeason?.end_date ? new Date(upcomingSeason.end_date + 'T00:00') : null
  const fmt = d => d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })

  if (frequency === 'monthly') {
    const amt = (total / 2).toFixed(2)
    const d2 = new Date(start); d2.setDate(d2.getDate() + 28)
    return [
      { label: 'First payment', date: fmt(start), amount: amt },
      { label: 'Final payment', date: fmt(d2), amount: amt },
    ]
  }
  if (frequency === 'fortnightly') {
    const msEnd = end ? end.getTime() : start.getTime() + 90 * 86400000
    const count = Math.max(2, Math.ceil((msEnd - start.getTime()) / (14 * 86400000)))
    const amt = (total / count).toFixed(2)
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(start); d.setDate(d.getDate() + i * 14)
      return { label: i === 0 ? 'First payment' : i === count - 1 ? 'Final payment' : `Payment ${i + 1}`, date: fmt(d), amount: amt }
    })
  }
  // weekly
  const msEnd = end ? end.getTime() : start.getTime() + 90 * 86400000
  const count = Math.max(2, Math.ceil((msEnd - start.getTime()) / (7 * 86400000)))
  const amt = (total / count).toFixed(2)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i * 7)
    return { label: i === 0 ? 'First payment' : i === count - 1 ? 'Final payment' : `Payment ${i + 1}`, date: fmt(d), amount: amt }
  })
}

function CashCalendar({ selected, onSelect }) {
  const today = new Date()
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const startDow = today.getDay()
  const totalCells = Math.ceil((startDow + 21) / 7) * 7
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const off = i - startDow
    if (off < 0 || off >= 21) return null
    const d = new Date(today); d.setDate(d.getDate() + off)
    return d
  })
  const rows = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  const isSel = d => selected && d && d.toDateString() === selected.toDateString()

  return (
    <View>
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {DAYS.map(d => <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: T.muted, fontWeight: '700' }}>{d}</Text>)}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', marginBottom: 4 }}>
          {row.map((d, di) => (
            <TouchableOpacity
              key={di}
              style={[sc.calCell, !d && { opacity: 0 }, isSel(d) && sc.calCellSelected]}
              onPress={() => d && onSelect(d)}
              disabled={!d}
              activeOpacity={0.7}
            >
              {d && <Text style={[sc.calCellText, isSel(d) && sc.calCellTextSelected]}>{d.getDate()}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  )
}

function SeasonCheckoutModal({ visible, sessions, totalPrice, seasonName, upcomingSeason, onClose, onConfirm }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe()

  const [payOption, setPayOption] = useState('full')
  const [promoCode, setPromoCode] = useState('')
  const [promoValidating, setPromoValidating] = useState(false)
  const [promoResult, setPromoResult] = useState(null)
  const [subView, setSubView] = useState(null) // null | 'plan' | 'cash'
  const [stripeLoading, setStripeLoading] = useState(false)
  const [upsells, setUpsells] = useState([])

  // Plan sub-view
  const [planFrequency, setPlanFrequency] = useState('monthly')
  const [planStartSeason, setPlanStartSeason] = useState(false)
  const [planDepositInput, setPlanDepositInput] = useState('')

  // Cash sub-view
  const [cashDate, setCashDate] = useState(null)

  const discountAmount = promoResult?.discount_amount
    ? parseFloat(promoResult.discount_amount)
    : promoResult?.discount_percent
    ? Math.round(totalPrice * promoResult.discount_percent / 100)
    : 0
  const discountedTotal = Math.max(0, totalPrice - discountAmount)
  const depositAmount = Math.round(discountedTotal / 2)
  const displayTotal = payOption === 'deposit' ? depositAmount : discountedTotal
  const promoCodeClean = promoResult?.error ? null : promoCode.trim() || null

  useEffect(() => {
    if (visible) {
      setPayOption('full'); setPromoCode(''); setPromoResult(null)
      setSubView(null); setPlanFrequency('monthly'); setPlanStartSeason(false)
      setCashDate(null); setStripeLoading(false)
      // Fetch upsell suggestions for selected sessions
      if (sessions?.length) {
        const ids = sessions.map(s => s.id).filter(Boolean)
        if (ids.length) {
          client.get('/api/classes/upsells/suggest/', { params: { session_ids: ids.join(',') } })
            .then(r => setUpsells(r.data?.results ?? r.data ?? []))
            .catch(() => setUpsells([]))
        }
      }
    }
  }, [visible])

  async function handleApplyPromo() {
    const code = promoCode.trim()
    if (!code || promoValidating) return
    setPromoValidating(true)
    try {
      const { data } = await payments.promoCodes.validate({ code, amount: totalPrice })
      setPromoResult(data)
    } catch (err) {
      setPromoResult({ error: err?.response?.data?.detail ?? err?.response?.data?.error ?? 'Invalid promo code.' })
    } finally { setPromoValidating(false) }
  }

  async function handleConfirmPayment() {
    setStripeLoading(true)
    try {
      const amountCents = Math.round(displayTotal * 100)
      const classNames = sessions.map(s => getSessionName(s)).join(', ')
      const desc = payOption === 'deposit' ? `Season deposit — ${classNames}` : `Season enrolment — ${classNames}`
      const { data } = await payments.stripe.createPaymentIntent({ amount_cents: amountCents, description: desc, save_method: true })
      const { error: initErr } = await initPaymentSheet({ merchantDisplayName: 'Duality Pole Studio', paymentIntentClientSecret: data.client_secret, allowsDelayedPaymentMethods: false, appearance: STRIPE_APPEARANCE })
      if (initErr) { Alert.alert('Error', initErr.message); return }
      const { error: presentErr } = await presentPaymentSheet()
      if (presentErr) { if (presentErr.code !== 'Canceled') Alert.alert('Payment failed', presentErr.message); return }
      onConfirm(payOption, displayTotal, promoCodeClean)
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || e?.message || 'Could not process payment.')
    } finally { setStripeLoading(false) }
  }

  async function handlePlanSubmit() {
    setStripeLoading(true)
    try {
      const schedule = calcPlanSchedule(planFrequency, planStartSeason, upcomingSeason, discountedTotal)

      if (planStartSeason) {
        // Deferred start — collect the chosen deposit today to hold the spot
        const depositCents = Math.round(planDepositValue * 100)
        const { data } = await payments.stripe.createPaymentIntent({ amount_cents: depositCents, description: `Season deposit (payment plan) — $${planDepositValue} upfront`, save_method: true })
        const { error: initErr } = await initPaymentSheet({ merchantDisplayName: 'Duality Pole Studio', paymentIntentClientSecret: data.client_secret, allowsDelayedPaymentMethods: false, appearance: STRIPE_APPEARANCE })
        if (initErr) { Alert.alert('Error', initErr.message); return }
        const { error: presentErr } = await presentPaymentSheet()
        if (presentErr) { if (presentErr.code !== 'Canceled') Alert.alert('Payment failed', presentErr.message); return }
      } else {
        // Starting today — save card for future instalments, no charge now
        const { data } = await payments.stripe.setupIntent()
        const { error: initErr } = await initPaymentSheet({ merchantDisplayName: 'Duality Pole Studio', setupIntentClientSecret: data.client_secret, appearance: STRIPE_APPEARANCE })
        if (initErr) { Alert.alert('Error', initErr.message); return }
        const { error: presentErr } = await presentPaymentSheet()
        if (presentErr) { if (presentErr.code !== 'Canceled') Alert.alert('Card not saved', presentErr.message); return }
      }

      onConfirm('plan', discountedTotal, promoCodeClean, { frequency: planFrequency, startSeason: planStartSeason, schedule, depositPaid: planStartSeason ? planDepositValue : 0 })
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || e?.message || 'Could not set up payment plan.')
    } finally { setStripeLoading(false) }
  }

  async function handleCashSubmit() {
    if (!cashDate) { Alert.alert('Select a date', 'Please select when you\'ll be bringing cash.'); return }
    setStripeLoading(true)
    try {
      const { data } = await payments.stripe.setupIntent()
      const { error: initErr } = await initPaymentSheet({ merchantDisplayName: 'Duality Pole Studio', setupIntentClientSecret: data.client_secret, appearance: STRIPE_APPEARANCE })
      if (initErr) { Alert.alert('Error', initErr.message); return }
      const { error: presentErr } = await presentPaymentSheet()
      if (presentErr) { if (presentErr.code !== 'Canceled') Alert.alert('Card not saved', presentErr.message); return }
      onConfirm('cash', 0, null, { cashDate })
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || e?.message || 'Could not save card.')
    } finally { setStripeLoading(false) }
  }

  if (!visible || sessions.length === 0) return null

  const minDeposit = sessions.length >= 2 ? 100 : 50
  const planDepositValue = Math.max(minDeposit, Math.min(discountedTotal, parseFloat(planDepositInput) || minDeposit))
  const schedule = calcPlanSchedule(planFrequency, planStartSeason, upcomingSeason, discountedTotal)
  const seasonEndLabel = upcomingSeason?.end_date
    ? new Date(upcomingSeason.end_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    : null

  return (
    <Modal visible animationType="slide" transparent onRequestClose={subView ? () => setSubView(null) : onClose}>
      <View style={sc.overlay}>
        <ScrollView style={sc.sheet} contentContainerStyle={{ paddingBottom: 44 }} bounces={false} showsVerticalScrollIndicator={false}>

          {/* ── PLAN SUB-VIEW ── */}
          {subView === 'plan' && (
            <>
              <View style={sc.header}>
                <TouchableOpacity onPress={() => setSubView(null)} style={{ marginRight: 12 }}>
                  <Text style={sc.backBtn}>← BACK</Text>
                </TouchableOpacity>
                <Text style={sc.title}>Set up a payment plan</Text>
              </View>

              <Text style={sc.subLabel}>How frequently would you like to pay?</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {[['weekly', 'Weekly'], ['fortnightly', 'Fortnightly'], ['monthly', 'Monthly (2x)']].map(([key, label]) => (
                  <TouchableOpacity key={key} style={[sc.freqBtn, planFrequency === key && sc.freqBtnActive]} onPress={() => setPlanFrequency(key)}>
                    <Text style={[sc.freqBtnText, planFrequency === key && sc.freqBtnTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={sc.subLabel}>When would you like to start payments?</Text>
              <TouchableOpacity style={[sc.option, planStartSeason === false && sc.optionSelected]} onPress={() => setPlanStartSeason(false)}>
                <View style={[sc.radio, planStartSeason === false && sc.radioSelected]}>
                  {planStartSeason === false && <View style={sc.radioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={sc.optionTitle}>Today</Text>
                  <Text style={[sc.optionSub ?? {}, { fontSize: 12, color: T.muted, marginTop: 2 }]}>First instalment charged now, card saved for the rest.</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[sc.option, planStartSeason === true && sc.optionSelected]} onPress={() => setPlanStartSeason(true)}>
                <View style={[sc.radio, planStartSeason === true && sc.radioSelected]}>
                  {planStartSeason === true && <View style={sc.radioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={sc.optionTitle}>When the season commences</Text>
                  <Text style={{ fontSize: 12, color: '#ffaa00', marginTop: 2 }}>
                    A deposit is required today to hold your spot.
                  </Text>
                </View>
              </TouchableOpacity>

              {planStartSeason && (
                <View style={{ marginBottom: 16, backgroundColor: T.card, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,170,0,0.3)', padding: 14 }}>
                  <Text style={{ fontSize: 12, color: '#ffaa00', fontWeight: '700', marginBottom: 10 }}>
                    Deposit amount (min ${minDeposit})
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: T.text }}>$</Text>
                    <TextInput
                      style={{
                        flex: 1, fontSize: 28, fontWeight: '800', color: T.text,
                        borderBottomWidth: 2, borderBottomColor: '#ffaa00', paddingBottom: 4,
                      }}
                      keyboardType="numeric"
                      placeholder={String(minDeposit)}
                      placeholderTextColor={T.muted}
                      value={planDepositInput}
                      onChangeText={setPlanDepositInput}
                      returnKeyType="done"
                    />
                  </View>
                  {planDepositInput !== '' && planDepositValue < discountedTotal && (
                    <Text style={{ fontSize: 11, color: T.muted, marginTop: 8 }}>
                      Remaining balance of ${(discountedTotal - planDepositValue).toFixed(2)} paid via your {planFrequency} plan.
                    </Text>
                  )}
                  {parseFloat(planDepositInput) > 0 && parseFloat(planDepositInput) < minDeposit && (
                    <Text style={{ fontSize: 11, color: '#ef4444', marginTop: 6, fontWeight: '600' }}>
                      Minimum deposit is ${minDeposit} for {sessions.length} class{sessions.length !== 1 ? 'es' : ''}.
                    </Text>
                  )}
                </View>
              )}

              <Text style={[sc.subLabel, { marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 }]}>Your payment schedule</Text>
              <View style={sc.scheduleCard}>
                {schedule.map((inst, i) => (
                  <View key={i} style={[sc.scheduleRow, i > 0 && { borderTopWidth: 1, borderTopColor: T.border }]}>
                    <View>
                      <Text style={sc.scheduleDate}>{inst.date}</Text>
                      <Text style={sc.scheduleLabel}>{inst.label}</Text>
                    </View>
                    <Text style={sc.scheduleAmount}>${inst.amount}</Text>
                  </View>
                ))}
              </View>
              {seasonEndLabel && (
                <Text style={sc.scheduleFootnote}>
                  All payments must be completed by <Text style={{ fontWeight: '700', color: T.text }}>{seasonEndLabel}</Text> (season end).{'  '}
                  {schedule.length} × ${schedule[0]?.amount} = ${discountedTotal.toFixed(2)}
                </Text>
              )}

              <View style={sc.planInfoBox}>
                <Text style={sc.planInfoText}>
                  Your spot will be <Text style={{ fontWeight: '700', color: T.text }}>held for 24 hours</Text> while we review your request.
                  {' '}You'll receive a confirmation once approved — no payment is taken until then.
                </Text>
              </View>

              <TouchableOpacity style={[sc.confirmBtn, stripeLoading && { opacity: 0.6 }]} onPress={handlePlanSubmit} disabled={stripeLoading}>
                {stripeLoading ? <ActivityIndicator color="#000" /> : (
                  <Text style={sc.confirmBtnText}>
                    {planStartSeason ? `PAY DEPOSIT $${planDepositValue} & CONFIRM` : 'CONFIRM PAYMENT PLAN'}
                  </Text>
                )}
              </TouchableOpacity>
              <Text style={sc.disclaimer}>By booking you agree to our terms and conditions.</Text>
            </>
          )}

          {/* ── CASH SUB-VIEW ── */}
          {subView === 'cash' && (
            <>
              <View style={sc.header}>
                <TouchableOpacity onPress={() => setSubView(null)} style={{ marginRight: 12 }}>
                  <Text style={sc.backBtn}>← BACK</Text>
                </TouchableOpacity>
                <Text style={sc.title}>Pay cash on the day</Text>
              </View>

              <View style={sc.cashInfoBox}>
                <Text style={sc.cashInfoText}>
                  Your card details are saved securely but{' '}
                  <Text style={{ fontWeight: '800', color: T.text }}>won't be charged</Text>
                  {' '}unless you don't pay cash on the day you've selected.
                </Text>
              </View>

              <Text style={sc.subLabel}>When will you be bringing cash?</Text>
              <CashCalendar selected={cashDate} onSelect={setCashDate} />

              <TouchableOpacity style={[sc.confirmBtn, { marginTop: 20 }, stripeLoading && { opacity: 0.6 }]} onPress={handleCashSubmit} disabled={stripeLoading}>
                {stripeLoading ? <ActivityIndicator color="#000" /> : <Text style={sc.confirmBtnText}>CONFIRM BOOKING</Text>}
              </TouchableOpacity>
              <Text style={sc.disclaimer}>By booking you agree to our terms and conditions.</Text>
            </>
          )}

          {/* ── MAIN OPTIONS VIEW ── */}
          {subView === null && (
            <>
              <View style={sc.header}>
                <Text style={sc.title}>Before you checkout</Text>
                <TouchableOpacity onPress={onClose} style={sc.closeBtn}>
                  <Text style={sc.closeBtnText}>CLOSE</Text>
                </TouchableOpacity>
              </View>

              <View style={sc.summaryCard}>
                {sessions.map((sess, i) => (
                  <Text key={sess.id} style={[sc.summaryLine, i > 0 && { marginTop: 4 }]}>
                    • {getSessionName(sess)}
                    {sess.day_of_week != null ? `  ·  ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][sess.day_of_week]}` : ''}
                    {sess.start_time ? `  ${fmtTime(sess.start_time)}` : ''}
                  </Text>
                ))}
                {seasonName ? <Text style={sc.seasonTag}>{seasonName}</Text> : null}
              </View>

              <View style={sc.promoRow}>
                <TextInput
                  style={sc.promoInput}
                  value={promoCode}
                  onChangeText={t => { setPromoCode(t); setPromoResult(null) }}
                  placeholder="Promo code"
                  placeholderTextColor="#555"
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onSubmitEditing={handleApplyPromo}
                />
                <TouchableOpacity style={sc.promoApplyBtn} onPress={handleApplyPromo} disabled={promoValidating || !promoCode.trim()}>
                  {promoValidating ? <ActivityIndicator color="#000" size="small" /> : <Text style={sc.promoApplyText}>APPLY</Text>}
                </TouchableOpacity>
              </View>
              {!!promoResult && !promoResult.error && (
                <Text style={sc.promoSuccess}>{promoResult.message ?? `Code applied! -$${discountAmount.toFixed(2)} off`}</Text>
              )}
              {!!promoResult?.error && <Text style={sc.promoError}>{promoResult.error}</Text>}

              {upsells.length > 0 && (
                <View style={{ marginTop: 16, marginBottom: 4 }}>
                  <Text style={[sc.sectionLabel, { marginBottom: 8 }]}>You might also like</Text>
                  {upsells.map(u => (
                    <View key={u.id} style={{ backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2a2a2a' }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, marginBottom: 2 }}>{u.suggested_session_name || u.session_name || u.name}</Text>
                      {!!u.headline && <Text style={{ color: '#ccff00', fontSize: 12, marginBottom: 2 }}>{u.headline}</Text>}
                      {!!u.body && <Text style={{ color: '#888', fontSize: 12 }}>{u.body}</Text>}
                    </View>
                  ))}
                </View>
              )}

              <Text style={sc.sectionLabel}>How would you like to pay?</Text>

              <TouchableOpacity style={[sc.option, payOption === 'full' && sc.optionSelected]} onPress={() => setPayOption('full')}>
                <View style={[sc.radio, payOption === 'full' && sc.radioSelected]}>{payOption === 'full' && <View style={sc.radioDot} />}</View>
                <View style={{ flex: 1 }}>
                  <Text style={sc.optionTitle}>Pay in full today</Text>
                  <Text style={sc.optionSub}>One payment, nothing more to think about.</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {discountAmount > 0 && <Text style={sc.strikePrice}>${totalPrice}</Text>}
                  <Text style={sc.optionPrice}>${discountedTotal}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[sc.option, payOption === 'deposit' && sc.optionSelected]} onPress={() => setPayOption('deposit')}>
                <View style={[sc.radio, payOption === 'deposit' && sc.radioSelected]}>{payOption === 'deposit' && <View style={sc.radioDot} />}</View>
                <View style={{ flex: 1 }}>
                  <Text style={sc.optionTitle}>Pay 50% deposit today</Text>
                  <Text style={sc.optionSub}>
                    Balance of ${depositAmount} charged automatically when the season commences.
                  </Text>
                </View>
                <Text style={sc.optionPrice}>${depositAmount}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[sc.confirmBtn, stripeLoading && { opacity: 0.6 }]} onPress={handleConfirmPayment} disabled={stripeLoading}>
                {stripeLoading ? <ActivityIndicator color="#000" /> : <Text style={sc.confirmBtnText}>CONFIRM AND PAY — ${displayTotal}</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={sc.altBtn} onPress={() => setSubView('plan')}>
                <Text style={sc.altBtnText}>REQUEST A PAYMENT PLAN</Text>
              </TouchableOpacity>

              <TouchableOpacity style={sc.altBtn} onPress={() => setSubView('cash')}>
                <Text style={sc.altBtnText}>PAY CASH ON THE DAY</Text>
              </TouchableOpacity>

              <Text style={sc.disclaimer}>By booking you agree to our terms and conditions. Payments secured by Stripe.</Text>
            </>
          )}

        </ScrollView>
      </View>
    </Modal>
  )
}

const sc = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
  sheet: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '92%' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: T.text },
  closeBtn: { paddingLeft: 12 },
  closeBtnText: { color: T.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  backBtn: { color: T.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  summaryCard: { backgroundColor: T.bg, borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: T.border },
  summaryLine: { fontSize: 13, color: '#ccc', lineHeight: 20 },
  seasonTag: { marginTop: 8, fontSize: 11, color: T.muted, fontWeight: '600' },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 12 },
  subLabel: { fontSize: 13, color: T.muted, marginBottom: 10 },
  option: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 14, marginBottom: 10, backgroundColor: T.bg },
  optionSelected: { borderColor: T.lime, borderWidth: 1.5 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: T.muted, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: T.lime },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.lime },
  optionTitle: { fontSize: 14, fontWeight: '600', color: T.text },
  optionSub: { fontSize: 12, color: T.muted, marginTop: 2 },
  optionPrice: { fontSize: 18, fontWeight: '800', color: T.lime, marginLeft: 8 },
  confirmBtn: { backgroundColor: T.lime, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 10 },
  confirmBtnText: { color: '#000', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
  altBtn: { borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  altBtnText: { color: T.text, fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  disclaimer: { fontSize: 11, color: T.muted, textAlign: 'center', marginTop: 8, lineHeight: 16 },
  promoRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  promoInput: { flex: 1, backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, borderRadius: 10, color: T.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontWeight: '600' },
  promoApplyBtn: { backgroundColor: T.lime, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center', alignItems: 'center' },
  promoApplyText: { color: '#000', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  promoSuccess: { fontSize: 12, color: T.lime, marginBottom: 10, fontWeight: '600' },
  promoError: { fontSize: 12, color: '#ef4444', marginBottom: 10, fontWeight: '600' },
  strikePrice: { fontSize: 12, color: T.muted, textDecorationLine: 'line-through' },
  // frequency selector
  freqBtn: { flex: 1, borderWidth: 1, borderColor: T.border, borderRadius: 20, paddingVertical: 8, alignItems: 'center' },
  freqBtnActive: { borderColor: T.lime, backgroundColor: T.lime },
  freqBtnText: { fontSize: 12, fontWeight: '700', color: T.muted },
  freqBtnTextActive: { color: '#000' },
  // schedule
  scheduleCard: { borderRadius: 12, borderWidth: 1, borderColor: T.border, marginBottom: 10, overflow: 'hidden' },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: T.bg },
  scheduleDate: { fontSize: 14, fontWeight: '700', color: T.text },
  scheduleLabel: { fontSize: 11, color: T.muted, marginTop: 1 },
  scheduleAmount: { fontSize: 16, fontWeight: '800', color: T.lime },
  scheduleFootnote: { fontSize: 12, color: T.muted, lineHeight: 18, marginBottom: 16 },
  // plan info box
  planInfoBox: { backgroundColor: '#0a0a1a', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4a', padding: 14, marginBottom: 16 },
  planInfoText: { fontSize: 13, color: '#aaa', lineHeight: 20 },
  // cash info box
  cashInfoBox: { backgroundColor: '#1a0f2e', borderRadius: 12, borderWidth: 1, borderColor: '#3d2070', padding: 14, marginBottom: 20 },
  cashInfoText: { fontSize: 13, color: '#aaa', lineHeight: 20 },
  // calendar
  calCell: { flex: 1, aspectRatio: 1, margin: 2, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111', borderWidth: 1, borderColor: T.border },
  calCellSelected: { backgroundColor: T.lime, borderColor: T.lime },
  calCellText: { fontSize: 14, fontWeight: '600', color: T.text },
  calCellTextSelected: { color: '#000' },
})

// ─── ClassPassCheckoutModal ───────────────────────────────────────────────────
function ClassPassCheckoutModal({ visible, price, size, onClose, onSuccess }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe()
  const [loading, setLoading] = useState(false)

  async function handlePurchase() {
    setLoading(true)
    try {
      const { data } = await payments.stripe.createPaymentIntent({
        amount_cents: Math.round(price * 100),
        description: `${size}-class pass`,
        save_method: true,
      })
      const { error: initErr } = await initPaymentSheet({
        merchantDisplayName: 'Duality Pole Studio',
        paymentIntentClientSecret: data.client_secret,
        allowsDelayedPaymentMethods: false,
        appearance: STRIPE_APPEARANCE,
      })
      if (initErr) { Alert.alert('Error', initErr.message); return }
      const { error: presentErr } = await presentPaymentSheet()
      if (presentErr) { if (presentErr.code !== 'Canceled') Alert.alert('Payment failed', presentErr.message); return }
      await attendance.classPasses.purchase()
      onSuccess()
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || e?.message || 'Could not process payment.')
    } finally { setLoading(false) }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={pass.overlay}>
        <View style={pass.sheet}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <Text style={pass.title}>{size}-Class Pass</Text>
            <TouchableOpacity onPress={onClose} style={{ marginLeft: 'auto' }}>
              <Text style={{ color: '#555', fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>CLOSE</Text>
            </TouchableOpacity>
          </View>
          <View style={pass.infoBox}>
            <Text style={pass.infoText}>Book any {size} casual classes at a discounted rate. Credits never expire mid-season and can be used for any eligible class.</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ color: T.muted, fontSize: 14 }}>{size} classes</Text>
            <Text style={{ color: T.lime, fontSize: 26, fontWeight: '900' }}>${price}</Text>
          </View>
          <TouchableOpacity style={[pass.buyBtn, loading && { opacity: 0.6 }]} onPress={handlePurchase} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={pass.buyBtnText}>PAY ${price} →</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={pass.cancelBtn} onPress={onClose}>
            <Text style={pass.cancelBtnText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
const pass = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
  sheet: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 44 },
  title: { fontSize: 20, fontWeight: '800', color: T.text },
  infoBox: { backgroundColor: 'rgba(204,255,0,0.05)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.15)', borderRadius: 12, padding: 14, marginBottom: 20 },
  infoText: { fontSize: 13, color: '#aaa', lineHeight: 20 },
  buyBtn: { backgroundColor: T.lime, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  buyBtnText: { color: '#000', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelBtnText: { color: '#555', fontSize: 13 },
})

// ─── CasualBookingOptionsModal ────────────────────────────────────────────────
function CasualBookingOptionsModal({ visible, occ, priceCasual, priceCasualEnrolled, priceClassPass, classPassSize, availableCredits, passClassesRemaining, activeSeason, bookingSeason, activeSeasonCount, currentSeasonWeek, onClose, onBook, onRequestExemption, onEnrolSeason }) {
  const sess = occ?.session_detail
  const occDate = occ?.date
  const sessName = sess?.name ?? 'Class'
  const time = fmtTime(sess?.start_time)
  const instructor = sess?.instructor_detail?.display_name ?? sess?.instructor_detail?.first_name
  // Treat session with no season assigned as potentially in the active season
  const inActiveSeason = !!activeSeason && (sess?.season == null || sess?.season === activeSeason?.id)
  const cutoffWeeks = sess?.catchup_cutoff_weeks ?? 3
  const pastCutoff = inActiveSeason && currentSeasonWeek > cutoffWeeks
  const creditEligible = availableCredits > 0 && inActiveSeason && !pastCutoff
  const passEligible = passClassesRemaining > 0
  const isEnrolled = activeSeasonCount > 0
  const casualRate = isEnrolled ? priceCasualEnrolled : priceCasual
  // Show season enrol upsell whenever bookings are open — don't restrict to sess.season match
  const seasonCanEnrol = !!(bookingSeason && bookingSeason.bookings_open !== false)
  const passSaving = Math.round((priceCasual - (priceClassPass / classPassSize)) * classPassSize)

  // Default to the best / cheapest available option
  const defaultOption = creditEligible ? 'credit' : passEligible ? 'pass' : 'casual'
  const [selected, setSelected] = useState(defaultOption)

  // Reset default when occ changes
  useEffect(() => { setSelected(creditEligible ? 'credit' : passEligible ? 'pass' : 'casual') }, [occ?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const dateLabel = occDate
    ? new Date(occDate + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
    : null

  const actionLabel = (() => {
    if (selected === 'credit') return 'BOOK FOR FREE'
    if (selected === 'casual') return `PAY $${casualRate}`
    if (selected === 'pass') return 'USE PASS — FREE'
    if (selected === 'buypass') return `BUY PASS — $${priceClassPass}`
    if (selected === 'season') return 'ENROL IN SEASON →'
    return 'BOOK'
  })()

  function handleConfirm() {
    if (selected === 'season') { onClose(); onEnrolSeason(); return }
    onBook(selected === 'credit' ? 'catchup' : selected === 'pass' ? 'classpass' : selected === 'buypass' ? 'buypass' : 'casual')
  }

  const OptionRow = ({ id, title, sub, price, accent, disabled }) => {
    const isSelected = selected === id
    const accentColor = accent ?? '#ccff00'
    return (
      <TouchableOpacity
        style={[bo.option,
          disabled
            ? { borderColor: '#222', backgroundColor: 'transparent', opacity: 0.38 }
            : isSelected
              ? { borderColor: accentColor, backgroundColor: `${accentColor}18` }
              : { borderColor: '#2a2a2a', backgroundColor: 'transparent' },
        ]}
        onPress={() => !disabled && setSelected(id)}
        activeOpacity={disabled ? 1 : 0.8}
      >
        <View style={[
          bo.radio,
          { borderColor: disabled ? '#333' : isSelected ? accentColor : '#444' },
          isSelected && !disabled && { backgroundColor: accentColor },
        ]} />
        <View style={{ flex: 1 }}>
          <Text style={[bo.optionTitle, isSelected && !disabled && { color: accentColor }]}>{title}</Text>
          {!!sub && <Text style={bo.optionSub}>{sub}</Text>}
        </View>
        {!!price && <Text style={[bo.optionPrice, isSelected && !disabled && { color: accentColor }]}>{price}</Text>}
      </TouchableOpacity>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={bo.overlay}>
        <ScrollView style={bo.sheet} contentContainerStyle={{ paddingBottom: 44 }} bounces={false} showsVerticalScrollIndicator={false}>
          <View style={bo.header}>
            <View style={{ flex: 1 }}>
              <Text style={bo.title}>{sessName}</Text>
              <Text style={bo.meta}>{[dateLabel, time, instructor].filter(Boolean).join(' · ')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={bo.closeBtn}>
              <Text style={bo.closeBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>

          {/* Credit option — always shown, disabled if none available */}
          <OptionRow id="credit"
            title="Use a credit"
            sub={availableCredits > 0 && creditEligible
              ? `${availableCredits} catch-up credit${availableCredits !== 1 ? 's' : ''} available`
              : availableCredits > 0
              ? 'Your credits can\'t be used for this class'
              : 'No credits available'}
            price={availableCredits > 0 ? 'FREE' : null}
            accent="#b0a0ff"
            disabled={!creditEligible}
          />

          {/* Casual / enrolled rate */}
          <OptionRow id="casual"
            title={isEnrolled ? 'Pay enrolled student rate' : 'Pay casual rate'}
            sub="Card via Stripe"
            price={`$${casualRate}`}
          />

          {/* Class pass — use existing or buy */}
          {passEligible ? (
            <OptionRow id="pass"
              title={`Use ${classPassSize}-class pass`}
              sub={`${passClassesRemaining} credit${passClassesRemaining !== 1 ? 's' : ''} remaining on your pass`}
              price="FREE"
              accent="#b0a0ff"
            />
          ) : !!activeSeason && passSaving > 0 ? (
            <OptionRow id="buypass"
              title={`Buy a ${classPassSize}-class pass`}
              sub={`Save $${passSaving} · $${(priceClassPass / classPassSize).toFixed(0)}/class across eligible casuals`}
              price={`$${priceClassPass}`}
              accent="#b0a0ff"
            />
          ) : null}

          <TouchableOpacity style={bo.actionBtn} onPress={handleConfirm} activeOpacity={0.85}>
            <Text style={bo.actionBtnText}>{actionLabel}</Text>
          </TouchableOpacity>

          {/* Season upsell */}
          {seasonCanEnrol && (
            <TouchableOpacity
              style={bo.seasonCard}
              onPress={() => { onClose(); onEnrolSeason() }}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={bo.seasonCardTitle}>Enrol in the full season instead</Text>
                <Text style={bo.seasonCardSub}>
                  {bookingSeason?.name ?? 'Season'} · ${bookingSeason ? Math.round(parseFloat(bookingSeason.price ?? 0)) : '—'} total · better value
                </Text>
              </View>
              <Text style={bo.seasonCardArrow}>→</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={bo.cancelBtn} onPress={onClose}>
            <Text style={bo.cancelBtnText}>Maybe later</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  )
}

const bo = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
  sheet: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '92%' },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  meta: { fontSize: 13, color: '#666', marginTop: 3 },
  closeBtn: { paddingLeft: 12, paddingTop: 2 },
  closeBtnText: { color: '#555', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  option: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 10, gap: 12 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, flexShrink: 0 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  actionBtn: { backgroundColor: T.lime, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 6, marginBottom: 4 },
  actionBtnText: { fontSize: 15, fontWeight: '900', color: '#000', letterSpacing: 0.5 },
  optionTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  optionSub: { fontSize: 12, color: '#666', lineHeight: 18 },
  optionPrice: { fontSize: 18, fontWeight: '900', color: '#ccff00', marginLeft: 12 },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelBtnText: { color: '#555', fontSize: 13 },
  seasonCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(204,255,0,0.06)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.2)', borderRadius: 14, padding: 16, marginTop: 4, marginBottom: 4, gap: 12 },
  seasonCardTitle: { fontSize: 14, fontWeight: '700', color: '#ccff00', marginBottom: 3 },
  seasonCardSub: { fontSize: 12, color: '#888', lineHeight: 18 },
  seasonCardArrow: { fontSize: 18, color: '#ccff00', fontWeight: '700' },
})

// ─── CatchupSessionPanel ──────────────────────────────────────────────────────
function CatchupSessionPanel({ session, availableCredits, onBook, onCancel, bookingId, currentSeasonWeek, onRequestExemption }) {
  const [open, setOpen] = useState(false)
  const [occs, setOccs] = useState(null)
  const [loading, setLoading] = useState(false)
  const levelBadge = getLevelBadge(session.name)
  const dayLabel = session.day_of_week != null ? DAYS_SHORT[session.day_of_week] : ''
  const cutoffWeeks = session.catchup_cutoff_weeks ?? 3
  const pastCutoff = currentSeasonWeek > 0 && currentSeasonWeek > cutoffWeeks

  async function load() {
    if (occs !== null) return
    setLoading(true)
    try {
      const res = await classes.casual.occurrences({ session: session.id, upcoming: true })
      setOccs(res.data?.results ?? res.data ?? [])
    } catch { setOccs([]) }
    finally { setLoading(false) }
  }

  function toggle() {
    if (!open) load()
    setOpen(o => !o)
  }

  if (pastCutoff) {
    return (
      <View style={{ backgroundColor: T.card, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,170,0,0.25)', opacity: 0.75, overflow: 'hidden' }}>
        <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: T.muted }}>{session.name}</Text>
              {levelBadge && (
                <View style={{ backgroundColor: levelBadge.bg, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: levelBadge.color }}>{levelBadge.label}</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 12, color: T.muted }}>
              {[dayLabel, session.start_time ? fmtTime(session.start_time) : null].filter(Boolean).join('  ·  ')}
            </Text>
            <Text style={{ fontSize: 11, color: '#ffaa00', marginTop: 4, fontWeight: '600' }}>
              Catch-ups closed after week {cutoffWeeks}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onRequestExemption(session)}
            style={{ backgroundColor: 'rgba(255,170,0,0.12)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,170,0,0.35)', alignItems: 'center' }}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffaa00', letterSpacing: 0.3 }}>REQUEST</Text>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffaa00', letterSpacing: 0.3 }}>EXEMPTION</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={{ backgroundColor: T.card, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: T.border, overflow: 'hidden' }}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.7} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: T.text }}>{session.name}</Text>
            {levelBadge && (
              <View style={{ backgroundColor: levelBadge.bg, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: levelBadge.color }}>{levelBadge.label}</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 12, color: T.muted }}>
            {[dayLabel, session.start_time ? fmtTime(session.start_time) : null, session.studio_detail?.name].filter(Boolean).join('  ·  ')}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <View style={{ backgroundColor: 'rgba(204,255,0,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: T.lime }}>Uses 1 credit</Text>
          </View>
          <Text style={{ fontSize: 16, color: T.muted }}>{open ? '▴' : '▾'}</Text>
        </View>
      </TouchableOpacity>

      {open && (
        <View style={{ borderTopWidth: 1, borderTopColor: T.border, padding: 14 }}>
          {loading || occs === null ? (
            <ActivityIndicator color={T.lime} size="small" style={{ paddingVertical: 12 }} />
          ) : occs.length === 0 ? (
            <Text style={{ fontSize: 13, color: T.muted, paddingVertical: 8 }}>No upcoming dates scheduled yet.</Text>
          ) : (
            occs.map(occ => {
              const dateLabel = new Date(occ.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
              const spotsLeft = occ.spots_left ?? 0
              const isFull = spotsLeft <= 0
              const myBooking = occ.my_booking
              const isBooked = myBooking?.status === 'confirmed'
              const isWaitlisted = myBooking?.status === 'waitlisted'
              const isProcessing = bookingId === occ.id
              return (
                <View key={occ.id} style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  padding: 10, borderRadius: 8, marginBottom: 6,
                  backgroundColor: isBooked ? 'rgba(204,255,0,0.05)' : 'rgba(255,255,255,0.03)',
                  borderWidth: 1, borderColor: isBooked ? 'rgba(204,255,0,0.2)' : T.border,
                }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: T.text }}>{dateLabel}</Text>
                    {isBooked && <Text style={{ fontSize: 11, color: T.lime, marginTop: 2 }}>✓ Booked</Text>}
                    {isWaitlisted && <Text style={{ fontSize: 11, color: '#ffaa44', marginTop: 2 }}>On waitlist</Text>}
                    {!myBooking && isFull && <Text style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>Full</Text>}
                    {!myBooking && !isFull && spotsLeft <= 2 && <Text style={{ fontSize: 11, color: '#ffaa00', marginTop: 2 }}>{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left</Text>}
                  </View>
                  <View style={{ flexShrink: 0 }}>
                    {isProcessing ? (
                      <ActivityIndicator color={T.lime} size="small" />
                    ) : isBooked || isWaitlisted ? (
                      <TouchableOpacity
                        style={{ borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#ef4444' }}
                        onPress={() => onCancel(occ)}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>{isWaitlisted ? 'LEAVE' : 'CANCEL'}</Text>
                      </TouchableOpacity>
                    ) : isFull ? (
                      <TouchableOpacity
                        style={{ borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: T.muted }}
                        onPress={() => onBook(occ, 'casual')}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: T.muted }}>WAITLIST</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={{ borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: availableCredits > 0 ? T.lime : '#222', borderWidth: 1, borderColor: availableCredits > 0 ? T.lime : T.border }}
                        onPress={() => availableCredits > 0 ? onBook(occ, 'catchup') : null}
                        disabled={availableCredits <= 0}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: availableCredits > 0 ? '#000' : T.muted }}>
                          {availableCredits > 0 ? 'BOOK (CREDIT)' : 'NO CREDITS'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )
            })
          )}
        </View>
      )}
    </View>
  )
}

// ─── main screen ─────────────────────────────────────────────────────────────
export default function BookScreen({ navigation }) {
  const { user } = useAuth()
  const { initPaymentSheet, presentPaymentSheet } = useStripe()
  const [tab, setTab] = useState('season')
  const [booking, setBooking] = useState(null)
  const [booked, setBooked] = useState({})
  const [levelFilter, setLevelFilter] = useState(null)
  const [firstTimerModal, setFirstTimerModal] = useState(null) // { headline, body }

  async function maybeShowFirstTimerInfo(sess) {
    if (!sess?.first_timer_body && !sess?.first_timer_headline) return
    const key = `first_timer_seen_${user?.id}_${sess.id}`
    const seen = await AsyncStorage.getItem(key)
    if (seen) return
    await AsyncStorage.setItem(key, 'true')
    setFirstTimerModal({ headline: sess.first_timer_headline, body: sess.first_timer_body, name: sess.name })
  }

  // Season tab state
  const [selectedSessions, setSelectedSessions] = useState([])
  const [headsUpSession, setHeadsUpSession] = useState(null)
  const [showSeasonCheckout, setShowSeasonCheckout] = useState(false)
  const [selectedSeasonId, setSelectedSeasonId] = useState(null)

  // Filter state
  const [dayFilter, setDayFilter] = useState(null)
  const [instructorFilter, setInstructorFilter] = useState(null)
  const [eligibleOnly, setEligibleOnly] = useState(false)

  // Casual tab state
  const [exemptionSession, setExemptionSession] = useState(null)
  const [exemptionNote, setExemptionNote] = useState('')
  const [submittingExemption, setSubmittingExemption] = useState(false)
  const [casualViewMode, setCasualViewMode] = useState('list') // 'list' | 'calendar'
  const [casualAllOccs, setCasualAllOccs] = useState(null) // null=loading, []=loaded
  const [casualSelectedDate, setCasualSelectedDate] = useState(null)
  const [casualBookingId, setCasualBookingId] = useState(null)
  const [buyingPass, setBuyingPass] = useState(false)
  const [bookingOptionsOcc, setBookingOptionsOcc] = useState(null)
  const [casualWarning, setCasualWarning] = useState(null) // { occ, type: 'level'|'cutoff' }

  function openCasualBooking(occ) {
    const sess = occ.session_detail
    const sessLevel = sess?.level ?? sess?.level_name
    const isOutOfLevel = sessLevel && levelFilter && String(sessLevel) !== String(levelFilter)
    const inActiveSeason = activeSeason && sess?.season === activeSeason?.id
    const cutoffWeeks = sess?.catchup_cutoff_weeks ?? 3
    const pastCutoff = inActiveSeason && currentSeasonWeek > cutoffWeeks
    if (isOutOfLevel) { setCasualWarning({ occ, type: 'level' }); return }
    if (pastCutoff) { setCasualWarning({ occ, type: 'cutoff' }); return }
    setBookingOptionsOcc(occ)
  }

  useEffect(() => {
    if (user?.level) setLevelFilter(user.level)
  }, [user?.level])

  // ── API calls ──────────────────────────────────────────────────────────────
  const { data: studioSettings } = useApi(() => settingsApi.get(), [])
  const { data: sessionsData, loading: sessLoading, refetch: refetchSessions } = useApi(
    () => classes.list(), []
  )
  const { data: workshopsData, loading: wsLoading, refetch: refetchWorkshops } = useApi(
    () => classes.workshops.list(), []
  )
  const { data: seasonsData } = useApi(() => seasons.list(), [])
  const { data: creditsData, refetch: refetchCredits } = useApi(
    () => user?.id ? attendance.makeupCredits.list({ student: user.id, status: 'available' }) : null,
    [user?.id]
  )
  const { data: activeEnrolData, refetch: refetchActiveEnrol } = useApi(
    () => user?.id ? enrolments.list({ student: user.id, status: 'active' }) : null,
    [user?.id]
  )
  const { data: anyEnrolData } = useApi(
    () => user?.id ? enrolments.list({ student: user.id, limit: 1, page_size: 1 }) : null,
    [user?.id]
  )
  const { data: balanceData } = useApi(
    () => user?.id ? payments.balance(user.id) : null,
    [user?.id]
  )
  const { data: passData, refetch: refetchPasses } = useApi(
    () => user?.id ? attendance.classPasses.list({ student: user.id }) : null,
    [user?.id]
  )

  // ── derived data ───────────────────────────────────────────────────────────
  const allSessions = sessionsData?.results ?? sessionsData ?? []
  const workshopList = workshopsData?.results ?? workshopsData ?? []
  const allSeasons = seasonsData?.results ?? seasonsData ?? []
  const credits = creditsData?.results ?? creditsData ?? []
  const availableCredits = credits.length

  const creditExpiry = credits.length > 0
    ? (credits[0].expires_at ?? credits[0].expiry_date ?? null)
    : null

  const priceCasual = parseFloat(studioSettings?.price_casual ?? 40)
  const priceCasualEnrolled = parseFloat(studioSettings?.price_casual_enrolled ?? 30)
  const priceTrial = parseFloat(studioSettings?.price_trial ?? 25)
  const priceClassPass = parseFloat(studioSettings?.price_class_pass ?? 140)
  const classPassSize = parseInt(studioSettings?.class_pass_size ?? 4)
  const passList = passData?.results ?? passData ?? []
  const activePass = passList.find(p => p.is_active)
  const passClassesRemaining = activePass?.classes_remaining ?? 0

  const activeEnrolList = activeEnrolData?.results ?? activeEnrolData ?? []
  const enrolledSessionIds = new Set(activeEnrolList.map(e => e.class_session ?? e.class_session_id))
  const DEFAULT_SEASON_PRICES = { 1: 270, 2: 440, 3: 580, 4: 700, 5: 800, 6: 900 }
  const seasonPricingConfig = studioSettings?.season_pricing_config ?? []

  // Is this student brand new? (hide trial tab from returning students)
  const anyEnrolList = anyEnrolData?.results ?? anyEnrolData ?? []
  const anyEnrolCount = anyEnrolData?.count ?? anyEnrolList.length
  const isNewStudent = anyEnrolCount === 0

  // Outstanding balance gate
  const currentBalance = balanceData ? parseFloat(balanceData.balance) : null
  const isOwing = balanceData?.booking_blocked === true

  function getSeasonPriceForTotal(totalClasses) {
    const tier = seasonPricingConfig.find(r => {
      const n = parseInt((r.label ?? '').match(/(\d+)/)?.[1] ?? '0')
      return n === totalClasses
    })
    if (tier) return parseFloat(tier.price)
    const n = Math.min(Math.max(totalClasses, 1), 6)
    return DEFAULT_SEASON_PRICES[n] ?? parseFloat(studioSettings?.price_season ?? 270)
  }

  const activeSeason = allSeasons.find(s => s.status === 'active')
  // Seasons available to book into — prefer upcoming with open bookings, then active
  const bookableSeasons = allSeasons.filter(s =>
    (s.status === 'upcoming' || s.status === 'active')
  )
  const defaultBookingSeason =
    allSeasons.find(s => s.status === 'upcoming' && s.bookings_open !== false) ??
    allSeasons.find(s => s.status === 'active') ??
    allSeasons.find(s => s.status === 'upcoming')
  const bookingSeason = (selectedSeasonId ? allSeasons.find(s => s.id === selectedSeasonId) : null) ?? defaultBookingSeason

  // Sessions that belong to the booking season
  const bookingSeasonSessions = bookingSeason
    ? allSessions.filter(s => s.is_active && s.season === bookingSeason.id)
    : allSessions.filter(s => s.is_active)

  // Count active enrolments ONLY in the booking season (for incremental pricing)
  const bookingSeasonSessionIds = new Set(bookingSeasonSessions.map(s => s.id))
  const activeSeasonCount = activeEnrolList.filter(e =>
    e.enrolment_type === 'course' && bookingSeasonSessionIds.has(e.class_session ?? e.class_session_id)
  ).length

  // Incremental price: what the student pays to add more classes (upgrade cost)
  const alreadyPaidTier = activeSeasonCount > 0 ? getSeasonPriceForTotal(activeSeasonCount) : 0
  const seasonPrice = getSeasonPriceForTotal(activeSeasonCount + 1) - alreadyPaidTier
  const totalSeasonPrice = getSeasonPriceForTotal(activeSeasonCount + selectedSessions.length) - alreadyPaidTier

  const upcomingSeason = allSeasons.find(s => s.status === 'upcoming')
    ?? allSeasons.find(s => s.start_date && new Date(s.start_date) > new Date())

  // Week-of-season for routine cutoff
  const seasonStartDate = activeSeason?.start_date ? new Date(activeSeason.start_date + 'T00:00') : null
  const currentSeasonWeek = seasonStartDate ? Math.ceil((new Date() - seasonStartDate) / (7 * 86400000)) : 0
  const isPastWeek3 = currentSeasonWeek > 3 // legacy alias kept for safety

  // Casual tab: sessions from active season + upcoming if it starts within 7 days
  const nextSeason = allSeasons.find(s => s.status === 'upcoming')
  const nextSeasonStart = nextSeason?.start_date ? new Date(nextSeason.start_date + 'T00:00') : null
  const nextSeasonStartsSoon = nextSeasonStart && nextSeasonStart <= new Date(Date.now() + 7 * 86400000)
  const casualSessions = allSessions.filter(s => {
    if (!s.is_active) return false
    if (!activeSeason?.id && !nextSeason?.id) return true
    if (activeSeason && s.season === activeSeason.id) return true
    if (nextSeasonStartsSoon && nextSeason && s.season === nextSeason.id) return true
    return false
  })

  // ── filter helpers ─────────────────────────────────────────────────────────
  const uniqueInstructors = useMemo(() => {
    const seen = new Set()
    const result = []
    for (const s of allSessions) {
      const name = s.instructor_detail?.display_name ?? s.instructor_detail?.first_name
      if (name && !seen.has(name)) { seen.add(name); result.push(name) }
    }
    return result
  }, [allSessions])

  function matchesFilters(session) {
    if (dayFilter !== null && session.day_of_week !== dayFilter) return false
    if (instructorFilter) {
      const name = session.instructor_detail?.display_name ?? session.instructor_detail?.first_name
      if (name !== instructorFilter) return false
    }
    if (eligibleOnly && levelFilter) {
      const sessLevel = session.level ?? session.level_name
      if (sessLevel && String(sessLevel) !== String(levelFilter)) return false
    }
    return true
  }

  const seasonFiltered = bookingSeasonSessions.filter(matchesFilters)
  const casualFiltered = casualSessions.filter(matchesFilters)

  // ── season handlers ────────────────────────────────────────────────────────
  function toggleSession(session) {
    const alreadySelected = selectedSessions.some(s => s.id === session.id)
    if (alreadySelected) {
      setSelectedSessions(prev => prev.filter(s => s.id !== session.id))
      return
    }
    // Check level mismatch
    const sessLevel = session.level ?? session.level_name
    if (sessLevel && levelFilter && String(sessLevel) !== String(levelFilter)) {
      setHeadsUpSession(session)
      return
    }
    setSelectedSessions(prev => [...prev, session])
  }

  async function handleSeasonCheckout(payOption, amount, promoCode, extraData) {
    setBooking('season')
    try {
      for (const session of selectedSessions) {
        await enrolments.create({ student: user.id, class_session: session.id, status: 'active', enrolment_type: 'course' })
      }
      if (promoCode) {
        await payments.promoCodes.use({ code: promoCode }).catch(() => {})
      }
      setShowSeasonCheckout(false)
      const newBooked = {}
      selectedSessions.forEach(s => { newBooked[s.id + '-season'] = true })
      setBooked(b => ({ ...b, ...newBooked }))
      selectedSessions.forEach(s => maybeShowFirstTimerInfo(s))
      setSelectedSessions([])
      refetchActiveEnrol()

      if (payOption === 'full') {
        Alert.alert('You\'re booked!', `Payment of $${amount} confirmed. Your spot is reserved for the season.`)
      } else if (payOption === 'deposit') {
        Alert.alert('You\'re booked!', `Deposit of $${amount} confirmed. Your spot is reserved — the balance will be charged automatically when the season commences.`)
      } else if (payOption === 'plan') {
        Alert.alert('You\'re booked!', "Your spot is held for 24 hours while we review your payment plan request. You'll receive a confirmation once approved — no payment is taken until then.")
      } else if (payOption === 'cash') {
        const dateLabel = extraData?.cashDate
          ? extraData.cashDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
          : 'on the day'
        Alert.alert('You\'re booked!', `Your spot is reserved. Please bring cash on ${dateLabel}. Your card is saved as a backup in case you don't.`)
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || err.message || 'Please try again or contact the studio.'
      Alert.alert('Booking failed', detail)
    } finally {
      setBooking(null)
    }
  }

  // Casual date-view: fetch all upcoming occurrences for casual-eligible sessions
  const casualSessionKey = casualSessions.map(s => s.id).sort().join(',')
  useEffect(() => {
    if (!casualSessions.length) { setCasualAllOccs([]); return }
    setCasualAllOccs(null)
    let cancelled = false
    Promise.all(casualSessions.map(s =>
      classes.casual.occurrences({ session: s.id, upcoming: true })
        .then(r => r.data?.results ?? r.data ?? [])
        .catch(() => [])
    )).then(arrays => {
      if (cancelled) return
      const all = arrays.flat().sort((a, b) => {
        const d = (a.date ?? '').localeCompare(b.date ?? '')
        if (d !== 0) return d
        return (a.session_detail?.start_time ?? '').localeCompare(b.session_detail?.start_time ?? '')
      })
      setCasualAllOccs(all)
    })
    return () => { cancelled = true }
  }, [casualSessionKey])

  // Filter casual occurrences based on current filters
  const casualFilteredIds = new Set(casualFiltered.map(s => s.id))
  const casualAllOccsFiltered = (casualAllOccs ?? []).filter(occ => {
    const sessId = occ.session ?? occ.session_detail?.id
    return casualFilteredIds.has(sessId)
  })

  async function bookCasualOcc(occ, enrolmentType) {
    setCasualBookingId(occ.id)
    try {
      if (enrolmentType === 'casual') {
        const amountCents = Math.round(priceCasual * 100)
        const sessName = occ.session_detail?.name ?? 'Class'
        const { data: pi } = await payments.stripe.createPaymentIntent({
          amount_cents: amountCents,
          description: `Casual class — ${sessName}`,
          save_method: true,
        })
        const { error: initErr } = await initPaymentSheet({
          merchantDisplayName: 'Duality Pole Studio',
          paymentIntentClientSecret: pi.client_secret,
          allowsDelayedPaymentMethods: false,
          appearance: STRIPE_APPEARANCE,
        })
        if (initErr) { Alert.alert('Error', initErr.message); return }
        const { error: presentErr } = await presentPaymentSheet()
        if (presentErr) { if (presentErr.code !== 'Canceled') Alert.alert('Payment failed', presentErr.message); return }
      }
      const res = await classes.casual.book(occ.id, { enrolment_type: enrolmentType })
      setCasualAllOccs(prev => prev?.map(o => o.id === occ.id
        ? { ...o, my_booking: res.data, spots_left: res.data.status === 'confirmed' ? Math.max(0, (o.spots_left ?? 0) - 1) : (o.spots_left ?? 0) }
        : o
      ))
      if (enrolmentType === 'catchup' && res.data.status === 'confirmed') refetchCredits()
      if (enrolmentType === 'classpass' && res.data.status === 'confirmed') refetchPasses()
      if (res.data.status === 'confirmed') maybeShowFirstTimerInfo(occ.session_detail)
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail ?? 'Could not complete booking. Please try again.')
    } finally {
      setCasualBookingId(null)
    }
  }

  async function cancelCasualOcc(occ) {
    setCasualBookingId(occ.id)
    try {
      await classes.casual.cancel(occ.id)
      setCasualAllOccs(prev => prev?.map(o => o.id === occ.id
        ? { ...o, my_booking: null, spots_left: occ.my_booking?.status === 'confirmed' ? (o.spots_left ?? 0) + 1 : (o.spots_left ?? 0) }
        : o
      ))
      if (occ.my_booking?.enrolment_type === 'catchup') refetchCredits()
      if (occ.my_booking?.enrolment_type === 'classpass') refetchPasses()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail ?? 'Could not cancel.')
    } finally {
      setCasualBookingId(null)
    }
  }

  async function handleWorkshopBook(workshop) {
    setBooking(workshop.id)
    try {
      const res = await classes.workshops.book(workshop.id)
      setBooked(b => ({ ...b, ['w-' + workshop.id]: res.data?.status ?? 'confirmed' }))
      refetchWorkshops()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail ?? 'Could not book workshop.')
    } finally {
      setBooking(null)
    }
  }

  async function handleWorkshopCancel(workshop) {
    Alert.alert('Cancel booking', `Cancel your booking for ${workshop.name}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel booking', style: 'destructive',
        onPress: async () => {
          setBooking(workshop.id)
          try {
            await classes.workshops.cancel(workshop.id)
            setBooked(b => { const n = { ...b }; delete n['w-' + workshop.id]; return n })
            refetchWorkshops()
          } catch (err) {
            Alert.alert('Error', err.response?.data?.detail ?? 'Could not cancel.')
          } finally {
            setBooking(null)
          }
        },
      },
    ])
  }

  async function handleExemptionSubmit() {
    if (!exemptionSession) return
    setSubmittingExemption(true)
    try {
      await enrolments.create({
        student: user.id,
        class_session: exemptionSession.id,
        status: 'exemption_requested',
        enrolment_type: 'casual',
        notes: exemptionNote.trim(),
      })
      setBooked(b => ({ ...b, [exemptionSession.id + '-exemption']: true }))
      setExemptionSession(null)
      setExemptionNote('')
      Alert.alert('Request sent', "Your exemption request has been submitted. The studio will review and get back to you.")
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail ?? 'Could not submit exemption request.')
    } finally {
      setSubmittingExemption(false)
    }
  }

  const isLoading = tab === 'workshops' ? wsLoading : sessLoading
  const onRefresh = tab === 'workshops' ? refetchWorkshops : refetchSessions
  // trial and season both use sessions data

  // ── render ─────────────────────────────────────────────────────────────────
  if (isOwing) {
    return (
      <View style={s.root}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🔒</Text>
          <Text style={{ fontFamily: 'Archivo Black', fontSize: 20, color: '#fff', marginBottom: 10, textAlign: 'center' }}>Outstanding balance</Text>
          <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
            You have an outstanding balance of{' '}
            <Text style={{ color: '#ff4444', fontWeight: '700' }}>${Math.abs(currentBalance).toFixed(2)}</Text>.{'\n'}
            Please settle your account before booking another class.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#DBFF00', borderRadius: 10, paddingHorizontal: 28, paddingVertical: 14 }}
            onPress={() => navigation.navigate('Billing')}
          >
            <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>Pay now</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={s.root}>

      {/* ── Practice banner ─────────────────────────────────────────────── */}
      <TouchableOpacity style={s.practiceBanner} onPress={() => navigation.navigate('Practice')} activeOpacity={0.8}>
        <Text style={s.practiceBannerText}>■  Book open practice time  →</Text>
      </TouchableOpacity>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabBar}
        contentContainerStyle={s.tabBarContent}
      >
        {TABS.filter(t => t.key !== 'trial' || isNewStudent).map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[s.tab, tab === key && s.tabActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={T.lime} />}
      >

        {/* ══════════════════════════════════════════════════════════════════
            BOOK A SEASON
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'season' && bookingSeason && bookingSeason.bookings_open === false && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 }}>
            <Text style={{ fontSize: 44, marginBottom: 16 }}>🔒</Text>
            <Text style={{ fontFamily: 'Archivo Black', fontSize: 20, color: '#fff', marginBottom: 10, textAlign: 'center' }}>
              {bookingSeason.name}
            </Text>
            <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 }}>
              Enrolments for this season aren't open yet.{'\n'}Check back soon or contact the studio.
            </Text>
          </View>
        )}

        {tab === 'season' && !(bookingSeason && bookingSeason.bookings_open === false) && (
          <>
            {bookableSeasons.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
                {bookableSeasons.map(s2 => {
                  const isActive = (bookingSeason?.id === s2.id)
                  return (
                    <TouchableOpacity
                      key={s2.id}
                      onPress={() => { setSelectedSeasonId(s2.id); setSelectedSessions([]) }}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                        backgroundColor: isActive ? T.lime : T.card,
                        borderWidth: 1, borderColor: isActive ? T.lime : T.border,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? '#000' : T.muted }}>{s2.name}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            )}

            <View style={s.seasonInfoCard}>
              <View style={s.limeAccentBar} />
              <View style={s.seasonInfoBody}>
                <Text style={s.seasonInfoTitle}>
                  {bookingSeason?.name ?? 'Season Enrolment'}
                </Text>
                {bookingSeason?.start_date && bookingSeason?.end_date && (
                  <Text style={s.seasonInfoDates}>
                    {new Date(bookingSeason.start_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    {' – '}
                    {new Date(bookingSeason.end_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                )}
                {activeSeasonCount > 0 ? (
                  <Text style={s.seasonInfoPrice}>
                    +${seasonPrice} to add a class (upgrading from {activeSeasonCount}-class package)
                  </Text>
                ) : (
                  <Text style={s.seasonInfoPrice}>${getSeasonPriceForTotal(1)} for 1 class · more classes = better value</Text>
                )}
              </View>
            </View>

            {/* ── Filters ── */}
            <View style={s.filterBar}>
              <View style={s.filterRow}>
                <Text style={s.filterLabel}>Show eligible classes only</Text>
                <Switch
                  value={eligibleOnly}
                  onValueChange={setEligibleOnly}
                  trackColor={{ false: T.border, true: T.lime }}
                  thumbColor={eligibleOnly ? '#000' : '#888'}
                />
              </View>
              {levelFilter && eligibleOnly && (
                <Text style={s.levelInfo}>Showing classes matching your level</Text>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}>
              <TouchableOpacity
                onPress={() => setDayFilter(null)}
                style={[s.filterPill, dayFilter === null && s.filterPillActive]}
              >
                <Text style={[s.filterPillText, dayFilter === null && s.filterPillTextActive]}>All days</Text>
              </TouchableOpacity>
              {DAYS_SHORT.map((d, i) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDayFilter(dayFilter === i ? null : i)}
                  style={[s.filterPill, dayFilter === i && s.filterPillActive]}
                >
                  <Text style={[s.filterPillText, dayFilter === i && s.filterPillTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {uniqueInstructors.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}>
                <TouchableOpacity
                  onPress={() => setInstructorFilter(null)}
                  style={[s.filterPill, !instructorFilter && s.filterPillActive]}
                >
                  <Text style={[s.filterPillText, !instructorFilter && s.filterPillTextActive]}>All instructors</Text>
                </TouchableOpacity>
                {uniqueInstructors.map(name => (
                  <TouchableOpacity
                    key={name}
                    onPress={() => setInstructorFilter(instructorFilter === name ? null : name)}
                    style={[s.filterPill, instructorFilter === name && s.filterPillActive]}
                  >
                    <Text style={[s.filterPillText, instructorFilter === name && s.filterPillTextActive]}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {sessLoading && <ActivityIndicator color={T.lime} style={{ marginTop: 24 }} />}

            {!sessLoading && seasonFiltered.length === 0 && bookingSeasonSessions.length === 0 && (
              <Text style={s.empty}>
                {bookingSeason ? `No classes are set up for ${bookingSeason.name} yet — check back soon.` : 'No classes available right now.'}
              </Text>
            )}

            {!sessLoading && seasonFiltered.length === 0 && bookingSeasonSessions.length > 0 && (
              <Text style={s.empty}>No classes match your current filters.</Text>
            )}

            {seasonFiltered.map(session => {
              const isSelected = selectedSessions.some(s => s.id === session.id)
              const isBooked = booked[session.id + '-season'] || enrolledSessionIds.has(session.id)
              const spotsLeft = (session.capacity ?? 12) - (session.enrolled_count ?? 0)
              const isFull = spotsLeft <= 0
              const levelBadge = getLevelBadge(session.name)
              const sessLevel = session.level ?? session.level_name
              const isOutOfLevel = !isBooked && levelFilter && sessLevel && String(sessLevel) !== String(levelFilter)
              return (
                <TouchableOpacity
                  key={session.id}
                  style={[s.card, isSelected && s.cardSelected, isBooked && s.cardBooked, isOutOfLevel && s.cardOutOfLevel]}
                  onPress={() => !isBooked && !isFull && toggleSession(session)}
                  activeOpacity={isBooked || isFull ? 1 : 0.75}
                >
                  <View style={s.sessionRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                        <Text style={[s.sessionName, isOutOfLevel && { color: T.muted }]}>{session.name}</Text>
                        {levelBadge && (
                          <View style={{ backgroundColor: levelBadge.bg, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: levelBadge.color }}>{levelBadge.label}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.sessionMeta}>
                        {[
                          session.day_of_week != null ? DAYS_SHORT[session.day_of_week] : null,
                          session.start_time ? fmtTime(session.start_time) : null,
                          session.studio_detail?.name ?? session.studio?.name,
                          session.instructor_detail?.display_name ?? session.instructor_detail?.first_name,
                        ].filter(Boolean).join('  ·  ')}
                      </Text>
                      {isOutOfLevel && (
                        <Text style={{ fontSize: 11, color: '#f59e0b', marginTop: 4, fontWeight: '600' }}>
                          🔒 Outside your current level — tap to request
                        </Text>
                      )}
                      {!isOutOfLevel && spotsLeft > 0 && spotsLeft <= 2 && (
                        <Text style={s.spotsWarning}>{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left</Text>
                      )}
                      {isFull && <Text style={s.spotsFull}>Full</Text>}
                    </View>
                    {isBooked ? (
                      <Text style={s.bookedBadge}>✓ Booked</Text>
                    ) : booked[session.id + '-waitlist'] ? (
                      <Text style={s.bookedBadge}>⏳ Waitlisted</Text>
                    ) : isOutOfLevel ? (
                      <Text style={{ fontSize: 18 }}>🔒</Text>
                    ) : isFull ? (
                      <TouchableOpacity
                        style={s.waitlistBtn}
                        onPress={async () => {
                          try {
                            await enrolments.create({ student: user.id, class_session: session.id, status: 'waitlisted', enrolment_type: 'course' })
                            setBooked(b => ({ ...b, [session.id + '-waitlist']: true }))
                          } catch { }
                        }}
                      >
                        <Text style={s.waitlistBtnText}>JOIN WAITLIST</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[s.checkCircle, isSelected && s.checkCircleSelected]}>
                        {isSelected && <Text style={s.checkMark}>✓</Text>}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            CASUAL / DROP-IN
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'casual' && (() => {
          // Build next-14-days strip for calendar mode
          const next14 = Array.from({ length: 14 }, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() + i)
            return d.toISOString().slice(0, 10)
          })
          const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

          // Group occurrences by date (filtered for calendar mode + session filters)
          const occsToShow = casualAllOccsFiltered.filter(occ => {
            if (casualViewMode === 'calendar' && casualSelectedDate) return occ.date === casualSelectedDate
            return true
          })
          const byDate = {}
          occsToShow.forEach(occ => {
            if (!byDate[occ.date]) byDate[occ.date] = []
            byDate[occ.date].push(occ)
          })
          const dateGroups = Object.entries(byDate)

          return (
            <>
              {/* Catch-up credits banner */}
              {availableCredits > 0 && (
                <View style={{
                  backgroundColor: 'rgba(204,255,0,0.06)', borderWidth: 1,
                  borderColor: 'rgba(204,255,0,0.2)', borderRadius: 12, padding: 16, marginBottom: 14,
                }}>
                  <Text style={{ fontWeight: '700', fontSize: 15, color: T.text, marginBottom: 4 }}>
                    {availableCredits} catch-up credit{availableCredits !== 1 ? 's' : ''} available
                  </Text>
                  <Text style={{ fontSize: 12, color: T.muted, lineHeight: 18 }}>
                    Tap any class below and choose "Use class credit" to book a make-up — no charge.
                  </Text>
                  {creditExpiry && (
                    <Text style={{ fontSize: 11, color: '#ffaa00', marginTop: 6, fontWeight: '600' }}>
                      Expires {new Date(creditExpiry).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                </View>
              )}

              {/* Trial banner */}
              {isNewStudent && (
                <View style={s.trialBanner}>
                  <Text style={s.trialBannerText}>First time? 🔥 Book a trial class for just ${priceTrial}</Text>
                  <TouchableOpacity style={s.trialBannerBtn} onPress={() => setTab('trial')}>
                    <Text style={s.trialBannerBtnText}>BOOK TRIAL →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Class pass card */}
              {passClassesRemaining > 0 ? (
                <View style={[s.creditsCard, { borderColor: 'rgba(124,58,237,0.4)', backgroundColor: 'rgba(124,58,237,0.07)' }]}>
                  <Text style={[s.creditsNumber, { color: '#b0a0ff' }]}>{passClassesRemaining}</Text>
                  <View style={{ flex: 1, paddingLeft: 14 }}>
                    <Text style={[s.creditsLabel, { color: '#b0a0ff' }]}>{classPassSize}-class pass — {passClassesRemaining} remaining</Text>
                    <Text style={s.creditsExpiry}>Tap BOOK → use class pass credit</Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={s.passPromoCard} onPress={() => setBuyingPass(true)} activeOpacity={0.8}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.passPromoTitle}>{classPassSize}-class pass · ${priceClassPass}</Text>
                    <Text style={s.passPromoSub}>Save on casual bookings — use any time this season</Text>
                  </View>
                  <Text style={s.passPromoArrow}>→</Text>
                </TouchableOpacity>
              )}

              {/* ── Filters ── */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}>
                <TouchableOpacity onPress={() => setDayFilter(null)} style={[s.filterPill, dayFilter === null && s.filterPillActive]}>
                  <Text style={[s.filterPillText, dayFilter === null && s.filterPillTextActive]}>All days</Text>
                </TouchableOpacity>
                {DAYS_SHORT.map((d, i) => (
                  <TouchableOpacity key={d} onPress={() => setDayFilter(dayFilter === i ? null : i)} style={[s.filterPill, dayFilter === i && s.filterPillActive]}>
                    <Text style={[s.filterPillText, dayFilter === i && s.filterPillTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {uniqueInstructors.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}>
                  <TouchableOpacity onPress={() => setInstructorFilter(null)} style={[s.filterPill, !instructorFilter && s.filterPillActive]}>
                    <Text style={[s.filterPillText, !instructorFilter && s.filterPillTextActive]}>All instructors</Text>
                  </TouchableOpacity>
                  {uniqueInstructors.map(name => (
                    <TouchableOpacity key={name} onPress={() => setInstructorFilter(instructorFilter === name ? null : name)} style={[s.filterPill, instructorFilter === name && s.filterPillActive]}>
                      <Text style={[s.filterPillText, instructorFilter === name && s.filterPillTextActive]}>{name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* List / Calendar toggle */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {[['list', 'List'], ['calendar', 'Calendar']].map(([mode, label]) => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => { setCasualViewMode(mode); setCasualSelectedDate(null) }}
                    style={{
                      flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
                      backgroundColor: casualViewMode === mode ? T.lime : T.card,
                      borderWidth: 1, borderColor: casualViewMode === mode ? T.lime : T.border,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: casualViewMode === mode ? '#000' : T.muted }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Calendar strip — 14-day scroll */}
              {casualViewMode === 'calendar' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}>
                  {next14.map(dateStr => {
                    const d = new Date(dateStr + 'T00:00')
                    const hasOccs = (casualAllOccs ?? []).some(o => o.date === dateStr)
                    const isSelected = casualSelectedDate === dateStr
                    return (
                      <TouchableOpacity
                        key={dateStr}
                        onPress={() => setCasualSelectedDate(isSelected ? null : dateStr)}
                        style={{
                          width: 52, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                          backgroundColor: isSelected ? T.lime : hasOccs ? 'rgba(204,255,0,0.08)' : T.card,
                          borderWidth: 1, borderColor: isSelected ? T.lime : hasOccs ? 'rgba(204,255,0,0.25)' : T.border,
                        }}
                      >
                        <Text style={{ fontSize: 10, color: isSelected ? '#000' : T.muted, fontWeight: '600', marginBottom: 3 }}>{DAY_LABELS[d.getDay()]}</Text>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: isSelected ? '#000' : hasOccs ? T.lime : T.muted }}>{d.getDate()}</Text>
                        {hasOccs && !isSelected && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: T.lime, marginTop: 4 }} />}
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              )}

              {/* Date-grouped occurrence list */}
              {sessLoading || casualAllOccs === null ? (
                <ActivityIndicator color={T.lime} style={{ marginTop: 24 }} />
              ) : dateGroups.length === 0 ? (
                <Text style={s.empty}>
                  {casualViewMode === 'calendar' && casualSelectedDate
                    ? 'No classes on this day.'
                    : 'No upcoming classes available.'}
                </Text>
              ) : (
                dateGroups.map(([dateStr, occs]) => {
                  const dateObj = new Date(dateStr + 'T00:00')
                  const dateLabel = dateObj.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
                  return (
                    <View key={dateStr} style={{ marginBottom: 18 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>{dateLabel}</Text>
                      {occs.map(occ => {
                        const sess = occ.session_detail
                        const sessId = occ.session
                        const name = sess?.name ?? 'Class'
                        const time = fmtTime(sess?.start_time)
                        const instructor = sess?.instructor_detail?.display_name ?? sess?.instructor_detail?.first_name ?? null
                        const studio = sess?.studio_detail?.name ?? null
                        const spotsLeft = occ.spots_left ?? 0
                        const isFull = spotsLeft <= 0
                        const myBooking = occ.my_booking
                        const isConfirmed = myBooking?.status === 'confirmed'
                        const isWaitlisted = myBooking?.status === 'waitlisted'
                        const isProcessing = casualBookingId === occ.id
                        const alreadySeason = enrolledSessionIds.has(sessId)
                        const levelBadge = getLevelBadge(name)

                        return (
                          <View key={occ.id} style={[s.casualCard, { marginBottom: 8 }, (isConfirmed || isWaitlisted) && { borderColor: isConfirmed ? 'rgba(204,255,0,0.3)' : 'rgba(255,170,0,0.3)', backgroundColor: isConfirmed ? 'rgba(204,255,0,0.04)' : 'rgba(255,170,0,0.04)' }]}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                                <Text style={s.casualCardName}>{name}</Text>
                                {levelBadge && (
                                  <View style={{ backgroundColor: levelBadge.bg, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 }}>
                                    <Text style={{ fontSize: 9, fontWeight: '700', color: levelBadge.color }}>{levelBadge.label}</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={s.casualCardMeta}>{[time, instructor].filter(Boolean).join('  ·  ')}</Text>
                              {studio && <Text style={s.casualCardStudio}>{studio}</Text>}
                              {isConfirmed && <Text style={{ fontSize: 11, color: T.lime, marginTop: 4, fontWeight: '600' }}>✓ Booked</Text>}
                              {isWaitlisted && <Text style={{ fontSize: 11, color: '#ffaa44', marginTop: 4, fontWeight: '600' }}>On waitlist</Text>}
                              {alreadySeason && !myBooking && <Text style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Season class</Text>}
                            </View>
                            <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', paddingLeft: 10, minWidth: 80 }}>
                              {!myBooking && isFull && (
                                <Text style={s.casualCardSpotsFull}>Class full</Text>
                              )}
                              {!myBooking && !isFull && spotsLeft <= 2 && spotsLeft > 0 && (
                                <Text style={s.casualCardSpots}>{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left</Text>
                              )}
                              {isProcessing ? (
                                <ActivityIndicator color={T.lime} size="small" style={{ marginTop: 6 }} />
                              ) : isConfirmed || isWaitlisted ? (
                                <TouchableOpacity
                                  style={[s.waitlistBtn, { borderColor: '#ef4444' }]}
                                  onPress={() => cancelCasualOcc(occ)}
                                >
                                  <Text style={[s.waitlistBtnText, { color: '#ef4444' }]}>{isWaitlisted ? 'LEAVE' : 'CANCEL'}</Text>
                                </TouchableOpacity>
                              ) : alreadySeason ? null : isFull ? (
                                <TouchableOpacity style={s.waitlistBtn} onPress={() => bookCasualOcc(occ, 'casual')}>
                                  <Text style={s.waitlistBtnText}>WAITLIST</Text>
                                </TouchableOpacity>
                              ) : (
                                <TouchableOpacity
                                  style={s.casualBookBtn}
                                  onPress={() => openCasualBooking(occ)}
                                  activeOpacity={0.8}
                                >
                                  <Text style={s.casualBookBtnText}>BOOK</Text>
                                  <Text style={{ fontSize: 10, color: '#000', fontWeight: '700', marginTop: 1 }}>${activeSeasonCount > 0 ? priceCasualEnrolled : priceCasual}</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        )
                      })}
                    </View>
                  )
                })
              )}
            </>
          )
        })()}

        {/* ══════════════════════════════════════════════════════════════════
            CATCH-UP CLASSES
        ══════════════════════════════════════════════════════════════════ */}

        {/* ══════════════════════════════════════════════════════════════════
            TRIAL CLASS
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'trial' && (
          <>
            {/* Hero card */}
            <View style={s.trialHero}>
              <View style={{ flex: 1 }}>
                <Text style={s.trialHeroTitle}>Try Your First Class</Text>
                <Text style={s.trialHeroBody}>Your first class, no experience needed. Wear comfortable activewear, bring water — we'll do the rest.</Text>
              </View>
              <View style={s.trialPriceBox}>
                <Text style={s.trialPrice}>${priceTrial}</Text>
                <Text style={s.trialPriceLabel}>trial rate</Text>
              </View>
            </View>

            <Text style={s.subSectionLabel}>Available Classes for Your Trial</Text>

            {sessLoading ? (
              <ActivityIndicator color={T.lime} style={{ marginTop: 24 }} />
            ) : allSessions.length === 0 ? (
              <Text style={s.empty}>No classes available right now.</Text>
            ) : (
              allSessions.map(sess => {
                const isBooked = booked[sess.id + '-season'] || enrolledSessionIds.has(sess.id)
                const instructorName = sess.instructor_detail
                  ? (sess.instructor_detail.display_name || sess.instructor_detail.first_name || '').trim()
                  : (sess.instructor_name || '')
                const dayLabel = sess.day_of_week != null
                  ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][sess.day_of_week] : ''
                return (
                  <View key={sess.id} style={[s.trialCard, booking === sess.id + '-trial' && { opacity: 0.6 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={s.trialCardName}>{sess.name}</Text>
                        <Text style={s.trialCardMeta}>
                          {[dayLabel, fmtTime(sess.start_time)].filter(Boolean).join(' · ')}
                        </Text>
                        {sess.studio_detail?.name && (
                          <Text style={s.trialCardMeta}>{sess.studio_detail.name}</Text>
                        )}
                        {!!instructorName && (
                          <Text style={s.trialCardInstructor}>Instructor: {instructorName}</Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.trialCardPrice}>${priceTrial}</Text>
                        <Text style={s.trialCardPriceLabel}>trial</Text>
                      </View>
                    </View>
                    {isBooked ? (
                      <View style={s.trialBookedRow}>
                        <Text style={s.trialBookedText}>✓ Already enrolled</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[s.trialBookBtn, booking === sess.id + '-trial' && s.limeBtnDisabled]}
                        disabled={booking === sess.id + '-trial'}
                        onPress={async () => {
                          setBooking(sess.id + '-trial')
                          try {
                            const amountCents = Math.round(priceTrial * 100)
                            const { data: pi } = await payments.stripe.createPaymentIntent({
                              amount_cents: amountCents,
                              description: `Trial class — ${sess.name ?? sess.session_name ?? 'Class'}`,
                              save_method: true,
                            })
                            const { error: initErr } = await initPaymentSheet({
                              merchantDisplayName: 'Duality Pole Studio',
                              paymentIntentClientSecret: pi.client_secret,
                              allowsDelayedPaymentMethods: false,
                              appearance: STRIPE_APPEARANCE,
                            })
                            if (initErr) { Alert.alert('Error', initErr.message); return }
                            const { error: presentErr } = await presentPaymentSheet()
                            if (presentErr) { if (presentErr.code !== 'Canceled') Alert.alert('Payment failed', presentErr.message); return }
                            await enrolments.create({ student: user.id, class_session: sess.id, status: 'active', enrolment_type: 'trial' })
                            setBooked(b => ({ ...b, [sess.id + '-trial']: true }))
                            Alert.alert('Trial booked! 🎉', `Payment of $${priceTrial} confirmed. See you in class!`)
                            maybeShowFirstTimerInfo(sess)
                          } catch (err) {
                            Alert.alert('Booking failed', err.response?.data?.detail ?? 'Could not book trial. Please try again.')
                          } finally {
                            setBooking(null)
                          }
                        }}
                      >
                        {booking === sess.id + '-trial'
                          ? <ActivityIndicator size="small" color="#000" />
                          : <Text style={s.trialBookBtnText}>Book Trial →</Text>
                        }
                      </TouchableOpacity>
                    )}
                  </View>
                )
              })
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            WORKSHOPS & EVENTS
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'workshops' && (
          <>
            {workshopList.length === 0 && !wsLoading && (
              <Text style={s.empty}>No workshops coming up.</Text>
            )}
            {workshopList.map(w => {
              const liveStatus = booked['w-' + w.id] ?? w.booking_status
              const confirmed = liveStatus === 'confirmed'
              const waitlisted = liveStatus === 'waitlisted'
              const isFull = w.spots_left === 0 || (w.capacity != null && (w.capacity - (w.bookings_count ?? 0)) <= 0)

              return (
                <View key={w.id} style={[s.card, confirmed && { borderColor: T.lime, borderWidth: 1 }]}>
                  <Text style={s.sessionName}>{w.name}</Text>
                  {w.date && (
                    <Text style={s.sessionMeta}>
                      {new Date(w.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {w.start_time ? `  ·  ${fmtTime(w.start_time)}` : ''}
                    </Text>
                  )}
                  {w.studio_detail?.name && <Text style={s.sessionMeta}>{w.studio_detail.name}</Text>}
                  {w.description ? (
                    <Text style={s.workshopDesc} numberOfLines={3}>{w.description}</Text>
                  ) : null}
                  {w.price != null && (
                    <Text style={s.workshopPrice}>${parseFloat(w.price).toFixed(0)}</Text>
                  )}

                  {confirmed ? (
                    <View style={s.confirmedRow}>
                      <Text style={s.confirmedText}>✓ Booked</Text>
                      <TouchableOpacity onPress={() => handleWorkshopCancel(w)}>
                        <Text style={s.cancelLink}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  ) : waitlisted ? (
                    <View style={s.confirmedRow}>
                      <Text style={s.waitlistText}>On waitlist</Text>
                      <TouchableOpacity onPress={() => handleWorkshopCancel(w)}>
                        <Text style={s.cancelLink}>Leave</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[s.limeBtn, booking === w.id && s.limeBtnDisabled]}
                      onPress={() => handleWorkshopBook(w)}
                      disabled={booking === w.id}
                    >
                      {booking === w.id
                        ? <ActivityIndicator size="small" color="#000" />
                        : <Text style={s.limeBtnText}>
                            {isFull ? 'Join waitlist' : `Book — $${parseFloat(w.price ?? 0).toFixed(0)}`}
                          </Text>
                      }
                    </TouchableOpacity>
                  )}
                </View>
              )
            })}
          </>
        )}

      </ScrollView>

      {/* ── Season sticky proceed bar ────────────────────────────────────── */}
      {tab === 'season' && selectedSessions.length > 0 && (
        <View style={s.proceedBar}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={s.proceedCount}>
              {selectedSessions.length} class{selectedSessions.length !== 1 ? 'es' : ''} selected
              {activeSeasonCount > 0 ? ` · adding to ${activeSeasonCount}-class package` : ''}
            </Text>
            <Text style={s.proceedPrice}>${totalSeasonPrice}</Text>
          </View>
          <TouchableOpacity style={s.proceedBtn} onPress={() => setShowSeasonCheckout(true)}>
            <Text style={s.proceedBtnText}>Proceed →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Heads-up modal ───────────────────────────────────────────────── */}
      <HeadsUpModal
        session={headsUpSession}
        onConfirm={() => {
          setSelectedSessions(prev => [...prev, headsUpSession])
          setHeadsUpSession(null)
        }}
        onCancel={() => setHeadsUpSession(null)}
      />

      {/* ── Season checkout modal ─────────────────────────────────────────── */}
      <SeasonCheckoutModal
        visible={showSeasonCheckout}
        sessions={selectedSessions}
        totalPrice={totalSeasonPrice}
        seasonName={bookingSeason?.name}
        upcomingSeason={bookingSeason}
        onClose={() => setShowSeasonCheckout(false)}
        onConfirm={handleSeasonCheckout}
      />

      {/* ── Class pass checkout modal ─────────────────────────────────────── */}
      <ClassPassCheckoutModal
        visible={buyingPass}
        price={priceClassPass}
        size={classPassSize}
        onClose={() => setBuyingPass(false)}
        onSuccess={() => { setBuyingPass(false); refetchPasses() }}
      />

      {/* ── Casual warning modal (out-of-level / post-cutoff) ─────────────── */}
      {!!casualWarning && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setCasualWarning(null)}>
          <View style={hu.overlay}>
            <View style={hu.sheet}>
              <View style={hu.header}>
                <Text style={hu.title}>{casualWarning.type === 'level' ? 'Outside your level' : 'Past catch-up window'}</Text>
                <TouchableOpacity onPress={() => setCasualWarning(null)} style={hu.closeBtn}>
                  <Text style={hu.closeBtnText}>CLOSE</Text>
                </TouchableOpacity>
              </View>
              <Text style={hu.warn}>{casualWarning.type === 'level' ? '🔒' : '⏰'}</Text>
              <Text style={hu.classLine}>
                {getSessionName(casualWarning.occ.session_detail)}
                {casualWarning.occ.session_detail?.day_of_week != null
                  ? ` · ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][casualWarning.occ.session_detail.day_of_week]}`
                  : ''}
              </Text>
              <Text style={hu.body}>
                {casualWarning.type === 'level'
                  ? "This class is outside your current level. You'll need to submit an exemption request — your instructor will review it before confirming your spot."
                  : `Catch-up credits can't be used after week ${casualWarning.occ.session_detail?.catchup_cutoff_weeks ?? 3} of the season (currently week ${currentSeasonWeek}). Submit an exemption request and the studio will review it.`}
              </Text>
              <View style={hu.actions}>
                <TouchableOpacity
                  style={hu.confirmBtn}
                  onPress={() => {
                    const sess = casualWarning.occ.session_detail
                    setCasualWarning(null)
                    setExemptionSession(sess)
                  }}
                >
                  <Text style={hu.confirmText}>REQUEST EXEMPTION</Text>
                </TouchableOpacity>
                {casualWarning.type === 'cutoff' && (
                  <TouchableOpacity
                    style={[hu.cancelBtn, { borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 }]}
                    onPress={() => { const occ = casualWarning.occ; setCasualWarning(null); setBookingOptionsOcc(occ) }}
                  >
                    <Text style={[hu.cancelText, { color: T.text }]}>PAY CASUAL RATE INSTEAD</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={hu.cancelBtn} onPress={() => setCasualWarning(null)}>
                  <Text style={hu.cancelText}>CANCEL</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Casual booking options modal ──────────────────────────────────── */}
      <CasualBookingOptionsModal
        visible={!!bookingOptionsOcc}
        occ={bookingOptionsOcc}
        priceCasual={priceCasual}
        priceCasualEnrolled={priceCasualEnrolled}
        priceClassPass={priceClassPass}
        classPassSize={classPassSize}
        availableCredits={availableCredits}
        passClassesRemaining={passClassesRemaining}
        activeSeason={activeSeason}
        bookingSeason={bookingSeason}
        activeSeasonCount={activeSeasonCount}
        currentSeasonWeek={currentSeasonWeek}
        onClose={() => setBookingOptionsOcc(null)}
        onBook={(type) => {
          if (type === 'buypass') { setBookingOptionsOcc(null); setBuyingPass(true); return }
          const occ = bookingOptionsOcc
          setBookingOptionsOcc(null)
          bookCasualOcc(occ, type)
        }}
        onRequestExemption={(sess) => {
          setBookingOptionsOcc(null)
          setExemptionSession(sess)
        }}
        onEnrolSeason={() => {
          setBookingOptionsOcc(null)
          setTab('season')
        }}
      />

      {/* ── Exemption Request Modal ───────────────────────────────────────── */}
      {exemptionSession && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setExemptionSession(null)}>
          <View style={ms.overlay}>
            <View style={ms.sheet}>
              <View style={ms.header}>
                <Text style={ms.sheetTitle} numberOfLines={2}>Request Exemption</Text>
                <TouchableOpacity onPress={() => setExemptionSession(null)} style={ms.closeBtn}>
                  <Text style={ms.closeBtnText}>CLOSE</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 15, fontWeight: '700', color: T.text, marginBottom: 4 }}>{exemptionSession.name}</Text>
              <Text style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][exemptionSession.day_of_week]}  ·  {fmtTime(exemptionSession.start_time)}
              </Text>

              <View style={{ backgroundColor: '#1a0a00', borderRadius: 12, borderWidth: 1, borderColor: '#5a2a00', padding: 14, marginBottom: 20 }}>
                <Text style={{ fontSize: 13, color: '#ffaa44', lineHeight: 20 }}>
                  This class is outside your usual eligibility. Submitting a request will notify the studio team, who will review and confirm if you can attend.
                </Text>
              </View>

              <Text style={{ fontSize: 13, color: T.muted, marginBottom: 8 }}>Note (optional)</Text>
              <TextInput
                style={{
                  backgroundColor: '#1a1a1a', borderRadius: 10, borderWidth: 1, borderColor: T.border,
                  color: T.text, fontSize: 14, padding: 12, minHeight: 80, textAlignVertical: 'top', marginBottom: 20,
                }}
                placeholder="Add a note for the studio..."
                placeholderTextColor={T.muted}
                multiline
                value={exemptionNote}
                onChangeText={setExemptionNote}
              />

              <TouchableOpacity
                style={[ms.confirmBtn, submittingExemption && { opacity: 0.6 }]}
                onPress={handleExemptionSubmit}
                disabled={submittingExemption}
              >
                <Text style={ms.confirmBtnText}>{submittingExemption ? 'SUBMITTING…' : 'SUBMIT REQUEST'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* First-timer info modal */}
      {firstTimerModal && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setFirstTimerModal(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <View style={{ backgroundColor: '#111', borderRadius: 20, width: '100%', borderWidth: 1, borderColor: '#222', overflow: 'hidden' }}>
              <View style={{ backgroundColor: '#ccff00', padding: 20 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#000', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>
                  {firstTimerModal.name}
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#000', lineHeight: 26 }}>
                  {firstTimerModal.headline || 'Welcome to your first class!'}
                </Text>
              </View>
              <View style={{ padding: 20 }}>
                <Text style={{ fontSize: 14, color: '#ccc', lineHeight: 22 }}>
                  {firstTimerModal.body}
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: '#ccff00', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 }}
                  onPress={() => setFirstTimerModal(null)}
                >
                  <Text style={{ color: '#000', fontWeight: '800', fontSize: 15 }}>Got it — see you there!</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

    </View>
  )
}

// ─── modal styles ─────────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: T.text,
    lineHeight: 28,
  },
  closeBtn: {
    marginLeft: 12,
    paddingTop: 4,
  },
  closeBtnText: {
    color: T.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  meta: {
    fontSize: 13,
    color: T.muted,
    marginBottom: 12,
  },
  creditNotice: {
    fontSize: 13,
    color: T.purple,
    fontWeight: '600',
    marginBottom: 16,
  },
  options: {
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    backgroundColor: T.bg,
  },
  optionSelected: {
    borderColor: T.lime,
    borderWidth: 1.5,
  },
  optionCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: T.muted,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: T.lime,
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    color: T.text,
    fontWeight: '500',
  },
  optionSub: {
    fontSize: 12,
    color: T.muted,
    marginTop: 2,
  },
  optionPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: T.text,
    marginLeft: 8,
  },
  confirmBtn: {
    backgroundColor: T.lime,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
})

// ─── screen styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  // tabs
  tabBar: { backgroundColor: T.bg, borderBottomWidth: 1, borderBottomColor: T.border, flexGrow: 0 },
  tabBarContent: { paddingHorizontal: 4 },
  tab: { paddingHorizontal: 16, paddingVertical: 14 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: T.lime },
  tabText: { fontSize: 14, fontWeight: '500', color: T.muted },
  tabTextActive: { color: T.lime, fontWeight: '700' },

  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 80 },
  empty: { textAlign: 'center', color: T.muted, marginTop: 48, fontSize: 14 },

  // season info card
  seasonInfoCard: {
    flexDirection: 'row',
    backgroundColor: T.card,
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.border,
  },
  limeAccentBar: { width: 4, backgroundColor: T.lime },
  seasonInfoBody: { flex: 1, padding: 14 },
  seasonInfoTitle: { fontSize: 17, fontWeight: '800', color: T.text, marginBottom: 2 },
  seasonInfoDates: { fontSize: 12, color: T.muted, marginBottom: 6 },
  seasonInfoSub: { fontSize: 13, color: T.muted, lineHeight: 18, marginBottom: 6 },
  seasonInfoPrice: { fontSize: 14, fontWeight: '700', color: T.lime },

  // generic card
  card: {
    backgroundColor: T.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  cardSelected: { borderColor: T.lime, borderWidth: 1.5 },
  cardBooked: { borderColor: T.lime + '66' },
  cardOutOfLevel: { borderColor: 'rgba(255,170,0,0.3)', backgroundColor: 'rgba(255,170,0,0.03)' },
  sessionRow: { flexDirection: 'row', alignItems: 'center' },
  sessionName: { fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 4 },
  sessionMeta: { fontSize: 13, color: T.muted },
  bookedBadge: { fontSize: 13, color: T.lime, fontWeight: '700' },
  spotsWarning: { fontSize: 11, color: '#ffaa00', fontWeight: '600', marginTop: 4 },
  spotsFull: { fontSize: 11, color: '#ff4444', fontWeight: '600', marginTop: 4 },
  checkCircle: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 12,
  },
  checkCircleSelected: { borderColor: T.lime, backgroundColor: T.lime },
  checkMark: { color: '#000', fontSize: 16, fontWeight: '900', lineHeight: 20 },

  // proceed bar
  proceedBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111', borderTopWidth: 1, borderTopColor: T.lime,
    paddingHorizontal: 20, paddingVertical: 14,
    paddingBottom: 28,
  },
  proceedCount: { fontSize: 13, color: T.muted, fontWeight: '600', flexShrink: 1 },
  proceedPrice: { fontSize: 22, fontWeight: '900', color: T.lime },
  proceedBtn: { backgroundColor: T.lime, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14 },
  proceedBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },

  // lime button
  limeBtn: {
    backgroundColor: T.lime,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    marginLeft: 10,
    minWidth: 90,
  },
  limeBtnDisabled: { opacity: 0.5 },
  limeBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },

  // trial banner
  trialBanner: {
    borderWidth: 1.5,
    borderColor: T.lime,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    backgroundColor: T.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trialBannerText: {
    flex: 1,
    fontSize: 14,
    color: T.text,
    fontWeight: '600',
    lineHeight: 20,
    paddingRight: 8,
  },
  trialBannerBtn: {
    backgroundColor: T.lime,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  trialBannerBtnText: { color: '#000', fontWeight: '800', fontSize: 12 },

  // credits card
  creditsCard: {
    backgroundColor: T.purpleDark,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.purple,
  },
  creditsCardEmpty: {
    backgroundColor: '#0f0f0f',
    borderColor: '#333',
  },
  creditsNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: T.lime,
    lineHeight: 52,
  },
  creditsLabel: { fontSize: 16, fontWeight: '700', color: T.text },
  creditsExpiry: { fontSize: 12, color: T.muted, marginTop: 2 },
  passPromoCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(124,58,237,0.06)', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)',
  },
  passPromoTitle: { fontSize: 14, fontWeight: '700', color: '#b0a0ff', marginBottom: 2 },
  passPromoSub: { fontSize: 12, color: T.muted },
  passPromoArrow: { fontSize: 18, color: '#b0a0ff', fontWeight: '700', marginLeft: 10 },

  // filter bar
  filterBar: {
    backgroundColor: T.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterLabel: { fontSize: 14, color: T.text, fontWeight: '500', flex: 1 },

  // filter pills
  filterPill: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
  },
  filterPillActive: { backgroundColor: T.lime, borderColor: T.lime },
  filterPillText: { fontSize: 12, fontWeight: '600', color: T.muted },
  filterPillTextActive: { color: '#000' },

  // level info
  levelInfo: {
    fontSize: 12,
    color: T.purple,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 2,
  },

  // date header
  dateHeader: {
    fontSize: 11,
    color: T.muted,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 16,
    marginBottom: 6,
    paddingHorizontal: 2,
  },

  // class row
  classRow: {
    backgroundColor: T.card,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  dayBox: {
    width: 44,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    marginRight: 12,
  },
  dayBoxName: { fontSize: 10, color: T.muted, fontWeight: '700', letterSpacing: 0.5 },
  dayBoxNum: { fontSize: 18, color: T.text, fontWeight: '800', lineHeight: 22 },
  classInfo: { flex: 1 },
  className: { fontSize: 15, fontWeight: '700', color: T.text, marginBottom: 3 },
  classMeta: { fontSize: 12, color: T.muted },
  classRight: { alignItems: 'flex-end', marginLeft: 8 },
  eligiblePill: {
    backgroundColor: T.purple + '33',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: T.purple,
  },
  eligiblePillText: { fontSize: 9, color: T.purple, fontWeight: '800', letterSpacing: 0.5 },
  classBookedText: { fontSize: 12, color: T.lime, fontWeight: '700' },
  classArrow: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  classArrowText: { color: T.muted, fontSize: 18, lineHeight: 22 },

  // workshops
  workshopDesc: { fontSize: 13, color: T.muted, marginTop: 6, marginBottom: 6, lineHeight: 18 },
  workshopPrice: { fontSize: 22, fontWeight: '800', color: T.text, marginVertical: 8 },
  confirmedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  confirmedText: { fontSize: 14, fontWeight: '700', color: T.lime },
  waitlistText: { fontSize: 14, fontWeight: '700', color: '#f59e0b' },
  cancelLink: { fontSize: 13, color: '#ef4444' },

  // Trial tab
  trialHero: { backgroundColor: 'rgba(255,170,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,170,0,0.25)', borderRadius: 12, padding: 18, marginBottom: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  trialHeroTitle: { fontSize: 16, fontWeight: '700', color: '#f59e0b', marginBottom: 6 },
  trialHeroBody: { fontSize: 13, color: '#ccc', lineHeight: 20 },
  trialPriceBox: { alignItems: 'flex-end', flexShrink: 0 },
  trialPrice: { fontSize: 26, fontWeight: '800', color: '#f59e0b' },
  trialPriceLabel: { fontSize: 11, color: T.muted },
  subSectionLabel: { fontSize: 11, fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  trialCard: { backgroundColor: T.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,170,0,0.2)' },
  trialCardName: { fontSize: 15, fontWeight: '700', color: T.text, marginBottom: 3 },
  trialCardMeta: { fontSize: 12, color: T.muted, marginBottom: 1 },
  trialCardInstructor: { fontSize: 12, color: '#aaa', marginTop: 4 },
  trialCardPrice: { fontSize: 18, fontWeight: '800', color: '#f59e0b' },
  trialCardPriceLabel: { fontSize: 10, color: T.muted },
  trialBookBtn: { backgroundColor: '#f59e0b', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  trialBookBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  trialBookedRow: { marginTop: 6 },
  trialBookedText: { fontSize: 13, fontWeight: '600', color: T.lime },

  practiceBanner: { backgroundColor: '#0a0a0a', borderBottomWidth: 1, borderBottomColor: T.border, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  practiceBannerText: { fontSize: 13, color: '#b0a0ff', fontWeight: '600' },

  // Casual tab session cards
  casualCard: {
    backgroundColor: T.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  casualCardGrayed: { opacity: 0.45 },
  casualCardName: { fontSize: 15, fontWeight: '700', color: T.text, marginBottom: 3 },
  casualCardNameGrayed: { color: T.muted },
  casualCardMeta: { fontSize: 12, color: T.muted, marginBottom: 2 },
  casualCardStudio: { fontSize: 11, color: T.muted },
  casualCardGreyReason: { fontSize: 11, color: '#f59e0b', marginTop: 6, lineHeight: 16 },
  casualCardSpots: { fontSize: 11, fontWeight: '600', color: T.muted, marginBottom: 8 },
  casualCardSpotsFull: { color: '#ef4444' },
  casualBookBtn: {
    backgroundColor: T.lime,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignItems: 'center',
    minWidth: 64,
  },
  casualBookBtnDisabled: { backgroundColor: '#222' },
  casualBookBtnText: { fontSize: 11, fontWeight: '800', color: '#000', letterSpacing: 0.5 },
  exemptBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  exemptBtnText: { fontSize: 10, fontWeight: '800', color: '#f59e0b', letterSpacing: 0.3 },
  waitlistBtn: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: T.muted },
  waitlistBtnText: { fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.3 },
})
