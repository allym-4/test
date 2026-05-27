import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { users, payments, enrolments, attendance, helpdesk, skills as skillsApi, forms as formsApi, settings as settingsApi, classes, seasons as seasonsApi, tags as tagsApi, homework } from '../../api'
import client from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import '../StudentsPage.css'

function PaymentDetailModal({ payment, onClose, onRefunded }) {
  if (!payment) return null
  const METHOD_LABELS = { card: 'Credit/Debit Card', cash: 'Cash', bank_transfer: 'Bank Transfer', account_credit: 'Account Credit', other: 'Other' }
  const TYPE_LABELS = { payment: 'Payment received', charge: 'Invoice / Charge', refund: 'Refund', credit: 'Credit', no_show_fee: 'No-show Fee' }
  const isCredit = ['payment', 'credit', 'refund'].includes(payment.payment_type)
  const amt = parseFloat(payment.amount || 0)
  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 420 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>Transaction Detail</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: isCredit ? 'var(--lime)' : 'var(--red)' }}>
                {isCredit ? '+' : '-'}${amt.toFixed(2)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 2 }}>
                {new Date(payment.created_at).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <span className={`tag ${isCredit ? 'tag-lime' : 'tag-red'}`} style={{ fontSize: 11 }}>
              {TYPE_LABELS[payment.payment_type] || payment.payment_type}
            </span>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--grey)' }}>Description</span>
              <span style={{ fontSize: 13 }}>{payment.description || '—'}</span>
            </div>
            {payment.payment_method && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--grey)' }}>Method</span>
                <span style={{ fontSize: 13 }}>{METHOD_LABELS[payment.payment_method] || payment.payment_method}</span>
              </div>
            )}
            {payment.reference && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--grey)' }}>Reference</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--grey)' }}>{payment.reference}</span>
              </div>
            )}
            {payment.stripe_payment_intent_id && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--grey)' }}>Stripe ID</span>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--grey)' }}>{payment.stripe_payment_intent_id}</span>
              </div>
            )}
            {payment.stripe_payment_intent_id && payment.payment_type === 'payment' && (
              <StripeRefundButton payment={payment} onRefunded={onRefunded} />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--grey)' }}>Logged by</span>
              <span style={{ fontSize: 13 }}>{payment.created_by_name || 'System'}</span>
            </div>
            {payment.cash_promised_date && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--grey)' }}>Cash promised by</span>
                <span style={{ fontSize: 13 }}>{new Date(payment.cash_promised_date).toLocaleDateString('en-AU')}</span>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ width: '100%' }}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
