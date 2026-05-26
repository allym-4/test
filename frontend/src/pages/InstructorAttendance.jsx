import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { classes } from '../api'
import { fmt12 } from '../utils/time'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function InstructorAttendance() {
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)

  const { data: occData, loading } = useApi(
    () => classes.occurrences({ upcoming: true }),
    []
  )
  const occs = occData?.results || occData || []

  const todayOccs = occs.filter(o => o.date === today)
  const upcomingOccs = occs.filter(o => o.date > today).slice(0, 10)

  function formatDate(dateStr) {
    return new Date(dateStr + 'T00:00').toLocaleDateString('en-AU', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  function OccCard({ occ }) {
    const s = occ.session_detail || {}
    return (
      <div
        onClick={() => navigate(`/classes/${s.id || occ.session}/attendance`)}
        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--lime)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{s.name || 'Class'}</div>
          <div style={{ fontSize: 12, color: 'var(--grey)' }}>
            {formatDate(occ.date)} · {fmt12(s.start_time)} – {fmt12(s.end_time)}
          </div>
        </div>
        <span className="tag tag-lav" style={{ fontSize: 11 }}>{s.level || 'All levels'}</span>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Attendance</div>
          <div className="page-sub">Select a class to take the register</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : (
        <>
          {todayOccs.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Today</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todayOccs.map(o => <OccCard key={o.id} occ={o} />)}
              </div>
            </div>
          )}

          {upcomingOccs.length > 0 && (
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Upcoming</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcomingOccs.map(o => <OccCard key={o.id} occ={o} />)}
              </div>
            </div>
          )}

          {todayOccs.length === 0 && upcomingOccs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--grey)', fontSize: 13 }}>
              No upcoming classes scheduled.
            </div>
          )}
        </>
      )}
    </div>
  )
}
