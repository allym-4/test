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

function CasualBookingModal({ occ, session, priceCasual, isEnrolledRate, priceClassPass, classPassSize, availableCredits, passCredits, seasonName, seasonPrice, alreadyEnrolled, onClose, onBook, onEnrolInSeason, onBuyPass }) {
  const sessName = session?.name ?? 'Class'
  const time = session?.start_time?.slice(0, 5)
  const instructor = session?.instructor_detail?.display_name ?? session?.instructor_detail?.first_name
  const dateLabel = occ?.date ? new Date(occ.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : null
  const hasCredits = availableCredits > 0
  const hasPass = (passCredits ?? 0) > 0
  const passSaving = priceClassPass && classPassSize ? Math.round((priceCasual - priceClassPass / classPassSize) * classPassSize) : 0
  const perSession = priceClassPass && classPassSize ? (priceClassPass / classPassSize).toFixed(0) : null

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
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.75)' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#111', borderRadius: '20px 20px 0 0', padding: 28, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, lineHeight: 1.1, marginBottom: 6 }}>{sessName}</div>
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
            sub={`Add this class to your season${seasonPrice ? ` · $${seasonPrice} total` : ''}`}
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

        {!hasPass && priceClassPass && passSaving > 0 && (
          <OptionRow id="buypass"
            title={<>Buy a {classPassSize}-class pass · <span style={{ color: '#ccff00' }}>save ${passSaving}</span></>}
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

function OccurrenceBookingPanel({ session, enrolmentType, priceCasual, isEnrolledRate, priceClassPass, classPassSize, availableCredits, onCreditUsed, seasonName, seasonPrice, alreadyEnrolled, onEnrolInSeason, passCredits, onPassUsed, onBuyPass, isNewStudent = false, seasonStartDate = null }) {
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

  function handleOpenBooking(occ) {
    if (isNewStudent && !isBeginnerFriendly) {
      setHeadsUpOcc(occ)
      return
    }
    if (requiresExemption) {
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

// ─── Booking modals ───────────────────────────────────────────────────────────

function WaitlistModal({ session, occ, onConfirm, onCancel, joining }) {
  const dateLabel = occ?.date
    ? new Date(occ.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
    : null
  const instructor = session?.instructor_detail?.display_name || session?.instructor_detail?.first_name
  const timeLabel = session?.start_time?.slice(0, 5)

  // Dynamic window: 12h normally; shrinks to match time until class if < 12h; hard 1h if < 4h
  let windowHours = 12
  if (occ?.date && session?.start_time) {
    const classAt = new Date(`${occ.date}T${session.start_time}`)
    const hoursUntil = (classAt - new Date()) / (1000 * 60 * 60)
    if (hoursUntil > 0) {
      windowHours = hoursUntil <= 4 ? 1 : Math.min(12, Math.round(hoursUntil))
    }
  }
  const windowLabel = windowHours === 1 ? '1 hour' : `${windowHours} hours`
  const isUrgent = windowHours <= 1

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ background: '#111', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26 }}>Join waitlist</div>
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

function ExemptionModal({ session, occ, seasonWeek, onSend, onCancel, sending }) {
  const [reason, setReason] = useState('')
  const dateLabel = occ?.date
    ? new Date(occ.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
    : null
  const instructor = session?.instructor_detail?.display_name || session?.instructor_detail?.first_name
  const timeLabel = session?.start_time?.slice(0, 5)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ background: '#111', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26, lineHeight: 1.2 }}>Apply for an<br />exemption</div>
          <button onClick={onCancel} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: 1, padding: '8px 14px', cursor: 'pointer', flexShrink: 0, marginLeft: 16 }}>CLOSE</button>
        </div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 18 }}>
          {[session?.name, dateLabel, timeLabel, instructor].filter(Boolean).join(' · ')}
        </div>
        <div style={{ background: 'rgba(255,140,0,0.1)', border: '1px solid rgba(255,140,0,0.3)', borderRadius: 10, padding: '14px 16px', marginBottom: 22 }}>
          <span style={{ color: '#ffaa00', fontWeight: 700 }}>Heads up: </span>
          <span style={{ fontSize: 14, color: '#ccc', lineHeight: 1.6 }}>
            This class runs a routine and you'd be joining in week {seasonWeek} of 8. You'll be behind the group from day one — instructors may not be able to catch you up mid-season.
          </span>
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Why do you want to join this class?</div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Tell us a bit about your background and why you'd like to join mid-season. Your instructor will review and get back to you.</div>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. I've done this routine before at another studio, or I have a strong background in this style and feel confident catching up..."
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
        <div style={{ textAlign: 'center', fontSize: 40, marginBottom: 14 }}>⚠️</div>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, textAlign: 'center', marginBottom: 10 }}>Heads up</div>
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

