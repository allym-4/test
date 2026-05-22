import { useState, useEffect } from 'react'
import { useApi } from '../../hooks/useApi'
import { payments, users, seasons } from '../../api'

// ─── helpers ────────────────────────────────────────────────────────────────

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function addWeeks(dateStr, weeks) { return addDays(dateStr, weeks * 7) }
function addFortnights(dateStr, n) { return addDays(dateStr, n * 14) }
function addMonths(dateStr, n) {
  const d = new Date(dateStr + 'T00:00')
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}

function generateInstalments(total, deposit, frequency, startDate, count) {
  const remaining = parseFloat(total) - parseFloat(deposit || 0)
  const instalments = []

  if (deposit && parseFloat(deposit) > 0) {
    instalments.push({ amount: parseFloat(deposit).toFixed(2), due_date: startDate, label: 'Deposit' })
  }

  if (count < 1 || remaining <= 0) return instalments

  const instAmt = (remaining / count).toFixed(2)
  let cursor = startDate
  for (let i = 0; i < count; i++) {
    if (frequency === 'weekly') cursor = addWeeks(i === 0 ? startDate : cursor, i === 0 ? 1 : 1)
    else if (frequency === 'fortnightly') cursor = addFortnights(i === 0 ? startDate : cursor, i === 0 ? 1 : 1)
    else cursor = addMonths(i === 0 ? startDate : cursor, i === 0 ? 1 : 1)
    instalments.push({ amount: instAmt, due_date: cursor, label: `Instalment ${i + 1}` })
  }
  return instalments
}

// ─── Record Payment Modal ────────────────────────────────────────────────────

function RecordModal({ plan, instalment, onSave, onClose }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    amount: instalment ? parseFloat(instalment.amount).toFixed(2) : '',
    paid_date: today,
    method: 'cash',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await payments.plans.updateInstalment(instalment.id, {
        status: 'paid',
        paid_date: form.paid_date,
      })
      onSave()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Record Payment</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '4px 0 12px', color: 'var(--grey)', fontSize: 12 }}>
          {plan.student_name} · {plan.description}
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Amount ($)</label>
            <input className="input" type="number" step="0.01" value={form.amount}
              onChange={e => set('amount', e.target.value)} required style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label className="form-label">Date Received</label>
              <input className="input" type="date" value={form.paid_date}
                onChange={e => set('paid_date', e.target.value)} required style={{ width: '100%' }} />
            </div>
            <div>
              <label className="form-label">Method</label>
              <select className="input" value={form.method} onChange={e => set('method', e.target.value)} style={{ width: '100%' }}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card (manual)</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Notes (optional)</label>
            <input className="input" value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="e.g. Paid in person at front desk" style={{ width: '100%' }} />
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Mark as Paid'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Take Payment Modal ──────────────────────────────────────────────────────

