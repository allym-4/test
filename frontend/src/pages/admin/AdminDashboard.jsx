import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { classes, payments, enrolments, orders, notifications, settings as settingsApi, users } from '../../api'
import client from '../../api/client'
import '../StudentsPage.css'

function todayLabel() {
  return new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function fmtTime(str) {
  if (!str) return '—'
  return str.slice(0, 5)
}

function nextDue(plan) {
  const pending = plan.instalments?.filter(i => i.status === 'pending' || i.status === 'overdue')
  if (!pending?.length) return '—'
  const sorted = [...pending].sort((a, b) => a.due_date.localeCompare(b.due_date))
  return new Date(sorted[0].due_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

const subsectionLabel = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 600,
  marginBottom: 8,
}

function ConvertTrialModal({ enrolment: e, onClose, onSuccess }) {
  const { data: studioData } = useApi(() => settingsApi.get(), [])
  const studio = studioData?.data || studioData || {}
  const seasonPrice = parseFloat(studio.price_season || 270)
  const trialPrice = parseFloat(studio.price_trial || 35)
  const defaultAmount = Math.max(0, seasonPrice - trialPrice).toFixed(2)
  const [amount, setAmount] = useState('')
  const [paymentType, setPaymentType] = useState('payment')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const amountVal = amount !== '' ? amount : defaultAmount

  async function handleSubmit(ev) {
    ev.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await enrolments.convertTrial(e.id, {
        amount_paid: parseFloat(amountVal),
        payment_type: paymentType,
        reference,
        description: `Season enrolment — ${e.class_name || 'class'} (converted from trial)`,
      })
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || 'Conversion failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={ev => ev.target === ev.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 420 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Convert Trial → Full</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit}>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
            <b style={{ color: 'var(--white)' }}>{e.student_name}</b> · {e.class_name || '—'}
          </div>
          <div style={{ background: '#111', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--grey)', marginBottom: 14 }}>
            Season ${seasonPrice.toFixed(2)} − trial ${trialPrice.toFixed(2)} = <b style={{ color: 'var(--lime)' }}>${defaultAmount} remaining</b>
          </div>
          {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</div>}
          <div className="field"><label>Amount ($)</label><input type="number" step="0.01" min="0" value={amountVal} onChange={ev => setAmount(ev.target.value)} /></div>
          <div className="field"><label>Payment type</label>
            <select value={paymentType} onChange={ev => setPaymentType(ev.target.value)}>
              <option value="payment">Payment received</option>
              <option value="charge">Charge (invoice / owing)</option>
            </select>
          </div>
          <div className="field"><label>Reference <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(optional)</span></label><input value={reference} onChange={ev => setReference(ev.target.value)} placeholder="cash, Square #, etc." /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Converting…' : `Confirm $${parseFloat(amountVal || 0).toFixed(2)}`}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [actionItemsVisible, setActionItemsVisible] = useState(true)
  const [checkedItems, setCheckedItems] = useState({})
  const [confirmCancelId, setConfirmCancelId] = useState(null)
  const [convertTrialEnrol, setConvertTrialEnrol] = useState(null)

  const { data: sessionsData } = useApi(() => classes.list({ active: 'true' }))
  const { data: dashData, refetch: refetchDash } = useApi(() => payments.dashboard())
  const { data: plansData, refetch: refetchPlans } = useApi(() => payments.plans.list())
  const { data: pendingOrdersData } = useApi(() => orders.list({ status: 'pending' }))
  const { data: trialsData } = useApi(() => enrolments.list({ enrolment_type: 'trial' }))
  const { data: pendingPlansData, refetch: refetchPendingPlans } = useApi(() => payments.plans.list({ status: 'pending_approval' }))
  const { data: exemptionData, refetch: refetchExemptions } = useApi(() => enrolments.list({ status: 'exemption_requested' }))
  const { data: trialsAndCasualsData, refetch: refetchTrialsAndCasuals } = useApi(() => enrolments.list({ enrolment_type: 'trial,casual' }))
  const { data: flaggedData, refetch: refetchFlagged } = useApi(() => enrolments.flagged())
  const { data: recheckNotesData } = useApi(() => users.recheckNotesToday())

  const sessions = sessionsData?.results || []
  const plans = plansData?.results || plansData || []
  const pendingOrders = pendingOrdersData?.results || pendingOrdersData || []
  const trials = trialsData?.results || trialsData || []
  const pendingPlans = pendingPlansData?.results || pendingPlansData || []
  const exemptions = exemptionData?.results || exemptionData || []
  const trialsAndCasuals = trialsAndCasualsData?.results || trialsAndCasualsData || []
  const flaggedEnrolments = flaggedData?.results || flaggedData || []
  const recheckNotes = recheckNotesData || []

  const todayDow = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  const todaySessions = sessions.filter(s => s.day_of_week === todayDow)

  const todayStr = new Date().toISOString().slice(0, 10)

  // Server-side accurate stats
  const todayRevenue = dashData?.today_revenue ?? 0
  const weekBookings = dashData?.week_bookings ?? 0
  const overdueBalances = dashData?.overdue_balances ?? []
  const outstandingBalance = dashData?.outstanding_balance ?? 0
  const recentPayments = dashData?.recent_payments ?? []
  const activeStudentCount = dashData?.active_student_count ?? null

  const upcomingTrialsCasuals = trialsAndCasuals
    .filter(e => {
      const d = new Date(e.date || e.created_at)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 3)
      return d >= cutoff
    })
    .sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at))

  const todayTrials = trials.filter(e => e.created_at?.slice(0, 10) === todayStr || e.date?.slice(0, 10) === todayStr)

  async function approvePlan(plan) {
    await payments.plans.update(plan.id, { status: 'active' })
    refetchPendingPlans()
    refetchPlans()
  }

  async function denyPlan(plan) {
    await payments.plans.update(plan.id, { status: 'cancelled' })
    refetchPendingPlans()
  }

  async function approveExemption(enrolment) {
    await enrolments.update(enrolment.id, { status: 'active' })
    refetchExemptions()
  }

  async function declineExemption(enrolment) {
    await enrolments.update(enrolment.id, { status: 'cancelled' })
    refetchExemptions()
  }

  async function upsertOccurrence(session, fields) {
    const today = new Date().toISOString().slice(0, 10)
    const res = await client.get('/api/classes/occurrences/', { params: { session: session.id, date: today } })
    const existing = (res.data?.results || res.data || [])[0]
    if (existing) {
      await client.patch(`/api/classes/occurrences/${existing.id}/`, fields)
    } else {
      await client.post('/api/classes/occurrences/', { session: session.id, date: today, ...fields })
    }
  }

  async function coverSession(session) {
    await upsertOccurrence(session, { cover_needed: true })
  }

  async function cancelSession(session) {
    await upsertOccurrence(session, { status: 'cancelled' })
    setConfirmCancelId(null)
  }

  async function chasePayment(studentId) {
    try {
      await notifications.send(studentId, 'Outstanding balance reminder', 'You have an outstanding balance. Please contact the studio to arrange payment.')
    } catch { /* non-critical */ }
  }

  async function sendWelcome(studentId) {
    try {
      await notifications.send(studentId, 'Welcome to Duality!', "We're excited to have you. Check your inbox for your intro email.")
    } catch { /* non-critical */ }
  }

  async function chaseWaiver(studentId) {
    try {
      await notifications.send(studentId, 'Waiver reminder', 'Please complete and sign your studio waiver before your first class.')
    } catch { /* non-critical */ }
  }

  async function markIntroSent(enrolment) {
    try {
      await enrolments.update(enrolment.id, { intro_email_sent: true })
      refetchTrialsAndCasuals()
    } catch { /* non-critical */ }
  }

  async function markWaiverSigned(enrolment) {
    try {
      await enrolments.update(enrolment.id, { waiver_signed: true })
      refetchTrialsAndCasuals()
    } catch { /* non-critical */ }
  }

  const actionItems = [
    ...pendingOrders.map(o => ({
      id: `order-${o.id}`,
      dot: 'var(--lav)',
      title: 'New order for pickup',
      sub: o.student_name || o.product_name || 'Retail order',
      time: fmtDate(o.created_at),
      urgent: false,
    })),
    ...todayTrials.map(e => ({
      id: `trial-${e.id}`,
      dot: 'var(--lime)',
      title: 'New student coming today',
      sub: e.student_name || 'Trial student',
      time: fmtTime(e.class_time || e.start_time),
      urgent: false,
    })),
    ...pendingPlans.map(p => ({
      id: `plan-${p.id}`,
      dot: 'var(--amber)',
      title: 'Payment exemption request',
      sub: p.student_name || 'Student',
      time: fmtDate(p.created_at),
      urgent: false,
    })),
    ...recheckNotes.map(n => ({
      id: `recheck-${n.id}`,
      dot: n.tag === 'injury' ? 'var(--red)' : 'var(--lav)',
      title: `Follow-up needed${n.tag ? ` · ${n.tag}` : ''}`,
      sub: `${n.student_name} — ${n.body.slice(0, 60)}${n.body.length > 60 ? '…' : ''}`,
      time: 'Today',
      urgent: n.tag === 'injury',
      link: `/admin/students/${n.student_id}`,
    })),
  ]

  const activePlans = plans.filter(p => p.status === 'active')
  const overduePlans = activePlans.filter(p => p.instalments?.some(i => i.status === 'overdue'))
  const onTrackPlans = activePlans.filter(p => !p.instalments?.some(i => i.status === 'overdue'))

  const toggleCheck = (id) => setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }))

  const pendingActionsCount = exemptions.length + pendingPlans.length

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">{todayLabel()}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: actionItemsVisible ? 12 : 0 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14 }}>Today's Action Items</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Link to="/admin/activity-log">
              <button className="btn btn-ghost btn-xs">VIEW LOG</button>
            </Link>
            <Link to="/admin/activity-log"><button className="btn btn-ghost btn-xs">+ ADD</button></Link>
            <button className="btn btn-ghost btn-xs" onClick={() => setActionItemsVisible(v => !v)}>
              {actionItemsVisible ? 'HIDE' : 'SHOW'}
            </button>
          </div>
        </div>

        {actionItemsVisible && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {actionItems.length === 0 ? (
              <div style={{ color: 'var(--grey)', fontSize: 13, padding: '12px 0', textAlign: 'center' }}>
                No action items — you're all caught up
              </div>
            ) : actionItems.map(item => (
              <div
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '8px 6px', borderRadius: 8, cursor: 'pointer',
                  opacity: checkedItems[item.id] ? 0.4 : 1,
                  transition: 'opacity 0.15s',
                  background: checkedItems[item.id] ? 'transparent' : 'rgba(255,255,255,0.02)',
                }}
              >
                <input
                  type="checkbox"
                  checked={!!checkedItems[item.id]}
                  onChange={() => toggleCheck(item.id)}
                  onClick={e => e.stopPropagation()}
                  style={{ accentColor: 'var(--lime)', flexShrink: 0, marginTop: 3 }}
                />
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                  background: item.dot,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    textDecoration: checkedItems[item.id] ? 'line-through' : 'none',
                  }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{item.sub}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--grey)', flexShrink: 0, paddingTop: 2 }}>{item.time}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="kpi-grid">
        <div className="kpi kpi-lime">
          <div className="kpi-label">Today's Revenue</div>
          <div className="kpi-value">${todayRevenue.toFixed(0)}</div>
          <div className="kpi-sub">Payments received today</div>
        </div>
        <div className="kpi kpi-lav">
          <div className="kpi-label">This Week's Bookings</div>
          <div className="kpi-value">{weekBookings}</div>
          <div className="kpi-sub">Enrolments this week</div>
        </div>
        <Link to="/admin/billing" style={{ textDecoration: 'none' }}>
          <div className="kpi kpi-red" style={{ cursor: 'pointer' }}>
            <div className="kpi-label">Outstanding Invoices</div>
            <div className="kpi-value">${outstandingBalance.toFixed(0)}</div>
            <div className="kpi-sub">Total unpaid balance · See all →</div>
          </div>
        </Link>
        <Link to="/admin/students" style={{ textDecoration: 'none' }}>
          <div className="kpi kpi-amber" style={{ cursor: 'pointer' }}>
            <div className="kpi-label">Active Students</div>
            <div className="kpi-value">{activeStudentCount ?? '…'}</div>
            <div className="kpi-sub">Students with active accounts · See all →</div>
          </div>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div>
          <div className="section-title" style={{ fontSize: 14, marginBottom: 12 }}>Today's Classes</div>
          {todaySessions.length === 0 ? (
            <div style={{ color: 'var(--grey)', fontSize: 13, padding: '20px 0' }}>No classes today</div>
          ) : (
            <div className="tbl-section">
              <table>
                <thead>
                  <tr>
                    <th>CLASS</th>
                    <th>TIME</th>
                    <th>INSTRUCTOR</th>
                    <th>STUDIO</th>
                    <th>ENROLLED</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {todaySessions.map(s => {
                    const isFull = s.enrolled_count >= s.capacity
                    const isCancelled = s.is_cancelled || s.status === 'cancelled'
                    const instrName = s.instructor_detail?.display_name || s.instructor_detail?.first_name || '—'
                    return (
                      <tr key={s.id}>
                        <td><b>{s.name}</b></td>
                        <td style={{ color: 'var(--grey)' }}>{fmtTime(s.start_time)}</td>
                        <td style={{ color: 'var(--grey)' }}>{instrName}</td>
                        <td style={{ color: 'var(--grey)' }}>{s.studio_detail?.name || '—'}</td>
                        <td>{s.enrolled_count ?? '—'}/{s.capacity ?? '—'}</td>
                        <td>
                          {isCancelled
                            ? <span className="tag tag-red" style={{ fontSize: 10 }}>CANCELLED</span>
                            : isFull
                              ? <span className="tag tag-amber" style={{ fontSize: 10 }}>FULL</span>
                              : <span className="tag tag-lime" style={{ fontSize: 10 }}>ACTIVE</span>
                          }
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <button className="btn btn-ghost btn-xs" onClick={() => coverSession(s)}>COVER</button>
                            {confirmCancelId === s.id ? (
                              <>
                                <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => cancelSession(s)}>Confirm</button>
                                <button className="btn btn-ghost btn-xs" onClick={() => setConfirmCancelId(null)}>No</button>
                              </>
                            ) : (
                              <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => setConfirmCancelId(s.id)}>CANCEL</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <div className="section-title" style={{ fontSize: 14, marginBottom: 12 }}>Recent Activity</div>
          <div className="card" style={{ padding: '8px 14px' }}>
            {recentPayments.length === 0 ? (
              <div style={{ color: 'var(--grey)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No recent activity</div>
            ) : recentPayments.map(p => {
              const isPayment = p.payment_type === 'payment'
              const isCharge = p.payment_type === 'charge' || p.payment_type === 'no_show_fee'
              return (
                <div key={p.id} className="feed-item">
                  <div className={`feed-dot ${isPayment ? 'feed-dot-lime' : isCharge ? 'feed-dot-red' : 'feed-dot-lav'}`} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>
                      <b>{p.student_name || 'Student'}</b> — {p.description || p.payment_type}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>
                      {fmtDate(p.created_at)}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 600, flexShrink: 0,
                    color: isPayment ? 'var(--lime)' : isCharge ? 'var(--red)' : 'var(--grey)',
                  }}>
                    {isCharge ? '-' : '+'}${Math.abs(parseFloat(p.amount || 0)).toFixed(0)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {pendingActionsCount > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div className="section-title" style={{ fontSize: 14, color: 'var(--amber)' }}>Pending Actions</div>
            <span className="tag tag-amber" style={{ fontSize: 10 }}>{pendingActionsCount}</span>
          </div>

          {exemptions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...subsectionLabel, color: 'var(--grey)' }}>
                Catch-up Exemption Requests
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {exemptions.map((e, i) => (
                  <div key={e.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    borderBottom: i < exemptions.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{e.student_name || 'Student'}</div>
                      <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{e.class_name || e.session_name || 'Class'}</div>
                    </div>
                    {e.reason && <span className="tag tag-amber" style={{ fontSize: 10 }}>{e.reason}</span>}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-xs" style={{ color: 'var(--lime)' }} onClick={() => approveExemption(e)}>APPROVE</button>
                      <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => declineExemption(e)}>DECLINE</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingPlans.length > 0 && (
            <div>
              <div style={{ ...subsectionLabel, color: 'var(--grey)' }}>
                Payment Plan Requests
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {pendingPlans.map((p, i) => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    borderBottom: i < pendingPlans.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.student_name || 'Student'}</div>
                      <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{p.description || 'Payment plan'}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>${parseFloat(p.total_amount || 0).toFixed(2)}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey)' }}>{p.instalments?.length ?? '—'} instalments</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-xs" style={{ color: 'var(--lime)' }} onClick={() => approvePlan(p)}>APPROVE</button>
                      <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => denyPlan(p)}>DENY</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="section-title" style={{ fontSize: 14 }}>Outstanding Invoices</div>
          <Link to="/admin/billing" style={{ fontSize: 12, color: 'var(--grey)' }}>SEE ALL →</Link>
        </div>
        {overdueBalances.length === 0 ? (
          <div style={{ color: 'var(--grey)', fontSize: 13, padding: '12px 0' }}>No outstanding invoices</div>
        ) : (
          <div className="tbl-section">
            <table>
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>DESCRIPTION</th>
                  <th>AMOUNT</th>
                  <th>DUE</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {overdueBalances.map(b => (
                  <tr key={b.key}>
                    <td><b>{b.name || '—'}</b></td>
                    <td style={{ color: 'var(--grey)' }}>{b.lastDesc || 'Outstanding balance'}</td>
                    <td style={{ color: 'var(--red)', fontWeight: 600 }}>${b.owing.toFixed(2)}</td>
                    <td style={{ color: 'var(--grey)' }}>{fmtDate(b.lastDate)}</td>
                    <td>
                      <button className="btn btn-ghost btn-xs" onClick={() => b.student_id && chasePayment(b.student_id)}>Chase</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activePlans.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="section-title" style={{ fontSize: 14 }}>Payment Plans</div>
            <Link to="/admin/billing" style={{ fontSize: 12, color: 'var(--grey)' }}>SEE ALL →</Link>
          </div>

          {overduePlans.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ ...subsectionLabel, color: 'var(--red)' }}>Needs Attention</div>
              <div style={{ background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 10, overflow: 'hidden' }}>
                {overduePlans.map((p, i) => {
                  const paid = parseFloat(p.amount_paid || 0)
                  const total = parseFloat(p.total_amount || 0)
                  return (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      borderBottom: i < overduePlans.length - 1 ? '1px solid rgba(255,68,68,0.15)' : 'none',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.student_name || 'Student'}</div>
                        <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{p.description || 'Payment plan'}</div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--grey)' }}>${paid.toFixed(0)} / ${total.toFixed(0)}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey)' }}>Next: {nextDue(p)}</div>
                      <span className="tag tag-red" style={{ fontSize: 10 }}>OVERDUE</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => payments.plans.remind(p.id)}>CHASE</button>
                        <Link to="/admin/billing" className="btn btn-ghost btn-xs">VIEW</Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {onTrackPlans.length > 0 && (
            <div>
              <div style={{ ...subsectionLabel, color: 'var(--grey)' }}>Active & On Track</div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {onTrackPlans.map((p, i) => {
                  const paid = parseFloat(p.amount_paid || 0)
                  const total = parseFloat(p.total_amount || 0)
                  return (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      borderBottom: i < onTrackPlans.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.student_name || 'Student'}</div>
                        <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{p.description || 'Payment plan'}</div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--grey)' }}>${paid.toFixed(0)} / ${total.toFixed(0)}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey)' }}>Next: {nextDue(p)}</div>
                      <span className="tag tag-lime" style={{ fontSize: 10 }}>ON TRACK</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => payments.plans.remind(p.id)}>CHASE</button>
                        <Link to="/admin/billing" className="btn btn-ghost btn-xs">VIEW</Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {flaggedEnrolments.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="section-title" style={{ fontSize: 14, marginBottom: 14 }}>Flagged Enrolments</div>
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10 }}>
            Students can still attend — these are flagged for your awareness. Ignore to clear the flag, or Contact to reach out.
          </div>
          <div className="tbl-section">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Flag Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {flaggedEnrolments.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600 }}>{f.student_name}</td>
                    <td style={{ color: 'var(--grey)', fontSize: 13 }}>{f.session_name}</td>
                    <td style={{ color: 'var(--amber)', fontSize: 13 }}>{f.flag_reason}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={async () => {
                            await enrolments.dismissFlag(f.id)
                            refetchFlagged()
                          }}
                        >Ignore</button>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => navigate(`/admin/students/${f.student_id}`)}
                        >Contact</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {upcomingTrialsCasuals.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="section-title" style={{ fontSize: 14, marginBottom: 14 }}>Upcoming Trials & Casuals</div>
          <div className="tbl-section">
            <table>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>STUDENT</th>
                  <th>CLASS</th>
                  <th>TYPE</th>
                  <th>FIRST TIMER</th>
                  <th>INTRO EMAIL</th>
                  <th>WAIVER</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {upcomingTrialsCasuals.map(e => {
                  const isTrial = e.enrolment_type === 'trial'
                  const isFirstTimer = e.is_first_visit || e.first_timer
                  const introSent = e.intro_email_sent
                  const waiverSigned = e.waiver_signed
                  return (
                    <tr key={e.id}>
                      <td style={{ color: 'var(--grey)', whiteSpace: 'nowrap' }}>{fmtDate(e.date || e.created_at)}</td>
                      <td><b>{e.student_name || '—'}</b></td>
                      <td style={{ color: 'var(--grey)' }}>{e.class_name || e.session_name || '—'}</td>
                      <td>
                        <span className={`tag ${isTrial ? 'tag-lav' : 'tag-amber'}`} style={{ fontSize: 10 }}>
                          {isTrial ? 'TRIAL' : 'CASUAL'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isFirstTimer
                          ? <span style={{ color: 'var(--amber)' }}>★</span>
                          : <span style={{ color: 'var(--grey)' }}>—</span>
                        }
                      </td>
                      <td>
                        {introSent
                          ? <span className="tag tag-lime" style={{ fontSize: 10 }}>SENT</span>
                          : <button className="btn btn-ghost btn-xs" style={{ fontSize: 10 }} onClick={() => { sendWelcome(e.student); markIntroSent(e) }}>SEND NOW</button>
                        }
                      </td>
                      <td>
                        {waiverSigned
                          ? <span className="tag tag-lime" style={{ fontSize: 10 }}>SIGNED</span>
                          : <button className="btn btn-ghost btn-xs" style={{ fontSize: 10, color: 'var(--red)' }} onClick={() => { chaseWaiver(e.student); markWaiverSigned(e) }}>CHASE</button>
                        }
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
                          <Link to="/admin/students" className="btn btn-ghost btn-xs">VIEW</Link>
                          {isTrial && e.status === 'active' && (
                            <button className="btn btn-lime btn-xs" onClick={() => setConvertTrialEnrol(e)}>CONVERT</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {convertTrialEnrol && (
        <ConvertTrialModal
          enrolment={convertTrialEnrol}
          onClose={() => setConvertTrialEnrol(null)}
          onSuccess={() => { setConvertTrialEnrol(null); refetchTrialsAndCasuals() }}
        />
      )}
    </div>
  )
}