function SeasonClassRow({ session, userLevel, selected, onToggle, onJoinWaitlist, demoNoLevel }) {
  const classLevel = getClassLevel(session.name)
  const effectiveUserLevel = demoNoLevel ? null : userLevel
  const spotsLeft = (session.capacity || 14) - (session.enrolled_count || 0)
  const isFull = spotsLeft <= 0

  // Determine lock/badge
  let locked = false
  let badge = null

  if (classLevel === 0) {
    // Conditioning / dance / open
    const isVirgin = /virgin/i.test(session.name)
    badge = { label: isVirgin ? 'BEGINNER' : 'ALL LEVELS', color: '#888', bg: 'rgba(255,255,255,0.07)', locked: false }
  } else if (effectiveUserLevel == null) {
    // No level assigned — lock all level classes
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
  const instructor = session.instructor_detail?.display_name || session.instructor_detail?.first_name || ''
  const studio = session.studio_detail?.name || ''
  const dayLabel = DAYS_SHORT[session.day_of_week]?.toUpperCase() || ''
  const timeLabel = formatTime(session.start_time)

  return (
    <div
      onClick={() => !locked && !isFull && onToggle(session)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 16px',
        borderRadius: 10,
        border: `1px solid ${isSelected ? '#ccff00' : isFull ? 'rgba(255,68,68,0.2)' : '#222'}`,
        background: isSelected ? 'rgba(204,255,0,0.04)' : isFull ? 'rgba(255,68,68,0.03)' : locked ? 'rgba(255,255,255,0.01)' : 'transparent',
        cursor: locked ? 'not-allowed' : isFull ? 'default' : 'pointer',
        opacity: locked ? 0.5 : 1,
        marginBottom: 4,
        transition: 'border-color 0.15s, background 0.15s',
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
          <span style={{ color: '#444', fontSize: 11 }}>More info</span>
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
        ) : !locked ? (
          <div style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            border: `2px solid ${isSelected ? '#ccff00' : '#444'}`,
            background: isSelected ? '#ccff00' : 'transparent',
            flexShrink: 0,
            transition: 'background 0.15s, border-color 0.15s',
          }} />
        ) : null}
      </div>
    </div>
  )
}

function SeasonSidebar({ selectedSessions, seasonName, totalPrice, incrementalPrice, activeSeasonCount, onProceed, onRemove }) {
  const count = selectedSessions.length
  const existingCount = activeSeasonCount || 0
  const perSessionWeekly = count > 0 ? (incrementalPrice / (8 * count)).toFixed(2) : null

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
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: '#666', textTransform: 'uppercase', marginBottom: 6 }}>Season Pricing</div>
        {count > 0 ? (
          <>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: '#ccff00', lineHeight: 1 }}>${incrementalPrice}</div>
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