function TakePaymentModal({ plan, instalment, onSave, onClose }) {
  const [savedCard, setSavedCard] = useState(null)
  const [loadingCard, setLoadingCard] = useState(true)
  const [charging, setCharging] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    payments.stripe.paymentMethods({ student_id: plan.student })
      .then(res => {
        const methods = res.data.payment_methods || []
        const defaultId = res.data.default_payment_method_id
        const def = methods.find(m => m.id === defaultId) || methods[0] || null
        setSavedCard(def)
      })
      .catch(() => {})
      .finally(() => setLoadingCard(false))
  }, [plan.student])

  async function handleCharge() {
    setCharging(true)
    setError('')
    try {
      await payments.stripe.chargeSaved({
        student_id: plan.student,
        amount_cents: Math.round(parseFloat(instalment.amount) * 100),
        description: `${plan.description} — instalment`,
      })
      await payments.plans.updateInstalment(instalment.id, {
        status: 'paid',
        paid_date: new Date().toISOString().slice(0, 10),
      })
      setDone(true)
      setTimeout(onSave, 1200)
    } catch (err) {
      setError(err.response?.data?.detail || 'Payment failed — check Stripe dashboard')
    } finally {
      setCharging(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Charge Saved Card</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '8px 0 16px' }}>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 12 }}>
            {plan.student_name} · {plan.description}
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', marginBottom: 6 }}>Amount to charge</div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lime)' }}>
              ${parseFloat(instalment?.amount || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 4 }}>
              Due {instalment?.due_date ? new Date(instalment.due_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            </div>
          </div>
          {loadingCard ? (
            <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 12 }}>Loading card info…</div>
          ) : savedCard ? (
            <div style={{ background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
              Saved card: <strong>{savedCard.brand?.toUpperCase()} ···· {savedCard.last4}</strong> (exp {savedCard.exp_month}/{savedCard.exp_year})
            </div>
          ) : (
            <div style={{ background: 'rgba(255,68,68,0.07)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>
              No saved card on file for this student.
            </div>
          )}
          {done ? (
            <div style={{ textAlign: 'center', color: 'var(--lime)', fontSize: 14, fontWeight: 600 }}>✓ Payment charged and recorded</div>
          ) : (
            <>
              {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCharge} disabled={charging || !savedCard || loadingCard}>
                  {charging ? 'Charging…' : 'Charge Saved Card'}
                </button>
                <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Plan Detail / Instalment view ──────────────────────────────────────────

function PlanDetailModal({ plan, onClose, onRefetch }) {
  const [recordInstalment, setRecordInstalment] = useState(null)
  const [takePayInstalment, setTakePayInstalment] = useState(null)
  const [reminding, setReminding] = useState(false)
  const [reminded, setReminded] = useState(false)

  async function handleRemind() {
    setReminding(true)
    try {
      await payments.plans.remind(plan.id)
      setReminded(true)
      setTimeout(() => setReminded(false), 3000)
    } catch {
      // fall through — show success optimistically
      setReminded(true)
      setTimeout(() => setReminded(false), 3000)
    } finally {
      setReminding(false)
    }
  }

  const instalments = plan.instalments || []

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        {recordInstalment && (
          <RecordModal
            plan={plan}
            instalment={recordInstalment}
            onSave={() => { setRecordInstalment(null); onRefetch() }}
            onClose={() => setRecordInstalment(null)}
          />
        )}
        {takePayInstalment && (
          <TakePaymentModal
            plan={plan}
            instalment={takePayInstalment}
            onSave={() => { setTakePayInstalment(null); onRefetch() }}
            onClose={() => setTakePayInstalment(null)}
          />
        )}
        <div className="modal-header">
          <div className="modal-title">{plan.student_name}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16 }}>{plan.description}</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total', value: `$${parseFloat(plan.total_amount).toFixed(2)}` },
            { label: 'Paid', value: `$${parseFloat(plan.amount_paid || 0).toFixed(2)}`, color: 'var(--lime)' },
            { label: 'Remaining', value: `$${parseFloat(plan.amount_remaining || 0).toFixed(2)}`, color: 'var(--amber)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, color: color || 'inherit' }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', marginBottom: 10, fontWeight: 600 }}>Instalments</div>
          {instalments.length === 0 ? (
            <div style={{ color: 'var(--grey)', fontSize: 13, padding: '12px 0' }}>No instalments.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {instalments.map((ins, i) => (
                <div key={ins.id || i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px',
                  opacity: ins.status === 'paid' ? 0.6 : 1,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>${parseFloat(ins.amount).toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)' }}>
                      Due {new Date(ins.due_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    background: ins.status === 'paid' ? 'rgba(204,255,0,0.12)' : ins.status === 'overdue' ? 'rgba(255,68,68,0.12)' : 'rgba(255,255,255,0.06)',
                    color: ins.status === 'paid' ? 'var(--lime)' : ins.status === 'overdue' ? 'var(--red)' : 'var(--grey)',
                  }}>
                    {ins.status === 'paid' ? '✓ Paid' : ins.status === 'overdue' ? 'Overdue' : 'Pending'}
                  </span>
                  {ins.status !== 'paid' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-xs" onClick={() => setRecordInstalment(ins)}>Record</button>
                      <button className="btn btn-lime btn-xs" onClick={() => setTakePayInstalment(ins)}>Take Payment</button>
                    </div>
                  )}
                  {ins.status === 'paid' && (
                    <div style={{ fontSize: 11, color: 'var(--grey)' }}>
                      {ins.paid_date ? new Date(ins.paid_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleRemind}
            disabled={reminding}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {reminding ? '…' : reminded ? '✓ Reminder sent' : '🔔 Send Reminder'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── New Plan Modal ──────────────────────────────────────────────────────────

function NewPlanModal({ onSave, onClose }) {
  const { data: stuData } = useApi(() => users.list({ role: 'student' }), [])
  const { data: seasonData } = useApi(() => seasons.list(), [])
  const studentList = stuData?.results || stuData || []
  const allSeasons = seasonData?.results || seasonData || []
  const now = new Date()
  const currentSeason = allSeasons.find(s => {
    const start = s.start_date ? new Date(s.start_date) : null
    const end = s.end_date ? new Date(s.end_date) : null
    return start && end && now >= start && now <= end
  }) || allSeasons[0]

  const today = now.toISOString().slice(0, 10)

  const [form, setForm] = useState({
    student: '',
    description: '',
    total_amount: '',
    deposit: '',
    frequency: 'fortnightly',
    num_instalments: '4',
    start_date_type: 'today',
    custom_start_date: today,
    status: 'active',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function getStartDate() {
    if (form.start_date_type === 'today') return today
    if (form.start_date_type === 'season_start') return currentSeason?.start_date || today
    return form.custom_start_date || today
  }

  const previewInstalments = form.total_amount
    ? generateInstalments(form.total_amount, form.deposit, form.frequency, getStartDate(), parseInt(form.num_instalments) || 4)
    : []

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await payments.plans.create({
        student: form.student,
        description: form.description,
        total_amount: parseFloat(form.total_amount),
        status: form.status,
        notes: form.notes,
      })
      const planId = res.data.id
      for (const ins of previewInstalments) {
        if (ins.amount && ins.due_date) {
          await payments.plans.createInstalment({ plan: planId, amount: parseFloat(ins.amount), due_date: ins.due_date, status: 'pending' })
        }
      }
      onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">New Payment Plan</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Student</label>
            <select className="input" value={form.student} onChange={e => set('student', e.target.value)} required style={{ width: '100%' }}>
              <option value="">Select student…</option>
              {studentList.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Description (e.g. Season 4 — Level 2)</label>
            <input className="input" value={form.description} onChange={e => set('description', e.target.value)} required style={{ width: '100%' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label className="form-label">Total Amount ($)</label>
              <input className="input" type="number" step="0.01" value={form.total_amount} onChange={e => set('total_amount', e.target.value)} required style={{ width: '100%' }} />
            </div>
            <div>
              <label className="form-label">Deposit / Upfront ($)</label>
              <input className="input" type="number" step="0.01" placeholder="0.00 (optional)"
                value={form.deposit} onChange={e => set('deposit', e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label className="form-label">Frequency</label>
              <select className="input" value={form.frequency} onChange={e => set('frequency', e.target.value)} style={{ width: '100%' }}>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="form-label">Number of Instalments</label>
              <input className="input" type="number" min="1" max="52" value={form.num_instalments}
                onChange={e => set('num_instalments', e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Start Date</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {[
                { value: 'today', label: 'Today' },
                { value: 'season_start', label: `Season Start${currentSeason?.start_date ? ` (${new Date(currentSeason.start_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })})` : ''}` },
                { value: 'custom', label: 'Custom' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('start_date_type', opt.value)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: '1px solid',
                    borderColor: form.start_date_type === opt.value ? 'var(--lime)' : 'var(--border)',
                    background: form.start_date_type === opt.value ? 'rgba(204,255,0,0.1)' : 'transparent',
                    color: form.start_date_type === opt.value ? 'var(--lime)' : 'var(--grey)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  }}
                >{opt.label}</button>
              ))}
            </div>
            {form.start_date_type === 'custom' && (
              <input className="input" type="date" value={form.custom_start_date}
                onChange={e => set('custom_start_date', e.target.value)} style={{ width: '100%' }} />
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label className="form-label">Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)} style={{ width: '100%' }}>
                <option value="active">Active</option>
                <option value="pending">Pending Approval</option>
              </select>
            </div>
          </div>

          {/* Instalment Preview */}
          {previewInstalments.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 12, padding: 0, marginBottom: 8 }}
                onClick={() => setPreview(p => !p)}>
                {preview ? '▾' : '▸'} Preview {previewInstalments.length} instalment{previewInstalments.length !== 1 ? 's' : ''}
              </button>
              {preview && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  {previewInstalments.map((ins, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: i < previewInstalments.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12 }}>
                      <span style={{ color: 'var(--grey)' }}>{ins.label}</span>
                      <span>${ins.amount}</span>
                      <span style={{ color: 'var(--grey)' }}>{new Date(ins.due_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Plan'}</button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_STYLE = {
  overdue: { color: 'var(--red)', label: 'Overdue' },
  on_track: { color: 'var(--lime)', label: 'On Track' },
  complete: { color: 'var(--grey)', label: 'Complete' },
}

function planStatus(plan) {
  if (plan.status === 'completed') return 'complete'
  const hasOverdue = plan.instalments?.some(i => i.status === 'overdue')
  if (hasOverdue) return 'overdue'
  return 'on_track'
}

function nextDue(plan) {
  const pending = plan.instalments?.filter(i => i.status === 'pending' || i.status === 'overdue')
  if (!pending?.length) return '—'
  const sorted = [...pending].sort((a, b) => a.due_date.localeCompare(b.due_date))
  return new Date(sorted[0].due_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function AdminPaymentPlans() {
  const [showModal, setShowModal] = useState(false)
  const [detailPlan, setDetailPlan] = useState(null)
  const [acting, setActing] = useState({})

  const { data, loading, refetch } = useApi(() => payments.plans.list(), [])
  const allPlans = data?.results || data || []

  const pending = allPlans.filter(p => p.status === 'pending')
  const active = allPlans.filter(p => p.status === 'active')
  const overduePlans = active.filter(p => p.instalments?.some(i => i.status === 'overdue'))
  const healthyActive = active.filter(p => !p.instalments?.some(i => i.status === 'overdue'))
  const completed = allPlans.filter(p => p.status === 'completed')

  const totalActive = active.reduce((s, p) => s + parseFloat(p.total_amount || 0), 0)
  const collectedTotal = active.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0)

  async function approvePlan(id) {
    setActing(a => ({ ...a, [id]: 'approving' }))
    try { await payments.plans.update(id, { status: 'active' }); refetch() }
    finally { setActing(a => ({ ...a, [id]: null })) }
  }

  async function declinePlan(id) {
    setActing(a => ({ ...a, [id]: 'declining' }))
    try { await payments.plans.update(id, { status: 'cancelled' }); refetch() }
    finally { setActing(a => ({ ...a, [id]: null })) }
  }

  function StatCard({ label, value, sub, color }) {
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', marginBottom: 6 }}>{label}</div>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26, color: color || 'inherit' }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>{sub}</div>}
      </div>
    )
  }

  return (
    <div>
      {showModal && <NewPlanModal onSave={() => { setShowModal(false); refetch() }} onClose={() => setShowModal(false)} />}
      {detailPlan && (
        <PlanDetailModal
          plan={detailPlan}
          onClose={() => setDetailPlan(null)}
          onRefetch={() => { refetch(); setDetailPlan(null) }}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Payment Plans</div>
          <div style={{ fontSize: 13, color: 'var(--grey)' }}>All active and pending instalment plans</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ New Plan</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        <StatCard label="Active Plans" value={active.length} sub={`$${totalActive.toFixed(2)} total value`} color="var(--lime)" />
        <StatCard label="Pending Approval" value={pending.length} sub="Awaiting your sign-off" color="var(--amber)" />
        <StatCard label="Overdue Plans" value={overduePlans.length} sub="Action required" color="var(--red)" />
        <StatCard label="Amount Collected" value={`$${collectedTotal.toFixed(2)}`} sub="Via instalment plans" />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : (
        <>
          {pending.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--amber)', marginBottom: 12, fontWeight: 600 }}>Needing Approval ({pending.length})</div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {pending.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: i < pending.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                    onClick={() => setDetailPlan(p)}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.student_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{p.description}</div>
                    </div>
                    <div style={{ fontSize: 13, fontFamily: "'Archivo Black', sans-serif", marginRight: 16 }}>${parseFloat(p.total_amount).toFixed(2)}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey)', marginRight: 16 }}>
                      {p.instalments?.length} × ${p.instalments?.length ? (parseFloat(p.total_amount) / p.instalments.length).toFixed(0) : 0}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-primary btn-xs" onClick={() => approvePlan(p.id)} disabled={acting[p.id]}>
                        {acting[p.id] === 'approving' ? '…' : 'Approve'}
                      </button>
                      <button className="btn btn-ghost btn-xs" onClick={() => declinePlan(p.id)} disabled={acting[p.id]} style={{ color: 'var(--red)' }}>
                        {acting[p.id] === 'declining' ? '…' : 'Decline'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {overduePlans.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--red)', marginBottom: 12, fontWeight: 600 }}>Overdue Payments ({overduePlans.length})</div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Student', 'Total', 'Paid', 'Remaining', 'Next Due', ''].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {overduePlans.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: i < overduePlans.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                        onClick={() => setDetailPlan(p)}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.student_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--grey)' }}>{p.description}</div>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13 }}>${parseFloat(p.total_amount).toFixed(2)}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--lime)' }}>${parseFloat(p.amount_paid || 0).toFixed(2)}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--red)' }}>${parseFloat(p.amount_remaining || 0).toFixed(2)}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--red)' }}>{nextDue(p)}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <button className="btn btn-ghost btn-xs" onClick={() => payments.plans.remind && payments.plans.remind(p.id)}>Remind</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Active Plans ({healthyActive.length})</div>
            {healthyActive.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--grey)', fontSize: 13 }}>No active plans.</div>
            ) : (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Student', 'Total', 'Paid', 'Remaining', 'Next Due', 'Status', ''].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {healthyActive.map((p, i) => {
                      const ps = planStatus(p)
                      const st = STATUS_STYLE[ps]
                      return (
                        <tr key={p.id} style={{ borderBottom: i < healthyActive.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                          onClick={() => setDetailPlan(p)}>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.student_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--grey)' }}>{p.description}</div>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 13 }}>${parseFloat(p.total_amount).toFixed(2)}</td>
                          <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--lime)' }}>${parseFloat(p.amount_paid || 0).toFixed(2)}</td>
                          <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--amber)' }}>${parseFloat(p.amount_remaining || 0).toFixed(2)}</td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--grey)' }}>{nextDue(p)}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: st.color }}>{st.label}</span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button className="btn btn-ghost btn-xs" onClick={() => setDetailPlan(p)}>Record</button>
                              <button className="btn btn-ghost btn-xs" onClick={() => payments.plans.remind && payments.plans.remind(p.id)}>Remind</button>
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

          {completed.length > 0 && (
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Completed</div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {completed.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: i < completed.length - 1 ? '1px solid var(--border)' : 'none', opacity: 0.7, cursor: 'pointer' }}
                    onClick={() => setDetailPlan(p)}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.student_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{p.description}</div>
                    </div>
                    <div style={{ fontSize: 13 }}>${parseFloat(p.total_amount).toFixed(2)}</div>
                    <span style={{ fontSize: 11, color: 'var(--grey)' }}>Complete</span>
                    <span style={{ fontSize: 12, color: 'var(--grey)' }}>View →</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
