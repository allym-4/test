import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../contexts/AuthContext'
import { classes, enrolments, settings as settingsApi } from '../../api'
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

function ClassCard({ session, onAddToCart, priceCasual, cartSessionId }) {
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
          <button className="btn btn-ghost btn-sm" onClick={() => onAddToCart(session, 'waitlist')}>Join Waitlist</button>
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

function StickyCart({ cart, priceCasual, onProceed, onClear }) {
  if (!cart) return null
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
        alignItems: 'center',
        gap: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        pointerEvents: 'all',
        maxWidth: 440,
        width: 'calc(100% - 32px)',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cart.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--lime)', fontWeight: 700 }}>${priceCasual}</div>
        </div>
        <button
          className="btn btn-lime btn-sm"
          style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          onClick={onProceed}
        >
          Proceed to Checkout
        </button>
        <button
          onClick={onClear}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey)', fontSize: 18, lineHeight: 1, padding: 4, flexShrink: 0 }}
          aria-label="Clear cart"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default function StudentBook() {
  const { user } = useAuth()
  const [tab, setTab] = useState('casual')
  const [booked, setBooked] = useState([])
  const [cart, setCart] = useState(null) // { session, type, price, label }
  const [checkout, setCheckout] = useState(null) // { session, type, amount, description }
  const { data: sessionsData, loading } = useApi(() => classes.list())
  const { data: studioSettings } = useApi(() => settingsApi.get())
  const { data: workshopsData, loading: loadingWorkshops, refetch: refetchWorkshops } = useApi(() => classes.workshops.list())

  const priceCasual = parseFloat(studioSettings?.price_casual || 35)
  const priceSeason = parseFloat(studioSettings?.price_season || 270)
  const priceTrial = parseFloat(studioSettings?.price_trial || 25)

  const sessions = sessionsData?.results || sessionsData || []
  const workshops = workshopsData?.results || workshopsData || []
  const [bookingWorkshopId, setBookingWorkshopId] = useState(null)
  const [workshopBooked, setWorkshopBooked] = useState({})

  function addToCart(session, type, price) {
    if (type === 'waitlist') {
      enrolments.create({ session: session.id, student: user?.id, status: 'waitlisted' })
        .then(() => setBooked(b => [...b, session.id + '-waitlist']))
        .catch(() => {})
      return
    }
    setCart({ session, type: type || 'casual', price })
  }

  function proceedToCheckout() {
    if (!cart) return
    const { session, type, price } = cart
    const isCasual = type === 'casual'
    const isTrial = type === 'trial'
    const description = isTrial
      ? `Trial Class — ${session.name}`
      : `${session.name} — ${isCasual ? 'Casual' : 'Season 4'}`
    setCheckout({ session, type, amount: price, description })
  }

  async function bookWorkshop(workshop) {
    setBookingWorkshopId(workshop.id)
    try {
      const res = await classes.workshops.book(workshop.id)
      setWorkshopBooked(prev => ({ ...prev, [workshop.id]: res.data.status }))
      refetchWorkshops()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Booking failed'
      alert(msg)
    } finally {
      setBookingWorkshopId(null)
    }
  }

  async function handlePaymentSuccess() {
    const { session } = checkout
    setCheckout(null)
    setCart(null)
    try {
      await enrolments.create({ session: session.id, student: user?.id, status: 'active' })
    } catch {}
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

  return (
    <div style={{ paddingBottom: cart ? 100 : 0 }}>
      {checkout && (
        <CheckoutModal
          amount={checkout.amount}
          description={checkout.description}
          saveMethod={true}
          onSuccess={handlePaymentSuccess}
          onClose={() => setCheckout(null)}
        />
      )}

      <StickyCart
        cart={cart?.session}
        priceCasual={cart?.price}
        onProceed={proceedToCheckout}
        onClear={() => setCart(null)}
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
          <div style={{ background: 'rgba(176,160,255,0.08)', border: '1px solid rgba(176,160,255,0.25)', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Season 4 — Opens 14 July 2025</div>
            <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.6 }}>
              Season enrolment runs for 8 weeks and gives you a reserved spot in your class. Season 4 runs 11 Aug – 26 Sep 2025.
              Enrolments open to current students on 14 July. Stay tuned for your reminder email!
            </div>
          </div>

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
                <ClassCard key={s.id} session={s} onAddToCart={(s) => addToCart(s, 'season', priceSeason)} priceCasual={priceSeason} cartSessionId={cartSessionId} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'casual' && (
        <div>
          <div style={{ background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Drop-in Rate: ${priceCasual} per class</div>
            <div style={{ fontSize: 12, color: 'var(--grey)' }}>Trial class for new students: ${priceTrial} — see the Trial Class tab</div>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {sessions.length === 0 ? <EmptyState /> : sessions.map(s => (
                <ClassCard key={s.id} session={{ ...s, type: 'casual' }} onAddToCart={(s) => addToCart(s, 'casual', priceCasual)} priceCasual={priceCasual} cartSessionId={cartSessionId} />
              ))}
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
          <div style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Catch-up Credits</div>
            <div style={{ fontSize: 12, color: 'var(--grey)' }}>
              If you have an approved absence this season, you may have a catch-up credit. Credits expire 60 days after issue and can be used for any equivalent or lower level class.
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {sessions.length === 0 ? <EmptyState /> : sessions.map(s => (
                <div key={s.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, marginBottom: 4 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10 }}>
                    {DAYS[s.day_of_week]} · {s.start_time?.slice(0, 5)} · {s.studio_detail?.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="tag tag-lime" style={{ fontSize: 10 }}>Uses 1 credit</span>
                    <button className="btn btn-lime btn-sm" onClick={() => addToCart(s, 'catchup', 0)}>Book (Credit)</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'workshop' && (
        <div>
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
            const alreadyBooked = workshopBooked[w.id] === 'confirmed' || w.is_booked
            const onWaitlist = workshopBooked[w.id] === 'waitlisted'
            const booking = bookingWorkshopId === w.id
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
                    <span style={{ fontSize: 12, color: 'var(--lime)', fontWeight: 700 }}>✓ Booked</span>
                  ) : onWaitlist ? (
                    <span style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 700 }}>On waitlist</span>
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
