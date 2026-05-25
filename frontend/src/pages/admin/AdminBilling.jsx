import { useState, useEffect } from 'react'
import { useApi } from '../../hooks/useApi'
import { payments, users, giftCards as giftCardsApi } from '../../api'
import TakePaymentModal from '../../components/TakePaymentModal'
import AddChargeModal from '../../components/AddChargeModal'
import ChaseModal from '../../components/ChaseModal'
import WaiveModal from '../../components/WaiveModal'

function StudentDrawer({ student, onClose, onAction }) {
  const { data: plansData, loading: loadingPlans } = useApi(() => payments.plans.list({ student: student.id }))
  const { data: txData, loading: loadingTx } = useApi(() => payments.list({ student: student.id }))

  const planList = plansData?.results || plansData || []
  const txList = txData?.results || txData || []

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, background: 'var(--card)', borderLeft: '1px solid var(--border)', zIndex: 201, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>{student.name}</div>
            {student.email && <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{student.email}</div>}
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Balance summary row */}
        <div style={{ display: 'flex', gap: 12, padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', marginBottom: 4 }}>Total Charged</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>${parseFloat(student.total_charged || 0).toFixed(2)}</div>
          </div>
          <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', marginBottom: 4 }}>Total Paid</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>${parseFloat(student.total_paid || 0).toFixed(2)}</div>
          </div>
          <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', marginBottom: 4 }}>Owing</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--red)' }}>${Math.abs(parseFloat(student.balance || 0)).toFixed(2)}</div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Payment Plans */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, color: 'var(--grey)', marginBottom: 12 }}>Payment Plans</div>
            {loadingPlans ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><div className="spinner" /></div>
            ) : planList.length === 0 ? (
              <div style={{ color: 'var(--grey)', fontSize: 13 }}>No payment plans.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {planList.map(plan => {
                  const paid = parseFloat(plan.amount_paid || 0)
                  const total = parseFloat(plan.total_amount || 0)
                  return (
                    <div key={plan.id} style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>{plan.description || 'Payment plan'}</div>
                        <div style={{ fontSize: 11, color: 'var(--grey)' }}>${paid.toFixed(2)} / ${total.toFixed(2)}</div>
                      </div>
                      <span className={`tag ${plan.status === 'active' ? 'tag-lime' : plan.status === 'completed' ? 'tag-grey' : 'tag-amber'}`} style={{ fontSize: 10, flexShrink: 0 }}>
                        {plan.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Transaction History */}
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, color: 'var(--grey)', marginBottom: 12 }}>Transaction History</div>
            {loadingTx ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><div className="spinner" /></div>
            ) : txList.length === 0 ? (
              <div style={{ color: 'var(--grey)', fontSize: 13 }}>No transactions.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px 6px 0', color: 'var(--grey)', fontWeight: 600 }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--grey)', fontWeight: 600 }}>Description</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--grey)', fontWeight: 600 }}>Type</th>
                    <th style={{ textAlign: 'right', padding: '6px 0 6px 8px', color: 'var(--grey)', fontWeight: 600 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[...txList].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(tx => {
                    const isPayment = tx.payment_type === 'payment'
                    const isCharge = tx.payment_type === 'charge' || tx.payment_type === 'no_show_fee'
                    return (
                      <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 8px 8px 0', color: 'var(--grey)', whiteSpace: 'nowrap' }}>
                          {new Date(tx.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </td>
                        <td style={{ padding: '8px' }}>{tx.description || tx.payment_type}</td>
                        <td style={{ padding: '8px' }}>
                          <span className={`tag ${isPayment ? 'tag-lime' : isCharge ? 'tag-red' : 'tag-grey'}`} style={{ fontSize: 10 }}>
                            {({'no_show_fee': 'No-show fee', 'payment': 'Payment', 'charge': 'Charge', 'credit': 'Credit', 'refund': 'Refund'})[tx.payment_type] || tx.payment_type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '8px 0 8px 8px', textAlign: 'right', color: isPayment ? 'var(--lime)' : isCharge ? 'var(--red)' : 'inherit', fontWeight: 600 }}>
                          {isCharge ? '-' : '+'}${Math.abs(parseFloat(tx.amount || 0)).toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick action buttons */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onAction('chase')}>Chase</button>
          <button className="btn btn-ghost btn-sm" onClick={() => onAction('waive')}>Waive</button>
          <button className="btn btn-lime btn-sm" onClick={() => onAction('payment')}>Take Payment</button>
          <button className="btn btn-ghost btn-sm" onClick={() => onAction('charge')}>Add Charge</button>
        </div>
      </div>
    </>
  )
}

function GiftCardModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    issued_to_name: '',
    issued_to_email: '',
    value: '',
    expires_at: '',
    purchased_by_name: '',
    purchased_by_phone: '',
    payment_type: 'cash',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.issued_to_name.trim()) { setErr('Recipient name is required'); return }
    if (!form.value || isNaN(parseFloat(form.value)) || parseFloat(form.value) <= 0) { setErr('A valid amount is required'); return }
    setSaving(true)
    setErr('')
    const code = Math.random().toString(36).substr(2, 8).toUpperCase()
    const value = parseFloat(form.value)
    try {
      await giftCardsApi.create({
        issued_to_name: form.issued_to_name.trim(),
        issued_to_email: form.issued_to_email.trim(),
        purchased_by_name: form.purchased_by_name.trim(),
        purchased_by_phone: form.purchased_by_phone.trim(),
        payment_type: form.payment_type,
        value,
        balance: value,
        code,
        is_active: true,
        expires_at: form.expires_at || null,
      })
      onSuccess()
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Failed to create gift card')
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 420 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>New Gift Card</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', fontWeight: 700, marginBottom: 8 }}>Recipient</div>
          <div className="field">
            <label>Issued To (Name) *</label>
            <input value={form.issued_to_name} onChange={e => set('issued_to_name', e.target.value)} placeholder="Recipient name" />
          </div>
          <div className="field">
            <label>Issued To (Email)</label>
            <input type="email" value={form.issued_to_email} onChange={e => set('issued_to_email', e.target.value)} placeholder="Recipient email (optional)" />
          </div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', fontWeight: 700, marginBottom: 8, marginTop: 4 }}>Purchased By</div>
          <div className="field">
            <label>Purchaser Name</label>
            <input value={form.purchased_by_name} onChange={e => set('purchased_by_name', e.target.value)} placeholder="Name of person buying the card" />
          </div>
          <div className="field">
            <label>Purchaser Phone / Contact</label>
            <input value={form.purchased_by_phone} onChange={e => set('purchased_by_phone', e.target.value)} placeholder="Phone or contact" />
          </div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', fontWeight: 700, marginBottom: 8, marginTop: 4 }}>Payment</div>
          <div className="field">
            <label>Amount ($) *</label>
            <input type="number" min="0" step="0.01" value={form.value} onChange={e => set('value', e.target.value)} placeholder="0.00" />
          </div>
          <div className="field">
            <label>Payment Method</label>
            <select value={form.payment_type} onChange={e => set('payment_type', e.target.value)}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="eftpos">EFTPOS</option>
            </select>
          </div>
          <div className="field">
            <label>Expiry Date (optional)</label>
            <input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} />
          </div>
          {err && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-lime btn-sm" disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : 'Create'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminBilling() {
  const [tab, setTab] = useState('outstanding')
  const { data: paymentsData, loading: loadingPayments, refetch: refetchPayments } = useApi(() => payments.list())
  const { data: plansData, loading: loadingPlans, refetch: refetchPlans } = useApi(() => payments.plans.list())
  const { data: studentsData } = useApi(() => users.list({ role: 'student' }))
  const { data: gcData, loading: loadingGC, refetch: refetchGC } = useApi(() => giftCardsApi.list())
  const [balances, setBalances] = useState({})
  const [loadingBal, setLoadingBal] = useState(false)
  const [activeModal, setActiveModal] = useState(null)
  const [modalStudent, setModalStudent] = useState(null)
  const [addChargeTarget, setAddChargeTarget] = useState(null)
  const [chargePickStudent, setChargePickStudent] = useState('')
  const [gcModal, setGcModal] = useState(false)
  const [drawerStudent, setDrawerStudent] = useState(null)
  const [noShowSelected, setNoShowSelected] = useState(new Set())
  const [chargingNoShows, setChargingNoShows] = useState(false)

  const allPayments = paymentsData?.results || []
  const plans = plansData?.results || []
  const students = studentsData?.results || []
  const giftCardList = gcData?.results || gcData || []

  useEffect(() => {
    if (students.length === 0) return
    setLoadingBal(true)
    const map = {}
    Promise.all(students.map(async s => {
      try {
        const res = await payments.balance(s.id)
        map[s.id] = { ...res.data, name: s.display_name, email: s.email, id: s.id, first_name: s.first_name }
      } catch { map[s.id] = { balance: '0', name: s.display_name, id: s.id, first_name: s.first_name } }
    })).then(() => { setBalances(map); setLoadingBal(false) })
  }, [students.length])

  async function chargeNoShowNow(p) {
    try {
      await payments.create({ student: p.student, payment_type: 'payment', amount: p.amount, description: `No-show fee paid — ${p.description || ''}`.trim() })
      refetchPayments()
      setNoShowSelected(prev => { const next = new Set(prev); next.delete(p.id); return next })
    } catch { /* non-critical */ }
  }

  async function chargeAllSelectedNoShows() {
    setChargingNoShows(true)
    const toCharge = allPayments.filter(p => p.payment_type === 'no_show_fee' && noShowSelected.has(p.id))
    await Promise.allSettled(toCharge.map(p => chargeNoShowNow(p)))
    setNoShowSelected(new Set())
    setChargingNoShows(false)
  }

  const owing = Object.values(balances).filter(b => parseFloat(b.balance) < 0)
  owing.sort((a, b) => parseFloat(a.balance) - parseFloat(b.balance))

  const totalOutstanding = owing.reduce((s, b) => s + Math.abs(parseFloat(b.balance)), 0)
  const totalPaid = allPayments.filter(p => p.payment_type === 'payment').reduce((s, p) => s + parseFloat(p.amount || 0), 0)
  const noShowFees = allPayments.filter(p => p.payment_type === 'no_show_fee').reduce((s, p) => s + parseFloat(p.amount || 0), 0)
  const activePlans = plans.filter(p => p.status === 'active')

  const history = [...allPayments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Billing</div>
          <div className="page-sub">Invoices, payments and fees</div>
        </div>
        {tab === 'giftcards' ? (
          <button className="btn btn-lime btn-sm" onClick={() => setGcModal(true)}>+ New Gift Card</button>
        ) : (
          <button className="btn btn-lime btn-sm" onClick={() => setAddChargeTarget('pick')}>+ Add Charge</button>
        )}
      </div>

      <div className="kpi-grid">
        <div className="kpi kpi-red">
          <div className="kpi-label">Total Outstanding</div>
          <div className="kpi-value">${totalOutstanding.toFixed(0)}</div>
          <div className="kpi-sub">{owing.length} students owing</div>
        </div>
        <div className="kpi kpi-lime">
          <div className="kpi-label">Total Paid (All Time)</div>
          <div className="kpi-value">${totalPaid.toFixed(0)}</div>
          <div className="kpi-sub">All payment receipts</div>
        </div>
        <div className="kpi kpi-amber">
          <div className="kpi-label">No-show Fees</div>
          <div className="kpi-value">${noShowFees.toFixed(0)}</div>
          <div className="kpi-sub">Total charged</div>
        </div>
        <div className="kpi kpi-lav">
          <div className="kpi-label">Active Plans</div>
          <div className="kpi-value">{activePlans.length}</div>
          <div className="kpi-sub">Payment plans running</div>
        </div>
      </div>

      <div className="subtabs">
        {[['outstanding', 'Outstanding'], ['plans', 'Payment Plans'], ['history', 'History'], ['noshows', 'No-show Fees'], ['giftcards', 'Gift Cards']].map(([key, label]) => (
          <div key={key} className={`subtab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</div>
        ))}
      </div>

      {tab === 'outstanding' && (
        <div>
          {loadingBal ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : owing.length === 0 ? (
            <div className="empty-state">No outstanding balances</div>
          ) : (
            <div className="tbl-section">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Owing</th>
                    <th>Total Charged</th>
                    <th>Total Paid</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {owing.map(b => (
                    <tr key={b.name} className="clickable" onClick={() => setDrawerStudent(b)}>
                      <td>
                        <b>{b.name}</b>
                        {b.email && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{b.email}</div>}
                      </td>
                      <td className="bal-neg">${Math.abs(parseFloat(b.balance)).toFixed(2)}</td>
                      <td style={{ color: 'var(--grey)' }}>${parseFloat(b.total_charged || 0).toFixed(2)}</td>
                      <td className="bal-pos">${parseFloat(b.total_paid || 0).toFixed(2)}</td>
                      <td style={{ whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-ghost btn-xs" style={{ marginRight: 4 }} onClick={() => { setModalStudent(b); setActiveModal('chase') }}>Chase</button>
                        <button className="btn btn-ghost btn-xs" style={{ marginRight: 4 }} onClick={() => { setModalStudent(b); setActiveModal('waive') }}>Waive</button>
                        <button className="btn btn-lime btn-xs" onClick={() => { setModalStudent(b); setActiveModal('payment') }}>Take Payment</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'plans' && (
        <div>
          {loadingPlans ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : (
            <>
              {/* Plan KPI cards */}
              {(() => {
                const activePlanCount = plans.filter(p => p.status === 'active').length
                const pendingApprovalCount = plans.filter(p => p.status === 'pending_approval').length
                const overdueCount = plans.reduce((sum, p) => sum + (p.instalments || []).filter(i => i.status === 'overdue').length, 0)
                const now = new Date()
                const thisMonth = plans.reduce((sum, p) => {
                  return sum + (p.instalments || []).filter(i => {
                    if (i.status !== 'paid' || !i.paid_at) return false
                    const d = new Date(i.paid_at)
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
                  }).reduce((s, i) => s + parseFloat(i.amount || 0), 0)
                }, 0)
                return (
                  <div className="kpi-grid" style={{ marginBottom: 24 }}>
                    <div className="kpi kpi-lime">
                      <div className="kpi-label">Active Plans</div>
                      <div className="kpi-value">{activePlanCount}</div>
                    </div>
                    <div className="kpi kpi-amber">
                      <div className="kpi-label">Pending Approval</div>
                      <div className="kpi-value">{pendingApprovalCount}</div>
                    </div>
                    <div className="kpi kpi-red">
                      <div className="kpi-label">Overdue Instalments</div>
                      <div className="kpi-value">{overdueCount}</div>
                    </div>
                    <div className="kpi kpi-lav">
                      <div className="kpi-label">Collected This Month</div>
                      <div className="kpi-value">${thisMonth.toFixed(0)}</div>
                    </div>
                  </div>
                )
              })()}

              {/* Pending Approval subsection */}
              {plans.filter(p => p.status === 'pending_approval').length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--amber)', fontWeight: 700, marginBottom: 12 }}>Pending Approval</div>
                  <div className="tbl-section">
                    <table>
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Description</th>
                          <th>Total</th>
                          <th>Instalments</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plans.filter(p => p.status === 'pending_approval').map(plan => {
                          const instCount = (plan.instalments || []).length
                          const instAmt = instCount > 0
                            ? (parseFloat(plan.total_amount || 0) / instCount).toFixed(0)
                            : '—'
                          return (
                            <tr key={plan.id}>
                              <td><b>{plan.student_name || plan.student}</b></td>
                              <td style={{ color: 'var(--grey)' }}>{plan.description || 'Payment plan'}</td>
                              <td>${parseFloat(plan.total_amount || 0).toFixed(2)}</td>
                              <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                                {instCount > 0 ? `${instCount}× instalments of $${instAmt}` : '—'}
                              </td>
                              <td style={{ whiteSpace: 'nowrap' }}>
                                <button
                                  className="btn btn-lime btn-sm"
                                  style={{ marginRight: 6 }}
                                  onClick={() => payments.plans.update(plan.id, { status: 'active' }).then(refetchPlans)}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => payments.plans.update(plan.id, { status: 'cancelled' }).then(refetchPlans)}
                                >
                                  Deny &amp; Contact
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {plans.filter(p => p.status !== 'pending_approval').length === 0 && plans.length === 0 ? (
                <div className="empty-state">No payment plans</div>
              ) : (
                <div className="tbl-section">
                  <table>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Description</th>
                        <th>Total</th>
                        <th>Paid</th>
                        <th>Remaining</th>
                        <th>Next Due</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plans.map(plan => {
                        const paid = parseFloat(plan.amount_paid || 0)
                        const total = parseFloat(plan.total_amount || 0)
                        const remaining = total - paid
                        const pendingInstalments = (plan.instalments || []).filter(i => i.status === 'pending' || i.status === 'overdue')
                        const nextDueDate = pendingInstalments.length > 0
                          ? [...pendingInstalments].sort((a, b) => a.due_date.localeCompare(b.due_date))[0].due_date
                          : null
                        return (
                          <tr key={plan.id}>
                            <td><b>{plan.student_name || plan.student}</b></td>
                            <td style={{ color: 'var(--grey)' }}>{plan.description || 'Payment plan'}</td>
                            <td>${total.toFixed(2)}</td>
                            <td className="bal-pos">${paid.toFixed(2)}</td>
                            <td className={remaining > 0 ? 'bal-neg' : 'bal-pos'}>${remaining.toFixed(2)}</td>
                            <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                              {nextDueDate ? new Date(nextDueDate + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}
                            </td>
                            <td>
                              <span className={`tag ${plan.status === 'active' ? 'tag-lime' : plan.status === 'completed' ? 'tag-grey' : 'tag-amber'}`} style={{ fontSize: 10 }}>
                                {plan.status}
                              </span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {plan.status === 'active' && (
                                <button
                                  className="btn btn-ghost btn-xs"
                                  onClick={() => payments.plans.update(plan.id, { status: 'completed' }).then(refetchPlans)}
                                >
                                  Record Payment
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                      {plans.length === 0 && (
                        <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--grey)', padding: '24px 0' }}>No payment plans</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div>
          {loadingPayments ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : history.length === 0 ? (
            <div className="empty-state">No payment history</div>
          ) : (
            <div className="tbl-section">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Student</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(p => {
                    const isPayment = p.payment_type === 'payment'
                    const isCharge = p.payment_type === 'charge' || p.payment_type === 'no_show_fee'
                    return (
                      <tr key={p.id}>
                        <td style={{ color: 'var(--grey)', whiteSpace: 'nowrap' }}>
                          {new Date(p.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td><b>{p.student_name || '—'}</b></td>
                        <td style={{ color: 'var(--grey)' }}>{p.description || p.payment_type}</td>
                        <td>
                          <span className={`tag ${isPayment ? 'tag-lime' : isCharge ? 'tag-red' : 'tag-grey'}`} style={{ fontSize: 10 }}>
                            {p.payment_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className={isPayment ? 'bal-pos' : isCharge ? 'bal-neg' : ''}>
                          {isCharge ? '-' : '+'}${Math.abs(parseFloat(p.amount || 0)).toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'noshows' && (() => {
        const noShows = allPayments.filter(p => p.payment_type === 'no_show_fee')
        const allIds = noShows.map(p => p.id)
        const allSelected = allIds.length > 0 && allIds.every(id => noShowSelected.has(id))
        return (
          <div>
            {noShows.length > 0 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <button className="btn btn-ghost btn-xs" onClick={() => setNoShowSelected(allSelected ? new Set() : new Set(allIds))}>
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
                {noShowSelected.size > 0 && (
                  <button className="btn btn-lime btn-xs" onClick={chargeAllSelectedNoShows} disabled={chargingNoShows}>
                    {chargingNoShows ? 'Charging…' : `Charge All (${noShowSelected.size})`}
                  </button>
                )}
                {noShowSelected.size > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--grey)' }}>{noShowSelected.size} selected</span>
                )}
              </div>
            )}
            <div className="tbl-section">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 32 }}></th>
                    <th>Date</th>
                    <th>Student</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {noShows.map(p => (
                    <tr key={p.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={noShowSelected.has(p.id)}
                          onChange={() => setNoShowSelected(prev => {
                            const next = new Set(prev)
                            next.has(p.id) ? next.delete(p.id) : next.add(p.id)
                            return next
                          })}
                          style={{ accentColor: 'var(--lime)' }}
                        />
                      </td>
                      <td style={{ color: 'var(--grey)', whiteSpace: 'nowrap' }}>
                        {new Date(p.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </td>
                      <td><b>{p.student_name || '—'}</b></td>
                      <td style={{ color: 'var(--grey)' }}>{p.description || 'No-show fee'}</td>
                      <td className="bal-neg">${parseFloat(p.amount || 0).toFixed(2)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-ghost btn-xs"
                          style={{ marginRight: 4 }}
                          onClick={() => {
                            const s = { id: p.student, name: p.student_name, balance: `-${p.amount}` }
                            setModalStudent(s)
                            setActiveModal('waive')
                          }}
                        >Waive</button>
                        <button className="btn btn-lime btn-xs" onClick={() => chargeNoShowNow(p)}>
                          Charge Now
                        </button>
                      </td>
                    </tr>
                  ))}
                  {noShows.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--grey)', padding: '24px 0' }}>No no-show fees</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {tab === 'giftcards' && (
        <div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
            <div className="kpi kpi-lime" style={{ flex: 1 }}>
              <div className="kpi-label">Total Issued</div>
              <div className="kpi-value">{giftCardList.length}</div>
            </div>
            <div className="kpi kpi-lav" style={{ flex: 1 }}>
              <div className="kpi-label">Active Cards</div>
              <div className="kpi-value">{giftCardList.filter(g => g.is_active).length}</div>
            </div>
            <div className="kpi kpi-amber" style={{ flex: 1 }}>
              <div className="kpi-label">Total Value Remaining</div>
              <div className="kpi-value">${giftCardList.reduce((s, g) => s + parseFloat(g.balance || 0), 0).toFixed(0)}</div>
            </div>
          </div>
          <div className="tbl-section">
            <table>
              <thead><tr><th>Code</th><th>Issued To</th><th>Purchased By</th><th>Payment</th><th>Value</th><th>Balance</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {loadingGC && <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--grey)' }}>Loading…</td></tr>}
                {!loadingGC && giftCardList.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--grey)', padding: 32 }}>No gift cards yet</td></tr>
                )}
                {giftCardList.map(g => (
                  <tr key={g.id}>
                    <td><code style={{ fontSize: 12, color: 'var(--lime)' }}>{g.code}</code></td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{g.issued_to_name || '—'}</div>
                      {g.issued_to_email && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{g.issued_to_email}</div>}
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>{g.purchased_by_name || '—'}</div>
                      {g.purchased_by_phone && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{g.purchased_by_phone}</div>}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase' }}>{g.payment_type || '—'}</td>
                    <td>${parseFloat(g.value).toFixed(2)}</td>
                    <td style={{ color: parseFloat(g.balance) > 0 ? 'var(--lime)' : 'var(--grey)' }}>${parseFloat(g.balance).toFixed(2)}</td>
                    <td style={{ fontSize: 12, color: 'var(--grey)' }}>{g.expires_at ? new Date(g.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No expiry'}</td>
                    <td><span className={`tag ${g.is_active ? 'tag-lime' : 'tag-grey'}`} style={{ fontSize: 10 }}>{g.is_active ? 'Active' : 'Used'}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-xs" onClick={() => giftCardsApi.update(g.id, { is_active: !g.is_active }).then(refetchGC)}>
                        {g.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeModal === 'payment' && modalStudent && (
        <TakePaymentModal
          student={modalStudent}
          onClose={() => { setActiveModal(null); setModalStudent(null) }}
          onSuccess={() => { setActiveModal(null); setModalStudent(null); refetchPayments() }}
        />
      )}
      {activeModal === 'charge' && modalStudent && (
        <AddChargeModal
          student={modalStudent}
          onClose={() => { setActiveModal(null); setModalStudent(null) }}
          onSuccess={() => { setActiveModal(null); setModalStudent(null); refetchPayments() }}
        />
      )}
      {activeModal === 'chase' && modalStudent && (
        <ChaseModal
          student={modalStudent}
          amount={Math.abs(parseFloat(modalStudent.balance || 0)).toFixed(2)}
          description="outstanding balance"
          onClose={() => { setActiveModal(null); setModalStudent(null) }}
          onSuccess={() => { setActiveModal(null); setModalStudent(null); refetchPayments() }}
        />
      )}
      {activeModal === 'waive' && modalStudent && (
        <WaiveModal
          student={modalStudent}
          amount={Math.abs(parseFloat(modalStudent.balance || 0)).toFixed(2)}
          description="outstanding balance"
          onClose={() => { setActiveModal(null); setModalStudent(null) }}
          onSuccess={() => { setActiveModal(null); setModalStudent(null); refetchPayments() }}
        />
      )}

      {drawerStudent && (
        <StudentDrawer
          student={drawerStudent}
          onClose={() => setDrawerStudent(null)}
          onAction={(type) => { const s = drawerStudent; setDrawerStudent(null); setModalStudent(s); setActiveModal(type) }}
        />
      )}

      {gcModal && (
        <GiftCardModal
          onClose={() => setGcModal(false)}
          onSuccess={() => { setGcModal(false); refetchGC() }}
        />
      )}

      {addChargeTarget === 'pick' && (
        <div className="sd-overlay" onClick={e => e.target === e.currentTarget && setAddChargeTarget(null)}>
          <div className="sd-modal" style={{ maxWidth: 360 }}>
            <div className="sd-header">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>Add Charge</div>
              <button className="modal-close-btn" onClick={() => setAddChargeTarget(null)}>✕</button>
            </div>
            <div className="sd-body">
              <div className="field">
                <label>Select Student</label>
                <select value={chargePickStudent} onChange={e => setChargePickStudent(e.target.value)}>
                  <option value="">— Choose student —</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setAddChargeTarget(null)}>Cancel</button>
                <button className="btn btn-lime btn-sm" disabled={!chargePickStudent} onClick={() => {
                  const s = students.find(x => x.id === parseInt(chargePickStudent) || x.id === chargePickStudent)
                  setModalStudent(s); setActiveModal('charge'); setAddChargeTarget(null); setChargePickStudent('')
                }}>Next</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
