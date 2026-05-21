import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { users, payments, enrolments, attendance, helpdesk, skills as skillsApi, forms as formsApi, classes as classesApi, tags as tagsApi, settings as settingsApi } from '../../api'
import client from '../../api/client'
import '../StudentsPage.css'
import AddStudentModal from '../../components/AddStudentModal'
import BulkImportModal from '../../components/BulkImportModal'
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

function StudentDetail({ student, onClose, onRefreshList, onViewForm }) {
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
  const [commsData, setCommsData] = useState(null)
  const [notificationsData, setNotificationsData] = useState(null)
  const [commsFilter, setCommsFilter] = useState('all')
  const [loadingComms, setLoadingComms] = useState(false)

  useEffect(() => {
    skillsApi.list(student.id).then(res => {
      const map = {}
      for (const skill of (res.data || [])) {
        map[skill.skill_name] = { self: skill.self_assessed, teacher: skill.teacher_confirmed, id: skill.id }
      }
      setSkillProgress(map)
    }).catch(() => setSkillProgress({}))
  }, [student.id])

  useEffect(() => {
    if (tab !== 'comms') return
    setLoadingComms(true)
    Promise.all([
      helpdesk.list({ student: student.id })
        .then(res => res.data.results || res.data || [])
        .catch(() => []),
      client.get('/api/users/notifications/', { params: { recipient: student.id } })
        .then(res => res.data.results || res.data || [])
        .catch(() => []),
    ]).then(([tickets, notifs]) => {
      setCommsData(tickets)
      setNotificationsData(notifs)
    }).finally(() => setLoadingComms(false))
  }, [tab, student.id])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      payments.balance(student.id),
      enrolments.list({ student: student.id }),
      users.notes(student.id, { archived: 'false' }),
      attendance.list({ student: student.id }),
      payments.list({ student: student.id }),
      formsApi.listForStudent(student.id),
      payments.stripe.paymentMethods({ student_id: student.id }),
    ]).then(([balRes, enrolRes, notesRes, attRes, payRes, formsRes, cardsRes]) => {
      setBalanceData(balRes.data)
      setEnrolData(enrolRes.data.results || [])
      setNotesData(notesRes.data.results || [])
      setAttData(attRes.data.results || [])
      setPayData(payRes.data.results || [])
      setFormsData(formsRes.data.results || formsRes.data || [])
      setSavedCardsData(cardsRes.data)
    }).finally(() => setLoading(false))
  }, [student.id])

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
    <>
      <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="sd-modal" style={{ maxWidth: 860, width: '95vw' }}>

          {/* Hero */}
          <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
              {student.profile_photo ? (
                <img src={student.profile_photo} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }} />
              ) : (
                <div className="avatar" style={{ background: avatarColor(student.display_name), width: 56, height: 56, fontSize: 20, flexShrink: 0 }}>
                  {student.first_name?.[0]}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20 }}>{student.display_name}</div>
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
                  </div>
                  <button className="modal-close-btn" onClick={onClose} style={{ flexShrink: 0 }}>✕</button>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  <button className="btn btn-ghost btn-xs" onClick={() => setShowEdit(true)}>Edit Profile</button>
                  <button className="btn btn-ghost btn-xs" onClick={() => setTab('notes')}>Add Note</button>
                  <button className="btn btn-lime btn-xs" onClick={() => setShowCharge(true)}>+ Charge</button>
                  <button className="btn btn-lime btn-xs" onClick={() => setShowPayment(true)}>Take Payment</button>
                  <button className="btn btn-ghost btn-xs" onClick={() => setShowAddToClass(true)}>+ Add to Class</button>
                </div>
              </div>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.key ? 'var(--lime)' : 'transparent'}`, color: tab === t.key ? 'var(--white)' : 'var(--grey)', padding: '10px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'color 0.15s' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="sd-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
            ) : (
              <>
                {/* OVERVIEW */}
                {tab === 'overview' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                      <div className="card" style={{ padding: '16px 18px' }}>
                        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, marginBottom: 12, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.7px', fontSize: 11 }}>Contact Info</div>
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
                        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 11, marginBottom: 12, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Account Summary</div>
                        {[
                          ['Sessions', attData?.length || 0],
                          ['Attended', attData?.filter(a => a.status === 'present').length || 0],
                          ['Lifetime Spend', `$${parseFloat(balanceData?.total_paid || 0).toFixed(2)}`],
                          ['Balance', <span className={isOwing ? 'bal-neg' : 'bal-pos'}>{isOwing ? `-$${Math.abs(bal).toFixed(2)}` : bal > 0 ? `$${bal.toFixed(2)} cr` : '$0'}</span>],
                          ['Enrolments', activeEnrolments.length + ' active'],
                        ].map(([label, val]) => (
                          <div key={label} className="info-row">
                            <div className="info-label">{label}</div>
                            <div className="info-val" style={{ fontSize: 13 }}>{val}</div>
                          </div>
                        ))}
                        <div className="info-row" style={{ borderBottom: 'none' }}>
                          <div className="info-label">Source</div>
                          <div className="info-val" style={{ fontSize: 13, color: 'var(--grey)' }}>—</div>
                        </div>
                      </div>
                    </div>
                    {activeEnrolments.length > 0 && (
                      <div className="card" style={{ padding: '16px 18px' }}>
                        <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 14 }}>Membership Status</div>
                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                          {activeEnrolments.slice(0, 3).map(e => (
                            <div key={e.id}>
                              <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 4 }}>Class</div>
                              <div style={{ fontSize: 14, fontWeight: 500 }}>{e.class_session_detail?.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--grey)' }}>{e.class_session_detail?.instructor_detail?.display_name} · {e.class_session_detail?.studio_detail?.name}</div>
                            </div>
                          ))}
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                              <div style={{ fontWeight: 600 }}>{e.class_session_detail?.name}</div>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 8 }}>
                              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][e.class_session_detail?.day_of_week]} {e.class_session_detail?.start_time?.slice(0,5)} · {e.class_session_detail?.studio_detail?.name}
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                              <span className={`tag ${e.enrolment_type === 'trial' ? 'tag-amber' : 'tag-lime'}`} style={{ fontSize: 10 }}>
                                {e.enrolment_type === 'trial' ? 'Trial' : 'Enrolled'}
                              </span>
                              {e.enrolment_type === 'trial' && (
                                <button
                                  className="btn btn-ghost btn-xs"
                                  style={{ fontSize: 10, color: 'var(--lime)' }}
                                  onClick={() => setConvertTrialEnrol(e)}
                                >
                                  Convert to Full →
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                      <div className={`kpi ${isOwing ? 'kpi-red' : 'kpi-lime'}`} style={{ textAlign: 'center' }}>
                        <div className="kpi-label">Balance</div>
                        <div className="kpi-value" style={{ fontSize: 28 }}>{isOwing ? `-$${Math.abs(bal).toFixed(2)}` : bal > 0 ? `$${bal.toFixed(2)} cr` : '$0'}</div>
                      </div>
                      <div className="kpi kpi-lime" style={{ textAlign: 'center' }}>
                        <div className="kpi-label">Total Paid</div>
                        <div className="kpi-value" style={{ fontSize: 28 }}>${parseFloat(balanceData?.total_paid || 0).toFixed(2)}</div>
                      </div>
                      <div className="kpi" style={{ textAlign: 'center' }}>
                        <div className="kpi-label">Total Charged</div>
                        <div className="kpi-value" style={{ fontSize: 28 }}>${parseFloat(balanceData?.total_charged || 0).toFixed(2)}</div>
                      </div>
                    </div>
                    {/* Saved card status */}
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
                      <button className="btn btn-ghost btn-sm" onClick={() => setShowCharge(true)}>+ Add Charge</button>
                      {savedCardsData?.payment_methods?.length > 0 && savedCardsData?.default_payment_method_id && bal < 0 && (
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
                                description: 'Outstanding balance — Duality Pole Studio',
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
                          {chargingSaved ? 'Charging…' : `Charge Saved Card $${Math.abs(bal).toFixed(2)}`}
                        </button>
                      )}
                    </div>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, marginBottom: 10 }}>Transaction History</div>
                    <div className="tbl-section">
                      <table>
                        <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th></tr></thead>
                        <tbody>
                          {(payData || []).length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--grey)', padding: '24px 0' }}>No transactions</td></tr>}
                          {(payData || []).map(p => {
                            const isCredit = p.payment_type === 'payment' || p.payment_type === 'credit'
                            return (
                              <tr key={p.id}>
                                <td style={{ color: 'var(--grey)', whiteSpace: 'nowrap' }}>{new Date(p.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</td>
                                <td style={{ fontSize: 13 }}>{p.description || p.payment_type.replace(/_/g, ' ')}</td>
                                <td><span className={`tag ${isCredit ? 'tag-lime' : 'tag-red'}`} style={{ fontSize: 10 }}>{p.payment_type.replace(/_/g, ' ')}</span></td>
                                <td style={{ color: isCredit ? 'var(--lime)' : 'var(--red)', fontWeight: 600 }}>
                                  {isCredit ? '+' : '-'}${Math.abs(parseFloat(p.amount || 0)).toFixed(2)}
                                </td>
                              </tr>
                            )
                          })}
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
                    {(() => {
                      function formStatus(form) {
                        if (!form) return { status: 'Not submitted', cls: 'tag-grey' }
                        if (form.completed) return { status: 'Signed', cls: 'tag-lime' }
                        return { status: 'In Progress', cls: 'tag-amber' }
                      }
                      const docs = [
                        { name: 'Health & Medical Form (PAR-Q)', detail: 'PAR-Q pre-screening questionnaire', form: (formsData || []).find(f => f.form_type === 'parq'), ...formStatus((formsData || []).find(f => f.form_type === 'parq')) },
                        { name: 'Liability Waiver', detail: 'Studio liability waiver and code of conduct', form: (formsData || []).find(f => f.form_type === 'waiver'), ...formStatus((formsData || []).find(f => f.form_type === 'waiver')) },
                        { name: 'Photo Consent', detail: 'Permission to photograph/film in class', form: (formsData || []).find(f => f.form_type === 'photo_consent'), ...formStatus((formsData || []).find(f => f.form_type === 'photo_consent')) },
                        { name: 'Season Agreement', detail: 'Season enrolment terms and conditions', form: (formsData || []).find(f => f.form_type === 'season_agreement'), ...formStatus((formsData || []).find(f => f.form_type === 'season_agreement')) },
                      ]
                      return docs.map(doc => (
                        <div key={doc.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{doc.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{doc.detail}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                            <span className={`tag ${doc.cls}`} style={{ fontSize: 10 }}>{doc.status}</span>
                            {doc.form && <button className="btn btn-ghost btn-xs" onClick={() => onViewForm(doc)}>View</button>}
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                )}

                {/* NOTES */}
                {tab === 'notes' && (
                  <div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                      {NOTE_CATS.map(cat => (
                        <button key={cat.key} onClick={() => setNoteCatFilter(cat.key)} className={`btn btn-xs ${noteCatFilter === cat.key ? 'btn-lime' : 'btn-ghost'}`}>{cat.label}</button>
                      ))}
                    </div>
                    {filteredNotes.length === 0 && noteCatFilter === 'all' ? null : filteredNotes.length === 0 ? (
                      <div className="empty-state" style={{ padding: '16px 0' }}>No {noteCatFilter} notes</div>
                    ) : null}
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
                              <button className="btn btn-ghost btn-xs" onClick={() => archiveNote(n.id, !n.archived)}>{n.archived ? 'Restore' : 'Archive'}</button>
                              <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => deleteNote(n.id)}>✕</button>
                            </div>
                          </div>
                          <div className="note-text">{n.body}</div>
                        </div>
                      ))}
                    </div>
                    <div className="card" style={{ padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13 }}>Add Note</div>
                        <button
                          className={`btn btn-xs ${showArchivedNotes ? 'btn-lime' : 'btn-ghost'}`}
                          onClick={() => {
                            const next = !showArchivedNotes
                            setShowArchivedNotes(next)
                            users.notes(student.id, { archived: next ? 'true' : 'false' }).then(r => setNotesData(r.data.results || r.data || []))
                          }}
                        >{showArchivedNotes ? 'Show Active' : 'Show Archived'}</button>
                      </div>
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
                        <textarea
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          placeholder="Add an internal note about this student…"
                          rows={3}
                          style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '10px 12px', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 10 }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                          <button type="submit" className="btn btn-lime btn-sm" disabled={savingNote || !noteText.trim()}>{savingNote ? 'Saving…' : 'Save Note'}</button>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--grey)' }}>
                            <input type="checkbox" checked={noteIsPermanent} onChange={e => setNoteIsPermanent(e.target.checked)} style={{ accentColor: 'var(--lime)' }} />
                            Permanent note
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
                            {commsFilter === 'all' && (
                              <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>Emails & Notifications</div>
                            )}
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
                            {commsFilter === 'all' && (
                              <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>Support Tickets</div>
                            )}
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
                                        <td style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)', flexShrink: 0, display: 'inline-block' }} />
                                          {t.subject}
                                        </td>
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
        </div>
      </div>

      {showEdit && (
        <EditStudentModal
          student={student}
          onClose={() => setShowEdit(false)}
          onSaved={updated => { setShowEdit(false); onRefreshList(updated) }}
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
    </>
  )
}

const AVATAR_COLORS2 = AVATAR_COLORS

const TAG_CHIPS = ['All', 'VIP', 'At Risk', 'Trial', 'Blocked', 'Owing', 'Frozen']

function BulkTagModal({ studentIds, onClose }) {
  const { data: tagsData } = useApi(() => tagsApi.list())
  const [selectedTagId, setSelectedTagId] = useState('')
  const [applying, setApplying] = useState(false)
  const [done, setDone] = useState(false)
  const tagList = tagsData?.results || tagsData || []

  async function apply() {
    if (!selectedTagId || studentIds.length === 0) return
    setApplying(true)
    await Promise.allSettled(studentIds.map(id => tagsApi.addToStudent(id, selectedTagId)))
    setApplying(false)
    setDone(true)
    setTimeout(onClose, 1200)
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 400 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>Bulk Tag</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          {done ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--lime)', fontSize: 13 }}>Tag applied to {studentIds.length} student{studentIds.length !== 1 ? 's' : ''}.</div>
          ) : (
            <>
              <div className="field">
                <label>Select tag</label>
                <select
                  value={selectedTagId}
                  onChange={e => setSelectedTagId(e.target.value)}
                  style={{ background: '#111', color: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: '100%' }}
                >
                  <option value="">— Choose tag —</option>
                  {tagList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 16 }}>Apply to {studentIds.length} filtered student{studentIds.length !== 1 ? 's' : ''}</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
                <button className="btn btn-lime btn-sm" onClick={apply} disabled={!selectedTagId || applying}>{applying ? 'Applying…' : 'Apply'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminStudents() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const studentPath = (id) => user?.role === 'admin' ? `/admin/students/${id}` : `/students/${id}`
  const { data, loading } = useApi(() => users.list({ role: 'student' }))
  const { data: sessionsData } = useApi(() => classesApi.list({ active: 'true' }))
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [activeChip, setActiveChip] = useState('All')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [balances, setBalances] = useState({})
  const [studentList, setStudentList] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showBulkTag, setShowBulkTag] = useState(false)

  const allStudents = studentList ?? (data?.results || data || [])

  useEffect(() => {
    if (allStudents.length === 0) return
    const map = {}
    Promise.all(allStudents.slice(0, 50).map(async s => {
      try {
        const res = await payments.balance(s.id)
        map[s.id] = parseFloat(res.data.balance)
      } catch { map[s.id] = 0 }
    })).then(() => setBalances({ ...map }))
  }, [allStudents.length])

  const filtered = allStudents.filter(s => {
    const matchSearch = !search ||
      s.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || (s.status || '').toLowerCase() === statusFilter.toLowerCase()
    const matchChip = activeChip === 'All' || (s.tags || []).some(t =>
      (typeof t === 'string' ? t : t.name || '').toLowerCase() === activeChip.toLowerCase()
    )
    return matchSearch && matchStatus && matchChip
  }).sort((a, b) => {
    let av, bv
    if (sortKey === 'name') { av = a.display_name || ''; bv = b.display_name || '' }
    else if (sortKey === 'balance') { av = balances[a.id] ?? 0; bv = balances[b.id] ?? 0 }
    else if (sortKey === 'last_seen') { av = a.last_login || ''; bv = b.last_login || '' }
    else { av = ''; bv = '' }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function SortTh({ col, label }) {
    const active = sortKey === col
    return (
      <th onClick={() => toggleSort(col)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
        {label} {active ? (sortDir === 'asc' ? '↑' : '↓') : <span style={{ color: '#444' }}>↕</span>}
      </th>
    )
  }

  const selectStyle = { background: '#111', color: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 13 }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Students</div>
          <div className="page-sub">{allStudents.length} active students</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowBulkTag(true)}>Bulk Tag</button>
          <button className="btn btn-lime btn-sm" onClick={() => setShowAdd(true)}>+ Add Student</button>
        </div>
      </div>

      <div className="filter-bar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search name, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 280, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%' }}
        />
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)} style={selectStyle}>
          <option value="">All Classes</option>
          {(sessionsData?.results || sessionsData || []).map(s => (
            <option key={s.id} value={String(s.id)}>{s.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Frozen">Frozen</option>
          <option value="Blocked">Blocked</option>
          <option value="Owing">Owing</option>
          <option value="Trial">Trial</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, marginBottom: 4 }}>
        {TAG_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => setActiveChip(chip)}
            style={{
              background: activeChip === chip ? 'var(--lime)' : '#1a1a1a',
              color: activeChip === chip ? '#000' : 'var(--grey)',
              border: 'none',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: activeChip === chip ? 700 : 400,
              fontFamily: 'inherit',
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : (
        <div className="tbl-section">
          <table>
            <thead>
              <tr>
                <th></th>
                <SortTh col="name" label="Name" />
                <th>Level</th>
                <th>Classes</th>
                <SortTh col="balance" label="Balance" />
                <th>Status</th>
                <SortTh col="last_seen" label="Last Seen" />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const b = balances[s.id]
                const isNeg = b !== undefined && b < 0
                const lastSeen = s.last_login
                  ? new Date(s.last_login).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
                  : '—'
                return (
                  <tr key={s.id} className="clickable" onClick={() => navigate(studentPath(s.id))}>
                    <td>
                      {s.profile_photo ? (
                        <img src={s.profile_photo} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div className="avatar" style={{ background: avatarColor(s.display_name), width: 28, height: 28, fontSize: 11 }}>
                          {s.first_name?.[0]}
                        </div>
                      )}
                    </td>
                    <td>
                      <b>{s.display_name}</b>
                      <div style={{ fontSize: 11, color: 'var(--grey)' }}>{s.email}</div>
                    </td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{s.level || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--grey)' }}>
                      {(s.enrolled_seasons_summary || []).reduce((sum, item) => sum + (item.count || 0), 0) || '—'}
                    </td>
                    <td>
                      {b !== undefined ? (
                        <span className={isNeg ? 'bal-neg' : 'bal-pos'}>
                          {isNeg ? `-$${Math.abs(b).toFixed(2)}` : b > 0 ? `$${b.toFixed(2)} cr` : '$0'}
                        </span>
                      ) : <span style={{ color: 'var(--grey)' }}>—</span>}
                    </td>
                    <td><span className="tag tag-lime" style={{ fontSize: 10 }}>Active</span></td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{lastSeen}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-xs" onClick={() => navigate(studentPath(s.id))}>View</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddStudentModal
          onClose={() => setShowAdd(false)}
          onCreated={newStudent => setStudentList(prev => [...(prev ?? allStudents), newStudent])}
        />
      )}

      {showImport && (
        <BulkImportModal
          onClose={() => setShowImport(false)}
          onImported={async () => {
            const res = await users.list({ role: 'student' })
            setStudentList(res.data.results || [])
            setShowImport(false)
          }}
        />
      )}

      {showBulkTag && <BulkTagModal studentIds={filtered.map(s => s.id)} onClose={() => setShowBulkTag(false)} />}
    </div>
  )
}
