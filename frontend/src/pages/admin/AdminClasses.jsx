import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { classes } from '../../api'

const TYPE_LABELS = { course: 'Course', casual: 'Drop-In' }

function ClassEmailModal({ session, onClose }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function handleSend(e) {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const res = await classes.emailClass(session.id, { subject, message })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send email.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 480 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>✉ Email Class — {session.name}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          {result ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Sent to {result.sent} student{result.sent !== 1 ? 's' : ''}!</div>
              <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 20 }}>{result.total} enrolled · {result.sent} with email addresses</div>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
            </div>
          ) : (
            <form onSubmit={handleSend}>
              {error && (
                <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>
                  {error}
                </div>
              )}
              <div className="field">
                <label>Subject *</label>
                <input value={subject} onChange={e => setSubject(e.target.value)} required placeholder="e.g. Important class update" />
              </div>
              <div className="field">
                <label>Message *</label>
                <textarea
                  rows={6}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required
                  placeholder="Write your message to all active students in this class…"
                  style={{ width: '100%', background: 'var(--input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '9px 12px', fontSize: 13, resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-lime btn-sm" disabled={sending}>{sending ? 'Sending…' : 'Send Email'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminClasses() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      return p.get('tab') === 'workshops' ? 'workshops' : 'classes'
    }
    return 'classes'
  })
  const [typeFilter, setTypeFilter] = useState('all')
  const [deleting, setDeleting] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [emailSession, setEmailSession] = useState(null)

  const { data: sessData, loading, refetch } = useApi(() => classes.list(), [])
  const { data: workshopsData, loading: loadingWorkshops } = useApi(() => classes.workshops.list(), [])

  const sessions = sessData?.results || sessData || []
  const workshopList = workshopsData?.results || workshopsData || []

  // Deduplicate by (name, day_of_week, start_time) — keep highest id (most recent season)
  const seen = new Map()
  sessions.forEach(s => {
    const key = `${s.name}__${s.day_of_week}__${s.start_time}`
    if (!seen.has(key) || s.id > seen.get(key).id) seen.set(key, s)
  })
  const deduped = Array.from(seen.values())

  const filtered = deduped.filter(s =>
    typeFilter === 'all' || s.session_type === typeFilter
  )

  async function handleDelete(id) {
    setDeleting(id)
    try {
      await classes.delete(id)
      refetch()
    } finally {
      setDeleting(null)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div>
      {emailSession && (
        <ClassEmailModal session={emailSession} onClose={() => setEmailSession(null)} />
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Classes</div>
          <div className="page-sub">Manage all class types available in your studio</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'classes' && (
            <button className="btn btn-lime btn-sm" onClick={() => navigate('/admin/classes/new')}>
              + Create New Class
            </button>
          )}
          {tab === 'workshops' && (
            <button className="btn btn-lime btn-sm" onClick={() => navigate('/admin/workshops/new')}>
              + New Workshop
            </button>
          )}
        </div>
      </div>

      <div className="subtabs" style={{ marginBottom: 20 }}>
        {[['classes', 'Recurring Classes'], ['workshops', 'Workshops']].map(([key, label]) => (
          <div key={key} className={`subtab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</div>
        ))}
      </div>

      {tab === 'classes' && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {[['all', 'All Types'], ['course', 'Course'], ['casual', 'Drop-In']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setTypeFilter(v)}
                style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, border: '1px solid var(--border)',
                  background: typeFilter === v ? 'var(--lime)' : 'transparent',
                  color: typeFilter === v ? '#000' : 'var(--grey)',
                  cursor: 'pointer',
                }}
              >{l}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
          ) : (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Actions</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Name</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Day / Time</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Studio</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--grey)', fontSize: 13 }}>No classes yet.</td></tr>
                  ) : filtered.map((s, i) => (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/admin/classes/${s.id}`)}
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-xs" title="Edit" onClick={() => navigate(`/admin/classes/${s.id}`)}>✏</button>
                          <button className="btn btn-ghost btn-xs" title="Email Class" onClick={() => setEmailSession(s)}>✉</button>
                          {confirmDeleteId === s.id ? (
                            <>
                              <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => handleDelete(s.id)} disabled={deleting === s.id}>{deleting === s.id ? '…' : '✓'}</button>
                              <button className="btn btn-ghost btn-xs" onClick={() => setConfirmDeleteId(null)}>✕</button>
                            </>
                          ) : (
                            <button className="btn btn-ghost btn-xs" style={{ color: '#e05555' }} onClick={() => setConfirmDeleteId(s.id)} title="Delete">🗑</button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                        {s.level && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{s.level}</div>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`tag ${s.session_type === 'course' ? 'tag-lav' : 'tag-grey'}`} style={{ fontSize: 10 }}>
                          {TYPE_LABELS[s.session_type] || s.session_type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--grey)' }}>
                        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][s.day_of_week]} {s.start_time?.slice(0,5)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--grey)' }}>
                        {s.studio_detail?.name || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--grey)' }}>
                        {s.created_at ? new Date(s.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'workshops' && (
        <>
          {loadingWorkshops ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
          ) : (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Workshop</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Time</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Instructor</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Price</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Spots</th>
                  </tr>
                </thead>
                <tbody>
                  {workshopList.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--grey)', fontSize: 13 }}>No workshops yet. Click "+ New Workshop" to create one.</td></tr>
                  ) : workshopList.map((w, i) => (
                    <tr
                      key={w.id}
                      onClick={() => navigate(`/admin/workshops/${w.id}`)}
                      style={{ borderBottom: i < workshopList.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{w.name}</div>
                        {!w.is_active && <span className="tag tag-grey" style={{ fontSize: 10, marginTop: 2 }}>Inactive</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--grey)' }}>
                        {w.date ? new Date(w.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--grey)' }}>
                        {w.start_time?.slice(0, 5)} – {w.end_time?.slice(0, 5)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>
                        {w.instructor_detail?.display_name || <span style={{ color: 'var(--grey)' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>${parseFloat(w.price || 0).toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>
                        <span style={{ color: w.spots_left === 0 ? 'var(--red)' : 'inherit' }}>
                          {w.enrolled_count}/{w.capacity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
