import { useState, useEffect } from 'react'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../contexts/AuthContext'
import { classes, enrolments, settings as settingsApi, seasons as seasonsApi, payments as paymentsApi, attendance as attendanceApi } from '../../api'
import CheckoutModal from '../../components/CheckoutModal'

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const DAYS = DAYS_SHORT

function getLevelBadge(name) {
  if (!name) return null
  if (/level\s*1/i.test(name)) return { label: 'Level 1', color: 'var(--lime)', bg: 'rgba(204,255,0,0.12)' }
  if (/level\s*2/i.test(name)) return { label: 'Level 2', color: 'var(--lav)', bg: 'rgba(176,160,255,0.12)' }
  if (/level\s*[3-9]/i.test(name)) return { label: 'Level 3+', color: 'var(--amber)', bg: 'rgba(255,170,0,0.12)' }
  return null
}

function SpotsLabel({ spotsLeft }) {
  const isFull = spotsLeft <= 0
  const isUrgent = spotsLeft >= 1 && spotsLeft <= 3

  const style = {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 6,
    display: 'inline-block',
    background: isFull
      ? 'rgba(255,80,80,0.12)'
      : isUrgent
      ? 'rgba(255,170,0,0.12)'
      : 'rgba(255,255,255,0.06)',
    color: isFull ? 'var(--red)' : isUrgent ? 'var(--amber)' : 'var(--grey)',
  }

  return (
    <span style={style}>
      {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
      {[80, 60, 100].map((w, i) => (
        <div key={i} style={{ height: 12, background: 'rgba(255,255,255,0.07)', borderRadius: 6, marginBottom: 10, width: `${w}%` }} />
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
        <div style={{ height: 24, width: 80, background: 'rgba(255,255,255,0.07)', borderRadius: 6 }} />
        <div style={{ height: 28, width: 60, background: 'rgba(255,255,255,0.07)', borderRadius: 8 }} />
      </div>
    </div>
  )
}

function ClassCard({ session, onAddToCart, priceCasual, cartSessionId, isWaitlisted, waitlistType = 'waitlist' }) {
  const spotsLeft = (session.capacity || 12) - (session.enrolled_count || 0)
  const isFull = spotsLeft <= 0
  const levelBadge = getLevelBadge(session.name)
  const inCart = cartSessionId === session.id

  return (
    <div style={{ background: 'var(--card)', border: `1px solid ${inCart ? 'var(--lime)' : 'var(--border)'}`, borderRadius: 12, padding: '16px 18px', transition: 'border-color 0.2s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15 }}>{session.name}</div>
            {levelBadge && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: levelBadge.bg, color: levelBadge.color, whiteSpace: 'nowrap' }}>
                {levelBadge.label}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--grey)' }}>
            {DAYS[session.day_of_week]} · {session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}
          </div>
          {session.studio_detail && (
            <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{session.studio_detail.name}</div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, color: 'var(--lime)' }}>${priceCasual}</div>
          <div style={{ fontSize: 10, color: 'var(--grey)' }}>per class</div>
        </div>
      </div>

      {session.instructor_detail && (
        <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10 }}>
          Instructor: <span style={{ color: 'var(--white)' }}>{session.instructor_detail.display_name || session.instructor_detail.first_name}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SpotsLabel spotsLeft={spotsLeft} />
        {isFull ? (
          isWaitlisted ? (
            <span style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 700 }}>On Waitlist ✓</span>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => onAddToCart(session, waitlistType)}>Join Waitlist</button>
          )
        ) : inCart ? (
          <span style={{ fontSize: 12, color: 'var(--lime)', fontWeight: 700 }}>✓ Added</span>
        ) : (
          <button className="btn btn-lime btn-sm" onClick={() => onAddToCart(session)}>Book</button>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 24px', color: 'var(--grey)' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🗓️</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--white)', marginBottom: 6 }}>No classes available right now</div>
      <div style={{ fontSize: 13 }}>Check back soon or contact us to find out what's coming up.</div>
    </div>
  )
}

function StickyCart({ cart, priceCasual, onProceed, onClear, promoCode, promoDiscount, onPromoChange, onPromoApply, promoApplying, promoError }) {
  if (!cart) return null
  const finalPrice = promoDiscount != null ? Math.max(0, priceCasual - promoDiscount) : priceCasual
  return (
    <div style={{
      position: 'fixed',
      bottom: 72,
      left: 0,
      right: 0,
      zIndex: 200,
      display: 'flex',
      justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{
        background: '#111',
        border: '1px solid var(--lime)',
        borderRadius: 16,
        padding: '12px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        pointerEvents: 'all',
        maxWidth: 440,
        width: 'calc(100% - 32px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {cart.name}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>
              {promoDiscount != null ? (
                <>
                  <span style={{ color: 'var(--grey)', textDecoration: 'line-through', marginRight: 6 }}>${priceCasual}</span>
                  <span style={{ color: 'var(--lime)' }}>${finalPrice.toFixed(2)}</span>
                </>
              ) : (
                <span style={{ color: 'var(--lime)' }}>${priceCasual}</span>
              )}
            </div>
          </div>
          <button
            className="btn btn-lime btn-sm"
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={() => onProceed(finalPrice)}
          >
            Checkout
          </button>
          <button
            onClick={onClear}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey)', fontSize: 18, lineHeight: 1, padding: 4, flexShrink: 0 }}
            aria-label="Clear cart"
          >
            ×
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="input"
            placeholder="Promo code"
            value={promoCode}
            onChange={e => onPromoChange(e.target.value.toUpperCase())}
            style={{ flex: 1, fontSize: 12, padding: '6px 10px', height: 32 }}
            onKeyDown={e => e.key === 'Enter' && onPromoApply()}
          />
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, flexShrink: 0 }}
            onClick={onPromoApply}
            disabled={promoApplying || !promoCode}
          >
            {promoApplying ? '…' : promoDiscount != null ? '✓ Applied' : 'Apply'}
          </button>
        </div>
        {promoError && <div style={{ fontSize: 11, color: 'var(--red)' }}>{promoError}</div>}
      </div>
    </div>
  )
}

function OccurrenceBookingPanel({ session, enrolmentType, priceCasual, availableCredits, onCreditUsed, seasonName, seasonPrice, alreadyEnrolled, onEnrolInSeason }) {
  const [open, setOpen] = useState(false)
  const [occurrences, setOccurrences] = useState(null)
  const [loading, setLoading] = useState(false)
  const [bookingId, setBookingId] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [error, setError] = useState('')

  async function load() {
    if (occurrences !== null) return
    setLoading(true)
    try {
      const res = await classes.casual.occurrences({ session: session.id, upcoming: true })
      setOccurrences(res.data?.results || res.data || [])
    } catch {
      setOccurrences([])
    } finally {
      setLoading(false)
    }
  }

  function toggle() {
    if (!open) load()
    setOpen(o => !o)
  }

  async function book(occ) {
    setBookingId(occ.id)
    setError('')
    try {
      const res = await classes.casual.book(occ.id, { enrolment_type: enrolmentType })
      const updated = { ...occ, my_booking: res.data, spots_left: res.data.status === 'confirmed' ? occ.spots_left - 1 : occ.spots_left }
      setOccurrences(o => o.map(x => x.id === occ.id ? updated : x))
      if (enrolmentType === 'catchup' && res.data.status === 'confirmed' && onCreditUsed) onCreditUsed()
    } catch (e) {
      setError(e.response?.data?.detail || 'Booking failed — please try again.')
    } finally {
      setBookingId(null)
    }
  }

  async function cancel(occ) {
    setCancellingId(occ.id)
    setError('')
    try {
      await classes.casual.cancel(occ.id)
      setOccurrences(o => o.map(x => x.id === occ.id ? { ...x, my_booking: null, spots_left: x.my_booking?.status === 'confirmed' ? x.spots_left + 1 : x.spots_left } : x))
      if (enrolmentType === 'catchup' && occ.my_booking?.status === 'confirmed' && onCreditUsed) onCreditUsed()
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not cancel — please try again.')
    } finally {
      setCancellingId(null)
    }
  }

  const isCatchup = enrolmentType === 'catchup'
  const accentColor = isCatchup ? 'var(--lime)' : 'var(--lime)'

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <button
        onClick={toggle}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textAlign: 'left' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, marginBottom: 3 }}>{session.name}</div>
          <div style={{ fontSize: 12, color: 'var(--grey)' }}>
            {DAYS[session.day_of_week]} · {session.start_time?.slice(0, 5)}
            {session.studio_detail ? ` · ${session.studio_detail.name}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {!isCatchup && <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>${priceCasual}</span>}
          {isCatchup && <span className="tag tag-lime" style={{ fontSize: 10 }}>Uses 1 credit</span>}
          <span style={{ fontSize: 16, color: 'var(--grey)', transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px 16px' }}>
          {!alreadyEnrolled && onEnrolInSeason && seasonName && (
            <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '13px 16px', marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }} onClick={onEnrolInSeason}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Enrol in the full {seasonName} course instead</div>
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 3, lineHeight: 1.5 }}>
                    Commit to the full season · {seasonPrice ? `$${seasonPrice} total` : 'season pricing'}
                  </div>
                </div>
                <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 12, color: 'var(--lime)', fontWeight: 600, whiteSpace: 'nowrap' }}>Season tab →</span>
              </label>
            </div>
          )}
          {error && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{error}</div>}
          {loading ? (
            <div style={{ fontSize: 13, color: 'var(--grey)', padding: '8px 0' }}>Loading dates…</div>
          ) : !occurrences || occurrences.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--grey)', padding: '8px 0' }}>No upcoming dates scheduled yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {occurrences.map(occ => {
                const dateLabel = new Date(occ.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
                const spotsLeft = occ.spots_left ?? 0
                const isFull = spotsLeft <= 0
                const myBooking = occ.my_booking
                const isBooked = myBooking?.status === 'confirmed'
                const isWaitlisted = myBooking?.status === 'waitlisted'
                const hasOffer = isWaitlisted && myBooking?.waitlist_offered_at
                const isBooking = bookingId === occ.id
                const isCancelling = cancellingId === occ.id

                return (
                  <div key={occ.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', background: isBooked ? 'rgba(204,255,0,0.05)' : isWaitlisted ? 'rgba(255,170,0,0.05)' : 'rgba(255,255,255,0.03)', borderRadius: 8, border: `1px solid ${isBooked ? 'rgba(204,255,0,0.2)' : isWaitlisted ? 'rgba(255,170,0,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{dateLabel}</div>
                      {isFull && !myBooking && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>Full</div>}
                      {!isFull && !myBooking && <div style={{ fontSize: 11, color: spotsLeft <= 3 ? 'var(--amber)' : 'var(--grey)', marginTop: 2 }}>{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left</div>}
                      {isBooked && <div style={{ fontSize: 11, color: 'var(--lime)', marginTop: 2 }}>Booked ✓</div>}
                      {isWaitlisted && !hasOffer && <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 2 }}>On waitlist</div>}
                      {hasOffer && <div style={{ fontSize: 11, color: 'var(--lime)', marginTop: 2 }}>🎉 Spot offered!</div>}
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {isBooked || (isWaitlisted && !hasOffer) ? (
                        <button
                          className="btn btn-ghost btn-xs"
                          style={{ fontSize: 11, color: 'var(--red)' }}
                          onClick={() => cancel(occ)}
                          disabled={isCancelling}
                        >
                          {isCancelling ? '…' : isWaitlisted ? 'Leave' : 'Cancel'}
                        </button>
                      ) : hasOffer ? (
                        <span style={{ fontSize: 11, color: 'var(--lime)', fontWeight: 700 }}>Claim →</span>
                      ) : isFull ? (
                        <button className="btn btn-ghost btn-xs" style={{ fontSize: 11 }} onClick={() => book(occ)} disabled={isBooking}>
                          {isBooking ? '…' : 'Join Waitlist'}
                        </button>
                      ) : (
                        <button className="btn btn-lime btn-xs" style={{ fontSize: 11 }} onClick={() => book(occ)} disabled={isBooking}>
                          {isBooking ? '…' : isCatchup ? 'Book (Credit)' : `Book $${priceCasual}`}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function StudentBook() {
  const { user } = useAuth()
  const [tab, setTab] = useState('casual')
  const [booked, setBooked] = useState([])
  const [cart, setCart] = useState(null) // { session, type, price, label }
  const [checkout, setCheckout] = useState(null) // { session, type, amount, description }
  const [promoCode, setPromoCode] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(null)
  const [promoApplying, setPromoApplying] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [appliedPromoCode, setAppliedPromoCode] = useState('')
  const { data: balanceData } = useApi(() => user?.id ? paymentsApi.balance(user.id) : null, [user?.id])
  const { data: sessionsData, loading } = useApi(() => classes.list())
  const { data: studioSettings } = useApi(() => settingsApi.get())
  const { data: workshopsData, loading: loadingWorkshops, refetch: refetchWorkshops } = useApi(() => classes.workshops.list())
  const { data: seasonsData } = useApi(() => seasonsApi.list())
  const { data: activeEnrolData } = useApi(() => user?.id ? enrolments.list({ student: user.id, status: 'active' }) : null, [user?.id])
  const { data: creditsData, refetch: refetchCredits } = useApi(() => user?.id ? attendanceApi.makeupCredits.list({ student: user.id, status: 'available' }) : null, [user?.id])

  const priceCasual = parseFloat(studioSettings?.price_casual || 35)
  const priceSeason = parseFloat(studioSettings?.price_season || 270)
  const priceTrial = parseFloat(studioSettings?.price_trial || 25)

  // Season multi-class pricing: look up price for (current active enrolments + 1)
  const activeSeasonCount = (activeEnrolData?.results || activeEnrolData || []).filter(e => e.enrolment_type === 'course').length
  const seasonPricingConfig = (studioSettings?.season_pricing_config || []).filter(r => r.label)
  function getSeasonPrice(addingCount = 1) {
    const totalClasses = activeSeasonCount + addingCount
    const tier = seasonPricingConfig.find(r => {
      const n = parseInt((r.label || '').match(/(\d+)/)?.[1] || '0')
      return n === totalClasses
    })
    return tier ? parseFloat(tier.price) : priceSeason
  }
  const seasonPrice = getSeasonPrice(1)

  const availableCredits = (creditsData?.results || creditsData || []).length

  const allSeasons = seasonsData?.results || seasonsData || []
  const now = new Date()
  const upcomingSeason = allSeasons.find(s => s.status === 'upcoming') ||
    allSeasons.find(s => s.start_date && new Date(s.start_date) > now) ||
    allSeasons.find(s => s.status === 'active')

  const sessions = sessionsData?.results || sessionsData || []
  const workshops = workshopsData?.results || workshopsData || []
  const [bookingWorkshopId, setBookingWorkshopId] = useState(null)
  const [cancellingWorkshopId, setCancellingWorkshopId] = useState(null)
  const [workshopBooked, setWorkshopBooked] = useState({})
  const [workshopError, setWorkshopError] = useState('')

  function addToCart(session, type, price) {
    if (type === 'waitlist' || type === 'casual-waitlist') {
      const enrolmentType = type === 'casual-waitlist' ? 'casual' : 'course'
      enrolments.create({ session: session.id, status: 'waitlisted', enrolment_type: enrolmentType })
        .then(() => setBooked(b => [...b, session.id + '-waitlist']))
        .catch(() => {})
      return
    }
    setCart({ session, type: type || 'casual', price })
    setPromoCode('')
    setPromoDiscount(null)
    setPromoError('')
    setAppliedPromoCode('')
  }

  async function applyPromoCode() {
    if (!promoCode) return
    setPromoApplying(true)
    setPromoError('')
    try {
      const itemType = cart?.type === 'casual' ? 'casual' : cart?.type === 'trial' ? 'casual' : 'season'
      const res = await paymentsApi.promoCodes.validate({
        code: promoCode,
        item_type: itemType,
        amount: cart?.price,
      })
      setPromoDiscount(res.data.discount)
      setAppliedPromoCode(promoCode)
    } catch (err) {
      setPromoError(err.response?.data?.detail || 'Invalid promo code')
      setPromoDiscount(null)
    } finally {
      setPromoApplying(false)
    }
  }

  async function proceedToCheckout(finalPrice) {
    if (!cart) return
    const { session, type } = cart
    const effectivePrice = finalPrice ?? cart.price
    const isCasual = type === 'casual'
    const isTrial = type === 'trial'
    const description = isTrial
      ? `Trial Class — ${session.name}`
      : type === 'catchup'
      ? `Catch-up — ${session.name}`
      : `${session.name} — ${isCasual ? 'Casual' : 'Season'}`

    // Catchup = zero cost: skip Stripe, create enrolment directly
    if (type === 'catchup' && effectivePrice === 0) {
      try {
        await enrolments.create({ session: session.id, status: 'active', enrolment_type: 'catchup' })
        refetchCredits()
        setBooked(b => [...b, session.id])
        setCart(null)
      } catch (err) {
        // surface error if credit check fails on backend
        alert(err.response?.data?.detail || 'Booking failed — please try again')
      }
      return
    }

    setCheckout({ session, type, amount: effectivePrice, description, sessionIds: [session.id] })
  }

  async function cancelWorkshop(workshop) {
    setCancellingWorkshopId(workshop.id)
    try {
      await classes.workshops.cancel(workshop.id)
      setWorkshopBooked(prev => { const n = { ...prev }; delete n[workshop.id]; return n })
      refetchWorkshops()
    } catch (err) {
      setWorkshopError(err.response?.data?.detail || 'Could not cancel — please try again')
      setTimeout(() => setWorkshopError(''), 4000)
    } finally {
      setCancellingWorkshopId(null)
    }
  }

  async function bookWorkshop(workshop) {
    setBookingWorkshopId(workshop.id)
    try {
      const res = await classes.workshops.book(workshop.id)
      setWorkshopBooked(prev => ({ ...prev, [workshop.id]: res.data.status }))
      refetchWorkshops()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Booking failed — please try again'
      setWorkshopError(msg)
      setTimeout(() => setWorkshopError(''), 4000)
    } finally {
      setBookingWorkshopId(null)
    }
  }

  async function handlePaymentSuccess() {
    const { session, type } = checkout
    setCheckout(null)
    setCart(null)
    setPromoDiscount(null)
    if (appliedPromoCode) {
      paymentsApi.promoCodes.use({ code: appliedPromoCode }).catch(() => {})
      setAppliedPromoCode('')
    }
    try {
      await enrolments.create({ session: session.id, status: 'active', enrolment_type: type || 'casual' })
    } catch {}
    if (type === 'catchup') refetchCredits()
    setBooked(b => [...b, session.id])
  }

  const TABS = [
    ['season', 'Season Enrolment'],
    ['casual', 'Casual / Drop-in'],
    ['trial', 'Trial Class'],
    ['catchup', 'Catch-up Classes'],
    ['workshop', 'Workshops'],
  ]

  const cartSessionId = cart?.session?.id

  const balance = balanceData ? parseFloat(balanceData.balance) : null
  const isOwing = balance !== null && balance < 0

  if (isOwing) {
    return (
      <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 16px' }}>
        <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: 14, padding: '28px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>🔒</div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 8 }}>Outstanding balance</div>
          <div style={{ fontSize: 14, color: 'var(--grey)', marginBottom: 20, lineHeight: 1.6 }}>
            You have an outstanding balance of <span style={{ color: 'var(--red)', fontWeight: 600 }}>${Math.abs(balance).toFixed(2)}</span>.
            Please settle your account before booking another class.
          </div>
          <a href="/portal/billing" style={{ display: 'inline-block', background: 'var(--lime)', color: '#000', fontWeight: 700, borderRadius: 8, padding: '11px 24px', textDecoration: 'none', fontSize: 14 }}>
            Pay now
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: cart ? 100 : 0 }}>
      {checkout && (
        <CheckoutModal
          amount={checkout.amount}
          description={checkout.description}
          sessionIds={checkout.sessionIds}
          saveMethod={true}
          onSuccess={handlePaymentSuccess}
          onClose={() => setCheckout(null)}
        />
      )}

      <StickyCart
        cart={cart?.session}
        priceCasual={cart?.price}
        onProceed={proceedToCheckout}
        onClear={() => { setCart(null); setPromoDiscount(null); setPromoCode(''); setPromoError('') }}
        promoCode={promoCode}
        promoDiscount={promoDiscount}
        onPromoChange={code => { setPromoCode(code); setPromoDiscount(null); setPromoError('') }}
        onPromoApply={applyPromoCode}
        promoApplying={promoApplying}
        promoError={promoError}
      />

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Book a Class</div>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>Browse available classes and secure your spot</div>
      </div>

      <div className="tab-strip" style={{ marginBottom: 20 }}>
        {TABS.map(([key, label]) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === 'season' && (
        <div>
          {upcomingSeason && !upcomingSeason.bookings_open ? (
            <div style={{ background: 'rgba(255,68,68,0.07)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 12, padding: '20px 20px', marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>🔒</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{upcomingSeason.name} — Bookings not open yet</div>
              <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
                Enrolments for this season haven't opened yet. Keep an eye on your email — we'll let you know the moment they do!
                {upcomingSeason?.start_date && upcomingSeason?.end_date
                  ? ` The season runs ${new Date(upcomingSeason.start_date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${new Date(upcomingSeason.end_date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}.`
                  : ''}
              </div>
            </div>
          ) : (
          <div style={{ background: 'rgba(176,160,255,0.08)', border: '1px solid rgba(176,160,255,0.25)', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{upcomingSeason ? upcomingSeason.name : 'Next Season'}</div>
            <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.6 }}>
              Season enrolment gives you a reserved spot in your class for the full term.
              {upcomingSeason?.start_date && upcomingSeason?.end_date
                ? ` ${upcomingSeason.name} runs ${new Date(upcomingSeason.start_date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${new Date(upcomingSeason.end_date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}.`
                : ''}
            </div>
          </div>
          )}

          {(!upcomingSeason || upcomingSeason.bookings_open) && (
            <>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 14, fontWeight: 600 }}>
                Current Season Classes
              </div>
              {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {sessions.length === 0 ? <EmptyState /> : sessions.map(s => (
                    <ClassCard key={s.id} session={s} onAddToCart={(s, type) => addToCart(s, type || 'season', seasonPrice)} priceCasual={seasonPrice} cartSessionId={cartSessionId} isWaitlisted={booked.includes(s.id + '-waitlist')} waitlistType="waitlist" />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'casual' && (
        <div>
          <div style={{ background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Drop-in Rate: ${priceCasual} per class</div>
            <div style={{ fontSize: 12, color: 'var(--grey)' }}>Select a class below, then pick the specific date you'd like to attend.</div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : sessions.length === 0 ? <EmptyState /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sessions.map(s => {
                const alreadyEnrolled = (activeEnrolData?.results || activeEnrolData || []).some(
                  e => e.class_session === s.id && e.enrolment_type === 'course'
                )
                return (
                  <OccurrenceBookingPanel
                    key={s.id}
                    session={s}
                    enrolmentType="casual"
                    priceCasual={priceCasual}
                    seasonName={upcomingSeason?.name}
                    seasonPrice={seasonPrice}
                    alreadyEnrolled={alreadyEnrolled}
                    onEnrolInSeason={() => setTab('season')}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'trial' && (
        <div>
          <div style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 6, color: 'var(--amber)' }}>Try Your First Class</div>
                <div style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.7, marginBottom: 4 }}>
                  Your first class, no experience needed.
                </div>
                <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.6 }}>
                  Pick any class below and come as you are. Just wear comfortable activewear and bring water. We'll take care of the rest.
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26, color: 'var(--amber)' }}>${priceTrial}</div>
                <div style={{ fontSize: 11, color: 'var(--grey)' }}>trial rate</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 14, fontWeight: 600 }}>
            Available Classes for Your Trial
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {sessions.length === 0 ? <EmptyState /> : sessions.map(s => (
                <div key={s.id} style={{
                  background: 'var(--card)',
                  border: `1px solid ${cartSessionId === s.id ? 'var(--amber)' : 'rgba(255,170,0,0.2)'}`,
                  borderRadius: 12,
                  padding: '16px 18px',
                  transition: 'border-color 0.2s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ flex: 1, paddingRight: 10 }}>
                      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, marginBottom: 3 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                        {DAYS[s.day_of_week]} · {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                      </div>
                      {s.studio_detail && (
                        <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{s.studio_detail.name}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, color: 'var(--amber)' }}>${priceTrial}</div>
                      <div style={{ fontSize: 10, color: 'var(--grey)' }}>trial rate</div>
                    </div>
                  </div>

                  {s.instructor_detail && (
                    <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10 }}>
                      Instructor: <span style={{ color: 'var(--white)' }}>{s.instructor_detail.display_name || s.instructor_detail.first_name}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <SpotsLabel spotsLeft={(s.capacity || 12) - (s.enrolled_count || 0)} />
                    {cartSessionId === s.id ? (
                      <span style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 700 }}>✓ Added</span>
                    ) : (
                      <button
                        className="btn btn-sm"
                        style={{ background: 'var(--amber)', color: '#000', fontWeight: 700, border: 'none' }}
                        onClick={() => addToCart(s, 'trial', priceTrial)}
                        disabled={(s.capacity || 12) - (s.enrolled_count || 0) <= 0}
                      >
                        Book Trial
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'catchup' && (
        <div>
          <div style={{
            background: availableCredits > 0 ? 'rgba(204,255,0,0.06)' : 'rgba(255,68,68,0.06)',
            border: `1px solid ${availableCredits > 0 ? 'rgba(204,255,0,0.2)' : 'rgba(255,68,68,0.2)'}`,
            borderRadius: 12, padding: '14px 18px', marginBottom: 20,
          }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
              {availableCredits > 0
                ? `You have ${availableCredits} catch-up credit${availableCredits !== 1 ? 's' : ''} available`
                : 'No catch-up credits available'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--grey)' }}>
              {availableCredits > 0
                ? 'Select a class and pick the specific date you want to catch up. Each booking uses 1 credit.'
                : 'Credits are issued when you notify us of an absence within the cancellation window. Contact the studio if you believe this is incorrect.'}
            </div>
          </div>

          {availableCredits > 0 && (
            loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : sessions.length === 0 ? <EmptyState /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sessions.map(s => {
                  const seasonStart = s.season_start_date ? new Date(s.season_start_date + 'T00:00:00') : null
                  const weekNum = seasonStart ? Math.floor((new Date() - seasonStart) / (7 * 86400000)) + 1 : null
                  const cutoffPassed = s.catchup_cutoff_weeks != null && weekNum != null && weekNum > s.catchup_cutoff_weeks
                  if (cutoffPassed) {
                    return (
                      <div key={s.id} style={{ background: '#111', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.5 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>Catch-ups closed after week {s.catchup_cutoff_weeks}</div>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--red)' }}>Closed</span>
                      </div>
                    )
                  }
                  return <OccurrenceBookingPanel key={s.id} session={s} enrolmentType="catchup" availableCredits={availableCredits} onCreditUsed={refetchCredits} />
                })}
              </div>
            )
          )}
        </div>
      )}

      {tab === 'workshop' && (
        <div>
          {workshopError && (
            <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{workshopError}</div>
          )}
          {loadingWorkshops ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : workshops.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 28, marginBottom: 10 }}>🎪</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No workshops coming up</div>
              <div style={{ fontSize: 12 }}>Check back soon — workshops are added regularly.</div>
            </div>
          ) : workshops.map(w => {
            const dateLabel = new Date(w.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
            const timeLabel = `${w.start_time?.slice(0, 5)} – ${w.end_time?.slice(0, 5)}`
            const instructorName = w.instructor_detail?.display_name || ''
            const spotsFree = w.spots_left ?? Math.max(0, (w.capacity || 12) - (w.enrolled_count || 0))
            const liveStatus = workshopBooked[w.id] ?? w.booking_status
            const alreadyBooked = liveStatus === 'confirmed'
            const onWaitlist = liveStatus === 'waitlisted'
            const booking = bookingWorkshopId === w.id
            const cancelling = cancellingWorkshopId === w.id
            return (
              <div key={w.id} style={{ background: 'var(--card)', border: `1px solid ${alreadyBooked ? 'var(--lime)' : 'var(--border)'}`, borderRadius: 12, padding: '18px 20px', marginBottom: 12, transition: 'border-color 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 4 }}>{w.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                      {dateLabel} · {timeLabel}{instructorName ? ` · ${instructorName}` : ''}{w.studio_detail?.name ? ` · ${w.studio_detail.name}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: 'var(--lime)' }}>${parseFloat(w.price).toFixed(0)}</div>
                  </div>
                </div>
                {w.description && (
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 12, lineHeight: 1.6 }}>{w.description}</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <SpotsLabel spotsLeft={spotsFree} />
                  {alreadyBooked ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--lime)', fontWeight: 700 }}>✓ Booked</span>
                      <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)', fontSize: 11 }} onClick={() => cancelWorkshop(w)} disabled={cancelling}>{cancelling ? '…' : 'Cancel'}</button>
                    </div>
                  ) : onWaitlist ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 700 }}>On waitlist</span>
                      <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)', fontSize: 11 }} onClick={() => cancelWorkshop(w)} disabled={cancelling}>{cancelling ? '…' : 'Leave'}</button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-lime btn-sm"
                      onClick={() => bookWorkshop(w)}
                      disabled={booking}
                    >
                      {booking ? 'Booking…' : spotsFree <= 0 ? `Join Waitlist` : `Book — $${parseFloat(w.price).toFixed(0)}`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {booked.length > 0 && !cart && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: 'var(--lime)', color: '#000', padding: '10px 20px', borderRadius: 20, fontSize: 13, fontWeight: 700, zIndex: 100 }}>
          ✓ Booking confirmed!
        </div>
      )}
    </div>
  )
}
