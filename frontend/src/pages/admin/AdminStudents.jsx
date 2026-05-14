import { useState, useEffect } from 'react'
import { useApi } from '../../hooks/useApi'
import { users, payments, enrolments, attendance } from '../../api'
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

function StudentDetail({ student, onClose, onRefreshList }) {
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
  const [noteText, setNoteText] = useState('')
  const [noteCategory, setNoteCategory] = useState('general')
  const [savingNote, setSavingNote] = useState(false)
  const [noteCatFilter, setNoteCatFilter] = useState('all')
  const [skillLevel, setSkillLevel] = useState('Level 1')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      payments.balance(student.id),
      enrolments.list({ student: student.id }),
      users.notes(student.id),
      attendance.list({ student: student.id }),
      payments.list({ student: student.id }),
    ]).then(([balRes, enrolRes, notesRes, attRes, payRes]) => {
      setBalanceData(balRes.data)
      setEnrolData(enrolRes.data.results || [])
      setNotesData(notesRes.data.results || [])
      setAttData(attRes.data.results || [])
      setPayData(payRes.data.results || [])
    }).finally(() => setLoading(false))
  }, [student.id])

  async function reloadBalance() {
    const res = await payments.balance(student.id)
    setBalanceData(res.data)
  }

  async function reloadNotes() {
    const res = await users.notes(student.id)
    setNotesData(res.data.results || [])
  }

  async function submitNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return
    setSavingNote(true)
    try {
      await users.addNote(student.id, { body: noteText, tag: noteCategory })
      setNoteText('')
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
                            <span className="tag tag-lime" style={{ fontSize: 10 }}>Enrolled</span>
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
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                      <button className="btn btn-lime btn-sm" onClick={() => setShowPayment(true)}>+ Record Payment</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setShowCharge(true)}>+ Add Charge</button>
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
                      {(SKILL_LEVELS[skillLevel] || []).map(skill => (
                        <div key={skill} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13 }}>{skill}</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'none', border: '1px solid var(--lav)' }} title="Self-assessed" />
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'none', border: '1px solid var(--lime)' }} title="Teacher confirmed" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 20, fontSize: 12, color: 'var(--grey)' }}>Click dots to mark progress. Connect to the progress API to persist.</div>
                  </div>
                )}

                {/* DOCUMENTS */}
                {tab === 'documents' && (
                  <div className="card" style={{ padding: '16px 18px' }}>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, marginBottom: 16 }}>Documents & Consents</div>
                    {[
                      { name: 'Liability Waiver', detail: 'Studio liability waiver and code of conduct', status: 'Signed', cls: 'tag-lime' },
                      { name: 'Health & Medical Form', detail: 'PAR-Q pre-screening questionnaire', status: 'Complete', cls: 'tag-lime' },
                      { name: 'Photo Consent', detail: 'Permission to photograph/film in class', status: 'Granted', cls: 'tag-lime' },
                      { name: 'Season Agreement', detail: 'Season enrolment terms and conditions', status: 'Pending', cls: 'tag-amber' },
                    ].map(doc => (
                      <div key={doc.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{doc.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{doc.detail}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                          <span className={`tag ${doc.cls}`} style={{ fontSize: 10 }}>{doc.status}</span>
                          <button className="btn btn-ghost btn-xs">View</button>
                        </div>
                      </div>
                    ))}
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
                        <div key={n.id} className="note-item">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {n.tag && <span className="tag tag-amber" style={{ fontSize: 10 }}>{n.tag}</span>}
                              <div className="note-meta" style={{ margin: 0 }}>{n.created_by_name} · {new Date(n.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                            </div>
                          </div>
                          <div className="note-text">{n.body}</div>
                        </div>
                      ))}
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
                        </div>
                        <textarea
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          placeholder="Add an internal note about this student…"
                          rows={3}
                          style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '10px 12px', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 10 }}
                        />
                        <button type="submit" className="btn btn-lime btn-sm" disabled={savingNote || !noteText.trim()}>{savingNote ? 'Saving…' : 'Save Note'}</button>
                      </form>
                    </div>
                  </div>
                )}

                {/* COMMS */}
                {tab === 'comms' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['All', 'Emails', 'DMs', 'SMS'].map(f => (
                          <button key={f} className="btn btn-ghost btn-xs">{f}</button>
                        ))}
                      </div>
                      <button className="btn btn-ghost btn-sm">+ Send Message</button>
                    </div>
                    <div className="empty-state">No communications yet</div>
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
        <AddToClassModal student={student} onClose={() => setShowAddToClass(false)} onSuccess={() => setShowAddToClass(false)} />
      )}
    </>
  )
}

const AVATAR_COLORS2 = AVATAR_COLORS

export default function AdminStudents() {
  const { data, loading } = useApi(() => users.list({ role: 'student' }))
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [balances, setBalances] = useState({})
  const [studentList, setStudentList] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const allStudents = studentList ?? (data?.results || [])

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

  const filtered = allStudents.filter(s =>
    s.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Students</div>
          <div className="page-sub">{allStudents.length} active students</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowImport(true)}>↑ Bulk Import</button>
          <button className="btn btn-lime btn-sm" onClick={() => setShowAdd(true)}>+ Add Student</button>
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search name, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 320, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : (
        <div className="tbl-section">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Email</th>
                <th>Balance</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const b = balances[s.id]
                const isNeg = b !== undefined && b < 0
                return (
                  <tr key={s.id} className="clickable" onClick={() => setSelected(s)}>
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
                      {s.pronouns && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{s.pronouns}</div>}
                    </td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{s.email}</td>
                    <td>
                      {b !== undefined ? (
                        <span className={isNeg ? 'bal-neg' : 'bal-pos'}>
                          {isNeg ? `-$${Math.abs(b).toFixed(2)}` : b > 0 ? `$${b.toFixed(2)} cr` : '$0'}
                        </span>
                      ) : <span style={{ color: 'var(--grey)' }}>—</span>}
                    </td>
                    <td><span className="tag tag-lime" style={{ fontSize: 10 }}>Active</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-xs" onClick={() => setSelected(s)}>View</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <StudentDetail
          student={selected}
          onClose={() => setSelected(null)}
          onRefreshList={updated => {
            setSelected(updated)
            setStudentList(prev => (prev ?? allStudents).map(s => s.id === updated.id ? updated : s))
          }}
        />
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
    </div>
  )
}