function StripeRefundButton({ payment, onRefunded }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(String(Math.abs(payment.amount)))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleRefund() {
    setLoading(true)
    setError(null)
    try {
      const cents = Math.round(parseFloat(amount) * 100)
      await client.post('/api/payments/stripe/refund/', {
        payment_id: payment.id,
        amount_cents: cents,
      })
      setOpen(false)
      if (onRefunded) onRefunded()
    } catch (err) {
      setError(err.response?.data?.detail || 'Refund failed.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)', marginTop: 8 }} onClick={() => setOpen(true)}>
        Refund via Stripe
      </button>
    )
  }

  return (
    <div style={{ marginTop: 10, background: 'rgba(255,68,68,0.07)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--red)' }}>Refund via Stripe</div>
      {error && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--grey)' }}>Amount $</span>
        <input
          type="number"
          step="0.01"
          min="0.01"
          max={Math.abs(payment.amount)}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          style={{ width: 90, background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#fff', padding: '5px 8px', fontSize: 12 }}
        />
        <button className="btn btn-xs" style={{ background: 'var(--red)', color: '#fff', border: 'none' }} onClick={handleRefund} disabled={loading}>
          {loading ? '…' : 'Confirm Refund'}
        </button>
        <button className="btn btn-ghost btn-xs" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  )
}

import EditStudentModal from '../../components/EditStudentModal'
import TakePaymentModal from '../../components/TakePaymentModal'
import AddChargeModal from '../../components/AddChargeModal'
import AddToClassModal from '../../components/AddToClassModal'

function DmThread({ convId, studentFirstName }) {
  const [msgs, setMsgs] = useState(null)
  const [open, setOpen] = useState(false)

  async function load() {
    if (msgs) { setOpen(o => !o); return }
    const res = await helpdesk.dms(convId).catch(() => ({ data: [] }))
    setMsgs(res.data || [])
    setOpen(true)
  }

  return (
    <div>
      <button onClick={load} className="btn btn-ghost btn-xs" style={{ fontSize: 10, marginBottom: 6 }}>
        {open ? 'Hide messages' : 'Show messages'}
      </button>
      {open && msgs && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto', padding: 2 }}>
          {msgs.length === 0 && <div style={{ fontSize: 12, color: 'var(--grey)' }}>No messages</div>}
          {msgs.map(m => {
            const isStudent = m.sender_detail?.role === 'student' || m.sender_detail?.id === m.sender
            return (
              <div key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: isStudent ? 'row-reverse' : 'row' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: isStudent ? 'var(--lav)' : 'var(--lime)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                  {isStudent ? (studentFirstName?.[0] || '?') : (m.sender_detail?.first_name?.[0] || '?')}
                </div>
                <div style={{ maxWidth: '75%', background: isStudent ? 'rgba(176,160,255,0.12)' : '#1a1a1a', border: `1px solid ${isStudent ? 'rgba(176,160,255,0.2)' : 'var(--border)'}`, borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 3 }}>{m.sender_detail?.display_name || 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: 'var(--white)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.body}</div>
                  <div style={{ fontSize: 10, color: 'var(--grey)', marginTop: 4 }}>
                    {new Date(m.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} {new Date(m.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const AVATAR_COLORS = ['#b0a0ff', '#ccff00', '#ffaa00', '#ff88aa', '#44ffcc', '#ffcc88', '#b0f0b0', '#9ac4ff', '#ffb3de', '#44ff99']
function avatarColor(name) {
  let h = 0
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

function getAttTag(a, makeupCredits) {
  if (a.status === 'present') return { label: 'Attended', cls: 'tag-lime' }
  if (a.status === 'late') return { label: 'Late', cls: 'tag-amber' }
  if (a.status === 'no_show') {
    if (a.no_show_fee_charged) return { label: 'No-show · Fee charged', cls: 'tag-red' }
    if (a.no_show_fee_waived) return { label: 'No-show · Fee waived', cls: 'tag-amber' }
    return { label: 'No-show', cls: 'tag-red' }
  }
  if (a.status === 'absent') {
    // If a makeup credit was issued for this occurrence, it was an early cancel (>4hrs)
    const hadCredit = (makeupCredits || []).some(c => c.source_occurrence === a.occurrence)
    if (hadCredit) return { label: 'Marked away · Credit issued', cls: 'tag-grey' }
    return { label: 'Late cancel · No credit', cls: 'tag-amber' }
  }
  return { label: a.status, cls: 'tag-grey' }
}

function BlockAccountModal({ student, onClose, onConfirm }) {
  const isBlocking = !student.booking_blocked
  const [reason, setReason] = useState(student.block_reason || '')
  const [saving, setSaving] = useState(false)
  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 420 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>
            {isBlocking ? 'Block from Booking' : 'Unblock Account'}
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          {isBlocking ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 14 }}>
                {student.first_name} will not be able to make new bookings. Their existing enrolments remain active.
              </p>
              <div className="field">
                <label>Reason <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(internal only)</span></label>
                <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Outstanding balance — payment due by end of week"
                  style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 20 }}>
              This will restore {student.first_name}'s ability to make bookings.
              {student.block_reason && <><br /><br /><span style={{ color: '#fff' }}>Block reason was:</span> {student.block_reason}</>}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-sm"
              style={{ background: isBlocking ? 'var(--red)' : 'var(--lime)', color: isBlocking ? '#fff' : '#000' }}
              disabled={saving}
              onClick={async () => {
                setSaving(true)
                await onConfirm({ booking_blocked: isBlocking, block_reason: isBlocking ? reason : '' })
              }}
            >
              {saving ? '…' : isBlocking ? 'Block from Booking' : 'Unblock Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StudentNewPlanModal({ student, seasonsData, onClose, onSaved, outstandingBalance }) {
  const today = new Date().toISOString().slice(0, 10)
  const currentSeason = seasonsData.find(s => s.status === 'active') || seasonsData[0]
  const initialAmount = outstandingBalance && outstandingBalance > 0 ? outstandingBalance.toFixed(2) : ''
  const [form, setForm] = useState({
    description: '',
    total_amount: initialAmount,
    deposit: '',
    frequency: 'fortnightly',
    num_instalments: '4',
    start_date_type: 'today',
    custom_start_date: today,
    notes: '',
    payment_method: 'card',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function getStartDate() {
    if (form.start_date_type === 'today') return today
    if (form.start_date_type === 'season_start') return currentSeason?.start_date || today
    return form.custom_start_date || today
  }

  function addDays(d, n) { const x = new Date(d + 'T00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10) }
  function nextDate(cursor, freq, i) {
    if (freq === 'weekly') return addDays(cursor, 7)
    if (freq === 'fortnightly') return addDays(cursor, 14)
    const x = new Date(cursor + 'T00:00'); x.setMonth(x.getMonth() + 1); return x.toISOString().slice(0, 10)
  }

  const previewInstalments = (() => {
    if (!form.total_amount) return []
    const total = parseFloat(form.total_amount)
    const dep = parseFloat(form.deposit || 0)
    const count = parseInt(form.num_instalments) || 4
    const start = getStartDate()
    const items = []
    if (dep > 0) items.push({ label: 'Deposit', amount: dep.toFixed(2), due_date: start })
    const remaining = total - dep
    if (remaining > 0 && count > 0) {
      const instAmt = (remaining / count).toFixed(2)
      let cursor = start
      for (let i = 0; i < count; i++) {
        cursor = nextDate(cursor, form.frequency, i)
        items.push({ label: `Instalment ${i + 1}`, amount: instAmt, due_date: cursor })
      }
    }
    return items
  })()

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await payments.plans.create({
        student: student.id,
        description: form.description,
        total_amount: parseFloat(form.total_amount),
        status: 'active',
        notes: form.notes,
        payment_method: form.payment_method,
      })
      for (const ins of previewInstalments) {
        await payments.plans.createInstalment({ plan: res.data.id, amount: parseFloat(ins.amount), due_date: ins.due_date, status: 'pending' })
      }
      onSaved()
    } catch (err) {
      const data = err.response?.data
      setError((data && typeof data === 'object' ? Object.values(data).flat().join(' ') : null) || 'Failed to create plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 500 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>New Payment Plan — {student.display_name}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit}>
          {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>}
          <div className="field">
            <label>Description</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} required placeholder="e.g. Season 4 — Level 2" />
          </div>
          <div className="field">
            <label>Payment Method</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                ['card', '💳 Card on file'],
                ['prompt_card', '📲 Prompt to add card'],
                ['cash', '💵 Cash'],
                ['bank_transfer', '🏦 Bank transfer'],
              ].map(([v, lbl]) => (
                <button key={v} type="button" onClick={() => set('payment_method', v)}
                  style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid', borderColor: form.payment_method === v ? 'var(--lime)' : 'var(--border)', background: form.payment_method === v ? 'rgba(204,255,0,0.1)' : 'transparent', color: form.payment_method === v ? 'var(--lime)' : 'var(--grey)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  {lbl}
                </button>
              ))}
            </div>
            {form.payment_method === 'cash' && <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 6 }}>Student will be notified and cash payments tracked in their profile. You'll get a dashboard alert.</div>}
            {form.payment_method === 'bank_transfer' && <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 6 }}>Student will be notified to arrange bank transfer. Mark instalments paid manually when received.</div>}
            {form.payment_method === 'prompt_card' && <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 6 }}>Student will be prompted to save a card next time they log in.</div>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Total Amount ($){outstandingBalance > 0 && <span style={{ color: 'var(--amber)', fontSize: 11, marginLeft: 6 }}>← auto-filled from outstanding balance</span>}</label>
              <input type="number" step="0.01" value={form.total_amount} onChange={e => set('total_amount', e.target.value)} required placeholder="0.00" />
            </div>
            <div className="field">
              <label>Deposit / Upfront ($)</label>
              <input type="number" step="0.01" value={form.deposit} onChange={e => set('deposit', e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Frequency</label>
              <select value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="field">
              <label>Number of Instalments</label>
              <input type="number" min="1" max="52" value={form.num_instalments} onChange={e => set('num_instalments', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Start Date</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              {[['today', 'Today'], ['season_start', `Season start${currentSeason?.start_date ? ` (${new Date(currentSeason.start_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })})` : ''}`], ['custom', 'Custom']].map(([v, lbl]) => (
                <button key={v} type="button" onClick={() => set('start_date_type', v)}
                  style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid', borderColor: form.start_date_type === v ? 'var(--lime)' : 'var(--border)', background: form.start_date_type === v ? 'rgba(204,255,0,0.1)' : 'transparent', color: form.start_date_type === v ? 'var(--lime)' : 'var(--grey)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  {lbl}
                </button>
              ))}
            </div>
            {form.start_date_type === 'custom' && (
              <input type="date" value={form.custom_start_date} onChange={e => set('custom_start_date', e.target.value)} />
            )}
          </div>
          {previewInstalments.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 12, padding: 0, marginBottom: 8 }} onClick={() => setPreview(p => !p)}>
                {preview ? '▾' : '▸'} Preview {previewInstalments.length} instalment{previewInstalments.length !== 1 ? 's' : ''}
              </button>
              {preview && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  {previewInstalments.map((ins, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: i < previewInstalments.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12 }}>
                      <span style={{ color: 'var(--grey)' }}>{ins.label}</span>
                      <span>${ins.amount}</span>
                      <span style={{ color: 'var(--grey)' }}>{new Date(ins.due_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="field">
            <label>Notes (optional)</label>
            <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes…" />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Creating…' : 'Create Plan'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const NOTE_CATS = [
  { key: 'all',     label: 'All' },
  { key: 'medical', label: '🏥 Medical' },
  { key: 'injury',  label: '🩹 Injury' },
  { key: 'vibe',    label: '✨ Vibe' },
  { key: 'general', label: '📝 General' },
]

const SKILL_LEVELS = {
  'Level 1': ['Fireman Spin', 'Chair Spin', 'Front Hook Spin', 'Body Wave', 'Basic Climb', 'Pole Hold & Grip', 'Floor Work Sequence'],
  'Level 2': ['Carousel Spin', 'Attitude Spin', 'Back Hook Spin', 'Crucifix', 'Hip Hold', 'Tuck Invert Prep', 'Brass Monkey'],
  'Level 3': ['Aerial Invert', 'Caterpillar', 'Russian Layback', 'Dead Lift Prep', 'Superman', 'Cross-knee Release', 'Handspring Prep'],
  'High Tricks': ['Iron X', 'Handspring', 'Deadlift Flag', 'Hollow Back', 'Pencil Drop', 'Shoulder Mount', 'Flag'],
}

function ConvertTrialModal({ enrolment, student, onClose, onSuccess }) {
  const { data: studioData } = { data: null }
  const [studioSettings, setStudioSettings] = useState({})
  useEffect(() => { settingsApi.get().then(r => setStudioSettings(r.data?.data || r.data || {})).catch(() => {}) }, [])
  const seasonPrice = parseFloat(studioSettings.price_season || 270)
  const trialPrice = parseFloat(studioSettings.price_trial || 35)
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

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const description = `Season enrolment — ${enrolment.class_session_detail?.name} (converted from trial)`
      if (usePlan) {
        await enrolments.convertTrial(enrolment.id, { payment_plan: true, instalments, description })
      } else {
        await enrolments.convertTrial(enrolment.id, { amount_paid: parseFloat(amountVal), payment_type: paymentType, reference, description })
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
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 460 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Convert Trial to Full Enrolment</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit}>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--white)', fontWeight: 600 }}>{student.first_name} {student.last_name}</span>
            {' '}· {enrolment.class_session_detail?.name}
          </div>
          <div style={{ background: '#111', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'var(--grey)', marginBottom: 16 }}>
            Season price: <b style={{ color: 'var(--white)' }}>${seasonPrice.toFixed(2)}</b>
            {' '}— Trial paid: <b style={{ color: 'var(--white)' }}>${trialPrice.toFixed(2)}</b>
            {' '}= <b style={{ color: 'var(--lime)' }}>${defaultAmount} remaining</b>
          </div>
          {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 16 }}>
            <input type="checkbox" checked={usePlan} onChange={e => setUsePlan(e.target.checked)} />
            Set up a payment plan
          </label>
          {usePlan ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--grey)' }}>Instalments</label>
                <select value={numInstalments} onChange={e => setNumInstalments(parseInt(e.target.value))} style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--white)', padding: '4px 8px', fontSize: 13 }}>
                  {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              {instalments.map((inst, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: 11 }}>Instalment {i + 1} ($)</label>
                    <input type="number" step="0.01" min="0" value={inst.amount} onChange={e => updateInstalment(i, 'amount', e.target.value)} />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: 11 }}>Due date</label>
                    <input type="date" value={inst.due_date} onChange={e => updateInstalment(i, 'due_date', e.target.value)} />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 12, color: 'var(--grey)', textAlign: 'right', marginBottom: 12 }}>
                Total: <b style={{ color: planTotal > 0 ? 'var(--lime)' : 'var(--grey)' }}>${planTotal.toFixed(2)}</b>
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label>Amount to charge ($)</label>
                <input type="number" step="0.01" min="0" value={amountVal} onChange={e => setAmount(e.target.value)} placeholder={defaultAmount} />
              </div>
              <div className="field">
                <label>Payment type</label>
                <select value={paymentType} onChange={e => setPaymentType(e.target.value)}>
                  <option value="payment">Payment received</option>
                  <option value="charge">Charge (invoice / owing)</option>
                </select>
              </div>
              <div className="field">
                <label>Reference <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(optional)</span></label>
                <input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. cash, Square receipt #" />
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>
              {saving ? 'Converting…' : usePlan ? `Create Plan $${planTotal.toFixed(2)}` : `Confirm — $${parseFloat(amountVal || 0).toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddPracticeCreditsModal({ student, onClose, onSuccess }) {
  const [count, setCount] = useState(1)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await classes.practice.credits.create({
        student: student.id,
        count: parseInt(count),
        notes,
      })
      onSuccess(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add credits.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 400 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Add Practice Credits</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>
          )}
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16 }}>
            Adding prepaid practice session credits to <strong style={{ color: 'var(--white)' }}>{student.first_name} {student.last_name}</strong>. Each credit = 1 free practice session.
          </div>
          <div className="field">
            <label>Number of credits</label>
            <select value={count} onChange={e => setCount(e.target.value)}>
              {[1,2,3,4,5,6,8,10].map(n => <option key={n} value={n}>{n} credit{n !== 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Notes <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(optional)</span></label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. 4-session prepay pack" />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>
              {saving ? 'Adding…' : `Add ${count} Credit${count != 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddCatchupCreditsModal({ student, onClose, onSuccess }) {
  const [count, setCount] = useState(1)
  const [adminNotes, setAdminNotes] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const created = []
      for (let i = 0; i < parseInt(count); i++) {
        const payload = { student: student.id, reason: 'Manually added by admin', status: 'available', ...(adminNotes ? { admin_notes: adminNotes } : {}), ...(expiresAt ? { expires_at: expiresAt } : {}) }
        const res = await attendance.makeupCredits.create(payload)
        created.push(res.data)
      }
      onSuccess(created)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add catch-up credits.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 400 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Add Catch-up Credits</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>
          )}
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16 }}>
            Adding catch-up credits to <strong style={{ color: 'var(--white)' }}>{student.first_name} {student.last_name}</strong>. Each credit lets the student book one catch-up class.
          </div>
          <div className="field">
            <label>Number of credits</label>
            <select value={count} onChange={e => setCount(e.target.value)}>
              {[1,2,3,4,5,6,8,10].map(n => <option key={n} value={n}>{n} credit{n !== 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Expiry date <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(optional — leave blank for no expiry)</span></label>
            <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </div>
          <div className="field">
            <label>Admin notes <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(internal only, not visible to student)</span></label>
            <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="e.g. Goodwill credit for cancelled class" rows={2} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>
              {saving ? 'Adding…' : `Add ${count} Credit${count != 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StudentTagsRow({ student, setStudent }) {
  const { data: allTagsData } = useApi(() => tagsApi.list())
  const allTags = allTagsData?.results || allTagsData || []
  const [open, setOpen] = useState(false)
  const studentTags = student.tags || []

  async function addTag(tag) {
    try {
      await tagsApi.addToStudent(student.id, tag.id)
      setStudent(s => ({ ...s, tags: [...(s.tags || []), tag] }))
    } catch {}
    setOpen(false)
  }

  async function removeTag(tag) {
    try {
      await tagsApi.removeFromStudent(student.id, typeof tag === 'object' ? tag.id : tag)
      setStudent(s => ({ ...s, tags: (s.tags || []).filter(t => (typeof t === 'object' ? t.id : t) !== (typeof tag === 'object' ? tag.id : tag)) }))
    } catch {}
  }

  const assignedIds = new Set(studentTags.map(t => typeof t === 'object' ? t.id : t))
  const available = allTags.filter(t => !assignedIds.has(t.id))

  return (
    <div className="info-val" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', position: 'relative' }}>
      {studentTags.map((t, i) => {
        const name = typeof t === 'string' ? t : t.name
        const colour = typeof t === 'object' && t.colour ? t.colour : null
        return (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: colour ? colour + '33' : 'rgba(255,170,0,0.15)', color: colour || 'var(--amber)', border: `1px solid ${colour ? colour + '55' : 'rgba(255,170,0,0.3)'}` }}>
            {name}
            <button onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', fontSize: 10, lineHeight: 1, opacity: 0.7 }}>✕</button>
          </span>
        )
      })}
      <div style={{ position: 'relative' }}>
        <button className="btn btn-ghost btn-xs" onClick={() => setOpen(v => !v)}>+ Tag</button>
        {open && (
          <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, zIndex: 10, minWidth: 160, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
            {available.length === 0 ? (
              <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--grey)' }}>All tags assigned</div>
            ) : available.map(tag => (
              <button key={tag.id} onClick={() => addTag(tag)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 14px', cursor: 'pointer', fontSize: 12, color: 'var(--white)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#222'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: tag.colour || '#888', marginRight: 8 }} />
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BlockedSessionsRow({ student, setStudent }) {
  const blocked = student.blocked_sessions || []
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [allSessions, setAllSessions] = useState([])
  const [sessLoading, setSessLoading] = useState(false)

  async function openAdding() {
    setAdding(true)
    if (allSessions.length > 0) return
    setSessLoading(true)
    try {
      const res = await classes.list({ page_size: 300 })
      setAllSessions(res.data?.results || res.data || [])
    } catch {
      setAllSessions([])
    } finally {
      setSessLoading(false)
    }
  }

  const available = allSessions.filter(s =>
    !blocked.includes(s.id) &&
    (s.name?.toLowerCase().includes(search.toLowerCase()) || !search)
  )

  async function addBlock(sessionId) {
    const updated = [...blocked, sessionId]
    await users.update(student.id, { blocked_sessions: updated })
    setStudent(s => ({ ...s, blocked_sessions: updated }))
    setAdding(false)
    setSearch('')
  }

  async function removeBlock(sessionId) {
    const updated = blocked.filter(id => id !== sessionId)
    await users.update(student.id, { blocked_sessions: updated })
    setStudent(s => ({ ...s, blocked_sessions: updated }))
  }

  const blockedNames = blocked.map(id => allSessions.find(s => s.id === id)?.name || `Session #${id}`)

  return (
    <div className="info-row" style={{ alignItems: 'flex-start' }}>
      <div className="info-label" style={{ paddingTop: 4 }}>Blocked Classes</div>
      <div className="info-val">
        {blockedNames.length === 0 && !adding && (
          <span style={{ fontSize: 12, color: 'var(--grey)' }}>None</span>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: blockedNames.length > 0 ? 8 : 0 }}>
          {blockedNames.map((name, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 20, padding: '2px 10px', fontSize: 11, color: 'var(--red)' }}>
              {name}
              <button onClick={() => removeBlock(blocked[i])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 13, lineHeight: 1, padding: 0 }}>✕</button>
            </span>
          ))}
        </div>
        {adding ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search classes…"
              style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 6, color: '#fff', fontSize: 12, padding: '5px 10px', width: 200 }}
            />
            <div style={{ maxHeight: 160, overflowY: 'auto', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8 }}>
              {sessLoading && <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--grey)' }}>Loading…</div>}
              {available.slice(0, 20).map(s => (
                <div key={s.id} onClick={() => addBlock(s.id)} style={{ padding: '7px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#222'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  {s.name}
                </div>
              ))}
              {available.length === 0 && <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--grey)' }}>No classes found</div>}
            </div>
            <button className="btn btn-ghost btn-xs" onClick={() => { setAdding(false); setSearch('') }}>Cancel</button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-xs" style={{ fontSize: 10 }} onClick={openAdding}>+ Block a class</button>
        )}
      </div>
    </div>
  )
}

export default function AdminStudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const isAdmin = currentUser?.role === 'admin'

  const [student, setStudent] = useState(null)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [studentLoading, setStudentLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [balanceData, setBalanceData] = useState(null)
  const [enrolData, setEnrolData] = useState(null)
  const [attData, setAttData] = useState(null)
  const [notesData, setNotesData] = useState(null)
  const [payData, setPayData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showCharge, setShowCharge] = useState(false)
  const [showAddToClass, setShowAddToClass] = useState(false)
  const [convertTrialEnrol, setConvertTrialEnrol] = useState(null)
  const [savedCardsData, setSavedCardsData] = useState(null)
  const [chargingSaved, setChargingSaved] = useState(false)
  const [chargeError, setChargeError] = useState(null)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [showRefundCredit, setShowRefundCredit] = useState(false)
  const [showAccountCredit, setShowAccountCredit] = useState(false)
  const [showTransferCancel, setShowTransferCancel] = useState(false) // false | 'list' | enrolment-object
  const [tcStep, setTcStep] = useState(null) // null | 'transfer' | 'cancel' | 'cancel_all'
  const [tcEnrolment, setTcEnrolment] = useState(null)
  const [tcNewSession, setTcNewSession] = useState('')
  const [tcResolution, setTcResolution] = useState('credit')
  const [tcNotes, setTcNotes] = useState('')
  const [tcSaving, setTcSaving] = useState(false)
  const [tcError, setTcError] = useState(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundDesc, setRefundDesc] = useState('')
  const [refundType, setRefundType] = useState('refund')
  const [creditAmount, setCreditAmount] = useState('')
  const [creditDesc, setCreditDesc] = useState('')
  const [creditExpiry, setCreditExpiry] = useState('')
  const [creditAdminNotes, setCreditAdminNotes] = useState('')
  const [showAddCatchupCredits, setShowAddCatchupCredits] = useState(false)
  const [savingRefund, setSavingRefund] = useState(false)
  const [savingCredit, setSavingCredit] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteCategory, setNoteCategory] = useState('general')
  const [noteRecheckDate, setNoteRecheckDate] = useState('')
  const [noteIsPermanent, setNoteIsPermanent] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [noteCatFilter, setNoteCatFilter] = useState('all')
  const [showArchivedNotes, setShowArchivedNotes] = useState(false)
  const [skillLevel, setSkillLevel] = useState('Level 1')
  const [skillProgress, setSkillProgress] = useState({})
  const [homeworkData, setHomeworkData] = useState([])
  const [regressionModal, setRegressionModal] = useState(null) // { skillName, level } | null
  const [regressionNote, setRegressionNote] = useState('')
  const [savingRegression, setSavingRegression] = useState(false)
  const [formsData, setFormsData] = useState(null)
  const [lockerData, setLockerData] = useState(null)
  const [commsData, setCommsData] = useState(null)
  const [chatHistory, setChatHistory] = useState(null)
  const [loadingChat, setLoadingChat] = useState(false)
  const [dmConversations, setDmConversations] = useState(null)
  const [notificationsData, setNotificationsData] = useState(null)
  const [commsFilter, setCommsFilter] = useState('all')
  const [loadingComms, setLoadingComms] = useState(false)
  const [viewForm, setViewForm] = useState(null)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetPwNew, setResetPwNew] = useState('')
  const [resetPwConfirm, setResetPwConfirm] = useState('')
  const [resetPwError, setResetPwError] = useState(null)
  const [resetPwSuccess, setResetPwSuccess] = useState(false)
  const [savingResetPw, setSavingResetPw] = useState(false)
  const [changeRequestsData, setChangeRequestsData] = useState(null)
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(null)
  const [changeReqNewSession, setChangeReqNewSession] = useState('')
  const [changeReqRefundAction, setChangeReqRefundAction] = useState('none')
  const [changeReqRefundAmount, setChangeReqRefundAmount] = useState('')
  const [changeReqChargeAmount, setChangeReqChargeAmount] = useState('')
  const [changeReqAdminNotes, setChangeReqAdminNotes] = useState('')
  const [processingChangeReq, setProcessingChangeReq] = useState(false)
  const [changeReqError, setChangeReqError] = useState(null)
  const [allSessions, setAllSessions] = useState(null)
  const [seasonSessions, setSeasonSessions] = useState([])
  const [seasonSessionsLoading, setSeasonSessionsLoading] = useState(false)
  const [seasonsData, setSeasonsData] = useState(null)
  const [casualBookingsData, setCasualBookingsData] = useState(null)
  const [makeupCreditsData, setMakeupCreditsData] = useState(null)
  const [practiceCreditsData, setPracticeCreditsData] = useState(null)
  const [showAddPracticeCredits, setShowAddPracticeCredits] = useState(false)
  const [enrolSubTab, setEnrolSubTab] = useState('current')
  const [tcTransferClass, setTcTransferClass] = useState('')
  const [tcTransferSeasonId, setTcTransferSeasonId] = useState(null)
  const [expandedTrialId, setExpandedTrialId] = useState(null)
  const [chaseHistory, setChaseHistory] = useState(null)
  const [showNewPlanModal, setShowNewPlanModal] = useState(false)
  const [showExemptionForm, setShowExemptionForm] = useState(false)
  const [exemptionEndDate, setExemptionEndDate] = useState('')
  const [exemptionNotes, setExemptionNotes] = useState('')
  const [savingExemption, setSavingExemption] = useState(false)
  const [exemptions, setExemptions] = useState([])

  useEffect(() => {
    users.get(id).then(res => {
      setStudent(res.data)
      setStudentLoading(false)
    }).catch(() => setStudentLoading(false))
  }, [id])

  useEffect(() => {
    if (!student) return
    skillsApi.list(student.id).then(res => {
      const map = {}
      for (const skill of (res.data || [])) {
        map[skill.skill_name] = { self: skill.self_assessed, self_rating: skill.self_rating || '', teacher: skill.teacher_confirmed, instructor_status: skill.instructor_status || 'pending', id: skill.id }
      }
      setSkillProgress(map)
    }).catch(() => setSkillProgress({}))
    homework.submissions({ student: student.id }).then(r => setHomeworkData(r.data.results || r.data || [])).catch(() => setHomeworkData([]))
  }, [student?.id])

  useEffect(() => {
    if (!student || tab !== 'comms') return
    setLoadingComms(true)
    Promise.all([
      helpdesk.list({ student: student.id }).then(res => res.data.results || res.data || []).catch(() => []),
      client.get('/api/users/notifications/', { params: { recipient: student.id } }).then(res => res.data.results || res.data || []).catch(() => []),
    ]).then(([tickets, notifs]) => {
      setCommsData(tickets)
      setNotificationsData(notifs)
    }).finally(() => setLoadingComms(false))
    // Load assistant chat history + DM conversations
    setLoadingChat(true)
    Promise.all([
      client.get('/api/users/assistant/chats/', { params: { user_id: student.id } })
        .then(res => res.data?.results || (Array.isArray(res.data) ? res.data : [])).catch(() => []),
      helpdesk.conversations({ student: student.id })
        .then(res => res.data?.results || res.data || []).catch(() => []),
    ]).then(([botMsgs, convos]) => {
      setChatHistory(botMsgs)
      setDmConversations(convos)
    }).finally(() => setLoadingChat(false))
  }, [tab, student?.id])

  useEffect(() => {
    if (!student) return
    setLoading(true)
    Promise.all([
      payments.balance(student.id),
      enrolments.list({ student: student.id }),
      users.notes(student.id, { archived: 'false' }),
      attendance.list({ student: student.id }),
      payments.list({ student: student.id }),
      formsApi.listForStudent(student.id),
      payments.stripe.paymentMethods({ student_id: student.id }),
      client.get('/api/classes/lockers/', { params: { assigned_to: student.id } }).catch(() => ({ data: [] })),
    ]).then(([balRes, enrolRes, notesRes, attRes, payRes, formsRes, cardsRes, lockerRes]) => {
      setBalanceData(balRes.data)
      setEnrolData(enrolRes.data.results || [])
      setNotesData(notesRes.data.results || [])
      setAttData(attRes.data.results || [])
      setPayData(payRes.data.results || [])
      setFormsData(formsRes.data.results || formsRes.data || [])
      setSavedCardsData(cardsRes.data)
      const lockers = lockerRes.data?.results || lockerRes.data || []
      setLockerData(lockers[0] || null)
    }).finally(() => setLoading(false))

    enrolments.changeRequests.list({ student: student.id })
      .then(r => setChangeRequestsData(r.data.results || r.data || []))
      .catch(() => {})

    classes.list({ page_size: 200 })
      .then(r => setAllSessions(r.data.results || r.data || []))
      .catch(() => {})

    seasonsApi.list().then(r => setSeasonsData(r.data.results || r.data || [])).catch(() => {})
    attendance.makeupCredits.list({ student: student.id }).then(r => setMakeupCreditsData(r.data.results || r.data || [])).catch(() => {})
    client.get('/api/classes/casual-bookings/', { params: { student: student.id } }).then(r => setCasualBookingsData(r.data.results || r.data || [])).catch(() => {})
    classes.practice.credits.list({ student: student.id }).then(r => setPracticeCreditsData(r.data?.results || r.data || [])).catch(() => {})
    payments.chase.list({ student_id: id }).then(r => setChaseHistory(r.data?.results || r.data || [])).catch(() => setChaseHistory([]))
    payments.exemptions({ student: student.id }).then(r => setExemptions(r.data || [])).catch(() => setExemptions([]))
  }, [student?.id])

  async function loadSeasonSessions(enrolment, overrideSeasonId) {
    const sid = overrideSeasonId ?? enrolment?.class_session_detail?.season
    if (!sid) return
    setSeasonSessions([])
    setSeasonSessionsLoading(true)
    try {
      const r = await classes.list({ season: sid })
      setSeasonSessions(r.data.results || r.data || [])
    } catch { } finally {
      setSeasonSessionsLoading(false)
    }
  }

  async function reloadBalance() {
    const res = await payments.balance(student.id)
    setBalanceData(res.data)
  }

  async function reloadNotes() {
    const res = await users.notes(student.id, { archived: showArchivedNotes ? 'true' : 'false' })
    setNotesData(res.data.results || res.data || [])
  }

  async function archiveNote(noteId, archived) {
    await users.updateNote(student.id, noteId, { archived })
    await reloadNotes()
  }

  async function deleteNote(noteId) {
    if (!window.confirm('Delete this note permanently?')) return
    await users.deleteNote(student.id, noteId)
    await reloadNotes()
  }

  function cycleSelfRating(skillName) {
    const current = skillProgress[skillName] || {}
    const prev = current.self_rating || ''
    const next = prev === '' ? 'almost' : prev === 'almost' ? 'yes' : ''
    const payload = {
      skill_name: skillName, level: skillLevel,
      self_rating: next,
      self_assessed: next === 'yes',
      teacher_confirmed: current.teacher || false,
      instructor_status: current.instructor_status || 'pending',
    }
    skillsApi.save(student.id, payload).then(res => {
      setSkillProgress(p => ({ ...p, [skillName]: { ...p[skillName], self_rating: res.data.self_rating || '', self: res.data.self_assessed } }))
    })
  }

  function cycleTeacherStatus(skillName) {
    const current = skillProgress[skillName] || {}
    const prevStatus = current.instructor_status || 'pending'
    const nextStatus = prevStatus === 'pending' ? 'not_quite' : prevStatus === 'not_quite' ? 'approved' : 'pending'
    const isApproved = nextStatus === 'approved'
    if (current.teacher && isApproved === false) {
      // Was approved, now demoting — use regression modal flow
      const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
      setRegressionNote(`${skillName} was re-checked on ${today}. Not where it needs to be to gain approval for level progression`)
      setRegressionModal({ skillName, level: skillLevel })
      return
    }
    const payload = {
      skill_name: skillName, level: skillLevel,
      self_assessed: current.self || false,
      self_rating: current.self_rating || '',
      teacher_confirmed: isApproved,
      instructor_status: nextStatus,
    }
    skillsApi.save(student.id, payload).then(res => {
      setSkillProgress(p => ({ ...p, [skillName]: { ...p[skillName], teacher: res.data.teacher_confirmed, instructor_status: res.data.instructor_status || 'pending' } }))
    })
  }

  async function submitNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return
    setSavingNote(true)
    try {
      await users.addNote(student.id, {
        body: noteText,
        tag: noteCategory,
        recheck_date: noteRecheckDate || null,
        is_permanent: noteIsPermanent,
      })
      setNoteText('')
      setNoteRecheckDate('')
      setNoteIsPermanent(false)
      await reloadNotes()
    } finally { setSavingNote(false) }
  }

  if (studentLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>
  if (!student) return <div style={{ padding: 40, color: 'var(--grey)' }}>Student not found.</div>

  const bal = balanceData ? parseFloat(balanceData.balance) : 0
  const isOwing = bal < 0
  const activeEnrolments = (enrolData || []).filter(e => e.status === 'active')
  const attRate = attData?.length ? Math.round(attData.filter(a => a.status === 'present').length / attData.length * 100) : 0
  const filteredNotes = (notesData || []).filter(n => {
    if (n.tag === 'vibe' && !isAdmin) return false
    return noteCatFilter === 'all' || n.tag === noteCatFilter
  })

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'enrolments', label: 'Enrolments' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'payments', label: 'Payments' },
    { key: 'progress', label: 'Progress' },
    { key: 'documents', label: 'Documents' },
    { key: 'notes', label: `Notes${notesData?.length ? ` (${notesData.length})` : ''}` },
    { key: 'comms', label: 'Comms' },
    { key: 'trials', label: 'Trials' },
  ]

  return (
    <div>
      {/* Back button */}
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/students')}>← Back to Students</button>
      </div>

      {/* Hero */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
          {student.profile_photo ? (
            <img src={student.profile_photo} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }} />
          ) : (
            <div className="avatar" style={{ background: avatarColor(student.display_name), width: 56, height: 56, fontSize: 20, flexShrink: 0 }}>
              {student.first_name?.[0]}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22 }}>{student.display_name}</div>
            {student.pronouns && <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{student.pronouns}</div>}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
              <span className="tag tag-lav" style={{ fontSize: 10 }}>Student</span>
              {isOwing && <span className="tag tag-red" style={{ fontSize: 10 }}>Owing</span>}
              {!isOwing && <span className="tag tag-lime" style={{ fontSize: 10 }}>Active</span>}
              {student.created_at && (
                <span style={{ fontSize: 11, color: 'var(--grey)' }}>
                  Member since {new Date(student.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowEdit(true)}>Edit Profile</button>
              <button className="btn btn-ghost btn-xs" onClick={() => navigate(`/admin/messages?student=${student.id}`)}>Send Message</button>
              <button className="btn btn-ghost btn-xs" onClick={() => setTab('notes')}>Add Note</button>
              <button className="btn btn-lime btn-xs" onClick={() => setShowCharge(true)}>+ Charge</button>
              <button className="btn btn-lime btn-xs" onClick={() => setShowPayment(true)}>Take Payment</button>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowAddToClass(true)}>+ Add to Class</button>
              <button className="btn btn-ghost btn-xs" onClick={() => { setShowResetPassword(true); setResetPwNew(''); setResetPwConfirm(''); setResetPwError(null); setResetPwSuccess(false) }}>Reset Password</button>
              <button
                className="btn btn-ghost btn-xs"
                style={{ color: student.is_active ? 'var(--red)' : 'var(--lime)', borderColor: student.is_active ? 'rgba(255,68,68,0.4)' : 'rgba(204,255,0,0.4)' }}
                onClick={() => setShowBlockConfirm(true)}
              >
                {student.is_active ? 'Block Account' : 'Unblock Account'}
              </button>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', borderTop: '1px solid var(--border)', marginTop: 4, WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.key ? 'var(--lime)' : 'transparent'}`, color: tab === t.key ? 'var(--white)' : 'var(--grey)', padding: '10px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'color 0.15s', flexShrink: 0 }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
        ) : (
          <>
            {/* OVERVIEW */}
            {tab === 'overview' && (
              <div>
                {/* Balance banner */}
                <div
                  onClick={() => setTab('payments')}
                  style={{
                    cursor: 'pointer', borderRadius: 10, padding: '14px 18px', marginBottom: 14,
                    background: isOwing ? 'rgba(255,68,68,0.1)' : bal > 0 ? 'rgba(204,255,0,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isOwing ? 'rgba(255,68,68,0.3)' : bal > 0 ? 'rgba(204,255,0,0.25)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 3 }}>Account Balance</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: isOwing ? 'var(--red)' : bal > 0 ? 'var(--lime)' : 'var(--grey)' }}>
                      {isOwing ? `-$${Math.abs(bal).toFixed(2)}` : bal > 0 ? `$${bal.toFixed(2)}` : '$0 clear'}
                    </div>
                    {isOwing && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>Balance owing — tap to view payments</div>}
                  </div>
                  <span style={{ fontSize: 18, opacity: 0.5 }}>→</span>
                </div>

                {/* Exemption UI */}
                {isOwing && (
                  <div style={{ marginTop: 8, marginBottom: 8 }}>
                    {exemptions.filter(e => !e.is_expired && e.is_active !== false).map(e => (
                      <div key={e.id} style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--amber)', marginBottom: 6 }}>
                        <strong>Exemption active</strong> until {e.end_date}{e.notes ? ` — ${e.notes}` : ''}
                      </div>
                    ))}
                    {!showExemptionForm ? (
                      <button className="btn btn-ghost btn-xs" style={{ color: 'var(--amber)', borderColor: 'rgba(255,170,0,0.3)' }} onClick={() => setShowExemptionForm(true)}>
                        Apply Exemption
                      </button>
                    ) : (
                      <div style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', marginTop: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--amber)' }}>Apply Balance Exemption</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                          <div className="field" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: 11 }}>Exemption end date</label>
                            <input type="date" value={exemptionEndDate} onChange={e => setExemptionEndDate(e.target.value)} style={{ background: '#111', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--white)', padding: '6px 8px', fontSize: 12 }} />
                          </div>
                          <div className="field" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: 11 }}>Notes (visible to student)</label>
                            <input value={exemptionNotes} onChange={e => setExemptionNotes(e.target.value)} placeholder="e.g. Payment plan agreed" style={{ background: '#111', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--white)', padding: '6px 8px', fontSize: 12 }} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-xs" onClick={() => setShowExemptionForm(false)}>Cancel</button>
                          <button className="btn btn-xs" style={{ background: 'rgba(255,170,0,0.15)', color: 'var(--amber)', border: '1px solid rgba(255,170,0,0.3)' }} disabled={!exemptionEndDate || savingExemption}
                            onClick={async () => {
                              setSavingExemption(true)
                              try {
                                await payments.createExemption({ student: student.id, end_date: exemptionEndDate, notes: exemptionNotes })
                                const r = await payments.exemptions({ student: student.id })
                                setExemptions(r.data || [])
                                setShowExemptionForm(false)
                                setExemptionEndDate('')
                                setExemptionNotes('')
                                await reloadNotes()
                              } finally { setSavingExemption(false) }
                            }}>
                            {savingExemption ? 'Saving…' : 'Apply Exemption'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ID check required */}
                {student.id_check_required && (
                  <div style={{
                    marginBottom: 14, borderRadius: 10, padding: '14px 18px',
                    background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)' }}>⚠ ID check required</div>
                      <div style={{ fontSize: 12, color: '#aaa', marginTop: 3 }}>
                        This student registered close to the 18+ age requirement. Please verify their ID before allowing bookings.
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-xs"
                      style={{ borderColor: 'rgba(255,170,0,0.4)', color: 'var(--amber)', flexShrink: 0 }}
                      onClick={async () => {
                        try {
                          const res = await client.patch(`/api/users/${student.id}/`, { id_check_required: false })
                          setStudent(s => ({ ...s, id_check_required: false }))
                        } catch { alert('Failed to update — try again.') }
                      }}
                    >
                      Mark ID verified ✓
                    </button>
                  </div>
                )}

                {/* Important notes (medical / injury / permanent) */}
                {(notesData || []).filter(n => !n.archived && (n.is_permanent || n.tag === 'medical' || n.tag === 'injury')).length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    {(notesData || []).filter(n => !n.archived && (n.is_permanent || n.tag === 'medical' || n.tag === 'injury')).map(n => (
                      <div key={n.id} onClick={() => setTab('notes')} style={{
                        cursor: 'pointer', marginBottom: 8, borderRadius: 8, padding: '10px 14px',
                        background: n.tag === 'medical' ? 'rgba(255,100,100,0.08)' : n.tag === 'injury' ? 'rgba(255,170,0,0.08)' : 'rgba(176,160,255,0.08)',
                        border: `1px solid ${n.tag === 'medical' ? 'rgba(255,100,100,0.25)' : n.tag === 'injury' ? 'rgba(255,170,0,0.25)' : 'rgba(176,160,255,0.25)'}`,
                      }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: n.tag === 'medical' ? 'var(--red)' : n.tag === 'injury' ? '#ffaa00' : 'var(--lav)' }}>
                            {n.is_permanent ? '📌 Permanent' : n.tag === 'medical' ? '🏥 Medical' : '🩹 Injury'}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.4 }}>{n.text}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="sd-overview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20, alignItems: 'start' }}>
                  <div className="card" style={{ padding: '16px 18px' }}>
                    <div style={{ fontSize: 11, marginBottom: 12, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Contact Info</div>
                    {[
                      ['Email', student.email],
                      ['Phone', student.phone || '—'],
                      ['Date of Birth', student.date_of_birth || '—'],
                      ['Pronouns', student.pronouns || '—'],
                      ['Emergency', student.emergency_contact_name ? `${student.emergency_contact_name} · ${student.emergency_contact_phone}` : '—'],
                    ].map(([label, val]) => (
                      <div key={label} className="info-row">
                        <div className="info-label">{label}</div>
                        <div className="info-val" style={{ fontSize: 13 }}>{val}</div>
                      </div>
                    ))}
                    {student.internal_notes && (
                      <div className="info-row" style={{ borderBottom: 'none' }}>
                        <div className="info-label">Health Notes</div>
                        <div className="info-val" style={{ fontSize: 12, color: '#ff9977' }}>{student.internal_notes}</div>
                      </div>
                    )}
                  </div>
                  <div className="card" style={{ padding: '16px 18px' }}>
                    <div style={{ fontSize: 11, marginBottom: 12, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Account Summary</div>
                    {[
                      ['Sessions', attData?.length || 0],
                      ['Attended', attData?.filter(a => a.status === 'present').length || 0],
                      ['Lifetime Spend', `$${parseFloat(balanceData?.total_paid || 0).toFixed(2)}`],
                      ['Balance', <span className={isOwing ? 'bal-neg' : 'bal-pos'}>{isOwing ? `-$${Math.abs(bal).toFixed(2)}` : bal > 0 ? `$${bal.toFixed(2)} cr` : '$0'}</span>],
                      ['Enrolments', activeEnrolments.length + ' active'],
                      ['Source', student.source || '—'],
                    ].map(([label, val]) => (
                      <div key={label} className="info-row">
                        <div className="info-label">{label}</div>
                        <div className="info-val" style={{ fontSize: 13 }}>{val}</div>
                      </div>
                    ))}
                    <div className="info-row">
                      <div className="info-label">Current Level</div>
                      <div className="info-val" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <select
                          value={student.level || ''}
                          onChange={async e => {
                            const lvl = e.target.value
                            await users.update(student.id, { level: lvl })
                            setStudent(s => ({ ...s, level: lvl }))
                          }}
                          style={{ background: '#111', color: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', fontSize: 12 }}
                        >
                          <option value="">Not set</option>
                          {['Level 1','Level 2','Level 3','Level 4','Level 5','Level 6'].map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="info-row">
                      <div className="info-label">Cleared For</div>
                      <div className="info-val" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <select
                          value={student.cleared_for_level || ''}
                          onChange={async e => {
                            const lvl = e.target.value
                            await users.update(student.id, { cleared_for_level: lvl })
                            setStudent(s => ({ ...s, cleared_for_level: lvl }))
                          }}
                          style={{ background: '#111', color: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', fontSize: 12 }}
                        >
                          <option value="">Same as level</option>
                          {['Level 1','Level 2','Level 3','Level 4','Level 5','Level 6'].map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <span style={{ fontSize: 10, color: 'var(--grey)' }}>Admin override</span>
                      </div>
                    </div>
                    <div className="info-row">
                      <div className="info-label">Max Booking Level</div>
                      <div className="info-val" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <select
                          value={student.max_booking_level || ''}
                          onChange={async e => {
                            const lvl = e.target.value
                            await users.update(student.id, { max_booking_level: lvl })
                            setStudent(s => ({ ...s, max_booking_level: lvl }))
                          }}
                          style={{ background: student.max_booking_level ? 'rgba(255,68,68,0.08)' : '#111', color: student.max_booking_level ? 'var(--red)' : '#fff', border: `1px solid ${student.max_booking_level ? 'rgba(255,68,68,0.35)' : 'var(--border)'}`, borderRadius: 6, padding: '3px 8px', fontSize: 12 }}
                        >
                          <option value="">No restriction</option>
                          {['Level 1','Level 2','Level 3','Level 4','Level 5','Level 6'].map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        {student.max_booking_level && (
                          <span style={{ fontSize: 10, color: 'var(--red)' }}>Hard cap active</span>
                        )}
                      </div>
                    </div>
                    <BlockedSessionsRow student={student} setStudent={setStudent} />
                    <div className="info-row" style={{ borderBottom: 'none' }}>
                      <div className="info-label">Tags</div>
                      <StudentTagsRow student={student} setStudent={setStudent} />
                    </div>
                  </div>
                </div>
                {/* Membership status + enrolments snapshot */}
                {(() => {
                  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
                  const isBlocked = student.booking_blocked
                  const hasEverEnrolled = (enrolData || []).length > 0
                  let statusLabel, statusColor, statusBg, statusBorder
                  if (isBlocked) {
                    statusLabel = 'Blocked'; statusColor = 'var(--red)'
                    statusBg = 'rgba(255,68,68,0.08)'; statusBorder = 'rgba(255,68,68,0.25)'
                  } else if (isOwing) {
                    statusLabel = 'Balance Owing'; statusColor = 'var(--amber)'
                    statusBg = 'rgba(255,170,0,0.08)'; statusBorder = 'rgba(255,170,0,0.25)'
                  } else if (activeEnrolments.length > 0) {
                    statusLabel = 'Enrolled'; statusColor = 'var(--lime)'
                    statusBg = 'rgba(204,255,0,0.06)'; statusBorder = 'rgba(204,255,0,0.2)'
                  } else if (hasEverEnrolled) {
                    statusLabel = 'Not Currently Enrolled'; statusColor = 'var(--grey)'
                    statusBg = 'rgba(255,255,255,0.03)'; statusBorder = 'var(--border)'
                  } else {
                    statusLabel = 'Never Enrolled'; statusColor = '#555'
                    statusBg = 'rgba(255,255,255,0.03)'; statusBorder = 'var(--border)'
                  }

                  // Group active enrolments by season
                  const currentEnrols = activeEnrolments.filter(e => {
                    const s = (seasonsData || []).find(s => s.id === e.class_session_detail?.season)
                    return !s || s.status === 'active'
                  })
                  const upcomingEnrols = activeEnrolments.filter(e => {
                    const s = (seasonsData || []).find(s => s.id === e.class_session_detail?.season)
                    return s && s.status === 'upcoming'
                  })

                  const groupBySeason = list => {
                    const map = {}
                    for (const e of list) {
                      const sid = e.class_session_detail?.season ?? 'unknown'
                      const sname = e.class_session_detail?.season_name ?? 'Unknown Season'
                      if (!map[sid]) map[sid] = { name: sname, enrols: [] }
                      map[sid].enrols.push(e)
                    }
                    return map
                  }

                  const currentBySeason = groupBySeason(currentEnrols)
                  const upcomingBySeason = groupBySeason(upcomingEnrols)

                  return (
                    <div className="card" style={{ padding: '16px 18px', marginBottom: 16 }}>
                      {/* Status header row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 4 }}>Membership Status</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: statusColor }}>{statusLabel}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-ghost btn-xs"
                            style={student.booking_blocked ? { borderColor: 'var(--amber)', color: 'var(--amber)' } : {}}
                            onClick={async () => {
                              await users.update(student.id, { booking_blocked: !student.booking_blocked })
                              setStudent(s => ({ ...s, booking_blocked: !s.booking_blocked }))
                            }}
                          >{student.booking_blocked ? 'Unfreeze Account' : 'Freeze Account'}</button>
                          {activeEnrolments.length > 0 && (
                            <button className="btn btn-ghost btn-xs" onClick={() => { setTcStep(null); setTcEnrolment(null); setTcNewSession(''); setTcResolution('credit'); setTcNotes(''); setTcError(null); setTcTransferClass(''); setShowTransferCancel('list') }}>Transfer / Cancel</button>
                          )}
                        </div>
                      </div>

                      {activeEnrolments.length === 0 ? (
                        <div style={{ fontSize: 13, color: 'var(--grey)', padding: '6px 0 2px' }}>No active enrolments.</div>
                      ) : (
                        <>
                          {/* Current enrolments */}
                          {Object.keys(currentBySeason).length > 0 && Object.entries(currentBySeason).map(([sid, { name, enrols }]) => (
                            <div key={sid} style={{ marginBottom: 14 }}>
                              <div style={{ fontSize: 10, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>Current — {name}</div>
                              {enrols.map(e => (
                                <div key={e.id}
                                  onClick={() => navigate(`/classes?session=${e.class_session}`)}
                                  style={{ cursor: 'pointer', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
                                >
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.class_session_detail?.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                                      {DAYS[e.class_session_detail?.day_of_week]} {e.class_session_detail?.start_time?.slice(0,5)}
                                      {e.class_session_detail?.instructor_detail?.display_name && ` · ${e.class_session_detail.instructor_detail.display_name}`}
                                    </div>
                                  </div>
                                  <button className="btn btn-ghost btn-xs" style={{ flexShrink: 0 }} onClick={ev => { ev.stopPropagation(); setTcEnrolment(e); setTcStep(null); setTcNewSession(''); setTcResolution('credit'); setTcNotes(''); setTcError(null); setTcTransferClass(''); setShowTransferCancel('list') }}>Transfer / Cancel</button>
                                </div>
                              ))}
                            </div>
                          ))}

                          {/* Upcoming enrolments */}
                          {Object.keys(upcomingBySeason).length > 0 && Object.entries(upcomingBySeason).map(([sid, { name, enrols }]) => (
                            <div key={sid} style={{ marginBottom: 14 }}>
                              <div style={{ fontSize: 10, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>Upcoming — {name}</div>
                              {enrols.map(e => (
                                <div key={e.id}
                                  onClick={() => navigate(`/classes?session=${e.class_session}`)}
                                  style={{ cursor: 'pointer', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
                                >
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.class_session_detail?.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                                      {DAYS[e.class_session_detail?.day_of_week]} {e.class_session_detail?.start_time?.slice(0,5)}
                                      {e.class_session_detail?.instructor_detail?.display_name && ` · ${e.class_session_detail.instructor_detail.display_name}`}
                                    </div>
                                  </div>
                                  <button className="btn btn-ghost btn-xs" style={{ flexShrink: 0 }} onClick={ev => { ev.stopPropagation(); setTcEnrolment(e); setTcStep(null); setTcNewSession(''); setTcResolution('credit'); setTcNotes(''); setTcError(null); setTcTransferClass(''); setShowTransferCancel('list') }}>Transfer / Cancel</button>
                                </div>
                              ))}
                            </div>
                          ))}
                        </>
                      )}

                      {/* View all link */}
                      <button className="btn btn-ghost btn-xs" style={{ marginTop: 4 }} onClick={() => setTab('enrolments')}>View all enrolments →</button>
                    </div>
                  )
                })()}
                {lockerData && (
                  <div className="card" style={{ padding: '16px 18px' }}>
                    <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 14 }}>Locker</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontSize: 28 }}>🔐</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>Locker #{lockerData.number}</div>
                        <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
                          {lockerData.locker_type ? lockerData.locker_type.replace(/_/g, ' ') : 'Standard'}
                          {lockerData.expires_at ? ` · Expires ${new Date(lockerData.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          <span className={`tag ${lockerData.key_issued ? 'tag-lime' : 'tag-grey'}`} style={{ fontSize: 10 }}>
                            {lockerData.key_issued ? 'Key issued' : 'No key'}
                          </span>
                          {lockerData.key_lost && <span className="tag tag-red" style={{ fontSize: 10 }}>Key lost</span>}
                          <span className={`tag ${lockerData.payment_status === 'paid' ? 'tag-lime' : 'tag-amber'}`} style={{ fontSize: 10 }}>
                            {lockerData.payment_status || 'Unpaid'}
                          </span>
                          {lockerData.payment_type && <span className="tag tag-grey" style={{ fontSize: 10 }}>{lockerData.payment_type}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ENROLMENTS */}
            {tab === 'enrolments' && (
              <div>
                {/* Membership Status */}
                {(() => {
                  const courseEnrols = (enrolData || []).filter(e => e.enrolment_type === 'course')
                  const activeEnrols = courseEnrols.filter(e => e.status === 'active')
                  const activeSeason = (seasonsData || []).find(s => s.status === 'active')
                  const activeSeasonEnrols = activeEnrols.filter(e => e.class_session_detail?.season === activeSeason?.id)

                  let statusLabel, statusColor, statusBg
                  if (!student.is_active) {
                    statusLabel = 'Blocked'; statusColor = 'var(--red)'; statusBg = 'rgba(255,68,68,0.1)'
                  } else if (isOwing) {
                    statusLabel = 'On hold — payment issue'; statusColor = '#ffaa00'; statusBg = 'rgba(255,170,0,0.1)'
                  } else if (activeSeasonEnrols.length > 0) {
                    statusLabel = 'Enrolled'; statusColor = 'var(--lime)'; statusBg = 'rgba(204,255,0,0.08)'
                  } else if (courseEnrols.length === 0) {
                    statusLabel = 'Never enrolled'; statusColor = 'var(--grey)'; statusBg = 'rgba(255,255,255,0.04)'
                  } else {
                    statusLabel = 'Not enrolled'; statusColor = 'var(--grey)'; statusBg = 'rgba(255,255,255,0.04)'
                  }
                  return (
                    <div style={{ background: statusBg, border: `1px solid ${statusColor}33`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 3 }}>Membership Status</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: statusColor }}>{statusLabel}</div>
                      </div>
                      <button className="btn btn-lime btn-xs" onClick={() => setShowAddToClass(true)}>+ Add to Class</button>
                    </div>
                  )
                })()}

                {/* Sub-tab bar */}
                <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
                  {[['current','Current'],['past','Past']].map(([key,label]) => (
                    <button key={key} onClick={() => setEnrolSubTab(key)} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${enrolSubTab===key ? 'var(--lime)' : 'transparent'}`, color: enrolSubTab===key ? 'var(--white)' : 'var(--grey)', padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', marginBottom: -1 }}>
                      {label}
                    </button>
                  ))}
                </div>

                {enrolSubTab === 'current' && (() => {
                  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
                  const courseEnrols = (enrolData || []).filter(e => e.enrolment_type === 'course')
                  const activeEnrols = courseEnrols.filter(e => e.status === 'active')
                  const waitlistedEnrols = (enrolData || []).filter(e =>
                    e.status === 'waitlisted' || (e.status === 'cancelled' && e.waitlist_type)
                  )
                  const activeSeason = (seasonsData || []).find(s => s.status === 'active')
                  const upcomingSeasons = (seasonsData || []).filter(s => s.status === 'upcoming' && s.bookings_open)

                  // Group active enrolments by season
                  const bySeasonId = {}
                  for (const e of activeEnrols) {
                    const sid = e.class_session_detail?.season || 'none'
                    const sname = e.class_session_detail?.season_name || 'Unseasoned'
                    if (!bySeasonId[sid]) bySeasonId[sid] = { name: sname, enrols: [] }
                    bySeasonId[sid].enrols.push(e)
                  }

                  // Group waitlisted by season
                  const waitlistBySeason = {}
                  for (const e of waitlistedEnrols) {
                    const sid = e.class_session_detail?.season || 'none'
                    const sname = e.class_session_detail?.season_name || 'Unseasoned'
                    if (!waitlistBySeason[sid]) waitlistBySeason[sid] = { name: sname, enrols: [] }
                    waitlistBySeason[sid].enrols.push(e)
                  }

                  const SEASON_PRICES = {1:270,2:440,3:580,4:700,5:800,6:900}
                  const n = activeEnrols.length
                  const addOnPrice = n === 0 ? 270 : (SEASON_PRICES[Math.min(n+1,6)] - SEASON_PRICES[Math.min(n,6)])

                  const upcomingActiveSeasonIds = new Set(activeEnrols.map(e => e.class_session_detail?.season))

                  const availableCredits = (makeupCreditsData || []).filter(c => c.status === 'available')
                  const upcomingCasuals = (casualBookingsData || []).filter(b => new Date(b.occurrence_date || b.occurrence?.date) >= new Date())

                  return (
                    <div>
                      {/* Current season enrolments */}
                      {Object.keys(bySeasonId).length === 0 ? (
                        <div className="empty-state" style={{ padding: '20px 0', marginBottom: 20 }}>No active enrolments</div>
                      ) : (
                        Object.entries(bySeasonId).map(([sid, { name, enrols }]) => (
                          <div key={sid} style={{ marginBottom: 24 }}>
                            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 10 }}>{name}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {enrols.map(e => (
                                <div key={e.id} className="card" style={{ padding: '14px 16px', cursor: 'pointer' }}
                                  onClick={() => navigate(`/classes?session=${e.class_session}`)}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: 600, marginBottom: 3 }}>{e.class_session_detail?.name}</div>
                                      <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                                        {DAYS[e.class_session_detail?.day_of_week]} {e.class_session_detail?.start_time?.slice(0,5)}
                                        {e.class_session_detail?.instructor_detail?.display_name && ` · ${e.class_session_detail.instructor_detail.display_name}`}
                                      </div>
                                    </div>
                                    <button className="btn btn-ghost btn-xs" style={{ flexShrink: 0, marginLeft: 8 }}
                                      onClick={ev => { ev.stopPropagation(); setShowTransferCancel(e) }}>
                                      Transfer / Cancel
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}

                      {/* Add-on pricing */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--grey)' }}>
                          <strong>Add-on pricing:</strong> Adding a class to this student's schedule costs <strong style={{ color: 'var(--white)' }}>${addOnPrice}</strong>
                        </span>
                      </div>

                      {/* Upcoming seasons */}
                      {upcomingSeasons.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, marginBottom: 12 }}>Upcoming Enrolments</div>
                          {upcomingSeasons.map(season => {
                            const seasonEnrols = activeEnrols.filter(e => e.class_session_detail?.season === season.id)
                            const isNotEnrolled = seasonEnrols.length === 0
                            return (
                              <div key={season.id} style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 8 }}>{season.name}</div>
                                {isNotEnrolled ? (
                                  <div style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: 13, color: '#ffaa00' }}>⚠ Not enrolled in {season.name} — follow up!</span>
                                    <button className="btn btn-ghost btn-xs" style={{ flexShrink: 0 }}
                                      onClick={async () => {
                                        const text = `Not enrolled in ${season.name} — follow up required.`
                                        await users.addNote(student.id, { text, tag: 'general', is_permanent: false })
                                        reloadNotes()
                                      }}>
                                      + Note
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {seasonEnrols.map(e => (
                                      <div key={e.id} className="card" style={{ padding: '14px 16px', cursor: 'pointer' }}
                                        onClick={() => navigate(`/classes?session=${e.class_session}`)}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                          <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, marginBottom: 3 }}>{e.class_session_detail?.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                                              {DAYS[e.class_session_detail?.day_of_week]} {e.class_session_detail?.start_time?.slice(0,5)}
                                              {e.class_session_detail?.instructor_detail?.display_name && ` · ${e.class_session_detail.instructor_detail.display_name}`}
                                            </div>
                                          </div>
                                          <button className="btn btn-ghost btn-xs" style={{ flexShrink: 0, marginLeft: 8 }}
                                            onClick={ev => { ev.stopPropagation(); setShowTransferCancel(e) }}>
                                            Transfer / Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Casual / Catch-up */}
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          Casual & Catch-up
                          <button className="btn btn-ghost btn-xs" onClick={() => setShowAddCatchupCredits(true)}>+ Add Catch-up Credits</button>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                          <div className="card" style={{ flex: 1, padding: '12px 14px' }}>
                            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', marginBottom: 4 }}>Catch-up Credits</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: availableCredits.length > 0 ? 'var(--lime)' : 'var(--grey)' }}>{availableCredits.length}</div>
                          </div>
                          <div className="card" style={{ flex: 1, padding: '12px 14px' }}>
                            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', marginBottom: 4 }}>Upcoming Casuals</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: upcomingCasuals.length > 0 ? 'var(--lav)' : 'var(--grey)' }}>{upcomingCasuals.length}</div>
                          </div>
                        </div>
                        {upcomingCasuals.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {upcomingCasuals.map((b, i) => {
                              const dateStr = b.occurrence_date || b.occurrence?.date
                              const sessionName = b.occurrence_detail?.session_detail?.name || b.session_name || '—'
                              return (
                                <div key={i} className="card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{sessionName}</div>
                                    {dateStr && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{new Date(dateStr + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</div>}
                                  </div>
                                  <span className="tag tag-lav" style={{ fontSize: 10 }}>Casual</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Practice Credits */}
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          Practice Credits
                          <button className="btn btn-ghost btn-xs" onClick={() => setShowAddPracticeCredits(true)}>+ Add Credits</button>
                        </div>
                        {(() => {
                          const credits = practiceCreditsData || []
                          const available = credits.filter(c => c.status === 'available')
                          const used = credits.filter(c => c.status === 'used')
                          return (
                            <div>
                              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                                <div className="card" style={{ flex: 1, padding: '12px 14px' }}>
                                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', marginBottom: 4 }}>Available</div>
                                  <div style={{ fontSize: 20, fontWeight: 700, color: available.length > 0 ? 'var(--lime)' : 'var(--grey)' }}>{available.length}</div>
                                </div>
                                <div className="card" style={{ flex: 1, padding: '12px 14px' }}>
                                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', marginBottom: 4 }}>Used</div>
                                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--grey)' }}>{used.length}</div>
                                </div>
                              </div>
                              {available.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {available.map(c => (
                                    <div key={c.id} className="card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div>
                                        <span className="tag tag-lime" style={{ fontSize: 10, marginRight: 8 }}>Credit</span>
                                        <span style={{ fontSize: 12, color: 'var(--grey)' }}>{c.notes || 'Practice session'}</span>
                                      </div>
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <span style={{ fontSize: 11, color: 'var(--grey)' }}>{new Date(c.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        <button
                                          className="btn btn-ghost btn-xs"
                                          style={{ color: 'var(--red)' }}
                                          onClick={async () => {
                                            await classes.practice.credits.delete(c.id)
                                            setPracticeCreditsData(prev => prev.filter(x => x.id !== c.id))
                                          }}
                                        >✕</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>

                      {/* Waitlisted */}
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, marginBottom: 12 }}>Waitlisted</div>
                        {Object.keys(waitlistBySeason).length === 0 ? (
                          <div style={{ fontSize: 13, color: 'var(--grey)' }}>None</div>
                        ) : (
                          Object.entries(waitlistBySeason).map(([sid, { name, enrols }]) => (
                            <div key={sid} style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 8 }}>{name}</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {enrols.map(e => (
                                  <div key={e.id} className="card" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <div style={{ fontSize: 13, fontWeight: 500 }}>{e.class_session_detail?.name}</div>
                                      <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>
                                        {DAYS[e.class_session_detail?.day_of_week]} {e.class_session_detail?.start_time?.slice(0,5)}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                      <span className="tag tag-amber" style={{ fontSize: 10 }}>
                                        {e.waitlist_type === 'single' ? 'Single class' : 'Season waitlist'}
                                      </span>
                                      {e.status === 'cancelled' && (
                                        <span className="tag tag-grey" style={{ fontSize: 9, marginLeft: 4 }}>Archived</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Class Change Requests */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                          Class Change Requests
                          {(changeRequestsData || []).filter(r => r.status === 'pending').length > 0 && (
                            <span style={{ background: 'var(--lime)', color: '#000', borderRadius: 12, fontSize: 10, fontWeight: 700, padding: '1px 7px' }}>
                              {(changeRequestsData || []).filter(r => r.status === 'pending').length} pending
                            </span>
                          )}
                        </div>
                        {(changeRequestsData || []).length === 0 ? (
                          <div style={{ fontSize: 13, color: 'var(--grey)' }}>No change requests</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {(changeRequestsData || []).map(req => (
                              <div key={req.id} className="card" style={{ padding: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, marginBottom: 2 }}>
                                      {req.current_enrolment_detail?.class_session_detail?.name || 'Unknown class'}
                                    </div>
                                    {req.requested_session_detail && (
                                      <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 2 }}>
                                        → {req.requested_session_detail.name}
                                        {req.requested_season_name && <span style={{ color: 'var(--lime)', marginLeft: 6 }}>{req.requested_season_name}</span>}
                                      </div>
                                    )}
                                    {req.spot_held && (
                                      <div style={{ fontSize: 11, color: '#ffaa00', marginBottom: 4 }}>● Spot held in requested class</div>
                                    )}
                                    {req.notes && (
                                      <div style={{ fontSize: 12, color: 'var(--white)', marginTop: 4, padding: '6px 10px', background: '#1a1a1a', borderRadius: 6 }}>"{req.notes}"</div>
                                    )}
                                    <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                      <span>Requested: {new Date(req.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                      <span>Submitted by: {req.submitted_by_name || (req.admin_initiated ? 'Admin' : 'Student')}</span>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                                    <span className={`tag ${req.status === 'pending' ? 'tag-amber' : req.status === 'approved' ? 'tag-lime' : 'tag-red'}`} style={{ fontSize: 10 }}>
                                      {req.status === 'pending' ? 'In Progress' : req.status === 'approved' ? 'Approved' : 'Denied'}
                                    </span>
                                    {req.status === 'pending' && (
                                      <button className="btn btn-lime btn-xs"
                                        onClick={() => { setShowChangeRequestModal(req); setChangeReqNewSession(req.requested_session?.toString() || ''); setChangeReqRefundAction('none'); setChangeReqRefundAmount(''); setChangeReqChargeAmount(''); setChangeReqAdminNotes(''); setChangeReqError(null) }}>
                                        Process →
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {enrolSubTab === 'past' && (() => {
                  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
                  const pastEnrols = (enrolData || []).filter(e => ['completed','cancelled','suspended'].includes(e.status) && e.enrolment_type === 'course')

                  // Group by season
                  const bySeason = {}
                  for (const e of pastEnrols) {
                    const sid = e.class_session_detail?.season || 'none'
                    const sname = e.class_session_detail?.season_name || 'No Season'
                    if (!bySeason[sid]) bySeason[sid] = { name: sname, enrols: [] }
                    bySeason[sid].enrols.push(e)
                  }

                  return (
                    <div>
                      {Object.keys(bySeason).length === 0 ? (
                        <div className="empty-state" style={{ padding: '20px 0' }}>No past enrolments</div>
                      ) : (
                        Object.entries(bySeason).map(([sid, { name, enrols }]) => (
                          <div key={sid} style={{ marginBottom: 24 }}>
                            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 10 }}>{name}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {enrols.map(e => (
                                <div key={e.id} className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{e.class_session_detail?.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>
                                      {DAYS[e.class_session_detail?.day_of_week]} {e.class_session_detail?.start_time?.slice(0,5)}
                                      {e.class_session_detail?.instructor_detail?.display_name && ` · ${e.class_session_detail.instructor_detail.display_name}`}
                                    </div>
                                  </div>
                                  <span className={`tag ${e.status === 'completed' ? 'tag-grey' : 'tag-red'}`} style={{ fontSize: 10 }}>
                                    {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* ATTENDANCE */}
            {tab === 'attendance' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
                  {[
                    ['Total', attData?.length || 0, ''],
                    ['Attendance Rate', `${attRate}%`, 'kpi-lime'],
                    ['No-shows', attData?.filter(a => a.status === 'no_show').length || 0, 'kpi-red'],
                    ['Streak', attData?.filter(a => a.status === 'present').length || 0, 'kpi-lav'],
                  ].map(([label, val, cls]) => (
                    <div key={label} className={`kpi ${cls}`} style={{ padding: 16 }}>
                      <div className="kpi-label">{label}</div>
                      <div className="kpi-value" style={{ fontSize: 24 }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div className="tbl-section">
                  <table>
                    <thead><tr><th>Date</th><th>Class</th><th>Instructor</th><th>Status</th><th>Notes</th></tr></thead>
                    <tbody>
                      {(attData || []).length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--grey)', padding: '24px 0' }}>No attendance records</td></tr>}
                      {(attData || []).map(a => {
                        const tag = getAttTag(a, makeupCreditsData)
                        return (
                          <tr key={a.id}>
                            <td style={{ color: 'var(--grey)', whiteSpace: 'nowrap' }}>{a.occurrence_detail?.date ? new Date(a.occurrence_detail.date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}</td>
                            <td>{a.occurrence_detail?.session_detail?.name || '—'}</td>
                            <td style={{ color: 'var(--grey)', fontSize: 12 }}>{a.occurrence_detail?.session_detail?.instructor_detail?.display_name || '—'}</td>
                            <td><span className={`tag ${tag.cls}`} style={{ fontSize: 10 }}>{tag.label}</span></td>
                            <td style={{ color: 'var(--grey)', fontSize: 12 }}>{a.notes || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PAYMENTS */}
            {tab === 'payments' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                  <div className={`kpi ${isOwing ? 'kpi-red' : ''}`} style={{ textAlign: 'center' }}>
                    <div className="kpi-label">Outstanding</div>
                    <div className="kpi-value" style={{ fontSize: 28 }}>{isOwing ? `$${Math.abs(bal).toFixed(2)}` : '$0'}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>
                      {(() => {
                        const overduePlan = (enrolData || []).find(e => e.plan?.instalments?.some(i => i.status === 'overdue'))
                        return overduePlan ? 'Instalment plan overdue' : isOwing ? 'Balance owing' : 'No outstanding balance'
                      })()}
                    </div>
                  </div>
                  <div className="kpi kpi-lime" style={{ textAlign: 'center' }}>
                    <div className="kpi-label">Paid This Term</div>
                    <div className="kpi-value" style={{ fontSize: 28 }}>${parseFloat(balanceData?.total_paid || 0).toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>Total payments received</div>
                  </div>
                  <div className="kpi" style={{ textAlign: 'center' }}>
                    <div className="kpi-label">Account Credit</div>
                    <div className="kpi-value" style={{ fontSize: 28 }}>{bal > 0 ? `$${bal.toFixed(2)}` : '$0'}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>{bal > 0 ? 'Available credit' : 'No credit on account'}</div>
                  </div>
                </div>
                {savedCardsData && (
                  <div style={{ background: '#111', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {(savedCardsData.payment_methods || []).length === 0 ? (
                      <span style={{ fontSize: 12, color: 'var(--grey)' }}>No saved card on file</span>
                    ) : (
                      <>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 4 }}>Saved card</div>
                          {savedCardsData.payment_methods.map(c => (
                            <div key={c.id} style={{ fontSize: 13, fontWeight: 500 }}>
                              {c.brand.charAt(0).toUpperCase() + c.brand.slice(1)} ···· {c.last4}
                              <span style={{ fontSize: 11, color: 'var(--grey)', marginLeft: 8 }}>exp {String(c.exp_month).padStart(2, '0')}/{String(c.exp_year).slice(-2)}</span>
                              {savedCardsData.default_payment_method_id === c.id && <span className="tag tag-lime" style={{ fontSize: 9, marginLeft: 8 }}>Default</span>}
                            </div>
                          ))}
                        </div>
                        {savedCardsData.auto_charge && <span className="tag tag-lime" style={{ fontSize: 10 }}>AUTO-CHARGE ON</span>}
                      </>
                    )}
                  </div>
                )}
                {chargeError && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{chargeError}</div>}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                  <button className="btn btn-lime btn-sm" onClick={() => setShowPayment(true)}>+ Record Payment</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowRefundCredit(true)}>Issue Refund / Credit</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowAccountCredit(true)}>Add Account Credit</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowNewPlanModal(true)}>⊞ Payment Plan</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setTcStep(null); setTcEnrolment(null); setTcNewSession(''); setTcResolution('credit'); setTcNotes(''); setTcError(null); setTcTransferClass(''); setShowTransferCancel('list') }}>Transfer / Cancel Enrolment</button>
                  {savedCardsData?.payment_methods?.length > 0 && savedCardsData?.default_payment_method_id && bal < 0 && (() => {
                    const hasCashPending = (payData || []).some(p => p.payment_type === 'charge' && (p.description || '').toLowerCase().includes('pay at studio'))
                    return (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--lime)', borderColor: 'rgba(204,255,0,0.3)' }}
                        disabled={chargingSaved}
                        onClick={async () => {
                          setChargeError(null)
                          setChargingSaved(true)
                          try {
                            await payments.stripe.chargeSaved({
                              student_id: student.id,
                              amount_cents: Math.round(Math.abs(bal) * 100),
                              description: hasCashPending ? 'Cash payment collected — Duality Pole Studio' : 'Outstanding balance — Duality Pole Studio',
                            })
                            const res = await payments.balance(student.id)
                            setBalanceData(res.data)
                            const payRes = await payments.list({ student: student.id })
                            setPayData(payRes.data.results || [])
                          } catch (err) {
                            setChargeError(err.response?.data?.detail || 'Charge failed.')
                          } finally {
                            setChargingSaved(false)
                          }
                        }}
                      >
                        {chargingSaved ? 'Charging…' : hasCashPending ? `Charge Saved Card — Cash Not Received $${Math.abs(bal).toFixed(2)}` : `Charge Saved Card $${Math.abs(bal).toFixed(2)}`}
                      </button>
                    )
                  })()}
                </div>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, marginBottom: 10 }}>Transaction History</div>
                <div className="tbl-section">
                  <table>
                    <thead><tr><th>Date</th><th>Description</th><th>Season</th><th>Type</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
                    <tbody>
                      {(payData || []).length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--grey)', padding: '24px 0' }}>No transactions</td></tr>}
                      {(() => {
                        const rows = [...(payData || [])].reverse()
                        let running = 0
                        const withBalance = rows.map(p => {
                          const isCredit = p.payment_type === 'payment' || p.payment_type === 'credit' || p.payment_type === 'refund'
                          const amt = parseFloat(p.amount || 0)
                          if (isCredit) running += amt; else running -= amt
                          return { ...p, _running: running, _isCredit: isCredit }
                        })
                        return withBalance.reverse().map(p => {
                          const seasonMatch = (p.description || '').match(/season\s*(\d+)/i)
                          const seasonLabel = seasonMatch ? `S${seasonMatch[1]}` : '—'
                          const TYPE_STYLE = {
                            payment:     { label: 'PAYMENT',  cls: 'tag-lime' },
                            credit:      { label: 'CREDIT',   cls: 'tag-lime' },
                            refund:      { label: 'REFUND',   cls: 'tag-amber' },
                            charge:      { label: 'INVOICE',  cls: 'tag-lav' },
                            no_show_fee: { label: 'FEE',      cls: 'tag-red' },
                          }
                          const ts = TYPE_STYLE[p.payment_type] || { label: p.payment_type, cls: 'tag-grey' }
                          const isCashPending = p.payment_type === 'charge' && (p.description || '').toLowerCase().includes('pay at studio')
                          const amt = parseFloat(p.amount || 0)
                          const runBal = p._running
                          return (
                            <tr key={p.id} onClick={() => setSelectedPayment(p)} style={{ cursor: 'pointer' }} title="Click for details">
                              <td style={{ color: 'var(--grey)', whiteSpace: 'nowrap', fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                              <td style={{ fontSize: 13 }}>{p.description || p.payment_type.replace(/_/g, ' ')}</td>
                              <td style={{ fontSize: 12, color: 'var(--grey)' }}>{seasonLabel}</td>
                              <td style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                                <span className={`tag ${ts.cls}`} style={{ fontSize: 10 }}>{ts.label}</span>
                                {isCashPending && <span className="tag tag-amber" style={{ fontSize: 10 }}>CASH PENDING</span>}
                              </td>
                              <td style={{ textAlign: 'right', color: 'var(--red)', fontWeight: 600, fontSize: 13 }}>{p._isCredit ? '—' : `$${amt.toFixed(2)}`}</td>
                              <td style={{ textAlign: 'right', color: 'var(--lime)', fontWeight: 600, fontSize: 13 }}>{p._isCredit ? `$${amt.toFixed(2)}` : '—'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: runBal < 0 ? 'var(--red)' : runBal > 0 ? 'var(--lime)' : 'var(--grey)' }}>
                                {runBal < 0 ? `-$${Math.abs(runBal).toFixed(2)}` : runBal > 0 ? `$${runBal.toFixed(2)}` : '$0'}
                              </td>
                            </tr>
                          )
                        })
                      })()}
                    </tbody>
                  </table>
                </div>
                {chaseHistory && chaseHistory.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', fontWeight: 600, marginBottom: 12 }}>Chase History</div>
                    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      {chaseHistory.map((c, i) => (
                        <div key={c.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                          borderBottom: i < chaseHistory.length - 1 ? '1px solid var(--border)' : 'none',
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{c.step_label}</div>
                            <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>Sent by {c.sent_by_name}</div>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--grey)', flexShrink: 0 }}>
                            {new Date(c.sent_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                          {c.locked_account && (
                            <span className="tag tag-red" style={{ fontSize: 10 }}>LOCKED</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PROGRESS */}
            {tab === 'progress' && (
              <div>
                <div className="subtabs" style={{ marginBottom: 20 }}>
                  {Object.keys(SKILL_LEVELS).map(level => (
                    <div key={level} className={`subtab ${skillLevel === level ? 'active' : ''}`} onClick={() => setSkillLevel(level)}>{level}</div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--lime)', marginRight: 4 }} />Yes</span>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--amber)', marginRight: 4 }} />Almost</span>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', border: '1px solid var(--lime)', marginRight: 4 }} />Not yet</span>
                  <span style={{ color: '#555', fontSize: 11 }}>Left dot = student · Right dot = teacher</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {(SKILL_LEVELS[skillLevel] || []).map(skill => {
                    const prog = skillProgress[skill] || {}
                    const selfRating = prog.self_rating || ''
                    const teacherStatus = prog.instructor_status || 'pending'
                    const selfConfig = {
                      yes:    { bg: 'var(--lime)',  border: 'var(--lime)',  title: 'Yes' },
                      almost: { bg: 'var(--amber)', border: 'var(--amber)', title: 'Almost' },
                      '':     { bg: 'none',         border: 'var(--lav)',   title: 'Not marked' },
                    }
                    const teacherConfig = {
                      approved:  { bg: 'var(--lime)',  border: 'var(--lime)',  title: 'Approved' },
                      not_quite: { bg: 'var(--amber)', border: 'var(--amber)', title: 'Not quite yet' },
                      pending:   { bg: 'none',         border: 'var(--lime)',  title: 'Pending' },
                    }
                    const sc = selfConfig[selfRating] || selfConfig['']
                    const tc = teacherConfig[teacherStatus] || teacherConfig['pending']
                    return (
                      <div key={skill} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13 }}>{skill}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <div onClick={() => cycleSelfRating(skill)} style={{ width: 10, height: 10, borderRadius: '50%', background: sc.bg, border: `1px solid ${sc.border}`, cursor: 'pointer' }} title={`Student: ${sc.title}`} />
                          <div onClick={() => cycleTeacherStatus(skill)} style={{ width: 10, height: 10, borderRadius: '50%', background: tc.bg, border: `1px solid ${tc.border}`, cursor: 'pointer' }} title={`Teacher: ${tc.title}`} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Homework */}
                <div style={{ marginTop: 28 }}>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, marginBottom: 12 }}>Homework</div>
                  {homeworkData.length === 0 ? (
                    <div style={{ color: 'var(--grey)', fontSize: 13 }}>No homework assigned yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {homeworkData.map(sub => (
                        <div key={sub.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, opacity: sub.assignment_detail?.status === 'closed' ? 0.5 : 1 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{sub.assignment_detail?.title || 'Homework'}</div>
                            <div style={{ fontSize: 11, color: 'var(--grey)' }}>
                              {sub.assignment_detail?.class_session_name || ''}{sub.assignment_detail?.due_date ? ` · Due ${new Date(sub.assignment_detail.due_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}` : ''}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                            <span className={`tag ${sub.submitted_at ? 'tag-lime' : 'tag-grey'}`} style={{ fontSize: 10 }}>
                              {sub.submitted_at ? '✓ Submitted' : 'Not submitted'}
                            </span>
                            {sub.assignment_detail?.status === 'active' && (
                              <button className="btn btn-ghost btn-xs" onClick={async () => {
                                await client.patch(`/api/homework/${sub.assignment_detail.id}/`, { status: 'closed' })
                                setHomeworkData(prev => prev.map(s => s.id === sub.id ? { ...s, assignment_detail: { ...s.assignment_detail, status: 'closed' } } : s))
                              }}>Archive</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DOCUMENTS */}
            {tab === 'documents' && (
              <div className="card" style={{ padding: '16px 18px' }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, marginBottom: 16 }}>Documents & Consents</div>
                {[
                  { name: 'Health & Medical Form (PAR-Q)', detail: 'PAR-Q pre-screening questionnaire', form: (formsData || []).find(f => f.form_type === 'parq') },
                  { name: 'Liability Waiver', detail: 'Studio liability waiver and code of conduct', form: (formsData || []).find(f => f.form_type === 'waiver') },
                  { name: 'Photo Consent', detail: 'Permission to photograph/film in class', form: (formsData || []).find(f => f.form_type === 'photo_consent') },
                  { name: 'Season Agreement', detail: 'Season enrolment terms and conditions', form: (formsData || []).find(f => f.form_type === 'season_agreement') },
                ].map(doc => {
                  const status = !doc.form ? { label: 'Not submitted', cls: 'tag-grey' } : doc.form.completed ? { label: 'Signed', cls: 'tag-lime' } : { label: 'In Progress', cls: 'tag-amber' }
                  return (
                    <div key={doc.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{doc.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{doc.detail}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        <span className={`tag ${status.cls}`} style={{ fontSize: 10 }}>{status.label}</span>
                        {doc.form && <button className="btn btn-ghost btn-xs" onClick={() => setViewForm({ ...doc, form: doc.form })}>View</button>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* NOTES */}
            {tab === 'notes' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {NOTE_CATS.filter(cat => cat.key !== 'vibe' || isAdmin).map(cat => (
                      <button key={cat.key} onClick={() => setNoteCatFilter(cat.key)} className={`btn btn-xs ${noteCatFilter === cat.key ? 'btn-lime' : 'btn-ghost'}`}>{cat.label}</button>
                    ))}
                  </div>
                  <button
                    className={`btn btn-xs ${showArchivedNotes ? 'btn-lime' : 'btn-ghost'}`}
                    onClick={() => {
                      const next = !showArchivedNotes
                      setShowArchivedNotes(next)
                      users.notes(student.id, { archived: next ? 'true' : 'false' }).then(r => setNotesData(r.data.results || r.data || []))
                    }}
                  >
                    {showArchivedNotes ? 'Show Active' : 'Show Archived'}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {filteredNotes.map(n => (
                    <div key={n.id} className="note-item" style={{ opacity: n.archived ? 0.55 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {n.tag && <span className="tag tag-amber" style={{ fontSize: 10 }}>{n.tag}</span>}
                          {n.is_permanent && <span className="tag" style={{ fontSize: 10, background: 'rgba(255,68,68,0.15)', color: 'var(--red)', border: '1px solid rgba(255,68,68,0.3)' }}>Permanent</span>}
                          {n.recheck_date && <span className="tag" style={{ fontSize: 10, background: 'rgba(179,157,219,0.15)', color: 'var(--lav)', border: '1px solid rgba(179,157,219,0.3)' }}>Recheck {new Date(n.recheck_date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>}
                          <div className="note-meta" style={{ margin: 0 }}>{n.created_by_name} · {new Date(n.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => archiveNote(n.id, !n.archived)}
                            title={n.archived ? 'Restore note' : 'Archive note'}
                          >{n.archived ? 'Restore' : 'Archive'}</button>
                          <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => deleteNote(n.id)} title="Delete note">✕</button>
                        </div>
                      </div>
                      <div className="note-text">{n.body}</div>
                    </div>
                  ))}
                  {filteredNotes.length === 0 && <div className="empty-state" style={{ padding: '16px 0' }}>{showArchivedNotes ? 'No archived notes' : 'No notes yet'}</div>}
                </div>
                <div className="card" style={{ padding: '16px 18px' }}>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, marginBottom: 12 }}>Add Note</div>
                  <form onSubmit={submitNote}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>Category</label>
                        <select value={noteCategory} onChange={e => setNoteCategory(e.target.value)}>
                          <option value="general">📝 General</option>
                          <option value="medical">🏥 Medical</option>
                          <option value="injury">🩹 Injury</option>
                          {isAdmin && <option value="vibe">✨ Vibe</option>}
                        </select>
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>Recheck date <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(optional)</span></label>
                        <input type="date" value={noteRecheckDate} onChange={e => setNoteRecheckDate(e.target.value)} style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '8px 10px', fontSize: 13 }} />
                      </div>
                    </div>
                    <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add an internal note about this student…" rows={3} style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '10px 12px', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 10 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <button type="submit" className="btn btn-lime btn-sm" disabled={savingNote || !noteText.trim()}>{savingNote ? 'Saving…' : 'Save Note'}</button>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--grey)' }}>
                        <input type="checkbox" checked={noteIsPermanent} onChange={e => setNoteIsPermanent(e.target.checked)} style={{ accentColor: 'var(--lime)' }} />
                        Permanent note (always surfaces in notes items)
                      </label>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TRIALS */}
            {tab === 'trials' && (() => {
              const trialEnrols = (enrolData || []).filter(e => e.enrolment_type === 'trial')

              const renderStars = (value, max = 5) => {
                if (!value) return <span style={{ color: 'var(--grey)', fontSize: 12 }}>—</span>
                return (
                  <span style={{ fontSize: 13, letterSpacing: 1 }}>
                    {Array.from({ length: max }, (_, i) => (
                      <span key={i} style={{ color: i < value ? '#ccff00' : 'var(--border)' }}>★</span>
                    ))}
                  </span>
                )
              }

              const renderOutcome = (fb) => {
                if (!fb) return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'var(--grey)', border: '1px solid var(--border)' }}>Pending</span>
                if (fb.enrolled) return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(204,255,0,0.12)', color: 'var(--lime)', border: '1px solid rgba(204,255,0,0.3)', fontWeight: 700 }}>Converted ✓</span>
                return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(255,68,68,0.25)' }}>Declined</span>
              }

              return (
                <div>
                  {trialEnrols.length === 0 ? (
                    <div className="empty-state">
                      <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
                      <div>No trial classes on record for this student</div>
                    </div>
                  ) : (
                    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      {trialEnrols.map((e, i) => {
                        const fb = e.trial_feedback
                        const isExpanded = expandedTrialId === e.id
                        const ratings = fb ? [fb.class_rating, fb.instructor_rating, fb.facilities_rating, fb.structure_rating].filter(Boolean) : []
                        const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null
                        return (
                          <div key={e.id}>
                            <div
                              onClick={() => fb && setExpandedTrialId(isExpanded ? null : e.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', borderBottom: (!isExpanded && i < trialEnrols.length - 1) ? '1px solid var(--border)' : 'none', cursor: fb ? 'pointer' : 'default', flexWrap: 'wrap' }}
                            >
                              <div style={{ flex: 1, minWidth: 120 }}>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{e.class_name || e.class_session_detail?.name || '—'}</div>
                                {e.class_session_detail?.season_name && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{e.class_session_detail.season_name}</div>}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--grey)', minWidth: 80 }}>
                                {e.enrolled_date ? new Date(e.enrolled_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                              </div>
                              {renderOutcome(fb)}
                              {avg ? (
                                <span style={{ fontSize: 13 }}>
                                  <span style={{ color: 'var(--lime)', fontWeight: 700 }}>{avg}</span>
                                  <span style={{ color: 'var(--grey)', fontSize: 11 }}>/5</span>
                                </span>
                              ) : <span style={{ color: 'var(--grey)', fontSize: 12, minWidth: 30 }}>—</span>}
                              {fb && <span style={{ fontSize: 12, color: 'var(--grey)' }}>{isExpanded ? '▲' : '▼'}</span>}
                              {fb?.enrolled === false && !isExpanded && (
                                <button className="btn btn-lime btn-xs" onClick={ev => { ev.stopPropagation(); setConvertTrialEnrol(e) }}>Convert →</button>
                              )}
                            </div>
                            {isExpanded && fb && (
                              <div style={{ borderBottom: i < trialEnrols.length - 1 ? '1px solid var(--border)' : 'none', padding: '0 16px 16px 16px' }}>
                                <div style={{ background: '#111', borderRadius: 10, padding: '16px 20px', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                                  <div>
                                    <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Ratings</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                      {[['Class', fb.class_rating], ['Instructor', fb.instructor_rating], ['Facilities', fb.facilities_rating], ['Structure', fb.structure_rating]].map(([label, val]) => (
                                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                          <span style={{ fontSize: 12, color: 'var(--grey)', width: 70 }}>{label}</span>
                                          {renderStars(val)}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  {fb.reason && (
                                    <div style={{ flex: 1, minWidth: 200 }}>
                                      <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                                        {fb.enrolled ? 'Notes' : 'Reason for not enrolling'}
                                      </div>
                                      <div style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.6, fontStyle: 'italic' }}>"{fb.reason}"</div>
                                    </div>
                                  )}
                                  {!fb.enrolled && (
                                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                      <button className="btn btn-lime btn-xs" onClick={() => setConvertTrialEnrol(e)}>Convert to Enrolment →</button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* COMMS */}
            {tab === 'comms' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[['all', 'All'], ['emails', 'Emails & Notifications'], ['tickets', 'Tickets'], ['chat', 'Chat History']].map(([key, label]) => (
                      <button key={key} onClick={() => setCommsFilter(key)} className={`btn btn-xs ${commsFilter === key ? 'btn-lime' : 'btn-ghost'}`}>{label}</button>
                    ))}
                  </div>
                  <a href="/admin/helpdesk" className="btn btn-ghost btn-sm">Open Helpdesk</a>
                </div>
                {loadingComms ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
                ) : (
                  <>
                    {(commsFilter === 'all' || commsFilter === 'emails') && (
                      <div style={{ marginBottom: commsFilter === 'all' ? 24 : 0 }}>
                        {commsFilter === 'all' && <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>Emails & Notifications</div>}
                        {(notificationsData || []).length === 0 ? (
                          <div className="empty-state">No notifications</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {(notificationsData || []).map(n => (
                              <div key={n.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lav)', flexShrink: 0, marginTop: 4 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                    <div style={{ fontWeight: 500, fontSize: 13 }}>{n.title}</div>
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                                      {n.notification_type && <span className="tag tag-lav" style={{ fontSize: 10 }}>{n.notification_type}</span>}
                                      <span style={{ fontSize: 11, color: 'var(--grey)' }}>{new Date(n.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                                    </div>
                                  </div>
                                  {n.body && <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {(commsFilter === 'all' || commsFilter === 'chat') && (
                      <div style={{ marginBottom: commsFilter === 'all' ? 24 : 0 }}>
                        {commsFilter === 'all' && <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>Chat History</div>}
                        {loadingChat ? (
                          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div className="spinner" /></div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* AI Bot */}
                            {chatHistory && chatHistory.length > 0 && (
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ background: '#333', borderRadius: 4, padding: '1px 6px', fontSize: 10 }}>🤖 AI Assistant</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto', padding: 2 }}>
                                  {chatHistory.map(m => (
                                    <div key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: m.role === 'user' ? 'var(--lav)' : '#333', color: m.role === 'user' ? '#000' : 'var(--grey)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                        {m.role === 'user' ? (student?.first_name?.[0] || '?') : 'AI'}
                                      </div>
                                      <div style={{ maxWidth: '75%', background: m.role === 'user' ? 'rgba(176,160,255,0.12)' : '#1a1a1a', border: `1px solid ${m.role === 'user' ? 'rgba(176,160,255,0.2)' : 'var(--border)'}`, borderRadius: 8, padding: '8px 12px' }}>
                                        <div style={{ fontSize: 12, color: 'var(--white)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.content}</div>
                                        <div style={{ fontSize: 10, color: 'var(--grey)', marginTop: 4, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                                          {new Date(m.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} {new Date(m.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                                          {m.escalated && <span style={{ marginLeft: 6, color: 'var(--amber)' }}>↑ escalated</span>}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* DM Conversations (instructor / admin) */}
                            {(dmConversations || []).map(conv => (
                              <div key={conv.id}>
                                <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 8 }}>
                                  <span style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px', fontSize: 10 }}>
                                    💬 {conv.instructor ? `${conv.instructor_detail?.display_name || 'Instructor'} · DM` : 'Admin · DM'}
                                    {conv.source === 'instagram' && ' · Instagram'}
                                  </span>
                                  <span style={{ marginLeft: 8, color: '#555', fontSize: 10 }}>{new Date(conv.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <DmThread convId={conv.id} studentFirstName={student?.first_name} />
                              </div>
                            ))}
                            {(!chatHistory || chatHistory.length === 0) && (dmConversations || []).length === 0 && (
                              <div className="empty-state">No chat history</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {(commsFilter === 'all' || commsFilter === 'tickets') && (
                      <div>
                        {commsFilter === 'all' && <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>Support Tickets</div>}
                        {(commsData || []).length === 0 ? (
                          <div className="empty-state">No support tickets for this student</div>
                        ) : (
                          <div className="tbl-section">
                            <table>
                              <thead><tr><th>#</th><th>Subject</th><th>Category</th><th>Status</th><th>Date</th></tr></thead>
                              <tbody>
                                {(commsData || []).map(t => (
                                  <tr key={t.id}>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--grey)', fontSize: 11 }}>#{t.id}</td>
                                    <td style={{ fontWeight: 500 }}>{t.subject}</td>
                                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{t.category}</td>
                                    <td><span className={`tag tag-${t.status === 'open' ? 'red' : t.status === 'pending' ? 'amber' : t.status === 'resolved' ? 'lime' : 'grey'}`} style={{ fontSize: 10 }}>{t.status}</span></td>
                                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{new Date(t.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showEdit && (
        <EditStudentModal
          student={student}
          onClose={() => setShowEdit(false)}
          onSaved={updated => { setShowEdit(false); setStudent(updated) }}
        />
      )}
      {showPayment && (
        <TakePaymentModal student={student} onClose={() => setShowPayment(false)} onSuccess={() => { setShowPayment(false); reloadBalance() }} />
      )}
      {showCharge && (
        <AddChargeModal student={student} onClose={() => setShowCharge(false)} onSuccess={() => { setShowCharge(false); reloadBalance() }} />
      )}
      {showAddToClass && (
        <AddToClassModal student={student} onClose={() => setShowAddToClass(false)} onSuccess={() => {
          setShowAddToClass(false)
          enrolments.list({ student: student.id }).then(r => setEnrolData(r.data.results || []))
        }} />
      )}
      {convertTrialEnrol && (
        <ConvertTrialModal
          enrolment={convertTrialEnrol}
          student={student}
          onClose={() => setConvertTrialEnrol(null)}
          onSuccess={() => {
            setConvertTrialEnrol(null)
            enrolments.list({ student: student.id }).then(r => setEnrolData(r.data.results || []))
            payments.balance(student.id).then(r => setBalanceData(r.data))
          }}
        />
      )}
      {regressionModal && (
        <div className="sd-overlay" onClick={e => e.target === e.currentTarget && setRegressionModal(null)}>
          <div className="sd-modal" style={{ maxWidth: 460 }}>
            <div className="sd-header">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>Uncheck Skill</div>
              <button className="modal-close-btn" onClick={() => setRegressionModal(null)}>✕</button>
            </div>
            <div className="sd-body">
              <p style={{ fontSize: 13, color: 'var(--grey)', marginTop: 0, marginBottom: 16 }}>
                This will uncheck <strong style={{ color: '#fff' }}>{regressionModal.skillName}</strong> and add a note to this student's profile.
              </p>
              <label style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 6 }}>Note</label>
              <textarea
                value={regressionNote}
                onChange={e => setRegressionNote(e.target.value)}
                rows={4}
                style={{ width: '100%', boxSizing: 'border-box', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', fontSize: 13, padding: '10px 12px', resize: 'vertical' }}
              />
            </div>
            <div className="sd-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setRegressionModal(null)} disabled={savingRegression}>Cancel</button>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--red)', color: '#fff' }}
                disabled={savingRegression || !regressionNote.trim()}
                onClick={async () => {
                  setSavingRegression(true)
                  try {
                    await users.addNote(student.id, { body: regressionNote, tag: 'general', is_permanent: false })
                    const payload = {
                      skill_name: regressionModal.skillName,
                      level: regressionModal.level,
                      self_assessed: skillProgress[regressionModal.skillName]?.self || false,
                      self_rating: skillProgress[regressionModal.skillName]?.self_rating || '',
                      teacher_confirmed: false,
                      instructor_status: 'pending',
                    }
                    const res = await skillsApi.save(student.id, payload)
                    setSkillProgress(p => ({ ...p, [regressionModal.skillName]: { self: res.data.self_assessed, self_rating: res.data.self_rating || '', teacher: res.data.teacher_confirmed, instructor_status: res.data.instructor_status || 'pending', id: res.data.id } }))
                    await reloadNotes()
                    setRegressionModal(null)
                  } finally { setSavingRegression(false) }
                }}
              >
                {savingRegression ? 'Saving…' : 'Uncheck & Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}
      {viewForm && (
        <div className="sd-overlay" onClick={e => e.target === e.currentTarget && setViewForm(null)}>
          <div className="sd-modal" style={{ maxWidth: 520 }}>
            <div className="sd-header">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>{viewForm.name}</div>
              <button className="modal-close-btn" onClick={() => setViewForm(null)}>✕</button>
            </div>
            <div className="sd-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {viewForm.form?.responses && Object.keys(viewForm.form.responses).length > 0 ? (
                Object.entries(viewForm.form.responses).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 16, padding: '8px 0', borderBottom: '1px solid #1a1a1a', fontSize: 13 }}>
                    <div style={{ width: 160, color: 'var(--grey)', flexShrink: 0, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</div>
                    <div style={{ wordBreak: 'break-word' }}>{String(v)}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--grey)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No form data recorded.</div>
              )}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewForm(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Block / Unblock Account */}
      {showBlockConfirm && (
        <BlockAccountModal
          student={student}
          onClose={() => setShowBlockConfirm(false)}
          onConfirm={async (updates) => {
            await users.update(student.id, updates)
            setStudent(s => ({ ...s, ...updates }))
            setShowBlockConfirm(false)
          }}
        />
      )}

      {/* Issue Refund / Credit */}
      {showRefundCredit && (
        <div className="sd-overlay" onClick={e => e.target === e.currentTarget && setShowRefundCredit(false)}>
          <div className="sd-modal" style={{ maxWidth: 420 }}>
            <div className="sd-header">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>Issue Refund / Credit</div>
              <button className="modal-close-btn" onClick={() => setShowRefundCredit(false)}>✕</button>
            </div>
            <div className="sd-body">
              <div className="field">
                <label>Type</label>
                <select value={refundType} onChange={e => setRefundType(e.target.value)} style={{ background: '#111', color: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: '100%' }}>
                  <option value="refund">Refund (money back)</option>
                  <option value="credit">Account Credit</option>
                  <option value="no_refund">No refund / credit (record only)</option>
                </select>
              </div>
              {refundType !== 'no_refund' && (
                <div className="field">
                  <label>Amount ($)</label>
                  <input type="number" min="0" step="0.01" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder="0.00" />
                </div>
              )}
              <div className="field">
                <label>Description / reason</label>
                <input value={refundDesc} onChange={e => setRefundDesc(e.target.value)} placeholder="Reason for decision" />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowRefundCredit(false)}>Cancel</button>
                <button
                  className="btn btn-lime btn-sm"
                  disabled={savingRefund || (refundType !== 'no_refund' && !refundAmount)}
                  onClick={async () => {
                    setSavingRefund(true)
                    try {
                      if (refundType === 'no_refund') {
                        await payments.create({ student: student.id, payment_type: 'no_refund', amount: 0, description: refundDesc || 'No refund or credit issued' })
                      } else {
                        await payments.create({ student: student.id, payment_type: refundType, amount: parseFloat(refundAmount), description: refundDesc || `${refundType === 'refund' ? 'Refund' : 'Account credit'} issued` })
                      }
                      const [balRes, payRes] = await Promise.all([payments.balance(student.id), payments.list({ student: student.id })])
                      setBalanceData(balRes.data)
                      setPayData(payRes.data.results || [])
                      setRefundAmount('')
                      setRefundDesc('')
                      setShowRefundCredit(false)
                    } finally { setSavingRefund(false) }
                  }}
                >
                  {savingRefund ? 'Saving…' : refundType === 'no_refund' ? 'Record Decision' : 'Issue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Credit */}
      {showAccountCredit && (
        <div className="sd-overlay" onClick={e => e.target === e.currentTarget && setShowAccountCredit(false)}>
          <div className="sd-modal" style={{ maxWidth: 400 }}>
            <div className="sd-header">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>Add Account Credit</div>
              <button className="modal-close-btn" onClick={() => setShowAccountCredit(false)}>✕</button>
            </div>
            <div className="sd-body">
              <div className="field">
                <label>Credit Amount ($)</label>
                <input type="number" min="0" step="0.01" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="field">
                <label>Description</label>
                <input value={creditDesc} onChange={e => setCreditDesc(e.target.value)} placeholder="Reason for credit" />
              </div>
              <div className="field">
                <label>Expiry date <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(optional — leave blank for no expiry)</span></label>
                <input type="date" value={creditExpiry} onChange={e => setCreditExpiry(e.target.value)} />
              </div>
              <div className="field">
                <label>Admin notes <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(internal only, not visible to student)</span></label>
                <textarea value={creditAdminNotes} onChange={e => setCreditAdminNotes(e.target.value)} placeholder="Internal notes…" rows={2} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAccountCredit(false)}>Cancel</button>
                <button
                  className="btn btn-lime btn-sm"
                  disabled={savingCredit || !creditAmount}
                  onClick={async () => {
                    setSavingCredit(true)
                    try {
                      await payments.create({ student: student.id, payment_type: 'credit', amount: parseFloat(creditAmount), description: creditDesc || 'Account credit added', ...(creditAdminNotes ? { admin_notes: creditAdminNotes } : {}), ...(creditExpiry ? { expires_at: creditExpiry } : {}) })
                      const [balRes, payRes] = await Promise.all([payments.balance(student.id), payments.list({ student: student.id })])
                      setBalanceData(balRes.data)
                      setPayData(payRes.data.results || [])
                      setCreditAmount('')
                      setCreditDesc('')
                      setCreditExpiry('')
                      setCreditAdminNotes('')
                      setShowAccountCredit(false)
                    } finally { setSavingCredit(false) }
                  }}
                >
                  {savingCredit ? 'Saving…' : 'Add Credit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password */}
      {showResetPassword && (
        <div className="sd-overlay" onClick={e => e.target === e.currentTarget && setShowResetPassword(false)}>
          <div className="sd-modal" style={{ maxWidth: 400 }}>
            <div className="sd-header">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>Reset Password</div>
              <button className="modal-close-btn" onClick={() => setShowResetPassword(false)}>✕</button>
            </div>
            <div className="sd-body">
              {resetPwSuccess ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
                  <div style={{ fontSize: 14, color: 'var(--lime)', fontWeight: 600, marginBottom: 8 }}>Password updated successfully</div>
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 20 }}>The new password has been set for {student.first_name}.</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowResetPassword(false)}>Close</button>
                </div>
              ) : (
                <form onSubmit={async e => {
                  e.preventDefault()
                  setResetPwError(null)
                  if (resetPwNew.length < 8) { setResetPwError('Password must be at least 8 characters.'); return }
                  if (resetPwNew !== resetPwConfirm) { setResetPwError('Passwords do not match.'); return }
                  setSavingResetPw(true)
                  try {
                    await users.resetPassword(student.id, resetPwNew)
                    setResetPwSuccess(true)
                  } catch (err) {
                    setResetPwError(err.response?.data?.detail || err.response?.data?.password?.[0] || 'Failed to reset password.')
                  } finally {
                    setSavingResetPw(false)
                  }
                }}>
                  {resetPwError && (
                    <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>
                      {resetPwError}
                    </div>
                  )}
                  <div className="field">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={resetPwNew}
                      onChange={e => setResetPwNew(e.target.value)}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="field">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      value={resetPwConfirm}
                      onChange={e => setResetPwConfirm(e.target.value)}
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowResetPassword(false)}>Cancel</button>
                    <button type="submit" className="btn btn-lime btn-sm" disabled={savingResetPw}>
                      {savingResetPw ? 'Saving…' : 'Set Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer / Cancel Enrolment */}
      {showTransferCancel && (() => {
        const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
        const activeList = (enrolData || []).filter(e => e.status === 'active')

        const closeModal = () => { setShowTransferCancel(false); setTcStep(null); setTcEnrolment(null); setTcError(null); setTcNewSession(''); setTcTransferClass('') }

        const submitTransfer = async () => {
          if (!tcNewSession) { setTcError('Please select a class to transfer to.'); return }
          setTcSaving(true); setTcError(null)
          try {
            await enrolments.changeRequests.create({
              current_enrolment: tcEnrolment.id,
              requested_session: tcNewSession,
              request_type: 'transfer',
              notes: tcNotes,
            })
            const r = await enrolments.changeRequests.list({ student: student.id })
            setChangeRequestsData(r.data.results || r.data || [])
            closeModal()
          } catch (err) {
            setTcError(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Could not submit request.')
          } finally { setTcSaving(false) }
        }

        const submitCancel = async (enrolmentObj) => {
          setTcSaving(true); setTcError(null)
          try {
            await enrolments.changeRequests.create({
              current_enrolment: enrolmentObj.id,
              request_type: 'cancel',
              cancellation_resolution: tcResolution,
              notes: tcNotes,
            })
          } catch (err) {
            throw err
          }
        }

        const submitCancelSingle = async () => {
          setTcSaving(true); setTcError(null)
          try {
            await submitCancel(tcEnrolment)
            const r = await enrolments.changeRequests.list({ student: student.id })
            setChangeRequestsData(r.data.results || r.data || [])
            closeModal()
          } catch (err) {
            setTcError(err.response?.data?.detail || 'Could not submit request.')
          } finally { setTcSaving(false) }
        }

        const submitCancelAll = async () => {
          setTcSaving(true); setTcError(null)
          try {
            for (const e of activeList) {
              await submitCancel(e)
            }
            const r = await enrolments.changeRequests.list({ student: student.id })
            setChangeRequestsData(r.data.results || r.data || [])
            closeModal()
          } catch (err) {
            setTcError(err.response?.data?.detail || 'One or more requests could not be submitted.')
          } finally { setTcSaving(false) }
        }

        const modalTitle = tcStep === 'transfer' ? 'Transfer Enrolment'
          : tcStep === 'cancel' ? 'Cancel Enrolment'
          : tcStep === 'cancel_all' ? 'Cancel All Enrolments'
          : 'Transfer / Cancel'

        const defaultSeasonId = tcEnrolment?.class_session_detail?.season
        const effectiveSeasonId = tcTransferSeasonId ?? defaultSeasonId
        const transferSessions = tcStep === 'transfer'
          ? (seasonSessions || []).filter(s => s.id !== tcEnrolment?.class_session)
          : []

        return (
          <div className="sd-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
            <div className="sd-modal" style={{ maxWidth: 500 }}>
              <div className="sd-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {tcStep && (
                    <button className="btn btn-ghost btn-xs" onClick={() => {
                      if (tcStep === 'transfer' && tcTransferClass) { setTcTransferClass(''); setTcNewSession(''); return }
                      setTcStep(null); setTcError(null); setTcTransferClass(''); setTcNewSession('')
                    }}>← Back</button>
                  )}
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>{modalTitle}</div>
                </div>
                <button className="modal-close-btn" onClick={closeModal}>✕</button>
              </div>
              <div className="sd-body">
                {tcError && (
                  <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>
                    {tcError}
                  </div>
                )}

                {/* Step 1: class list */}
                {!tcStep && (
                  <>
                    {activeList.length === 0 ? (
                      <div style={{ color: 'var(--grey)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No active enrolments.</div>
                    ) : (
                      <>
                        {activeList.map(e => (
                          <div key={e.id} style={{ background: '#111', borderRadius: 8, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{e.class_session_detail?.name || 'Class'}</div>
                              <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                                {DAYS[e.class_session_detail?.day_of_week]} {e.class_session_detail?.start_time?.slice(0,5)}
                                {e.class_session_detail?.season_name ? ` · ${e.class_session_detail.season_name}` : ''}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button className="btn btn-ghost btn-xs" onClick={() => { setTcEnrolment(e); setTcNewSession(''); setTcTransferClass(''); setTcTransferSeasonId(null); setTcStep('transfer'); loadSeasonSessions(e) }}>Transfer</button>
                              <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }} onClick={() => { setTcEnrolment(e); setTcStep('cancel') }}>Cancel</button>
                            </div>
                          </div>
                        ))}
                        <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)', width: '100%' }}
                            onClick={() => setTcStep('cancel_all')}
                          >
                            Cancel All Enrolments
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Step 2a-i: Transfer — pick season + class name */}
                {tcStep === 'transfer' && !tcTransferClass && (() => {
                  const uniqueNames = [...new Set(transferSessions.map(s => s.name))].sort()
                  return (
                    <>
                      <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 13, color: 'var(--grey)' }}>
                        Transferring from: <strong style={{ color: 'var(--white)' }}>{tcEnrolment?.class_session_detail?.name}</strong>
                      </div>
                      {/* Season selector */}
                      {(seasonsData || []).length > 1 && (
                        <div className="field" style={{ marginBottom: 12 }}>
                          <label style={{ fontSize: 11 }}>Season</label>
                          <select
                            value={effectiveSeasonId || ''}
                            onChange={e => {
                              const sid = parseInt(e.target.value) || defaultSeasonId
                              setTcTransferSeasonId(sid)
                              setTcTransferClass('')
                              setTcNewSession('')
                              loadSeasonSessions(tcEnrolment, sid)
                            }}
                            style={{ background: '#111', color: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: '100%' }}
                          >
                            {(seasonsData || []).filter(s => s.status === 'active' || s.status === 'upcoming').map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10 }}>Select a class to transfer to:</div>
                      {seasonSessionsLoading ? (
                        <div style={{ fontSize: 13, color: 'var(--grey)', padding: '12px 0' }}>Loading classes…</div>
                      ) : uniqueNames.length === 0 ? (
                        <div style={{ fontSize: 13, color: 'var(--grey)', padding: '12px 0' }}>No other classes available in this season.</div>
                      ) : uniqueNames.map(name => (
                        <button
                          key={name}
                          className="btn btn-ghost btn-sm"
                          style={{ width: '100%', textAlign: 'left', marginBottom: 6, justifyContent: 'flex-start' }}
                          onClick={() => { setTcTransferClass(name); setTcNewSession('') }}
                        >
                          {name}
                        </button>
                      ))}
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setTcStep(null)}>Back</button>
                      </div>
                    </>
                  )
                })()}

                {/* Step 2a-ii: Transfer — pick day/time */}
                {tcStep === 'transfer' && tcTransferClass && (() => {
                  const sessions = transferSessions.filter(s => s.name === tcTransferClass)
                  return (
                    <>
                      <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px', marginBottom: 6, fontSize: 13, color: 'var(--grey)' }}>
                        Transferring from: <strong style={{ color: 'var(--white)' }}>{tcEnrolment?.class_session_detail?.name}</strong>
                      </div>
                      <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 13, color: 'var(--grey)' }}>
                        Class: <strong style={{ color: 'var(--white)' }}>{tcTransferClass}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10 }}>Select a day &amp; time:</div>
                      {sessions.map(sess => {
                        const spotsLeft = sess.spots_left ?? Math.max(0, (sess.capacity || 0) - (sess.enrolled_count || 0))
                        const isFull = spotsLeft <= 0
                        const isSelected = String(tcNewSession) === String(sess.id)
                        return (
                          <div key={sess.id} style={{ background: isSelected ? 'rgba(204,255,0,0.06)' : '#111', border: `1px solid ${isSelected ? 'rgba(204,255,0,0.3)' : 'var(--border)'}`, borderRadius: 8, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{DAYS[sess.day_of_week]} {sess.start_time?.slice(0,5)}</div>
                              <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 4 }}>
                                {sess.instructor_detail?.display_name || ''}
                                {sess.studio_detail?.name ? ` · ${sess.studio_detail.name}` : ''}
                              </div>
                              {isFull ? (
                                <span className="tag tag-red" style={{ fontSize: 10 }}>FULL</span>
                              ) : (
                                <span style={{ fontSize: 11, color: 'var(--grey)' }}>{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} available</span>
                              )}
                            </div>
                            {isFull ? (
                              <button
                                className="btn btn-ghost btn-xs"
                                style={{ color: 'var(--amber)', borderColor: 'rgba(255,170,0,0.3)', flexShrink: 0 }}
                                disabled={tcSaving}
                                onClick={async () => {
                                  setTcSaving(true); setTcError(null)
                                  try {
                                    await enrolments.create({ class_session: sess.id, student: student.id, status: 'waitlisted', waitlist_type: 'season' })
                                    const r = await enrolments.list({ student: student.id })
                                    setEnrolData(r.data.results || [])
                                    closeModal()
                                  } catch (err) {
                                    setTcError(err.response?.data?.detail || 'Could not join waitlist.')
                                  } finally { setTcSaving(false) }
                                }}
                              >Add to Waitlist</button>
                            ) : (
                              <button
                                className={`btn btn-sm ${isSelected ? 'btn-lime' : 'btn-ghost'}`}
                                style={{ flexShrink: 0 }}
                                onClick={() => setTcNewSession(String(sess.id))}
                              >{isSelected ? '✓ Selected' : 'Select'}</button>
                            )}
                          </div>
                        )
                      })}
                      {tcNewSession && (
                        <>
                          <div className="field" style={{ marginTop: 14 }}>
                            <label>Notes (optional)</label>
                            <textarea value={tcNotes} onChange={e => setTcNotes(e.target.value)} rows={3} placeholder="Reason for transfer request…" />
                          </div>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setTcTransferClass(''); setTcNewSession('') }}>Back</button>
                            <button className="btn btn-lime btn-sm" onClick={submitTransfer} disabled={tcSaving}>
                              {tcSaving ? 'Submitting…' : 'Submit Transfer Request'}
                            </button>
                          </div>
                        </>
                      )}
                      {!tcNewSession && (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setTcTransferClass(''); setTcNewSession('') }}>Back</button>
                        </div>
                      )}
                    </>
                  )
                })()}

                {/* Step 2b: Cancel single */}
                {tcStep === 'cancel' && (
                  <>
                    <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 13, color: 'var(--grey)' }}>
                      Cancelling: <strong style={{ color: 'var(--white)' }}>{tcEnrolment?.class_session_detail?.name}</strong>
                    </div>
                    <div className="field">
                      <label>Resolution</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {[['credit','Account Credit'],['refund','Refund to Card'],['no_refund','No Refund']].map(([val,lbl]) => (
                          <button key={val} className={`btn btn-sm ${tcResolution === val ? 'btn-lime' : 'btn-ghost'}`} onClick={() => setTcResolution(val)}>{lbl}</button>
                        ))}
                      </div>
                    </div>
                    <div className="field">
                      <label>Notes / reason</label>
                      <textarea value={tcNotes} onChange={e => setTcNotes(e.target.value)} rows={3} placeholder="Reason for cancellation…" />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 14 }}>
                      This will submit a cancellation request to Mimi &amp; Chloe for review.
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setTcStep(null)}>Back</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }} onClick={submitCancelSingle} disabled={tcSaving}>
                        {tcSaving ? 'Submitting…' : 'Submit Cancellation Request'}
                      </button>
                    </div>
                  </>
                )}

                {/* Step 2c: Cancel all */}
                {tcStep === 'cancel_all' && (
                  <>
                    <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 13, color: 'var(--red)' }}>
                      This will submit a cancellation request for all {activeList.length} active enrolment{activeList.length !== 1 ? 's' : ''}.
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      {activeList.map(e => (
                        <div key={e.id} style={{ fontSize: 13, color: 'var(--grey)', paddingBottom: 4 }}>· {e.class_session_detail?.name}</div>
                      ))}
                    </div>
                    <div className="field">
                      <label>Resolution</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {[['credit','Account Credit'],['refund','Refund to Card'],['no_refund','No Refund']].map(([val,lbl]) => (
                          <button key={val} className={`btn btn-sm ${tcResolution === val ? 'btn-lime' : 'btn-ghost'}`} onClick={() => setTcResolution(val)}>{lbl}</button>
                        ))}
                      </div>
                    </div>
                    <div className="field">
                      <label>Notes / reason</label>
                      <textarea value={tcNotes} onChange={e => setTcNotes(e.target.value)} rows={3} placeholder="Reason for cancellation…" />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 14 }}>
                      This will submit cancellation requests for all classes to Mimi &amp; Chloe for review.
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setTcStep(null)}>Back</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }} onClick={submitCancelAll} disabled={tcSaving}>
                        {tcSaving ? 'Submitting…' : 'Submit All Cancellation Requests'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Process Change Request Modal */}
      {showChangeRequestModal && (() => {
        const isCancelRequest = showChangeRequestModal.request_type === 'cancel'
        return (
          <div className="sd-overlay" onClick={e => e.target === e.currentTarget && setShowChangeRequestModal(null)}>
            <div className="sd-modal" style={{ maxWidth: 500 }}>
              <div className="sd-header">
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>
                  {isCancelRequest ? 'Process Cancellation Request' : 'Process Class Change Request'}
                </div>
                <button className="modal-close-btn" onClick={() => setShowChangeRequestModal(null)}>✕</button>
              </div>
              <div className="sd-body">
                <div style={{ background: '#111', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
                  <div style={{ color: 'var(--grey)', marginBottom: 4 }}>
                    {isCancelRequest ? 'Cancelling enrolment in' : 'Current class'}
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--white)' }}>
                    {showChangeRequestModal.current_enrolment_detail?.class_session_detail?.name || 'Unknown'}
                  </div>
                  {isCancelRequest && showChangeRequestModal.cancellation_resolution && (
                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--grey)' }}>
                      Requested resolution: <strong style={{ color: '#fff' }}>
                        {showChangeRequestModal.cancellation_resolution === 'credit' ? 'Account Credit' : showChangeRequestModal.cancellation_resolution === 'refund' ? 'Refund to Card' : 'No Refund'}
                      </strong>
                    </div>
                  )}
                  {showChangeRequestModal.notes && (
                    <div style={{ marginTop: 8, padding: '8px 10px', background: '#1a1a1a', borderRadius: 6, color: 'var(--grey)', fontStyle: 'italic', fontSize: 12 }}>
                      "{showChangeRequestModal.notes}"
                    </div>
                  )}
                </div>

                {changeReqError && (
                  <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>
                    {changeReqError}
                  </div>
                )}

                {!isCancelRequest && (
                  <div className="field">
                    <label>Move to class</label>
                    <select
                      value={changeReqNewSession}
                      onChange={e => setChangeReqNewSession(e.target.value)}
                    >
                      <option value="">— Select new class —</option>
                      {(allSessions || []).map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][s.day_of_week]} {s.start_time?.slice(0,5)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="field">
                  <label>Payment adjustment</label>
                  <select value={changeReqRefundAction} onChange={e => setChangeReqRefundAction(e.target.value)}>
                    <option value="none">No refund</option>
                    <option value="credit">Issue account credit</option>
                    <option value="stripe">Refund to card (Stripe)</option>
                    {!isCancelRequest && <option value="charge">Charge extra</option>}
                  </select>
                </div>

                {(changeReqRefundAction === 'credit' || changeReqRefundAction === 'stripe') && (
                  <div className="field">
                    <label>Refund / credit amount ($)</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={changeReqRefundAmount}
                      onChange={e => setChangeReqRefundAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                )}

                {!isCancelRequest && changeReqRefundAction === 'charge' && (
                  <div className="field">
                    <label>Additional charge amount ($)</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={changeReqChargeAmount}
                      onChange={e => setChangeReqChargeAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                )}

                <div className="field">
                  <label>Admin notes <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(sent to student)</span></label>
                  <input
                    value={changeReqAdminNotes}
                    onChange={e => setChangeReqAdminNotes(e.target.value)}
                    placeholder="Optional note to include in the student notification"
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }}
                    disabled={processingChangeReq}
                    onClick={async () => {
                      setProcessingChangeReq(true)
                      setChangeReqError(null)
                      try {
                        await enrolments.changeRequests.reject(showChangeRequestModal.id, { admin_notes: changeReqAdminNotes })
                        const r = await enrolments.changeRequests.list({ student: student.id })
                        setChangeRequestsData(r.data.results || r.data || [])
                        setShowChangeRequestModal(null)
                      } catch (err) {
                        setChangeReqError(err.response?.data?.detail || 'Failed to reject.')
                      } finally {
                        setProcessingChangeReq(false)
                      }
                    }}
                  >
                    Reject
                  </button>
                  <button
                    className="btn btn-lime btn-sm"
                    disabled={processingChangeReq || (!isCancelRequest && !changeReqNewSession)}
                    onClick={async () => {
                      setProcessingChangeReq(true)
                      setChangeReqError(null)
                      try {
                        const payload = {
                          refund_action: (!isCancelRequest && changeReqRefundAction === 'charge') ? 'none' : changeReqRefundAction,
                          refund_amount: (changeReqRefundAction === 'credit' || changeReqRefundAction === 'stripe') ? parseFloat(changeReqRefundAmount || 0) : undefined,
                          admin_notes: changeReqAdminNotes,
                        }
                        if (!isCancelRequest) {
                          payload.new_session_id = parseInt(changeReqNewSession)
                          payload.charge_amount = changeReqRefundAction === 'charge' ? parseFloat(changeReqChargeAmount || 0) : undefined
                        }
                        await enrolments.changeRequests.approve(showChangeRequestModal.id, payload)
                        const [enrolRes, reqRes] = await Promise.all([
                          enrolments.list({ student: student.id }),
                          enrolments.changeRequests.list({ student: student.id }),
                        ])
                        setEnrolData(enrolRes.data.results || [])
                        setChangeRequestsData(reqRes.data.results || reqRes.data || [])
                        setShowChangeRequestModal(null)
                      } catch (err) {
                        setChangeReqError(err.response?.data?.detail || 'Failed to approve.')
                      } finally {
                        setProcessingChangeReq(false)
                      }
                    }}
                  >
                    {processingChangeReq ? 'Processing…' : isCancelRequest ? 'Approve Cancellation' : 'Approve & Move'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {showAddPracticeCredits && (
        <AddPracticeCreditsModal
          student={student}
          onClose={() => setShowAddPracticeCredits(false)}
          onSuccess={(newCredits) => {
            setPracticeCreditsData(prev => [...(prev || []), ...newCredits])
            setShowAddPracticeCredits(false)
          }}
        />
      )}

      {showAddCatchupCredits && (
        <AddCatchupCreditsModal
          student={student}
          onClose={() => setShowAddCatchupCredits(false)}
          onSuccess={(newCredits) => {
            setMakeupCreditsData(prev => [...(prev || []), ...newCredits])
            setShowAddCatchupCredits(false)
          }}
        />
      )}

      {selectedPayment && (
        <PaymentDetailModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onRefunded={() => {
            setSelectedPayment(null)
            payments.list({ student: student.id }).then(r => setPayData(r.data.results || []))
            reloadBalance()
          }}
        />
      )}

      {showNewPlanModal && student && (
        <StudentNewPlanModal
          student={student}
          seasonsData={seasonsData || []}
          outstandingBalance={bal < 0 ? Math.abs(bal) : 0}
          onClose={() => setShowNewPlanModal(false)}
          onSaved={() => {
            setShowNewPlanModal(false)
            payments.list({ student: student.id }).then(r => {
              // refresh balance
              reloadBalance()
            })
          }}
        />
      )}
    </div>
  )
}
