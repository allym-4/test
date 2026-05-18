import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { payments, classes as classesApi } from '../api'

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
    colorBackground: '#0a0a0a',
    colorText: '#ffffff',
    colorDanger: '#ff4444',
    fontFamily: 'Archivo, sans-serif',
    borderRadius: '8px',
    colorInputBackground: '#0a0a0a',
    colorInputBorder: '#2a2a2a',
  },
}

function PaymentForm({ clientSecret, amount, description, onSuccess, onClose, savedCards }) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [paymentRequest, setPaymentRequest] = useState(null)
  const [useNewCard, setUseNewCard] = useState(savedCards.length === 0)
  const [selectedCard, setSelectedCard] = useState(savedCards[0]?.id || null)

  useEffect(() => {
    if (!stripe || !amount) return
    const pr = stripe.paymentRequest({
      country: 'AU',
      currency: 'aud',
      total: { label: description || 'Duality Pole Studio', amount },
      requestPayerName: true,
      requestPayerEmail: true,
    })
    pr.canMakePayment().then(result => {
      if (result) setPaymentRequest(pr)
    })
    pr.on('paymentmethod', async (e) => {
      const { error: confirmError } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: e.paymentMethod.id },
        { handleActions: false }
      )
      if (confirmError) {
        e.complete('fail')
        setError(confirmError.message)
      } else {
        e.complete('success')
        onSuccess()
      }
    })
  }, [stripe, amount, clientSecret, description])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setError('')
    setPaying(true)

    try {
      let result

      if (!useNewCard && selectedCard) {
        result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: selectedCard,
        })
      } else {
        result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: window.location.href,
          },
          redirect: 'if_required',
        })
      }

      if (result.error) {
        setError(result.error.message)
      } else if (result.paymentIntent?.status === 'succeeded') {
        onSuccess()
      }
    } finally {
      setPaying(false)
    }
  }

  const amountDisplay = `$${(amount / 100).toFixed(2)}`

  return (
    <form onSubmit={handleSubmit}>
      {/* Express pay — Apple Pay / Google Pay */}
      {paymentRequest && (
        <div style={{ marginBottom: 20 }}>
          <PaymentRequestButtonElement
            options={{
              paymentRequest,
              style: {
                paymentRequestButton: { type: 'default', theme: 'dark', height: '48px' },
              },
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', color: 'var(--grey)', fontSize: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            or pay by card
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
        </div>
      )}

      {/* Saved cards */}
      {savedCards.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Saved card</div>
          {savedCards.map(card => (
            <div
              key={card.id}
              onClick={() => { setSelectedCard(card.id); setUseNewCard(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 8, marginBottom: 6, cursor: 'pointer',
                border: `1px solid ${!useNewCard && selectedCard === card.id ? 'var(--lime)' : 'var(--border)'}`,
                background: !useNewCard && selectedCard === card.id ? 'rgba(204,255,0,0.04)' : 'var(--card)',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', border: '2px solid',
                borderColor: !useNewCard && selectedCard === card.id ? 'var(--lime)' : '#444',
                background: !useNewCard && selectedCard === card.id ? 'var(--lime)' : 'transparent',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 13 }}>
                {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} ending {card.last4}
              </span>
              <span style={{ fontSize: 12, color: 'var(--grey)', marginLeft: 'auto' }}>
                expires {String(card.exp_month).padStart(2, '0')}/{String(card.exp_year).slice(-2)}
              </span>
            </div>
          ))}
          <div
            onClick={() => setUseNewCard(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${useNewCard ? 'var(--lime)' : 'var(--border)'}`,
              background: useNewCard ? 'rgba(204,255,0,0.04)' : 'var(--card)',
              fontSize: 13, color: 'var(--grey)',
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%', border: '2px solid',
              borderColor: useNewCard ? 'var(--lime)' : '#444',
              background: useNewCard ? 'var(--lime)' : 'transparent',
              flexShrink: 0,
            }} />
            Use a new card
          </div>
        </div>
      )}

      {/* New card fields */}
      {useNewCard && (
        <div style={{ marginBottom: 16 }}>
          <PaymentElement options={{ layout: 'tabs' }} />
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)',
          borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14,
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || paying}
        className="btn btn-primary"
        style={{ width: '100%', padding: '14px', fontSize: 15, marginBottom: 10 }}
      >
        {paying ? 'Processing…' : `Confirm and pay ${amountDisplay}`}
      </button>

      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--grey)' }}>
        🔒 Payments secured by Stripe
      </div>
    </form>
  )
}

export default function CheckoutModal({
  amount,          // dollars (e.g. 270.00)
  description,     // e.g. "Season 4 — Level 2 + Dance"
  saveMethod,      // whether to save the card
  sessionIds,      // array of session IDs being booked (for upsell)
  onSuccess,
  onClose,
}) {
  const [clientSecret, setClientSecret] = useState(null)
  const [stripe, setStripe] = useState(null)
  const [savedCards, setSavedCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [upsells, setUpsells] = useState([])

  const amountCents = Math.round(amount * 100)

  useEffect(() => {
    async function init() {
      try {
        const fetches = [
          getStripe(),
          payments.stripe.createPaymentIntent({
            amount_cents: amountCents,
            description,
            save_method: saveMethod ?? true,
          }),
          payments.stripe.paymentMethods(),
        ]
        if (sessionIds?.length) fetches.push(classesApi.upsells.suggest(sessionIds))
        const [stripeInst, intentRes, cardsRes, upsellRes] = await Promise.all(fetches)
        setStripe(stripeInst)
        setClientSecret(intentRes.data.client_secret)
        setSavedCards(cardsRes.data.payment_methods || [])
        if (upsellRes) setUpsells(upsellRes.data || [])
      } catch (err) {
        setError('Could not initialise payment. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [amountCents, description, saveMethod])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 460 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">Payment options</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ marginBottom: 20, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: 'var(--grey)' }}>Order summary</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
            <span>{description}</span>
            <span style={{ fontFamily: "'Archivo Black', sans-serif", color: 'var(--lime)' }}>
              ${amount.toFixed(2)}
            </span>
          </div>
        </div>

        {upsells.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--grey)', textTransform: 'uppercase', marginBottom: 10 }}>
              Before you checkout
            </div>
            {upsells.map(u => (
              <div key={u.id} style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>✦</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                      {u.headline || u.suggested_session_name}
                    </div>
                    {u.body && (
                      <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 8, lineHeight: 1.5 }}>
                        {u.body}
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: 'var(--lime)', cursor: 'pointer', textDecoration: 'underline' }}>
                      View class →
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" />
          </div>
        ) : error ? (
          <div style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center', padding: 20 }}>{error}</div>
        ) : clientSecret && stripe ? (
          <Elements
            stripe={stripe}
            options={{ clientSecret, appearance: STRIPE_APPEARANCE }}
          >
            <PaymentForm
              clientSecret={clientSecret}
              amount={amountCents}
              description={description}
              savedCards={savedCards}
              saveMethod={saveMethod}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          </Elements>
        ) : null}
      </div>
    </div>
  )
}
