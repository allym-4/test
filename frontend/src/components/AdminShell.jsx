import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './AdminShell.css'

const NAV_GROUPS = [
  {
    items: [
      { to: '/admin', label: 'Dashboard', icon: '⬡', end: true },
    ]
  },
  {
    divider: true,
    label: 'People',
    items: [
      { to: '/admin/students', label: 'Students',   icon: '👤' },
      { to: '/admin/staff',    label: 'Staff',      icon: '🧑‍🏫' },
    ]
  },
  {
    divider: true,
    label: 'Classes',
    items: [
      { to: '/admin/timetable', label: 'Timetable', icon: '📅' },
      { to: '/admin/classes',   label: 'Classes',   icon: '📚' },
      { to: '/admin/waitlist',  label: 'Waitlist',  icon: '⏳' },
      { to: '/admin/seasons',   label: 'Seasons',   icon: '🌀' },
    ]
  },
  {
    divider: true,
    label: 'Finance',
    items: [
      { to: '/admin/billing',       label: 'Billing',         icon: '💳' },
      { to: '/admin/payment-plans', label: 'Payment Plans',   icon: '📋' },
      { to: '/admin/bookings',      label: 'Bookings',        icon: '🎟' },
      { to: '/admin/reporting',     label: 'Analytics',       icon: '📊' },
    ]
  },
  {
    divider: true,
    label: 'Community',
    items: [
      { to: '/admin/messages',        label: 'Messages',        icon: '📩' },
      { to: '/admin/community',       label: 'Community',       icon: '💬' },
      { to: '/admin/recommendations', label: 'Recommendations', icon: '💡' },
      { to: '/admin/helpdesk',        label: 'Helpdesk',        icon: '🎧' },
    ]
  },
  {
    divider: true,
    label: 'Ops',
    items: [
      { to: '/admin/leads',       label: 'Leads',       icon: '🎯' },
      { to: '/admin/retail',      label: 'Retail',      icon: '🛍' },
      { to: '/admin/lockers',     label: 'Lockers',     icon: '🔐' },
      { to: '/admin/automations', label: 'Automations', icon: '🔔' },
      { to: '/admin/settings',    label: 'Settings',    icon: '⚙️' },
    ]
  },
]

export default function AdminShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="admin-shell">
      {mobileOpen && <div className="admin-mob-overlay" onClick={() => setMobileOpen(false)} />}

      <nav className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-logo">
          DUALITY <span>POLE</span>
          <button className="admin-sidebar-close" onClick={() => setMobileOpen(false)}>✕</button>
        </div>

        <div className="admin-sidebar-nav">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.divider && <div className="admin-nav-divider" />}
              {group.label && <div className="admin-nav-group-label">{group.label}</div>}
              {group.items.map(({ to, label, icon, end, stub }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}${stub ? ' stub' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="admin-nav-icon">{icon}</span>
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <div className="avatar" style={{ background: 'var(--lime)', fontSize: 12 }}>
              {user?.first_name?.[0] || '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.display_name}</div>
              <div style={{ fontSize: 10, color: 'var(--grey)', textTransform: 'capitalize' }}>Founder</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={handleLogout}>Log out</button>
        </div>
      </nav>

      <div className="admin-topbar">
        <button className="admin-hamburger" onClick={() => setMobileOpen(true)}>☰</button>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, letterSpacing: 2, color: 'var(--lime)' }}>DUALITY</div>
      </div>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
