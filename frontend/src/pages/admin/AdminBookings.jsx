import { useState, useEffect } from 'react'
import { useApi } from '../../hooks/useApi'
import { enrolments, classes, users, settings as settingsApi } from '../../api'
import '../StudentsPage.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const TYPE_TAG = {
  season:   'tag-lav',
  trial:    'tag-lav',
  casual:   'tag-grey',
  workshop: 'tag-amber',
  catchup:  'tag-grey',
  waitlist: 'tag-amber',
  course:   'tag-lav',
}

const STATUS_TAG = {
  active:    'tag-lime',
  waitlist:  'tag-amber',
  cancelled: 'tag-red',
  completed: 'tag-grey',
  suspended: 'tag-grey',
}

function BookingModal({ onClose, onSaved }) {
  const { data: sessData } = useApi(() => classes.list())
  const { data: studData } = useApi(() => users.list({ role: 'student' }))

  const sessions = sessData?.results || sessData || []
  const students = studData?.results || []

  const [studentId, setStudentId] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [type, setType] = useState('course')
  const [status, setStatus] = useState('active')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await enrolments.create({ student: parseInt(studentId), class_session: parseInt(sessionId), enrolment_type: type, status, notes })
      onSaved()
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to create booking')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 480 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Add Booking</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={submit}>
          {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>}
          <div className="field">
            <label>Student *</label>
            <select value={studentId} onChange={e => setStudentId(e.target.value)} required>
              <option value="">Select student…</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Class *</label>
            <select value={sessionId} onChange={e => setSessionId(e.target.value)} required>
              <option value="">Select class…</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name} — {DAYS[s.day_of_week]} {s.start_time?.slice(0, 5)}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Type</label>
              <select value={type} onChange={e => setType(e.target.value)}>
                <option value="course">Course</option>
                <option value="casual">Casual</option>
                <option value="trial">Trial</option>
                <option value="workshop">Workshop</option>
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="waitlist">Waitlist</option>
              </select>
            </div>
          </div>
          <div className="field"><label>Notes</label><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Add Booking'}</button>
          </div>
        </form>
      </div>
    </div>
  )
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
  const [usePlan, setUsePlan] = useState(false)
  const [numInstalments, setNumInstalments] = useState(2)
  const [instalments, setInstalments] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const amountVal = amount !== '' ? amount : defaultAmount

  useEffect(() => {
    if (!usePlan) return
    const total = parseFloat(amountVal || defaultAmount)
    const base = Math.floor((total / numInstalments) * 100) / 100
    const remainder = parseFloat((total - base * numInstalments).toFixed(2))
    const today = new Date()
    setInstalments(Array.from({ length: numInstalments }, (_, i) => {
      const due = new Date(today)
      due.setMonth(due.getMonth() + i + 1)
      return { amount: (i === 0 ? base + remainder : base).toFixed(2), due_date: due.toISOString().slice(0, 10) }
    }))
  }, [usePlan, numInstalments])

  function updateInstalment(i, field, val) {
    setInstalments(prev => prev.map((inst, idx) => idx === i ? { ...inst, [field]: val } : inst))
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const description = `Season enrolment — ${e.class_session_detail?.name} (converted from trial)`
      if (usePlan) {
        await enrolments.convertTrial(e.id, { payment_plan: true, instalments, description })
      } else {
        await enrolments.convertTrial(e.id, { amount_paid: parseFloat(amountVal), payment_type: paymentType, reference, description })
      }
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || 'Conversion failed.')
    } finally {
      setSaving(false)
    }
  }

  const planTotal = instalments.reduce((s, i) => s + parseFloat(i.amount || 0), 0)

  return (
    <div className="sd-overlay" onClick={ev => ev.target === ev.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 460 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Convert Trial → Full</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit}>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
            <b style={{ color: 'var(--white)' }}>{e.student_detail?.display_name}</b> · {e.class_session_detail?.name}
          </div>
          <div style={{ background: '#111', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--grey)', marginBottom: 14 }}>
            Season ${seasonPrice.toFixed(2)} − trial ${trialPrice.toFixed(2)} = <b style={{ color: 'var(--lime)' }}>${defaultAmount} remaining</b>
          </div>
          {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</div>}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 16 }}>
            <input type="checkbox" checked={usePlan} onChange={ev => setUsePlan(ev.target.checked)} />
            Set up a payment plan
          </label>

          {usePlan ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--grey)' }}>Instalments</label>
                <select value={numInstalments} onChange={ev => setNumInstalments(parseInt(ev.target.value))} style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--white)', padding: '4px 8px', fontSize: 13 }}>
                  {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              {instalments.map((inst, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: 11 }}>Instalment {i + 1} ($)</label>
                    <input type="number" step="0.01" min="0" value={inst.amount} onChange={ev => updateInstalment(i, 'amount', ev.target.value)} />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: 11 }}>Due date</label>
                    <input type="date" value={inst.due_date} onChange={ev => updateInstalment(i, 'due_date', ev.target.value)} />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 12, color: 'var(--grey)', textAlign: 'right', marginBottom: 12 }}>
                Total: <b style={{ color: planTotal > 0 ? 'var(--lime)' : 'var(--red)' }}>${planTotal.toFixed(2)}</b>
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label>Amount ($)</label>
                <input type="number" step="0.01" min="0" value={amountVal} onChange={ev => setAmount(ev.target.value)} />
              </div>
              <div className="field">
                <label>Payment type</label>
                <select value={paymentType} onChange={ev => setPaymentType(ev.target.value)}>
                  <option value="payment">Payment received</option>
                  <option value="charge">Charge (invoice / owing)</option>
                </select>
              </div>
              <div className="field">
                <label>Reference <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(optional)</span></label>
                <input value={reference} onChange={ev => setReference(ev.target.value)} placeholder="cash, Square #, etc." />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>
              {saving ? 'Converting…' : usePlan ? `Create Plan $${planTotal.toFixed(2)}` : `Confirm $${parseFloat(amountVal || 0).toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ViewModal({ enrolment: e, onClose, onCancelled, onConverted }) {
  const s = e.class_session_detail
  const st = e.student_detail
  const [cancelling, setCancelling] = useState(false)
  const [showConvert, setShowConvert] = useState(false)

  async function cancel() {
    setCancelling(true)
    try {
      await enrolments.update(e.id, { status: 'cancelled' })
      onCancelled()
    } finally {
      setCancelling(false)
    }
  }

  if (showConvert) {
    return <ConvertTrialModal enrolment={e} onClose={() => setShowConvert(false)} onSuccess={() => { setShowConvert(false); onConverted() }} />
  }

  return (
    <div className="sd-overlay" onClick={ev => ev.target === ev.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 420 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Booking Details</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 8, fontWeight: 600 }}>Student</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{st?.display_name}</div>
            {st?.email && <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{st.email}</div>}
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 8, fontWeight: 600 }}>Class</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{s?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{DAYS[s?.day_of_week]} {s?.start_time?.slice(0, 5)} · {s?.studio_detail?.name}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 4, fontWeight: 600 }}>Type</div>
              <span className={`tag ${TYPE_TAG[e.enrolment_type] || 'tag-grey'}`} style={{ fontSize: 11 }}>{e.enrolment_type}</span>
            </div>
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 4, fontWeight: 600 }}>Status</div>
              <span className={`tag ${STATUS_TAG[e.status] || 'tag-grey'}`} style={{ fontSize: 11 }}>{e.status}</span>
            </div>
          </div>
          {e.enrolled_date && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 4, fontWeight: 600 }}>Enrolled</div>
              <div style={{ fontSize: 13 }}>{new Date(e.enrolled_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
          )}
          {e.notes && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 4, fontWeight: 600 }}>Notes</div>
              <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>{e.notes}</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {e.status === 'active' && e.enrolment_type === 'trial' && (
              <button className="btn btn-lime btn-sm" onClick={() => setShowConvert(true)}>Convert to Full →</button>
            )}
            {e.status === 'active' && (
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }} onClick={cancel} disabled={cancelling}>
                {cancelling ? 'Cancelling…' : 'Cancel Booking'}
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminBookings() {
  const { data, loading, refetch } = useApi(() => enrolments.list())
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [confirmCancel, setConfirmCancel] = useState(null)

  const all = data?.results || []

  const filtered = all.filter(e => {
    const name = e.student_detail?.display_name?.toLowerCase() || ''
    const session = e.class_session_detail?.name?.toLowerCase() || ''
    const matchSearch = !search || name.includes(search.toLowerCase()) || session.includes(search.toLowerCase())
    const matchType = !filterType || e.enrolment_type === filterType
    const matchStatus = !filterStatus || e.status === filterStatus
    return matchSearch && matchType && matchStatus
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Bookings</div>
          <div className="page-sub">{all.length} total enrolments</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => setShowAdd(true)}>+ Add Booking</button>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {[
          ['Total', all.length, 'kpi-lime'],
          ['Active', all.filter(e => e.status === 'active').length, 'kpi-lav'],
          ['Waitlist', all.filter(e => e.status === 'waitlist').length, 'kpi-amber'],
          ['Cancelled', all.filter(e => e.status === 'cancelled').length, 'kpi-red'],
        ].map(([label, val, cls]) => (
          <div key={label} className={`kpi ${cls}`}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{val}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search student or class…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '8px 12px', fontSize: 13, outline: 'none', width: 260 }}
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '7px 12px', fontSize: 13, outline: 'none' }}>
          <option value="">All Types</option>
          <option value="course">Course</option>
          <option value="casual">Casual</option>
          <option value="trial">Trial</option>
          <option value="workshop">Workshop</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '7px 12px', fontSize: 13, outline: 'none' }}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="waitlist">Waitlist</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : (
        <div className="tbl-section">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Studio</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const s = e.class_session_detail
                const st = e.student_detail
                return (
                  <tr key={e.id} className="clickable" onClick={() => setViewing(e)}>
                    <td>
                      <b>{st?.display_name || `Student ${e.student}`}</b>
                      {st?.email && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{st.email}</div>}
                    </td>
                    <td>
                      <b>{s?.name}</b>
                      <div style={{ fontSize: 11, color: 'var(--grey)' }}>{DAYS[s?.day_of_week]} {s?.start_time?.slice(0, 5)}</div>
                    </td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{s?.studio_detail?.name}</td>
                    <td><span className={`tag ${TYPE_TAG[e.enrolment_type] || 'tag-grey'}`} style={{ fontSize: 10 }}>{e.enrolment_type}</span></td>
                    <td><span className={`tag ${STATUS_TAG[e.status] || 'tag-grey'}`} style={{ fontSize: 10 }}>{e.status}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }} onClick={ev => ev.stopPropagation()}>
                      <button className="btn btn-ghost btn-xs" style={{ marginRight: 4 }} onClick={() => setViewing(e)}>View</button>
                      {e.status === 'active' && (
                        confirmCancel === e.id ? (
                          <>
                            <button className="btn btn-xs" style={{ background: 'var(--red)', color: '#000', marginRight: 4 }} onClick={async () => {
                              await enrolments.update(e.id, { status: 'cancelled' })
                              setConfirmCancel(null)
                              refetch()
                            }}>Confirm</button>
                            <button className="btn btn-ghost btn-xs" onClick={() => setConfirmCancel(null)}>No</button>
                          </>
                        ) : (
                          <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => setConfirmCancel(e.id)}>Cancel</button>
                        )
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--grey)', padding: '32px 0' }}>No bookings found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <BookingModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); refetch() }} />
      )}
      {viewing && (
        <ViewModal enrolment={viewing} onClose={() => setViewing(null)} onCancelled={() => { setViewing(null); refetch() }} onConverted={() => { setViewing(null); refetch() }} />
      )}
    </div>
  )
}
