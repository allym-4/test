import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { classes } from '../../api'
import { fmt12 } from '../../utils/time'
import client from '../../api/client'

const PRICE_TIERS = [0, 270, 440, 580, 700, 800, 900]
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function ordinal(n) {
  if (!n) return '—'
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function incrementalPrice(count) {
  if (!count || count <= 0) return null
  const idx = Math.min(count, PRICE_TIERS.length - 1)
  return PRICE_TIERS[idx] - PRICE_TIERS[idx - 1]
}

function FlagBadge({ label, color = '#444', textColor = '#fff' }) {
  return (
    <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: color, color: textColor, letterSpacing: '0.04em', marginRight: 4, marginBottom: 2 }}>
      {label}
    </span>
  )
}

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'Pending', bg: '#2a2a00', color: '#ffcc44' },
    awaiting_response: { label: 'Awaiting response', bg: '#1a2a3a', color: '#88ccff' },
    approved: { label: 'Approved', bg: '#1a3a1a', color: '#ccff00' },
    rejected: { label: 'Rejected', bg: '#3a1a1a', color: '#ff8888' },
  }
  const s = map[status] || { label: status, bg: '#222', color: '#888' }
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color }}>{s.label}</span>
}

// ── Payment modal ──────────────────────────────────────────────────────────────
function PaymentModal({ enrolment, session, defaultAmount, onClose, onSuccess }) {
  const [amount, setAmount] = useState(defaultAmount != null ? String(defaultAmount) : '')
  const [amountReason, setAmountReason] = useState('')
  const [method, setMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [balance, setBalance] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (enrolment?.student_id) {
      client.get(`/api/payments/balance/${enrolment.student_id}/`).then(r => {
        setBalance(r.data?.balance ?? r.data?.available_credit ?? 0)
      }).catch(() => {})
    }
  }, [enrolment?.student_id])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!amount || isNaN(parseFloat(amount))) { setError('Enter a valid amount.'); return }
    if (method === 'account_credit' && parseFloat(amount) > (balance || 0)) { setError(`Not enough account credit. Available: $${(balance || 0).toFixed(2)}`); return }
    setSaving(true)
    setError(null)
    try {
      const desc = [session?.name, enrolment?.student_name, amountReason].filter(Boolean).join(' — ')
      await client.post('/api/payments/', {
        student: enrolment.student_id,
        amount: parseFloat(amount),
        payment_type: 'payment',
        payment_method: method,
        description: desc,
        admin_notes: notes,
        reference: `enrolment-${enrolment.id}`,
      })
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Payment failed.')
      setSaving(false)
    }
  }

  const METHODS = [
    { value: 'cash',           label: 'Cash' },
    { value: 'bank_transfer',  label: 'Bank Transfer' },
    { value: 'account_credit', label: `Account Credit${balance != null ? ` ($${Number(balance).toFixed(2)} available)` : ''}` },
    { value: 'card',           label: 'Charge Saved Card' },
    { value: 'waive',          label: 'Waive Fee' },
  ]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 460 }}>
        <div className="modal-title">
          Record Payment — {enrolment?.student_name}
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12, background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}

          <div className="field">
            <label>Amount ($)</label>
            <input type="number" step="0.01" min="0" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="270.00" />
          </div>

          {String(defaultAmount) !== amount && amount && (
            <div className="field">
              <label>Reason for adjusted amount</label>
              <input value={amountReason} onChange={e => setAmountReason(e.target.value)} placeholder="e.g. Loyalty discount, partial payment…" />
            </div>
          )}

          <div className="field">
            <label>Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}>
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {method === 'card' && (
            <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 12, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
              To charge a saved card, go to the student's <Link to={`/admin/students/${enrolment?.student_id}`} style={{ color: 'var(--lime)' }}>billing profile</Link> and charge from there. This will only record a manual payment note.
            </div>
          )}

          <div className="field">
            <label>Admin Notes <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(optional)</span></label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal note…" />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>
              {saving ? 'Recording…' : method === 'waive' ? 'Waive Fee' : `Record $${amount || '0'} Payment`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Cancel enrolment modal ──────────────────────────────────────────────────────
function CancelEnrolmentModal({ enrolment, onClose, onSuccess }) {
  const [creditOption, setCreditOption] = useState('none')
  const [creditAmount, setCreditAmount] = useState(enrolment?.incremental_price ? String(enrolment.incremental_price) : '')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await client.patch(`/api/enrolments/${enrolment.id}/`, {
        status: 'cancelled',
        notes: [notes, creditOption !== 'none' ? `Credit: ${creditOption} $${creditAmount}` : ''].filter(Boolean).join('\n'),
      })
      if (creditOption === 'credit' && parseFloat(creditAmount) > 0) {
        await client.post('/api/payments/', {
          student: enrolment.student_id,
          amount: parseFloat(creditAmount),
          payment_type: 'credit',
          payment_method: 'account_credit',
          description: `Cancellation credit — ${enrolment.session_name || 'class'}`,
          admin_notes: notes,
        }).catch(() => {})
      }
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not cancel enrolment.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div className="modal-title" style={{ color: '#ff8888' }}>
          Cancel Enrolment — {enrolment?.student_name}
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</div>}

          <div className="field">
            <label>Credit / Refund</label>
            {[
              { value: 'none',   label: 'No credit or refund' },
              { value: 'credit', label: 'Issue account credit' },
              { value: 'stripe', label: 'Refund to card (via Stripe dashboard)' },
            ].map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8, fontSize: 13 }}>
                <input type="radio" name="creditOption" value={opt.value} checked={creditOption === opt.value} onChange={() => setCreditOption(opt.value)} style={{ accentColor: 'var(--lime)' }} />
                {opt.label}
              </label>
            ))}
          </div>

          {creditOption === 'credit' && (
            <div className="field">
              <label>Credit Amount ($)</label>
              <input type="number" step="0.01" min="0" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} placeholder="270.00" />
            </div>
          )}

          {creditOption === 'stripe' && (
            <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 12, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
              Process the Stripe refund manually from the <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer" style={{ color: 'var(--lime)' }}>Stripe dashboard</a> after cancelling here.
            </div>
          )}

          <div className="field">
            <label>Notes <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(reason, terms, etc.)</span></label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Medical withdrawal, transferred to next season…" />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Keep Enrolment</button>
            <button type="submit" className="btn btn-sm" style={{ background: 'rgba(255,80,80,0.12)', color: '#ff8888', border: '1px solid rgba(255,80,80,0.25)' }} disabled={saving}>
              {saving ? 'Cancelling…' : 'Confirm Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Add from waitlist modal ──────────────────────────────────────────────────────
function AddFromWaitlistModal({ enrolment, session, onClose, onSuccess }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [requiresOverride, setRequiresOverride] = useState(false)

  const isFull = session && enrolment && (session.enrolled_count >= session.capacity)

  async function handleAdd(override = false) {
    setSaving(true)
    setError(null)
    try {
      await client.post(`/api/enrolments/${enrolment.id}/promote-waitlist/`, { override_capacity: override })
      onSuccess()
    } catch (err) {
      if (err.response?.data?.requires_override) {
        setRequiresOverride(true)
        setSaving(false)
      } else {
        setError(err.response?.data?.detail || 'Could not add student.')
        setSaving(false)
      }
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div className="modal-title">
          Add to Class — {enrolment?.student_name}
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</div>}

        {requiresOverride ? (
          <>
            <div style={{ fontSize: 13, color: 'var(--amber)', marginBottom: 16, background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 8, padding: '12px 14px' }}>
              ⚠ This class is at capacity ({session?.enrolled_count}/{session?.capacity}).{' '}
              Adding this student will override the limit. Note: casual bookings will still only be allowed up to the original capacity.
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button className="btn btn-sm" style={{ background: 'rgba(255,170,0,0.12)', color: '#ffaa00', border: '1px solid rgba(255,170,0,0.25)' }} disabled={saving} onClick={() => handleAdd(true)}>
                {saving ? 'Adding…' : 'Override & Add'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16 }}>
              Move <b style={{ color: '#fff' }}>{enrolment?.student_name}</b> from the waitlist to an active enrolment in{' '}
              <b style={{ color: '#fff' }}>{session?.name}</b>?
              {isFull && <span style={{ color: 'var(--amber)', display: 'block', marginTop: 6 }}>Class is currently full — this will trigger a capacity override check.</span>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button className="btn btn-lime btn-sm" disabled={saving} onClick={() => handleAdd(false)}>
                {saving ? 'Adding…' : 'Add to Class'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Transfer modal ──────────────────────────────────────────────────────────────
function TransferModal({ enrolment, onClose, onSuccess }) {
  const [search, setSearch] = useState('')
  const [sessions, setSessions] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!search.trim()) { setSessions([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await client.get('/api/classes/sessions/', { params: { search, page_size: 20 } })
        setSessions(r.data?.results || r.data || [])
      } finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selected) { setError('Select a class to transfer to.'); return }
    setSaving(true)
    setError(null)
    try {
      await client.post('/api/enrolments/change-requests/', {
        enrolment: enrolment.id,
        request_type: 'transfer',
        requested_session: selected.id,
        notes,
      })
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create transfer request.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 460 }}>
        <div className="modal-title">Transfer — {enrolment?.student_name}<button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          {error && <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 10 }}>{error}</div>}
          <div className="field">
            <label>Search target class</label>
            <input autoFocus placeholder="Class name…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {searching && <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 8 }}>Searching…</div>}
          {sessions.map(s => (
            <div key={s.id} onClick={() => setSelected(s)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, border: `1px solid ${selected?.id === s.id ? 'var(--lime)' : 'var(--border)'}`, background: selected?.id === s.id ? 'rgba(204,255,0,0.05)' : '#0a0a0a', cursor: 'pointer', marginBottom: 6 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: 'var(--grey)' }}>{DAYS[s.day_of_week]} · {s.start_time?.slice(0,5)} · {s.season_detail?.name || s.season_name || ''}</div>
              </div>
              <div style={{ fontSize: 12, color: s.enrolled_count >= s.capacity ? 'var(--red)' : 'var(--lime)' }}>{s.enrolled_count}/{s.capacity}</div>
            </div>
          ))}
          <div className="field" style={{ marginTop: 12 }}>
            <label>Notes</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for transfer…" />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving || !selected}>{saving ? 'Submitting…' : 'Submit Transfer'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Add student modal ──────────────────────────────────────────────────────────
function AddStudentModal({ sessionId, session, onClose, onAdded }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [enrolType, setEnrolType] = useState('course')
  const [customAmount, setCustomAmount] = useState('')
  const [amountReason, setAmountReason] = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [balance, setBalance] = useState(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const baseAmount = enrolType === 'trial' ? 35 : enrolType === 'casual' ? 40 : null

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await client.get('/api/users/', { params: { search: query, role: 'student', limit: 10 } })
        setResults(r.data?.results || r.data || [])
      } finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (selected) {
      client.get(`/api/payments/balance/${selected.id}/`).then(r => setBalance(r.data?.balance ?? r.data?.available_credit ?? 0)).catch(() => {})
      setCustomAmount(String(baseAmount ?? ''))
    }
  }, [selected, enrolType])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      const enrolRes = await client.post('/api/enrolments/', { class_session: sessionId, student: selected.id, enrolment_type: enrolType, status: 'active' })
      const enrolment = enrolRes.data
      const amt = parseFloat(customAmount)
      if (!isNaN(amt) && amt > 0 && payMethod !== 'waive') {
        const desc = [session?.name, selected.display_name || selected.first_name, amountReason].filter(Boolean).join(' — ')
        await client.post('/api/payments/', {
          student: selected.id,
          amount: amt,
          payment_type: 'payment',
          payment_method: payMethod,
          description: desc,
          admin_notes: notes,
          reference: `enrolment-${enrolment.id}`,
        }).catch(() => {})
      }
      onAdded(enrolment)
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Could not add student.')
      setSaving(false)
    }
  }

  const METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'account_credit', label: `Account Credit${balance != null && selected ? ` ($${Number(balance).toFixed(2)} avail.)` : ''}` },
    { value: 'card', label: 'Charge Saved Card' },
    { value: 'waive', label: 'Waive Fee' },
  ]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 500 }}>
        <div className="modal-title">Add Student to {session?.name}<button className="modal-close" onClick={onClose}>✕</button></div>
        {error && <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 10 }}>{error}</div>}

        <div className="field">
          <label>Enrolment Type</label>
          <select value={enrolType} onChange={e => setEnrolType(e.target.value)}>
            <option value="course">Full Season Enrolment</option>
            <option value="trial">Trial Class ($35)</option>
            <option value="casual">Casual Drop-in ($40)</option>
          </select>
        </div>

        <div className="field">
          <label>Search Student</label>
          <input autoFocus placeholder="Name or email…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>

        {searching && <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 8 }}>Searching…</div>}

        {!selected && results.map(s => (
          <div key={s.id} onClick={() => setSelected(s)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: '#0a0a0a', cursor: 'pointer', marginBottom: 6 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{s.display_name || `${s.first_name} ${s.last_name}`}</div>
              <div style={{ fontSize: 12, color: 'var(--grey)' }}>Level {s.level || '—'} · {s.email}</div>
            </div>
            <button className="btn btn-lime btn-xs">Select</button>
          </div>
        ))}

        {selected && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(204,255,0,0.3)', background: 'rgba(204,255,0,0.05)', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{selected.display_name || `${selected.first_name} ${selected.last_name}`}</div>
                <div style={{ fontSize: 12, color: 'var(--grey)' }}>Level {selected.level || '—'}</div>
              </div>
              <button onClick={() => { setSelected(null); setQuery('') }} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 11 }}>Change</button>
            </div>

            <div className="field">
              <label>Amount ($)</label>
              <input type="number" step="0.01" min="0" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder="270.00" />
              <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>
                {baseAmount ? `Standard rate: $${baseAmount}` : 'Enter the incremental season price for this student.'}
              </div>
            </div>

            {customAmount && String(baseAmount) !== customAmount && (
              <div className="field">
                <label>Reason for adjusted amount</label>
                <input value={amountReason} onChange={e => setAmountReason(e.target.value)} placeholder="e.g. Loyalty discount, partial payment…" />
              </div>
            )}

            <div className="field">
              <label>Payment Method</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Notes <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(optional)</span></label>
              <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal note…" />
            </div>
          </>
        )}

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-lime btn-sm" disabled={saving || !selected} onClick={handleSubmit}>
            {saving ? 'Adding…' : 'Add to Class'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Contact class modal ────────────────────────────────────────────────────────
function ContactClassModal({ sessionId, enrolled, onClose }) {
  const [tab, setTab] = useState('email')

  // Email tab state
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState(null)

  // Push tab state
  const [pushMsg, setPushMsg] = useState('')
  const [pushSending, setPushSending] = useState(false)
  const [pushSent, setPushSent] = useState(false)
  const [pushError, setPushError] = useState(null)

  // Popup tab state
  const [popupTitle, setPopupTitle] = useState('')
  const [popupMsg, setPopupMsg] = useState('')
  const [popupCtaLabel, setPopupCtaLabel] = useState('')
  const [popupCtaUrl, setPopupCtaUrl] = useState('')
  const [popupSending, setPopupSending] = useState(false)
  const [popupSent, setPopupSent] = useState(false)
  const [popupError, setPopupError] = useState(null)

  async function handleSendEmail(e) {
    e.preventDefault()
    setEmailSending(true)
    setEmailError(null)
    try {
      await client.post(`/api/classes/sessions/${sessionId}/email/`, { subject: emailSubject, body: emailBody, recipients: 'enrolled' })
      setEmailSent(true)
    } catch (err) {
      setEmailError(err.response?.data?.detail || 'Failed to send.')
      setEmailSending(false)
    }
  }

  async function handleSendPush(e) {
    e.preventDefault()
    setPushSending(true)
    setPushError(null)
    try {
      await client.post(`/api/classes/sessions/${sessionId}/notify/`, { message: pushMsg, type: 'push' })
      setPushSent(true)
    } catch (err) {
      if (err.response?.status === 404) {
        setPushError("Push notifications aren't enabled yet on this server.")
      } else {
        setPushError(err.response?.data?.detail || 'Failed to send push notification.')
      }
    } finally { setPushSending(false) }
  }

  async function handleSendPopup(e) {
    e.preventDefault()
    setPopupSending(true)
    setPopupError(null)
    try {
      await client.post(`/api/classes/sessions/${sessionId}/notify/`, {
        title: popupTitle,
        message: popupMsg,
        cta_label: popupCtaLabel || undefined,
        cta_url: popupCtaUrl || undefined,
        type: 'popup',
      })
      setPopupSent(true)
    } catch (err) {
      if (err.response?.status === 404) {
        setPopupError("Push notifications aren't enabled yet on this server.")
      } else {
        setPopupError(err.response?.data?.detail || 'Failed to send pop-up alert.')
      }
    } finally { setPopupSending(false) }
  }

  const TABS = [
    { key: 'email', label: 'Email' },
    { key: 'push', label: 'Push Notification' },
    { key: 'popup', label: 'Pop-up Alert' },
  ]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <div className="modal-title">Contact Class<button className="modal-close" onClick={onClose}>✕</button></div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                background: 'none', border: 'none', padding: '8px 14px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', color: tab === t.key ? 'var(--lime)' : 'var(--grey)',
                borderBottom: `2px solid ${tab === t.key ? 'var(--lime)' : 'transparent'}`,
                marginBottom: -1,
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* Email tab */}
        {tab === 'email' && (
          emailSent ? (
            <div>
              <div style={{ fontSize: 14, color: 'var(--lime)', marginBottom: 16 }}>✓ Sent to {enrolled?.length || 0} enrolled students.</div>
              <div className="modal-footer"><button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button></div>
            </div>
          ) : (
            <form onSubmit={handleSendEmail}>
              <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 12 }}>Sending to {enrolled?.length || 0} enrolled students.</div>
              {emailError && <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 10 }}>{emailError}</div>}
              <div className="field"><label>Subject</label><input required value={emailSubject} onChange={e => setEmailSubject(e.target.value)} /></div>
              <div className="field"><label>Message</label><textarea required rows={5} value={emailBody} onChange={e => setEmailBody(e.target.value)} /></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-lime btn-sm" disabled={emailSending}>{emailSending ? 'Sending…' : 'Send Email'}</button>
              </div>
            </form>
          )
        )}

        {/* Push tab */}
        {tab === 'push' && (
          pushSent ? (
            <div>
              <div style={{ fontSize: 14, color: 'var(--lime)', marginBottom: 16 }}>✓ Push notification sent.</div>
              <div className="modal-footer"><button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button></div>
            </div>
          ) : (
            <form onSubmit={handleSendPush}>
              <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 12 }}>Send a push notification to students' mobile devices. Keep it short.</div>
              {pushError && <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 10, background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 8, padding: '8px 12px' }}>{pushError}</div>}
              <div className="field">
                <label>Message <span style={{ color: 'var(--grey)', fontWeight: 400 }}>({pushMsg.length}/160)</span></label>
                <textarea required rows={3} maxLength={160} value={pushMsg} onChange={e => setPushMsg(e.target.value)} placeholder="Short message to send…" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-lime btn-sm" disabled={pushSending}>{pushSending ? 'Sending…' : 'Send Notification'}</button>
              </div>
            </form>
          )
        )}

        {/* Popup tab */}
        {tab === 'popup' && (
          popupSent ? (
            <div>
              <div style={{ fontSize: 14, color: 'var(--lime)', marginBottom: 16 }}>✓ Pop-up alert sent.</div>
              <div className="modal-footer"><button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button></div>
            </div>
          ) : (
            <form onSubmit={handleSendPopup}>
              <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 12 }}>Display a pop-up alert in the student app.</div>
              {popupError && <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 10, background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 8, padding: '8px 12px' }}>{popupError}</div>}
              <div className="field"><label>Title</label><input required value={popupTitle} onChange={e => setPopupTitle(e.target.value)} placeholder="e.g. Class update" /></div>
              <div className="field"><label>Message</label><textarea required rows={3} value={popupMsg} onChange={e => setPopupMsg(e.target.value)} placeholder="Your message…" /></div>
              <div className="field"><label>CTA Button Label <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(optional)</span></label><input value={popupCtaLabel} onChange={e => setPopupCtaLabel(e.target.value)} placeholder="e.g. Learn more" /></div>
              <div className="field"><label>CTA URL <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(optional)</span></label><input value={popupCtaUrl} onChange={e => setPopupCtaUrl(e.target.value)} placeholder="https://…" /></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-lime btn-sm" disabled={popupSending}>{popupSending ? 'Sending…' : 'Send Alert'}</button>
              </div>
            </form>
          )
        )}
      </div>
    </div>
  )
}

