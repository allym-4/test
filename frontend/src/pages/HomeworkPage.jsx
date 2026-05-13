import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { homework } from '../api'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const AVATAR_COLORS = ['#b0a0ff', '#ccff00', '#ffaa00', '#ff88aa', '#44ffcc', '#ffcc88', '#b0f0b0', '#9ac4ff', '#ffb3de', '#44ff99']
function avatarColor(name) {
  let h = 0
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

export default function HomeworkPage() {
  const { data: activeData, loading: loadingActive } = useApi(() => homework.list({ status: 'active' }))
  const { data: allData, loading: loadingAll } = useApi(() => homework.list())
  const { data: subsData, loading: loadingSubs } = useApi(() => homework.submissions())
  const [tab, setTab] = useState('active')

  const active = activeData?.results || []
  const all = allData?.results || []
  const submissions = subsData?.results || []

  const pendingReview = submissions.filter(s => !s.reviewed)
  const reviewed = submissions.filter(s => s.reviewed)

  function HwCard({ a }) {
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
            </div>
          </div>
          <span className={`tag ${tagCls}`} style={{ fontSize: 10, flexShrink: 0 }}>{tagLabel}</span>
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

  const loading = tab === 'active' ? loadingActive : tab === 'submitted' ? loadingSubs : loadingAll

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Homework</div>
          <div className="page-sub">Assignments for your classes</div>
        </div>
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
                  <button className="btn btn-lime btn-xs">Review</button>
                </div>
              </div>
            ))}
            {reviewed.map(sub => (
              <div key={sub.id} className="list-row" style={{ gap: 10, background: '#0a0f00' }}>
                <div className="avatar" style={{ background: avatarColor(sub.student_name || ''), flexShrink: 0 }}>
                  {sub.student_name?.[0] || '?'}
                </div>
                <div className="list-body">
                  <div className="list-title">{sub.student_name}</div>
                  <div className="list-sub">{sub.assignment_title} · {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''}</div>
                </div>
                <div className="list-end">
                  <span className="tag tag-lime" style={{ fontSize: 10 }}>Reviewed</span>
                  <button className="btn btn-ghost btn-xs">View</button>
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
            (tab === 'active' ? active : all).map(a => <HwCard key={a.id} a={a} />)
          )}
        </div>
      )}
    </div>
  )
}
