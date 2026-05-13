import { useState, useEffect } from 'react'
import { useApi } from '../../hooks/useApi'
import { payments, users } from '../../api'
import TakePaymentModal from '../../components/TakePaymentModal'
import AddChargeModal from '../../components/AddChargeModal'
import ChaseModal from '../../components/ChaseModal'
import WaiveModal from '../../components/WaiveModal'

export default function AdminBilling() {
  const [tab, setTab] = useState('outstanding')
  const { data: paymentsData, loading: loadingPayments, refetch: refetchPayments } = useApi(() => payments.list())
  const { data: plansData, loading: loadingPlans } = useApi(() => payments.plans())
  const { data: studentsData } = useApi(() => users.list({ role: 'student' }))
  const [balances, setBalances] = useState({})
  const [loadingBal, setLoadingBal] = useState(false)
  const [activeModal, setActiveModal] = useState(null)
  const [modalStudent, setModalStudent] = useState(null)
  const [addChargeTarget, setAddChargeTarget] = useState(null)
  const [chargePickStudent, setChargePickStudent] = useState('')

  const allPayments = paymentsData?.results || []
  const plans = plansData?.results || []
  const students = studentsData?.results || []

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
        <button className="btn btn-lime btn-sm" onClick={() => setAddChargeTarget('pick')}>+ Add Charge</button>
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
        {[['outstanding', 'Outstanding'], ['plans', 'Payment Plans'], ['history', 'History'], ['noshows', 'No-show Fees']].map(([key, label]) => (
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
                    <tr key={b.name} className="clickable">
                      <td>
                        <b>{b.name}</b>
                        {b.email && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{b.email}</div>}
                      </td>
                      <td className="bal-neg">${Math.abs(parseFloat(b.balance)).toFixed(2)}</td>
                      <td style={{ color: 'var(--grey)' }}>${parseFloat(b.total_charged || 0).toFixed(2)}</td>
                      <td className="bal-pos">${parseFloat(b.total_paid || 0).toFixed(2)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-ghost btn-xs" style={{ marginRight: 4 }} onClick={() => { setModalStudent(b); setActiveModal('chase') }}>Chase</button>
                        <button className="btn btn-ghost btn-xs" style={{ marginRight: 4 }} onClick={() => { setModalStudent(b); setActiveModal('waive') }}>Waive</button>
                        <button className="btn btn-lime btn-xs" onClick={() => { setModalStudent(b); setActiveModal('payment') }}>Mark Paid</button>
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
          ) : plans.length === 0 ? (
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
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map(plan => {
                    const paid = parseFloat(plan.amount_paid || 0)
                    const total = parseFloat(plan.total_amount || 0)
                    const remaining = total - paid
                    return (
                      <tr key={plan.id}>
                        <td><b>{plan.student_name || plan.student}</b></td>
                        <td style={{ color: 'var(--grey)' }}>{plan.description || 'Payment plan'}</td>
                        <td>${total.toFixed(2)}</td>
                        <td className="bal-pos">${paid.toFixed(2)}</td>
                        <td className={remaining > 0 ? 'bal-neg' : 'bal-pos'}>${remaining.toFixed(2)}</td>
                        <td>
                          <span className={`tag ${plan.status === 'active' ? 'tag-lime' : plan.status === 'completed' ? 'tag-grey' : 'tag-amber'}`} style={{ fontSize: 10 }}>
                            {plan.status}
                          </span>
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

      {tab === 'noshows' && (
        <div>
          <div className="tbl-section">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {allPayments.filter(p => p.payment_type === 'no_show_fee').map(p => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--grey)', whiteSpace: 'nowrap' }}>
                      {new Date(p.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </td>
                    <td><b>{p.student_name || '—'}</b></td>
                    <td style={{ color: 'var(--grey)' }}>{p.description || 'No-show fee'}</td>
                    <td className="bal-neg">${parseFloat(p.amount || 0).toFixed(2)}</td>
                    <td><span className="tag tag-red" style={{ fontSize: 10 }}>Charged</span></td>
                  </tr>
                ))}
                {allPayments.filter(p => p.payment_type === 'no_show_fee').length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--grey)', padding: '24px 0' }}>No no-show fees</td></tr>
                )}
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