// ── Cancel class modal (with credit options) ───────────────────────────────────
function CancelClassModal({ sessionId, session, enrolled, onClose, onCancelled }) {
  const [notifyStudents, setNotifyStudents] = useState(true)
  const [reason, setReason] = useState('')
  const [creditOption, setCreditOption] = useState('none')
  const [defaultCreditAmount, setDefaultCreditAmount] = useState('')
  const [perStudentCredits, setPerStudentCredits] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Pre-fill default credit amounts when enrolled list changes
  useEffect(() => {
    if (enrolled) {
      const map = {}
      for (const e of enrolled) {
        map[e.id] = e.incremental_price != null ? String(e.incremental_price) : ''
      }
      setPerStudentCredits(map)
      // Default credit amount: first student's incremental price or blank
      if (enrolled.length > 0 && enrolled[0].incremental_price != null) {
        setDefaultCreditAmount(String(enrolled[0].incremental_price))
      }
    }
  }, [enrolled])

  async function handleCancel(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      // Find the upcoming occurrence
      const occRes = await client.get('/api/classes/occurrences/', { params: { session: sessionId } })
      const occs = occRes.data?.results || []
      const todayStr = new Date().toISOString().slice(0, 10)
      const occ = occs.find(o => o.date >= todayStr) || occs[0]

      if (occ) {
        await client.patch(`/api/classes/occurrences/${occ.id}/`, { status: 'cancelled', notes: reason })
      }

      if (notifyStudents && reason) {
        await client.post(`/api/classes/sessions/${sessionId}/email/`, {
          subject: `Class cancelled — ${session?.name || 'your class'}`,
          body: `Hi everyone,\n\nUnfortunately ${session?.name || 'your class'} has been cancelled.\n\n${reason ? `Reason: ${reason}\n\n` : ''}Sorry for any inconvenience.\n\nDuality Pole Studio`,
          recipients: 'enrolled',
        }).catch(() => {})
      }

      // Issue credits
      if (creditOption === 'all' && parseFloat(defaultCreditAmount) > 0) {
        await Promise.all((enrolled || []).map(e =>
          client.post('/api/payments/', {
            student: e.student_id,
            amount: parseFloat(defaultCreditAmount),
            payment_type: 'credit',
            payment_method: 'account_credit',
            description: `Cancelled class credit — ${session?.name || 'class'}`,
          }).catch(() => {})
        ))
      } else if (creditOption === 'per_student') {
        await Promise.all((enrolled || []).map(e => {
          const amt = parseFloat(perStudentCredits[e.id] || 0)
          if (!amt || amt <= 0) return Promise.resolve()
          return client.post('/api/payments/', {
            student: e.student_id,
            amount: amt,
            payment_type: 'credit',
            payment_method: 'account_credit',
            description: `Cancelled class credit — ${session?.name || 'class'}`,
          }).catch(() => {})
        }))
      }

      onCancelled()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not cancel the class.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 500 }}>
        <div className="modal-title" style={{ color: '#ff6b6b' }}>
          Cancel Class — {session?.name}
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleCancel}>
          {error && <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12, background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}

          {/* Notify section */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: 10 }}>
              <input type="checkbox" checked={notifyStudents} onChange={e => setNotifyStudents(e.target.checked)} style={{ accentColor: 'var(--lime)' }} />
              Notify enrolled students
            </label>
            {notifyStudents && (
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Message / Reason <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(optional)</span></label>
                <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Instructor unwell, studio maintenance…" />
              </div>
            )}
          </div>

          {/* Credit section */}
          <div style={{ background: '#111', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--grey)', marginBottom: 10 }}>Refund / Credit</div>
            {[
              { value: 'none', label: 'No credit or refund' },
              { value: 'all', label: 'Issue account credit to all students' },
              { value: 'per_student', label: 'Review per-student' },
            ].map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8, fontSize: 13 }}>
                <input type="radio" name="creditOption" value={opt.value} checked={creditOption === opt.value} onChange={() => setCreditOption(opt.value)} style={{ accentColor: 'var(--lime)' }} />
                {opt.label}
              </label>
            ))}
            {creditOption === 'all' && (
              <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
                <label>Credit Amount per Student ($)</label>
                <input type="number" step="0.01" min="0" value={defaultCreditAmount} onChange={e => setDefaultCreditAmount(e.target.value)} placeholder="e.g. 33.75" />
              </div>
            )}
            {creditOption === 'per_student' && enrolled && enrolled.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {enrolled.map(e => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{e.student_name}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={perStudentCredits[e.id] ?? ''}
                      onChange={ev => setPerStudentCredits(m => ({ ...m, [e.id]: ev.target.value }))}
                      placeholder="0.00"
                      style={{ width: 90, background: 'var(--input, #1a1a1a)', border: '1px solid var(--border)', borderRadius: 6, color: '#fff', padding: '5px 8px', fontSize: 13, outline: 'none' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Keep Class</button>
            <button type="submit" className="btn btn-sm" style={{ background: 'rgba(255,107,107,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.3)' }} disabled={saving}>
              {saving ? 'Cancelling…' : 'Confirm Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AdminClassEnrolments() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('enrolled')

  const [addStudentModal, setAddStudentModal] = useState(false)
  const [emailModal, setEmailModal] = useState(false)
  const [contactModal, setContactModal] = useState(false)
  const [cancelClassModal, setCancelClassModal] = useState(false)
  const [payModal, setPayModal] = useState(null)
  const [cancelModal, setCancelModal] = useState(null)
  const [transferModal, setTransferModal] = useState(null)
  const [waitlistModal, setWaitlistModal] = useState(null)

  const load = useCallback(() => {
    classes.seasonEnrolments(id).then(r => {
      setData(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  // Prefer navigating back to the page we came from; fall back to timetable
  function goBack() {
    if (location.key !== 'default') {
      navigate(-1)
    } else {
      navigate('/admin/timetable')
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>
  if (!data) return <div style={{ padding: 40, color: 'var(--grey)' }}>Failed to load enrolment data.</div>

  const { session, enrolled = [], waitlist = [], transfers = [], cancelled = [] } = data
  const transfersIn = transfers.filter(t => t.direction === 'in')
  const transfersOut = transfers.filter(t => t.direction === 'out')

  const tabs = [
    { key: 'enrolled',  label: `Enrolled (${enrolled.length})` },
    { key: 'waitlist',  label: `Waitlist (${waitlist.length})` },
    { key: 'cancelled', label: `Cancelled (${cancelled.length})` },
    { key: 'transfers', label: `Transfers (${transfers.length})` },
  ]

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={goBack} style={{ background: 'none', border: 'none', color: 'var(--grey)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>←</button>
          <div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: 'var(--white)' }}>{session.name}</div>
            <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {session.day_of_week && <span>{session.day_of_week}</span>}
              {session.start_time && <span>{fmt12(session.start_time)}</span>}
              {session.instructor && <span>{session.instructor}</span>}
              {session.studio && <span>{session.studio}</span>}
              {session.season && <span style={{ color: 'var(--lime)' }}>{session.season}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: enrolled.length >= session.capacity ? '#ff6b6b' : 'var(--lime)' }}>
            {enrolled.length}/{session.capacity}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setAddStudentModal(true)}>+ Add Student</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setContactModal(true)}>Contact Class</button>
          <Link to={`/admin/classes/${id}`}><button className="btn btn-ghost btn-sm">Edit Class</button></Link>
          <Link to={`/admin/classes/${id}/attendance`}><button className="btn btn-ghost btn-sm">Attendance Register</button></Link>
          <button className="btn btn-ghost btn-sm" style={{ color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.3)' }} onClick={() => setCancelClassModal(true)}>Cancel Class</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid var(--lime)' : '2px solid transparent', color: tab === t.key ? 'var(--white)' : 'var(--grey)', fontWeight: tab === t.key ? 700 : 400, padding: '10px 18px', fontSize: 13, cursor: 'pointer', marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Enrolled tab ── */}
      {tab === 'enrolled' && (
        <div className="tbl-section">
          {enrolled.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--grey)', fontSize: 13 }}>No enrolled students.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Level</th>
                  <th>Enrolled</th>
                  <th>Class # in Season</th>
                  <th>Price Paid</th>
                  <th>Flags</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {enrolled.map(e => (
                  <tr key={e.id}>
                    <td>
                      <Link to={`/admin/students/${e.student_id}`} style={{ color: 'var(--white)', fontWeight: 600, textDecoration: 'none' }}>{e.student_name}</Link>
                    </td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{e.student_level || '—'}</td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                      {e.enrolled_date ? new Date(e.enrolled_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {e.season_enrolment_count ? <span style={{ color: 'var(--lime)' }}>{ordinal(e.season_enrolment_count)} class</span> : '—'}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {e.incremental_price != null ? <span>${e.incremental_price}</span> : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {e.is_new_to_duality && <FlagBadge label="New to Duality" color="#1a3a1a" textColor="#ccff00" />}
                        {e.is_first_visit && <FlagBadge label="First visit" color="#1a2a3a" textColor="#88ccff" />}
                        {e.level_override && <FlagBadge label="Bypassed level" color="#3a2a00" textColor="#ffcc44" />}
                        {e.flag_dismissed && <FlagBadge label="Flag dismissed" color="#2a1a1a" textColor="#ff8888" />}
                        {!e.is_new_to_duality && !e.is_first_visit && !e.level_override && !e.flag_dismissed && <span style={{ color: 'var(--grey)', fontSize: 12 }}>—</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost btn-xs" style={{ color: 'var(--lime)' }} onClick={() => setPayModal({ ...e, session_name: session.name, defaultAmount: e.incremental_price })}>Pay</button>
                        <button className="btn btn-ghost btn-xs" onClick={() => setTransferModal(e)}>Transfer</button>
                        <Link to={`/admin/students/${e.student_id}?tab=messages`}><button className="btn btn-ghost btn-xs">Chat</button></Link>
                        <button className="btn btn-ghost btn-xs" style={{ color: '#ff8888' }} onClick={() => setCancelModal({ ...e, session_name: session.name })}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Waitlist tab ── */}
      {tab === 'waitlist' && (
        <div className="tbl-section">
          {waitlist.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--grey)', fontSize: 13 }}>Nobody on the waitlist.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Level</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.map(e => (
                  <tr key={e.id}>
                    <td style={{ color: 'var(--amber)', fontWeight: 700 }}>{e.waitlist_position ?? '—'}</td>
                    <td>
                      <Link to={`/admin/students/${e.student_id}`} style={{ color: 'var(--white)', fontWeight: 600, textDecoration: 'none' }}>{e.student_name}</Link>
                    </td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{e.student_level || '—'}</td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                      {e.enrolled_date ? new Date(e.enrolled_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                    <td>
                      <button className="btn btn-lime btn-xs" onClick={() => setWaitlistModal({ ...e, session_name: session.name })}>Add to Class</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Cancelled tab ── */}
      {tab === 'cancelled' && (
        <div className="tbl-section">
          {cancelled.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--grey)', fontSize: 13 }}>No cancelled enrolments.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Type</th>
                  <th>Cancelled</th>
                  <th>Notes / Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cancelled.map(e => (
                  <tr key={e.id}>
                    <td>
                      <Link to={`/admin/students/${e.student_id}`} style={{ color: 'var(--white)', fontWeight: 600, textDecoration: 'none' }}>{e.student_name}</Link>
                      {e.student_level && <div style={{ fontSize: 11, color: 'var(--grey)' }}>Level {e.student_level}</div>}
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#1a1a1a', color: '#888' }}>
                        {e.enrolment_type === 'trial' ? 'Trial' : e.enrolment_type === 'casual' ? 'Casual' : 'Enrolled'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                      {e.cancelled_date ? new Date(e.cancelled_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ color: 'var(--grey)', fontSize: 12, maxWidth: 220 }}>
                      {e.notes || '—'}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-xs" onClick={async () => {
                        if (!confirm(`Reinstate ${e.student_name}?`)) return
                        try {
                          await client.patch(`/api/enrolments/${e.id}/`, { status: 'active' })
                          load()
                        } catch {
                          alert('Could not reinstate enrolment.')
                        }
                      }}>Reinstate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Transfers tab ── */}
      {tab === 'transfers' && (
        <div>
          {transfers.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--grey)', fontSize: 13 }}>No transfer requests for this class.</div>
          ) : (
            <>
              {transfersIn.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: 12 }}>Transferring In ({transfersIn.length})</div>
                  <div className="tbl-section">
                    <table>
                      <thead><tr><th>Student</th><th>From</th><th>Status</th><th>Date</th><th>Notes</th></tr></thead>
                      <tbody>
                        {transfersIn.map(t => (
                          <tr key={t.id}>
                            <td><Link to={`/admin/students/${t.student_id}`} style={{ color: 'var(--white)', fontWeight: 600, textDecoration: 'none' }}>{t.student_name}</Link></td>
                            <td style={{ color: 'var(--grey)', fontSize: 12 }}>{t.from_class || '—'}</td>
                            <td><StatusBadge status={t.status} /></td>
                            <td style={{ color: 'var(--grey)', fontSize: 12 }}>{t.created_at ? new Date(t.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}</td>
                            <td style={{ color: 'var(--grey)', fontSize: 12, maxWidth: 200 }}>{t.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {transfersOut.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--lav)', marginBottom: 12 }}>Transferring Out ({transfersOut.length})</div>
                  <div className="tbl-section">
                    <table>
                      <thead><tr><th>Student</th><th>To</th><th>Status</th><th>Date</th><th>Notes</th></tr></thead>
                      <tbody>
                        {transfersOut.map(t => (
                          <tr key={t.id}>
                            <td><Link to={`/admin/students/${t.student_id}`} style={{ color: 'var(--white)', fontWeight: 600, textDecoration: 'none' }}>{t.student_name}</Link></td>
                            <td style={{ color: 'var(--grey)', fontSize: 12 }}>{t.to_class || '—'}</td>
                            <td><StatusBadge status={t.status} /></td>
                            <td style={{ color: 'var(--grey)', fontSize: 12 }}>{t.created_at ? new Date(t.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}</td>
                            <td style={{ color: 'var(--grey)', fontSize: 12, maxWidth: 200 }}>{t.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {addStudentModal && (
        <AddStudentModal
          sessionId={id}
          session={session}
          onClose={() => setAddStudentModal(false)}
          onAdded={() => { setAddStudentModal(false); load() }}
        />
      )}

      {emailModal && (
        <ContactClassModal
          sessionId={id}
          enrolled={enrolled}
          onClose={() => setEmailModal(false)}
        />
      )}

      {contactModal && (
        <ContactClassModal
          sessionId={id}
          enrolled={enrolled}
          onClose={() => setContactModal(false)}
        />
      )}

      {cancelClassModal && (
        <CancelClassModal
          sessionId={id}
          session={session}
          enrolled={enrolled}
          onClose={() => setCancelClassModal(false)}
          onCancelled={() => { setCancelClassModal(false); load() }}
        />
      )}

      {payModal && (
        <PaymentModal
          enrolment={payModal}
          session={session}
          defaultAmount={payModal.defaultAmount}
          onClose={() => setPayModal(null)}
          onSuccess={() => { setPayModal(null); load() }}
        />
      )}

      {cancelModal && (
        <CancelEnrolmentModal
          enrolment={cancelModal}
          onClose={() => setCancelModal(null)}
          onSuccess={() => { setCancelModal(null); load() }}
        />
      )}

      {transferModal && (
        <TransferModal
          enrolment={transferModal}
          onClose={() => setTransferModal(null)}
          onSuccess={() => { setTransferModal(null); load() }}
        />
      )}

      {waitlistModal && (
        <AddFromWaitlistModal
          enrolment={waitlistModal}
          session={session}
          onClose={() => setWaitlistModal(null)}
          onSuccess={() => { setWaitlistModal(null); load() }}
        />
      )}
    </div>
  )
}
