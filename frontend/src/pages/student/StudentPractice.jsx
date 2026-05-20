import { useState, useEffect } from 'react'
import { useApi } from '../../hooks/useApi'
import { classes as classesApi, payments as paymentsApi } from '../../api'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CASH_DISCOUNT = 5

function fmt(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr > 12 ? hr - 12 : hr || 12}:${m}${hr >= 12 ? 'pm' : 'am'}`
}

function fmtDate(d) {
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function StudentPractice() {
  const [booking, setBooking] = useState(null)
  const [cancelling, setCancelling] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [savedCard, setSavedCard] = useState(null)
  const [cardLoading, setCardLoading] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const { data: slotsData, refetch } = useApi(() => classesApi.practice.list({ date_from: today }), [])
  const { data: myData, refetch: refetchMy } = useApi(() => classesApi.practice.myBookings(), [])

  const slots = slotsData?.results || slotsData || []
  const myBookings = myData?.results || myData || []
  const upcomingBookings = myBookings.filter(b => b.status === 'confirmed' && b.slot?.date >= today)

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

  async function handleBook(slot, paymentMethod) {
    setBusy(true)
    try {
      await classesApi.practice.book(slot.id, { payment_method: paymentMethod })
      setResult({ type: 'booked', slot, price: slot.price_for_me, paymentMethod })
      setBooking(null)
      refetch()
      refetchMy()
    } catch (e) {
      const data = e.response?.data
      if (data?.requires_card) {
        setResult({ type: 'error', msg: 'You need a saved card to book practice time. Add one in Account → Billing.' })
      } else {
        setResult({ type: 'error', msg: data?.detail || 'Something went wrong.' })
      }
      setBooking(null)
    }
    setBusy(false)
  }

  async function handleCancel(b) {
    setBusy(true)
    try {
      await classesApi.practice.cancel(b.slot.id)
      setCancelling(null)
      refetch()
      refetchMy()
    } catch {
      // ignore
    }
    setBusy(false)
  }

  const isPaid = booking && booking.price_for_me > 0
  const cashPrice = isPaid ? Math.max(0, booking.price_for_me - CASH_DISCOUNT) : 0

  return (
    <div style={{ padding: '24px 16px', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Practice Time</div>
      <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 24 }}>
        Book open practice sessions in the studio. Enrolled students $20/hr · Non-enrolled $30/hr · 3 classes = 1 free/week · 4+ classes = unlimited free.
      </div>

      {/* My upcoming bookings */}
      {upcomingBookings.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Your bookings</div>
          {upcomingBookings.map(b => (
            <div key={b.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{b.slot?.studio_detail?.name}</div>
                <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 2 }}>
                  {fmtDate(b.slot?.date)} · {fmt(b.slot?.start_time)}–{fmt(b.slot?.end_time)}
                </div>
                <div style={{ fontSize: 12, marginTop: 4, color: b.is_free ? 'var(--lime)' : b.payment_type === 'cash' ? 'var(--amber)' : 'var(--lav)' }}>
                  {b.is_free ? '✓ Free' : b.payment_type === 'cash' ? `$${parseFloat(b.price_charged).toFixed(0)} — pay cash at reception` : b.payment_type === 'card' ? `$${parseFloat(b.price_charged).toFixed(0)} — paid by card` : `$${parseFloat(b.price_charged).toFixed(0)}`}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0, color: 'var(--red)' }} onClick={() => setCancelling(b)}>Cancel</button>
            </div>
          ))}
        </div>
      )}

      {/* Available slots */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Available sessions</div>
      {slots.length === 0 ? (
        <div style={{ color: 'var(--grey)', fontSize: 13, background: 'var(--card)', borderRadius: 12, padding: '20px', textAlign: 'center', border: '1px solid var(--border)' }}>
          No practice sessions scheduled yet — check back soon.
        </div>
      ) : slots.filter(s => !s.is_booked && s.spots_left > 0).length === 0 ? (
        <div style={{ color: 'var(--grey)', fontSize: 13, background: 'var(--card)', borderRadius: 12, padding: '20px', textAlign: 'center', border: '1px solid var(--border)' }}>
          All upcoming sessions are full or already booked.
        </div>
      ) : (
        slots.filter(s => s.spots_left > 0 || s.is_booked).map(slot => (
          <div key={slot.id} style={{ background: 'var(--card)', border: `1px solid ${slot.is_booked ? 'var(--lime)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{slot.studio_detail?.name}</div>
                {slot.is_booked && <span style={{ fontSize: 10, background: 'var(--lime)', color: '#000', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>BOOKED</span>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--grey)' }}>
                {fmtDate(slot.date)} · {fmt(slot.start_time)}–{fmt(slot.end_time)}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                <span style={{ fontSize: 12, color: slot.price_for_me === 0 ? 'var(--lime)' : 'var(--lav)', fontWeight: 600 }}>
                  {slot.price_for_me === 0 ? 'Free' : `$${slot.price_for_me}`}
                </span>
                <span style={{ fontSize: 12, color: 'var(--grey)' }}>{slot.spots_left} spot{slot.spots_left !== 1 ? 's' : ''} left</span>
              </div>
              {slot.notes && <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>{slot.notes}</div>}
            </div>
            {!slot.is_booked && (
              <button className="btn btn-lime btn-sm" style={{ flexShrink: 0 }} onClick={() => { setBooking(slot); setResult(null) }}>
                Book
              </button>
            )}
          </div>
        ))
      )}

      {/* Booking confirm dialog */}
      {booking && !result && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setBooking(null) }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, maxWidth: 400, width: '100%' }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 8 }}>Confirm booking</div>
            <div style={{ fontSize: 14, color: 'var(--grey)', marginBottom: 2 }}>{booking.studio_detail?.name}</div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>{fmtDate(booking.date)} · {fmt(booking.start_time)}–{fmt(booking.end_time)}</div>

            {!isPaid ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--lime)', marginBottom: 16 }}>Free — no charge</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setBooking(null)}>Cancel</button>
                  <button className="btn btn-lime btn-sm" style={{ flex: 1 }} disabled={busy} onClick={() => handleBook(booking, 'free')}>
                    {busy ? 'Booking…' : 'Confirm'}
                  </button>
                </div>
              </>
            ) : cardLoading ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--grey)', fontSize: 13 }}>Loading…</div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 12 }}>How would you like to pay?</div>

                {/* Card option */}
                <button
                  onClick={() => handleBook(booking, 'card')}
                  disabled={busy || !savedCard}
                  style={{ width: '100%', background: savedCard ? 'rgba(176,160,255,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${savedCard ? 'rgba(176,160,255,0.4)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 16px', cursor: savedCard ? 'pointer' : 'default', textAlign: 'left', marginBottom: 10, opacity: savedCard ? 1 : 0.5 }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: savedCard ? 'var(--lav)' : 'var(--grey)', marginBottom: 4 }}>
                    Pay by card — ${booking.price_for_me}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                    {savedCard ? `Charge •••• ${savedCard.last4} now` : 'No saved card — add one in Account → Billing first'}
                  </div>
                </button>

                {/* Cash option */}
                <button
                  onClick={() => handleBook(booking, 'cash')}
                  disabled={busy || !savedCard}
                  style={{ width: '100%', background: savedCard ? 'rgba(255,170,0,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${savedCard ? 'rgba(255,170,0,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 16px', cursor: savedCard ? 'pointer' : 'default', textAlign: 'left', marginBottom: 16, opacity: savedCard ? 1 : 0.5 }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: savedCard ? 'var(--amber)' : 'var(--grey)', marginBottom: 4 }}>
                    Pay cash at reception — ${cashPrice} <span style={{ fontSize: 11, fontWeight: 400 }}>($5 off)</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.5 }}>
                    Your card is held as security but won't be charged unless you don't show up or don't pay.
                  </div>
                </button>

                <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => setBooking(null)}>Cancel</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Result dialog */}
      {result && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, maxWidth: 380, width: '100%', textAlign: 'center' }}>
            {result.type === 'booked' ? (
              <>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 8 }}>You're in!</div>
                <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16 }}>
                  {fmtDate(result.slot.date)} · {fmt(result.slot.start_time)}–{fmt(result.slot.end_time)}<br />
                  {result.price === 0
                    ? 'No charge — enjoy your free session!'
                    : result.paymentMethod === 'card'
                    ? `$${result.price} charged to your saved card.`
                    : `$${Math.max(0, result.price - CASH_DISCOUNT)} — pay cash at reception when you arrive. Your card is held but not charged.`}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 36, marginBottom: 12 }}>😬</div>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 8 }}>Couldn't book</div>
                <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16 }}>{result.msg}</div>
              </>
            )}
            <button className="btn btn-lime btn-sm" style={{ width: '100%' }} onClick={() => setResult(null)}>Done</button>
          </div>
        </div>
      )}

      {/* Cancel confirm */}
      {cancelling && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setCancelling(null) }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, maxWidth: 360, width: '100%' }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17, marginBottom: 8 }}>Cancel practice booking?</div>
            <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16 }}>
              {fmtDate(cancelling.slot?.date)} · {fmt(cancelling.slot?.start_time)}–{fmt(cancelling.slot?.end_time)} at {cancelling.slot?.studio_detail?.name}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setCancelling(null)}>Keep it</button>
              <button className="btn btn-sm" style={{ flex: 1, background: 'var(--red)', color: '#fff' }} disabled={busy} onClick={() => handleCancel(cancelling)}>
                {busy ? 'Cancelling…' : 'Yes, cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
