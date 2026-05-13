import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { payments } from '../../api'

export default function StudentBilling() {
  const { user } = useAuth()
  const { data: balData, loading: loadingBal } = useApi(() => payments.balance(user?.id), [user?.id])
  const { data: paymentsData, loading: loadingPayments } = useApi(() => payments.list({ student: user?.id }), [user?.id])
  const { data: plansData } = useApi(() => payments.plans({ student: user?.id }), [user?.id])

  const bal = balData ? parseFloat(balData.balance) : 0
  const isOwing = bal < 0
  const allPayments = paymentsData?.results || []
  const plans = plansData?.results || []

  const history = [...allPayments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Billing</div>
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
              </div>
            )}
          </>
        )}
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
      <div style={{ maxWidth: 700 }}>
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
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #1a1a1a' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.description || p.payment_type.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>
                      {new Date(p.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, color: isPayment || isCredit ? 'var(--lime)' : isCharge ? 'var(--red)' : 'var(--grey)' }}>
                      {isCharge ? '-' : '+'}${Math.abs(parseFloat(p.amount || 0)).toFixed(2)}
                    </div>
                    <span className={`tag ${isPayment ? 'tag-lime' : isCharge ? 'tag-red' : 'tag-grey'}`} style={{ fontSize: 9, marginTop: 2 }}>
                      {p.payment_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
