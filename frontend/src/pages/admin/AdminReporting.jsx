import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { classes, payments, attendance as attendanceApi } from '../../api'
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

const TABS = ['Overview', 'Enrolments', 'Financial', 'Attendance']

const CHART_COLOURS = ['#ccff00', '#b0a0ff', '#ffaa00', '#ff4444', '#00cfff', '#ff88cc']

export default function AdminReporting() {
  const [tab, setTab] = useState('Overview')

  const { data: classStats } = useApi(() => classes.stats(), [])
  const { data: sessionsData } = useApi(() => classes.list())
  const { data: payStats } = useApi(() => payments.stats(), [])
  const { data: attStats, loading: attLoading } = useApi(() => attendanceApi.stats(), [])

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
    </div>
  )
}
