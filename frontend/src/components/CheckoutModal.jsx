import { useState, useEffect, useRef } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { payments, classes as classesApi, giftCards as giftCardsApi } from '../api'

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hr}:${String(m).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`
}

let stripePromise = null
async function getStripe() {
  if (!stripePromise) {
    const { data } = await payments.stripe.config()
    stripePromise = loadStripe(data.publishable_key)
  }
  return stripePromise
}

const STRIPE_APPEARANCE = {
  theme: 'night',
  variables: {
    colorPrimary: '#ccff00',
    colorBackground: '#111',
    colorText: '#ffffff',
    colorDanger: '#ff4444',
    fontFamily: 'Archivo, sans-serif',
    borderRadius: '8px',
    colorInputBackground: '#0a0a0a',
    colorInputBorder: '#2a2a2a',
  },
}

function NewCardForm({ clientSecret, stripeInst, amountDollars, onSuccess, onClose }) {
  const [stripe, setStripe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (stripeInst) { setStripe(stripeInst); setLoading(false) }
  }, [stripeInst])

  if (loading) return <div style={{ padding: '16px 0', color: 'var(--grey)', fontSize: 13 }}>Loading card form…</div>
  if (!clientSecret) return null

  return (
    <Elements stripe={stripe} options={{ clientSecret, appearance: STRIPE_APPEARANCE }}>
      <NewCardInner amountDollars={amountDollars} clientSecret={clientSecret} onSuccess={onSuccess} paying={paying} setPaying={setPaying} error={error} setError={setError} />
    </Elements>
  )
}

function NewCardInner({ amountDollars, clientSecret, onSuccess, paying, setPaying, error, setError }) {
  const stripe = useStripe()
  const elements = useElements()

  async function handlePay() {
    if (!stripe || !elements) return
    setPaying(true)
    setError('')
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      })
      if (result.error) {
        setError(result.error.message)
      } else if (result.paymentIntent?.status === 'succeeded') {
        onSuccess()
      }
    } finally {
      setPaying(false)
    }
  }

  return (
    <div>
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && (
        <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', margin: '12px 0' }}>{error}</div>
      )}
      <button
        onClick={handlePay}
        disabled={!stripe || paying}
        style={{ width: '100%', background: '#ccff00', color: '#000', border: 'none', borderRadius: 12, padding: '18px 0', fontSize: 15, fontWeight: 900, letterSpacing: 0.5, cursor: paying ? 'default' : 'pointer', marginTop: 16 }}
      >
        {paying ? 'Processing…' : `CONFIRM AND PAY — $${amountDollars.toFixed(2)}`}
      </button>
    </div>
  )
}

function WalletPayButton({ stripe, payRequest }) {
  return (
    <Elements stripe={stripe}>
      <WalletPayButtonInner payRequest={payRequest} />
    </Elements>
  )
}
function WalletPayButtonInner({ payRequest }) {
  return (
    <PaymentRequestButtonElement
      options={{ paymentRequest, style: { paymentRequestButton: { type: 'default', theme: 'dark', height: '52px' } } }}
    />
  )
}

export default function CheckoutModal({
  amount,          // dollars
  description,
  sessions,        // array of session objects for order summary (optional)
  sessionIds,
  saveMethod,
  allowDeposit,    // show pay-in-full vs deposit option
  seasonStartDate, // ISO date for deposit timing message
  onSuccess,
  onClose,
  onCash,
  onPaymentPlan,
}) {
  const [payType, setPayType] = useState('full')
  const [clientSecret, setClientSecret] = useState(null)
  const [fullClientSecret, setFullClientSecret] = useState(null)
  const [depositClientSecret, setDepositClientSecret] = useState(null)
  const [stripeInst, setStripeInst] = useState(null)
  const [savedCards, setSavedCards] = useState([])
  const [selectedCardId, setSelectedCardId] = useState(null)
  const [useSavedCard, setUseSavedCard] = useState(false)
  const [payRequest, setPayRequest] = useState(null)
  const [upsells, setUpsells] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')

  // Discount & gift card
  const [discountCode, setDiscountCode] = useState('')
  const [discountDiscount, setDiscountDiscount] = useState(null)
  const [discountApplying, setDiscountApplying] = useState(false)
  const [discountError, setDiscountError] = useState('')
  const [giftCode, setGiftCode] = useState('')
  const [giftDiscount, setGiftDiscount] = useState(null)
  const [giftApplying, setGiftApplying] = useState(false)
  const [giftError, setGiftError] = useState('')

  const depositAmount = Math.round(amount * 0.5 * 100) / 100
  const baseAmount = payType === 'deposit' ? depositAmount : amount
  const afterDiscount = Math.max(0, baseAmount - (discountDiscount || 0) - (giftDiscount || 0))
  const amountCents = Math.round(afterDiscount * 100)

  useEffect(() => {
    async function init() {
      try {
        const [si, cardsRes] = await Promise.all([
          getStripe(),
          payments.stripe.paymentMethods(),
        ])
        setStripeInst(si)
        const cards = cardsRes.data.payment_methods || []
        setSavedCards(cards)
        if (cards.length > 0) {
          setSelectedCardId(cards[0].id)
          setUseSavedCard(true)
        }

        // Create full-amount intent for new card / express pay
        if (amount > 0) {
          const intentRes = await payments.stripe.createPaymentIntent({
            amount_cents: Math.round(amount * 100),
            description,
            save_method: saveMethod ?? true,
          })
          setFullClientSecret(intentRes.data.client_secret)
          setClientSecret(intentRes.data.client_secret)
        }

        // Upsells non-blocking
        if (sessionIds?.length) {
          classesApi.upsells.suggest(sessionIds)
            .then(r => setUpsells(r.data || []))
            .catch(() => {})
        }
      } catch (e) {
        setError('Could not initialise payment. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Apple/Google Pay request
  useEffect(() => {
    if (!stripeInst || !amountCents) return
    const pr = stripeInst.paymentRequest({
      country: 'AU',
      currency: 'aud',
      total: { label: description || 'Duality Pole Studio', amount: amountCents },
      requestPayerName: true,
      requestPayerEmail: true,
    })
    pr.canMakePayment().then(r => { if (r) setPayRequest(pr) })
    pr.on('paymentmethod', async e => {
      const { error: ce } = await stripeInst.confirmCardPayment(
        clientSecret,
        { payment_method: e.paymentMethod.id },
        { handleActions: false }
      )
      if (ce) { e.complete('fail'); setPayError(ce.message) }
      else { e.complete('success'); onSuccess() }
    })
  }, [stripeInst, amountCents, clientSecret])

  // Switch to deposit: create deposit intent
  async function switchToDeposit() {
    setPayType('deposit')
    if (!depositClientSecret && amount > 0) {
      try {
        const res = await payments.stripe.createPaymentIntent({
          amount_cents: Math.round(depositAmount * 100),
          description: description + ' (50% deposit)',
          save_method: true,
        })
        setDepositClientSecret(res.data.client_secret)
        setClientSecret(res.data.client_secret)
      } catch (e) { }
    } else if (depositClientSecret) {
      setClientSecret(depositClientSecret)
    }
  }

  function switchToFull() {
    setPayType('full')
    if (fullClientSecret) setClientSecret(fullClientSecret)
  }

  async function applyDiscount() {
    if (!discountCode) return
    setDiscountApplying(true)
    setDiscountError('')
    try {
      const res = await payments.promoCodes.validate({ code: discountCode, amount: baseAmount })
      setDiscountDiscount(res.data.discount)
    } catch (e) {
      setDiscountError(e.response?.data?.detail || 'Invalid code')
    } finally {
      setDiscountApplying(false) }
  }

  async function applyGiftCard() {
    if (!giftCode) return
    setGiftApplying(true)
    setGiftError('')
    try {
      const res = await giftCardsApi.redeem(giftCode)
      setGiftDiscount(parseFloat(res.data.balance || res.data.amount || 0))
    } catch (e) {
      setGiftError(e.response?.data?.detail || 'Invalid gift card')
    } finally {
      setGiftApplying(false)
    }
  }

  async function confirmWithSavedCard() {
    if (!stripeInst || !selectedCardId) return
    setPaying(true)
    setPayError('')
    try {
      // If amount is 0 (fully covered by discount), skip payment intent
      if (afterDiscount <= 0) { onSuccess(); return }

      // Create intent for the right amount
      const intentRes = await payments.stripe.createPaymentIntent({
        amount_cents: amountCents,
        description,
        save_method: false,
      })
      const result = await stripeInst.confirmCardPayment(intentRes.data.client_secret, {
        payment_method: selectedCardId,
      })
      if (result.error) setPayError(result.error.message)
      else if (result.paymentIntent?.status === 'succeeded') {
        if (payType === 'deposit') {
          // Record payment plan for balance
          payments.plans.create({
            student: null, // backend infers from auth
            description: description + ' — balance',
            total_amount: depositAmount,
            session_ids: sessionIds,
          }).catch(() => {})
        }
        onSuccess()
      }
    } finally {
      setPaying(false)
    }
  }

  const seasonDateLabel = seasonStartDate
    ? new Date(seasonStartDate + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    : null

  const CARD_BRAND_BG = { visa: '#1a1f71', mastercard: '#eb001b', amex: '#2557d6' }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#111', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', padding: 28 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26 }}>Payment options</div>
          <button onClick={onClose} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: 1, padding: '8px 14px', cursor: 'pointer' }}>CLOSE</button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
        ) : error ? (
          <div style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center', padding: 20 }}>{error}</div>
        ) : (
          <>
            {/* Order summary */}
            <div style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase', marginBottom: 12 }}>Order Summary</div>
              {sessions?.length > 0 ? (
                sessions.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 14 }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ color: '#666', fontSize: 12 }}>{DAYS_SHORT[s.day_of_week]} {fmtTime(s.start_time)}</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{description}</div>
              )}
              <div style={{ borderTop: '1px solid #222', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
                <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: '#ccff00' }}>${amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Upsells */}
            {upsells.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase', marginBottom: 10 }}>Before You Checkout</div>
                {upsells.map(u => (
                  <div key={u.id} style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: 10, padding: '14px 16px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 20, lineHeight: 1 }}>💡</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{u.headline || u.suggested_session_name}</div>
                        {u.body && <div style={{ fontSize: 13, color: '#666', marginBottom: 8, lineHeight: 1.5 }}>{u.body}</div>}
                        <span style={{ fontSize: 13, color: '#ccff00', cursor: 'pointer', textDecoration: 'underline' }}>View class →</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pay in full / deposit */}
            {allowDeposit && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 12 }}>How would you like to pay?</div>

                {/* Full */}
                <div
                  onClick={switchToFull}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px', borderRadius: 12, border: `2px solid ${payType === 'full' ? '#ccff00' : '#222'}`, background: payType === 'full' ? 'rgba(204,255,0,0.04)' : 'transparent', cursor: 'pointer', marginBottom: 10 }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 11, border: `3px solid ${payType === 'full' ? '#ccff00' : '#444'}`, background: payType === 'full' ? '#ccff00' : 'transparent', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: payType === 'full' ? '#ccff00' : '#fff' }}>Pay in full today</div>
                    <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>One payment, nothing more to think about.</div>
                  </div>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: payType === 'full' ? '#ccff00' : '#fff' }}>${amount.toFixed(0)}</div>
                </div>

                {/* Deposit */}
                <div
                  onClick={switchToDeposit}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px', borderRadius: 12, border: `2px solid ${payType === 'deposit' ? '#ccff00' : '#222'}`, background: payType === 'deposit' ? 'rgba(204,255,0,0.04)' : 'transparent', cursor: 'pointer', marginBottom: 10 }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 11, border: `3px solid ${payType === 'deposit' ? '#ccff00' : '#444'}`, background: payType === 'deposit' ? '#ccff00' : 'transparent', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: payType === 'deposit' ? '#ccff00' : '#fff' }}>Pay 50% deposit today</div>
                    <div style={{ fontSize: 13, color: '#666', marginTop: 2, lineHeight: 1.5 }}>
                      Balance of ${depositAmount.toFixed(0)} charged automatically 4 hours prior to your first class{seasonDateLabel ? `, Week 1 (${seasonDateLabel})` : ''}.
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: payType === 'deposit' ? '#ccff00' : '#fff' }}>${depositAmount.toFixed(0)}</div>
                </div>
              </div>
            )}

            {/* Saved card */}
            {savedCards.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {savedCards.map(card => {
                  const brandBg = CARD_BRAND_BG[card.brand?.toLowerCase()] || '#333'
                  const isSelected = useSavedCard && selectedCardId === card.id
                  return (
                    <div
                      key={card.id}
                      onClick={() => { setSelectedCardId(card.id); setUseSavedCard(true) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, border: `1px solid ${isSelected ? '#ccff00' : '#2a2a2a'}`, background: isSelected ? 'rgba(204,255,0,0.04)' : '#0d0d0d', cursor: 'pointer', marginBottom: 8 }}
                    >
                      <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${isSelected ? '#ccff00' : '#444'}`, background: isSelected ? '#ccff00' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isSelected && <span style={{ fontSize: 11, color: '#000', fontWeight: 900 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>Use saved card</div>
                        <div style={{ fontSize: 12, color: '#666', marginTop: 1 }}>
                          {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} ending {card.last4} · expires {String(card.exp_month).padStart(2, '0')}/{String(card.exp_year).slice(-2)}
                        </div>
                      </div>
                      <div style={{ background: brandBg, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, letterSpacing: 1, textTransform: 'uppercase' }}>
                        {card.brand}
                      </div>
                    </div>
                  )
                })}
                <div
                  onClick={() => setUseSavedCard(false)}
                  style={{ fontSize: 12, color: useSavedCard ? '#555' : '#ccff00', cursor: 'pointer', textDecoration: 'underline', marginTop: 4, marginLeft: 2 }}
                >
                  {useSavedCard ? 'Use a different card instead' : '← Back to saved card'}
                </div>
              </div>
            )}

            {/* Express payment (Apple/Google Pay) */}
            {payRequest && stripeInst && (
              <div style={{ marginBottom: 16 }}>
                <WalletPayButton stripe={stripeInst} payRequest={payRequest} />
              </div>
            )}

            {/* New card form */}
            {!useSavedCard && clientSecret && stripeInst && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px', color: '#555', fontSize: 12 }}>
                  <div style={{ flex: 1, height: 1, background: '#222' }} />
                  or pay by card
                  <div style={{ flex: 1, height: 1, background: '#222' }} />
                </div>
                <NewCardForm
                  key={clientSecret}
                  clientSecret={clientSecret}
                  stripeInst={stripeInst}
                  amountDollars={afterDiscount}
                  onSuccess={onSuccess}
                  onClose={onClose}
                />
              </div>
            )}

            {/* Discount & gift card */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  className="input"
                  placeholder="Discount code (optional)"
                  value={discountCode}
                  onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setDiscountDiscount(null); setDiscountError('') }}
                  style={{ flex: 1, fontSize: 13, padding: '10px 12px' }}
                  onKeyDown={e => e.key === 'Enter' && applyDiscount()}
                />
                <button
                  onClick={applyDiscount}
                  disabled={discountApplying || !discountCode}
                  style={{ background: 'none', border: '1px solid #333', borderRadius: 8, color: discountDiscount != null ? '#ccff00' : '#888', fontSize: 12, fontWeight: 700, padding: '0 16px', cursor: 'pointer', letterSpacing: 1, whiteSpace: 'nowrap' }}
                >
                  {discountApplying ? '…' : discountDiscount != null ? '✓ APPLIED' : 'APPLY'}
                </button>
              </div>
              {discountError && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 6 }}>{discountError}</div>}

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  placeholder="Gift card code"
                  value={giftCode}
                  onChange={e => { setGiftCode(e.target.value.toUpperCase()); setGiftDiscount(null); setGiftError('') }}
                  style={{ flex: 1, fontSize: 13, padding: '10px 12px' }}
                  onKeyDown={e => e.key === 'Enter' && applyGiftCard()}
                />
                <button
                  onClick={applyGiftCard}
                  disabled={giftApplying || !giftCode}
                  style={{ background: giftDiscount != null ? '#ccff00' : 'none', border: `1px solid ${giftDiscount != null ? '#ccff00' : '#333'}`, borderRadius: 8, color: giftDiscount != null ? '#000' : '#888', fontSize: 12, fontWeight: 700, padding: '0 16px', cursor: 'pointer', letterSpacing: 1, whiteSpace: 'nowrap' }}
                >
                  {giftApplying ? '…' : giftDiscount != null ? '✓ Applied' : 'Apply'}
                </button>
              </div>
              {giftError && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{giftError}</div>}
            </div>

            {/* Price summary if discounts applied */}
            {(discountDiscount || giftDiscount) && (
              <div style={{ background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', marginBottom: 4 }}>
                  <span>Subtotal</span><span>${baseAmount.toFixed(2)}</span>
                </div>
                {discountDiscount && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ccff00', marginBottom: 4 }}><span>Discount</span><span>−${discountDiscount.toFixed(2)}</span></div>}
                {giftDiscount && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ccff00', marginBottom: 4 }}><span>Gift card</span><span>−${giftDiscount.toFixed(2)}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid #222', paddingTop: 8, marginTop: 4 }}>
                  <span>Total today</span><span style={{ color: '#ccff00' }}>${afterDiscount.toFixed(2)}</span>
                </div>
              </div>
            )}

            {payError && (
              <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{payError}</div>
            )}

            {/* Main CTA — confirm with saved card */}
            {useSavedCard && (
              <button
                onClick={confirmWithSavedCard}
                disabled={paying}
                style={{ width: '100%', background: '#ccff00', color: '#000', border: 'none', borderRadius: 14, padding: '18px 0', fontSize: 15, fontWeight: 900, letterSpacing: 0.5, cursor: paying ? 'default' : 'pointer', marginBottom: 10 }}
              >
                {paying ? 'Processing…' : `CONFIRM AND PAY — $${afterDiscount.toFixed(2)}`}
              </button>
            )}

            {/* Payment Plan */}
            {onPaymentPlan && (
              <button
                onClick={() => { onClose(); onPaymentPlan() }}
                style={{ width: '100%', background: 'none', border: '1px solid #333', borderRadius: 14, padding: '16px 0', fontSize: 13, fontWeight: 700, letterSpacing: 0.5, cursor: 'pointer', color: '#fff', marginBottom: 10 }}
              >
                REQUEST A PAYMENT PLAN
              </button>
            )}

            {/* Cash */}
            {onCash && (
              <button
                onClick={() => { onClose(); onCash() }}
                style={{ width: '100%', background: 'none', border: '1px solid #333', borderRadius: 14, padding: '16px 0', fontSize: 13, fontWeight: 700, letterSpacing: 0.5, cursor: 'pointer', color: '#fff', marginBottom: 16 }}
              >
                I WANT TO PAY CASH
              </button>
            )}

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: 12, color: '#444', lineHeight: 1.6 }}>
              By booking you agree to our{' '}
              <a href="/portal/studio-info" style={{ color: '#666', textDecoration: 'underline' }}>terms and conditions</a>.
              {' '}Payments secured by Stripe.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
