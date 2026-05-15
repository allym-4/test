import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { payments } from '../api'

let stripePromise = null
async function getStripe() {
  if (!stripePromise) {
    const { data } = await payments.stripe.config()
    stripePromise = loadStripe(data.publishable_key)
  }
  return stripePromise
}

const APPEARANCE = {
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

function SetupForm({ onSuccess, onClose }) {
  const stripe = useStripe()
  const elements = useElements()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setSaving(true)
    setError('')
    try {
      const result = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      })
      if (result.error) {
        setError(result.error.message)
      } else {
        onSuccess()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 16 }}>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      {error && (
        <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>
          {error}
        </div>
      )}
      <button type="submit" disabled={!stripe || saving} className="btn btn-lime" style={{ width: '100%', padding: '13px', fontSize: 14, marginBottom: 10 }}>
        {saving ? 'Saving…' : 'Save card'}
      </button>
      <button type="button" className="btn btn-ghost" style={{ width: '100%', fontSize: 13 }} onClick={onClose}>Cancel</button>
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--grey)', marginTop: 10 }}>
        🔒 Secured by Stripe — we never store your card number
      </div>
    </form>
  )
}

export default function SetupCardModal({ onSuccess, onClose }) {
  const [clientSecret, setClientSecret] = useState(null)
  const [stripe, setStripe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function init() {
      try {
        const [stripeInst, res] = await Promise.all([getStripe(), payments.stripe.createSetupIntent()])
        setStripe(stripeInst)
        setClientSecret(res.data.client_secret)
      } catch {
        setError('Could not initialise. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Add a card</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : error ? (
          <div style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center', padding: 20 }}>{error}</div>
        ) : clientSecret && stripe ? (
          <Elements stripe={stripe} options={{ clientSecret, appearance: APPEARANCE }}>
            <SetupForm onSuccess={onSuccess} onClose={onClose} />
          </Elements>
        ) : null}
      </div>
    </div>
  )
}
