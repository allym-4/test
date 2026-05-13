import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Shell.css'

const NAV = [
  { to: '/',         label: 'Dashboard', icon: '◼' },
  { to: '/classes',  label: 'Classes',   icon: '▸' },
  { to: '/students', label: 'Students',  icon: '●' },
  { to: '/homework', label: 'Homework',  icon: '✓' },
]

export default function Shell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="sidebar-logo">DUALITY</div>
        <div className="sidebar-nav">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
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
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
