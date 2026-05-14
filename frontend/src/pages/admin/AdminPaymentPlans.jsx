import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { payments, users } from '../../api'

function NewPlanModal({ onSave, onClose }) {
  const { data: stuData } = useApi(() => users.list({ role: 'student' }), [])
  const studentList = stuData?.results || stuData || []

  const [form, setForm] = useState({
    student: '',
    description: '',
    total_amount: '',
    status: 'pending',
    notes: '',
    instalments: [{ amount: '', due_date: '' }],
  })
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function setInstalment(i, k, v) {
    setForm(f => {
      const ins = [...f.instalments]
      ins[i] = { ...ins[i], [k]: v }
      return { ...f, instalments: ins }
    })
  }

  function addInstalment() {
    setForm(f => ({ ...f, instalments: [...f.instalments, { amount: '', due_date: '' }] }))
  }

  function removeInstalment(i) {
    setForm(f => ({ ...f, instalments: f.instalments.filter((_, idx) => idx !== i) }))
  }

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
      for (const ins of form.instalments) {
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
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
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
              <label className="form-label">Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)} style={{ width: '100%' }}>
                <option value="pending">Pending Approval</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Instalments</label>
              <button type="button" className="btn btn-ghost btn-xs" onClick={addInstalment}>+ Add</button>
            </div>
            {form.instalments.map((ins, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input className="input" type="number" step="0.01" placeholder="Amount $" value={ins.amount} onChange={e => setInstalment(i, 'amount', e.target.value)} />
                <input className="input" type="date" value={ins.due_date} onChange={e => setInstalment(i, 'due_date', e.target.value)} />
                {form.instalments.length > 1 && (
                  <button type="button" onClick={() => removeInstalment(i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16 }}>✕</button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create Plan'}</button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

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
  return new Date(sorted[0].due_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminPaymentPlans() {
  const [showModal, setShowModal] = useState(false)
  const [acting, setActing] = useState({})

  const { data, loading, refetch } = useApi(() => payments.plans.list(), [])
  const allPlans = data?.results || data || []

  const pending = allPlans.filter(p => p.status === 'pending')
  const active = allPlans.filter(p => p.status === 'active')
  const completed = allPlans.filter(p => p.status === 'completed')

  const totalActive = active.reduce((s, p) => s + parseFloat(p.total_amount || 0), 0)
  const overdueCount = active.filter(p => p.instalments?.some(i => i.status === 'overdue')).length
  const collectedMonth = active.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0)

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
        <StatCard label="Overdue Instalments" value={overdueCount} sub="Action required" color="var(--red)" />
        <StatCard label="Amount Paid" value={`$${collectedMonth.toFixed(2)}`} sub="Via instalment plans" />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : (
        <>
          {pending.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Pending Approval</div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {pending.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: i < pending.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.student_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{p.description}</div>
                    </div>
                    <div style={{ fontSize: 13, fontFamily: "'Archivo Black', sans-serif" }}>${parseFloat(p.total_amount).toFixed(2)}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                      {p.instalments?.length} × ${p.instalments?.length ? (parseFloat(p.total_amount) / p.instalments.length).toFixed(0) : 0}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
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

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Active Plans</div>
            {active.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--grey)', fontSize: 13 }}>No active plans.</div>
            ) : (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {active.map((p, i) => {
                  const ps = planStatus(p)
                  const st = STATUS_STYLE[ps]
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: i < active.length - 1 ? '1px solid var(--border)' : 'none', gap: 12 }}>
                      <div style={{ minWidth: 140 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.student_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{p.description}</div>
                      </div>
                      <div style={{ fontSize: 13 }}>${parseFloat(p.total_amount).toFixed(2)}</div>
                      <div style={{ fontSize: 12, color: 'var(--lime)' }}>${parseFloat(p.amount_paid || 0).toFixed(2)}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey)' }}>${parseFloat(p.amount_remaining || 0).toFixed(2)}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey)' }}>{nextDue(p)}</div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: st.color }}>{st.label}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-xs">Record</button>
                        <button className="btn btn-ghost btn-xs">Remind</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {completed.length > 0 && (
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Completed</div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {completed.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: i < completed.length - 1 ? '1px solid var(--border)' : 'none', opacity: 0.7 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.student_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{p.description}</div>
                    </div>
                    <div style={{ fontSize: 13 }}>${parseFloat(p.total_amount).toFixed(2)}</div>
                    <span style={{ fontSize: 11, color: 'var(--grey)' }}>Complete</span>
                    <button className="btn btn-ghost btn-xs">View</button>
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
