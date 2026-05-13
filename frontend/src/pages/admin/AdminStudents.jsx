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
  late:      { label: 'Late',      cls: 'tag-amber' },
  no_show:   { label: 'No-show',   cls: 'tag-red' },
  absent:    { label: 'Absent',    cls: 'tag-grey' },
  cancelled: { label: 'Cancelled', cls: 'tag-grey' },
}

export default function AdminStudents() {
  const { data, loading } = useApi(() => users.list({ role: 'student' }))
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [activeTab, setActiveTab] = useState('info')
  const [balanceData, setBalanceData] = useState(null)
  const [enrolData, setEnrolData] = useState(null)
  const [attData, setAttData] = useState(null)
  const [notesData, setNotesData] = useState(null)
  const [balances, setBalances] = useState({})
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [studentList, setStudentList] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showCharge, setShowCharge] = useState(false)
  const [showAddToClass, setShowAddToClass] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const allStudents = studentList ?? (data?.results || [])

  // Load quick balances for the table
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

  async function openStudent(student) {
    setSelected(student)
    setActiveTab('info')
    setBalanceData(null); setEnrolData(null); setAttData(null); setNotesData(null)
    setLoadingDetail(true)
    try {
      const [balRes, enrolRes, notesRes] = await Promise.all([
        payments.balance(student.id),
        enrolments.list({ student: student.id }),
        users.notes(student.id),
      ])
      setBalanceData(balRes.data)
      setEnrolData(enrolRes.data.results || [])
      setNotesData(notesRes.data.results || [])
      const attRes = await attendance.list({ student: student.id })
      setAttData(attRes.data.results || [])
    } finally {
      setLoadingDetail(false)
    }
  }

  async function reloadBalance() {
    if (!selected) return
    try {
      const res = await payments.balance(selected.id)
      setBalanceData(res.data)
    } catch {}
  }

  async function reloadEnrolments() {
    if (!selected) return
    try {
      const res = await enrolments.list({ student: selected.id })
      setEnrolData(res.data.results || [])
    } catch {}
  }

  async function reloadNotes() {
    if (!selected) return
    try {
      const res = await users.notes(selected.id)
      setNotesData(res.data.results || [])
    } catch {}
  }

  async function submitNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return
    setSavingNote(true)
    try {
      await users.addNote(selected.id, { body: noteText })
      setNoteText('')
      await reloadNotes()
    } finally {
      setSavingNote(false)
    }
  }

  const bal = balanceData ? parseFloat(balanceData.balance) : 0
  const isOwing = bal < 0
  const TABS = ['info', 'bookings', 'payments', 'attendance', 'notes']

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
          className="stu-search"
          type="text"
          placeholder="Search name, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 320, background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '8px 12px', fontSize: 13, outline: 'none', transition: 'border-color 0.12s', width: '100%' }}
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const b = balances[s.id]
                const isNeg = b !== undefined && b < 0
                return (
                  <tr key={s.id} className="clickable" onClick={() => openStudent(s)}>
                    <td>
                      <div className="avatar" style={{ background: avatarColor(s.display_name), width: 28, height: 28, fontSize: 11 }}>
                        {s.first_name?.[0]}
                      </div>
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
                      <button className="btn btn-ghost btn-xs" onClick={() => openStudent(s)}>View</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal — reusing instructor design */}
      {selected && (
        <div className="sd-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="sd-modal">
            <div className="sd-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar" style={{ background: avatarColor(selected.display_name), width: 46, height: 46, fontSize: 17 }}>
                  {selected.first_name?.[0]}
                </div>
                <div>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{selected.display_name}</div>
                  <div style={{ marginTop: 4 }}><span className="tag tag-lime" style={{ fontSize: 10 }}>Active</span></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-ghost btn-xs" onClick={() => setShowEdit(true)}>Edit</button>
                <button className="modal-close-btn" onClick={() => setSelected(null)}>✕</button>
              </div>
            </div>

            {loadingDetail ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
            ) : (
              <>
                <div className="sd-stats">
                  <div className="sd-stat">
                    <div className="sd-stat-label">Balance</div>
                    <div className="sd-stat-val" style={{ color: isOwing ? 'var(--red)' : 'var(--lime)', fontSize: 17 }}>
                      {isOwing ? `-$${Math.abs(bal).toFixed(0)}` : bal > 0 ? `$${bal.toFixed(0)} cr` : '$0'}
                    </div>
                  </div>
                  <div className="sd-stat">
                    <div className="sd-stat-label">Classes</div>
                    <div className="sd-stat-val">{attData?.length || 0}</div>
                  </div>
                  <div className="sd-stat">
                    <div className="sd-stat-label">Present</div>
                    <div className="sd-stat-val" style={{ color: 'var(--lime)' }}>
                      {attData?.filter(a => a.status === 'present').length || 0}
                    </div>
                  </div>
                  <div className="sd-stat">
                    <div className="sd-stat-label">No-shows</div>
                    <div className="sd-stat-val" style={{ color: 'var(--amber)' }}>
                      {attData?.filter(a => a.status === 'no_show').length || 0}
                    </div>
                  </div>
                </div>

                <div className="sd-tab-bar">
                  {TABS.map(t => (
                    <button key={t} className={`sd-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="sd-body">
                  {activeTab === 'info' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                        <div className="avatar" style={{ background: avatarColor(selected.display_name), width: 52, height: 52, fontSize: 20 }}>{selected.first_name?.[0]}</div>
                        <div>
                          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>{selected.display_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 3 }}>{selected.pronouns || 'No pronouns listed'}</div>
                        </div>
                      </div>
                      {[['Email', selected.email], ['Phone', selected.phone || '—'], ['Emergency contact', selected.emergency_contact_name ? `${selected.emergency_contact_name} · ${selected.emergency_contact_phone}` : '—']].map(([label, val]) => (
                        <div key={label} className="info-row">
                          <div className="info-label">{label}</div>
                          <div className="info-val">{val}</div>
                        </div>
                      ))}
                      {selected.internal_notes && (
                        <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--white)' }}>
                          <div style={{ fontSize: 10, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 6 }}>Internal Notes</div>
                          {selected.internal_notes}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'bookings' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div className="sd-section-label" style={{ marginBottom: 0 }}>Current Enrolments</div>
                        <button className="btn btn-lime btn-xs" onClick={() => setShowAddToClass(true)}>+ Add to Class</button>
                      </div>
                      <div className="list-card" style={{ marginBottom: 16 }}>
                        {(enrolData || []).filter(e => e.status === 'active').map(e => (
                          <div key={e.id} className="list-row">
                            <div className="list-body">
                              <div className="list-title">{e.class_session_detail?.name} · {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][e.class_session_detail?.day_of_week]} {e.class_session_detail?.start_time?.slice(0,5)}</div>
                              <div className="list-sub">{e.class_session_detail?.studio_detail?.name}</div>
                            </div>
                            <span className="tag tag-lav" style={{ fontSize: 10 }}>{e.enrolment_type}</span>
                            <span className="tag tag-lime" style={{ fontSize: 10 }}>Active</span>
                          </div>
                        ))}
                        {(enrolData || []).filter(e => e.status === 'active').length === 0 && (
                          <div className="list-row"><div style={{ color: 'var(--grey)', fontSize: 13 }}>No active enrolments</div></div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'payments' && (
                    <div>
                      {isOwing && (
                        <div className="sd-owing-banner">
                          <div>
                            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#ff8888', marginBottom: 4 }}>Outstanding Balance</div>
                            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: '#ff6b6b' }}>${Math.abs(bal).toFixed(2)}</div>
                          </div>
                          <button className="btn btn-lime btn-sm" onClick={() => setShowPayment(true)}>Take Payment</button>
                        </div>
                      )}
                      <div className="sd-section-label">Summary</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 16 }}>
                        <div className="sd-stat"><div className="sd-stat-label">Total Charged</div><div className="sd-stat-val">${parseFloat(balanceData?.total_charged || 0).toFixed(2)}</div></div>
                        <div className="sd-stat"><div className="sd-stat-label">Total Paid</div><div className="sd-stat-val" style={{ color: 'var(--lime)' }}>${parseFloat(balanceData?.total_paid || 0).toFixed(2)}</div></div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-lime btn-sm" onClick={() => setShowPayment(true)}>Take Payment</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowCharge(true)}>+ Add Charge</button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'attendance' && (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
                        {[['Present', attData?.filter(a => a.status === 'present').length || 0, 'var(--lime)'], ['Late', attData?.filter(a => a.status === 'late').length || 0, 'var(--amber)'], ['No-show', attData?.filter(a => a.status === 'no_show').length || 0, 'var(--red)']].map(([label, val, color]) => (
                          <div key={label} className="sd-stat">
                            <div className="sd-stat-val" style={{ color, fontSize: 24 }}>{val}</div>
                            <div className="sd-stat-label">{label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="list-card">
                        {(attData || []).map(a => {
                          const tag = ATT_STATUS_TAG[a.status] || { label: a.status, cls: 'tag-grey' }
                          return (
                            <div key={a.id} className="list-row">
                              <div className="list-body">
                                <div className="list-title">{a.occurrence_detail?.session_detail?.name}</div>
                                <div className="list-sub">{a.occurrence_detail?.date ? new Date(a.occurrence_detail.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}</div>
                              </div>
                              <span className={`tag ${tag.cls}`} style={{ fontSize: 10 }}>{tag.label}</span>
                            </div>
                          )
                        })}
                        {(attData || []).length === 0 && <div className="list-row"><div style={{ color: 'var(--grey)', fontSize: 13 }}>No records yet</div></div>}
                      </div>
                    </div>
                  )}

                  {activeTab === 'notes' && (
                    <div>
                      <form onSubmit={submitNote} style={{ marginBottom: 16 }}>
                        <textarea
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          placeholder="Add a note…"
                          rows={3}
                          style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '10px 12px', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                          <button type="submit" className="btn btn-lime btn-xs" disabled={savingNote || !noteText.trim()}>{savingNote ? 'Saving…' : 'Add Note'}</button>
                        </div>
                      </form>
                      {(notesData || []).map(n => (
                        <div key={n.id} className="note-item">
                          <div className="note-meta">{n.created_by_name} · {new Date(n.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          {n.tag && <span className="tag tag-amber" style={{ fontSize: 10, marginBottom: 6, display: 'inline-flex' }}>{n.tag}</span>}
                          <div className="note-text">{n.body}</div>
                        </div>
                      ))}
                      {(notesData || []).length === 0 && <div className="empty-state" style={{ padding: '24px 0' }}>No notes yet</div>}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
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
          }}
        />
      )}

      {showEdit && selected && (
        <EditStudentModal
          student={selected}
          onClose={() => setShowEdit(false)}
          onSaved={updated => {
            setSelected(updated)
            setStudentList(prev => (prev ?? allStudents).map(s => s.id === updated.id ? updated : s))
            setShowEdit(false)
          }}
        />
      )}

      {showPayment && selected && (
        <TakePaymentModal
          student={selected}
          onClose={() => setShowPayment(false)}
          onSuccess={() => { setShowPayment(false); reloadBalance() }}
        />
      )}

      {showCharge && selected && (
        <AddChargeModal
          student={selected}
          onClose={() => setShowCharge(false)}
          onSuccess={() => { setShowCharge(false); reloadBalance() }}
        />
      )}

      {showAddToClass && selected && (
        <AddToClassModal
          student={selected}
          onClose={() => setShowAddToClass(false)}
          onSuccess={() => { setShowAddToClass(false); reloadEnrolments() }}
        />
      )}
    </div>
  )
}
