import { useApi } from '../hooks/useApi'
import { classes } from '../api'
import { Link } from 'react-router-dom'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function ClassesPage() {
  const { data, loading } = useApi(() => classes.list())
  const sessions = data?.results || []

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Classes</div>
          <div className="page-sub">Your teaching schedule</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><div className="spinner" /></div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">No classes found</div>
      ) : (
        <div className="list-card">
          {sessions.map(s => (
            <Link key={s.id} to={`/classes/${s.id}/attendance`} className="list-row clickable">
              <div style={{ width: 44, flexShrink: 0, textAlign: 'center' }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17, color: 'var(--lime)' }}>
                  {DAYS[s.day_of_week]?.slice(0, 3)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--grey)' }}>
                  {s.start_time?.slice(0, 5)}
                </div>
              </div>
              <div className="list-body">
                <div className="list-title">{s.name} · {s.studio_detail?.name}</div>
                <div className="list-sub">
                  {DAYS[s.day_of_week]} · {s.duration_minutes} min · {s.enrolled_count}/{s.capacity} enrolled
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span className="tag tag-lav" style={{ fontSize: 10 }}>{s.session_type}</span>
                {!s.is_active && <span className="tag tag-grey" style={{ fontSize: 10 }}>Inactive</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