function SeasonTab({
  allSeasons,
  sessions,
  loading,
  activeSeasonCount,
  seasonPricingConfig,
  priceSeason,
  discountTiers,
  userLevel,
  onProceedToCheckout,
  onJoinSeasonWaitlist,
}) {
  // Bookable seasons: active OR upcoming with bookings_open
  const bookableSeasons = allSeasons
    .filter(s => s.status === 'active' || (s.status === 'upcoming' && s.bookings_open))
    .sort((a, b) => {
      // newest first: compare start_date descending
      if (a.start_date && b.start_date) return new Date(b.start_date) - new Date(a.start_date)
      return 0
    })

  const [selectedSeasonId, setSelectedSeasonId] = useState(null)
  const [selectedSessions, setSelectedSessions] = useState([])
  const [filterDay, setFilterDay] = useState('all')
  const [filterInstructor, setFilterInstructor] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterLevel, setFilterLevel] = useState('all')
  const [showEligibleOnly, setShowEligibleOnly] = useState(false)
  const [demoNoLevel, setDemoNoLevel] = useState(false)

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

  const classTypeOptions = Array.from(new Set(seasonSessions.map(s => {
    // Derive a broad type from name
    if (/level/i.test(s.name)) return 'Level Classes'
    if (/virgin/i.test(s.name)) return 'Beginner'
    if (/practice/i.test(s.name)) return 'Practice'
    if (/dance/i.test(s.name)) return 'Dance'
    return 'Conditioning'
  })))

  const levelOptions = ['All levels', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6']

  // Apply filters
  const effectiveUserLevel = demoNoLevel ? null : userLevel
  let filtered = seasonSessions

  if (filterDay !== 'all') {
    const dayIdx = DAYS_SHORT.map(d => d.toLowerCase()).indexOf(filterDay.toLowerCase())
    if (dayIdx >= 0) filtered = filtered.filter(s => s.day_of_week === dayIdx)
  }

  if (filterInstructor !== 'all') {
    filtered = filtered.filter(s => String(s.instructor_detail?.id) === filterInstructor)
  }

  if (filterType !== 'all') {
    filtered = filtered.filter(s => {
      if (filterType === 'Level Classes') return /level/i.test(s.name)
      if (filterType === 'Beginner') return /virgin/i.test(s.name)
      if (filterType === 'Practice') return /practice/i.test(s.name)
      if (filterType === 'Dance') return /dance/i.test(s.name)
      return true
    })
  }

  if (filterLevel !== 'all') {
    const lvlNum = parseInt(filterLevel.match(/(\d+)/)?.[1] || '0')
    if (lvlNum > 0) filtered = filtered.filter(s => getClassLevel(s.name) === lvlNum)
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
    onProceedToCheckout(selectedSessions, incrementalPrice)
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
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
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

            {/* Demo toggle */}
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: 10, padding: '10px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
                Level assigned {userLevel ? `(Level ${userLevel})` : '(none)'}
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
            </div>

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

              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', padding: '7px 10px', fontSize: 12, outline: 'none' }}
              >
                <option value="all">All class types</option>
                {classTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <select
                value={filterLevel}
                onChange={e => setFilterLevel(e.target.value)}
                style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', padding: '7px 10px', fontSize: 12, outline: 'none' }}
              >
                <option value="all">All experience levels</option>
                {levelOptions.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

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
                      demoNoLevel={demoNoLevel}
                    />
                  ))}
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Sidebar */}
      <SeasonSidebar
        selectedSessions={selectedSessions}
        seasonName={activeSeason?.name || 'Season'}
        totalPrice={totalPrice}
        incrementalPrice={incrementalPrice}
        activeSeasonCount={activeSeasonCount}
        onProceed={handleProceed}
        onRemove={removeSession}
      />
    </div>
  )
}

