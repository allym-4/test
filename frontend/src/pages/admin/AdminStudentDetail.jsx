import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { users, payments, enrolments, attendance, helpdesk, skills as skillsApi, forms as formsApi, settings as settingsApi, classes } from '../../api'
import client from '../../api/client'
import '../StudentsPage.css'
import EditStudentModal from '../../components/EditStudentModal'
import TakePaymentModal from '../../components/TakePaymentModal'
import AddChargeModal from '../../components/AddChargeModal'
import AddToClassModal from '../../components/AddToClassModal'

const AVATAR_COLORS = ['#b0a0ff', '#ccff00', '#ffaa00', '#ff88aa', '#44ffcc', '#ffcc88', '#b0f0b0', '#9ac4ff', '#ffb3de', '#44ff99']
function avatarColor(name) {
  let h = 0
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

const ATT_STATUS_TAG = {
  present:   { label: 'Present',   cls: 'tag-lime' },
  late:      { label: 'Late',      cls: 'tag-lav' },
  no_show:   { label: 'No-show',   cls: 'tag-red' },
  absent:    { label: 'Absent',    cls: 'tag-grey' },
  cancelled: { label: 'Cancelled', cls: 'tag-grey' },
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

export default function AdminStudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [student, setStudent] = useState(null)
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
  const [formsData, setFormsData] = useState(null)
  const [lockerData, setLockerData] = useState(null)
  const [commsData, setCommsData] = useState(null)
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
        map[skill.skill_name] = { self: skill.self_assessed, teacher: skill.teacher_confirmed, id: skill.id }
      }
      setSkillProgress(map)
    }).catch(() => setSkillProgress({}))
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

    classes.list()
      .then(r => setAllSessions(r.data.results || r.data || []))
      .catch(() => {})
  }, [student?.id])

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

  function toggleSkill(skillName, type) {
    setSkillProgress(prev => {
      const current = prev[skillName] || {}
      const newVal = !current[type]
      const updated = { ...prev, [skillName]: { ...current, [type]: newVal } }
      const payload = {
        skill_name: skillName,
        level: skillLevel,
        self_assessed: type === 'self' ? newVal : (current.self || false),
        teacher_confirmed: type === 'teacher' ? newVal : (current.teacher || false),
      }
      skillsApi.save(student.id, payload).then(res => {
        setSkillProgress(p => ({ ...p, [skillName]: { self: res.data.self_assessed, teacher: res.data.teacher_confirmed, id: res.data.id } }))
      }).catch(() => {
        setSkillProgress(p => ({ ...p, [skillName]: current }))
      })
      return updated
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
  const filteredNotes = (notesData || []).filter(n => noteCatFilter === 'all' || n.tag === noteCatFilter)

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'enrolments', label: 'Enrolments' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'payments', label: 'Payments' },
    { key: 'progress', label: 'Progress' },
    { key: 'documents', label: 'Documents' },
    { key: 'notes', label: `Notes${notesData?.length ? ` (${notesData.length})` : ''}` },
    { key: 'comms', label: 'Comms' },
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
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', borderTop: '1px solid var(--border)', marginTop: 4 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.key ? 'var(--lime)' : 'transparent'}`, color: tab === t.key ? 'var(--white)' : 'var(--grey)', padding: '12px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'color 0.15s' }}>
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
                <div className="sd-overview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
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
                    <div className="info-row" style={{ borderBottom: 'none' }}>
                      <div className="info-label">Tags</div>
                      <div className="info-val" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {(student.tags || []).map((t, i) => (
                          <span key={i} className="tag tag-amber" style={{ fontSize: 10 }}>{typeof t === 'string' ? t : t.name}</span>
                        ))}
                        <button className="btn btn-ghost btn-xs" onClick={() => alert('Add tag')}>+ Tag</button>
                      </div>
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
                    statusLabel = 'On Hold — Payment Issue'; statusColor = 'var(--amber)'
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
                            <button className="btn btn-ghost btn-xs" onClick={() => { setTcStep(null); setTcEnrolment(null); setTcNewSession(''); setTcResolution('credit'); setTcNotes(''); setTcError(null); setShowTransferCancel('list') }}>Transfer / Cancel</button>
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
                                  <button className="btn btn-ghost btn-xs" style={{ flexShrink: 0 }} onClick={ev => { ev.stopPropagation(); setTcEnrolment(e); setTcStep(null); setTcNewSession(''); setTcResolution('credit'); setTcNotes(''); setTcError(null); setShowTransferCancel('list') }}>Transfer / Cancel</button>
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
                                  <button className="btn btn-ghost btn-xs" style={{ flexShrink: 0 }} onClick={ev => { ev.stopPropagation(); setTcEnrolment(e); setTcStep(null); setTcNewSession(''); setTcResolution('credit'); setTcNotes(''); setTcError(null); setShowTransferCancel('list') }}>Transfer / Cancel</button>
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <button className="btn btn-lime btn-sm" onClick={() => setShowAddToClass(true)}>+ Add to Class</button>
                </div>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, marginBottom: 10 }}>Current Enrolments</div>
                {activeEnrolments.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px 0' }}>No active enrolments</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
                    {activeEnrolments.map(e => (
                      <div key={e.id} className="card" style={{ padding: 16 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{e.class_session_detail?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 8 }}>
                          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][e.class_session_detail?.day_of_week]} {e.class_session_detail?.start_time?.slice(0,5)} · {e.class_session_detail?.studio_detail?.name}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className={`tag ${e.enrolment_type === 'trial' ? 'tag-amber' : 'tag-lime'}`} style={{ fontSize: 10 }}>
                            {e.enrolment_type === 'trial' ? 'Trial' : 'Enrolled'}
                          </span>
                          {e.enrolment_type === 'trial' && (
                            <button className="btn btn-ghost btn-xs" style={{ fontSize: 10, color: 'var(--lime)' }} onClick={() => setConvertTrialEnrol(e)}>
                              Convert to Full →
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {(() => {
                  const SEASON_PRICES = {1: 270, 2: 440, 3: 580, 4: 700, 5: 800, 6: 900}
                  const n = activeEnrolments.length
                  const nextClassPrice = n === 0 ? 270 : (SEASON_PRICES[Math.min(n + 1, 6)] - SEASON_PRICES[Math.min(n, 5)])
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--grey)' }}>
                        <strong>Add-on pricing:</strong> Adding a class to this student's schedule costs <strong>${nextClassPrice}</strong>
                      </span>
                    </div>
                  )
                })()}
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, marginBottom: 10 }}>Waitlisted</div>
                {(enrolData || []).filter(e => e.status === 'waitlisted').length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 20 }}>None</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
                    {(enrolData || []).filter(e => e.status === 'waitlisted').map(e => (
                      <div key={e.id} className="card" style={{ padding: 16 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{e.class_session_detail?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 8 }}>
                          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][e.class_session_detail?.day_of_week]} {e.class_session_detail?.start_time?.slice(0,5)}
                        </div>
                        <span className="tag tag-amber" style={{ fontSize: 10 }}>Waitlisted</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Class Change Requests */}
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, marginBottom: 10, marginTop: 8 }}>
                  Class Change Requests
                  {(changeRequestsData || []).filter(r => r.status === 'pending').length > 0 && (
                    <span style={{ background: 'var(--lime)', color: '#000', borderRadius: 12, fontSize: 10, fontWeight: 700, padding: '1px 7px', marginLeft: 8 }}>
                      {(changeRequestsData || []).filter(r => r.status === 'pending').length} pending
                    </span>
                  )}
                </div>
                {(changeRequestsData || []).length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 20 }}>No change requests</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {(changeRequestsData || []).map(req => (
                      <div key={req.id} className="card" style={{ padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                              {req.current_enrolment_detail?.class_session_detail?.name || 'Unknown class'}
                            </div>
                            {req.requested_session_detail && (
                              <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 4 }}>
                                → Requesting: {req.requested_session_detail.name}
                              </div>
                            )}
                            {req.notes && (
                              <div style={{ fontSize: 13, color: 'var(--white)', marginTop: 4, padding: '8px 10px', background: '#1a1a1a', borderRadius: 6 }}>
                                "{req.notes}"
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 6 }}>
                              {new Date(req.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            {req.admin_notes && (
                              <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 4, fontStyle: 'italic' }}>
                                Admin: {req.admin_notes}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                            <span className={`tag ${req.status === 'pending' ? 'tag-amber' : req.status === 'approved' ? 'tag-lime' : 'tag-red'}`} style={{ fontSize: 10 }}>
                              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </span>
                            {req.status === 'pending' && (
                              <button
                                className="btn btn-lime btn-xs"
                                onClick={() => {
                                  setShowChangeRequestModal(req)
                                  setChangeReqNewSession(req.requested_session?.toString() || '')
                                  setChangeReqRefundAction('none')
                                  setChangeReqRefundAmount('')
                                  setChangeReqChargeAmount('')
                                  setChangeReqAdminNotes('')
                                  setChangeReqError(null)
                                }}
                              >
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
            )}

            {/* ATTENDANCE */}
            {tab === 'attendance' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
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
                        const tag = ATT_STATUS_TAG[a.status] || { label: a.status, cls: 'tag-grey' }
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
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
                  <button className="btn btn-ghost btn-sm" onClick={() => { setTcStep(null); setTcEnrolment(null); setTcNewSession(''); setTcResolution('credit'); setTcNotes(''); setTcError(null); setShowTransferCancel('list') }}>Transfer / Cancel Enrolment</button>
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
                            <tr key={p.id}>
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
                <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--lav)', marginRight: 4 }} />Self-assessed</span>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--lime)', marginRight: 4 }} />Teacher confirmed</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {(SKILL_LEVELS[skillLevel] || []).map(skill => {
                    const prog = skillProgress[skill] || {}
                    return (
                      <div key={skill} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13 }}>{skill}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <div onClick={() => toggleSkill(skill, 'self')} style={{ width: 10, height: 10, borderRadius: '50%', background: prog.self ? 'var(--lav)' : 'none', border: '1px solid var(--lav)', cursor: 'pointer' }} title="Self-assessed" />
                          <div onClick={() => toggleSkill(skill, 'teacher')} style={{ width: 10, height: 10, borderRadius: '50%', background: prog.teacher ? 'var(--lime)' : 'none', border: '1px solid var(--lime)', cursor: 'pointer' }} title="Teacher confirmed" />
                        </div>
                      </div>
                    )
                  })}
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
                    {NOTE_CATS.map(cat => (
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
                          <option value="vibe">✨ Vibe</option>
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
                        Permanent note (always surfaces in action items)
                      </label>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* COMMS */}
            {tab === 'comms' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[['all', 'All'], ['emails', 'Emails & Notifications'], ['tickets', 'Tickets']].map(([key, label]) => (
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
        <div className="sd-overlay" onClick={e => e.target === e.currentTarget && setShowBlockConfirm(false)}>
          <div className="sd-modal" style={{ maxWidth: 400 }}>
            <div className="sd-header">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>{student.is_active ? 'Block Account' : 'Unblock Account'}</div>
              <button className="modal-close-btn" onClick={() => setShowBlockConfirm(false)}>✕</button>
            </div>
            <div className="sd-body">
              <p style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 20 }}>
                {student.is_active
                  ? `This will prevent ${student.first_name} from logging in. They will not be notified.`
                  : `This will restore ${student.first_name}'s access to the student portal.`}
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowBlockConfirm(false)}>Cancel</button>
                <button
                  className="btn btn-sm"
                  style={{ background: student.is_active ? 'var(--red)' : 'var(--lime)', color: student.is_active ? '#fff' : '#000' }}
                  onClick={async () => {
                    await users.update(student.id, { is_active: !student.is_active })
                    setStudent(s => ({ ...s, is_active: !s.is_active }))
                    setShowBlockConfirm(false)
                  }}
                >
                  {student.is_active ? 'Block Account' : 'Unblock Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
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
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAccountCredit(false)}>Cancel</button>
                <button
                  className="btn btn-lime btn-sm"
                  disabled={savingCredit || !creditAmount}
                  onClick={async () => {
                    setSavingCredit(true)
                    try {
                      await payments.create({ student: student.id, payment_type: 'credit', amount: parseFloat(creditAmount), description: creditDesc || 'Account credit added' })
                      const [balRes, payRes] = await Promise.all([payments.balance(student.id), payments.list({ student: student.id })])
                      setBalanceData(balRes.data)
                      setPayData(payRes.data.results || [])
                      setCreditAmount('')
                      setCreditDesc('')
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

        const closeModal = () => { setShowTransferCancel(false); setTcStep(null); setTcEnrolment(null); setTcError(null) }

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

        const seasonId = tcEnrolment?.class_session_detail?.season
        const transferSessions = tcStep === 'transfer'
          ? (allSessions || []).filter(s => String(s.season) === String(seasonId) && s.id !== tcEnrolment?.class_session)
          : []

        return (
          <div className="sd-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
            <div className="sd-modal" style={{ maxWidth: 500 }}>
              <div className="sd-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {tcStep && (
                    <button className="btn btn-ghost btn-xs" onClick={() => { setTcStep(null); setTcError(null) }}>← Back</button>
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
                              <button className="btn btn-ghost btn-xs" onClick={() => { setTcEnrolment(e); setTcNewSession(''); setTcStep('transfer') }}>Transfer</button>
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

                {/* Step 2a: Transfer */}
                {tcStep === 'transfer' && (
                  <>
                    <div style={{ background: '#111', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 13, color: 'var(--grey)' }}>
                      Transferring from: <strong style={{ color: 'var(--white)' }}>{tcEnrolment?.class_session_detail?.name}</strong>
                    </div>
                    <div className="field">
                      <label>Transfer to</label>
                      <select value={tcNewSession} onChange={e => setTcNewSession(e.target.value)}>
                        <option value="">— Select class —</option>
                        {transferSessions.length === 0
                          ? <option disabled>No other classes available in this season</option>
                          : transferSessions.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} · {DAYS[s.day_of_week]} {s.start_time?.slice(0,5)}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                    <div className="field">
                      <label>Notes (optional)</label>
                      <textarea value={tcNotes} onChange={e => setTcNotes(e.target.value)} rows={3} placeholder="Reason for transfer request…" />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setTcStep(null)}>Back</button>
                      <button className="btn btn-lime btn-sm" onClick={submitTransfer} disabled={tcSaving}>
                        {tcSaving ? 'Submitting…' : 'Submit Transfer Request'}
                      </button>
                    </div>
                  </>
                )}

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
      {showChangeRequestModal && (
        <div className="sd-overlay" onClick={e => e.target === e.currentTarget && setShowChangeRequestModal(null)}>
          <div className="sd-modal" style={{ maxWidth: 500 }}>
            <div className="sd-header">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>Process Class Change Request</div>
              <button className="modal-close-btn" onClick={() => setShowChangeRequestModal(null)}>✕</button>
            </div>
            <div className="sd-body">
              <div style={{ background: '#111', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
                <div style={{ color: 'var(--grey)', marginBottom: 4 }}>Current class</div>
                <div style={{ fontWeight: 600, color: 'var(--white)' }}>
                  {showChangeRequestModal.current_enrolment_detail?.class_session_detail?.name || 'Unknown'}
                </div>
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

              <div className="field">
                <label>Payment adjustment</label>
                <select value={changeReqRefundAction} onChange={e => setChangeReqRefundAction(e.target.value)}>
                  <option value="none">No adjustment</option>
                  <option value="credit">Issue studio credit</option>
                  <option value="stripe">Refund to card (Stripe)</option>
                  <option value="charge">Charge extra</option>
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

              {changeReqRefundAction === 'charge' && (
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
                  disabled={processingChangeReq || !changeReqNewSession}
                  onClick={async () => {
                    setProcessingChangeReq(true)
                    setChangeReqError(null)
                    try {
                      await enrolments.changeRequests.approve(showChangeRequestModal.id, {
                        new_session_id: parseInt(changeReqNewSession),
                        refund_action: changeReqRefundAction === 'charge' ? 'none' : changeReqRefundAction,
                        refund_amount: (changeReqRefundAction === 'credit' || changeReqRefundAction === 'stripe') ? parseFloat(changeReqRefundAmount || 0) : undefined,
                        charge_amount: changeReqRefundAction === 'charge' ? parseFloat(changeReqChargeAmount || 0) : undefined,
                        admin_notes: changeReqAdminNotes,
                      })
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
                  {processingChangeReq ? 'Processing…' : 'Approve & Move'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
