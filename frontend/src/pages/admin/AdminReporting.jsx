import { useApi } from '../../hooks/useApi'
import { users, classes, payments } from '../../api'

export default function AdminReporting() {
  const { data: studentsData } = useApi(() => users.list({ role: 'student' }))
  const { data: sessionsData } = useApi(() => classes.list())
  const { data: paymentsData } = useApi(() => payments.list())

  const students = studentsData?.results || []
  const sessions = sessionsData?.results || []
  const allPayments = paymentsData?.results || []

  const totalRevenue = allPayments
    .filter(p => p.payment_type === 'payment')
    .reduce((s, p) => s + parseFloat(p.amount || 0), 0)

  const totalCharged = allPayments
    .filter(p => p.payment_type === 'charge')
    .reduce((s, p) => s + parseFloat(p.amount || 0), 0)

  const noShowFees = allPayments
    .filter(p => p.payment_type === 'no_show_fee')
    .reduce((s, p) => s + parseFloat(p.amount || 0), 0)

  const totalEnrolled = sessions.reduce((s, c) => s + (c.enrolled_count || 0), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Analytics</div>
          <div className="page-sub">Revenue, enrolments and capacity insights</div>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        <div className="kpi kpi-lime">
          <div className="kpi-label">Total Revenue</div>
          <div className="kpi-value">${totalRevenue.toFixed(0)}</div>
          <div className="kpi-sub">All time payments received</div>
        </div>
        <div className="kpi kpi-lav">
          <div className="kpi-label">Active Students</div>
          <div className="kpi-value">{students.length}</div>
          <div className="kpi-sub">Currently enrolled</div>
        </div>
        <div className="kpi kpi-amber">
          <div className="kpi-label">Total Enrolments</div>
          <div className="kpi-value">{totalEnrolled}</div>
          <div className="kpi-sub">Across {sessions.length} classes</div>
        </div>
        <div className="kpi kpi-red">
          <div className="kpi-label">No-show Fees</div>
          <div className="kpi-value">${noShowFees.toFixed(0)}</div>
          <div className="kpi-sub">Total charged</div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        <div>
          <div className="section-title" style={{ fontSize: 15, marginBottom: 14 }}>Classes by Capacity</div>
          <div className="tbl-section">
            <table>
              <thead>
                <tr><th>Class</th><th>Studio</th><th>Enrolled</th><th>Capacity</th><th>%</th></tr>
              </thead>
              <tbody>
                {[...sessions].sort((a, b) => (b.enrolled_count / b.capacity) - (a.enrolled_count / a.capacity)).map(s => {
                  const pct = s.capacity ? Math.round(s.enrolled_count / s.capacity * 100) : 0
                  return (
                    <tr key={s.id}>
                      <td><b>{s.name}</b></td>
                      <td style={{ color: 'var(--grey)', fontSize: 12 }}>{s.studio_detail?.name}</td>
                      <td>{s.enrolled_count}</td>
                      <td style={{ color: 'var(--grey)' }}>{s.capacity}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar" style={{ width: 60 }}><div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--amber)' : 'var(--lime)' }} /></div>
                          <span style={{ fontSize: 11, color: pct >= 100 ? 'var(--amber)' : 'var(--grey)' }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="section-title" style={{ fontSize: 15, marginBottom: 14 }}>Payment Summary</div>
          <div className="section" style={{ padding: '16px 20px' }}>
            {[
              ['Total Revenue', totalRevenue, 'var(--lime)'],
              ['Total Charged', totalCharged, 'var(--white)'],
              ['No-show Fees', noShowFees, 'var(--red)'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                <span style={{ fontSize: 13, color: 'var(--grey)' }}>{label}</span>
                <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, color }}>${val.toFixed(2)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
              <span style={{ fontSize: 13, color: 'var(--grey)' }}>Outstanding</span>
              <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, color: 'var(--red)' }}>
                ${(totalCharged + noShowFees - totalRevenue > 0 ? totalCharged + noShowFees - totalRevenue : 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
