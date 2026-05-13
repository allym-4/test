import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { homework } from '../api'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function HomeworkPage() {
  const { data: activeData, loading: loadingActive } = useApi(() => homework.list({ status: 'active' }))
  const { data: allData, loading: loadingAll } = useApi(() => homework.list())
  const [tab, setTab] = useState('active')

  const active = activeData?.results || []
  const all = allData?.results || []
  const shown = tab === 'active' ? active : all

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Homework</div>
          <div className="page-sub">{active.length} active assignments</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {['active', 'all'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t ? 'var(--lime)' : 'transparent'}`,
              color: tab === t ? 'var(--white)' : 'var(--grey)',
              padding: '8px 16px', fontSize: 13, fontWeight: 500,
              marginBottom: -1, cursor: 'pointer', textTransform: 'capitalize',
              transition: 'color 0.12s',
            }}
          >
            {t === 'active' ? `Active (${active.length})` : `All (${all.length})`}
          </button>
        ))}
      </div>

      {(tab === 'active' ? loadingActive : loadingAll) ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><div className="spinner" /></div>
      ) : shown.length === 0 ? (
        <div className="empty-state">No homework assignments</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shown.map(a => {
            const pct = a.enrolled_count ? Math.round(a.submission_count / a.enrolled_count * 100) : 0
            const s = a.class_session_detail
            return (
              <div key={a.id} className="card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 3 }}>
                      {s?.name} — {DAYS[s?.day_of_week]} {s?.start_time?.slice(0, 5)} · {s?.studio_detail?.name} · Assigned {new Date(a.assigned_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <span className={`tag ${a.status === 'active' ? 'tag-lime' : 'tag-grey'}`} style={{ fontSize: 10, flexShrink: 0 }}>
                    {a.status === 'active' ? 'Active' : 'Closed'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--grey)', flexShrink: 0 }}>{a.submission_count}/{a.enrolled_count} submitted</span>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--lime)' : pct > 50 ? 'var(--amber)' : 'var(--grey)' }} /></div>
                  <span style={{ fontSize: 12, color: 'var(--grey)', flexShrink: 0, width: 32, textAlign: 'right' }}>{pct}%</span>
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
          })}
        </div>
      )}
    </div>
  )
}

