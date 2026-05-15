import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { enrolments, seasons } from '../../api'
import { Link } from 'react-router-dom'

const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDayDate(dayOfWeek) {
  // Find the next occurrence of this day of week
  const today = new Date()
  const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1 // Mon=0..Sun=6
  let diff = dayOfWeek - todayDow
  if (diff < 0) diff += 7
  const d = new Date(today)
  d.setDate(today.getDate() + diff)
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
}

function MarkAwayModal({ enrolment, onClose }) {
  const s = enrolment.class_session_detail
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 420, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>Mark Away</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{s?.name}</div>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16 }}>{DAYS_FULL[s?.day_of_week]} · {s?.start_time?.slice(0, 5)}</div>
          <div style={{ background: 'rgba(204,255,0,0.05)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
            Marking away lets your instructor plan ahead. A makeup credit may be issued if eligible.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button className="btn btn-lime btn-sm" style={{ flex: 1 }} onClick={onClose}>Confirm Away</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const { data: enrolData, loading: loadingEnrol } = useApi(() => enrolments.list({ student: user?.id, status: 'active' }), [user?.id])
  const { data: seasonData } = useApi(() => seasons.list(), [])

  const [markAwayEnrol, setMarkAwayEnrol] = useState(null)

  const enrolments_ = enrolData?.results || enrolData || []

  // Current active season
  const allSeasons = seasonData?.results || seasonData || []
  const now = new Date()
  const currentSeason = allSeasons.find(s => {
    const start = s.start_date ? new Date(s.start_date) : null
    const end = s.end_date ? new Date(s.end_date) : null
    return start && end && now >= start && now <= end
  }) || allSeasons[0]

  // Weeks remaining
  let weeksRemaining = '—'
  if (currentSeason?.end_date) {
    const end = new Date(currentSeason.end_date)
    const msLeft = end - now
    if (msLeft > 0) weeksRemaining = Math.ceil(msLeft / (1000 * 60 * 60 * 24 * 7))
  }

  // Enrolled class names for summary sentence
  const enrolledNames = enrolments_.map(e => e.class_session_detail?.name).filter(Boolean)

  const hasEnrolments = enrolments_.length > 0

  return (
    <div>
      {/* Season open banner — shown when no active enrolments */}
      {!loadingEnrol && !hasEnrolments && (
        <div style={{ background: 'var(--lime)', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#000' }}>Season 4 is now open — book your spot</div>
          <Link to="/portal/book"><button className="btn btn-sm" style={{ background: '#000', color: 'var(--lime)', whiteSpace: 'nowrap' }}>Book Now</button></Link>
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-title">{greeting()}, {user?.first_name} 👋</div>
          <div className="page-sub">{new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      {/* Enrolled classes summary sentence */}
      {hasEnrolments && (
        <div style={{ fontSize: 14, color: 'var(--grey)', marginBottom: 20 }}>
          You're enrolled in {enrolledNames.join(' and ')} this season.
        </div>
      )}

      {/* Profile incomplete banner */}
      {(!user?.phone || !user?.emergency_contact_name || !user?.emergency_contact_phone) && (
        <div style={{ background: 'rgba(176,160,255,0.08)', border: '1px solid rgba(176,160,255,0.25)', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--lav)', marginBottom: 4 }}>Complete your profile</div>
            <div style={{ fontSize: 13, color: 'var(--grey)' }}>Add your phone number and emergency contact so we can reach you if needed.</div>
          </div>
          <Link to="/portal/account"><button className="btn btn-sm" style={{ background: 'var(--lav)', color: '#000', whiteSpace: 'nowrap' }}>Update now</button></Link>
        </div>
      )}

      {/* KPI Stats */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi card" style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lime)' }}>{loadingEnrol ? '—' : enrolments_.length}</div>
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>Classes This Season</div>
        </div>
        <div className="kpi card" style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lav)' }}>0</div>
          <Link to="/portal/billing" style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4, display: 'block', textDecoration: 'none' }}>Catch-up Credits</Link>
        </div>
        <div className="kpi card" style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lime)' }}>0</div>
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>Tricks Unlocked in your level</div>
        </div>
        <div className="kpi card" style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lav)' }}>{weeksRemaining}</div>
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>Weeks Remaining</div>
        </div>
      </div>

      {/* Classes This Week */}
      <div style={{ marginBottom: 28 }}>
        <div className="section-title" style={{ fontSize: 15, marginBottom: 12 }}>Classes This Week</div>
        {loadingEnrol ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
        ) : enrolments_.length === 0 ? (
          <div className="empty-state">
            <div style={{ marginBottom: 8 }}>No classes enrolled yet</div>
            <div style={{ fontSize: 12 }}>Contact your studio to get set up</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {enrolments_.map(e => {
              const s = e.class_session_detail
              const instructorName = s?.instructor_detail
                ? `${s.instructor_detail.first_name || ''} ${s.instructor_detail.last_name || ''}`.trim()
                : (s?.instructor_name || '—')
              return (
                <div key={e.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 2 }}>{formatDayDate(s?.day_of_week)}</div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{s?.name} · {s?.studio_detail?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey)' }}>with {instructorName}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={() => setMarkAwayEnrol(e)}>
                    Mark Away
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div style={{ marginBottom: 8 }}>
        <div className="section-title" style={{ fontSize: 15, marginBottom: 12 }}>Quick Links</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { emoji: '📅', label: 'Book a Casual', to: '/portal/book' },
            { emoji: '🎟️', label: 'My Catch-up Credits', to: '/portal/billing' },
            { emoji: '🤝', label: 'Refer a Friend', to: '/portal/account' },
            { emoji: '🏢', label: 'Studio Info', to: '/portal/studio' },
          ].map(({ emoji, label, to }) => (
            <Link key={to} to={to} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ textAlign: 'center', cursor: 'pointer', padding: '18px 12px' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {markAwayEnrol && (
        <MarkAwayModal
          enrolment={markAwayEnrol}
          onClose={() => setMarkAwayEnrol(null)}
        />
      )}
    </div>
  )
}
