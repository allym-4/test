import { useState, useEffect } from 'react'
import {
  ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, ActivityIndicator, Modal, Switch,
} from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { classes, enrolments, seasons, attendance, settings as settingsApi, payments } from '../../api'

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
  { key: 'casual',   label: 'Casual & Catch-ups' },
  { key: 'trial',    label: 'Trial Class' },
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
function SeasonCheckoutModal({ visible, sessions, totalPrice, seasonName, onClose, onConfirm, loading }) {
  const [payOption, setPayOption] = useState('full')
  const [promoCode, setPromoCode] = useState('')
  const [promoValidating, setPromoValidating] = useState(false)
  const [promoResult, setPromoResult] = useState(null) // { discount_amount, discount_percent, message }

  const discountAmount = promoResult?.discount_amount
    ? parseFloat(promoResult.discount_amount)
    : promoResult?.discount_percent
    ? Math.round(totalPrice * promoResult.discount_percent / 100)
    : 0
  const discountedTotal = Math.max(0, totalPrice - discountAmount)
  const depositAmount = Math.round(discountedTotal / 2)

  useEffect(() => {
    if (visible) {
      setPayOption('full')
      setPromoCode('')
      setPromoResult(null)
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
      const msg = err?.response?.data?.detail ?? err?.response?.data?.error ?? 'Invalid promo code.'
      setPromoResult({ error: msg })
    } finally {
      setPromoValidating(false)
    }
  }

  if (!visible || sessions.length === 0) return null

  const displayTotal = payOption === 'deposit' ? depositAmount : discountedTotal

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={sc.overlay}>
        <View style={sc.sheet}>
          <View style={sc.header}>
            <Text style={sc.title}>Before you checkout</Text>
            <TouchableOpacity onPress={onClose} style={sc.closeBtn}>
              <Text style={sc.closeBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>

          {/* Selected classes summary */}
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

          {/* Promo code */}
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
              {promoValidating
                ? <ActivityIndicator color="#000" size="small" />
                : <Text style={sc.promoApplyText}>APPLY</Text>
              }
            </TouchableOpacity>
          </View>
          {!!promoResult && !promoResult.error && (
            <Text style={sc.promoSuccess}>
              {promoResult.message ?? `Code applied! -$${discountAmount.toFixed(2)} off`}
            </Text>
          )}
          {!!promoResult?.error && (
            <Text style={sc.promoError}>{promoResult.error}</Text>
          )}

          <Text style={sc.sectionLabel}>How would you like to pay?</Text>

          {/* Pay in full */}
          <TouchableOpacity
            style={[sc.option, payOption === 'full' && sc.optionSelected]}
            onPress={() => setPayOption('full')}
          >
            <View style={[sc.radio, payOption === 'full' && sc.radioSelected]}>
              {payOption === 'full' && <View style={sc.radioDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sc.optionTitle}>Pay in full today</Text>
              <Text style={sc.optionSub}>One payment, nothing more to think about.</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {discountAmount > 0 && <Text style={sc.strikePrice}>${totalPrice}</Text>}
              <Text style={sc.optionPrice}>${discountedTotal}</Text>
            </View>
          </TouchableOpacity>

          {/* 50% deposit */}
          <TouchableOpacity
            style={[sc.option, payOption === 'deposit' && sc.optionSelected]}
            onPress={() => setPayOption('deposit')}
          >
            <View style={[sc.radio, payOption === 'deposit' && sc.radioSelected]}>
              {payOption === 'deposit' && <View style={sc.radioDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sc.optionTitle}>Pay 50% deposit today</Text>
              <Text style={sc.optionSub}>Balance of ${depositAmount} due before your first class.</Text>
            </View>
            <Text style={sc.optionPrice}>${depositAmount}</Text>
          </TouchableOpacity>

          {/* Confirm button */}
          <TouchableOpacity
            style={sc.confirmBtn}
            onPress={() => onConfirm(payOption, displayTotal, promoResult?.error ? null : promoCode.trim() || null)}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={sc.confirmBtnText}>
                  CONFIRM AND PAY — ${displayTotal}
                </Text>
            }
          </TouchableOpacity>

          {/* Payment plan */}
          <TouchableOpacity
            style={sc.altBtn}
            onPress={() => onConfirm('plan', 0, null)}
            disabled={loading}
          >
            <Text style={sc.altBtnText}>REQUEST A PAYMENT PLAN</Text>
          </TouchableOpacity>

          {/* Pay cash */}
          <TouchableOpacity
            style={sc.altBtn}
            onPress={() => onConfirm('cash', 0, null)}
            disabled={loading}
          >
            <Text style={sc.altBtnText}>I WANT TO PAY CASH</Text>
          </TouchableOpacity>

          <Text style={sc.disclaimer}>
            By booking you agree to our terms and conditions. Payments secured by Stripe.
          </Text>
        </View>
      </View>
    </Modal>
  )
}

const sc = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
  sheet: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 44, maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: T.text },
  closeBtn: { paddingLeft: 12 },
  closeBtnText: { color: T.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  summaryCard: { backgroundColor: T.bg, borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: T.border },
  summaryLine: { fontSize: 13, color: '#ccc', lineHeight: 20 },
  seasonTag: { marginTop: 8, fontSize: 11, color: T.muted, fontWeight: '600' },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 12 },
  option: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 14, marginBottom: 10, backgroundColor: T.bg },
  optionSelected: { borderColor: T.lime, borderWidth: 1.5 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: T.muted, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: T.lime, backgroundColor: 'transparent' },
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
})

