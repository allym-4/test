import { useState, useEffect, useCallback } from 'react'
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, ActivityIndicator, Modal, Switch,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { useStripePayment } from '../../hooks/useStripePayment'
import { classes, enrolments, seasons, attendance, settings as settingsApi } from '../../api'

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
  return occ.session_id ?? occ.session?.id ?? occ.id
}

function isEligible(occ, userLevel) {
  if (!userLevel) return true
  const sessLevel = occ.session?.level ?? occ.level
  if (!sessLevel) return true
  if (typeof sessLevel === 'object') return sessLevel.name === userLevel || String(sessLevel.id) === String(userLevel)
  return String(sessLevel) === String(userLevel)
}

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
export default function BookScreen() {
  const { user } = useAuth()
  const { pay } = useStripePayment()

  const [tab, setTab] = useState('season')
  const [booking, setBooking] = useState(null)
  const [booked, setBooked] = useState({})
  const [levelFilter, setLevelFilter] = useState(null)
  const [savedCardLast4, setSavedCardLast4] = useState(null)

  // Casual tab state
  const [selectedOcc, setSelectedOcc] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [showEligibleOnly, setShowEligibleOnly] = useState(true)
  const [hideUnavailable, setHideUnavailable] = useState(false)

  useEffect(() => {
    if (user?.id) {
      AsyncStorage.getItem(`class_level_${user.id}`).then(val => setLevelFilter(val))
      AsyncStorage.getItem(`saved_card_last4_${user.id}`).then(val => setSavedCardLast4(val))
    }
  }, [user?.id])

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
  const seasonPricingConfig = studioSettings?.season_pricing_config ?? []

  function getSeasonPrice() {
    const totalClasses = activeSeasonCount + 1
    const tier = seasonPricingConfig.find(r => {
      const n = parseInt((r.label ?? '').match(/(\d+)/)?.[1] ?? '0')
      return n === totalClasses
    })
    return tier ? parseFloat(tier.price) : parseFloat(studioSettings?.price_season ?? 270)
  }
  const seasonPrice = getSeasonPrice()

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

  // ── handlers ───────────────────────────────────────────────────────────────
  async function handleEnrol(session, type, price) {
    setBooking(session.id)
    try {
      if (type === 'catchup') {
        await enrolments.create({ session: session.id, status: 'active', enrolment_type: 'catchup' })
        refetchCredits()
        setBooked(b => ({ ...b, [session.id + '-catchup']: true }))
      } else {
        const succeeded = await pay({
          amountCents: Math.round(price * 100),
          description: `${session.name} — ${type}`,
          sessionId: session.id,
          enrolmentType: type,
          onSuccess: () => setBooked(b => ({ ...b, [session.id + '-' + type]: true })),
        })
        if (!succeeded) return
      }
      setModalVisible(false)
      setSelectedOcc(null)
    } catch (err) {
      Alert.alert('Payment failed', err.message ?? 'Could not complete booking.')
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

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>

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

            {allSessions.map(session => (
              <View key={session.id} style={s.card}>
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
                  </View>
                  <TouchableOpacity
                    style={[s.limeBtn, booking === session.id && s.limeBtnDisabled]}
                    onPress={() => handleEnrol(session, 'season', seasonPrice)}
                    disabled={booking === session.id}
                  >
                    {booking === session.id
                      ? <ActivityIndicator size="small" color="#000" />
                      : <Text style={s.limeBtnText}>Enrol — ${seasonPrice}</Text>
                    }
                  </TouchableOpacity>
                </View>
                {booked[session.id + '-season'] && (
                  <Text style={s.bookedBadge}>✓ Booked</Text>
                )}
              </View>
            ))}
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
                onPress={() => {
                  // navigate to trial flow or open trial modal
                  Alert.alert('Trial booking', `Trial classes are $${priceTrial}. Select a class below and choose "Pay casual rate" — or contact the studio to book a trial.`)
                }}
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
                  const isBooked = booked[sessionId + '-catchup'] || booked[sessionId + '-casual']

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

      {/* ── Booking Modal ─────────────────────────────────────────────────── */}
      <BookingModal
        visible={modalVisible}
        occ={selectedOcc}
        availableCredits={availableCredits}
        priceCasual={priceCasual}
        seasonPrice={seasonPrice}
        savedCardLast4={savedCardLast4}
        onClose={closeModal}
        onBook={handleEnrol}
        bookingLoading={!!booking}
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
  content: { padding: 16, paddingBottom: 60 },
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
  sessionRow: { flexDirection: 'row', alignItems: 'center' },
  sessionName: { fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 4 },
  sessionMeta: { fontSize: 13, color: T.muted },
  bookedBadge: { marginTop: 8, fontSize: 13, color: T.lime, fontWeight: '700' },

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
})
