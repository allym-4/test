import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import { homework, classes } from '../api'
import client from '../api/client'
import './StudentsPage.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const AVATAR_COLORS = ['#b0a0ff', '#ccff00', '#ffaa00', '#ff88aa', '#44ffcc', '#ffcc88', '#b0f0b0', '#9ac4ff', '#ffb3de', '#44ff99']
function avatarColor(name) {
  let h = 0
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

function NewAssignmentModal({ onClose, onSaved }) {
  const { data: sessData } = useApi(() => classes.list(), [])
  const sessions = sessData?.results || sessData || []

  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [checklist, setChecklist] = useState([''])
  const [saving, setSaving] = useState(false)

  function addItem() { setChecklist(c => [...c, '']) }
  function removeItem(i) { setChecklist(c => c.filter((_, idx) => idx !== i)) }
  function setItem(i, v) { setChecklist(c => c.map((x, idx) => idx === i ? v : x)) }

  async function submit(e) {
    e.preventDefault()
    if (!title || !sessionId) return
    setSaving(true)
    try {
      const res = await homework.create({
        title,
        description: desc,
        class_session: parseInt(sessionId),
        due_date: dueDate || null,
      })
      const assignmentId = res.data.id
      const validItems = checklist.map((t, i) => ({ text: t, order: i })).filter(x => x.text.trim())
      if (validItems.length) {
        await homework.addChecklist(assignmentId, validItems)
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 500 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>New Assignment</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <form onSubmit={submit}>
            <div className="field"><label>Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Practice your invert this week" required /></div>
            <div className="field">
              <label>Class</label>
              <select value={sessionId} onChange={e => setSessionId(e.target.value)} required>
                <option value="">Select class…</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>{s.name} — {DAYS[s.day_of_week]} {s.start_time?.slice(0, 5)}</option>
                ))}
              </select>
            </div>
            <div className="field"><label>Description</label><textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional details or instructions…" style={{ width: '100%', boxSizing: 'border-box' }} /></div>
            <div className="field"><label>Due Date</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 8, fontWeight: 600 }}>Checklist Items</div>
              {checklist.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input value={item} onChange={e => setItem(i, e.target.value)} placeholder={`Item ${i + 1}…`} style={{ flex: 1 }} />
                  {checklist.length > 1 && <button type="button" className="btn btn-ghost btn-xs" onClick={() => removeItem(i)}>✕</button>}
                </div>
              ))}
              <button type="button" className="btn btn-ghost btn-xs" onClick={addItem}>+ Add item</button>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Creating…' : 'Create Assignment'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function ReviewModal({ sub, onClose, onSaved }) {
  const [notes, setNotes] = useState(sub.instructor_notes || '')
  const [saving, setSaving] = useState(false)

  const studentNote = sub.notes || sub.student_comment || null

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await homework.reviewSubmission(sub.id, { instructor_notes: notes })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 460 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Review Submission</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{sub.student_name}</div>
            <div style={{ fontSize: 12, color: 'var(--grey)' }}>{sub.assignment_title} · Submitted {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''}</div>
          </div>

          {sub.items?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 8, fontWeight: 600 }}>Checklist</div>
              {sub.items.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 13 }}>
                  <span style={{ color: item.completed ? 'var(--lime)' : 'var(--grey)', fontSize: 16 }}>{item.completed ? '✓' : '○'}</span>
                  <span style={{ color: item.completed ? 'var(--white)' : 'var(--grey)' }}>{item.checklist_item_text}</span>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={submit}>
            {studentNote && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 6, fontWeight: 600 }}>Student's note:</div>
                <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--grey)', marginBottom: 12 }}>
                  {studentNote}
                </div>
              </div>
            )}
            <div className="field">
              <label>Feedback for student</label>
              <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add your feedback or encouragement…" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : sub.reviewed ? 'Update Feedback' : 'Mark Reviewed'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Homework Detail Modal (per-student submission status) ─────────────────────

