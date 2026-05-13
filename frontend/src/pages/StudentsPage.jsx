import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { users, payments, enrolments, attendance } from '../api'
import './StudentsPage.css'

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

export default function StudentsPage() {
  const { data, loading } = useApi(() => users.list({ role: 'student' }))
  const [search, setSearch] = useState('')
  const [selected, setSelected]     = useState(null)
  const [activeTab, setActiveTab]   = useState('info')
  const [balanceData, setBalanceData] = useState(null)
  const [enrolData, setEnrolData]   = useState(null)
  const [attData, setAttData]       = useState(null)
  const [notesData, setNotesData]   = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [newNote, setNewNote]       = useState('')

  const allStudents = data?.results || []
  const filtered = allStudents.filter(s =>
    s.display_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  )

  async function openStudent(student) {
    setSelected(student)
    setActiveTab('info')
    setBalanceData(null)
    setEnrolData(null)
    setAttData(null)
    setNotesData(null)
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
      // Load attendance history
      const attRes = await attendance.list({ student: student.id })
      setAttData(attRes.data.results || [])
    } finally {
      setLoadingDetail(false)
    }
  }

  const bal = balanceData ? parseFloat(balanceData.balance) : 0
  const isOwing = bal < 0

  const TABS = ['info', 'bookings', 'payments', 'attendance', 'notes']

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">All Students</div>
          <div className="page-sub">{allStudents.length} active students</div>
        </div>
      </div>

      <div className="stu-filter-bar">
        <input
          className="stu-search"
          type="text"
          placeholder="Search name, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : (
        <div className="list-card">
          {filtered.map(s => {
            const color = avatarColor(s.display_name)
            return (
              <div key={s.id} className="stu-row clickable" onClick={() => openStudent(s)}>
                <div className="avatar" style={{ background: color }}>{s.first_name?.[0]}</div>
                <div className="stu-body">
                  <div className="stu-name">
                    {s.display_name}
                    {s.pronouns && <span className="stu-pronouns">{s.pronouns}</span>}
                  </div>
                  <div className="stu-meta">{s.email}</div>
                </div>
                <span style={{ fontSize: 14, color: 'var(--grey)' }}>›</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="sd-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="sd-modal">
            {/* Header */}
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
              <button className="modal-close-btn" onClick={() => setSelected(null)}>✕</button>
            </div>

            {loadingDetail ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
            ) : (
              <>
                {/* Quick stats */}
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

                {/* Tabs */}
                <div className="sd-tab-bar">
                  {TABS.map(t => (
                    <button
                      key={t}
                      className={`sd-tab ${activeTab === t ? 'active' : ''}`}
                      onClick={() => setActiveTab(t)}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="sd-body">
                  {/* INFO */}
                  {activeTab === 'info' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                        <div className="avatar" style={{ background: avatarColor(selected.display_name), width: 52, height: 52, fontSize: 20 }}>
                          {selected.first_name?.[0]}
                        </div>
                        <div>
                          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>{selected.display_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 3 }}>{selected.pronouns || 'No pronouns listed'}</div>
                        </div>
                      </div>
                      {[
                        ['Email', selected.email],
                        ['Phone', selected.phone || '—'],
                        ['Emergency contact', selected.emergency_contact_name ? `${selected.emergency_contact_name} · ${selected.emergency_contact_phone}` : '—'],
                      ].map(([label, val]) => (
                        <div key={label} className="info-row">
                          <div className="info-label">{label}</div>
                          <div className="info-val">{val}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* BOOKINGS */}
                  {activeTab === 'bookings' && (
                    <div>
                      <div className="sd-section-label">Current Enrolments</div>
                      <div className="list-card" style={{ marginBottom: 16 }}>
                        {(enrolData || []).filter(e => e.status === 'active').map(e => (
                          <div key={e.id} className="list-row">
                            <div className="list-body">
                              <div className="list-title">{e.class_session_detail?.name} · {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][e.class_session_detail?.day_of_week]} {e.class_session_detail?.start_time?.slice(0,5)}</div>
                              <div className="list-sub">{e.class_session_detail?.studio_detail?.name}</div>
                            </div>
                            <span className={`tag tag-lav`} style={{ fontSize: 10 }}>{e.enrolment_type}</span>
                            <span className="tag tag-lime" style={{ fontSize: 10 }}>Active</span>
                          </div>
                        ))}
                        {(enrolData || []).filter(e => e.status === 'active').length === 0 && (
                          <div className="list-row"><div style={{ color: 'var(--grey)', fontSize: 13 }}>No active enrolments</div></div>
                        )}
                      </div>
                      <div className="sd-section-label">Attendance History</div>
                      <div className="list-card">
                        {(attData || []).slice(0, 10).map(a => {
                          const tag = ATT_STATUS_TAG[a.status] || { label: a.status, cls: 'tag-grey' }
                          const isNoShow = a.status === 'no_show'
                          return (
                            <div key={a.id} className="list-row" style={{ background: isNoShow ? 'rgba(255,50,50,0.04)' : undefined }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: isNoShow ? 'var(--red)' : a.status === 'present' ? 'var(--lime)' : 'var(--grey)', flexShrink: 0 }} />
                              <div className="list-body">
                                <div className="list-title">{a.occurrence_detail?.session_detail?.name}</div>
                                <div className="list-sub">
                                  {a.occurrence_detail?.date ? new Date(a.occurrence_detail.date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                                  {isNoShow && a.no_show_fee_charged && <span style={{ color: 'var(--red)', marginLeft: 6 }}>· No-show fee charged</span>}
                                </div>
                              </div>
                              <span className={`tag ${tag.cls}`} style={{ fontSize: 10 }}>{tag.label}</span>
                            </div>
                          )
                        })}
                        {(attData || []).length === 0 && (
                          <div className="list-row"><div style={{ color: 'var(--grey)', fontSize: 13 }}>No attendance records</div></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PAYMENTS */}
                  {activeTab === 'payments' && (
                    <div>
                      {isOwing && (
                        <div className="sd-owing-banner">
                          <div>
                            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#ff8888', marginBottom: 4 }}>Outstanding Balance</div>
                            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: '#ff6b6b' }}>${Math.abs(bal).toFixed(2)}</div>
                          </div>
                          <button className="btn btn-lime btn-sm">Take Payment</button>
                        </div>
                      )}
                      <div className="sd-section-label">Summary</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 16 }}>
                        <div className="sd-stat"><div className="sd-stat-label">Total Charged</div><div className="sd-stat-val">${parseFloat(balanceData?.total_charged || 0).toFixed(2)}</div></div>
                        <div className="sd-stat"><div className="sd-stat-label">Total Paid</div><div className="sd-stat-val" style={{ color: 'var(--lime)' }}>${parseFloat(balanceData?.total_paid || 0).toFixed(2)}</div></div>
                      </div>
                    </div>
                  )}

                  {/* ATTENDANCE */}
                  {activeTab === 'attendance' && (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
                        {[
                          ['Present', attData?.filter(a => a.status === 'present').length || 0, 'var(--lime)'],
                          ['Late', attData?.filter(a => a.status === 'late').length || 0, 'var(--amber)'],
                          ['No-show', attData?.filter(a => a.status === 'no_show').length || 0, 'var(--red)'],
                        ].map(([label, val, color]) => (
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

                  {/* NOTES */}
                  {activeTab === 'notes' && (
                    <div>
                      {(notesData || []).map(n => (
                        <div key={n.id} className="note-item">
                          <div className="note-meta">{n.created_by_name} · {new Date(n.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          {n.tag && <span className="tag tag-amber" style={{ fontSize: 10, marginBottom: 6, display: 'inline-flex' }}>{n.tag}</span>}
                          <div className="note-text">{n.body}</div>
                        </div>
                      ))}
                      {(notesData || []).length === 0 && <div className="empty-state" style={{ padding: '24px 0' }}>No notes yet</div>}
                      <div style={{ marginTop: 16 }}>
                        <textarea
                          className="note-input"
                          placeholder="Add a note about this student…"
                          value={newNote}
                          onChange={e => setNewNote(e.target.value)}
                          rows={3}
                        />
                        <button className="btn btn-lime btn-sm" style={{ marginTop: 8 }} disabled={!newNote.trim()}>
                          Add Note
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
