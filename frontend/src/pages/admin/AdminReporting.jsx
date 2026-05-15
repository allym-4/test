import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { users, classes, payments, attendance as attendanceApi } from '../../api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'

const TABS = ['Overview', 'Enrolments', 'Financial', 'Attendance']

const CHART_COLOURS = ['#ccff00', '#b0a0ff', '#ffaa00', '#ff4444', '#00cfff', '#ff88cc']

export default function AdminReporting() {
  const [tab, setTab] = useState('Overview')

  const { data: studentsData } = useApi(() => users.list({ role: 'student' }))
  const { data: sessionsData } = useApi(() => classes.list())
  const { data: paymentsData } = useApi(() => payments.list())
  const { data: attStats, loading: attLoading } = useApi(() => attendanceApi.stats(), [])

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

  // --- Monthly Revenue (last 6 months) ---
  const monthlyRevenue = (() => {
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        revenue: 0,
      })
    }
    allPayments
      .filter(p => p.payment_type === 'payment' && p.created_at)
      .forEach(p => {
        const d = new Date(p.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const bucket = months.find(m => m.key === key)
        if (bucket) bucket.revenue += parseFloat(p.amount || 0)
      })
    return months
  })()

  // --- Enrolments by class ---
  const enrolmentsByClass = [...sessions]
    .filter(s => s.enrolled_count > 0)
    .sort((a, b) => b.enrolled_count - a.enrolled_count)
    .slice(0, 10)
    .map(s => ({ name: s.name, enrolled: s.enrolled_count }))

  // --- Financial breakdown by type ---
  const financialByType = ['payment', 'charge', 'refund', 'no_show_fee'].map(type => {
    const total = allPayments
      .filter(p => p.payment_type === type)
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0)
    return { type, label: type === 'no_show_fee' ? 'No-show Fee' : type.charAt(0).toUpperCase() + type.slice(1), total }
  }).filter(r => r.total > 0)

  // ── Attendance analytics (from server-aggregated stats endpoint) ──
  const attTotals = attStats?.totals || {}
  const presentCount = attTotals.present || 0
  const absentCount = attTotals.absent || 0
  const noShowCount = attTotals.no_show || 0
  const totalRecords = attTotals.total || 0
  const overallRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0

  const attendanceByClass = attStats?.by_class || []

  // Add a short label to weekly data for the chart x-axis
  const weeklyAttendance = (attStats?.weekly || []).map((w, i) => ({
    ...w,
    label: w.week ? new Date(w.week).toLocaleDateString('default', { month: 'short', day: 'numeric' }) : `W${i + 1}`,
  }))

  const atRiskStudents = attStats?.at_risk || []

  const pieData = [
    { name: 'Present', value: presentCount, fill: '#ccff00' },
    { name: 'Absent', value: absentCount, fill: '#b0a0ff' },
    { name: 'No-show', value: noShowCount, fill: '#ff4444' },
  ].filter(d => d.value > 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Analytics</div>
          <div className="page-sub">Revenue, enrolments and capacity insights</div>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--lime)' : '2px solid transparent',
              color: tab === t ? 'var(--lime)' : 'var(--grey)',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: tab === t ? 600 : 400,
              padding: '8px 16px',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'Overview' && (
        <>
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

          {/* Revenue bar chart */}
          <div className="section" style={{ padding: '20px 24px', marginBottom: 24 }}>
            <div className="section-title" style={{ fontSize: 15, marginBottom: 18 }}>Revenue (last 6 months)</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyRevenue} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <XAxis dataKey="label" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={56} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                  formatter={v => [`$${v.toFixed(2)}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#ccff00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Enrolments by class horizontal bar chart */}
          <div className="section" style={{ padding: '20px 24px', marginBottom: 24 }}>
            <div className="section-title" style={{ fontSize: 15, marginBottom: 18 }}>Enrolments by class</div>
            {enrolmentsByClass.length === 0 ? (
              <div style={{ color: 'var(--grey)', fontSize: 13 }}>No enrolment data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(160, enrolmentsByClass.length * 38)}>
                <BarChart data={enrolmentsByClass} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <XAxis type="number" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#ccc', fontSize: 11 }} axisLine={false} tickLine={false} width={140} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                    formatter={v => [v, 'Enrolled']}
                  />
                  <Bar dataKey="enrolled" radius={[0, 4, 4, 0]}>
                    {enrolmentsByClass.map((_, i) => (
                      <Cell key={i} fill={CHART_COLOURS[i % CHART_COLOURS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}

      {/* ── Enrolments ── */}
      {tab === 'Enrolments' && (
        <div>
          <div className="section-title" style={{ fontSize: 15, marginBottom: 14 }}>Classes by Capacity</div>
          <div className="tbl-section">
            <table>
              <thead>
                <tr><th>Class</th><th>Studio</th><th>Enrolled</th><th>Capacity</th><th>Fill %</th></tr>
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
      )}

      {/* ── Financial ── */}
      {tab === 'Financial' && (
        <div>
          <div className="section-title" style={{ fontSize: 15, marginBottom: 14 }}>Payments by Type</div>
          <div className="tbl-section">
            <table>
              <thead>
                <tr><th>Type</th><th>Count</th><th>Total</th></tr>
              </thead>
              <tbody>
                {['payment', 'charge', 'refund', 'no_show_fee'].map(type => {
                  const items = allPayments.filter(p => p.payment_type === type)
                  const total = items.reduce((s, p) => s + parseFloat(p.amount || 0), 0)
                  const label = type === 'no_show_fee' ? 'No-show Fee' : type.charAt(0).toUpperCase() + type.slice(1)
                  return (
                    <tr key={type}>
                      <td><b>{label}</b></td>
                      <td style={{ color: 'var(--grey)' }}>{items.length}</td>
                      <td style={{ color: type === 'refund' ? 'var(--red)' : type === 'payment' ? 'var(--lime)' : 'var(--white)' }}>
                        ${total.toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="section" style={{ padding: '16px 20px', marginTop: 20 }}>
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
      )}

      {/* ── Attendance ── */}
      {tab === 'Attendance' && (
        attLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        ) : totalRecords === 0 ? (
          <div className="empty-state" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--grey)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>No attendance data yet</div>
            <div style={{ fontSize: 13 }}>Records will appear here once classes start being marked.</div>
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div className="kpi-grid" style={{ marginBottom: 28 }}>
              <div className="kpi kpi-lime">
                <div className="kpi-label">Overall Attendance Rate</div>
                <div className="kpi-value">{overallRate}%</div>
                <div className="kpi-sub">{presentCount} of {totalRecords} classes attended</div>
              </div>
              <div className="kpi kpi-lav">
                <div className="kpi-label">Present</div>
                <div className="kpi-value">{presentCount}</div>
                <div className="kpi-sub">Attended</div>
              </div>
              <div className="kpi" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                <div className="kpi-label">Absent</div>
                <div className="kpi-value">{absentCount}</div>
                <div className="kpi-sub">Marked away</div>
              </div>
              <div className="kpi kpi-red">
                <div className="kpi-label">No-shows</div>
                <div className="kpi-value">{noShowCount}</div>
                <div className="kpi-sub">Unannounced</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              {/* Status breakdown pie */}
              <div className="section" style={{ padding: '20px 24px' }}>
                <div className="section-title" style={{ fontSize: 15, marginBottom: 18 }}>Status Breakdown</div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false} fontSize={11}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Weekly trend */}
              <div className="section" style={{ padding: '20px 24px' }}>
                <div className="section-title" style={{ fontSize: 15, marginBottom: 18 }}>Weekly Trend (last 8 weeks)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyAttendance} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <XAxis dataKey="label" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="present" stackId="a" fill="#ccff00" name="Present" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="absent" stackId="a" fill="#b0a0ff" name="Absent" />
                    <Bar dataKey="no_show" stackId="a" fill="#ff4444" name="No-show" radius={[4, 4, 0, 0]} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#888' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attendance by class */}
            {attendanceByClass.length > 0 && (
              <div className="section" style={{ padding: '20px 24px', marginBottom: 24 }}>
                <div className="section-title" style={{ fontSize: 15, marginBottom: 14 }}>Attendance Rate by Class</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Class', 'Total', 'Present', 'Absent', 'No-show', 'Rate'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceByClass.map((s, i) => (
                      <tr key={i} style={{ borderBottom: i < attendanceByClass.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>{s.name}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--grey)' }}>{s.total}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--lime)' }}>{s.present}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--lav)' }}>{s.absent}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--red)' }}>{s.no_show}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ height: 6, width: 80, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${s.rate}%`, background: s.rate >= 80 ? 'var(--lime)' : s.rate >= 60 ? 'var(--amber)' : 'var(--red)', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 12, color: s.rate >= 80 ? 'var(--lime)' : s.rate >= 60 ? 'var(--amber)' : 'var(--red)', fontWeight: 600 }}>{s.rate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* At-risk students */}
            {atRiskStudents.length > 0 && (
              <div className="section" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div className="section-title" style={{ fontSize: 15 }}>Students at Risk (&lt;60% attendance)</div>
                  <span style={{ fontSize: 11, color: 'var(--grey)' }}>{atRiskStudents.length} student{atRiskStudents.length !== 1 ? 's' : ''}</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Student', 'Classes', 'Attended', 'Rate'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {atRiskStudents.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: i < atRiskStudents.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>{s.name}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--grey)' }}>{s.total}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12 }}>{s.present}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: s.rate < 40 ? 'var(--red)' : 'var(--amber)' }}>{s.rate}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      )}
    </div>
  )
}
