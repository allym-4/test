import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import { notifications as notificationsApi } from '../api'
import './Shell.css'

const NAV = [
  { to: '/',               label: 'Dashboard',           icon: '⬡', end: true },
  { to: '/classes',        label: 'My Classes',          icon: '📅' },
  { to: '/attendance',     label: 'Attendance',          icon: '✅' },
  { to: '/students',       label: 'Students',            icon: '👤' },
  { to: '/homework',       label: 'Homework',            icon: '📝' },
  { to: '/messages',       label: 'Messages',            icon: '💬' },
  { to: '/notifications',  label: 'Notifications',       icon: '🔔', badge: true },
  { to: '/pay',            label: 'Pay & Earnings',      icon: '💰' },
  { to: '/availability',   label: 'Availability & Cover', icon: '📆' },
  { to: '/skills',         label: 'Skill Approvals',     icon: '⭐' },
  { to: '/profile',        label: 'My Profile',          icon: '👤' },
]

export default function Shell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { data: notifData } = useApi(() => notificationsApi.list(), [])
  const allNotifs = notifData?.results || notifData || []
  const unreadCount = allNotifs.filter(n => !n.read).length

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="sidebar-logo">DUALITY</div>
        <div className="sidebar-nav">
          {NAV.map(({ to, label, icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
              {badge && unreadCount > 0 && (
                <span style={{ marginLeft: 'auto', background: '#ff5050', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px', lineHeight: '16px' }}>
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar" style={{ background: 'var(--lime)', fontSize: '12px' }}>
              {user?.first_name?.[0] || '?'}
            </div>
            <div className="sidebar-user-info">
              <div style={{ fontSize: '12px', fontWeight: 600 }}>{user?.display_name}</div>
              <div style={{ fontSize: '10px', color: 'var(--grey)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={handleLogout}>Log out</button>
          <button
            className="btn btn-ghost btn-xs"
            style={{ marginTop: 6, width: '100%', color: 'var(--lav)', borderColor: 'rgba(176,160,255,0.3)' }}
            onClick={() => navigate('/portal')}
          >
            Student View →
          </button>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
