import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { payments, helpdesk, attendance } from '../../api'
import CheckoutModal from '../../components/CheckoutModal'
import SetupCardModal from '../../components/SetupCardModal'

const TYPE_TAG = {
  season: { label: 'Season', cls: 'tag-lime' },
  catch_up: { label: 'Catch-up', cls: 'tag-lav' },
  casual: { label: 'Casual', cls: 'tag-lav' },
  no_show_fee: { label: 'No-show fee', cls: 'tag-red' },
  payment: { label: 'Payment', cls: 'tag-grey' },
  charge: { label: 'Charge', cls: 'tag-grey' },
  credit: { label: 'Credit', cls: 'tag-lime' },
}

function typeTag(payment_type) {
  const t = TYPE_TAG[payment_type]
  if (t) return t
  return { label: payment_type.replace(/_/g, ' '), cls: 'tag-grey' }
}

export default function StudentBilling() {
  const { user } = useAuth()
  const [showCheckout, setShowCheckout] = useState(false)
  const [showPartialModal, setShowPartialModal] = useState(false)
  const [partialAmount, setPartialAmount] = useState('')
  const [partialCheckout, setPartialCheckout] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(null) // payment object
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [refundType, setRefundType] = useState('refund')
  const [refundReason, setRefundReason] = useState('')
  const [refundSending, setRefundSending] = useState(false)
  const [refundSent, setRefundSent] = useState(false)

  const { data: balData, loading: loadingBal, refetch: refetchBal } = useApi(() => payments.balance(user?.id), [user?.id])
  const { data: paymentsData, loading: loadingPayments, refetch: refetchPayments } = useApi(() => payments.list({ student: user?.id }), [user?.id])
  const { data: plansData } = useApi(() => payments.plans.list({ student: user?.id }), [user?.id])
  const { data: creditsData } = useApi(() => attendance.makeupCredits.list({ student: user?.id }), [user?.id])
  const { data: cardsData, refetch: refetchCards } = useApi(() => payments.stripe.paymentMethods(), [])

  const savedCards = cardsData?.payment_methods || []
  const [autoCharge, setAutoCharge] = useState(null)
  const [defaultPmId, setDefaultPmId] = useState(null)
  const [showSetupCard, setShowSetupCard] = useState(false)
  const [removingCard, setRemovingCard] = useState(null)
  const [savingAutoCharge, setSavingAutoCharge] = useState(false)

  const effectiveAutoCharge = autoCharge !== null ? autoCharge : (cardsData?.auto_charge ?? false)
  const effectiveDefaultPm = defaultPmId !== null ? defaultPmId : (cardsData?.default_payment_method_id ?? '')

  async function handleToggleAutoCharge(val) {
    setAutoCharge(val)
    setSavingAutoCharge(true)
    try {
      await payments.stripe.updateAutoCharge({ auto_charge: val, default_payment_method_id: effectiveDefaultPm })
    } finally {
      setSavingAutoCharge(false)
    }
  }

  async function handleSetDefault(pmId) {
    setDefaultPmId(pmId)
    await payments.stripe.updateAutoCharge({ auto_charge: effectiveAutoCharge, default_payment_method_id: pmId })
  }

  async function handleRemoveCard(pmId) {
    setRemovingCard(pmId)
    try {
      await payments.stripe.removePaymentMethod({ payment_method_id: pmId })
      if (effectiveDefaultPm === pmId) setDefaultPmId('')
      refetchCards()
    } finally {
      setRemovingCard(null)
    }
  }

  const bal = balData ? parseFloat(balData.balance) : 0
  const isOwing = bal < 0
  const allPayments = paymentsData?.results || []
  const plans = plansData?.results || []
  const catchupCredits = creditsData?.results || creditsData || []

  const history = [...allPayments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  async function handleRefundSubmit() {
    if (!refundReason.trim()) return
    setRefundSending(true)
    try {
      await helpdesk.submitTicket({
        subject: `${refundType === 'credit' ? 'Credit' : 'Refund'} request`,
        body: refundReason,
        category: 'billing',
      })
      setRefundSent(true)
      setTimeout(() => { setRefundSent(false); setShowRefundModal(false); setRefundReason('') }, 2500)
    } catch {
      setRefundSent(true)
      setTimeout(() => { setRefundSent(false); setShowRefundModal(false); setRefundReason('') }, 2500)
    } finally {
      setRefundSending(false)
    }
  }

  return (
    <div>
      {showCheckout && isOwing && (
        <CheckoutModal
          amount={Math.abs(bal)}
          description="Outstanding balance — Duality Pole Studio"
          saveMethod={true}
          onSuccess={() => { setShowCheckout(false); refetchBal(); refetchPayments() }}
          onClose={() => setShowCheckout(false)}
        />
      )}

      {partialCheckout && (
        <CheckoutModal
          amount={parseFloat(partialAmount)}
          description="Partial payment — Duality Pole Studio"
          saveMethod={true}
          onSuccess={() => { setPartialCheckout(false); setShowPartialModal(false); setPartialAmount(''); refetchBal(); refetchPayments() }}
          onClose={() => setPartialCheckout(false)}
        />
      )}

      {/* Partial payment modal */}
      {showPartialModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowPartialModal(false) }}
        >
          <div className="card" style={{ width: 'min(340px, calc(100vw - 32px))', padding: 24 }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 16 }}>Pay partial amount</div>
            <div className="field">
              <label>Amount ($)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={partialAmount}
                onChange={e => setPartialAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-lime btn-sm"
                disabled={!partialAmount || parseFloat(partialAmount) <= 0}
                onClick={() => setPartialCheckout(true)}
              >
                Pay ${partialAmount ? parseFloat(partialAmount).toFixed(2) : '0.00'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPartialModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice modal */}
      {showInvoiceModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowInvoiceModal(null) }}
        >
          <div className="card" style={{ width: 'min(380px, calc(100vw - 32px))', padding: 24 }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 4 }}>
              Invoice #{showInvoiceModal.id}
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16 }}>
              {showInvoiceModal.description || showInvoiceModal.payment_type?.replace(/_/g, ' ')}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
              <span>Amount</span>
              <span>${Math.abs(parseFloat(showInvoiceModal.amount || 0)).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--grey)', marginBottom: 20 }}>
              <span>Date</span>
              <span>{new Date(showInvoiceModal.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-lime btn-sm" onClick={() => {
                const w = window.open('', '_blank')
                w.document.write(`<html><head><title>Invoice #${showInvoiceModal.id}</title><style>body{font-family:sans-serif;padding:32px;max-width:400px}h2{margin-bottom:24px}table{width:100%;border-collapse:collapse}td{padding:8px 0;border-bottom:1px solid #eee}td:last-child{text-align:right}</style></head><body><h2>Invoice #${showInvoiceModal.id}</h2><table><tr><td>Description</td><td>${showInvoiceModal.description || showInvoiceModal.payment_type?.replace(/_/g, ' ')}</td></tr><tr><td>Amount</td><td>$${Math.abs(parseFloat(showInvoiceModal.amount || 0)).toFixed(2)}</td></tr><tr><td>Date</td><td>${new Date(showInvoiceModal.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr></table></body></html>`)
                w.document.close()
                w.print()
              }}>Download</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowInvoiceModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Refund modal */}
      {showRefundModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowRefundModal(false) }}
        >
          <div className="card" style={{ width: 'min(380px, calc(100vw - 32px))', padding: 24 }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 16 }}>Request a refund or credit</div>
            <div className="field">
              <label>Type</label>
              <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                {['refund', 'credit'].map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input type="radio" value={t} checked={refundType === t} onChange={() => setRefundType(t)} style={{ accentColor: 'var(--lime)' }} />
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Reason</label>
              <textarea
                rows={3}
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                placeholder="Please describe the reason for your request…"
                style={{ width: '100%', background: 'var(--input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '9px 12px', fontSize: 13, resize: 'vertical' }}
              />
            </div>
            {refundSent && <div style={{ fontSize: 12, color: 'var(--lime)', marginBottom: 12 }}>Request submitted — we'll be in touch soon.</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-lime btn-sm" onClick={handleRefundSubmit} disabled={refundSending || refundSent || !refundReason.trim()}>
                {refundSending ? 'Submitting…' : 'Submit'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowRefundModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div className="page-title">Billing</div>
      </div>

      {/* Catch-up Credits card */}
      <div style={{
        border: '1px solid var(--lav)',
        borderRadius: 14,
        padding: '20px 24px',
        marginBottom: 24,
        maxWidth: 700,
      }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--lav)', marginBottom: 8, fontWeight: 500 }}>
          Catch-up Credits
        </div>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, color: 'var(--lav)', marginBottom: 4 }}>
          {Array.isArray(catchupCredits) ? catchupCredits.filter(c => c.status === 'available' || !c.status).length : 0}
        </div>
        <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 16 }}>
          Available to use when booking a casual or catch-up class
        </div>
        {Array.isArray(catchupCredits) && catchupCredits.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {catchupCredits.map((c, i) => (
              <div key={c.id || i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span style={{ color: 'var(--white)' }}>{c.for_class || c.description || 'Catch-up credit'}</span>
                  <span style={{ color: 'var(--grey)', fontSize: 11 }}>
                    Issued {c.issued_at ? new Date(c.issued_at).toLocaleDateString('en-AU') : '—'}
                    {c.expires_at ? ` · Expires ${new Date(c.expires_at).toLocaleDateString('en-AU')}` : ''}
                  </span>
                </div>
                <span className={`tag ${c.status === 'used' || c.status === 'expired' ? 'tag-grey' : 'tag-lav'}`} style={{ fontSize: 10, flexShrink: 0 }}>{c.status || 'available'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--grey)' }}>No catch-up credits available</div>
        )}
      </div>

      {/* Balance card */}
      <div style={{
        background: isOwing ? 'rgba(255,68,68,0.06)' : 'rgba(0,23,0,0.6)',
        border: `1px solid ${isOwing ? 'rgba(255,68,68,0.25)' : '#1e3800'}`,
        borderRadius: 14,
        padding: '20px 24px',
        marginBottom: 24,
        maxWidth: 700,
      }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: isOwing ? 'var(--red)' : 'var(--grey)', marginBottom: 8 }}>
          Account Balance
        </div>
        {loadingBal ? (
          <div className="spinner" />
        ) : (
          <>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 36, color: isOwing ? '#ff6b6b' : 'var(--lime)', marginBottom: 6 }}>
              {isOwing ? `-$${Math.abs(bal).toFixed(2)}` : bal > 0 ? `$${bal.toFixed(2)} credit` : '$0.00'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--grey)' }}>
              {isOwing
                ? 'Outstanding balance — please contact your studio to make a payment'
                : bal > 0
                  ? 'Credit will be applied to your next booking automatically'
                  : 'No outstanding balance'}
            </div>
            {isOwing && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 10 }}>
                  Total charged: ${parseFloat(balData?.total_charged || 0).toFixed(2)} · Total paid: ${parseFloat(balData?.total_paid || 0).toFixed(2)}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowCheckout(true)}
                  >
                    Pay now · ${Math.abs(bal).toFixed(2)}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowPartialModal(true)}
                  >
                    Pay partial amount
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showSetupCard && (
        <SetupCardModal
          onSuccess={() => { setShowSetupCard(false); refetchCards() }}
          onClose={() => setShowSetupCard(false)}
        />
      )}

      {/* Saved payment methods */}
      <div style={{ maxWidth: 700, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>Saved Payment Methods</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowSetupCard(true)}>+ Add card</button>
        </div>

        {savedCards.length === 0 ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 20px', fontSize: 13, color: 'var(--grey)' }}>
            No saved cards. Add one to enable faster checkout.
          </div>
        ) : (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
            {savedCards.map((card, i) => {
              const isDefault = effectiveDefaultPm === card.id
              return (
                <div key={card.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < savedCards.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} ···· {card.last4}
                      {isDefault && <span className="tag tag-lime" style={{ fontSize: 9, marginLeft: 8 }}>Default</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>
                      Expires {String(card.exp_month).padStart(2, '0')}/{String(card.exp_year).slice(-2)}
                    </div>
                  </div>
                  {!isDefault && (
                    <button className="btn btn-ghost btn-xs" onClick={() => handleSetDefault(card.id)}>Set default</button>
                  )}
                  <button
                    className="btn btn-ghost btn-xs"
                    style={{ color: 'var(--red)' }}
                    disabled={removingCard === card.id}
                    onClick={() => handleRemoveCard(card.id)}
                  >
                    {removingCard === card.id ? '…' : 'Remove'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, padding: '12px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <input
            type="checkbox"
            checked={effectiveAutoCharge}
            disabled={savingAutoCharge || savedCards.length === 0 || !effectiveDefaultPm}
            onChange={e => handleToggleAutoCharge(e.target.checked)}
            style={{ accentColor: 'var(--lime)', width: 16, height: 16 }}
          />
          <div>
            <div style={{ fontWeight: 500 }}>Auto-charge my saved card</div>
            <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>
              Automatically charge your default card for enrolments, casuals, fees, and retail
              {savedCards.length === 0 ? ' (add a card to enable)' : !effectiveDefaultPm ? ' (set a default card to enable)' : ''}
            </div>
          </div>
        </label>
      </div>

      {/* Active payment plans */}
      {plans.filter(p => p.status === 'active').length > 0 && (
        <div style={{ marginBottom: 28, maxWidth: 700 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 14 }}>Payment Plans</div>
          {plans.filter(p => p.status === 'active').map(plan => {
            const paid = parseFloat(plan.amount_paid || 0)
            const total = parseFloat(plan.total_amount || 0)
            const pct = total ? Math.round(paid / total * 100) : 0
            return (
              <div key={plan.id} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{plan.description || 'Payment Plan'}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
                      ${paid.toFixed(2)} paid of ${total.toFixed(2)}
                    </div>
                  </div>
                  <span className="tag tag-lime" style={{ fontSize: 10 }}>Active</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                  <span style={{ fontSize: 11, color: 'var(--grey)', width: 32, textAlign: 'right' }}>{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Payment history */}
      <div style={{ maxWidth: 700, marginBottom: 24 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 14 }}>Payment History</div>
        {loadingPayments ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
        ) : history.length === 0 ? (
          <div className="empty-state">No payment history yet</div>
        ) : (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {history.map(p => {
              const isPayment = p.payment_type === 'payment'
              const isCharge = p.payment_type === 'charge' || p.payment_type === 'no_show_fee'
              const isCredit = p.payment_type === 'credit'
              const tag = typeTag(p.payment_type)
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #1a1a1a' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.description || p.payment_type.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>
                      {new Date(p.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <span className={`tag ${tag.cls}`} style={{ fontSize: 9, flexShrink: 0 }}>{tag.label}</span>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, color: isPayment || isCredit ? 'var(--lime)' : isCharge ? 'var(--red)' : 'var(--grey)' }}>
                      {isCharge ? '-' : '+'}${Math.abs(parseFloat(p.amount || 0)).toFixed(2)}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-xs"
                    style={{ flexShrink: 0, fontSize: 11 }}
                    onClick={() => setShowInvoiceModal(p)}
                  >
                    View Invoice
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ maxWidth: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => {
          const rows = (paymentsData?.results || []).map(p => `<tr><td>#${p.id}</td><td>${p.description || p.payment_type?.replace(/_/g, ' ')}</td><td>$${Math.abs(parseFloat(p.amount || 0)).toFixed(2)}</td><td>${new Date(p.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>`).join('')
          const w = window.open('', '_blank')
          w.document.write(`<html><head><title>All Invoices</title><style>body{font-family:sans-serif;padding:32px}h2{margin-bottom:24px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #eee;text-align:left}th{font-weight:bold}</style></head><body><h2>All Invoices</h2><table><thead><tr><th>#</th><th>Description</th><th>Amount</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table></body></html>`)
          w.document.close()
          w.print()
        }}>
          Download all invoices
        </button>
        <button
          className="btn btn-ghost btn-sm"
          style={{ color: 'var(--lav)' }}
          onClick={() => setShowRefundModal(true)}
        >
          Request a refund or credit →
        </button>
      </div>
    </div>
  )
}
