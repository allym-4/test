import { useApi } from '../../hooks/useApi'
import { classes, users, payments, attendance } from '../../api'
import { Link } from 'react-router-dom'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function todayLabel() {
  return new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function AdminDashboard() {
  const { data: sessionsData, loading: loadingSessions } = useApi(() => classes.list({ active: 'true' }))
  const { data: studentsData, loading: loadingStudents } = useApi(() => users.list({ role: 'student' }))
  const { data: paymentsData, loading: loadingPayments } = useApi(() => payments.list())
  const { data: plansData } = useApi(() => payments.plans())

  const sessions = sessionsData?.results || []
  const students = studentsData?.results || []
  const allPayments = paymentsData?.results || []
  const plans = plansData?.results || []

  const todayDow = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  const todaySessions = sessions.filter(s => s.day_of_week === todayDow)

  const thisMonthPaid = allPayments
    .filter(p => {
      const d = new Date(p.created_at)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        && p.payment_type === 'payment'
    })
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

  const activePlans = plans.filter(p => p.status === 'active')

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">{todayLabel()}</div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="kpi-grid">
        <div className="kpi kpi-lime">
          <div className="kpi-label">Active Students</div>
          <div className="kpi-value">{loadingStudents ? '—' : students.length}</div>
          <div className="kpi-sub">Enrolled this season</div>
        </div>
        <div className="kpi kpi-lav">
          <div className="kpi-label">Today's Classes</div>
          <div className="kpi-value">{loadingSessions ? '—' : todaySessions.length}</div>
          <div className="kpi-sub">{todaySessions.reduce((s, c) => s + (c.enrolled_count || 0), 0)} students attending</div>
        </div>
        <Link to="/admin/billing" className="kpi kpi-red" style={{ textDecoration: 'none' }}>
          <div className="kpi-label">Active Plans</div>
          <div className="kpi-value">{activePlans.length}</div>
          <div className="kpi-sub">Payment plans running →</div>
        </Link>
        <div className="kpi kpi-amber">
          <div className="kpi-label">Paid This Month</div>
          <div className="kpi-value">${loadingPayments ? '—' : thisMonthPaid.toFixed(0)}</div>
          <div className="kpi-sub">All payments received</div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>
        {/* Today's classes */}
        <div>
          <div className="section-title" style={{ fontSize: 15, marginBottom: 14 }}>Today's Classes</div>
          {loadingSessions ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
          ) : todaySessions.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>No classes today</div>
          ) : (
            <div className="tbl-section">
              <table>
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Time</th>
                    <th>Studio</th>
                    <th>Enrolled</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {todaySessions.map(s => {
                    const isFull = s.enrolled_count >= s.capacity
                    return (
                      <tr key={s.id} className="clickable">
                        <td><b>{s.name}</b></td>
                        <td style={{ color: 'var(--grey)' }}>{s.start_time?.slice(0, 5)}</td>
                        <td>{s.studio_detail?.name}</td>
                        <td>{s.enrolled_count}/{s.capacity}</td>
                        <td><span className={`tag ${isFull ? 'tag-amber' : 'tag-lime'}`} style={{ fontSize: 10 }}>{isFull ? 'Full' : 'Active'}</span></td>
                        <td>
                          <Link to={`/admin/classes/${s.id}/attendance`}>
                            <button className="btn btn-ghost btn-xs">Register</button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent payments */}
        <div>
          <div className="section-title" style={{ fontSize: 15, marginBottom: 14 }}>Recent Payments</div>
          {loadingPayments ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
          ) : (
            <div className="section" style={{ padding: '14px 18px' }}>
              {allPayments.slice(0, 8).map(p => {
                const isCharge = p.payment_type === 'charge' || p.payment_type === 'no_show_fee'
                const isPayment = p.payment_type === 'payment'
                return (
                  <div key={p.id} className="feed-item">
                    <div className={`feed-dot ${isPayment ? 'feed-dot-lime' : isCharge ? 'feed-dot-red' : 'feed-dot-lav'}`} />
                    <div style={{ flex: 1 }}>
                      <div className="feed-text">
                        <b>{p.student_name || 'Student'}</b> — {p.description || p.payment_type}
                      </div>
                      <div className="feed-time">
                        {new Date(p.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isPayment ? 'var(--lime)' : isCharge ? 'var(--red)' : 'var(--grey)', flexShrink: 0 }}>
                      {isCharge ? '-' : '+'}${Math.abs(parseFloat(p.amount || 0)).toFixed(0)}
                    </div>
                  </div>
                )
              })}
              {allPayments.length === 0 && <div style={{ color: 'var(--grey)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No payments yet</div>}
            </div>
          )}
        </div>
      </div>

      {/* All active classes summary */}
      <div className="section-title" style={{ fontSize: 15, marginBottom: 14 }}>All Active Classes</div>
      {loadingSessions ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
      ) : (
        <div className="tbl-section">
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Time</th>
                <th>Class</th>
                <th>Studio</th>
                <th>Enrolled</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...sessions].sort((a, b) => a.day_of_week - b.day_of_week || (a.start_time || '').localeCompare(b.start_time || '')).map(s => {
                const isFull = s.enrolled_count >= s.capacity
                return (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--grey)' }}>{DAYS[s.day_of_week]}</td>
                    <td style={{ color: 'var(--grey)' }}>{s.start_time?.slice(0, 5)}</td>
                    <td><b>{s.name}</b></td>
                    <td>{s.studio_detail?.name}</td>
                    <td>{s.enrolled_count}/{s.capacity}</td>
                    <td><span className={`tag ${isFull ? 'tag-amber' : 'tag-lime'}`} style={{ fontSize: 10 }}>{isFull ? 'Full' : 'Active'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