// ─── BookingModal ─────────────────────────────────────────────────────────────
function BookingModal({ visible, occ, availableCredits, priceCasual, seasonPrice, savedCardLast4, onClose, onBook, bookingLoading }) {
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (visible) {
      setSelected(availableCredits > 0 ? 'credit' : 'casual')
    }
  }, [visible, availableCredits])

  if (!occ) return null

  const name = getSessionName(occ)
  const instructor = getInstructor(occ)
  const dateHeader = occ.date ? fmtDateHeader(occ.date) : ''
  const time = fmtTime(occ.start_time)
  const sessionId = getSessionId(occ)

  function getButtonLabel() {
    if (selected === 'credit') return 'BOOK FOR FREE'
    if (selected === 'season') return `BOOK — $${seasonPrice}`
    if (selected === 'casual') return `BOOK — $${priceCasual}`
    if (selected === 'pass') {
      const passPrice = Math.max(0, priceCasual * 4 - 20)
      return `BOOK — $${passPrice}`
    }
    return 'SELECT AN OPTION'
  }

  function handleConfirm() {
    const session = { id: sessionId, name }
    if (selected === 'credit') {
      onBook(session, 'catchup', 0)
    } else if (selected === 'casual') {
      onBook(session, 'casual', priceCasual)
    } else if (selected === 'season') {
      onBook(session, 'season', seasonPrice)
    } else if (selected === 'pass') {
      const passPrice = Math.max(0, priceCasual * 4 - 20)
      onBook(session, 'pass', passPrice)
    }
  }

  const passPrice = Math.max(0, priceCasual * 4 - 20)
  const passSaving = priceCasual * 4 - passPrice

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          {/* header */}
          <View style={ms.header}>
            <Text style={ms.sheetTitle} numberOfLines={2}>{name}</Text>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
              <Text style={ms.closeBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>

          {/* meta */}
          <Text style={ms.meta}>
            {[dateHeader, time, instructor].filter(Boolean).join('  ·  ')}
          </Text>

          {/* credits notice */}
          {availableCredits > 0 && (
            <Text style={ms.creditNotice}>
              {availableCredits} catch-up credit{availableCredits !== 1 ? 's' : ''} available
            </Text>
          )}

          {/* options */}
          <View style={ms.options}>
            {/* Season enrol */}
            <TouchableOpacity
              style={[ms.option, selected === 'season' && ms.optionSelected]}
              onPress={() => setSelected('season')}
            >
              <View style={ms.optionCheck}>
                {selected === 'season' && <View style={ms.optionCheckInner} />}
              </View>
              <Text style={ms.optionLabel}>Enrol in the full Season course instead</Text>
              <Text style={ms.optionPrice}>${seasonPrice}</Text>
            </TouchableOpacity>

            {/* Use credit */}
            {availableCredits > 0 && (
              <TouchableOpacity
                style={[ms.option, selected === 'credit' && ms.optionSelected]}
                onPress={() => setSelected('credit')}
              >
                <View style={ms.optionCheck}>
                  {selected === 'credit' && <View style={ms.optionCheckInner} />}
                </View>
                <Text style={ms.optionLabel}>Use class credit</Text>
                <Text style={[ms.optionPrice, { color: T.lime }]}>FREE</Text>
              </TouchableOpacity>
            )}

            {/* Pay casual */}
            <TouchableOpacity
              style={[ms.option, selected === 'casual' && ms.optionSelected]}
              onPress={() => setSelected('casual')}
            >
              <View style={ms.optionCheck}>
                {selected === 'casual' && <View style={ms.optionCheckInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ms.optionLabel}>Pay casual rate</Text>
                {savedCardLast4 ? (
                  <Text style={ms.optionSub}>Card ending {savedCardLast4}</Text>
                ) : null}
              </View>
              <Text style={ms.optionPrice}>${priceCasual}</Text>
            </TouchableOpacity>

            {/* 4-class pass */}
            <TouchableOpacity
              style={[ms.option, selected === 'pass' && ms.optionSelected]}
              onPress={() => setSelected('pass')}
            >
              <View style={ms.optionCheck}>
                {selected === 'pass' && <View style={ms.optionCheckInner} />}
              </View>
              <Text style={ms.optionLabel}>Buy a 4 class pass · save ${passSaving}</Text>
              <Text style={ms.optionPrice}>${passPrice}</Text>
            </TouchableOpacity>
          </View>

          {/* confirm button */}
          <TouchableOpacity
            style={[ms.confirmBtn, !selected && ms.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!selected || bookingLoading}
          >
            {bookingLoading
              ? <ActivityIndicator size="small" color="#000" />
              : <Text style={ms.confirmBtnText}>{getButtonLabel()}</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ─── main screen ─────────────────────────────────────────────────────────────
export default function BookScreen({ navigation }) {
  const { user } = useAuth()

  const [tab, setTab] = useState('season')
  const [booking, setBooking] = useState(null)
  const [booked, setBooked] = useState({})
  const [levelFilter, setLevelFilter] = useState(null)

  // Season tab state
  const [selectedSessions, setSelectedSessions] = useState([])
  const [headsUpSession, setHeadsUpSession] = useState(null)
  const [showSeasonCheckout, setShowSeasonCheckout] = useState(false)

  // Casual tab state
  const [selectedOcc, setSelectedOcc] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [showEligibleOnly, setShowEligibleOnly] = useState(true)
  const [hideUnavailable, setHideUnavailable] = useState(false)

  useEffect(() => {
    if (user?.level) setLevelFilter(user.level)
  }, [user?.level])

  // ── API calls ──────────────────────────────────────────────────────────────
  const { data: studioSettings } = useApi(() => settingsApi.get(), [])
  const { data: sessionsData, loading: sessLoading, refetch: refetchSessions } = useApi(
    () => classes.list(), []
  )
  const { data: occurrencesData, loading: occLoading, refetch: refetchOcc } = useApi(
    () => classes.occurrences({ upcoming: true, limit: 50 }), []
  )
  const { data: workshopsData, loading: wsLoading, refetch: refetchWorkshops } = useApi(
    () => classes.workshops.list(), []
  )
  const { data: seasonsData } = useApi(() => seasons.list(), [])
  const { data: creditsData, refetch: refetchCredits } = useApi(
    () => user?.id ? attendance.makeupCredits.list({ student: user.id, status: 'available' }) : null,
    [user?.id]
  )
  const { data: activeEnrolData } = useApi(
    () => user?.id ? enrolments.list({ student: user.id, status: 'active' }) : null,
    [user?.id]
  )

  // ── derived data ───────────────────────────────────────────────────────────
  const allSessions = sessionsData?.results ?? sessionsData ?? []
  const allOccurrences = occurrencesData?.results ?? occurrencesData ?? []
  const workshopList = workshopsData?.results ?? workshopsData ?? []
  const allSeasons = seasonsData?.results ?? seasonsData ?? []
  const credits = creditsData?.results ?? creditsData ?? []
  const availableCredits = credits.length

  const creditExpiry = credits.length > 0
    ? (credits[0].expires_at ?? credits[0].expiry_date ?? null)
    : null

  const priceCasual = parseFloat(studioSettings?.price_casual ?? 35)
  const priceTrial = parseFloat(studioSettings?.price_trial ?? 25)

  const activeEnrolList = activeEnrolData?.results ?? activeEnrolData ?? []
  const activeSeasonCount = activeEnrolList.filter(e => e.enrolment_type === 'course').length
  const enrolledSessionIds = new Set(activeEnrolList.map(e => e.class_session ?? e.class_session_id))
  const DEFAULT_SEASON_PRICES = { 1: 270, 2: 440, 3: 580, 4: 700, 5: 800, 6: 900 }
  const seasonPricingConfig = studioSettings?.season_pricing_config ?? []

  function getSeasonPriceForTotal(totalClasses) {
    const tier = seasonPricingConfig.find(r => {
      const n = parseInt((r.label ?? '').match(/(\d+)/)?.[1] ?? '0')
      return n === totalClasses
    })
    if (tier) return parseFloat(tier.price)
    const n = Math.min(Math.max(totalClasses, 1), 6)
    return DEFAULT_SEASON_PRICES[n] ?? parseFloat(studioSettings?.price_season ?? 270)
  }
  const seasonPrice = getSeasonPriceForTotal(activeSeasonCount + 1)

  const totalSeasonPrice = getSeasonPriceForTotal(activeSeasonCount + selectedSessions.length)

  const upcomingSeason = allSeasons.find(s => s.status === 'upcoming')
    ?? allSeasons.find(s => s.start_date && new Date(s.start_date) > new Date())
    ?? allSeasons.find(s => s.status === 'active')

  // Filter occurrences for Casual tab
  let casualOccurrences = [...allOccurrences]
  if (showEligibleOnly && levelFilter) {
    casualOccurrences = casualOccurrences.filter(occ => isEligible(occ, levelFilter))
  }
  if (hideUnavailable) {
    casualOccurrences = casualOccurrences.filter(occ => {
      const spotsLeft = occ.spots_left ?? occ.capacity_remaining
      return spotsLeft == null || spotsLeft > 0
    })
  }
  const grouped = groupByDate(casualOccurrences)

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

  async function handleSeasonCheckout(payOption, _amount, promoCode) {
    setBooking('season')
    try {
      for (const session of selectedSessions) {
        const payload = { class_session: session.id, status: 'active', enrolment_type: 'course' }
        await enrolments.create(payload)
      }
      if (promoCode) {
        await payments.promoCodes.use({ code: promoCode }).catch(() => {})
      }
      setShowSeasonCheckout(false)
      const newBooked = {}
      selectedSessions.forEach(s => { newBooked[s.id + '-season'] = true })
      setBooked(b => ({ ...b, ...newBooked }))
      setSelectedSessions([])

      if (payOption === 'cash') {
        Alert.alert('Booking confirmed!', "Your spot is reserved. Please arrange cash payment with the studio at your first class.")
      } else if (payOption === 'plan') {
        Alert.alert('Booking confirmed!', "Your spot is reserved. The studio will be in touch to set up your payment plan.")
      } else {
        Alert.alert('Booking confirmed!', "Your spot is reserved. The studio will follow up about card payment.")
      }
    } catch (err) {
      Alert.alert('Booking failed', err.response?.data?.detail ?? 'Please try again or contact the studio.')
    } finally {
      setBooking(null)
    }
  }

  // ── casual/catchup handlers ────────────────────────────────────────────────
  async function handleEnrol(session, type, price) {
    setBooking(session.id)
    try {
      if (type === 'catchup') {
        await enrolments.create({ class_session: session.id, status: 'active', enrolment_type: 'catchup' })
        refetchCredits()
        setBooked(b => ({ ...b, [session.id + '-catchup']: true }))
        setModalVisible(false)
        setSelectedOcc(null)
      } else {
        // Create enrolment directly — studio follows up about payment
        const enrolType = type === 'season' ? 'course' : type === 'trial' ? 'trial' : 'casual'
        await enrolments.create({ class_session: session.id, status: 'active', enrolment_type: enrolType })
        setBooked(b => ({ ...b, [session.id + '-' + type]: true }))
        setModalVisible(false)
        setSelectedOcc(null)
        Alert.alert('Booking confirmed!', "Your spot is reserved. The studio will be in touch about payment.")
      }
    } catch (err) {
      Alert.alert('Booking failed', err.response?.data?.detail ?? 'Could not complete booking. Please try again.')
    } finally {
      setBooking(null)
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

  function openModal(occ) {
    setSelectedOcc(occ)
    setModalVisible(true)
  }

  function closeModal() {
    setModalVisible(false)
    setSelectedOcc(null)
  }

  const isLoading = tab === 'workshops' ? wsLoading : tab === 'casual' ? occLoading : sessLoading
  const onRefresh = tab === 'workshops' ? refetchWorkshops : tab === 'casual' ? refetchOcc : refetchSessions
  // trial and season both use sessions data

  // ── render ─────────────────────────────────────────────────────────────────
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
        {TABS.map(({ key, label }) => (
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
        {tab === 'season' && (
          <>
            {upcomingSeason && (
              <View style={s.seasonInfoCard}>
                <View style={s.limeAccentBar} />
                <View style={s.seasonInfoBody}>
                  <Text style={s.seasonInfoTitle}>{upcomingSeason.name}</Text>
                  <Text style={s.seasonInfoSub}>
                    Reserve your spot for the full term.
                    {upcomingSeason.start_date && upcomingSeason.end_date
                      ? ` Runs ${new Date(upcomingSeason.start_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${new Date(upcomingSeason.end_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}.`
                      : ''}
                  </Text>
                  <Text style={s.seasonInfoPrice}>${seasonPrice} per class / season</Text>
                </View>
              </View>
            )}

            {allSessions.length === 0 && !sessLoading && (
              <Text style={s.empty}>No classes available.</Text>
            )}

            {allSessions.map(session => {
              const isSelected = selectedSessions.some(s => s.id === session.id)
              const isBooked = booked[session.id + '-season'] || enrolledSessionIds.has(session.id)
              const spotsLeft = (session.capacity ?? 12) - (session.enrolled_count ?? 0)
              const isFull = spotsLeft <= 0
              return (
                <TouchableOpacity
                  key={session.id}
                  style={[s.card, isSelected && s.cardSelected, isBooked && s.cardBooked]}
                  onPress={() => !isBooked && !isFull && toggleSession(session)}
                  activeOpacity={isBooked || isFull ? 1 : 0.75}
                >
                  <View style={s.sessionRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.sessionName}>{session.name}</Text>
                      <Text style={s.sessionMeta}>
                        {[
                          session.day_of_week != null ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][session.day_of_week] : null,
                          session.start_time ? fmtTime(session.start_time) : null,
                          session.studio_detail?.name ?? session.studio?.name,
                          session.instructor_detail?.display_name ?? session.instructor_detail?.first_name,
                        ].filter(Boolean).join('  ·  ')}
                      </Text>
                      {spotsLeft > 0 && spotsLeft <= 3 && (
                        <Text style={s.spotsWarning}>{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left</Text>
                      )}
                      {isFull && <Text style={s.spotsFull}>Full</Text>}
                    </View>
                    {isBooked ? (
                      <Text style={s.bookedBadge}>✓ Booked</Text>
                    ) : isFull ? (
                      <View style={s.checkCircle}>
                        <Text style={{ color: T.muted, fontSize: 11, fontWeight: '700' }}>FULL</Text>
                      </View>
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
            CASUAL & CATCH-UPS
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'casual' && (
          <>
            {/* Trial banner */}
            <View style={s.trialBanner}>
              <Text style={s.trialBannerText}>First time? 🔥 Book a trial class for just ${priceTrial}</Text>
              <TouchableOpacity
                style={s.trialBannerBtn}
                onPress={() => setTab('trial')}
              >
                <Text style={s.trialBannerBtnText}>BOOK TRIAL →</Text>
              </TouchableOpacity>
            </View>

            {/* Catch-up credits card */}
            {availableCredits > 0 && (
              <View style={s.creditsCard}>
                <Text style={s.creditsNumber}>{availableCredits}</Text>
                <View style={{ flex: 1, paddingLeft: 14 }}>
                  <Text style={s.creditsLabel}>
                    catch-up credit{availableCredits !== 1 ? 's' : ''} available
                  </Text>
                  {creditExpiry && (
                    <Text style={s.creditsExpiry}>
                      Expires {new Date(creditExpiry).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Filter toggles */}
            <View style={s.filtersCard}>
              <View style={s.filterRow}>
                <Text style={s.filterLabel}>Show my eligible classes only</Text>
                <Switch
                  value={showEligibleOnly}
                  onValueChange={setShowEligibleOnly}
                  trackColor={{ false: T.border, true: T.purple }}
                  thumbColor={T.text}
                />
              </View>
              <View style={[s.filterRow, { borderTopWidth: 1, borderTopColor: T.border, marginTop: 10, paddingTop: 10 }]}>
                <Text style={s.filterLabel}>Hide unavailable classes</Text>
                <Switch
                  value={hideUnavailable}
                  onValueChange={setHideUnavailable}
                  trackColor={{ false: T.border, true: T.purple }}
                  thumbColor={T.text}
                />
              </View>
            </View>

            {/* Level info */}
            {levelFilter && showEligibleOnly && (
              <Text style={s.levelInfo}>Showing classes eligible for Level {levelFilter}</Text>
            )}

            {/* Class list grouped by date */}
            {grouped.length === 0 && !occLoading && (
              <Text style={s.empty}>No upcoming classes.</Text>
            )}

            {grouped.map(({ date, items }) => (
              <View key={date}>
                <Text style={s.dateHeader}>{date ? fmtDateHeader(date) : 'Upcoming'}</Text>
                {items.map((occ, idx) => {
                  const name = getSessionName(occ)
                  const instructor = getInstructor(occ)
                  const time = fmtTime(occ.start_time)
                  const eligible = !showEligibleOnly || !levelFilter || isEligible(occ, levelFilter)
                  const sessionId = getSessionId(occ)
                  const isBooked = booked[sessionId + '-catchup'] || booked[sessionId + '-casual'] || enrolledSessionIds.has(sessionId)

                  return (
                    <TouchableOpacity
                      key={occ.id ?? idx}
                      style={s.classRow}
                      onPress={() => openModal(occ)}
                      activeOpacity={0.75}
                    >
                      {/* day box */}
                      <View style={s.dayBox}>
                        {date ? (
                          <>
                            <Text style={s.dayBoxName}>
                              {new Date(date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase()}
                            </Text>
                            <Text style={s.dayBoxNum}>{new Date(date + 'T00:00').getDate()}</Text>
                          </>
                        ) : (
                          <Text style={s.dayBoxName}>—</Text>
                        )}
                      </View>

                      {/* info */}
                      <View style={s.classInfo}>
                        <Text style={s.className} numberOfLines={1}>{name}</Text>
                        <Text style={s.classMeta} numberOfLines={1}>
                          {[time, instructor].filter(Boolean).join('  ·  ')}
                        </Text>
                      </View>

                      {/* right side */}
                      <View style={s.classRight}>
                        {eligible && availableCredits > 0 && !isBooked && (
                          <View style={s.eligiblePill}>
                            <Text style={s.eligiblePillText}>CATCH-UP ELIGIBLE</Text>
                          </View>
                        )}
                        {isBooked ? (
                          <Text style={s.classBookedText}>✓ Booked</Text>
                        ) : (
                          <View style={s.classArrow}>
                            <Text style={s.classArrowText}>›</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            ))}
          </>
        )}

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
            ) : sessions.length === 0 ? (
              <Text style={s.empty}>No classes available right now.</Text>
            ) : (
              sessions.map(sess => {
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
                            await enrolments.create({ class_session: sess.id, status: 'active', enrolment_type: 'trial' })
                            setBooked(b => ({ ...b, [sess.id + '-trial']: true }))
                            Alert.alert('Trial booked!', "Your trial class is confirmed. The studio will follow up about payment.")
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
          <View style={{ flex: 1 }}>
            <Text style={s.proceedCount}>{selectedSessions.length} class{selectedSessions.length !== 1 ? 'es' : ''} selected</Text>
            <Text style={s.proceedPrice}>${totalSeasonPrice}</Text>
          </View>
          <TouchableOpacity style={s.proceedBtn} onPress={() => setShowSeasonCheckout(true)}>
            <Text style={s.proceedBtnText}>Proceed →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Booking Modal (Casual) ────────────────────────────────────────── */}
      <BookingModal
        visible={modalVisible}
        occ={selectedOcc}
        availableCredits={availableCredits}
        priceCasual={priceCasual}
        seasonPrice={seasonPrice}
        savedCardLast4={null}
        onClose={closeModal}
        onBook={handleEnrol}
        bookingLoading={!!booking}
      />

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
        seasonName={upcomingSeason?.name}
        onClose={() => setShowSeasonCheckout(false)}
        onConfirm={handleSeasonCheckout}
        loading={booking === 'season'}
      />
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
  seasonInfoTitle: { fontSize: 17, fontWeight: '800', color: T.text, marginBottom: 4 },
  seasonInfoSub: { fontSize: 13, color: T.muted, lineHeight: 18, marginBottom: 6 },
  seasonInfoPrice: { fontSize: 15, fontWeight: '700', color: T.lime },

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
  proceedCount: { fontSize: 13, color: T.muted, fontWeight: '600' },
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
  creditsNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: T.lime,
    lineHeight: 52,
  },
  creditsLabel: { fontSize: 16, fontWeight: '700', color: T.text },
  creditsExpiry: { fontSize: 12, color: T.muted, marginTop: 2 },

  // filters card
  filtersCard: {
    backgroundColor: T.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterLabel: { fontSize: 14, color: T.text, fontWeight: '500', flex: 1 },

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
})
