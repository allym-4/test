import { useState } from 'react'
import { payments } from '../api'

export default function CancellationOfferPopup({ offers, onResolved }) {
  const [current, setCurrent] = useState(0)
  const [choosing, setChoosing] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const offer = offers[current]
  if (!offer) return null

  async function choose(choice) {
    setChoosing(true)
    setError('')
    try {
      await payments.cancellationOffers.resolve(offer.id, choice)
      setDone(true)
      setTimeout(() => {
        setDone(false)
        if (current + 1 < offers.length) {
          setCurrent(c => c + 1)
        } else {
          onResolved()
        }
      }, 1400)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong.')
    } finally {
      setChoosing(false)
    }
  }

  const dateLabel = offer.occurrence_date
    ? new Date(offer.occurrence_date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 460, width: '100%', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'rgba(255,68,68,0.1)', borderBottom: '1px solid rgba(255,68,68,0.2)', padding: '18px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: 4 }}>
            Class Cancelled
          </div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, lineHeight: 1.2 }}>
            {offer.session_name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 4 }}>{dateLabel}</div>
          {offers.length > 1 && (
            <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 6 }}>
              {current + 1} of {offers.length}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '20px 20px 24px' }}>
          <div style={{ fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
            We're sorry your class was cancelled. Please choose one of the following:
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</div>}

          {done ? (
            <div style={{ textAlign: 'center', color: 'var(--lime)', fontWeight: 600, fontSize: 15, padding: '16px 0' }}>
              ✓ Got it — thanks!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Credit option */}
              <button
                onClick={() => choose('credit')}
                disabled={choosing}
                style={{
                  background: 'rgba(204,255,0,0.06)',
                  border: '1px solid rgba(204,255,0,0.3)',
                  borderRadius: 12,
                  padding: '16px 18px',
                  textAlign: 'left',
                  cursor: choosing ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!choosing) e.currentTarget.style.background = 'rgba(204,255,0,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(204,255,0,0.06)' }}
              >
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--lime)', marginBottom: 4 }}>
                  ${parseFloat(offer.credit_amount).toFixed(2)} Account Credit
                </div>
                <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.5 }}>
                  Added directly to your account balance — use it towards any future invoice.
                </div>
              </button>

              {/* Makeup option */}
              <button
                onClick={() => choose('makeup')}
                disabled={choosing}
                style={{
                  background: 'rgba(176,160,255,0.06)',
                  border: '1px solid rgba(176,160,255,0.3)',
                  borderRadius: 12,
                  padding: '16px 18px',
                  textAlign: 'left',
                  cursor: choosing ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!choosing) e.currentTarget.style.background = 'rgba(176,160,255,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(176,160,255,0.06)' }}
              >
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--lav)', marginBottom: 4 }}>
                  Makeup Class Credit
                </div>
                <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.5 }}>
                  A credit to attend one makeup class in any session — arrange with reception.
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
