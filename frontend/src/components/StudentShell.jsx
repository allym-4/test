import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import { payments, notifications as notificationsApi, announcements as announcementsApi } from '../api'
import './StudentShell.css'

const NAV = [
  { to: '/portal',               label: 'Dashboard',    icon: '◆', end: true },
  { to: '/portal/book',          label: 'Book a Class', icon: '+' },
  { to: '/portal/classes',       label: 'My Classes',   icon: '□' },
  { to: '/portal/progress',      label: 'Progress',     icon: '△' },
  { to: '/portal/notifications', label: 'Notifications', icon: '○', badge: true },
  { to: '/portal/forms',         label: 'Forms',        icon: '⬛', formsBadge: true },
]

const NAV2 = [
  { to: '/portal/chat',      label: 'Chat',           icon: '○' },
  { to: '/portal/community', label: 'Community',      icon: '♬' },
  { to: '/portal/support',   label: 'Help & Support', icon: '🎧' },
  { to: '/portal/studio',    label: 'Studio Info',    icon: '●' },
]

export default function StudentShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: balData } = useApi(() => user ? payments.balance(user.id) : null, [user?.id])
  const { data: notifData } = useApi(() => notificationsApi.list(), [])
  const { data: annData } = useApi(() => announcementsApi.list({ note_type: 'announcement' }), [])

  const bal = balData ? parseFloat(balData.balance) : null
  const isOwing = bal !== null && bal < 0

  const allNotifs = notifData?.results || notifData || []
  const allAnns = annData?.results || annData || []
  const unreadNotifs = allNotifs.filter(n => !n.read).length
  const unackAnns = allAnns.filter(a => a.requires_acknowledgement && !a.is_acknowledged).length
  const notifBadge = unreadNotifs + unackAnns

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="student-shell">
      {mobileOpen && <div className="student-mob-overlay" onClick={() => setMobileOpen(false)} />}

      <nav className={`student-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="student-sidebar-logo">
          DUALITY <span>POLE</span>
          <button className="student-sidebar-close" onClick={() => setMobileOpen(false)}>✕</button>
        </div>

        <div className="student-sidebar-nav">
          {NAV.map(({ to, label, icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `student-nav-item${isActive ? ' active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="student-nav-icon">{icon}</span>
              <span style={{ flex: 1 }}>{label}</span>
              {badge && notifBadge > 0 && (
                <span style={{
                  background: 'var(--lime)', color: '#000', borderRadius: 10,
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center',
                }}>{notifBadge}</span>
              )}
            </NavLink>
          ))}

          <div className="student-nav-divider" />

          {NAV2.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `student-nav-item${isActive ? ' active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="student-nav-icon">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}

          <div className="student-nav-divider" />

          <NavLink to="/portal/account" className={({ isActive }) => `student-nav-item${isActive ? ' active' : ''}`} onClick={() => setMobileOpen(false)}>
            <span className="student-nav-icon">■</span>
            <span>Account</span>
          </NavLink>
          <NavLink to="/portal/billing" className={({ isActive }) => `student-nav-item student-nav-sub${isActive ? ' active' : ''}`} onClick={() => setMobileOpen(false)}>
            <span>Billing history</span>
          </NavLink>
        </div>

        <div className="student-sidebar-footer">
          <div className="student-user-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div className="avatar" style={{ background: 'var(--lav)', fontSize: 13 }}>
                {user?.first_name?.[0] || '?'}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{user?.display_name}</div>
                <div style={{ fontSize: 10, color: 'var(--grey)' }}>Student</div>
              </div>
            </div>
            {bal !== null && (
              <div style={{ background: isOwing ? 'rgba(255,68,68,0.08)' : 'rgba(0,23,0,0.8)', border: `1px solid ${isOwing ? 'rgba(255,68,68,0.2)' : '#1e3800'}`, borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: isOwing ? 'var(--red)' : 'var(--grey)', marginBottom: 2 }}>Account balance</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: isOwing ? 'var(--red)' : 'var(--lime)' }}>
                  {isOwing ? `-$${Math.abs(bal).toFixed(2)} owing` : bal > 0 ? `$${bal.toFixed(2)} credit` : '$0.00'}
                </div>
              </div>
            )}
          </div>
          <button className="btn btn-ghost btn-xs" onClick={handleLogout} style={{ width: '100%' }}>Log out</button>
        </div>
      </nav>

      <div className="student-topbar">
        <button className="student-hamburger" onClick={() => setMobileOpen(true)}>☰</button>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, letterSpacing: 2, color: 'var(--lime)' }}>DUALITY</div>
      </div>

      <main className="student-main">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="student-bottom-nav">
        {[
          { to: '/portal',          label: 'Dashboard', icon: '◆', end: true },
          { to: '/portal/book',     label: 'Book',      icon: '+' },
          { to: '/portal/classes',  label: 'My Classes', icon: '□' },
          { to: '/portal/progress', label: 'Progress',  icon: '△' },
          { to: '/portal/account',  label: 'Account',   icon: '■' },
        ].map(({ to, label, icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `student-bottom-item${isActive ? ' active' : ''}`}>
            <span className="student-bottom-icon">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
