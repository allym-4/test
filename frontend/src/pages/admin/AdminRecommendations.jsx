import { useApi } from '../../hooks/useApi'
import { users, payments, attendance } from '../../api'

export default function AdminRecommendations() {
  const { data: studentsData, loading: loadingStudents } = useApi(() => users.list({ role: 'student' }))
  const { data: paymentsData } = useApi(() => payments.list())
  const { data: attData } = useApi(() => attendance.list())

  const students = studentsData?.results || []
  const allPayments = paymentsData?.results || []
  const allAtt = attData?.results || []

  // Compute recommendations from real data
  const recs = []

  // No-show pattern (students with 2+ no-shows)
  const noShowCount = {}
  for (const a of allAtt) {
    if (a.status === 'no_show') noShowCount[a.student] = (noShowCount[a.student] || 0) + 1
  }
  for (const [studentId, count] of Object.entries(noShowCount)) {
    if (count >= 2) {
      const student = students.find(s => s.id === parseInt(studentId))
      if (student) recs.push({
        id: `ns-${studentId}`,
        urgency: 'high',
        icon: '⚠️',
        title: `${count} no-shows — chase needed`,
        body: `${student.display_name} has missed ${count} classes without cancelling. Consider reaching out.`,
        action: 'Chase',
        student: student.display_name,
      })
    }
  }

  // Outstanding balances (students owing money from payment data)
  const balanceByStudent = {}
  for (const p of allPayments) {
    if (!balanceByStudent[p.student]) balanceByStudent[p.student] = 0
    if (p.payment_type === 'payment' || p.payment_type === 'credit') {
      balanceByStudent[p.student] += parseFloat(p.amount || 0)
    } else if (p.payment_type === 'charge' || p.payment_type === 'no_show_fee') {
      balanceByStudent[p.student] -= parseFloat(p.amount || 0)
    }
  }
  for (const [studentId, bal] of Object.entries(balanceByStudent)) {
    if (bal < -40) {
      const student = students.find(s => s.id === parseInt(studentId))
      if (student) recs.push({
        id: `bal-${studentId}`,
        urgency: 'high',
        icon: '💳',
        title: `Outstanding balance — $${Math.abs(bal).toFixed(0)} owing`,
        body: `${student.display_name} has an outstanding balance of $${Math.abs(bal).toFixed(2)}. Send a payment reminder.`,
        action: 'Send reminder',
        student: student.display_name,
      })
    }
  }

  // Low attendance (students with < 50% presence out of 4+ classes)
  const attByStudent = {}
  for (const a of allAtt) {
    if (!attByStudent[a.student]) attByStudent[a.student] = { present: 0, total: 0 }
    attByStudent[a.student].total++
    if (a.status === 'present') attByStudent[a.student].present++
  }
  for (const [studentId, stats] of Object.entries(attByStudent)) {
    if (stats.total >= 4 && stats.present / stats.total < 0.5) {
      const student = students.find(s => s.id === parseInt(studentId))
      if (student) recs.push({
        id: `att-${studentId}`,
        urgency: 'medium',
        icon: '📉',
        title: `Low attendance — ${Math.round(stats.present / stats.total * 100)}% rate`,
        body: `${student.display_name} has only attended ${stats.present} of ${stats.total} classes. Check in with them.`,
        action: 'Welfare check-in',
        student: student.display_name,
      })
    }
  }

  // General insights
  const totalStudents = students.length
  const totalRevenue = allPayments.filter(p => p.payment_type === 'payment').reduce((s, p) => s + parseFloat(p.amount || 0), 0)
  const totalNoShows = allAtt.filter(a => a.status === 'no_show').length
  const avgAttendance = allAtt.length > 0 ? Math.round(allAtt.filter(a => a.status === 'present').length / allAtt.length * 100) : 0

  const insights = [
    { icon: '📊', title: 'Overall attendance rate', body: `${avgAttendance}% present across all recorded classes.`, urgency: avgAttendance >= 80 ? 'good' : 'medium' },
    { icon: '💰', title: 'Revenue health', body: `$${totalRevenue.toFixed(0)} total payments received from ${totalStudents} students.`, urgency: 'good' },
    { icon: '🚨', title: 'No-show volume', body: `${totalNoShows} no-show${totalNoShows !== 1 ? 's' : ''} recorded total. ${totalNoShows > 5 ? 'Consider a reminder system.' : 'Tracking well.'}`, urgency: totalNoShows > 10 ? 'medium' : 'good' },
  ]

  const urgent = recs.filter(r => r.urgency === 'high')
  const medium = recs.filter(r => r.urgency === 'medium')

  const loading = loadingStudents

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Recommendations</div>
          <div className="page-sub">Insights computed from your studio data</div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--grey)' }}>Updated now · {recs.length + insights.length} insights</div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : (
        <>
          {urgent.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--red)', marginBottom: 12, fontWeight: 600 }}>⚠ Action Needed</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {urgent.map(r => (
                  <div key={r.id} style={{ background: 'rgba(255,68,68,0.06)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{r.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10 }}>{r.body}</div>
                      <button className="btn btn-sm" style={{ background: 'rgba(255,68,68,0.15)', color: 'var(--red)', border: '1px solid rgba(255,68,68,0.3)', fontSize: 11 }}>{r.action}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {medium.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--amber)', marginBottom: 12, fontWeight: 600 }}>↓ Worth Checking</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {medium.map(r => (
                  <div key={r.id} style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{r.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10 }}>{r.body}</div>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>{r.action}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--lime)', marginBottom: 12, fontWeight: 600 }}>✦ Studio Insights</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {insights.map((r, i) => (
                <div key={i} style={{ background: 'rgba(204,255,0,0.04)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey)' }}>{r.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {recs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0 0', color: 'var(--grey)', fontSize: 13 }}>
              ✓ No urgent actions needed right now
            </div>
          )}
        </>
      )}
    </div>
  )
}
