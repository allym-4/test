import { useApi } from '../../hooks/useApi'
import { enrolments, classes } from '../../api'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function AdminWaitlist() {
  const { data: enrolData, loading } = useApi(() => enrolments.list({ status: 'waitlist' }))
  const { data: sessionsData } = useApi(() => classes.list())

  const waitlisted = enrolData?.results || []
  const sessions = sessionsData?.results || []

  const bySession = {}
  for (const e of waitlisted) {
    const sid = e.class_session || e.class_session_detail?.id
    if (!bySession[sid]) bySession[sid] = []
    bySession[sid].push(e)
  }

  const sessionMap = {}
  for (const s of sessions) sessionMap[s.id] = s

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Waitlist</div>
          <div className="page-sub">{waitlisted.length} students waiting</div>
        </div>
        <button className="btn btn-ghost btn-sm">Notify All Eligible</button>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {[
          ['Total Waitlisted', waitlisted.length, 'kpi-amber'],
          ['Classes with Waitlist', Object.keys(bySession).length, 'kpi-lav'],
          ['Avg Position', waitlisted.length > 0 ? Math.ceil(waitlisted.length / Math.max(Object.keys(bySession).length, 1)) : 0, 'kpi-lime'],
        ].map(([label, val, cls]) => (
          <div key={label} className={`kpi ${cls}`}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{val}</div>
          </div>
        ))}
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
                            <td style={{ color: 'var(--grey)', fontSize: 12 }}>—</td>
                            <td>
                              <button className="btn btn-lime btn-xs" style={{ marginRight: 6 }}>Promote</button>
                              <button className="btn btn-ghost btn-xs">Remove</button>
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
