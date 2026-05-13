import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { classes, enrolments, payments } from '../../api'

export default function AdminSeasons() {
  const { data: sessionsData } = useApi(() => classes.list())
  const { data: enrolData } = useApi(() => enrolments.list())
  const { data: paymentsData } = useApi(() => payments.list())

  const sessions = sessionsData?.results || []
  const allEnrolments = enrolData?.results || []
  const allPayments = paymentsData?.results || []

  const totalRevenue = allPayments
    .filter(p => p.payment_type === 'payment')
    .reduce((s, p) => s + parseFloat(p.amount || 0), 0)

  const activeEnrolments = allEnrolments.filter(e => e.status === 'active').length

  const SEASONS = [
    { id: 1, name: 'Season 1', status: 'completed', start: '3 Feb 2025', end: '25 Mar 2025', enrolled: 72, revenue: 8640, classes: 18 },
    { id: 2, name: 'Season 2', status: 'completed', start: '7 Apr 2025', end: '26 May 2025', enrolled: 80, revenue: 9200, classes: 20 },
    { id: 3, name: 'Season 3', status: 'active', start: '11 May 2025', end: '5 Jul 2025', enrolled: activeEnrolments || 94, revenue: totalRevenue || 4320, classes: sessions.length || 22 },
    { id: 4, name: 'Season 4', status: 'upcoming', start: '11 Aug 2025', end: '26 Sep 2025', enrolled: 0, revenue: null, classes: 22 },
  ]

  const [editId, setEditId] = useState(null)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Seasons</div>
          <div className="page-sub">Manage season schedules and enrolment windows</div>
        </div>
        <button className="btn btn-lime btn-sm">+ New Season</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {SEASONS.map(season => {
          const isActive = season.status === 'active'
          const isUpcoming = season.status === 'upcoming'
          const statusCls = isActive ? 'tag-lime' : isUpcoming ? 'tag-lav' : 'tag-grey'
          return (
            <div key={season.id} style={{
              background: 'var(--card)',
              border: `1px solid ${isActive ? 'rgba(204,255,0,0.4)' : 'var(--border)'}`,
              borderRadius: 14,
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>{season.name}</div>
                <span className={`tag ${statusCls}`} style={{ fontSize: 10 }}>
                  {season.status.charAt(0).toUpperCase() + season.status.slice(1)}
                </span>
              </div>

              <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                {season.start} → {season.end}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: 'var(--lav)' }}>{season.enrolled}</div>
                  <div style={{ fontSize: 10, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Enrolled</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: 'var(--lime)' }}>
                    {season.revenue !== null ? `$${(season.revenue / 1000).toFixed(1)}k` : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Revenue</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: 'var(--white)' }}>{season.classes}</div>
                  <div style={{ fontSize: 10, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Classes</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-xs" onClick={() => setEditId(season.id)}>Edit Season</button>
                {isActive && <button className="btn btn-lime btn-xs">View Live</button>}
                {isUpcoming && <button className="btn btn-lav btn-xs" style={{ background: 'rgba(176,160,255,0.15)', color: 'var(--lav)', border: '1px solid rgba(176,160,255,0.3)' }}>Open Enrolments</button>}
              </div>
            </div>
          )
        })}
      </div>

      {editId && (
        <div className="sd-overlay" onClick={e => e.target === e.currentTarget && setEditId(null)}>
          <div className="sd-modal" style={{ maxWidth: 480 }}>
            <div className="sd-header">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Edit Season {editId}</div>
              <button className="modal-close-btn" onClick={() => setEditId(null)}>✕</button>
            </div>
            <div className="sd-body">
              <div className="field"><label>Season Name</label><input defaultValue={`Season ${editId}`} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field"><label>Start Date</label><input type="date" /></div>
                <div className="field"><label>End Date</label><input type="date" /></div>
              </div>
              <div className="field"><label>Status</label>
                <select><option>Active</option><option>Upcoming</option><option>Completed</option></select>
              </div>
              <div className="field"><label>Notes</label><textarea rows={3} /></div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                <button className="btn btn-lime btn-sm" onClick={() => setEditId(null)}>Save Season</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
