import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { homework, classes } from '../api'
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

function HwCard({ a, onToggle }) {
  const pct = a.enrolled_count ? Math.round(a.submission_count / a.enrolled_count * 100) : 0
  const s = a.class_session_detail
  const pctColor = pct === 100 ? 'var(--lime)' : pct > 50 ? 'var(--amber)' : 'var(--grey)'
  const pendingCount = a.submission_count - (a.reviewed_count || 0)
  const tagCls = pendingCount > 0 ? 'tag-amber' : 'tag-lime'
  const tagLabel = pendingCount > 0 ? `${pendingCount} pending review` : a.status === 'active' ? 'Active' : 'Closed'

  return (
    <div className="hw-card" style={{ opacity: a.status !== 'active' ? 0.6 : 1 }}>
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
          <button className="btn btn-ghost btn-xs" onClick={() => onToggle(a)}>
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
        <button className="btn btn-lime btn-sm" onClick={() => setShowNew(true)}>+ New Assignment</button>
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
              <HwCard key={a.id} a={a} onToggle={toggleStatus} />
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
    </div>
  )
}
