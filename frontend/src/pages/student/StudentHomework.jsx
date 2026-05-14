import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { homework } from '../../api'
import client from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function SubmitModal({ assignment, existingSubmission, onClose, onSaved }) {
  const initItems = () => {
    if (!assignment.checklist_items?.length) return {}
    const map = {}
    assignment.checklist_items.forEach(item => {
      const existing = existingSubmission?.items?.find(i => i.checklist_item === item.id)
      map[item.id] = { completed: existing?.completed || false, notes: existing?.notes || '', video_url: existing?.video_url || '' }
    })
    return map
  }

  const [items, setItems] = useState(initItems)
  const [saving, setSaving] = useState(false)

  function toggleItem(id) {
    setItems(prev => ({ ...prev, [id]: { ...prev[id], completed: !prev[id].completed } }))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (existingSubmission) {
        await homework.reviewSubmission(existingSubmission.id, {})
      } else {
        const subRes = await homework.submitHomework({ assignment: assignment.id })
        const subId = subRes.data.id
        for (const [checklistItemId, val] of Object.entries(items)) {
          if (val.completed || val.notes || val.video_url) {
            await client.post(`/api/homework/submissions/${subId}/items/`, {
              submission: subId, checklist_item: parseInt(checklistItemId), ...val,
            })
          }
        }
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const allChecked = assignment.checklist_items?.length
    ? assignment.checklist_items.every(item => items[item.id]?.completed)
    : true

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 460, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{existingSubmission ? 'Your Submission' : 'Submit Homework'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: '18px 20px' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{assignment.title}</div>
          {assignment.description && (
            <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6, marginBottom: 16 }}>{assignment.description}</div>
          )}

          {existingSubmission ? (
            <div>
              <div style={{ background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--lime)', marginBottom: 4 }}>Submitted ✓</div>
                <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                  {new Date(existingSubmission.submitted_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}
                </div>
              </div>
              {existingSubmission.instructor_notes && (
                <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 6, fontWeight: 600 }}>Instructor Feedback</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>{existingSubmission.instructor_notes}</div>
                </div>
              )}
              {assignment.checklist_items?.map(item => {
                const sub = existingSubmission.items?.find(i => i.checklist_item === item.id)
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 13 }}>
                    <span style={{ color: sub?.completed ? 'var(--lime)' : 'var(--grey)', fontSize: 16 }}>{sub?.completed ? '✓' : '○'}</span>
                    <span>{item.text}</span>
                  </div>
                )
              })}
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 16 }} onClick={onClose}>Close</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              {assignment.checklist_items?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 10, fontWeight: 600 }}>Checklist</div>
                  {assignment.checklist_items.map(item => (
                    <div key={item.id} onClick={() => toggleItem(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', background: items[item.id]?.completed ? 'rgba(204,255,0,0.06)' : '#111', marginBottom: 6, border: `1px solid ${items[item.id]?.completed ? 'rgba(204,255,0,0.2)' : 'var(--border)'}` }}>
                      <span style={{ fontSize: 18, color: items[item.id]?.completed ? 'var(--lime)' : 'var(--grey)' }}>
                        {items[item.id]?.completed ? '✓' : '○'}
                      </span>
                      <span style={{ fontSize: 13, color: items[item.id]?.completed ? 'var(--white)' : 'var(--grey)' }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>
                  {saving ? 'Submitting…' : allChecked ? 'Submit ✓' : 'Submit'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StudentHomework() {
  const { user } = useAuth()
  const { data: hwData, loading, refetch } = useApi(() => homework.list({ status: 'active' }), [])
  const { data: subData, refetch: refetchSubs } = useApi(() => homework.submissions({ student: user?.id }), [user?.id])

  const assignments = hwData?.results || hwData || []
  const mySubmissions = subData?.results || subData || []

  const [modal, setModal] = useState(null)

  function getSubmission(assignmentId) {
    return mySubmissions.find(s => s.assignment === assignmentId)
  }

  const pending = assignments.filter(a => !getSubmission(a.id))
  const submitted = assignments.filter(a => !!getSubmission(a.id))

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Homework</div>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>Assignments from your instructors</div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : assignments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--grey)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No homework right now</div>
          <div style={{ fontSize: 12 }}>Your instructor hasn't assigned any homework yet.</div>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>
                To Do ({pending.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pending.map(a => {
                  const s = a.class_session_detail
                  const overdue = a.due_date && new Date(a.due_date) < new Date()
                  return (
                    <div key={a.id} style={{ background: 'var(--card)', border: `1px solid ${overdue ? 'rgba(255,68,68,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: '16px 18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{a.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                            {s?.name} — {s ? DAYS[s.day_of_week] : ''} {s?.start_time?.slice(0, 5)}
                            {a.due_date && <span style={{ color: overdue ? 'var(--red)' : 'var(--amber)', marginLeft: 8 }}>· {overdue ? 'Overdue' : 'Due'} {new Date(a.due_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>}
                          </div>
                        </div>
                        <button className="btn btn-lime btn-sm" onClick={() => setModal({ assignment: a, submission: null })}>
                          Submit
                        </button>
                      </div>
                      {a.description && <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6, marginBottom: a.checklist_items?.length ? 10 : 0 }}>{a.description}</div>}
                      {a.checklist_items?.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {a.checklist_items.map(item => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--grey)' }}>
                              <span>○</span><span>{item.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {submitted.length > 0 && (
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>
                Completed ({submitted.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {submitted.map(a => {
                  const sub = getSubmission(a.id)
                  const s = a.class_session_detail
                  return (
                    <div key={a.id} style={{ background: 'rgba(204,255,0,0.03)', border: '1px solid rgba(204,255,0,0.12)', borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{a.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                          {s?.name} · Submitted {sub && new Date(sub.submitted_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          {sub?.reviewed && <span style={{ color: 'var(--lime)', marginLeft: 8 }}>· Reviewed ✓</span>}
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => setModal({ assignment: a, submission: sub })}>
                        View
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {modal && (
        <SubmitModal
          assignment={modal.assignment}
          existingSubmission={modal.submission}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refetch(); refetchSubs() }}
        />
      )}
    </div>
  )
}
