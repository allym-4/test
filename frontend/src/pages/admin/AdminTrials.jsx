import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { enrolments } from '../../api'

function Stars({ value, max = 5 }) {
  if (!value) return <span style={{ color: 'var(--grey)', fontSize: 12 }}>—</span>
  return (
    <span style={{ fontSize: 13, letterSpacing: 1 }}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ color: i < value ? '#ccff00' : 'var(--border)' }}>★</span>
      ))}
    </span>
  )
}

function OutcomeBadge({ feedback }) {
  if (!feedback) return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'var(--grey)', border: '1px solid var(--border)' }}>
      Pending
    </span>
  )
  if (feedback.enrolled) return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(204,255,0,0.12)', color: 'var(--lime)', border: '1px solid rgba(204,255,0,0.3)', fontWeight: 700 }}>
      Converted ✓
    </span>
  )
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(255,68,68,0.25)' }}>
      Declined
    </span>
  )
}

function avgRating(feedback) {
  if (!feedback) return null
  const vals = [feedback.class_rating, feedback.instructor_rating, feedback.facilities_rating, feedback.structure_rating].filter(Boolean)
  if (!vals.length) return null
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
}

export default function AdminTrials() {
  const navigate = useNavigate()
  const { data, loading } = useApi(() => enrolments.list({ enrolment_type: 'trial' }), [])
  const [expandedId, setExpandedId] = useState(null)
  const [outcomeFilter, setOutcomeFilter] = useState('all')

  const all = data?.results || data || []

  const filtered = all.filter(e => {
    if (outcomeFilter === 'converted') return e.trial_feedback?.enrolled === true
    if (outcomeFilter === 'declined') return e.trial_feedback && e.trial_feedback.enrolled === false
    if (outcomeFilter === 'pending') return !e.trial_feedback
    return true
  })

  const total = all.length
  const converted = all.filter(e => e.trial_feedback?.enrolled).length
  const declined = all.filter(e => e.trial_feedback && !e.trial_feedback.enrolled).length
  const pending = all.filter(e => !e.trial_feedback).length
  const conversionRate = total > 0 ? Math.round(((converted) / (converted + declined)) * 100) : 0

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Trials</div>
          <div className="page-sub">Track trial class outcomes and conversion</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi kpi-lav">
          <div className="kpi-label">Total Trials</div>
          <div className="kpi-value">{total}</div>
        </div>
        <div className="kpi kpi-lime">
          <div className="kpi-label">Converted</div>
          <div className="kpi-value">{converted}</div>
          <div className="kpi-sub">Enrolled after trial</div>
        </div>
        <div className="kpi kpi-red">
          <div className="kpi-label">Declined</div>
          <div className="kpi-value">{declined}</div>
        </div>
        <div className="kpi kpi-amber">
          <div className="kpi-label">Conversion Rate</div>
          <div className="kpi-value">{converted + declined > 0 ? `${conversionRate}%` : '—'}</div>
          <div className="kpi-sub">Of those who responded</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          ['all', `All (${total})`],
          ['converted', `Converted (${converted})`],
          ['declined', `Declined (${declined})`],
          ['pending', `Pending (${pending})`],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setOutcomeFilter(v)}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, border: '1px solid var(--border)',
              background: outcomeFilter === v ? 'var(--lime)' : 'transparent',
              color: outcomeFilter === v ? '#000' : 'var(--grey)',
              cursor: 'pointer',
            }}
          >{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
          <div>No trials yet</div>
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Student</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Class</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Outcome</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>Avg Rating</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => {
                const fb = e.trial_feedback
                const avg = avgRating(fb)
                const isExpanded = expandedId === e.id
                return (
                  <>
                    <tr
                      key={e.id}
                      onClick={() => setExpandedId(isExpanded ? null : e.id)}
                      style={{ borderBottom: (!isExpanded && i < filtered.length - 1) ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div
                          style={{ fontWeight: 600, fontSize: 13, color: 'var(--lime)', cursor: 'pointer' }}
                          onClick={ev => { ev.stopPropagation(); navigate(`/admin/students/${e.student}`) }}
                        >
                          {e.student_name || `Student #${e.student}`}
                        </div>
                        {e.student_detail?.email && (
                          <div style={{ fontSize: 11, color: 'var(--grey)' }}>{e.student_detail.email}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>
                        {e.class_name || e.class_session_detail?.name || '—'}
                        {e.class_session_detail?.season_name && (
                          <div style={{ fontSize: 11, color: 'var(--grey)' }}>{e.class_session_detail.season_name}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--grey)' }}>
                        {e.enrolled_date ? new Date(e.enrolled_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <OutcomeBadge feedback={fb} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {avg ? (
                          <span style={{ fontSize: 13 }}>
                            <span style={{ color: 'var(--lime)', fontWeight: 700 }}>{avg}</span>
                            <span style={{ color: 'var(--grey)', fontSize: 11 }}>/5</span>
                          </span>
                        ) : <span style={{ color: 'var(--grey)', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--grey)' }}>
                        {fb && <span>{isExpanded ? '▲' : '▼'}</span>}
                      </td>
                    </tr>
                    {isExpanded && fb && (
                      <tr key={`${e.id}-detail`} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td colSpan={6} style={{ padding: '0 16px 16px 16px' }}>
                          <div style={{ background: '#111', borderRadius: 10, padding: '16px 20px', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Ratings</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {[
                                  ['Class', fb.class_rating],
                                  ['Instructor', fb.instructor_rating],
                                  ['Facilities', fb.facilities_rating],
                                  ['Structure', fb.structure_rating],
                                ].map(([label, val]) => (
                                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 12, color: 'var(--grey)', width: 70 }}>{label}</span>
                                    <Stars value={val} />
                                  </div>
                                ))}
                              </div>
                            </div>
                            {fb.reason && (
                              <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                                  {fb.enrolled ? 'Notes' : 'Reason for not enrolling'}
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--white)', lineHeight: 1.6, fontStyle: 'italic' }}>
                                  "{fb.reason}"
                                </div>
                              </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 6 }}>
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => navigate(`/admin/students/${e.student}`)}
                              >
                                View student profile →
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
