import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { enrolments, classes, helpdesk } from '../../api'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function AdminWaitlist() {
  const { data: enrolData, loading, refetch } = useApi(() => enrolments.list({ status: 'waitlisted' }))
  const { data: sessionsData } = useApi(() => classes.list())
  const [acting, setActing] = useState({})
  const [notifying, setNotifying] = useState(false)
  const [notifyResult, setNotifyResult] = useState(null)

  const waitlisted = enrolData?.results || enrolData || []
  const sessions = sessionsData?.results || sessionsData || []

  const bySession = {}
  for (const e of waitlisted) {
    const sid = e.class_session || e.class_session_detail?.id
    if (!bySession[sid]) bySession[sid] = []
    bySession[sid].push(e)
  }

  async function notifyEligible() {
    setNotifying(true)
    setNotifyResult(null)
    try {
      const convsRes = await helpdesk.conversations()
      const convs = convsRes.data?.results || convsRes.data || []
      let sent = 0
      for (const [, students] of Object.entries(bySession)) {
        const top = students[0]
        if (!top) continue
        const studentId = top.student
        const sessionName = top.class_session_detail?.name || 'your class'
        let conv = convs.find(c => c.student === studentId)
        if (!conv) {
          const res = await helpdesk.createConversation({ student: studentId })
          conv = res.data
        }
        await helpdesk.sendDm(conv.id, {
          body: `Hi! We wanted to let you know a spot may have opened up in ${sessionName}. Reply to this message or contact us to confirm your place.`,
        })
        sent++
      }
      setNotifyResult(`Notified ${sent} student${sent !== 1 ? 's' : ''}`)
    } finally {
      setNotifying(false)
    }
  }

  const sessionMap = {}
  for (const s of sessions) sessionMap[s.id] = s

  async function promote(e) {
    setActing(a => ({ ...a, [e.id]: 'promoting' }))
    try {
      await enrolments.update(e.id, { status: 'active' })
      refetch()
    } finally {
      setActing(a => ({ ...a, [e.id]: null }))
    }
  }

  async function remove(e) {
    setActing(a => ({ ...a, [e.id]: 'removing' }))
    try {
      await enrolments.delete(e.id)
      refetch()
    } finally {
      setActing(a => ({ ...a, [e.id]: null }))
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Waitlist</div>
          <div className="page-sub">{waitlisted.length} students waiting</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {notifyResult && <span style={{ fontSize: 12, color: 'var(--lime)' }}>✓ {notifyResult}</span>}
          <button className="btn btn-ghost btn-sm" onClick={notifyEligible} disabled={notifying || waitlisted.length === 0}>
            {notifying ? 'Notifying…' : 'Notify all eligible →'}
          </button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi kpi-amber">
          <div className="kpi-label">Total Waitlisted</div>
          <div className="kpi-value">{waitlisted.length}</div>
        </div>
        <div className="kpi kpi-lav">
          <div className="kpi-label">Classes with Waitlist</div>
          <div className="kpi-value">{Object.keys(bySession).length}</div>
        </div>
        <div className="kpi kpi-lime">
          <div className="kpi-label">Promoted This Season</div>
          <div className="kpi-value">—</div>
          <div className="kpi-sub">From waitlist to enrolled</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Avg Wait Time</div>
          <div className="kpi-value">
            {waitlisted.length === 0 ? '—' : (() => {
              const now = Date.now()
              const avg = waitlisted.reduce((sum, e) => {
                const d = e.created_at ? now - new Date(e.created_at).getTime() : 0
                return sum + d
              }, 0) / waitlisted.length
              const days = Math.round(avg / (1000 * 60 * 60 * 24))
              return `${days}d`
            })()}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : waitlisted.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <div>No students on waitlist</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(bySession).map(([sessionId, students]) => {
            const session = sessionMap[sessionId] || students[0]?.class_session_detail
            return (
              <div key={sessionId}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, marginBottom: 10 }}>
                  {session?.name}
                  <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--grey)', marginLeft: 8 }}>
                    {DAYS[session?.day_of_week]} {session?.start_time?.slice(0,5)} · {session?.studio_detail?.name}
                  </span>
                </div>
                <div className="tbl-section">
                  <table>
                    <thead>
                      <tr><th>Position</th><th>Student</th><th>Joined Waitlist</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {students.map((e, i) => {
                        const st = e.student_detail
                        const busy = acting[e.id]
                        return (
                          <tr key={e.id}>
                            <td>
                              <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, color: i === 0 ? 'var(--lime)' : 'var(--grey)' }}>
                                #{i + 1}
                              </span>
                            </td>
                            <td>
                              <b>{st?.display_name || `Student ${e.student}`}</b>
                              {st?.email && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{st.email}</div>}
                            </td>
                            <td style={{ color: 'var(--grey)', fontSize: 12 }}>{e.created_at ? new Date(e.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                            <td>
                              <button
                                className="btn btn-lime btn-xs"
                                style={{ marginRight: 6 }}
                                disabled={!!busy}
                                onClick={() => promote(e)}
                              >
                                {busy === 'promoting' ? '…' : 'Promote'}
                              </button>
                              <button
                                className="btn btn-ghost btn-xs"
                                disabled={!!busy}
                                onClick={() => remove(e)}
                              >
                                {busy === 'removing' ? '…' : 'Remove'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
