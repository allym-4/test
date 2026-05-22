import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { users, payments, attendance, helpdesk } from '../../api'

function SendMessageModal({ rec, onClose, onSent }) {
  const [body, setBody] = useState(rec.defaultMessage || '')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  async function send(e) {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)
    setError(null)
    try {
      const convsRes = await helpdesk.conversations()
      const convs = convsRes.data?.results || convsRes.data || []
      let conv = convs.find(c => c.student === rec.studentId)
      if (!conv) {
        const res = await helpdesk.createConversation({ student: rec.studentId })
        conv = res.data
      }
      await helpdesk.sendDm(conv.id, { body: body.trim() })
      onSent()
    } catch (err) {
      setError('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 440 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{rec.action}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 12 }}>
            Sending to <strong style={{ color: 'var(--white)' }}>{rec.student}</strong>
          </div>
          <form onSubmit={send}>
            <div className="field">
              <label>Message</label>
              <textarea
                rows={5}
                value={body}
                onChange={e => setBody(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
                autoFocus
              />
            </div>
            {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-lime btn-sm" disabled={sending || !body.trim()}>
                {sending ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function AdminRecommendations() {
  const { data: studentsData, loading: loadingStudents, refetch: refetchStudents } = useApi(() => users.list({ role: 'student' }))
  const { data: paymentsData, refetch: refetchPayments } = useApi(() => payments.list())
  const { data: attData, refetch: refetchAtt } = useApi(() => attendance.list())

  function handleRefresh() { refetchStudents(); refetchPayments(); refetchAtt() }

  const [activeModal, setActiveModal] = useState(null)
  const [sentIds, setSentIds] = useState(new Set())

  const students = studentsData?.results || []
  const allPayments = paymentsData?.results || []
  const allAtt = attData?.results || []

  const recs = []

  const noShowCount = {}
  for (const a of allAtt) {
    if (a.status === 'no_show') noShowCount[a.student] = (noShowCount[a.student] || 0) + 1
  }
  for (const [studentId, count] of Object.entries(noShowCount)) {
    if (count >= 2) {
      const student = students.find(s => s.id === parseInt(studentId))
      if (student) recs.push({
        id: `ns-${studentId}`,
        studentId: student.id,
        urgency: 'high',
        icon: '⚠️',
        title: `${count} no-shows — chase needed`,
        body: `${student.display_name} has missed ${count} classes without cancelling. Consider reaching out.`,
        action: 'Chase',
        student: student.display_name,
        defaultMessage: `Hi ${student.first_name}, we noticed you've missed a few classes recently without cancelling. We just wanted to check in — is everything okay? Please let us know if there's anything we can do to help.`,
      })
    }
  }

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
        studentId: student.id,
        urgency: 'high',
        icon: '💳',
        title: `Outstanding balance — $${Math.abs(bal).toFixed(0)} owing`,
        body: `${student.display_name} has an outstanding balance of $${Math.abs(bal).toFixed(2)}. Send a payment reminder.`,
        action: 'Send reminder',
        student: student.display_name,
        defaultMessage: `Hi ${student.first_name}, just a friendly reminder that there's an outstanding balance of $${Math.abs(bal).toFixed(2)} on your account. Please get in touch when you get a chance and we can sort it out. Thanks!`,
      })
    }
  }

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
        studentId: student.id,
        urgency: 'medium',
        icon: '📉',
        title: `Low attendance — ${Math.round(stats.present / stats.total * 100)}% rate`,
        body: `${student.display_name} has only attended ${stats.present} of ${stats.total} classes. Check in with them.`,
        action: 'Welfare check-in',
        student: student.display_name,
        defaultMessage: `Hi ${student.first_name}, we've noticed your attendance has been a little low lately and just wanted to check in. Is everything going okay? We'd love to see you back in class — let us know if there's anything we can do to help.`,
      })
    }
  }

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

  function ActionButton({ rec, className, style }) {
    const sent = sentIds.has(rec.id)
    return (
      <button
        className={className}
        style={style}
        onClick={() => setActiveModal(rec)}
        disabled={sent}
      >
        {sent ? '✓ Sent' : rec.action}
      </button>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Recommendations</div>
          <div className="page-sub">Insights computed from your studio data</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--grey)' }}>{recs.length + insights.length} insights</div>
          <button className="btn btn-ghost btn-sm" onClick={handleRefresh} disabled={loadingStudents}>
            {loadingStudents ? '…' : '↻ Refresh'}
          </button>
        </div>
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
                      <ActionButton rec={r} className="btn btn-sm" style={{ background: 'rgba(255,68,68,0.15)', color: 'var(--red)', border: '1px solid rgba(255,68,68,0.3)', fontSize: 11 }} />
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
                      <ActionButton rec={r} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} />
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

      {activeModal && (
        <SendMessageModal
          rec={activeModal}
          onClose={() => setActiveModal(null)}
          onSent={() => {
            setSentIds(s => new Set([...s, activeModal.id]))
            setActiveModal(null)
          }}
        />
      )}
    </div>
  )
}
