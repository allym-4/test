import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { enrolments } from '../../api'

const TYPE_TAG = {
  season:    'tag-lav',
  trial:     'tag-lav',
  casual:    'tag-grey',
  workshop:  'tag-amber',
  catchup:   'tag-grey',
  waitlist:  'tag-amber',
}

const STATUS_TAG = {
  active:    'tag-lime',
  waitlist:  'tag-amber',
  cancelled: 'tag-red',
  completed: 'tag-grey',
}

export default function AdminBookings() {
  const { data, loading } = useApi(() => enrolments.list())
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const all = data?.results || []

  const filtered = all.filter(e => {
    const name = e.student_detail?.display_name?.toLowerCase() || ''
    const session = e.class_session_detail?.name?.toLowerCase() || ''
    const matchSearch = !search || name.includes(search.toLowerCase()) || session.includes(search.toLowerCase())
    const matchType = !filterType || e.enrolment_type === filterType
    const matchStatus = !filterStatus || e.status === filterStatus
    return matchSearch && matchType && matchStatus
  })

  const typeCounts = {}
  for (const e of all) typeCounts[e.enrolment_type] = (typeCounts[e.enrolment_type] || 0) + 1

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Bookings</div>
          <div className="page-sub">{all.length} total enrolments</div>
        </div>
        <button className="btn btn-lime btn-sm">+ Add Booking</button>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {[
          ['Total', all.length, 'kpi-lime'],
          ['Active', all.filter(e => e.status === 'active').length, 'kpi-lav'],
          ['Waitlist', all.filter(e => e.status === 'waitlist').length, 'kpi-amber'],
          ['Cancelled', all.filter(e => e.status === 'cancelled').length, 'kpi-red'],
        ].map(([label, val, cls]) => (
          <div key={label} className={`kpi ${cls}`}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{val}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search student or class…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '8px 12px', fontSize: 13, outline: 'none', width: 260 }}
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '7px 12px', fontSize: 13, outline: 'none' }}
        >
          <option value="">All Types</option>
          <option value="season">Season</option>
          <option value="trial">Trial</option>
          <option value="casual">Casual</option>
          <option value="workshop">Workshop</option>
          <option value="waitlist">Waitlist</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '7px 12px', fontSize: 13, outline: 'none' }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="waitlist">Waitlist</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : (
        <div className="tbl-section">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Studio</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const s = e.class_session_detail
                const st = e.student_detail
                const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
                return (
                  <tr key={e.id} className="clickable">
                    <td>
                      <b>{st?.display_name || `Student ${e.student}`}</b>
                      {st?.email && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{st.email}</div>}
                    </td>
                    <td>
                      <b>{s?.name}</b>
                      <div style={{ fontSize: 11, color: 'var(--grey)' }}>{DAYS[s?.day_of_week]} {s?.start_time?.slice(0,5)}</div>
                    </td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{s?.studio_detail?.name}</td>
                    <td>
                      <span className={`tag ${TYPE_TAG[e.enrolment_type] || 'tag-grey'}`} style={{ fontSize: 10 }}>
                        {e.enrolment_type}
                      </span>
                    </td>
                    <td>
                      <span className={`tag ${STATUS_TAG[e.status] || 'tag-grey'}`} style={{ fontSize: 10 }}>
                        {e.status}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-ghost btn-xs" style={{ marginRight: 4 }}>View</button>
                      <button className="btn btn-ghost btn-xs">Cancel</button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--grey)', padding: '32px 0' }}>No bookings found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
