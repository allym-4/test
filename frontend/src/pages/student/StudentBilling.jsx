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
  const [refundError, setRefundError] = useState('')

  const { data: balData, loading: loadingBal, refetch: refetchBal } = useApi(() => user ? payments.balance(user.id) : null, [user?.id])
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

  const bal = balData ? parseFloat(balData.balance) : null
  const isOwing = bal !== null && bal < 0
  const allPayments = paymentsData?.results || []
  const plans = plansData?.results || []
  const catchupCredits = creditsData?.results || creditsData || []

  const history = [...allPayments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  async function handleRefundSubmit() {
    if (!refundReason.trim()) return
    setRefundSending(true)
    setRefundError('')
    try {
      await helpdesk.submitTicket({
        subject: `${refundType === 'credit' ? 'Credit' : 'Refund'} request`,
        body: refundReason,
        category: 'Billing',
      })
      setShowRefundModal(false)
      setRefundReason('')
    } catch (err) {
      setRefundError(err?.response?.data?.detail || 'Failed to submit — please try again.')
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
      {showInvoiceModal && (() => {
        const inv = showInvoiceModal
        const isCharge = inv.payment_type === 'charge' || inv.payment_type === 'no_show_fee'
        const isPayment = inv.payment_type === 'payment'
        const amount = Math.abs(parseFloat(inv.amount || 0))
        const dateStr = new Date(inv.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
        const statusLabel = isPayment ? 'PAID' : isCharge ? 'CHARGED' : 'ISSUED'
        const statusColor = isPayment ? '#ccff00' : isCharge ? '#ff6b6b' : '#b0a0ff'

        function printInvoice() {
          const w = window.open('', '_blank')
          w.document.write(`<!DOCTYPE html><html><head><title>Invoice #${inv.id} — Duality Pole Studio</title><style>
            @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;600;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Archivo', Arial, sans-serif; background: #fff; color: #111; padding: 48px; max-width: 680px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #111; }
            .studio-name { font-family: 'Archivo Black', Arial Black, sans-serif; font-size: 24px; letter-spacing: -0.5px; }
            .studio-sub { font-size: 13px; color: #666; margin-top: 4px; }
            .inv-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 4px; }
            .inv-num { font-size: 22px; font-weight: 700; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; }
            .meta-block label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: #888; display: block; margin-bottom: 4px; }
            .meta-block span { font-size: 14px; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
            thead th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: #888; padding: 10px 0; border-bottom: 1px solid #ddd; text-align: left; }
            thead th:last-child { text-align: right; }
            tbody td { padding: 16px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
            tbody td:last-child { text-align: right; font-weight: 700; }
            .total-row { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; }
            .total-label { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
            .total-amount { font-size: 26px; font-weight: 900; }
            .status-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; background: ${isPayment ? '#ccff00' : isCharge ? '#ffe0e0' : '#ede9ff'}; color: ${isPayment ? '#000' : isCharge ? '#c00' : '#5538c8'}; }
            .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
            @media print { body { padding: 24px; } }
          </style></head><body>
            <div class="header">
              <div>
                <div class="studio-name">DUALITY POLE</div>
                <div class="studio-sub">dualitypole.com · Level 1, 88 Kippax St, Surry Hills</div>
              </div>
              <div style="text-align:right">
                <div class="inv-label">Invoice</div>
                <div class="inv-num">#${inv.id}</div>
              </div>
            </div>
            <div class="meta">
              <div class="meta-block">
                <label>Billed to</label>
                <span>${user?.first_name || ''} ${user?.last_name || ''}</span>
              </div>
              <div class="meta-block" style="text-align:right">
                <label>Date issued</label>
                <span>${dateStr}</span>
              </div>
            </div>
            <table>
              <thead><tr><th>Description</th><th>Type</th><th>Amount</th></tr></thead>
              <tbody>
                <tr>
                  <td>${inv.description || inv.payment_type?.replace(/_/g, ' ')}</td>
                  <td><span class="status-badge">${statusLabel}</span></td>
                  <td>$${amount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <div class="total-row">
              <span class="total-label">Total</span>
              <span class="total-amount">$${amount.toFixed(2)}</span>
            </div>
            <div class="footer">
              Thank you for being part of Duality Pole Studio. · intrigued@dualitypole.com
            </div>
            <script>window.onload = function(){ window.print() }</script>
          </body></html>`)
          w.document.close()
        }

        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => { if (e.target === e.currentTarget) setShowInvoiceModal(null) }}
          >
            <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 20, width: '100%', maxWidth: 480, overflow: 'hidden' }}>
              {/* Invoice header */}
              <div style={{ background: '#000', padding: '24px 28px', borderBottom: '1px solid #222' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, letterSpacing: '-0.3px', marginBottom: 2 }}>DUALITY POLE</div>
                    <div style={{ fontSize: 11, color: '#555' }}>dualitypole.com</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#555', marginBottom: 2 }}>Invoice</div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>#{inv.id}</div>
                  </div>
                </div>
              </div>

              {/* Invoice body */}
              <div style={{ padding: '24px 28px' }}>
                {/* Meta row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#555', marginBottom: 3 }}>Date</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{dateStr}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#555', marginBottom: 3 }}>Status</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: statusColor, border: `1px solid ${statusColor}40`, borderRadius: 20, padding: '2px 10px', display: 'inline-block' }}>{statusLabel}</div>
                  </div>
                </div>

                {/* Line item */}
                <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{inv.description || inv.payment_type?.replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: 11, color: '#555' }}>Duality Pole Studio · Level 1, 88 Kippax St, Surry Hills</div>
                    </div>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: statusColor, flexShrink: 0 }}>
                      ${amount.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, marginBottom: 24 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>Total</span>
                  <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(17px, 5vw, 22px)' }}>${amount.toFixed(2)}</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-lime btn-sm" style={{ flex: 1, fontWeight: 700 }} onClick={printInvoice}>
                    Download Invoice
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setShowInvoiceModal(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

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
            {refundError && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>{refundError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-lime btn-sm" onClick={handleRefundSubmit} disabled={refundSending || !refundReason.trim()}>
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
        background: 'rgba(26,16,40,0.6)',
        border: '1px solid var(--lav)',
        borderRadius: 14,
        padding: '20px 26px',
        marginBottom: 24,
        maxWidth: 820,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--lav)', marginBottom: 8 }}>
              Make-up Credits
            </div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(20px, 6vw, 28px)', color: 'var(--lav)' }}>
              {Array.isArray(catchupCredits) ? catchupCredits.filter(c => c.status === 'available' || !c.status).length : 0}{' '}
              <span style={{ fontSize: 16, fontWeight: 'normal', fontFamily: "'Archivo', sans-serif", color: 'var(--grey)' }}>credits available</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 4 }}>
              Credits are valid within the season they were issued &nbsp;·&nbsp; <span style={{ color: 'var(--lav)' }}>Use when booking a catch-up class</span>
            </div>
          </div>
        </div>

        {/* Tabular credit list */}
        <div style={{ marginTop: 18, borderTop: '1px solid #2a1a44', paddingTop: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 130px 80px', gap: 10, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grey)', marginBottom: 8 }}>
            <span>Issued</span><span>For</span><span>Expires</span><span>Status</span>
          </div>
          {Array.isArray(catchupCredits) && catchupCredits.length > 0 ? (
            catchupCredits.map((c, i) => (
              <div key={c.id || i} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 130px 80px', gap: 10, fontSize: 13, padding: '8px 0', borderBottom: i < catchupCredits.length - 1 ? '1px solid rgba(42,26,68,0.5)' : 'none', alignItems: 'center' }}>
                <span style={{ color: 'var(--grey)' }}>{c.issued_at ? new Date(c.issued_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                <span>{c.for_class || c.description || 'Catch-up credit'}</span>
                <span style={{ color: 'var(--grey)' }}>{(c.expires_at || c.season_end_date) ? new Date((c.expires_at || c.season_end_date) + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                <span className={`tag ${c.status === 'used' || c.status === 'expired' ? 'tag-grey' : 'tag-lav'}`} style={{ fontSize: 10, padding: '2px 8px' }}>{c.status || 'active'}</span>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 12, color: 'var(--grey)', padding: '8px 0' }}>No catch-up credits available</div>
          )}
        </div>
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
          Current balance
        </div>
        {loadingBal || bal === null ? (
          <div className="spinner" />
        ) : (
          <>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(22px, 7vw, 32px)', color: isOwing ? '#ff6b6b' : 'var(--lime)', marginBottom: 6 }}>
              {isOwing ? `$${Math.abs(bal).toFixed(2)} owing` : bal > 0 ? `$${bal.toFixed(2)} credit` : '$0.00'}
            </div>
            {isOwing && balData?.total_charged && (
              <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 4 }}>
                <span>${parseFloat(balData.total_charged).toFixed(2)} owed</span>
                {parseFloat(balData.total_paid || 0) > 0 && (
                  <> − <span style={{ color: '#4ade80' }}>${parseFloat(balData.total_paid).toFixed(2)} paid</span> = <strong style={{ color: 'var(--white)' }}>${Math.abs(bal).toFixed(2)} to pay</strong></>
                )}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--grey)' }}>
              {isOwing
                ? 'Outstanding balance'
                : bal > 0
                  ? 'Credit will be applied to your next booking automatically'
                  : 'No outstanding balance'}
            </div>
            {isOwing && (
              <div style={{ marginTop: 14 }}>
                <div />
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
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 90px 100px', gap: 12, padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--grey)', borderBottom: '1px solid var(--border)' }}>
              <span>Description</span><span>Date</span><span>Type</span><span style={{ textAlign: 'right' }}>Amount</span><span></span>
            </div>
            {history.map(p => {
              const isPayment = p.payment_type === 'payment'
              const isCharge = p.payment_type === 'charge' || p.payment_type === 'no_show_fee'
              const isCredit = p.payment_type === 'credit'
              const tag = typeTag(p.payment_type)
              return (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 90px 100px', gap: 12, padding: '15px 16px', fontSize: 14, borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description || p.payment_type.replace(/_/g, ' ')}</span>
                  <span style={{ color: 'var(--grey)', fontSize: 13 }}>
                    {new Date(p.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span><span className={`tag ${tag.cls}`} style={{ fontSize: 11 }}>{tag.label}</span></span>
                  <span style={{ textAlign: 'right', fontWeight: 600, color: isPayment || isCredit ? 'var(--lime)' : isCharge ? 'var(--red)' : 'var(--grey)' }}>
                    {isCharge ? '-' : '+'}${Math.abs(parseFloat(p.amount || 0)).toFixed(2)}
                  </span>
                  <span>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, padding: '5px 10px', whiteSpace: 'nowrap' }}
                      onClick={() => setShowInvoiceModal(p)}
                    >
                      View Invoice
                    </button>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ maxWidth: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => {
          const rows = (paymentsData?.results || []).map(p => {
            const amt = Math.abs(parseFloat(p.amount || 0)).toFixed(2)
            const d = new Date(p.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
            const isCharge = p.payment_type === 'charge' || p.payment_type === 'no_show_fee'
            return `<tr><td style="color:#888">#${p.id}</td><td>${p.description || p.payment_type?.replace(/_/g, ' ')}</td><td style="color:${isCharge ? '#c00' : '#007700'};font-weight:600">${isCharge ? '-' : '+'}$${amt}</td><td style="color:#888">${d}</td></tr>`
          }).join('')
          const w = window.open('', '_blank')
          w.document.write(`<!DOCTYPE html><html><head><title>Payment History — Duality Pole Studio</title><style>
            @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;600&display=swap');
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: 'Archivo', Arial, sans-serif; color:#111; padding:48px; max-width:700px; margin:0 auto; }
            .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:20px; border-bottom:2px solid #111; margin-bottom:32px; }
            .studio { font-family:'Archivo Black',Arial Black,sans-serif; font-size:22px; }
            .studio-sub { font-size:12px; color:#888; margin-top:3px; }
            h2 { font-size:18px; font-weight:700; margin-bottom:4px; }
            .sub { font-size:13px; color:#666; margin-bottom:24px; }
            table { width:100%; border-collapse:collapse; }
            th { font-size:11px; text-transform:uppercase; letter-spacing:0.8px; color:#888; padding:8px 0; border-bottom:1px solid #ddd; text-align:left; }
            td { padding:12px 0; border-bottom:1px solid #f0f0f0; font-size:13px; }
            @media print { body { padding:24px; } }
          </style></head><body>
            <div class="header">
              <div><div class="studio">DUALITY POLE</div><div class="studio-sub">dualitypole.com</div></div>
              <div style="text-align:right"><div style="font-size:11px;color:#888;margin-bottom:2px">Generated</div><div style="font-weight:600">${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
            </div>
            <h2>Payment History</h2>
            <div class="sub">${user?.first_name || ''} ${user?.last_name || ''}</div>
            <table><thead><tr><th>#</th><th>Description</th><th>Amount</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>
            <script>window.onload=function(){window.print()}</script>
          </body></html>`)
          w.document.close()
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
