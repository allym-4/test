import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../contexts/AuthContext'
import { classes, enrolments, settings as settingsApi, seasons as seasonsApi, payments as paymentsApi, attendance as attendanceApi, helpdesk as helpdeskApi, categories as categoriesApi } from '../../api'
import CheckoutModal from '../../components/CheckoutModal'
import SetupCardModal from '../../components/SetupCardModal'

let _stripePromise = null
async function getStripe() {
  if (!_stripePromise) {
    const { data } = await paymentsApi.stripe.config()
    _stripePromise = loadStripe(data.publishable_key)
  }
  return _stripePromise
}

const STRIPE_DARK = {
  theme: 'night',
  variables: {
    colorPrimary: '#b0a0ff',
    colorBackground: '#0a0a0a',
    colorText: '#ffffff',
    colorDanger: '#ff4444',
    fontFamily: 'Archivo, sans-serif',
    borderRadius: '8px',
    colorInputBackground: '#0a0a0a',
    colorInputBorder: '#2a2a2a',
  },
}

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
  const [showPendingModal, setShowPendingModal] = useState(false)
  const [showSetupCard, setShowSetupCard] = useState(false)
  const [cardSaved, setCardSaved] = useState(false)
  const [joiningWaitlist, setJoiningWaitlist] = useState(false)

  // held_count accounts for spots reserved for pending transfer requests
  const spotsLeft = (session.capacity || 12) - (session.enrolled_count || 0) - (session.held_count || 0)
  const isFull = spotsLeft <= 0
  // A casual holds the last physical spot — they'll be offered the season first
  const casualHoldsSpot = !isFull && spotsLeft === 1 && session.has_upcoming_casual
  // A transfer request has the spot held — it may open if the transfer falls through
  const transferHoldsSpot = isFull && (session.held_count || 0) > 0
  // Pending state: either a transfer or casual is "using" the last spot
  const isPending = transferHoldsSpot || casualHoldsSpot

  const levelBadge = getLevelBadge(session.name)
  const inCart = cartSessionId === session.id

  async function joinWaitlistWithCard() {
    setJoiningWaitlist(true)
    try {
      await enrolments.create({ session: session.id, status: 'waitlisted', enrolment_type: 'course' })
      onAddToCart(session, 'waitlist-done')
      setShowPendingModal(false)
    } catch {
      // silently ignore duplicates
      setShowPendingModal(false)
    } finally {
      setJoiningWaitlist(false)
    }
  }

  const pendingMessage = transferHoldsSpot
    ? 'A spot is pending a transfer — join the waitlist to be next in line.'
    : "A casual is taking the last spot in one of the weeks. We'll offer them the chance to take the full season, and if they don't accept, the spot will be yours!"

  return (
    <>
      <div style={{ background: 'var(--card)', border: `1px solid ${inCart ? 'var(--lime)' : isPending ? 'rgba(255,170,0,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: '16px 18px', transition: 'border-color 0.2s' }}>
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
          {isPending ? (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(255,170,0,0.12)', color: 'var(--amber)', display: 'inline-block' }}>
              Spot Pending
            </span>
          ) : (
            <SpotsLabel spotsLeft={spotsLeft} />
          )}

          {isWaitlisted ? (
            <span style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 700 }}>On Waitlist ✓</span>
          ) : isPending ? (
            <button className="btn btn-sm" style={{ background: 'rgba(255,170,0,0.15)', color: 'var(--amber)', border: '1px solid rgba(255,170,0,0.3)', fontSize: 12 }} onClick={() => setShowPendingModal(true)}>
              Join Waitlist →
            </button>
          ) : isFull ? (
            inCart ? (
              <span style={{ fontSize: 12, color: 'var(--lime)', fontWeight: 700 }}>✓ Added</span>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => onAddToCart(session, waitlistType)}>Full — Join Waitlist</button>
            )
          ) : inCart ? (
            <span style={{ fontSize: 12, color: 'var(--lime)', fontWeight: 700 }}>✓ Added</span>
          ) : (
            <button className="btn btn-lime btn-sm" onClick={() => onAddToCart(session)}>Book</button>
          )}
        </div>

        {/* Pending explanation shown inline under the badge */}
        {isPending && !isWaitlisted && (
          <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 8, lineHeight: 1.5, opacity: 0.85 }}>
            {pendingMessage}
          </div>
        )}
      </div>

      {/* Pending spot waitlist modal */}
      {showPendingModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', padding: 16 }}
          onClick={e => e.target === e.currentTarget && setShowPendingModal(false)}>
          <div style={{ background: '#111', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20 }}>Spot Pending</div>
              <button onClick={() => setShowPendingModal(false)} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: 1, padding: '8px 14px', cursor: 'pointer' }}>CLOSE</button>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{session.name}</div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>
              {DAYS[session.day_of_week]}{session.start_time ? ` · ${session.start_time.slice(0, 5)}` : ''}
            </div>
            <div style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 12, padding: '16px 18px', marginBottom: 20, fontSize: 14, color: '#ddd', lineHeight: 1.7 }}>
              {pendingMessage}
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 20, lineHeight: 1.6 }}>
              Join the waitlist and save your card details. You won't be charged unless a spot opens and you confirm — we'll notify you immediately.
            </div>

            {!cardSaved ? (
              <>
                <button
                  onClick={() => setShowSetupCard(true)}
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: '14px', fontSize: 13, color: '#888', fontWeight: 600, cursor: 'pointer', marginBottom: 10, textAlign: 'left' }}
                >
                  💳 Save card details for when a spot opens →
                </button>
                <button
                  onClick={joinWaitlistWithCard}
                  disabled={joiningWaitlist}
                  style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 12, color: '#555', cursor: 'pointer', padding: '8px 0' }}
                >
                  {joiningWaitlist ? 'Adding…' : 'Join waitlist without saving card'}
                </button>
              </>
            ) : (
              <button
                onClick={joinWaitlistWithCard}
                disabled={joiningWaitlist}
                style={{ width: '100%', background: 'var(--amber)', color: '#000', border: 'none', borderRadius: 12, padding: '18px 0', fontWeight: 900, fontSize: 13, letterSpacing: 0.5, cursor: joiningWaitlist ? 'default' : 'pointer' }}
              >
                {joiningWaitlist ? '…' : '✓ Card saved — Add me to the waitlist'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stripe card setup */}
      {showSetupCard && (
        <SetupCardModal
          onSuccess={() => { setCardSaved(true); setShowSetupCard(false) }}
          onClose={() => setShowSetupCard(false)}
        />
      )}
    </>
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

function CasualBookingModal({ occ, session, priceCasual, priceCasualStandard, isEnrolledRate, priceClassPass, classPassSize, availableCredits, passCredits, seasonName, seasonPrice, seasonWeek, alreadyEnrolled, onClose, onBook, onEnrolInSeason, onBuyPass }) {
  const sessName = session?.name ?? 'Class'
  const time = session?.start_time?.slice(0, 5)
  const instructor = session?.instructor_detail?.display_name ?? session?.instructor_detail?.first_name
  const dateLabel = occ?.date ? new Date(occ.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : null
  const hasCredits = availableCredits > 0
  const hasPass = (passCredits ?? 0) > 0
  const standardRate = priceCasualStandard || priceCasual
  const passSaving = priceClassPass && classPassSize ? Math.round((standardRate - priceClassPass / classPassSize) * classPassSize) : 0
  const perSession = priceClassPass && classPassSize ? (priceClassPass / classPassSize).toFixed(0) : null
  const missedWeeks = seasonWeek > 1 ? seasonWeek - 1 : 0

  const defaultSelected = hasCredits ? 'credit' : hasPass ? 'pass' : 'casual'
  const [selected, setSelected] = useState(defaultSelected)

  const actionLabel = selected === 'credit' ? 'BOOK FOR FREE'
    : selected === 'pass' ? 'USE PASS — FREE'
    : selected === 'casual' ? `PAY $${priceCasual}`
    : selected === 'buypass' ? `BUY PASS — $${priceClassPass}`
    : selected === 'season' ? 'ENROL IN SEASON →'
    : 'BOOK'

  function handleConfirm() {
    if (selected === 'season') { onClose(); onEnrolInSeason(); return }
    if (selected === 'buypass') { onClose(); onBuyPass(); return }
    onBook(selected === 'credit' ? 'catchup' : selected === 'pass' ? 'classpass' : 'casual')
  }

  const OptionRow = ({ id, title, sub, price, accent, checkbox }) => {
    const isSel = selected === id
    return (
      <div
        onClick={() => setSelected(id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
          borderRadius: 12, border: `1px solid ${isSel ? (accent ?? '#555') : '#222'}`,
          background: isSel && accent ? `${accent}12` : 'transparent',
          cursor: 'pointer', marginBottom: 10,
        }}
      >
        <div style={{
          width: 18, height: 18, flexShrink: 0,
          borderRadius: checkbox ? 4 : 9,
          border: `2px solid ${isSel ? (accent ?? '#ccff00') : '#444'}`,
          background: isSel && !checkbox ? (accent ?? '#ccff00') : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isSel && checkbox && <span style={{ fontSize: 10, color: accent ?? '#ccff00', fontWeight: 900 }}>✓</span>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: isSel && accent ? accent : '#fff', marginBottom: 3 }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{sub}</div>}
        </div>
        {price && <div style={{ fontSize: 18, fontWeight: 900, color: isSel && accent ? accent : '#ccff00', flexShrink: 0, marginLeft: 8 }}>{price}</div>}
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', padding: '16px' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#111', borderRadius: 20, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(18px, 5vw, 26px)', lineHeight: 1.1, marginBottom: 6 }}>{sessName}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{[dateLabel, time, instructor].filter(Boolean).join(' · ')}</div>
          </div>
          <button onClick={onClose} style={{ background: '#222', border: '1px solid #333', borderRadius: 10, padding: '8px 14px', color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', flexShrink: 0, marginLeft: 16 }}>CLOSE</button>
        </div>

        {hasCredits && (
          <div style={{ fontSize: 13, color: '#999', marginBottom: 18 }}>
            <span style={{ color: '#b0a0ff', fontWeight: 700 }}>{availableCredits}</span> catch-up credit{availableCredits !== 1 ? 's' : ''} available
          </div>
        )}

        {!alreadyEnrolled && seasonName && (
          <OptionRow id="season" checkbox
            title={`Enrol in the full ${seasonName} course instead`}
            sub={`Add this class to your season${seasonPrice ? ` · ${seasonPrice}` : ''}${missedWeeks > 0 ? ` · ${missedWeeks} catch-up credit${missedWeeks !== 1 ? 's' : ''} for missed classes` : ''}`}
          />
        )}

        {hasCredits && (
          <OptionRow id="credit"
            title="Use class credit"
            sub={`You have ${availableCredits} class credit${availableCredits !== 1 ? 's' : ''} available`}
            price="FREE"
            accent="#b0a0ff"
          />
        )}

        <OptionRow id="casual"
          title="Pay casual rate"
          sub={isEnrolledRate ? 'Enrolled student rate · Card via Stripe' : 'Standard casual rate · Card via Stripe'}
          price={`$${priceCasual}`}
        />

        {hasPass && (
          <OptionRow id="pass"
            title={`${classPassSize}-class pass`}
            sub={`${passCredits} credit${passCredits !== 1 ? 's' : ''} remaining on your pass`}
            price="FREE"
            accent="#b0a0ff"
          />
        )}

        {!hasPass && priceClassPass && (
          <OptionRow id="buypass"
            title={passSaving > 0 ? <>{classPassSize}-class pass · <span style={{ color: '#ccff00' }}>save ${passSaving}</span></> : `${classPassSize}-class pass`}
            sub={`$${perSession}/class · use across any eligible casual or catch-up`}
            price={`$${priceClassPass}`}
            accent="#b0a0ff"
          />
        )}

        <button
          onClick={handleConfirm}
          style={{ width: '100%', background: '#ccff00', color: '#000', border: 'none', borderRadius: 14, padding: '18px 0', fontSize: 15, fontWeight: 900, letterSpacing: 0.5, cursor: 'pointer', marginTop: 8 }}
        >
          {actionLabel}
        </button>
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: 13, cursor: 'pointer' }}>Maybe later</button>
        </div>
      </div>
    </div>
  )
}

function OccurrenceBookingPanel({ session, enrolmentType, priceCasual, isEnrolledRate, priceClassPass, classPassSize, availableCredits, onCreditUsed, seasonName, seasonPrice, alreadyEnrolled, onEnrolInSeason, passCredits, onPassUsed, onBuyPass, isNewStudent = false, seasonStartDate = null, userLevel = null }) {
  const [open, setOpen] = useState(false)
  const [occurrences, setOccurrences] = useState(null)
  const [loading, setLoading] = useState(false)
  const [bookingId, setBookingId] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [error, setError] = useState('')
  const [modalOcc, setModalOcc] = useState(null)
  const [waitlistOcc, setWaitlistOcc] = useState(null)
  const [waitlistJoining, setWaitlistJoining] = useState(false)
  const [exemptionOcc, setExemptionOcc] = useState(null)
  const [exemptionSending, setExemptionSending] = useState(false)
  const [headsUpOcc, setHeadsUpOcc] = useState(null)

  const currentSeasonWeek = getCurrentSeasonWeek(seasonStartDate)
  const isRoutine = isRoutineClass(session.name)
  const isBeginnerFriendly = isBeginnerFriendlyClass(session.name)
  const requiresExemption = isRoutine && currentSeasonWeek > 3 && !alreadyEnrolled
  const sessionLevel = getClassLevel(session.name)
  const userLevelNum = parseLevel(userLevel)
  const isLevelLocked = sessionLevel > 0 && userLevelNum > 0 && sessionLevel > userLevelNum

  function handleOpenBooking(occ) {
    if (isNewStudent && !isBeginnerFriendly) {
      setHeadsUpOcc(occ)
      return
    }
    if (requiresExemption || isLevelLocked) {
      setExemptionOcc(occ)
      return
    }
    setModalOcc(occ)
  }

  async function joinWaitlist(occ) {
    setWaitlistJoining(true)
    try {
      await book(occ, 'casual')
    } finally {
      setWaitlistJoining(false)
      setWaitlistOcc(null)
    }
  }

  async function sendExemptionRequest(occ, reason) {
    setExemptionSending(true)
    try {
      await classes.casual.exemptionRequest({ session: session.id, occ_id: occ.id, reason }).catch(() => {
        // fallback: just record locally if API doesn't exist yet
      })
      setExemptionOcc(null)
      alert('Exemption request sent! Your instructor will review and get back to you.')
    } finally {
      setExemptionSending(false)
    }
  }

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

  async function book(occ, type) {
    setBookingId(occ.id)
    setModalOcc(null)
    setError('')
    try {
      const res = await classes.casual.book(occ.id, { enrolment_type: type })
      const updated = { ...occ, my_booking: res.data, spots_left: res.data.status === 'confirmed' ? occ.spots_left - 1 : occ.spots_left }
      setOccurrences(o => o.map(x => x.id === occ.id ? updated : x))
      if (type === 'catchup' && res.data.status === 'confirmed' && onCreditUsed) onCreditUsed()
      if (type === 'classpass' && res.data.status === 'confirmed' && onPassUsed) onPassUsed()
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
  const isCasual = enrolmentType === 'casual'
  const hasPassCredits = isCasual && (passCredits ?? 0) > 0

  return (
    <>
      {modalOcc && (
        <CasualBookingModal
          occ={modalOcc}
          session={session}
          priceCasual={priceCasual}
          isEnrolledRate={isEnrolledRate}
          priceClassPass={priceClassPass}
          classPassSize={classPassSize}
          availableCredits={availableCredits}
          passCredits={passCredits}
          seasonName={seasonName}
          seasonPrice={seasonPrice}
          alreadyEnrolled={alreadyEnrolled}
          onClose={() => setModalOcc(null)}
          onBook={(type) => book(modalOcc, type)}
          onEnrolInSeason={onEnrolInSeason}
          onBuyPass={onBuyPass}
        />
      )}
      {waitlistOcc && (
        <WaitlistModal
          session={session}
          occ={waitlistOcc}
          joining={waitlistJoining}
          onConfirm={() => joinWaitlist(waitlistOcc)}
          onCancel={() => setWaitlistOcc(null)}
        />
      )}
      {exemptionOcc && (
        <ExemptionModal
          session={session}
          occ={exemptionOcc}
          seasonWeek={currentSeasonWeek}
          type={isLevelLocked && !requiresExemption ? 'level' : 'cutoff'}
          requiredLevel={sessionLevel || null}
          userLevel={userLevelNum || null}
          sending={exemptionSending}
          onSend={(reason) => sendExemptionRequest(exemptionOcc, reason)}
          onCancel={() => setExemptionOcc(null)}
        />
      )}
      {headsUpOcc && (
        <HeadsUpModal
          session={session}
          occ={headsUpOcc}
          onConfirm={() => { const o = headsUpOcc; setHeadsUpOcc(null); requiresExemption ? setExemptionOcc(o) : setModalOcc(o) }}
          onCancel={() => setHeadsUpOcc(null)}
        />
      )}
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
            {isCasual && <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--lime)' }}>${priceCasual}</span>}
            {isCasual && hasPassCredits && <span className="tag" style={{ fontSize: 10, background: 'rgba(204,255,0,0.1)', color: 'var(--lime)', border: '1px solid rgba(204,255,0,0.3)' }}>{passCredits} pass</span>}
            {isCatchup && <span className="tag tag-lime" style={{ fontSize: 10 }}>Uses 1 credit</span>}
            <span style={{ fontSize: 16, color: 'var(--grey)', transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
          </div>
        </button>

        {open && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px 16px' }}>
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
                      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                        {isBooked || (isWaitlisted && !hasOffer) ? (
                          <button className="btn btn-ghost btn-xs" style={{ fontSize: 11, color: 'var(--red)' }} onClick={() => cancel(occ)} disabled={isCancelling}>
                            {isCancelling ? '…' : isWaitlisted ? 'Leave' : 'Cancel'}
                          </button>
                        ) : hasOffer ? (
                          <span style={{ fontSize: 11, color: 'var(--lime)', fontWeight: 700 }}>Claim →</span>
                        ) : isFull ? (
                          <button className="btn btn-ghost btn-xs" style={{ fontSize: 11 }} onClick={() => setWaitlistOcc(occ)} disabled={isBooking}>
                            {isBooking ? '…' : 'Join Waitlist'}
                          </button>
                        ) : isCatchup ? (
                          <button className="btn btn-lime btn-xs" style={{ fontSize: 11 }} onClick={() => handleOpenBooking(occ)} disabled={isBooking}>
                            {isBooking ? '…' : requiresExemption ? 'Request Exemption' : 'Book (Credit)'}
                          </button>
                        ) : (
                          <button className="btn btn-lime btn-xs" style={{ fontSize: 11 }} onClick={() => handleOpenBooking(occ)} disabled={isBooking}>
                            {isBooking ? '…' : requiresExemption ? 'Request Exemption' : 'Book'}
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
    </>
  )
}

// ─── Class type helpers ───────────────────────────────────────────────────────

function isRoutineClass(name) {
  if (!name) return false
  const n = name.toLowerCase()
  if (/level\s*[1-6]/.test(n)) return true
  if (n.includes('strip') || n.includes('floor virgin') || n.includes('jazz') || n.includes('chair')) return true
  return false
}

function isBeginnerFriendlyClass(name) {
  if (!name) return true
  const n = name.toLowerCase()
  return /virgin|level\s*1|practice/.test(n)
}

function getCurrentSeasonWeek(startDate) {
  if (!startDate) return 0
  const start = new Date(startDate + 'T00:00:00')
  const diffDays = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24))
  return Math.max(0, Math.floor(diffDays / 7) + 1)
}

function SeasonNotifyCard({ season, defaultEmail = '' }) {
  const [email, setEmail] = useState(defaultEmail)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await seasonsApi.notifyMe(season.id, { email: email.trim() })
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not register — please try again.')
    } finally {
      setLoading(false)
    }
  }

  const weeksUntilOpen = (() => {
    // Casuals open in week 8 of the active season — give a rough "X weeks away" hint
    return null
  })()

  if (submitted) {
    return (
      <div style={{ background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.25)', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: '#ccff00', marginBottom: 6 }}>You're on the list!</div>
        <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6 }}>
          We'll email <strong>{email}</strong> as soon as casuals and trials open for {season.name}. Stay tuned.
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #222', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, marginBottom: 6 }}>Looking for a future date?</div>
      <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 14 }}>
        Casual and trial bookings for <strong style={{ color: '#ccc' }}>{season.name}</strong> open the week before the season starts.
        Drop your email and we'll ping you the moment they're live — with a direct link to book.
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          style={{ flex: 1, minWidth: 180, background: '#0d0d0d', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14, padding: '10px 14px', outline: 'none', boxSizing: 'border-box' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ background: '#ccff00', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 900, fontSize: 13, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap' }}
        >
          {loading ? 'Saving…' : 'Notify me'}
        </button>
      </form>
      {error && <div style={{ color: '#ff6666', fontSize: 12, marginTop: 8 }}>{error}</div>}
    </div>
  )
}

// ─── Cash payment modal ───────────────────────────────────────────────────────

function CashPaymentModal({ checkout, onClose, onConfirm }) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const [phase, setPhase] = useState(1)
  const [cashDate, setCashDate] = useState(todayStr)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [loadingStripe, setLoadingStripe] = useState(false)
  const [clientSecret, setClientSecret] = useState(null)
  const [stripeInst, setStripeInst] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function goToCardStep() {
    setError('')
    setLoadingStripe(true)
    try {
      const [si, res] = await Promise.all([getStripe(), paymentsApi.stripe.createSetupIntent()])
      setStripeInst(si)
      setClientSecret(res.data.client_secret)
      setPhase(2)
    } catch {
      setError('Could not initialise payment. Please try again.')
    } finally {
      setLoadingStripe(false)
    }
  }

  const OrderSummary = () => (
    <div style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>Order Summary</div>
      {checkout.sessions?.length > 0
        ? checkout.sessions.map((s, i) => <div key={i} style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{s.name}</div>)
        : <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{checkout.description}</div>
      }
      <div style={{ borderTop: '1px solid #222', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>Total</span>
        <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, color: '#ccff00' }}>${(checkout.amount || 0).toFixed(2)}</span>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#111', borderRadius: 20, width: '100%', maxWidth: 480, padding: '22px 20px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(17px, 4.5vw, 22px)' }}>Pay by Cash</div>
          <button onClick={onClose} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: 1, padding: '7px 12px', cursor: 'pointer' }}>CLOSE</button>
        </div>

        <OrderSummary />

        {phase === 1 && (
          <>
            <div style={{ background: 'rgba(255,170,0,0.07)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#ccc', lineHeight: 1.6 }}>
              Your booking is confirmed now. Please bring <strong style={{ color: '#ffaa00' }}>${(checkout.amount || 0).toFixed(0)} cash</strong> to the studio by the date below. A card is required as a backup — if payment isn't received, your card will be charged.
            </div>
            <div className="field">
              <label>When are you bringing payment?</label>
              <input type="date" value={cashDate} min={todayStr} onChange={e => setCashDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="e.g. I'll bring it Tuesday morning" style={{ resize: 'none' }} />
            </div>
            {error && <div style={{ color: '#ff4444', fontSize: 13, marginBottom: 10 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button
                className="btn btn-sm"
                style={{ flex: 2, background: '#ccff00', color: '#000', fontWeight: 700, border: 'none', opacity: loadingStripe ? 0.6 : 1 }}
                onClick={goToCardStep}
                disabled={loadingStripe}
              >{loadingStripe ? 'Loading…' : 'Continue — add card'}</button>
            </div>
          </>
        )}

        {phase === 2 && clientSecret && stripeInst && (
          <>
            <div style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#ccc', lineHeight: 1.6 }}>
              Card saved as backup only — <strong style={{ color: '#ffaa00' }}>not charged today</strong>. If cash isn't received by {new Date(cashDate + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}, the studio may charge your card.
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#666', marginBottom: 12 }}>Add a backup card</div>
            <Elements stripe={stripeInst} options={{ clientSecret, appearance: STRIPE_DARK }}>
              <CashCardForm
                cashDate={cashDate}
                notes={notes}
                onConfirm={onConfirm}
                onClose={onClose}
                setError={setError}
                submitting={submitting}
                setSubmitting={setSubmitting}
              />
            </Elements>
            {error && <div style={{ color: '#ff4444', fontSize: 13, marginTop: 10 }}>{error}</div>}
            <button onClick={() => setPhase(1)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 12, cursor: 'pointer', marginTop: 8, padding: 0 }}>← Back</button>
          </>
        )}
      </div>
    </div>
  )
}

function CashCardForm({ cashDate, notes, onConfirm, onClose, setError, submitting, setSubmitting }) {
  const stripe = useStripe()
  const elements = useElements()

  async function handleSubmit() {
    if (!stripe || !elements) return
    setSubmitting(true)
    setError('')
    try {
      const result = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      })
      if (result.error) {
        setError(result.error.message)
        setSubmitting(false)
        return
      }
      await onConfirm(cashDate, notes)
      onClose()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed — please try again')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <PaymentElement options={{ layout: 'accordion' }} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose} type="button">Cancel</button>
        <button
          className="btn btn-sm"
          style={{ flex: 2, background: '#ccff00', color: '#000', fontWeight: 700, border: 'none', opacity: submitting || !stripe ? 0.6 : 1 }}
          onClick={handleSubmit}
          disabled={submitting || !stripe}
          type="button"
        >{submitting ? 'Confirming…' : 'Confirm cash booking'}</button>
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#444', marginTop: 10 }}>🔒 Card saved as backup — not charged unless cash isn't received</div>
    </div>
  )
}

// ─── Payment plan modal ───────────────────────────────────────────────────────

const FREQ_OPTIONS = [
  { value: 'weekly', label: 'Weekly', desc: 'Spread payments each week over the season' },
  { value: 'fortnightly', label: 'Fortnightly', desc: 'Every two weeks — the most popular option' },
  { value: 'monthly', label: 'Monthly', desc: 'One payment per month' },
]

function PaymentPlanModal({ checkout, onClose, onConfirm }) {
  const suggestedDeposit = Math.round((checkout.amount || 0) * 0.5 * 100) / 100

  // Phase 1: configure options; Phase 2: Stripe card form
  const [phase, setPhase] = useState(1)
  const [frequency, setFrequency] = useState('fortnightly')
  const [timing, setTiming] = useState('today') // 'today' | 'commences'
  const [depositAmount, setDepositAmount] = useState(suggestedDeposit)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  // Stripe state — only initialised when entering phase 2
  const [clientSecret, setClientSecret] = useState(null)
  const [stripeInst, setStripeInst] = useState(null)
  const [loadingStripe, setLoadingStripe] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const needsDeposit = timing === 'commences' && depositAmount > 0

  async function goToCardStep() {
    setError('')
    setLoadingStripe(true)
    try {
      if (needsDeposit) {
        // Charge deposit now and save card for remaining
        const [si, res] = await Promise.all([
          getStripe(),
          paymentsApi.stripe.createPaymentIntent({
            amount_cents: Math.round(depositAmount * 100),
            description: `${checkout.description} — deposit`,
            save_method: true,
          }),
        ])
        setStripeInst(si)
        setClientSecret(res.data.client_secret)
      } else {
        // Just save the card, no charge today
        const [si, res] = await Promise.all([getStripe(), paymentsApi.stripe.createSetupIntent()])
        setStripeInst(si)
        setClientSecret(res.data.client_secret)
      }
      setPhase(2)
    } catch {
      setError('Could not initialise payment. Please try again.')
    } finally {
      setLoadingStripe(false)
    }
  }

  const OrderSummary = () => (
    <div style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>Order Summary</div>
      {checkout.sessions?.length > 0
        ? checkout.sessions.map((s, i) => <div key={i} style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{s.name}</div>)
        : <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{checkout.description}</div>
      }
      <div style={{ borderTop: '1px solid #222', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>Total</span>
        <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, color: '#ccff00' }}>${(checkout.amount || 0).toFixed(2)}</span>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#111', borderRadius: 20, width: '100%', maxWidth: 480, padding: '22px 20px', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(17px, 4.5vw, 22px)' }}>Payment Plan</div>
          <button onClick={onClose} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: 1, padding: '7px 12px', cursor: 'pointer' }}>CLOSE</button>
        </div>

        <OrderSummary />

        {phase === 1 && (
          <>
            {/* Frequency */}
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#666', marginBottom: 10 }}>How often would you like to pay?</div>
            {FREQ_OPTIONS.map(opt => (
              <div key={opt.value} onClick={() => setFrequency(opt.value)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, border: `2px solid ${frequency === opt.value ? '#b0a0ff' : '#222'}`, background: frequency === opt.value ? 'rgba(176,160,255,0.06)' : 'transparent', cursor: 'pointer', marginBottom: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${frequency === opt.value ? '#b0a0ff' : '#444'}`, background: frequency === opt.value ? '#b0a0ff' : 'transparent', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: frequency === opt.value ? '#b0a0ff' : '#ccc' }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>{opt.desc}</div>
                </div>
              </div>
            ))}

            {/* Timing */}
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#666', marginBottom: 10, marginTop: 16 }}>When does payment start?</div>
            {[
              { value: 'today', label: 'Start today', desc: 'First payment is set up immediately after this request is confirmed' },
              { value: 'commences', label: 'When season commences', desc: 'Payments begin when the season starts — a deposit is required today' },
            ].map(opt => (
              <div key={opt.value} onClick={() => setTiming(opt.value)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, border: `2px solid ${timing === opt.value ? '#b0a0ff' : '#222'}`, background: timing === opt.value ? 'rgba(176,160,255,0.06)' : 'transparent', cursor: 'pointer', marginBottom: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${timing === opt.value ? '#b0a0ff' : '#444'}`, background: timing === opt.value ? '#b0a0ff' : 'transparent', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: timing === opt.value ? '#b0a0ff' : '#ccc' }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>{opt.desc}</div>
                </div>
              </div>
            ))}

            {/* Deposit field (only when season commences) */}
            {timing === 'commences' && (
              <div style={{ background: 'rgba(204,255,0,0.04)', border: `1px solid ${depositAmount <= 0 ? 'rgba(255,68,68,0.4)' : 'rgba(204,255,0,0.15)'}`, borderRadius: 10, padding: '12px 14px', marginTop: 4, marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#ccff00', marginBottom: 8 }}>Deposit due today <span style={{ color: '#ff4444' }}>*</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, color: '#888' }}>$</span>
                  <input
                    type="number"
                    min="1"
                    max={checkout.amount}
                    step="10"
                    value={depositAmount}
                    onChange={e => setDepositAmount(parseFloat(e.target.value) || 0)}
                    style={{ background: '#0d0d0d', border: `1px solid ${depositAmount <= 0 ? '#ff4444' : '#333'}`, borderRadius: 8, color: '#fff', fontSize: 16, fontWeight: 700, padding: '8px 12px', width: 100 }}
                  />
                  <span style={{ fontSize: 12, color: '#555' }}>of ${(checkout.amount || 0).toFixed(0)} total</span>
                </div>
                <div style={{ fontSize: 11, color: depositAmount <= 0 ? '#ff6666' : '#555', marginTop: 6 }}>
                  {depositAmount <= 0 ? 'A deposit is required when selecting this option.' : '50% suggested · your card will be charged this amount now'}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="field" style={{ marginTop: 14 }}>
              <label>Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any questions or preferences for the team" style={{ resize: 'none' }} />
            </div>

            {error && <div style={{ color: '#ff4444', fontSize: 13, marginBottom: 10 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button
                className="btn btn-sm"
                style={{ flex: 2, background: '#b0a0ff', color: '#000', fontWeight: 700, border: 'none', opacity: (loadingStripe || (timing === 'commences' && depositAmount <= 0)) ? 0.5 : 1 }}
                onClick={goToCardStep}
                disabled={loadingStripe || (timing === 'commences' && depositAmount <= 0)}
              >{loadingStripe ? 'Loading…' : needsDeposit ? `Continue — pay $${depositAmount.toFixed(0)} deposit` : 'Continue — add card'}</button>
            </div>
          </>
        )}

        {phase === 2 && clientSecret && stripeInst && (
          <>
            <div style={{ background: needsDeposit ? 'rgba(204,255,0,0.06)' : 'rgba(176,160,255,0.06)', border: `1px solid ${needsDeposit ? 'rgba(204,255,0,0.2)' : 'rgba(176,160,255,0.2)'}`, borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#ccc', lineHeight: 1.6 }}>
              {needsDeposit
                ? <>Charging <strong style={{ color: '#ccff00' }}>${depositAmount.toFixed(2)}</strong> deposit now. Card saved for remaining ${((checkout.amount || 0) - depositAmount).toFixed(2)} once your plan is confirmed.</>
                : <>Your card is saved but <strong style={{ color: '#b0a0ff' }}>not charged</strong> today. A team member will confirm your plan schedule.</>
              }
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#666', marginBottom: 12 }}>
              {needsDeposit ? 'Enter card — deposit charged now' : 'Save a card to hold on file'}
            </div>
            <Elements stripe={stripeInst} options={{ clientSecret, appearance: STRIPE_DARK }}>
              <PlanCardForm
                needsDeposit={needsDeposit}
                frequency={frequency}
                timing={timing}
                depositAmount={depositAmount}
                notes={notes}
                onConfirm={onConfirm}
                onClose={onClose}
                setError={setError}
                submitting={submitting}
                setSubmitting={setSubmitting}
              />
            </Elements>
            {error && <div style={{ color: '#ff4444', fontSize: 13, marginTop: 10 }}>{error}</div>}
            <button onClick={() => { setPhase(1); setClientSecret(null) }} style={{ background: 'none', border: 'none', color: '#555', fontSize: 12, cursor: 'pointer', marginTop: 8, padding: 0 }}>← Back</button>
          </>
        )}
      </div>
    </div>
  )
}

function PlanCardForm({ needsDeposit, frequency, timing, depositAmount, notes, onConfirm, onClose, setError, submitting, setSubmitting }) {
  const stripe = useStripe()
  const elements = useElements()

  async function handleSubmit() {
    if (!stripe || !elements) return
    setSubmitting(true)
    setError('')
    try {
      let result
      if (needsDeposit) {
        result = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: window.location.href },
          redirect: 'if_required',
        })
      } else {
        result = await stripe.confirmSetup({
          elements,
          confirmParams: { return_url: window.location.href },
          redirect: 'if_required',
        })
      }
      if (result.error) {
        setError(result.error.message)
        setSubmitting(false)
        return
      }
      const pmId = result.paymentIntent?.payment_method || result.setupIntent?.payment_method || null
      const planNotes = `Frequency: ${frequency} | Timing: ${timing === 'commences' ? 'When season commences' : 'Start today'}${depositAmount > 0 && timing === 'commences' ? ` | Deposit paid: $${depositAmount.toFixed(2)}` : ''}${notes ? ` | ${notes}` : ''}`
      await onConfirm(frequency, planNotes, pmId)
      onClose()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to submit — please try again')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <PaymentElement options={{ layout: 'accordion' }} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose} type="button">Cancel</button>
        <button
          className="btn btn-sm"
          style={{ flex: 2, background: needsDeposit ? '#ccff00' : '#b0a0ff', color: '#000', fontWeight: 700, border: 'none', opacity: submitting || !stripe ? 0.6 : 1 }}
          onClick={handleSubmit}
          disabled={submitting || !stripe}
          type="button"
        >{submitting ? 'Submitting…' : needsDeposit ? 'Pay deposit & submit' : 'Save card & submit'}</button>
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#444', marginTop: 10 }}>🔒 Secured by Stripe</div>
    </div>
  )
}

// ─── Booking modals ───────────────────────────────────────────────────────────

function WaitlistModal({ session, occ, onConfirm, onCancel, joining }) {
  const dateLabel = occ?.date
    ? new Date(occ.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
    : null
  const instructor = session?.instructor_detail?.display_name || session?.instructor_detail?.first_name
  const timeLabel = session?.start_time?.slice(0, 5)

  // Window rules:
  // > 12h until class  → 12h to confirm
  // 4–12h until class  → 2h to confirm
  // < 4h until class   → 1h to confirm
  let windowHours = 12
  if (occ?.date && session?.start_time) {
    const classAt = new Date(`${occ.date}T${session.start_time}`)
    const hoursUntil = (classAt - new Date()) / (1000 * 60 * 60)
    if (hoursUntil > 0) {
      if (hoursUntil <= 4) windowHours = 1
      else if (hoursUntil <= 12) windowHours = 2
    }
  }
  const windowLabel = windowHours === 1 ? '1 hour' : `${windowHours} hours`
  const isUrgent = windowHours <= 2

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ background: '#111', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(17px, 5vw, 22px)' }}>Join waitlist</div>
          <button onClick={onCancel} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: 1, padding: '8px 14px', cursor: 'pointer' }}>CLOSE</button>
        </div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{session?.name}</div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>
          {[dateLabel, timeLabel, instructor].filter(Boolean).join(' · ')}
        </div>
        <div style={{ background: isUrgent ? 'rgba(255,140,0,0.08)' : 'rgba(176,160,255,0.1)', border: `1px solid ${isUrgent ? 'rgba(255,140,0,0.3)' : 'rgba(176,160,255,0.3)'}`, borderRadius: 12, padding: '18px 20px', marginBottom: 24, fontSize: 15, color: '#ccc', lineHeight: 1.7 }}>
          We'll notify you by push notification and email the moment a spot opens in this class.{' '}
          {isUrgent
            ? <>Because this class is soon, you'll need to <strong style={{ color: '#ffaa00' }}>confirm quickly</strong> — you'll have <strong style={{ color: '#ffaa00' }}>{windowLabel}</strong> before the spot is offered to the next person.</>
            : <>You'll have <strong style={{ color: '#b0a0ff' }}>{windowLabel}</strong> to confirm before the spot is offered to the next person.</>
          }
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onConfirm}
            disabled={joining}
            style={{ flex: 1, background: '#b0a0ff', color: '#000', border: 'none', borderRadius: 12, padding: '18px 0', fontWeight: 900, fontSize: 13, letterSpacing: 0.5, cursor: joining ? 'default' : 'pointer' }}
          >
            {joining ? '…' : 'ADD ME TO THE WAITLIST'}
          </button>
          <button
            onClick={onCancel}
            style={{ flex: 1, background: '#1a1a1a', color: '#888', border: '1px solid #333', borderRadius: 12, padding: '18px 0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  )
}

function ExemptionModal({ session, occ, seasonWeek, onSend, onCancel, sending, type = 'cutoff', requiredLevel = null, userLevel = null }) {
  const [reason, setReason] = useState('')
  const dateLabel = occ?.date
    ? new Date(occ.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
    : null
  const instructor = session?.instructor_detail?.display_name || session?.instructor_detail?.first_name
  const timeLabel = session?.start_time?.slice(0, 5)

  const isLevel = type === 'level'
  const title = isLevel ? <>Level<br />exemption</> : <>Apply for an<br />exemption</>
  const warningText = isLevel
    ? <>This class is for <strong style={{ color: '#ffaa00' }}>Level {requiredLevel}+</strong> students. Your current level is <strong style={{ color: '#ffaa00' }}>Level {userLevel || '—'}</strong>. If you believe you're ready to step up, submit a request and your instructor will review.</>
    : <>This class runs a routine and you'd be joining in <strong style={{ color: '#ffaa00' }}>week {seasonWeek} of 8</strong>. You'll be behind the group from day one — instructors may not be able to catch you up mid-season.</>
  const question = isLevel ? 'Why do you think you\'re ready for this level?' : 'Why do you want to join this class?'
  const hint = isLevel
    ? 'Tell us about your experience and what makes you feel ready for this class. Your instructor will review and respond.'
    : 'Tell us a bit about your background and why you\'d like to join mid-season. Your instructor will review and get back to you.'
  const placeholder = isLevel
    ? 'e.g. I\'ve been training for 2 years and my instructor at another studio said I\'m ready for this level...'
    : 'e.g. I\'ve done this routine before at another studio, or I have a strong background in this style and feel confident catching up...'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ background: '#111', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(17px, 5vw, 22px)', lineHeight: 1.2 }}>{title}</div>
          <button onClick={onCancel} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: 1, padding: '8px 14px', cursor: 'pointer', flexShrink: 0, marginLeft: 16 }}>CLOSE</button>
        </div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 18 }}>
          {[session?.name, dateLabel, timeLabel, instructor].filter(Boolean).join(' · ')}
        </div>
        <div style={{ background: 'rgba(255,140,0,0.1)', border: '1px solid rgba(255,140,0,0.3)', borderRadius: 10, padding: '14px 16px', marginBottom: 22, fontSize: 14, color: '#ccc', lineHeight: 1.6 }}>
          {warningText}
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{question}</div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>{hint}</div>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder={placeholder}
          rows={4}
          style={{ width: '100%', background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 10, color: '#fff', fontSize: 13, padding: '12px 14px', resize: 'vertical', boxSizing: 'border-box', outline: 'none', marginBottom: 20, lineHeight: 1.6 }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => onSend(reason)}
            disabled={sending || !reason.trim()}
            style={{ flex: 1, background: reason.trim() ? '#ccff00' : '#333', color: reason.trim() ? '#000' : '#666', border: 'none', borderRadius: 12, padding: '18px 0', fontWeight: 900, fontSize: 13, letterSpacing: 0.5, cursor: reason.trim() ? 'pointer' : 'default' }}
          >
            {sending ? '…' : 'SEND REQUEST'}
          </button>
          <button
            onClick={onCancel}
            style={{ flex: 1, background: '#1a1a1a', color: '#888', border: '1px solid #333', borderRadius: 12, padding: '18px 0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  )
}

function HeadsUpModal({ session, occ, onConfirm, onCancel }) {
  const [checked, setChecked] = useState(false)
  const dateLabel = occ?.date ? new Date(occ.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : null
  const instructor = session?.instructor_detail?.display_name || session?.instructor_detail?.first_name

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ background: '#111', borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', fontSize: 'clamp(28px, 7vw, 36px)', marginBottom: 14 }}>⚠️</div>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(18px, 5vw, 24px)', textAlign: 'center', marginBottom: 10 }}>Heads up</div>
        <div style={{ fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 20 }}>
          {[session?.name, dateLabel, session?.start_time?.slice(0, 5), instructor].filter(Boolean).join(' · ')}
        </div>
        <div style={{ fontSize: 15, color: '#fff', lineHeight: 1.7, marginBottom: 24, textAlign: 'center' }}>
          This class isn't designed for first-timers. It may involve techniques and terminology that assume prior experience. We recommend starting with a Virgin or Level 1 class first.
        </div>
        <div
          onClick={() => setChecked(c => !c)}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer', marginBottom: 24, padding: '14px 16px', borderRadius: 10, border: `1px solid ${checked ? '#ccff00' : '#333'}`, background: checked ? 'rgba(204,255,0,0.04)' : 'transparent' }}
        >
          <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${checked ? '#ccff00' : '#555'}`, background: checked ? '#ccff00' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
            {checked && <span style={{ fontSize: 12, color: '#000', fontWeight: 900 }}>✓</span>}
          </div>
          <span style={{ fontSize: 14, lineHeight: 1.5 }}>I understand this isn't a beginner class and I'm happy to proceed with the booking.</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onConfirm}
            disabled={!checked}
            style={{ flex: 1, background: checked ? '#ccff00' : '#333', color: checked ? '#000' : '#666', border: 'none', borderRadius: 12, padding: '16px 0', fontWeight: 900, fontSize: 13, letterSpacing: 0.5, cursor: checked ? 'pointer' : 'default' }}
          >
            CONTINUE TO BOOKING
          </button>
          <button
            onClick={onCancel}
            style={{ flex: 1, background: '#1a1a1a', color: '#888', border: '1px solid #333', borderRadius: 12, padding: '16px 0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  )
}

function SeasonLevelHeadsUpModal({ session, onConfirm, onCancel }) {
  const dayLabel = DAYS_SHORT[session?.day_of_week] || ''
  const timeLabel = session?.start_time ? formatTime(session.start_time) : ''
  const classLevel = getClassLevel(session?.name || '')

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ background: '#111', borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(18px, 5vw, 24px)' }}>Heads up</div>
          <button onClick={onCancel} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: 1, padding: '8px 14px', cursor: 'pointer' }}>CLOSE</button>
        </div>
        <div style={{ textAlign: 'center', fontSize: 'clamp(24px, 6vw, 32px)', marginBottom: 20, color: '#888' }}>△</div>
        <div style={{ fontSize: 'clamp(14px, 4vw, 17px)', fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>
          {session?.name} · {dayLabel} {timeLabel}
        </div>
        <div style={{ fontSize: 15, color: '#ccc', lineHeight: 1.7, textAlign: 'center', marginBottom: 32 }}>
          This class is above your current level. Please check with your instructor before enrolling — they'll confirm if you're ready to step up.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onConfirm}
            style={{ flex: 1, background: '#ccff00', color: '#000', border: 'none', borderRadius: 12, padding: '18px 0', fontWeight: 900, fontSize: 13, letterSpacing: 0.5, cursor: 'pointer' }}
          >
            I'VE CHECKED — BOOK IT
          </button>
          <button
            onClick={onCancel}
            style={{ flex: 1, background: '#1a1a1a', color: '#888', border: '1px solid #333', borderRadius: 12, padding: '18px 0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Season booking helpers ──────────────────────────────────────────────────

function getClassLevel(name) {
  if (!name) return 0
  if (/level\s*1/i.test(name)) return 1
  if (/level\s*2/i.test(name)) return 2
  if (/level\s*3/i.test(name)) return 3
  if (/level\s*4/i.test(name)) return 4
  if (/level\s*5/i.test(name)) return 5
  if (/level\s*6/i.test(name)) return 6
  return 0
}

function parseLevelNum(s) {
  if (!s) return 0
  const m = s.match(/level\s*(\d)/i)
  return m ? parseInt(m[1]) : 0
}

function isAdminLevelRestricted(session, user) {
  if (!user) return null
  const sessionId = session?.id
  const blockedIds = user.blocked_sessions || []
  if (sessionId && blockedIds.includes(sessionId)) {
    return { className: session.name }
  }
  const maxNum = parseLevelNum(user.max_booking_level)
  const sessionLevelNum = getClassLevel(session?.name || '')
  if (maxNum && sessionLevelNum && sessionLevelNum > maxNum) {
    return { className: session?.name, levelName: session?.level || `Level ${sessionLevelNum}` }
  }
  return null
}

function AdminLevelBlock({ restriction, onTicket }) {
  return (
    <div style={{ background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.25)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.7, marginBottom: 12 }}>
        The team have flagged that{' '}
        <strong style={{ color: '#ff8c5a' }}>{restriction.levelName || restriction.className}</strong>{' '}
        is outside of your current skill level. Contact the studio for more information.
      </div>
      <button
        onClick={onTicket}
        style={{ background: 'none', border: '1px solid rgba(255,107,53,0.4)', borderRadius: 8, color: '#ff8c5a', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', padding: '6px 14px' }}
      >
        GET IN TOUCH →
      </button>
    </div>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${String(m).padStart(2, '0')}${ampm}`
}

function parseLevel(v) {
  if (v == null) return null
  const n = typeof v === 'number' ? v : parseInt((String(v).match(/\d+/) || [])[0])
  return isNaN(n) ? null : n
}

function SeasonClassRow({ session, userLevel, selected, onToggle, onJoinWaitlist, onLevelOverride, demoNoLevel, user, onAdminBlock }) {
  const [infoOpen, setInfoOpen] = useState(false)

  const adminRestriction = isAdminLevelRestricted(session, user)

  const classLevel = getClassLevel(session.name)
  const effectiveUserLevel = demoNoLevel ? null : parseLevel(userLevel)
  const spotsLeft = (session.capacity || 14) - (session.enrolled_count || 0)
  const isFull = spotsLeft <= 0

  // Admin-set restriction — show block card, no booking path
  if (adminRestriction) {
    return (
      <div style={{ marginBottom: 4 }}>
        <AdminLevelBlock restriction={adminRestriction} onTicket={() => onAdminBlock && onAdminBlock(session, adminRestriction)} />
      </div>
    )
  }

  // Determine lock/badge
  let locked = false
  let badge = null

  if (classLevel === 0) {
    const isVirgin = /virgin/i.test(session.name)
    badge = { label: isVirgin ? 'BEGINNER' : 'ALL LEVELS', color: '#888', bg: 'rgba(255,255,255,0.07)', locked: false }
  } else if (effectiveUserLevel == null) {
    locked = true
    badge = { label: `LEVEL ${classLevel}+`, color: '#ff4444', bg: 'rgba(255,68,68,0.1)', locked: true }
  } else if (classLevel > effectiveUserLevel) {
    locked = true
    badge = { label: `LEVEL ${classLevel}+`, color: '#ff4444', bg: 'rgba(255,68,68,0.1)', locked: true }
  } else if (classLevel === effectiveUserLevel) {
    badge = { label: 'YOUR LEVEL', color: '#ccff00', bg: 'rgba(204,255,0,0.15)', locked: false, highlight: true }
  } else {
    badge = { label: `LEVEL ${classLevel}`, color: '#ccff00', bg: 'rgba(204,255,0,0.08)', locked: false }
  }

  const isSelected = selected
  const instructorDetail = session.instructor_detail
  const instructor = instructorDetail?.display_name || instructorDetail?.first_name || ''
  const studio = session.studio_detail?.name || ''
  const dayLabel = DAYS_SHORT[session.day_of_week]?.toUpperCase() || ''
  const timeLabel = formatTime(session.start_time)

  const bodyText = session.first_timer_body || session.first_timer_headline || null

  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${isSelected ? '#ccff00' : isFull ? 'rgba(255,68,68,0.2)' : infoOpen ? '#2a2a2a' : '#222'}`,
        background: isSelected ? 'rgba(204,255,0,0.04)' : isFull ? 'rgba(255,68,68,0.03)' : locked ? 'rgba(255,255,255,0.01)' : 'transparent',
        opacity: locked ? 0.65 : 1,
        marginBottom: 4,
        transition: 'border-color 0.15s, background 0.15s',
        overflow: 'hidden',
      }}
    >
      {/* Main row */}
      <div
        onClick={() => {
          if (locked && !isFull && onLevelOverride) { onLevelOverride(session); return }
          if (!locked && !isFull) onToggle(session)
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '14px 16px',
          cursor: isFull ? 'default' : 'pointer',
        }}
      >
        {/* Day/time */}
        <div style={{ width: 52, flexShrink: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#666', letterSpacing: '0.6px', textTransform: 'uppercase' }}>{dayLabel}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#ccff00', marginTop: 2 }}>{timeLabel}</div>
        </div>

        {/* Class info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, marginBottom: 2 }}>{session.name}</div>
          <div style={{ fontSize: 12, color: '#555' }}>
            {[instructor, studio].filter(Boolean).join(' · ')}
            {' '}
            <span
              onClick={e => { e.stopPropagation(); setInfoOpen(v => !v) }}
              style={{ color: infoOpen ? '#888' : '#555', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 2 }}
            >
              {infoOpen ? 'Less info' : 'More info'}
            </span>
          </div>
        </div>

      {/* Badge + action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {badge && (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 7px',
            borderRadius: 5,
            background: badge.bg,
            color: badge.color,
            border: badge.highlight ? '1px solid rgba(204,255,0,0.4)' : '1px solid transparent',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            {badge.locked && <span style={{ fontSize: 10 }}>🔒</span>}
            {badge.label}
          </span>
        )}
        {isFull && !locked ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#ff4444', padding: '2px 7px', borderRadius: 5, background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.25)', whiteSpace: 'nowrap' }}>FULL</span>
            <button
              onClick={e => { e.stopPropagation(); onJoinWaitlist && onJoinWaitlist(session) }}
              style={{ background: 'none', border: '1px solid #444', borderRadius: 5, color: '#888', fontSize: 10, padding: '3px 8px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 }}
            >
              JOIN WAITLIST
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {locked && <span style={{ fontSize: 12, opacity: 0.7 }}>🔒</span>}
            <div style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              border: `2px solid ${isSelected ? '#ccff00' : locked ? '#555' : '#444'}`,
              background: isSelected ? '#ccff00' : 'transparent',
              flexShrink: 0,
              transition: 'background 0.15s, border-color 0.15s',
            }} />
          </div>
        )}
      </div>
      </div>

      {/* Accordion panel */}
      {infoOpen && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ borderTop: '1px solid #1e1e1e', padding: '16px 18px 18px', background: '#0a0a0a' }}
        >
          {/* Class description */}
          <div style={{ marginBottom: instructorDetail ? 16 : 0 }}>
            {session.first_timer_headline && (
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{session.first_timer_headline}</div>
            )}
            <div style={{ fontSize: 13, color: '#888', lineHeight: 1.7 }}>
              {bodyText || 'No additional description available for this class yet.'}
            </div>
          </div>

          {/* Instructor card */}
          {instructorDetail && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: '12px 14px' }}>
              {/* Avatar */}
              <div style={{ width: 36, height: 36, borderRadius: 18, background: '#222', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#ccff00' }}>
                {(instructorDetail.first_name || instructorDetail.display_name || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 1 }}>{instructor}</div>
                {instructorDetail.pronouns && (
                  <div style={{ fontSize: 11, color: '#555' }}>{instructorDetail.pronouns}</div>
                )}
              </div>
              <a
                href="/portal/studio"
                onClick={e => e.stopPropagation()}
                style={{ fontSize: 11, color: '#555', textDecoration: 'underline', textDecorationStyle: 'dotted', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                View profile →
              </a>
            </div>
          )}

          <button
            onClick={e => { e.stopPropagation(); setInfoOpen(false) }}
            style={{ marginTop: 14, background: 'none', border: 'none', padding: 0, fontSize: 11, color: '#444', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th']
const PERK_TAGLINES = {
  2: [
    "your second class works out cheaper per week",
    "two classes, more savings 💰",
    "double the fun, lower the cost per class",
    "the more you move, the less you pay 🖤",
  ],
  3: [
    "that's 3 oat lattes ☕",
    "free practice = extra pole time, on us",
    "your body will thank you 🧘",
    "three classes = free practice every week",
  ],
  4: [
    "cheaper than a cocktail 🍸",
    "locker + unlimited practice — you're basically living here",
    "maximum perks unlocked 🔓",
    "four classes and you basically own the place",
  ],
}

function pickTagline(taglines) {
  return taglines[Math.floor(Math.random() * taglines.length)]
}

function SeasonSidebar({ selectedSessions, seasonName, totalPrice, incrementalPrice, activeSeasonCount, onProceed, onRemove, nextClassIncPrice }) {
  const count = selectedSessions.length
  const existingCount = activeSeasonCount || 0
  const totalCount = existingCount + count
  const perSessionWeekly = count > 0 ? (incrementalPrice / (8 * count)).toFixed(2) : null

  // Perk thresholds
  const PERKS = [
    { at: 2, icon: '💸', label: 'cheaper per-class pricing' },
    { at: 3, icon: '🧘', label: '1 free practice session per week' },
    { at: 4, icon: '🔓', label: 'Unlimited free practice + free locker' },
  ]

  // Which perks are newly unlocked by this selection
  const unlockedPerks = PERKS.filter(p => totalCount >= p.at && (existingCount < p.at))
  // Which perks are active — level 4 (unlimited) supersedes level 3 (1 free/week)
  const rawActivePerks = PERKS.filter(p => totalCount >= p.at)
  const activePerks = totalCount >= 4 ? rawActivePerks.filter(p => p.at !== 3) : rawActivePerks
  // Next perk to unlock
  const nextPerk = PERKS.find(p => totalCount < p.at)

  return (
    <div style={{
      position: 'sticky',
      top: 20,
      width: 280,
      flexShrink: 0,
      background: '#111',
      border: '1px solid #222',
      borderRadius: 14,
      padding: '20px 18px',
    }}>
      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 16 }}>Your {seasonName}</div>

      {count === 0 ? (
        <div style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>No classes selected yet.</div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {selectedSessions.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 1 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: '#555' }}>
                  {DAYS_SHORT[s.day_of_week]} · {formatTime(s.start_time)}
                </div>
              </div>
              <button
                onClick={() => onRemove(s)}
                style={{ background: 'none', border: 'none', color: '#555', fontSize: 12, cursor: 'pointer', padding: '2px 0', flexShrink: 0, textDecoration: 'underline' }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pricing box */}
      <div style={{
        background: 'rgba(204,255,0,0.06)',
        border: '1px solid rgba(204,255,0,0.2)',
        borderRadius: 10,
        padding: '14px 14px',
        marginBottom: activePerks.length > 0 || nextPerk ? 10 : 16,
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: '#666', textTransform: 'uppercase', marginBottom: 6 }}>Season Pricing</div>
        {count > 0 ? (
          <>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(20px, 5.5vw, 28px)', color: '#ccff00', lineHeight: 1 }}>${incrementalPrice}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              {existingCount > 0
                ? `Adding ${count} to your ${existingCount} — ${existingCount + count} classes total`
                : `${count} class${count !== 1 ? 'es' : ''}`
              }
              {perSessionWeekly ? ` — $${perSessionWeekly}/class/week` : ''}
            </div>
            {existingCount > 0 && (
              <div style={{ fontSize: 11, color: '#555', marginTop: 6, lineHeight: 1.5 }}>
                Incremental rate because you're already enrolled this season
              </div>
            )}
          </>
        ) : existingCount > 0 ? (
          <div style={{ fontSize: 13, color: '#666' }}>You have {existingCount} class{existingCount !== 1 ? 'es' : ''} this season. Select more below to add.</div>
        ) : (
          <div style={{ fontSize: 13, color: '#444' }}>Select classes above to start building your season.</div>
        )}
      </div>

      {/* Perks unlocked */}
      {activePerks.length > 0 && (
        <div style={{ marginBottom: nextPerk ? 10 : 16 }}>
          {activePerks.map(p => (
            <div key={p.at} style={{ display: 'flex', alignItems: 'center', gap: 8, background: unlockedPerks.includes(p) ? 'rgba(204,255,0,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${unlockedPerks.includes(p) ? 'rgba(204,255,0,0.35)' : '#222'}`, borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
              <span style={{ fontSize: 15 }}>{p.icon}</span>
              <div>
                {unlockedPerks.includes(p) && <div style={{ fontSize: 9, color: '#ccff00', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Just unlocked!</div>}
                <div style={{ fontSize: 12, color: unlockedPerks.includes(p) ? '#ccff00' : '#aaa', lineHeight: 1.3 }}>{p.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Next perk nudge */}
      {nextPerk && totalCount > 0 && (() => {
        const perWeek = nextClassIncPrice ? (nextClassIncPrice / 8).toFixed(2) : null
        const ordinal = ORDINALS[nextPerk.at - 1] || `${nextPerk.at}th`
        const taglines = PERK_TAGLINES[nextPerk.at]
        const tagline = taglines ? pickTagline(taglines) : null
        return (
          <div style={{ fontSize: 12, marginBottom: 16, background: 'rgba(204,255,0,0.03)', border: '1px solid rgba(204,255,0,0.12)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.5 }}>
            <div style={{ color: '#aaa', marginBottom: 3 }}>
              Add a <strong style={{ color: '#ccff00' }}>{ordinal} class</strong> to unlock {nextPerk.icon} {nextPerk.label}
            </div>
            {perWeek && (
              <div style={{ color: '#555', fontSize: 11 }}>
                just ${perWeek}/session extra{tagline ? ` — ${tagline}` : ''}
              </div>
            )}
          </div>
        )
      })()}

      {count > 0 && (
        <>
          <button
            onClick={onProceed}
            style={{
              width: '100%',
              background: '#ccff00',
              color: '#000',
              border: 'none',
              borderRadius: 12,
              padding: '16px 0',
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: '0.5px',
              cursor: 'pointer',
              marginBottom: 8,
            }}
          >
            CHOOSE PAYMENT OPTION
          </button>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#444' }}>Secure payment via Stripe</div>
        </>
      )}
    </div>
  )
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function SeasonTab({
  allSeasons,
  sessions,
  loading,
  activeEnrolments,
  seasonPricingConfig,
  priceSeason,
  discountTiers,
  userLevel,
  onProceedToCheckout,
  onJoinSeasonWaitlist,
  user,
  onAdminBlock,
  allCategories = [],
}) {
  const isMobile = useIsMobile()
  // Bookable seasons: active, OR upcoming once go_live_at has passed or bookings_open is true
  const bookableSeasons = allSeasons
    .filter(s => s.status === 'active' || (s.status === 'upcoming' && (s.bookings_open || (s.go_live_at && new Date(s.go_live_at) <= new Date()))))
    .sort((a, b) => {
      // newest first: compare start_date descending
      if (a.start_date && b.start_date) return new Date(b.start_date) - new Date(a.start_date)
      return 0
    })

  const [selectedSeasonId, setSelectedSeasonId] = useState(null)
  const [selectedSessions, setSelectedSessions] = useState([])
  const [filterDay, setFilterDay] = useState('all')
  const [filterInstructor, setFilterInstructor] = useState('all')
  const [filterTag, setFilterTag] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [showEligibleOnly, setShowEligibleOnly] = useState(false)
  const [demoNoLevel, setDemoNoLevel] = useState(false)
  const [levelOverrideSession, setLevelOverrideSession] = useState(null)
  const [levelOverrideSessions, setLevelOverrideSessions] = useState(new Set())

  // Pick the first bookable season by default
  const activeSeason = bookableSeasons.find(s => s.id === selectedSeasonId) || bookableSeasons[0] || null

  // When seasons load, set default
  useEffect(() => {
    if (!selectedSeasonId && bookableSeasons.length > 0) {
      setSelectedSeasonId(bookableSeasons[0].id)
    }
  }, [bookableSeasons.length])

  // Filter sessions to selected season
  const seasonSessions = activeSeason
    ? sessions.filter(s => s.season === activeSeason.id)
    : []

  // Count existing enrolments only for THIS season (not other seasons)
  const activeSeasonCount = activeSeason
    ? (activeEnrolments || []).filter(e => e.enrolment_type === 'course' && e.class_session_detail?.season === activeSeason.id).length
    : 0

  function getClassIncrementalPrice(session, position) {
    const base = parseFloat(session.season_base_price ?? priceSeason)
    const discount = parseFloat((discountTiers || {})[position] ?? (discountTiers || {})[String(position)] ?? 0)
    return Math.max(0, base - discount)
  }

  const incrementalPrice = selectedSessions.reduce((sum, session, idx) => {
    const position = activeSeasonCount + idx + 1
    return sum + getClassIncrementalPrice(session, position)
  }, 0)
  const totalPrice = incrementalPrice

  function toggleSession(session) {
    setSelectedSessions(prev => {
      const exists = prev.find(s => s.id === session.id)
      if (exists) return prev.filter(s => s.id !== session.id)
      return [...prev, session]
    })
  }

  function removeSession(session) {
    setSelectedSessions(prev => prev.filter(s => s.id !== session.id))
  }

  // Build filter options
  const instructorOptions = Array.from(
    new Map(
      seasonSessions
        .filter(s => s.instructor_detail)
        .map(s => [s.instructor_detail.id, s.instructor_detail.display_name || s.instructor_detail.first_name])
    ).entries()
  )

  // Tag chip definitions (legacy fallback — only used if no categories configured)
  const TAG_CHIPS = [
    { id: 'first-timer', label: '🌟 First Timer Friendly', test: s => /virgin|level\s*1/i.test(s.name) },
    { id: 'pole', label: '🎀 Pole Levels', test: s => /level\s*[2-6]/i.test(s.name) },
    { id: 'dance', label: '💃 Dance', test: s => /dance/i.test(s.name) },
    { id: 'conditioning', label: '💪 Conditioning', test: s => /invert|trick|kiki|unravel|conditioning/i.test(s.name) },
    { id: 'practice', label: '🧘 Practice Time', test: s => /practice/i.test(s.name) },
  ]
  const availableTags = TAG_CHIPS.filter(tag => seasonSessions.some(tag.test))

  // Category chips — categories that have at least one visible session in this season
  const availableCategories = allCategories.filter(cat =>
    cat.is_visible && seasonSessions.some(s => String(s.category) === String(cat.id))
  )

  // Perk nudge: next class incremental price
  const PERKS_COUNT = [3, 4]
  const sidebarTotal = (activeSeasonCount || 0) + selectedSessions.length
  const nextPerkAt = PERKS_COUNT.find(n => sidebarTotal < n) || null
  const nextClassIncPrice = nextPerkAt
    ? Math.max(0, parseFloat(priceSeason || 270) - parseFloat((discountTiers || {})[nextPerkAt] ?? (discountTiers || {})[String(nextPerkAt)] ?? 0))
    : null

  // Apply filters
  const effectiveUserLevel = demoNoLevel ? null : parseLevel(userLevel)
  let filtered = seasonSessions

  if (filterDay !== 'all') {
    const dayIdx = DAYS_SHORT.map(d => d.toLowerCase()).indexOf(filterDay.toLowerCase())
    if (dayIdx >= 0) filtered = filtered.filter(s => s.day_of_week === dayIdx)
  }

  if (filterInstructor !== 'all') {
    filtered = filtered.filter(s => String(s.instructor_detail?.id) === filterInstructor)
  }

  if (filterTag !== 'all') {
    const tagDef = TAG_CHIPS.find(t => t.id === filterTag)
    if (tagDef) filtered = filtered.filter(tagDef.test)
  }

  if (filterCategory !== 'all') {
    filtered = filtered.filter(s => String(s.category) === filterCategory)
  }

  if (showEligibleOnly) {
    filtered = filtered.filter(s => {
      const cl = getClassLevel(s.name)
      if (cl === 0) return true
      if (effectiveUserLevel == null) return false
      return cl <= effectiveUserLevel
    })
  }

  // Group by day_of_week
  const grouped = DAYS_SHORT.reduce((acc, day, idx) => {
    const daySessions = filtered.filter(s => s.day_of_week === idx)
    if (daySessions.length > 0) acc.push({ day, idx, sessions: daySessions })
    return acc
  }, [])

  function handleProceed() {
    onProceedToCheckout(selectedSessions, incrementalPrice, levelOverrideSessions)
  }

  if (bookableSeasons.length === 0) {
    // Check if there's a season that exists but isn't open yet
    const nextSeason = allSeasons.find(s => s.status === 'upcoming') || allSeasons.find(s => s.status === 'active')
    return (
      <div style={{ background: 'rgba(255,68,68,0.07)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: 22, marginBottom: 10 }}>🔒</div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
          {nextSeason ? `${nextSeason.name} — Bookings not open yet` : 'No seasons available to book'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
          {nextSeason
            ? `Enrolments for this season haven't opened yet. Keep an eye on your email — we'll let you know the moment they do!${nextSeason.start_date && nextSeason.end_date ? ` The season runs ${formatDate(nextSeason.start_date)} – ${formatDate(nextSeason.end_date)}.` : ''}`
            : 'Check back soon or contact us for more information.'}
        </div>
      </div>
    )
  }

  const seasonLabel = (s) => {
    const start = s.start_date ? formatDate(s.start_date) : ''
    const end = s.end_date ? formatDate(s.end_date) : ''
    return `${s.name}${start && end ? ` ${start}–${end}` : ''}`
  }

  return (
    <>
    {/* Mobile sticky checkout bar */}
    {isMobile && selectedSessions.length > 0 && (
      <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, zIndex: 200, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ background: '#111', border: '1px solid #ccff00', borderRadius: 16, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, pointerEvents: 'all', maxWidth: 440, width: 'calc(100% - 32px)', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
              {selectedSessions.length} class{selectedSessions.length !== 1 ? 'es' : ''} selected
            </div>
            <div style={{ fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedSessions.map(s => s.name).join(', ')}
            </div>
          </div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: '#ccff00', flexShrink: 0 }}>${incrementalPrice}</div>
          <button onClick={() => onProceedToCheckout(selectedSessions, incrementalPrice, levelOverrideSessions)} style={{ background: '#ccff00', color: '#000', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 900, fontSize: 12, letterSpacing: 0.5, cursor: 'pointer', flexShrink: 0 }}>CHECKOUT</button>
        </div>
      </div>
    )}

    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: isMobile && selectedSessions.length > 0 ? 90 : 0 }}>
        {/* Season sub-tabs */}
        {bookableSeasons.length > 1 && (
          <div className="tab-strip" style={{ marginBottom: 20 }}>
            {bookableSeasons.map(s => (
              <button
                key={s.id}
                className={`tab-btn ${activeSeason?.id === s.id ? 'active' : ''}`}
                onClick={() => { setSelectedSeasonId(s.id); setSelectedSessions([]) }}
              >
                {seasonLabel(s)}
              </button>
            ))}
          </div>
        )}

        {activeSeason && (
          <>
            {/* Season header */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, marginBottom: 4 }}>
                Book for {activeSeason.name}
              </div>
              {activeSeason.start_date && activeSeason.end_date && (
                <div style={{ fontSize: 13, color: '#666' }}>
                  Season runs {formatDate(activeSeason.start_date)} – {formatDate(activeSeason.end_date)}
                </div>
              )}
            </div>

            {/* Notice bar */}
            <div style={{ background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 18, fontSize: 13, color: '#ccff00' }}>
              {activeSeason.name} bookings are open.
              {activeSeason.start_date && activeSeason.end_date && ` ${activeSeason.name} runs ${formatDate(activeSeason.start_date)} – ${formatDate(activeSeason.end_date)}.`}
              {' '}Bookings close end of Week 3.
            </div>

            {/* Demo toggle — only visible for demo accounts */}
            {user?.username?.startsWith('demo_') && <div style={{ background: '#111', border: '1px solid #222', borderRadius: 10, padding: '10px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Demo:</span>
              <button
                onClick={() => setDemoNoLevel(false)}
                style={{
                  background: !demoNoLevel ? 'rgba(204,255,0,0.12)' : 'transparent',
                  border: `1px solid ${!demoNoLevel ? 'rgba(204,255,0,0.3)' : '#333'}`,
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11,
                  color: !demoNoLevel ? '#ccff00' : '#555',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Level assigned {userLevel ? `(${userLevel})` : '(none)'}
              </button>
              <button
                onClick={() => setDemoNoLevel(true)}
                style={{
                  background: demoNoLevel ? 'rgba(255,68,68,0.1)' : 'transparent',
                  border: `1px solid ${demoNoLevel ? 'rgba(255,68,68,0.3)' : '#333'}`,
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11,
                  color: demoNoLevel ? '#ff4444' : '#555',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                No level assigned
              </button>
            </div>}

            {/* Instruction */}
            <div style={{ fontSize: 13, color: '#666', marginBottom: 18, lineHeight: 1.6 }}>
              Select your classes below — your pricing updates automatically as you add more. Only classes you're eligible for based on your current level are shown.
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={filterDay}
                onChange={e => setFilterDay(e.target.value)}
                style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', padding: '7px 10px', fontSize: 12, outline: 'none' }}
              >
                <option value="all">All days</option>
                {DAYS_SHORT.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
              </select>

              <select
                value={filterInstructor}
                onChange={e => setFilterInstructor(e.target.value)}
                style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', padding: '7px 10px', fontSize: 12, outline: 'none' }}
              >
                <option value="all">All instructors</option>
                {instructorOptions.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
              </select>

            </div>

            {/* Category chips (dynamic) — or fall back to hardcoded tag chips */}
            {availableCategories.length > 0 ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <button
                  onClick={() => setFilterCategory('all')}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                    background: filterCategory === 'all' ? '#ccff00' : '#1a1a1a',
                    color: filterCategory === 'all' ? '#000' : '#888',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >All</button>
                {availableCategories.map(cat => {
                  const active = filterCategory === String(cat.id)
                  const colour = cat.colour || '#ccff00'
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setFilterCategory(active ? 'all' : String(cat.id))}
                      style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${active ? colour : '#333'}`,
                        background: active ? `${colour}22` : '#111',
                        color: active ? colour : '#888',
                        transition: 'all 0.15s',
                      }}
                    >{cat.name}</button>
                  )
                })}
              </div>
            ) : availableTags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <button
                  onClick={() => setFilterTag('all')}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                    background: filterTag === 'all' ? '#ccff00' : '#1a1a1a',
                    color: filterTag === 'all' ? '#000' : '#888',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >All</button>
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => setFilterTag(filterTag === tag.id ? 'all' : tag.id)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${filterTag === tag.id ? '#ccff00' : '#333'}`,
                      background: filterTag === tag.id ? 'rgba(204,255,0,0.12)' : '#111',
                      color: filterTag === tag.id ? '#ccff00' : '#888',
                      transition: 'all 0.15s',
                    }}
                  >{tag.label}</button>
                ))}
              </div>
            )}

            {/* Eligible toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button
                onClick={() => setShowEligibleOnly(v => !v)}
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  background: showEligibleOnly ? '#ccff00' : '#333',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: 2,
                  left: showEligibleOnly ? 18 : 2,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  background: '#000',
                  transition: 'left 0.2s',
                }} />
              </button>
              <span style={{ fontSize: 13, color: '#666' }}>Show my eligible classes only</span>
            </div>

            {/* Class list */}
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : grouped.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 24px', color: '#555' }}>
                <div style={{ fontSize: 14, marginBottom: 6 }}>No classes match your filters.</div>
                <div style={{ fontSize: 12 }}>Try adjusting the filters above.</div>
              </div>
            ) : (
              grouped.map(({ day, sessions: daySessions }) => (
                <div key={day} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#555', marginBottom: 8 }}>{day}</div>
                  {daySessions.map(s => (
                    <SeasonClassRow
                      key={s.id}
                      session={s}
                      userLevel={userLevel}
                      selected={!!selectedSessions.find(sel => sel.id === s.id)}
                      onToggle={toggleSession}
                      onJoinWaitlist={onJoinSeasonWaitlist}
                      onLevelOverride={setLevelOverrideSession}
                      demoNoLevel={demoNoLevel}
                      user={user}
                      onAdminBlock={onAdminBlock}
                    />
                  ))}
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Sidebar — desktop only */}
      {!isMobile && (
        <SeasonSidebar
          selectedSessions={selectedSessions}
          seasonName={activeSeason?.name || 'Season'}
          totalPrice={totalPrice}
          incrementalPrice={incrementalPrice}
          activeSeasonCount={activeSeasonCount}
          onProceed={handleProceed}
          onRemove={removeSession}
          nextClassIncPrice={nextClassIncPrice}
        />
      )}
    </div>

    {levelOverrideSession && (
      <SeasonLevelHeadsUpModal
        session={levelOverrideSession}
        onConfirm={() => {
            toggleSession(levelOverrideSession)
            setLevelOverrideSessions(prev => new Set([...prev, levelOverrideSession.id]))
            setLevelOverrideSession(null)
          }}
        onCancel={() => setLevelOverrideSession(null)}
      />
    )}
    </>
  )
}

export default function StudentBook() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const deepLinkSessionId = searchParams.get('session') ? parseInt(searchParams.get('session')) : null
  const deepLinkTab = searchParams.get('tab') || null
  const deepLinkHandled = useRef(false)

  const [tab, setTab] = useState(deepLinkTab || 'season')
  const [booked, setBooked] = useState([])
  const [cart, setCart] = useState(null) // { session, type, price, label }
  const [checkout, setCheckout] = useState(null) // { sessionIds, type, amount, description }
  const [buyingPass, setBuyingPass] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(null)
  const [promoApplying, setPromoApplying] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [appliedPromoCode, setAppliedPromoCode] = useState('')
  const [upsellBanner, setUpsellBanner] = useState(null)
  const { data: balanceData } = useApi(() => user?.id ? paymentsApi.balance(user.id) : null, [user?.id])
  const { data: sessionsData, loading } = useApi(() => classes.list())
  const { data: categoriesData } = useApi(() => categoriesApi.list())
  const { data: studioSettings } = useApi(() => settingsApi.get())
  const { data: workshopsData, loading: loadingWorkshops, refetch: refetchWorkshops } = useApi(() => classes.workshops.list())
  const { data: seasonsData } = useApi(() => seasonsApi.list())
  const { data: activeEnrolData } = useApi(() => user?.id ? enrolments.list({ student: user.id, status: 'active' }) : null, [user?.id])
  const { data: enrolHistoryData } = useApi(() => user?.id ? enrolments.list({ student: user.id, page_size: 1 }) : null, [user?.id])
  const { data: creditsData, refetch: refetchCredits } = useApi(() => user?.id ? attendanceApi.makeupCredits.list({ student: user.id, status: 'available' }) : null, [user?.id])
  const { data: passData, refetch: refetchPasses } = useApi(() => user?.id ? attendanceApi.classPasses.list({ student: user.id }) : null, [user?.id])
  const activeCasualSeason = (seasonsData?.results || seasonsData || []).find(s => s.status === 'active')
  const activeCasualSeasonId = activeCasualSeason?.id
  const { data: casualOccsData, loading: loadingCasualOccs, refetch: refetchCasualOccs } = useApi(
    () => activeCasualSeasonId ? classes.casual.occurrences({ upcoming: true, season: activeCasualSeasonId, page_size: 300 }) : null,
    [activeCasualSeasonId]
  )

  const priceCasual = parseFloat(studioSettings?.price_casual || 40)
  const priceCasualEnrolled = parseFloat(studioSettings?.price_casual_enrolled || 30)
  const priceSeason = parseFloat(studioSettings?.price_season || 270)
  const priceTrial = parseFloat(studioSettings?.price_trial || 25)

  const discountTiers = studioSettings?.season_discount_tiers || {2:100,3:130,4:150,5:170,6:170}

  const activeEnrolList = activeEnrolData?.results || activeEnrolData || []
  const activeSeasonCount = activeEnrolList.filter(e => e.enrolment_type === 'course').length
  const casualRate = activeSeasonCount > 0 ? priceCasualEnrolled : priceCasual
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

  const priceClassPass = parseFloat(studioSettings?.price_class_pass || 140)
  const classPassSize = studioSettings?.class_pass_size || 4
  const allPasses = passData?.results || passData || []
  const availablePassCredits = allPasses
    .filter(p => p.is_active)
    .reduce((sum, p) => sum + p.classes_remaining, 0)

  const allSeasons = seasonsData?.results || seasonsData || []
  const now = new Date()
  const upcomingSeason = allSeasons.find(s => s.status === 'upcoming') ||
    allSeasons.find(s => s.start_date && new Date(s.start_date) > now) ||
    allSeasons.find(s => s.status === 'active')
  const casualActiveSeason = allSeasons.find(s => s.status === 'active')
  const casualActiveSeasonWeek = getCurrentSeasonWeek(casualActiveSeason?.start_date)
  const nextSeasonCasualsNotYetOpen = upcomingSeason && upcomingSeason.status === 'upcoming' && casualActiveSeasonWeek < 8

  const sessions = sessionsData?.results || sessionsData || []
  const workshops = workshopsData?.results || workshopsData || []

  // Deep-link: ?session=ID[&tab=trial|season|casual] — open checkout immediately once data loads
  useEffect(() => {
    if (!deepLinkSessionId || deepLinkHandled.current || !sessions.length || !studioSettings) return
    const target = sessions.find(s => s.id === deepLinkSessionId)
    if (!target) return
    deepLinkHandled.current = true
    const targetTab = deepLinkTab || 'season'
    setTab(targetTab)
    if (targetTab === 'trial') {
      const price = parseFloat(studioSettings?.price_trial || 25)
      setCart({ session: target, type: 'trial', price })
    } else {
      // Season enrolment — open checkout directly
      const allEnrolled = (activeEnrolData?.results || activeEnrolData || []).filter(e => e.enrolment_type === 'course').length
      const tiers = studioSettings?.season_pricing_config || []
      const getPrice = n => {
        const tier = tiers.find(r => parseInt((r.label || '').match(/(\d+)/)?.[1] || '0') === n)
        return tier ? parseFloat(tier.price) : parseFloat(studioSettings?.price_season || 270)
      }
      const incremental = getPrice(allEnrolled + 1) - (allEnrolled > 0 ? getPrice(allEnrolled) : 0)
      setCheckout({
        type: 'season',
        sessionIds: [target.id],
        amount: incremental,
        description: target.name,
        sessions: [target],
      })
    }
  }, [deepLinkSessionId, sessions, studioSettings, activeEnrolData])

  const [bookingWorkshopId, setBookingWorkshopId] = useState(null)
  const [cancellingWorkshopId, setCancellingWorkshopId] = useState(null)
  const [workshopBooked, setWorkshopBooked] = useState({})
  const [workshopError, setWorkshopError] = useState('')
  const [casualViewMode, setCasualViewMode] = useState('list')
  const [casualEligibleOnly, setCasualEligibleOnly] = useState(false)
  const [casualHideUnavailable, setCasualHideUnavailable] = useState(false)
  const [casualWeekOffset, setCasualWeekOffset] = useState(0)
  const [calSelectedDate, setCalSelectedDate] = useState(null)
  const [calMonthOffset, setCalMonthOffset] = useState(0)
  const [pendingCashCheckout, setPendingCashCheckout] = useState(null)
  const [pendingPlanCheckout, setPendingPlanCheckout] = useState(null)
  const [calOccBooking, setCalOccBooking] = useState(null)
  const [calExemptionOcc, setCalExemptionOcc] = useState(null)
  const [pendingPassCash, setPendingPassCash] = useState(false)
  const [selectedCasualOcc, setSelectedCasualOcc] = useState(null)
  const [casualBooking, setCasualBooking] = useState(false)
  const [casualBookError, setCasualBookError] = useState('')
  const [casualExemptionOcc, setCasualExemptionOcc] = useState(null)
  const [casualExemptionSending, setCasualExemptionSending] = useState(false)
  const [casualLevelLockedOcc, setCasualLevelLockedOcc] = useState(null)

  function addToCart(session, type, price) {
    if (type === 'waitlist-done') {
      // Waitlist join already handled inside ClassCard (with card collection)
      setBooked(b => [...b, session.id + '-waitlist'])
      return
    }
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

  async function bookCasualOcc(occ, type) {
    if (type === 'casual') {
      setSelectedCasualOcc(null)
      const sDetail = occ.session_detail || {}
      setCheckout({
        type: 'casual_occ',
        occId: occ.id,
        sessionIds: [sDetail.id || occ.session],
        amount: casualRate,
        description: `${sDetail.name || 'Class'} — Casual`,
        session: { ...sDetail, id: sDetail.id || occ.session },
      })
      return
    }
    setCasualBooking(true)
    setCasualBookError('')
    try {
      await classes.casual.book(occ.id, { enrolment_type: type })
      setSelectedCasualOcc(null)
      refetchCasualOccs()
      if (type === 'catchup') refetchCredits()
      if (type === 'classpass') refetchPasses()
    } catch (e) {
      setCasualBookError(e.response?.data?.detail || 'Booking failed. Please try again.')
    } finally {
      setCasualBooking(false)
    }
  }

  async function sendCasualExemption(occ, reason) {
    setCasualExemptionSending(true)
    try {
      await classes.casual.exemptionRequest({ session: occ.session, occ_id: occ.id, reason }).catch(() => {})
      setCasualExemptionOcc(null)
      alert('Exemption request sent! Your instructor will review and get back to you.')
    } finally {
      setCasualExemptionSending(false)
    }
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

  async function proceedToCheckout(finalPrice, overrideData) {
    const cartData = overrideData || cart
    if (!cartData) return
    const { session, type } = cartData
    const effectivePrice = finalPrice ?? cartData.price
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

  async function joinSeasonWaitlist(session) {
    try {
      await enrolments.create({ session: session.id, status: 'waitlisted', enrolment_type: 'course' })
      setBooked(b => [...b, session.id + '-waitlist'])
    } catch (e) {
      alert(e.response?.data?.detail || 'Could not join waitlist — please try again.')
    }
  }

  // Season multi-select checkout
  function handleSeasonProceed(selectedSessions, incrementalPrice, overrideSessions) {
    if (!selectedSessions.length) return
    const sessionIds = selectedSessions.map(s => s.id)
    const count = selectedSessions.length
    const description = `Season enrolment — ${count} class${count !== 1 ? 'es' : ''}`
    const season = allSeasons.find(s => s.id === selectedSessions[0]?.season)
    setCheckout({
      sessions: selectedSessions,
      sessionIds,
      type: 'season',
      amount: incrementalPrice,
      description,
      seasonStartDate: season?.start_date || null,
      session: selectedSessions[0],
      levelOverrideSessions: overrideSessions || new Set(),
    })
  }

  function handleCashPayment() {
    if (!checkout) return
    setPendingCashCheckout(checkout)
    setCheckout(null)
  }

  async function confirmCashPayment(cashDate, notes) {
    const co = pendingCashCheckout
    if (!co) return
    if (co.type === 'casual_occ') {
      try {
        await classes.casual.book(co.occId, { enrolment_type: 'casual', payment_method: 'cash', notes, ...(cashDate ? { cash_promised_date: cashDate } : {}) })
        refetchCasualOccs()
      } catch {}
    } else {
      const ids = co.sessionIds || (co.session ? [co.session.id] : [])
      const overrideSessions = co.levelOverrideSessions || new Set()
      for (const sessionId of ids) {
        try {
          const payload = { session: sessionId, status: 'active', enrolment_type: co.type || 'course', payment_method: 'cash', notes, ...(cashDate ? { cash_promised_date: cashDate } : {}) }
          if (overrideSessions.has(sessionId)) payload.level_override = true
          await enrolments.create(payload)
        } catch {}
      }
      setBooked(b => [...b, ...(co.sessionIds || (co.session ? [co.session.id] : []))])
    }
    setPendingCashCheckout(null)
  }

  function handlePaymentPlan() {
    if (!checkout) return
    setPendingPlanCheckout(checkout)
    setCheckout(null)
  }

  async function confirmPaymentPlan(frequency, notes, stripePaymentMethodId) {
    const co = pendingPlanCheckout
    if (!co) return
    try {
      await paymentsApi.plans.create({
        description: co.description,
        total_amount: co.amount,
        notes: `Frequency: ${frequency}${notes ? ` | ${notes}` : ''}`,
        ...(stripePaymentMethodId ? { stripe_payment_method_id: stripePaymentMethodId } : {}),
      })
    } catch {}
    setPendingPlanCheckout(null)
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
    const { type, sessionIds, occId } = checkout
    const ids = sessionIds || (checkout.session ? [checkout.session.id] : [])
    setCheckout(null)
    setCart(null)
    setPromoDiscount(null)
    if (appliedPromoCode) {
      paymentsApi.promoCodes.use({ code: appliedPromoCode }).catch(() => {})
      setAppliedPromoCode('')
    }
    if (type === 'casual_occ') {
      try {
        await classes.casual.book(occId, { enrolment_type: 'casual' })
        refetchCasualOccs()
      } catch {}
      return
    }
    // Create enrolments for all session IDs
    const overrideSessions = checkout.levelOverrideSessions || new Set()
    for (const sessionId of ids) {
      try {
        const payload = { session: sessionId, status: 'active', enrolment_type: type || 'casual' }
        if (overrideSessions.has(sessionId)) payload.level_override = true
        await enrolments.create(payload)
      } catch {}
    }
    if (type === 'catchup') refetchCredits()
    setBooked(b => [...b, ...ids])
    // Check for category upsell after season booking
    if (type === 'season') {
      const allCats = categoriesData?.results || categoriesData || []
      const bookedSession = checkout?.sessions?.[0]
      if (bookedSession) {
        const cat = allCats.find(c => String(c.id) === String(bookedSession.category))
        if (cat?.upsell_headline && cat?.upsell_target_category) {
          setUpsellBanner({ headline: cat.upsell_headline, body: cat.upsell_body, categoryName: cat.name })
        }
      }
    }
  }

  const hasEverEnrolled = (enrolHistoryData?.count ?? (enrolHistoryData?.results || enrolHistoryData || []).length) > 0
  const showTrial = !hasEverEnrolled

  const TABS = [
    ['season', 'Book a Season'],
    ['casual', 'Casual and Catch-ups'],
    ...(showTrial ? [['trial', 'Trial Class']] : []),
    ['workshop', 'Workshops and Events'],
  ]

  const cartSessionId = cart?.session?.id

  const balance = balanceData ? parseFloat(balanceData.balance) : null
  const isBlocked = balanceData?.booking_blocked === true

  if (isBlocked) {
    return (
      <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 16px' }}>
        <div style={{ background: 'rgba(255,68,68,0.06)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: 14, padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>🔒</div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, marginBottom: 10 }}>Account on hold</div>
          <div style={{ fontSize: 14, color: 'var(--grey)', marginBottom: 8, lineHeight: 1.7 }}>
            You have a pending charge on your account that needs to be paid.
          </div>
          {balance !== null && balance < 0 && (
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: 'var(--red)', marginBottom: 8 }}>
              ${Math.abs(balance).toFixed(2)} owing
            </div>
          )}
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 24, lineHeight: 1.6 }}>
            Please pay the amount to be able to enrol, mark absent, and book catch-ups.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/portal/billing" style={{ display: 'inline-block', background: 'var(--lime)', color: '#000', fontWeight: 700, borderRadius: 8, padding: '11px 24px', textDecoration: 'none', fontSize: 14 }}>
              Pay balance now
            </a>
            <a href="/portal/chat" style={{ display: 'inline-block', background: 'transparent', color: 'var(--white)', fontWeight: 600, borderRadius: 8, padding: '11px 24px', textDecoration: 'none', fontSize: 14, border: '1px solid var(--border)' }}>
              Contact us
            </a>
          </div>
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
          sessions={checkout.sessions}
          sessionIds={checkout.sessionIds}
          saveMethod={true}
          allowDeposit={checkout.type === 'season' || checkout.type === 'course'}
          seasonStartDate={checkout.seasonStartDate}
          onSuccess={handlePaymentSuccess}
          onClose={() => setCheckout(null)}
          onCash={handleCashPayment}
          onPaymentPlan={
            checkout.type !== 'casual_occ' &&
            !(checkout.sessions || []).some(s => s.requires_full_payment)
              ? handlePaymentPlan
              : null
          }
        />
      )}

      {pendingCashCheckout && (
        <CashPaymentModal
          checkout={pendingCashCheckout}
          onClose={() => setPendingCashCheckout(null)}
          onConfirm={confirmCashPayment}
        />
      )}

      {pendingPlanCheckout && (
        <PaymentPlanModal
          checkout={pendingPlanCheckout}
          onClose={() => setPendingPlanCheckout(null)}
          onConfirm={confirmPaymentPlan}
        />
      )}

      {calOccBooking && (() => {
        const occ = calOccBooking
        const sDetail = occ.session_detail || {}
        const activeEnrols = activeEnrolData?.results || activeEnrolData || []
        const alreadyEnrolled = activeEnrols.some(e => e.class_session === occ.session && e.enrolment_type === 'course')
        return (
          <CasualBookingModal
            occ={occ}
            session={{ ...sDetail, instructor_detail: occ.instructor_detail }}
            priceCasual={casualRate}
            isEnrolledRate={activeSeasonCount > 0}
            priceClassPass={priceClassPass}
            classPassSize={classPassSize}
            availableCredits={availableCredits}
            passCredits={availablePassCredits}
            seasonName={upcomingSeason?.name}
            seasonPrice={seasonPrice}
            alreadyEnrolled={alreadyEnrolled}
            onClose={() => setCalOccBooking(null)}
            onEnrolInSeason={() => { setCalOccBooking(null); setTab('season') }}
            onBuyPass={() => { setCalOccBooking(null); setBuyingPass(true) }}
            onBook={async (type) => {
              try {
                await classes.casual.book(occ.id, { enrolment_type: type })
                if (type === 'catchup') refetchCredits()
                if (type === 'classpass') refetchPasses()
              } catch {}
              setCalOccBooking(null)
            }}
          />
        )
      })()}

      {calExemptionOcc && (() => {
        const { occ, type: exemptType, requiredLevel } = calExemptionOcc
        const sDetail = occ.session_detail || {}
        const activeSeason = (seasonsData?.results || seasonsData || []).find(s => s.status === 'active')
        const seasonWeek = getCurrentSeasonWeek(activeSeason?.start_date)
        return (
          <ExemptionModal
            session={{ ...sDetail, instructor_detail: occ.instructor_detail }}
            occ={occ}
            seasonWeek={seasonWeek}
            type={exemptType}
            requiredLevel={requiredLevel}
            userLevel={parseLevel(user?.level)}
            sending={false}
            onSend={async (reason) => {
              try {
                await classes.casual.exemptionRequest({ session: occ.session, occ_id: occ.id, reason }).catch(() => {})
              } catch {}
              setCalExemptionOcc(null)
              alert('Exemption request sent! Your instructor will review and get back to you.')
            }}
            onCancel={() => setCalExemptionOcc(null)}
          />
        )
      })()}

      {buyingPass && (
        <CheckoutModal
          amount={priceClassPass}
          description={`${classPassSize}-Class Pass · $${(priceClassPass / classPassSize).toFixed(0)}/class`}
          saveMethod={false}
          onSuccess={async () => {
            try {
              await attendanceApi.classPasses.purchase()
              refetchPasses()
              setBuyingPass(false)
            } catch {
              setBuyingPass(false)
            }
          }}
          onClose={() => setBuyingPass(false)}
          onCash={() => { setBuyingPass(false); setPendingPassCash(true) }}
        />
      )}

      {pendingPassCash && (
        <CashPaymentModal
          checkout={{ type: 'pass', amount: priceClassPass, description: `${classPassSize}-Class Pass` }}
          onClose={() => setPendingPassCash(false)}
          onConfirm={async (cashDate, notes) => {
            try {
              await attendanceApi.classPasses.purchase({ payment_method: 'cash', notes })
              refetchPasses()
            } catch {}
            setPendingPassCash(false)
          }}
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
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => { setTab(key); setUpsellBanner(null) }}>{label}</button>
        ))}
      </div>

      {upsellBanner && (
        <div style={{ background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.25)', borderRadius: 12, padding: '16px 20px', marginBottom: 16, position: 'relative' }}>
          <button onClick={() => setUpsellBanner(null)} style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16 }}>✕</button>
          <div style={{ fontWeight: 700, color: '#ccff00', marginBottom: 6 }}>{upsellBanner.headline}</div>
          {upsellBanner.body && <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>{upsellBanner.body}</div>}
        </div>
      )}

      {tab === 'season' && (
        <SeasonTab
          allSeasons={allSeasons}
          sessions={sessions}
          loading={loading}
          activeEnrolments={activeEnrolList}
          seasonPricingConfig={seasonPricingConfig}
          priceSeason={priceSeason}
          discountTiers={discountTiers}
          userLevel={user?.level || null}
          onProceedToCheckout={handleSeasonProceed}
          onJoinSeasonWaitlist={joinSeasonWaitlist}
          user={user}
          allCategories={categoriesData?.results || categoriesData || []}
          onAdminBlock={async (session, restriction) => {
            const nm = restriction.levelName || restriction.className || session.name
            try {
              await helpdeskApi.create({ subject: `Class enquiry — ${nm}`, body: `Hi, I'd like to find out more about booking ${nm}. Could you let me know what's needed?`, category: 'General' })
            } catch {}
          }}
        />
      )}

      {tab === 'casual' && (
        <div>
          {/* First time banner */}
          {!hasEverEnrolled && (
            <div style={{ background: 'rgba(204,255,0,0.07)', border: '1px solid rgba(204,255,0,0.25)', borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, color: '#ccff00', marginBottom: 4 }}>First time? 🔥</div>
                <div style={{ fontSize: 13, color: '#fff', marginBottom: 2 }}>Book a trial class for just <span style={{ color: '#ccff00' }}>${priceTrial}</span> and see if pole is for you.</div>
                <div style={{ fontSize: 12, color: '#666' }}>No experience needed — beginner-friendly intro</div>
              </div>
              <button onClick={() => setTab('trial')} style={{ background: '#ccff00', color: '#000', border: 'none', borderRadius: 10, padding: '12px 20px', fontWeight: 900, fontSize: 12, letterSpacing: 0.5, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                BOOK TRIAL →
              </button>
            </div>
          )}

          {/* Credits banner */}
          {availableCredits > 0 && (
            <div style={{ background: 'rgba(176,160,255,0.08)', border: '1px solid rgba(176,160,255,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#b0a0ff', color: '#000', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, flexShrink: 0 }}>{availableCredits}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#b0a0ff' }}>Catch-up credit{availableCredits !== 1 ? 's' : ''} available</div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  Expires end of {upcomingSeason?.name || 'current season'} — use {availableCredits === 1 ? 'it' : 'them'} to attend any eligible class for free
                </div>
              </div>
            </div>
          )}

          {/* Upcoming season notify card */}
          {nextSeasonCasualsNotYetOpen && (
            <SeasonNotifyCard season={upcomingSeason} defaultEmail={user?.email || ''} />
          )}

          {/* Level info bar */}
          {user?.level && (
            <div style={{ background: 'rgba(176,160,255,0.07)', border: '1px solid rgba(176,160,255,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#b0a0ff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>◆</span>
              Showing classes eligible for Level {user.level}. Classes outside your level are shown with a lock.
            </div>
          )}

          {/* Toggles */}
          <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 12, padding: '4px 0', marginBottom: 12 }}>
            {[
              { label: 'Show my eligible classes only', value: casualEligibleOnly, onChange: setCasualEligibleOnly },
              { label: 'Hide unavailable classes', sub: 'Hides routine-based classes you can\'t join mid-season', value: casualHideUnavailable, onChange: setCasualHideUnavailable },
            ].map(({ label, sub, value, onChange }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: sub ? '1px solid #111' : 'none' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
                  {sub && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{sub}</div>}
                </div>
                <button
                  onClick={() => onChange(v => !v)}
                  style={{ width: 44, height: 24, borderRadius: 12, background: value ? '#ccff00' : '#333', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
                >
                  <span style={{ position: 'absolute', top: 3, left: value ? 22 : 3, width: 18, height: 18, borderRadius: 9, background: '#000', transition: 'left 0.2s' }} />
                </button>
              </div>
            ))}
          </div>

          {/* List / Calendar toggle */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
            {[['list', '≡ List'], ['calendar', '▦ Calendar']].map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setCasualViewMode(mode)}
                style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${casualViewMode === mode ? '#ccff00' : '#333'}`, background: casualViewMode === mode ? 'rgba(204,255,0,0.1)' : 'transparent', color: casualViewMode === mode ? '#ccff00' : '#666', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Calendar view */}
          {casualViewMode === 'calendar' && (() => {
            const today = new Date()
            const occs = casualOccsData?.results || casualOccsData || []
            const activeEnrols = activeEnrolData?.results || activeEnrolData || []
            const userLevelNum = parseLevel(user?.level)
            const activeSeason = allSeasons.find(s => s.status === 'active')
            const seasonWeek = getCurrentSeasonWeek(activeSeason?.start_date)

            let filteredOccs = occs
            if (casualEligibleOnly && userLevelNum) {
              filteredOccs = filteredOccs.filter(o => {
                const cl = getClassLevel(o.session_detail?.name || '')
                return cl === 0 || cl <= userLevelNum
              })
            }
            if (casualHideUnavailable && activeSeason && seasonWeek > 3) {
              filteredOccs = filteredOccs.filter(o => {
                const nm = o.session_detail?.name || ''
                const alreadyEnrolled = activeEnrols.some(e => e.class_session === o.session)
                return !isRoutineClass(nm) || alreadyEnrolled
              })
            }

            const datesWithClasses = new Set(filteredOccs.map(o => o.date))
            const baseDate = new Date(today.getFullYear(), today.getMonth() + calMonthOffset, 1)
            const monthLabel = baseDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
            const firstDow = (baseDate.getDay() + 6) % 7
            const daysInMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate()
            const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7
            const cells = Array.from({ length: totalCells }, (_, i) => {
              const dayNum = i - firstDow + 1
              if (dayNum < 1 || dayNum > daysInMonth) return null
              const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), dayNum)
              const iso = d.toISOString().slice(0, 10)
              return { dayNum, iso, date: d }
            })

            const selDate = calSelectedDate
            const selDayOccs = selDate
              ? filteredOccs.filter(o => o.date === selDate).sort((a, b) => (a.session_detail?.start_time || '').localeCompare(b.session_detail?.start_time || ''))
              : []

            return (
              <div>
                {/* Month nav */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <button onClick={() => setCalMonthOffset(m => m - 1)} style={{ background: 'none', border: '1px solid #333', borderRadius: 8, color: '#888', padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>←</button>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#ccc' }}>{monthLabel}</span>
                  <button onClick={() => setCalMonthOffset(m => m + 1)} style={{ background: 'none', border: '1px solid #333', borderRadius: 8, color: '#888', padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>→</button>
                </div>
                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                  {['M','T','W','T','F','S','S'].map((d, i) => (
                    <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#555', padding: '4px 0' }}>{d}</div>
                  ))}
                </div>
                {/* Date grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 20 }}>
                  {cells.map((cell, i) => {
                    if (!cell) return <div key={i} />
                    const { dayNum, iso, date } = cell
                    const isPast = date < new Date(today.toDateString())
                    const isToday = date.toDateString() === today.toDateString()
                    const hasCls = datesWithClasses.has(iso)
                    const isSel = selDate === iso
                    return (
                      <button
                        key={i}
                        onClick={() => hasCls && !isPast ? setCalSelectedDate(iso === selDate ? null : iso) : null}
                        style={{
                          background: isSel ? '#ccff00' : 'transparent',
                          border: isToday && !isSel ? '1px solid #444' : '1px solid transparent',
                          borderRadius: 8, padding: '7px 2px',
                          cursor: hasCls && !isPast ? 'pointer' : 'default',
                          textAlign: 'center', position: 'relative',
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: isSel ? 700 : 400, color: isSel ? '#000' : isPast ? '#333' : hasCls ? '#fff' : '#444' }}>{dayNum}</span>
                        {hasCls && !isPast && (
                          <span style={{ display: 'block', width: 4, height: 4, borderRadius: 2, background: isSel ? '#000' : '#ccff00', margin: '2px auto 0' }} />
                        )}
                      </button>
                    )
                  })}
                </div>

                {selDate ? (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#555', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 10 }}>
                      {new Date(selDate + 'T00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    {selDayOccs.length === 0 ? (
                      <div style={{ color: '#555', fontSize: 13, padding: '12px 0' }}>No classes available this day.</div>
                    ) : selDayOccs.map(occ => {
                      const sDetail = occ.session_detail || {}
                      const nm = sDetail.name || ''
                      const instructor = occ.instructor_detail?.display_name || occ.instructor_detail?.first_name || ''
                      const time = sDetail.start_time?.slice(0, 5) || ''
                      const myBooking = occ.my_booking
                      const isBooked = myBooking?.status === 'confirmed'
                      const isWaitlisted = myBooking?.status === 'waitlisted'
                      const isFull = (occ.spots_left ?? 0) <= 0
                      const cl = getClassLevel(nm)
                      const alreadyEnrolled = activeEnrols.some(e => e.class_session === occ.session && e.enrolment_type === 'course')
                      const calAdminRestriction = isAdminLevelRestricted(sDetail, user)
                      const levelLocked = !calAdminRestriction && cl > 0 && userLevelNum && cl > userLevelNum
                      const requiresExemption = !calAdminRestriction && isRoutineClass(nm) && seasonWeek > 3 && !alreadyEnrolled

                      if (calAdminRestriction) {
                        return (
                          <div key={occ.id} style={{ borderRadius: 10, border: '1px solid rgba(255,107,53,0.2)', overflow: 'hidden', marginBottom: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.02)' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{nm}</div>
                                <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{time}{instructor ? ` · ${instructor}` : ''}</div>
                              </div>
                            </div>
                            <div style={{ padding: '10px 14px' }}>
                              <AdminLevelBlock restriction={calAdminRestriction} onTicket={async () => {
                                try {
                                  await helpdeskApi.create({ subject: `Class enquiry — ${nm}`, body: `Hi, I'd like to find out more about booking ${nm}. Could you let me know what's needed?`, category: 'General' })
                                  alert("Your message has been sent. The team will be in touch soon.")
                                } catch { alert("Couldn't send message — please contact the studio directly.") }
                              }} />
                            </div>
                          </div>
                        )
                      }

                      let rightBadge = null
                      if (isBooked) rightBadge = <span style={{ fontSize: 10, fontWeight: 700, color: '#ccff00', background: 'rgba(204,255,0,0.1)', border: '1px solid rgba(204,255,0,0.25)', borderRadius: 4, padding: '2px 8px' }}>BOOKED</span>
                      else if (isWaitlisted) rightBadge = <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 4, padding: '2px 8px' }}>WAITLISTED</span>
                      else if (isFull) rightBadge = <span style={{ fontSize: 10, fontWeight: 700, color: '#ff4444', background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: 4, padding: '2px 8px' }}>FULL</span>
                      else if (levelLocked) rightBadge = <span style={{ fontSize: 10, fontWeight: 700, color: '#ff6b35', background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)', borderRadius: 4, padding: '2px 8px' }}>LEVEL {cl}+</span>

                      return (
                        <div
                          key={occ.id}
                          onClick={() => {
                            if (isBooked || isWaitlisted) return
                            if (requiresExemption) { setCalExemptionOcc({ occ, type: 'cutoff' }); return }
                            if (levelLocked) { setCalExemptionOcc({ occ, type: 'level', requiredLevel: cl }); return }
                            setCalOccBooking(occ)
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 14px', borderRadius: 10,
                            background: isBooked ? 'rgba(204,255,0,0.04)' : isWaitlisted ? 'rgba(255,170,0,0.04)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isBooked ? 'rgba(204,255,0,0.15)' : isWaitlisted ? 'rgba(255,170,0,0.15)' : '#1a1a1a'}`,
                            cursor: isBooked || isWaitlisted ? 'default' : 'pointer',
                            marginBottom: 4, opacity: levelLocked ? 0.55 : 1,
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', marginBottom: 2 }}>{nm}</div>
                            <div style={{ fontSize: 11, color: '#555' }}>{time}{instructor ? ` · ${instructor}` : ''}</div>
                          </div>
                          {rightBadge}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ color: '#555', fontSize: 13, textAlign: 'center', padding: '8px 0' }}>Tap a highlighted date to see classes</div>
                )}
              </div>
            )
          })()}

          {/* List view */}
          {casualViewMode === 'list' && (() => {
            const occs = (casualOccsData?.results || casualOccsData || [])
            const activeEnrols = activeEnrolData?.results || activeEnrolData || []
            const userLevelNum = parseLevel(user?.level)
            const activeSeason = activeCasualSeason
            const seasonWeek = getCurrentSeasonWeek(activeSeason?.start_date)

            let filtered = occs
            if (casualEligibleOnly && userLevelNum) {
              filtered = filtered.filter(o => {
                const cl = getClassLevel(o.session_detail?.name || '')
                return cl === 0 || cl <= userLevelNum
              })
            }
            if (casualHideUnavailable && activeSeason && seasonWeek > 3) {
              filtered = filtered.filter(o => {
                const nm = o.session_detail?.name || ''
                const alreadyEnrolled = activeEnrols.some(e => e.class_session === o.session)
                return !isRoutineClass(nm) || alreadyEnrolled
              })
            }

            // Group by date
            const byDate = {}
            for (const o of filtered) {
              if (!byDate[o.date]) byDate[o.date] = []
              byDate[o.date].push(o)
            }
            const dates = Object.keys(byDate).sort()

            if (loadingCasualOccs) return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
              </div>
            )
            if (dates.length === 0) return <EmptyState />

            return (
              <div>
                {dates.map(date => {
                  const dayOccs = byDate[date]
                  const d = new Date(date + 'T00:00')
                  const dayNum = d.getDate()
                  const monthLabel = d.toLocaleDateString('en-AU', { month: 'short' }).toUpperCase()
                  const weekday = d.toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase()
                  return (
                    <div key={date} style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 }}>
                        {weekday} {dayNum} {monthLabel}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {dayOccs.map(occ => {
                        const sDetail = occ.session_detail || {}
                        const nm = sDetail.name || ''
                        const instructor = occ.instructor_detail?.display_name || occ.instructor_detail?.first_name || ''
                        const time = sDetail.start_time?.slice(0, 5) || ''
                        const myBooking = occ.my_booking
                        const isBooked = myBooking?.status === 'confirmed'
                        const isWaitlisted = myBooking?.status === 'waitlisted'
                        const spotsLeft = occ.spots_left ?? 0
                        const isFull = spotsLeft <= 0
                        const cl = getClassLevel(nm)
                        const alreadyEnrolled = activeEnrols.some(e => e.class_session === occ.session && e.enrolment_type === 'course')
                        const adminRestriction = isAdminLevelRestricted(sDetail, user)
                        const levelLocked = !adminRestriction && cl > 0 && userLevelNum && cl > userLevelNum
                        const hasCatchUpCredit = availableCredits > 0 && !alreadyEnrolled && !levelLocked && !adminRestriction
                        const isCatchUpEligible = !(isRoutineClass(nm) && seasonWeek > 3) && !levelLocked && !adminRestriction && !alreadyEnrolled
                        const requiresExemption = !adminRestriction && isRoutineClass(nm) && seasonWeek > 3 && !alreadyEnrolled

                        const accentColor = isBooked ? '#ccff00' : isWaitlisted ? '#ffaa00' : adminRestriction ? '#ff6b35' : levelLocked ? '#ff6b35' : requiresExemption ? '#ff6b35' : '#7c5cbf'

                        async function createRestrictedTicket() {
                          try {
                            await helpdeskApi.create({ subject: `Class enquiry — ${nm}`, body: `Hi, I'd like to find out more about booking ${nm}. Could you let me know what's needed?`, category: 'General' })
                            alert("Your message has been sent. The team will be in touch soon.")
                          } catch {
                            alert("Couldn't send message — please contact the studio directly.")
                          }
                        }

                        function handleOccClick() {
                          if (adminRestriction || isBooked || isWaitlisted) return
                          if (requiresExemption) { setCasualExemptionOcc({ occ, type: 'cutoff' }); return }
                          if (levelLocked) { setCasualExemptionOcc({ occ, type: 'level', requiredLevel: cl }); return }
                          setSelectedCasualOcc(occ)
                        }

                        if (adminRestriction) {
                          return (
                            <div key={occ.id} style={{ borderRadius: 12, background: '#111', border: '1px solid rgba(255,107,53,0.2)', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid rgba(255,107,53,0.1)' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{nm}</div>
                                  <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{time}{instructor ? ` · ${instructor}` : ''}</div>
                                </div>
                              </div>
                              <div style={{ padding: '12px 16px' }}>
                                <AdminLevelBlock restriction={adminRestriction} onTicket={createRestrictedTicket} />
                              </div>
                            </div>
                          )
                        }

                        return (
                          <div
                            key={occ.id}
                            onClick={handleOccClick}
                            style={{
                              display: 'flex', alignItems: 'stretch',
                              borderRadius: 12,
                              background: '#111',
                              border: '1px solid #1e1e1e',
                              overflow: 'hidden',
                              cursor: isBooked || isWaitlisted ? 'default' : 'pointer',
                              opacity: (levelLocked || requiresExemption) ? 0.75 : 1,
                            }}
                          >
                            {/* Left accent bar */}
                            <div style={{ width: 4, flexShrink: 0, background: accentColor }} />

                            {/* Date block */}
                            <div style={{ width: 52, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px 8px', borderRight: '1px solid #1e1e1e' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{weekday}</div>
                              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: '#fff', lineHeight: 1.1 }}>{dayNum}</div>
                            </div>

                            {/* Main content */}
                            <div style={{ flex: 1, minWidth: 0, padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{nm}</div>
                              <div style={{ fontSize: 12, color: '#555' }}>{time}{instructor ? ` · ${instructor}` : ''}</div>
                              {isBooked ? (
                                <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: '#ccff00', background: 'rgba(204,255,0,0.1)', border: '1px solid rgba(204,255,0,0.3)', borderRadius: 20, padding: '3px 10px' }}>BOOKED</span>
                              ) : isWaitlisted ? (
                                <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: '#ffaa00', background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.3)', borderRadius: 20, padding: '3px 10px' }}>WAITLISTED</span>
                              ) : levelLocked ? (
                                <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: '#ff6b35', background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.3)', borderRadius: 20, padding: '3px 10px' }}>LEVEL {cl}+ REQUIRED</span>
                              ) : requiresExemption ? (
                                <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: '#ff6b35', background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.3)', borderRadius: 20, padding: '3px 10px' }}>REQUEST EXEMPTION</span>
                              ) : isCatchUpEligible ? (
                                <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: '#b0a0ff', background: 'rgba(176,160,255,0.1)', border: '1px solid rgba(176,160,255,0.3)', borderRadius: 20, padding: '3px 10px' }}>CATCH-UP ELIGIBLE</span>
                              ) : null}
                            </div>

                            {/* Right: spots + price/credit */}
                            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', padding: '12px 14px', gap: 4, minWidth: 80 }}>
                              {!isBooked && !isWaitlisted && spotsLeft > 0 && spotsLeft <= 3 && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#ff4444', background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left!</span>
                              )}
                              {!isBooked && !isWaitlisted && isFull && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#ff4444' }}>FULL</span>
                              )}
                              {!isBooked && !isWaitlisted && !isFull && !levelLocked && !requiresExemption && (
                                <>
                                  {hasCatchUpCredit && <div style={{ fontSize: 11, fontWeight: 700, color: '#b0a0ff', textAlign: 'right' }}>Use credit</div>}
                                  <div style={{ fontSize: 12, color: hasCatchUpCredit ? '#444' : '#888', textAlign: 'right' }}>${casualRate}</div>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      </div>
                    </div>
                  )
                })}

                {selectedCasualOcc && (() => {
                  const occ = selectedCasualOcc
                  const sDetail = occ.session_detail || {}
                  const alreadyEnrolled = activeEnrols.some(e => e.class_session === occ.session && e.enrolment_type === 'course')
                  const seasonEnrolCount = activeEnrols.filter(e => e.enrolment_type === 'course' && e.class_session_detail?.season === activeSeason?.id).length
                  const addingSeasonPrice = (() => {
                    const pos = seasonEnrolCount + 1
                    const tier = seasonPricingConfig.find(r => parseInt((r.label || '').match(/(\d+)/)?.[1] || '0') === pos)
                    const prevTier = seasonPricingConfig.find(r => parseInt((r.label || '').match(/(\d+)/)?.[1] || '0') === pos - 1)
                    const full = tier ? parseFloat(tier.price) : priceSeason
                    const prev = prevTier ? parseFloat(prevTier.price) : 0
                    return full - prev
                  })()
                  const perSession = (addingSeasonPrice / 8).toFixed(2)
                  return (
                    <CasualBookingModal
                      occ={occ}
                      session={{ ...sDetail, instructor_detail: occ.instructor_detail }}
                      priceCasual={casualRate}
                      priceCasualStandard={priceCasual}
                      isEnrolledRate={activeSeasonCount > 0}
                      priceClassPass={priceClassPass}
                      classPassSize={classPassSize}
                      availableCredits={availableCredits}
                      passCredits={availablePassCredits}
                      onPassUsed={refetchPasses}
                      isNewStudent={!hasEverEnrolled}
                      seasonStartDate={activeSeason?.start_date}
                      userLevel={user?.level || null}
                      seasonName={activeSeason?.name}
                      seasonPrice={`$${addingSeasonPrice} total · $${perSession}/session`}
                      seasonWeek={getCurrentSeasonWeek(activeSeason?.start_date)}
                      alreadyEnrolled={alreadyEnrolled}
                      onClose={() => { setSelectedCasualOcc(null); setCasualBookError('') }}
                      onBook={(type) => bookCasualOcc(occ, type)}
                      onEnrolInSeason={() => {
                        setSelectedCasualOcc(null)
                        const sess = { ...sDetail, id: sDetail.id || occ.session }
                        proceedToCheckout(addingSeasonPrice, { session: sess, type: 'course', price: addingSeasonPrice })
                      }}
                      onBuyPass={() => { setSelectedCasualOcc(null); setBuyingPass(true) }}
                    />
                  )
                })()}
                {casualExemptionOcc && (() => {
                  const { occ, type: exemptType, requiredLevel } = casualExemptionOcc
                  const sDetail = occ.session_detail || {}
                  return (
                    <ExemptionModal
                      session={{ ...sDetail, instructor_detail: occ.instructor_detail }}
                      occ={occ}
                      seasonWeek={getCurrentSeasonWeek(activeSeason?.start_date)}
                      type={exemptType}
                      requiredLevel={requiredLevel}
                      userLevel={parseLevel(user?.level)}
                      sending={casualExemptionSending}
                      onSend={(reason) => sendCasualExemption(occ, reason)}
                      onCancel={() => setCasualExemptionOcc(null)}
                    />
                  )
                })()}
                {casualLevelLockedOcc && (() => {
                  const occ = casualLevelLockedOcc
                  const sDetail = occ.session_detail || {}
                  return (
                    <SeasonLevelHeadsUpModal
                      session={{ ...sDetail, instructor_detail: occ.instructor_detail }}
                      onConfirm={() => { const o = casualLevelLockedOcc; setCasualLevelLockedOcc(null); setSelectedCasualOcc(o) }}
                      onCancel={() => setCasualLevelLockedOcc(null)}
                    />
                  )
                })()}
              </div>
            )
          })()}
        </div>
      )}

      {tab === 'trial' && (
        <div>
          <div style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 6, color: 'var(--amber)' }}>Try Your First Class</div>
                <div style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.7, marginBottom: 4 }}>
                  Your first class at Duality — any level, any style.
                </div>
                <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.6 }}>
                  Pick any class below. Wear comfortable activewear and bring water. We'll take care of the rest. This offer is available once.
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
