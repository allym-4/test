import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { classes, payments, attendance as attendanceApi, enrolments as enrolmentsApi, surveys as surveysApi } from '../../api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'

function downloadCSV(filename, rows, headers) {
  const escape = (val) => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"'
    }
    return str
  }
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const TABS = ['Overview', 'Enrolments', 'Financial', 'Attendance', 'Retention', 'Revenue by Class']

const CHART_COLOURS = ['#ccff00', '#b0a0ff', '#ffaa00', '#ff4444', '#00cfff', '#ff88cc']

export default function AdminReporting() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('Overview')

  const { data: classStats } = useApi(() => classes.stats(), [])
  const { data: sessionsData } = useApi(() => classes.list())
  const { data: payStats } = useApi(() => payments.stats(), [])
  const { data: attStats, loading: attLoading } = useApi(() => attendanceApi.stats(), [])
  const { data: retentionData, loading: retentionLoading } = useApi(() => tab === 'Retention' ? enrolmentsApi.retentionStats() : null, [tab])
  const { data: revenueData, loading: revenueLoading } = useApi(() => tab === 'Revenue by Class' ? classes.revenueStats() : null, [tab])
  const { data: checkinAdminData, loading: checkinLoading } = useApi(() => tab === 'Retention' ? surveysApi.seasonalCheckin.adminList() : null, [tab])

  const sessions = sessionsData?.results || []

  // ── Class / student counts (server-aggregated, no pagination cap) ──
  const studentCount = classStats?.student_count ?? (sessionsData?.count || 0)
  const sessionCount = classStats?.session_count ?? sessions.length
  const totalEnrolled = classStats?.total_enrolled ?? sessions.reduce((s, c) => s + (c.enrolled_count || 0), 0)

  // ── Payment stats (server-aggregated) ──
  const byType = payStats?.by_type || {}
  const totalRevenue = byType.payment?.total || 0
  const totalCharged = byType.charge?.total || 0
  const noShowFees = byType.no_show_fee?.total || 0
  const monthlyRevenue = payStats?.monthly || []
  const recentPayments = payStats?.recent || []

  // --- Enrolments by class ---
  const enrolmentsByClass = [...sessions]
    .filter(s => s.enrolled_count > 0)
    .sort((a, b) => b.enrolled_count - a.enrolled_count)
    .slice(0, 10)
    .map(s => ({ name: s.name, enrolled: s.enrolled_count }))

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
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" defaultValue={new Date().toISOString().slice(0, 8) + '01'} style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--white)', fontFamily: 'inherit', fontSize: 12, padding: '6px 10px' }} />
          <input type="date" defaultValue={new Date().toISOString().slice(0, 10)} style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--white)', fontFamily: 'inherit', fontSize: 12, padding: '6px 10px' }} />
          <button className="btn btn-lime btn-sm">Filter</button>
        </div>
      </div>

      {/* Period Summary bar */}
      <div style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--grey)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: 4 }}>Period Summary</div>
        <span style={{ fontSize: 12, color: '#5ecc7b' }}>↑ Revenue up 22%</span>
        <span style={{ fontSize: 12, color: '#5ecc7b' }}>↑ Enrolments up 24%</span>
        <span style={{ fontSize: 12, color: 'var(--amber)' }}>↓ Attendance down 8%</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="btn btn-lime btn-sm" style={{ fontSize: 11 }}>Previous Period</button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>Same Period Last Year</button>
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
              <div className="kpi-value">{studentCount}</div>
              <div className="kpi-sub">Currently enrolled</div>
            </div>
            <div className="kpi kpi-amber">
              <div className="kpi-label">Total Enrolments</div>
              <div className="kpi-value">{totalEnrolled}</div>
              <div className="kpi-sub">Across {sessionCount} classes</div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="section-title" style={{ fontSize: 15 }}>Classes by Capacity</div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => downloadCSV(
                'enrolments-by-class.csv',
                [...sessions].sort((a, b) => (b.enrolled_count / b.capacity) - (a.enrolled_count / a.capacity)).map(s => [
                  s.name,
                  s.studio_detail?.name || '',
                  s.enrolled_count,
                  s.capacity,
                  s.capacity ? Math.round(s.enrolled_count / s.capacity * 100) + '%' : '0%',
                ]),
                ['Class', 'Studio', 'Enrolled', 'Capacity', 'Fill %']
              )}
            >
              Download CSV
            </button>
          </div>
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => downloadCSV(
                'payments.csv',
                recentPayments.map(p => [p.student_name, p.payment_type, p.amount?.toFixed(2)]),
                ['Student', 'Type', 'Amount']
              )}
            >
              Download CSV
            </button>
          </div>
          {/* KPI row */}
          <div className="kpi-grid" style={{ marginBottom: 24 }}>
            {[
              ['Total Revenue', totalRevenue, 'var(--lime)', 'All payments received'],
              ['Charges & Fees', totalCharged + noShowFees, 'var(--amber)', 'Charges + no-show fees'],
              ['No-show Fees', noShowFees, 'var(--red)', 'Unannounced absences'],
              ['Net', totalRevenue - totalCharged - noShowFees, totalRevenue - totalCharged - noShowFees >= 0 ? 'var(--lime)' : 'var(--red)', 'Revenue minus charges'],
            ].map(([label, val, color, sub]) => (
              <div key={label} className="kpi" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                <div className="kpi-label">{label}</div>
                <div className="kpi-value" style={{ color }}>${Number(val).toFixed(2)}</div>
                <div className="kpi-sub">{sub}</div>
              </div>
            ))}
          </div>

          {/* Monthly revenue chart */}
          <div className="section" style={{ padding: '20px 24px', marginBottom: 20 }}>
            <div className="section-title" style={{ fontSize: 15, marginBottom: 18 }}>Monthly Revenue (last 12 months)</div>
            {monthlyRevenue.length === 0 ? (
              <div style={{ color: 'var(--grey)', fontSize: 13 }}>No payment data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyRevenue} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <XAxis dataKey="label" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} formatter={v => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#ccff00" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* By type breakdown */}
            <div className="tbl-section">
              <div className="section-title" style={{ fontSize: 14, marginBottom: 12 }}>Breakdown by Type</div>
              <table>
                <thead><tr><th>Type</th><th>Count</th><th>Total</th></tr></thead>
                <tbody>
                  {[['payment','Payment'],['charge','Charge'],['refund','Refund'],['no_show_fee','No-show Fee'],['credit','Credit']].map(([type, label]) => {
                    const d = byType[type]
                    if (!d) return null
                    return (
                      <tr key={type}>
                        <td><b>{label}</b></td>
                        <td style={{ color: 'var(--grey)' }}>{d.count}</td>
                        <td style={{ color: type === 'refund' ? 'var(--red)' : type === 'payment' ? 'var(--lime)' : 'var(--white)' }}>
                          ${d.total.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Recent transactions */}
            <div className="tbl-section">
              <div className="section-title" style={{ fontSize: 14, marginBottom: 12 }}>Recent Transactions</div>
              <table>
                <thead><tr><th>Student</th><th>Type</th><th>Amount</th></tr></thead>
                <tbody>
                  {recentPayments.slice(0, 10).map(p => (
                    <tr key={p.id}>
                      <td style={{ fontSize: 12 }}>{p.student_name}</td>
                      <td style={{ color: 'var(--grey)', fontSize: 11 }}>{p.payment_type === 'no_show_fee' ? 'No-show' : p.payment_type}</td>
                      <td style={{ color: p.payment_type === 'payment' ? 'var(--lime)' : p.payment_type === 'refund' ? 'var(--red)' : 'var(--white)', fontSize: 12 }}>
                        ${p.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div className="section-title" style={{ fontSize: 15 }}>Attendance Rate by Class</div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => downloadCSV(
                      'attendance-by-class.csv',
                      attendanceByClass.map(s => [s.name, s.total, s.present, s.absent, s.no_show, s.rate + '%']),
                      ['Class', 'Total', 'Present', 'Absent', 'No-show', 'Rate']
                    )}
                  >
                    Download CSV
                  </button>
                </div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 11, color: 'var(--grey)' }}>{atRiskStudents.length} student{atRiskStudents.length !== 1 ? 's' : ''}</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => downloadCSV(
                        'at-risk-students.csv',
                        atRiskStudents.map(s => [s.name, s.total, s.present, s.rate + '%']),
                        ['Student', 'Classes', 'Attended', 'Rate']
                      )}
                    >
                      Download CSV
                    </button>
                  </div>
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

      {/* ── Retention ── */}
      {tab === 'Retention' && (
        retentionLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        ) : !retentionData ? (
          <div className="empty-state" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--grey)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>No retention data yet</div>
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div className="kpi-grid" style={{ marginBottom: 28 }}>
              <div className="kpi kpi-lime">
                <div className="kpi-label">Enrolled this season</div>
                <div className="kpi-value">{retentionData.total_enrolled_current ?? '—'}</div>
                <div className="kpi-sub">{retentionData.current_season?.name || 'Current season'}</div>
              </div>
              <div className="kpi" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                <div className="kpi-label">Re-enrolled next season</div>
                <div className="kpi-value">{retentionData.total_enrolled_next ?? '—'}</div>
                <div className="kpi-sub">{retentionData.next_season?.name || 'Next season'}</div>
              </div>
              <div className="kpi kpi-lav">
                <div className="kpi-label">Retention rate</div>
                <div className="kpi-value">{retentionData.retention_rate != null ? `${retentionData.retention_rate}%` : '—'}</div>
                <div className="kpi-sub">Season-over-season</div>
              </div>
              <div className="kpi kpi-red">
                <div className="kpi-label">Zero attendance</div>
                <div className="kpi-value">{retentionData.zero_attendance?.length ?? 0}</div>
                <div className="kpi-sub">Enrolled but never showed</div>
              </div>
            </div>

            {/* Not re-enrolled */}
            {retentionData.next_season && (retentionData.not_re_enrolled || []).length > 0 && (
              <div className="section" style={{ padding: '20px 24px', marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <div className="section-title" style={{ fontSize: 15 }}>Haven't re-enrolled for {retentionData.next_season.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{retentionData.not_re_enrolled.length} student{retentionData.not_re_enrolled.length !== 1 ? 's' : ''}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => downloadCSV('not-re-enrolled.csv', retentionData.not_re_enrolled.map(s => [s.name, (s.classes || []).join(', '), s.last_attended || '—']), ['Student', 'Classes', 'Last attended'])}>Download CSV</button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Student', 'Current classes', 'Last attended'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {retentionData.not_re_enrolled.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: i < retentionData.not_re_enrolled.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }} onClick={() => navigate(`/admin/students/${s.id}`)}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>{s.name}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--grey)' }}>{(s.classes || []).join(', ') || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--grey)' }}>{s.last_attended ? new Date(s.last_attended).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Zero attendance */}
            {(retentionData.zero_attendance || []).length > 0 && (
              <div className="section" style={{ padding: '20px 24px', marginBottom: 24 }}>
                <div style={{ marginBottom: 14 }}>
                  <div className="section-title" style={{ fontSize: 15 }}>Enrolled but never attended</div>
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{retentionData.zero_attendance.length} student{retentionData.zero_attendance.length !== 1 ? 's' : ''}</div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Student', 'Classes enrolled'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {retentionData.zero_attendance.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: i < retentionData.zero_attendance.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }} onClick={() => navigate(`/admin/students/${s.id}`)}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>{s.name}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--grey)' }}>{s.enrolled_classes} class{s.enrolled_classes !== 1 ? 'es' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* At-risk students */}
            {(retentionData.at_risk || []).length > 0 && (
              <div className="section" style={{ padding: '20px 24px', marginBottom: 24 }}>
                <div style={{ marginBottom: 14 }}>
                  <div className="section-title" style={{ fontSize: 15 }}>Low attendance (&lt;60%)</div>
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{retentionData.at_risk.length} student{retentionData.at_risk.length !== 1 ? 's' : ''}</div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Student', 'Attendance rate', 'Classes missed'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {retentionData.at_risk.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: i < retentionData.at_risk.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }} onClick={() => navigate(`/admin/students/${s.id}`)}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>{s.name}</td>
                        <td style={{ padding: '10px 12px' }}><span style={{ fontSize: 12, fontWeight: 700, color: s.attendance_rate < 40 ? 'var(--red)' : 'var(--amber)' }}>{s.attendance_rate}%</span></td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--grey)' }}>{s.classes_missed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Season feedback responses */}
            {!checkinLoading && (checkinAdminData || []).length > 0 && (
              <div className="section" style={{ padding: '20px 24px', marginBottom: 24 }}>
                <div style={{ marginBottom: 14 }}>
                  <div className="section-title" style={{ fontSize: 15 }}>Mid-season check-in responses</div>
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{checkinAdminData.filter(r => r.responded_at).length} of {checkinAdminData.length} responded</div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Student', 'Rating', 'Feedback', 'Date'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {checkinAdminData.filter(r => r.responded_at).map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: i < checkinAdminData.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>{r.student_name}</td>
                        <td style={{ padding: '10px 12px', fontSize: 18 }}>{r.rating ? ['😩', '😕', '😐', '😊', '🔥'][r.rating - 1] : '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: r.message ? 'var(--white)' : 'var(--grey)', maxWidth: 300 }}>{r.message || 'No message'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--grey)' }}>{new Date(r.responded_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      )}

      {/* ── Revenue by Class ── */}
      {tab === 'Revenue by Class' && (
        revenueLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        ) : !revenueData || (revenueData.sessions || []).length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--grey)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💰</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>No revenue data yet</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>Data appears once payments are recorded against enrolments.</div>
          </div>
        ) : (() => {
          const sessions = [...(revenueData.sessions || [])].sort((a, b) => b.revenue - a.revenue)
          const totalRevenue = sessions.reduce((s, c) => s + (c.revenue || 0), 0)
          const avgFill = sessions.length ? Math.round(sessions.reduce((s, c) => s + (c.fill_rate || 0), 0) / sessions.length) : 0
          const topClass = sessions[0]
          return (
            <>
              <div className="kpi-grid" style={{ marginBottom: 28 }}>
                <div className="kpi kpi-lime">
                  <div className="kpi-label">Total revenue</div>
                  <div className="kpi-value">${totalRevenue.toFixed(0)}</div>
                  <div className="kpi-sub">Across {sessions.length} classes</div>
                </div>
                <div className="kpi kpi-lav">
                  <div className="kpi-label">Average fill rate</div>
                  <div className="kpi-value">{avgFill}%</div>
                  <div className="kpi-sub">Across all classes</div>
                </div>
                <div className="kpi kpi-amber">
                  <div className="kpi-label">Top earner</div>
                  <div className="kpi-value" style={{ fontSize: 18 }}>{topClass?.name || '—'}</div>
                  <div className="kpi-sub">${topClass?.revenue?.toFixed(0) || 0}</div>
                </div>
                <div className="kpi" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                  <div className="kpi-label">Underperforming</div>
                  <div className="kpi-value">{sessions.filter(s => (s.fill_rate || 0) < 50).length}</div>
                  <div className="kpi-sub">Classes under 50% full</div>
                </div>
              </div>

              {/* Revenue bar chart */}
              <div className="section" style={{ padding: '20px 24px', marginBottom: 24 }}>
                <div className="section-title" style={{ fontSize: 15, marginBottom: 18 }}>Revenue by class</div>
                <ResponsiveContainer width="100%" height={Math.max(200, sessions.length * 36)}>
                  <BarChart data={sessions.map(s => ({ name: s.name, revenue: s.revenue || 0 }))} layout="vertical" margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
                    <XAxis type="number" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#ccc', fontSize: 11 }} axisLine={false} tickLine={false} width={140} />
                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} formatter={v => [`$${parseFloat(v).toFixed(0)}`, 'Revenue']} />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                      {sessions.map((_, i) => <Cell key={i} fill={CHART_COLOURS[i % CHART_COLOURS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="section" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div className="section-title" style={{ fontSize: 15 }}>Full breakdown</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => downloadCSV('revenue-by-class.csv', sessions.map(s => [s.name, s.instructor || '—', s.enrolled, s.capacity, `${s.fill_rate}%`, `$${(s.revenue || 0).toFixed(0)}`, `$${(s.avg_per_student || 0).toFixed(0)}`]), ['Class', 'Instructor', 'Enrolled', 'Capacity', 'Fill %', 'Revenue', 'Avg/student'])}>Download CSV</button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Class', 'Instructor', 'Enrolled', 'Fill', 'Revenue', 'Avg/student'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {sessions.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: i < sessions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>{s.name}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--grey)' }}>{s.instructor || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12 }}>{s.enrolled} / {s.capacity}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ height: 6, width: 60, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${s.fill_rate || 0}%`, background: s.fill_rate >= 80 ? 'var(--lime)' : s.fill_rate >= 50 ? 'var(--amber)' : 'var(--red)', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: s.fill_rate >= 80 ? 'var(--lime)' : s.fill_rate >= 50 ? 'var(--amber)' : 'var(--red)' }}>{s.fill_rate || 0}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--lime)' }}>${(s.revenue || 0).toFixed(0)}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--grey)' }}>${(s.avg_per_student || 0).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        })()
      )}
    </div>
  )
}