export default function StudentBook() {
  const { user } = useAuth()
  const [tab, setTab] = useState('season')
  const [booked, setBooked] = useState([])
  const [cart, setCart] = useState(null) // { session, type, price, label }
  const [checkout, setCheckout] = useState(null) // { sessionIds, type, amount, description }
  const [buyingPass, setBuyingPass] = useState(false)
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
  const { data: enrolHistoryData } = useApi(() => user?.id ? enrolments.list({ student: user.id, page_size: 1 }) : null, [user?.id])
  const { data: creditsData, refetch: refetchCredits } = useApi(() => user?.id ? attendanceApi.makeupCredits.list({ student: user.id, status: 'available' }) : null, [user?.id])
  const { data: passData, refetch: refetchPasses } = useApi(() => user?.id ? attendanceApi.classPasses.list({ student: user.id }) : null, [user?.id])

  const priceCasual = parseFloat(studioSettings?.price_casual || 40)
  const priceCasualEnrolled = parseFloat(studioSettings?.price_casual_enrolled || 30)
  const priceSeason = parseFloat(studioSettings?.price_season || 270)
  const priceTrial = parseFloat(studioSettings?.price_trial || 25)

  const discountTiers = studioSettings?.season_discount_tiers || {2:100,3:130,4:150,5:170,6:170}

  // Season multi-class pricing: look up price for (current active enrolments + 1)
  const activeSeasonCount = (activeEnrolData?.results || activeEnrolData || []).filter(e => e.enrolment_type === 'course').length
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

  const sessions = sessionsData?.results || sessionsData || []
  const workshops = workshopsData?.results || workshopsData || []
  const [bookingWorkshopId, setBookingWorkshopId] = useState(null)
  const [cancellingWorkshopId, setCancellingWorkshopId] = useState(null)
  const [workshopBooked, setWorkshopBooked] = useState({})
  const [workshopError, setWorkshopError] = useState('')
  const [casualViewMode, setCasualViewMode] = useState('list')
  const [casualEligibleOnly, setCasualEligibleOnly] = useState(false)
  const [casualHideUnavailable, setCasualHideUnavailable] = useState(false)
  const [casualWeekOffset, setCasualWeekOffset] = useState(0)

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

  async function joinSeasonWaitlist(session) {
    try {
      await enrolments.create({ session: session.id, status: 'waitlisted', enrolment_type: 'course' })
      setBooked(b => [...b, session.id + '-waitlist'])
    } catch (e) {
      alert(e.response?.data?.detail || 'Could not join waitlist — please try again.')
    }
  }

  // Season multi-select checkout
  function handleSeasonProceed(selectedSessions, incrementalPrice) {
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
    })
  }

  async function handleCashPayment() {
    if (!checkout) return
    const ids = checkout.sessionIds || (checkout.session ? [checkout.session.id] : [])
    for (const sessionId of ids) {
      try {
        await enrolments.create({ session: sessionId, status: 'active', enrolment_type: checkout.type || 'casual', payment_method: 'cash' })
      } catch {}
    }
    setBooked(b => [...b, ...ids])
    setCheckout(null)
  }

  async function handlePaymentPlan() {
    if (!checkout) return
    const ids = checkout.sessionIds || (checkout.session ? [checkout.session.id] : [])
    try {
      await paymentsApi.plans.create({
        description: checkout.description,
        total_amount: checkout.amount,
        session_ids: ids,
      })
    } catch {}
    setCheckout(null)
    alert('Payment plan request submitted. Admin will be in touch shortly.')
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
    const { type, sessionIds } = checkout
    const ids = sessionIds || (checkout.session ? [checkout.session.id] : [])
    setCheckout(null)
    setCart(null)
    setPromoDiscount(null)
    if (appliedPromoCode) {
      paymentsApi.promoCodes.use({ code: appliedPromoCode }).catch(() => {})
      setAppliedPromoCode('')
    }
    // Create enrolments for all session IDs
    for (const sessionId of ids) {
      try {
        await enrolments.create({ session: sessionId, status: 'active', enrolment_type: type || 'casual' })
      } catch {}
    }
    if (type === 'catchup') refetchCredits()
    setBooked(b => [...b, ...ids])
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
          sessions={checkout.sessions}
          sessionIds={checkout.sessionIds}
          saveMethod={true}
          allowDeposit={checkout.type === 'season'}
          seasonStartDate={checkout.seasonStartDate}
          onSuccess={handlePaymentSuccess}
          onClose={() => setCheckout(null)}
          onCash={checkout.type === 'season' ? handleCashPayment : null}
          onPaymentPlan={checkout.type === 'season' ? handlePaymentPlan : null}
        />
      )}

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
        <SeasonTab
          allSeasons={allSeasons}
          sessions={sessions}
          loading={loading}
          activeSeasonCount={activeSeasonCount}
          seasonPricingConfig={seasonPricingConfig}
          priceSeason={priceSeason}
          discountTiers={discountTiers}
          userLevel={user?.level || null}
          onProceedToCheckout={handleSeasonProceed}
          onJoinSeasonWaitlist={joinSeasonWaitlist}
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
            const dayOfWeek = today.getDay()
            const monday = new Date(today)
            monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + casualWeekOffset * 7)
            const weekDays = Array.from({ length: 6 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d })
            const weekLabel = `Week of ${monday.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${weekDays[5].toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`

            function sessionChipColor(name) {
              const n = (name || '').toLowerCase()
              if (/practice/.test(n)) return { bg: 'rgba(13,115,119,0.5)', border: '#0d7377', text: '#4dd0d4' }
              if (/level\s*1/.test(n)) return { bg: 'rgba(204,255,0,0.2)', border: 'rgba(204,255,0,0.4)', text: '#ccff00' }
              if (/level\s*2/.test(n)) return { bg: 'rgba(176,160,255,0.25)', border: 'rgba(176,160,255,0.5)', text: '#b0a0ff' }
              if (/level\s*[3-6]/.test(n)) return { bg: 'rgba(255,140,0,0.2)', border: 'rgba(255,140,0,0.4)', text: '#ff9500' }
              if (/virgin/.test(n)) return { bg: 'rgba(120,80,220,0.3)', border: 'rgba(120,80,220,0.5)', text: '#9575d9' }
              if (/dance/.test(n)) return { bg: 'rgba(255,80,160,0.2)', border: 'rgba(255,80,160,0.35)', text: '#ff70b8' }
              return { bg: 'rgba(80,80,80,0.25)', border: '#333', text: '#888' }
            }

            const activeSeason = allSeasons.find(s => s.status === 'active')
            const activeEnrols = activeEnrolData?.results || activeEnrolData || []

            let calendarSessions = sessions
            if (casualEligibleOnly && user?.level) {
              calendarSessions = calendarSessions.filter(s => {
                const cl = getClassLevel(s.name)
                return cl === 0 || cl <= user.level
              })
            }
            if (casualHideUnavailable && activeSeason) {
              const week = getCurrentSeasonWeek(activeSeason.start_date)
              if (week > 3) {
                calendarSessions = calendarSessions.filter(s => !isRoutineClass(s.name) || activeEnrols.some(e => e.class_session === s.id))
              }
            }

            return (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <button onClick={() => setCasualWeekOffset(w => w - 1)} style={{ background: 'none', border: '1px solid #333', borderRadius: 8, color: '#888', padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>← Prev</button>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#ccc' }}>{weekLabel}</span>
                  <button onClick={() => setCasualWeekOffset(w => w + 1)} style={{ background: 'none', border: '1px solid #333', borderRadius: 8, color: '#888', padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>Next →</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                  {weekDays.map((date, idx) => {
                    const daySessions = calendarSessions.filter(s => s.day_of_week === idx)
                    const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
                    const isToday = date.toDateString() === today.toDateString()
                    return (
                      <div key={idx}>
                        <div style={{ textAlign: 'center', marginBottom: 6 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: '0.5px' }}>{dayNames[idx]}</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: isToday ? '#ccff00' : '#fff' }}>{date.getDate()}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {daySessions.map(s => {
                            const c = sessionChipColor(s.name)
                            const isFull = (s.capacity || 14) - (s.enrolled_count || 0) <= 0
                            return (
                              <button
                                key={s.id}
                                onClick={() => setCasualViewMode('list')}
                                style={{ background: isFull ? 'rgba(40,40,40,0.5)' : c.bg, border: `1px solid ${isFull ? '#222' : c.border}`, borderRadius: 6, padding: '4px 6px', fontSize: 10, color: isFull ? '#444' : c.text, cursor: 'pointer', textAlign: 'left', width: '100%', lineHeight: 1.3, fontWeight: 600, wordBreak: 'break-word' }}
                              >
                                {s.name}
                                {isFull && <span style={{ fontSize: 9, display: 'block', color: '#555', marginTop: 1 }}>full</span>}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* List view */}
          {casualViewMode === 'list' && (() => {
            const activeSeason = allSeasons.find(s => s.status === 'active')
            const activeEnrols = activeEnrolData?.results || activeEnrolData || []
            const seasonWeek = getCurrentSeasonWeek(activeSeason?.start_date)

            let filteredSessions = sessions
            if (casualEligibleOnly && user?.level) {
              filteredSessions = filteredSessions.filter(s => {
                const cl = getClassLevel(s.name)
                return cl === 0 || cl <= user.level
              })
            }
            if (casualHideUnavailable && activeSeason && seasonWeek > 3) {
              filteredSessions = filteredSessions.filter(s => !isRoutineClass(s.name) || activeEnrols.some(e => e.class_session === s.id))
            }

            return loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : filteredSessions.length === 0 ? <EmptyState /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredSessions.map(s => {
                  const alreadyEnrolled = activeEnrols.some(e => e.class_session === s.id && e.enrolment_type === 'course')
                  return (
                    <OccurrenceBookingPanel
                      key={s.id}
                      session={s}
                      enrolmentType="casual"
                      priceCasual={casualRate}
                      isEnrolledRate={activeSeasonCount > 0}
                      priceClassPass={priceClassPass}
                      classPassSize={classPassSize}
                      availableCredits={availableCredits}
                      onCreditUsed={refetchCredits}
                      seasonName={upcomingSeason?.name}
                      seasonPrice={seasonPrice}
                      alreadyEnrolled={alreadyEnrolled}
                      onEnrolInSeason={() => setTab('season')}
                      passCredits={availablePassCredits}
                      onPassUsed={refetchPasses}
                      onBuyPass={() => setBuyingPass(true)}
                      isNewStudent={!hasEverEnrolled}
                      seasonStartDate={activeSeason?.start_date}
                    />
                  )
                })}
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