function HwDetailModal({ hw, onClose, onReview }) {
  const [submissions, setSubmissions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await client.get(`/api/users/forms/?homework=${hw.id}`)
        setSubmissions(res.data?.results || res.data || [])
      } catch {
        // Fall back to homework submissions filtered by assignment
        try {
          const res2 = await homework.submissions({ assignment: hw.id })
          setSubmissions(res2.data?.results || res2.data || [])
        } catch {
          setSubmissions([])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  })

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // Build student rows: combine enrolled (if any) with submitted
  const submittedIds = new Set((submissions || []).map(s => s.student || s.student_id))

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 580 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Homework Detail</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{hw.title}</div>
            <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
              {hw.submission_count}/{hw.enrolled_count} submitted
              {hw.due_date && ' · Due ' + new Date(hw.due_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
            </div>
          </div>

          {toast && (
            <div style={{ background: 'var(--lime)', color: '#000', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              {toast}
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
          ) : (submissions || []).length === 0 ? (
            <div style={{ color: 'var(--grey)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No submission data available.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Student', 'Status', 'Submitted At', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(submissions || []).map((sub, i) => {
                    const submitted = sub.submitted_at || sub.status === 'submitted'
                    return (
                      <tr key={sub.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{sub.student_name || sub.student_display_name || `Student #${sub.student || sub.student_id}`}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className={`tag ${submitted ? 'tag-lime' : 'tag-grey'}`} style={{ fontSize: 10 }}>
                            {submitted ? 'Submitted' : 'Not submitted'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--grey)', fontSize: 12 }}>
                          {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {submitted ? (
                            <button className="btn btn-lime btn-xs" onClick={() => { onClose(); onReview(sub) }}>Review</button>
                          ) : (
                            <button className="btn btn-ghost btn-xs" onClick={async () => { try { await client.post(`/api/homework/${hw.id}/remind/`); showToast('Reminder sent') } catch { showToast('Failed to send reminder') } }}>Remind</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function HwCard({ a, onToggle, onDetail }) {
  const pct = a.enrolled_count ? Math.round(a.submission_count / a.enrolled_count * 100) : 0
  const s = a.class_session_detail
  const pctColor = pct === 100 ? 'var(--lime)' : pct > 50 ? 'var(--amber)' : 'var(--grey)'
  const pendingCount = a.submission_count - (a.reviewed_count || 0)
  const tagCls = pendingCount > 0 ? 'tag-amber' : 'tag-lime'
  const tagLabel = pendingCount > 0 ? `${pendingCount} pending review` : a.status === 'active' ? 'Active' : 'Closed'

  return (
    <div className="hw-card" style={{ opacity: a.status !== 'active' ? 0.6 : 1, cursor: 'pointer' }} onClick={() => onDetail(a)}>
      <div className="hw-card-header">
        <div>
          <div className="hw-card-title">{a.title}</div>
          <div className="hw-card-meta">
            {s?.name} — {DAYS[s?.day_of_week]} {s?.start_time?.slice(0, 5)} · {s?.studio_detail?.name}
            {a.assigned_date && ' · Assigned ' + new Date(a.assigned_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
            {a.due_date && ' · Due ' + new Date(a.due_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`tag ${tagCls}`} style={{ fontSize: 10 }}>{tagLabel}</span>
          <button className="btn btn-ghost btn-xs" onClick={e => { e.stopPropagation(); onToggle(a) }}>
            {a.status === 'active' ? 'Close' : 'Reopen'}
          </button>
        </div>
      </div>
      <div className="hw-card-progress">
        <span>{a.submission_count}/{a.enrolled_count} submitted</span>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%`, background: pctColor }} /></div>
        <span style={{ color: pctColor, minWidth: 28, textAlign: 'right' }}>{pct}%</span>
      </div>
      {a.checklist_items?.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          {a.checklist_items.map((item, i) => (
            <div key={item.id} style={{ fontSize: 12, color: 'var(--grey)', padding: '3px 0', display: 'flex', gap: 8 }}>
              <span>{i + 1}.</span><span>{item.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function HomeworkPage() {
  const { data: activeData, loading: loadingActive, refetch: refetchActive } = useApi(() => homework.list({ status: 'active' }))
  const { data: allData, loading: loadingAll, refetch: refetchAll } = useApi(() => homework.list())
  const { data: subsData, loading: loadingSubs, refetch: refetchSubs } = useApi(() => homework.submissions())
  const [tab, setTab] = useState('active')
  const [showNew, setShowNew] = useState(false)
  const [reviewing, setReviewing] = useState(null)
  const [detailHw, setDetailHw] = useState(null)

  const active = activeData?.results || activeData || []
  const all = allData?.results || allData || []
  const submissions = subsData?.results || subsData || []

  const pendingReview = submissions.filter(s => !s.reviewed)
  const reviewed = submissions.filter(s => s.reviewed)

  function refetchAll2() { refetchActive(); refetchAll(); refetchSubs() }

  async function toggleStatus(a) {
    await homework.update(a.id, { status: a.status === 'active' ? 'closed' : 'active' })
    refetchAll2()
  }

  const loading = tab === 'active' ? loadingActive : tab === 'submitted' ? loadingSubs : loadingAll

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Homework</div>
          <div className="page-sub">Assignments for your classes</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => setShowNew(true)}>+ Assign Homework</button>
      </div>

      <div className="tab-strip">
        <div className={`tab-btn ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
          Active {active.length > 0 && `(${active.length})`}
        </div>
        <div className={`tab-btn ${tab === 'submitted' ? 'active' : ''}`} onClick={() => setTab('submitted')}>
          Submitted {pendingReview.length > 0 && `(${pendingReview.length})`}
        </div>
        <div className={`tab-btn ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
          All {all.length > 0 && `(${all.length})`}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : tab === 'submitted' ? (
        submissions.length === 0 ? (
          <div className="empty-state">No submissions yet</div>
        ) : (
          <div className="list-card">
            {pendingReview.map(sub => (
              <div key={sub.id} className="list-row" style={{ gap: 10 }}>
                <div className="avatar" style={{ background: avatarColor(sub.student_name || ''), flexShrink: 0 }}>
                  {sub.student_name?.[0] || '?'}
                </div>
                <div className="list-body">
                  <div className="list-title">{sub.student_name}</div>
                  <div className="list-sub">{sub.assignment_title} · {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''}</div>
                </div>
                <div className="list-end">
                  <span className="tag tag-grey" style={{ fontSize: 10 }}>Needs review</span>
                  <button className="btn btn-lime btn-xs" onClick={() => setReviewing(sub)}>Review</button>
                </div>
              </div>
            ))}
            {reviewed.map(sub => (
              <div key={sub.id} className="list-row" style={{ gap: 10 }}>
                <div className="avatar" style={{ background: avatarColor(sub.student_name || ''), flexShrink: 0 }}>
                  {sub.student_name?.[0] || '?'}
                </div>
                <div className="list-body">
                  <div className="list-title">{sub.student_name}</div>
                  <div className="list-sub">{sub.assignment_title} · {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''}</div>
                </div>
                <div className="list-end">
                  <span className="tag tag-lime" style={{ fontSize: 10 }}>Reviewed</span>
                  <button className="btn btn-ghost btn-xs" onClick={() => setReviewing(sub)}>View</button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div>
          {(tab === 'active' ? active : all).length === 0 ? (
            <div className="empty-state">No homework assignments</div>
          ) : (
            (tab === 'active' ? active : all).map(a => (
              <HwCard key={a.id} a={a} onToggle={toggleStatus} onDetail={setDetailHw} />
            ))
          )}
        </div>
      )}

      {showNew && (
        <NewAssignmentModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); refetchAll2() }} />
      )}
      {reviewing && (
        <ReviewModal sub={reviewing} onClose={() => setReviewing(null)} onSaved={() => { setReviewing(null); refetchSubs() }} />
      )}
      {detailHw && (
        <HwDetailModal
          hw={detailHw}
          onClose={() => setDetailHw(null)}
          onReview={sub => { setDetailHw(null); setReviewing(sub) }}
        />
      )}
    </div>
  )
}
