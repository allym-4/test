import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import { notifications as notificationsApi } from '../api'
import './Shell.css'

const NAV_PRIMARY = [
  { to: '/',              label: 'Dashboard',     icon: '⬡', end: true },
  { to: '/classes',       label: 'My Classes',    icon: '📅' },
  { to: '/attendance',    label: 'Attendance',    icon: '✅' },
  { to: '/students',      label: 'Students',      icon: '👥' },
  { to: '/homework',      label: 'Homework',      icon: '📝' },
]

const NAV_SECONDARY = [
  { to: '/messages',      label: 'Messages',      icon: '💬', mobileShow: true },
  { to: '/notifications', label: 'Notifications', icon: '🔔', badge: true, mobileShow: true },
  { to: '/pay',           label: 'Pay & Earnings', icon: '💰' },
  { to: '/availability',  label: 'Availability & Cover', icon: '📆' },
  { to: '/skills',        label: 'Skill Approvals', icon: '⭐' },
  { to: '/profile',       label: 'My Profile',    icon: '👤', mobileShow: true },
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
        <div className="sidebar-logo">
          <div className="sidebar-logo-line1">DUALITY</div>
          <div className="sidebar-logo-line2">POLE</div>
        </div>

        <div className="sidebar-nav">
          {NAV_PRIMARY.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}

          <div className="nav-divider" />

          {NAV_SECONDARY.map(({ to, label, icon, badge, mobileShow }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}${!mobileShow ? ' nav-desktop-only' : ''}`}
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
            <div className="avatar" style={{ background: 'var(--lime)', fontSize: '12px', flexShrink: 0 }}>
              {user?.first_name?.[0] || '?'}
            </div>
            <div className="sidebar-user-info">
              <div style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.display_name}</div>
              <div style={{ fontSize: '10px', color: 'var(--grey)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </div>

          <div className="view-toggle">
            <button className="view-toggle-btn active">Staff</button>
            <button className="view-toggle-btn" onClick={() => navigate('/portal')}>Student</button>
          </div>

          <button className="btn btn-ghost btn-xs" onClick={handleLogout} style={{ width: '100%' }}>Log out</button>
        </div>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
