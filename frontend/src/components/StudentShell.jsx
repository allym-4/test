import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import { payments, notifications as notificationsApi, announcements as announcementsApi } from '../api'
import HelpPanel from './HelpPanel'
import './StudentShell.css'

function renderBody(text) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (match) return <a key={i} href={match[2]} target="_blank" rel="noreferrer" style={{ color: '#ccff00' }}>{match[1]}</a>
    return <span key={i}>{part}</span>
  })
}

function AnnouncementModalQueue({ modals, onDismissed }) {
  const [idx, setIdx] = useState(0)
  const [dismissing, setDismissing] = useState(false)
  const ann = modals[idx]
  if (!ann) return null

  async function dismiss() {
    setDismissing(true)
    try {
      await announcementsApi.dismiss(ann.id)
    } catch { /* silent */ } finally {
      setDismissing(false)
    }
    if (idx + 1 < modals.length) {
      setIdx(i => i + 1)
    } else {
      onDismissed()
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.88)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#1a1a1a', borderRadius: 16, padding: 28,
        maxWidth: 460, width: '100%', border: '1px solid #333',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
      }}>
        {modals.length > 1 && (
          <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            {idx + 1} of {modals.length}
          </div>
        )}
        <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: '#fff', margin: '0 0 14px' }}>
          {ann.title}
        </h2>
        <p style={{ fontSize: 14, color: '#aaa', lineHeight: 1.65, margin: '0 0 24px' }}>
          {renderBody(ann.body)}
        </p>
        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          {ann.cta_label && ann.cta_url && (
            <a
              href={ann.cta_url}
              style={{
                display: 'block', background: '#ccff00', color: '#000',
                fontWeight: 700, fontSize: 15, borderRadius: 10,
                padding: '13px 20px', textAlign: 'center', textDecoration: 'none',
              }}
            >
              {ann.cta_label}
            </a>
          )}
          {(ann.extra_ctas || []).map((cta, i) => (
            cta.label && cta.url ? (
              <a
                key={i}
                href={cta.url}
                style={{
                  display: 'block', background: 'rgba(204,255,0,0.12)', color: '#ccff00',
                  fontWeight: 700, fontSize: 15, borderRadius: 10,
                  padding: '13px 20px', textAlign: 'center', textDecoration: 'none',
                  border: '1px solid rgba(204,255,0,0.3)',
                }}
              >
                {cta.label}
              </a>
            ) : null
          ))}
          <button
            onClick={dismiss}
            disabled={dismissing}
            style={{
              background: 'transparent', border: '1px solid #333', color: '#888',
              borderRadius: 10, padding: '11px 20px', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
            }}
          >
            {dismissing ? 'Dismissing…' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  )
}

const NAV = [
  { to: '/portal',               label: 'Dashboard',    icon: '◆', end: true },
  { to: '/portal/book',          label: 'Book a Class', icon: '+' },
  { to: '/portal/classes',       label: 'My Classes',   icon: '□' },
  { to: '/portal/practice',      label: 'Practice Time', icon: '🏋️' },
  { to: '/portal/progress',      label: 'Progress',     icon: '△' },
  { to: '/portal/notifications', label: 'Notifications', icon: '○', badge: true },
  { to: '/portal/forms',         label: 'Forms',        icon: '⬛', formsBadge: true },
]

const NAV2 = [
  { to: '/portal/shop',      label: 'Shop',           icon: '🛍️' },
  { to: '/portal/chat',      label: 'Chat',           icon: '○' },
  { to: '/portal/community', label: 'Community',      icon: '♬' },
  { to: '/portal/support',   label: 'Help & Support', icon: '🎧' },
  { to: '/portal/studio',    label: 'Studio Info',    icon: '●' },
]

export default function StudentShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [modalsDismissed, setModalsDismissed] = useState(false)
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

  const pendingModals = !modalsDismissed
    ? allAnns.filter(a => a.show_as_modal && !a.is_modal_dismissed)
    : []

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="student-shell">
      {(user?.role === 'instructor' || user?.role === 'admin') && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#ccff00', color: '#000', fontSize: 12, fontWeight: 700,
          padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>Previewing student portal</span>
          <button
            onClick={() => navigate('/')}
            style={{ background: '#000', color: '#ccff00', border: 'none', borderRadius: 6, padding: '3px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >
            ← Back to Instructor
          </button>
        </div>
      )}
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
              <NavLink to="/portal/billing" style={{ textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>
                <div style={{ background: isOwing ? 'rgba(255,68,68,0.08)' : 'rgba(0,23,0,0.8)', border: `1px solid ${isOwing ? 'rgba(255,68,68,0.2)' : '#1e3800'}`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: isOwing ? 'var(--red)' : 'var(--grey)', marginBottom: 2 }}>Account balance</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: isOwing ? 'var(--red)' : 'var(--lime)' }}>
                    {isOwing ? `-$${Math.abs(bal).toFixed(2)} owing` : bal > 0 ? `$${bal.toFixed(2)} credit` : '$0.00'}
                  </div>
                  {isOwing && <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 3, opacity: 0.7 }}>Tap to view billing →</div>}
                </div>
              </NavLink>
            )}
          </div>
          <button className="btn btn-ghost btn-xs" onClick={handleLogout} style={{ width: '100%' }}>Log out</button>
        </div>
      </nav>

      <div className="student-topbar">
        <button className="student-hamburger" onClick={() => setMobileOpen(true)}>☰</button>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, letterSpacing: 2, color: 'var(--lime)' }}>DUALITY</div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setHelpOpen(true)}
            style={{
              background: 'rgba(204,255,0,0.1)', border: '1px solid rgba(204,255,0,0.25)',
              borderRadius: 8, color: 'var(--lime)', fontSize: 12, fontWeight: 700,
              padding: '5px 12px', cursor: 'pointer', letterSpacing: 0.5,
            }}
          >
            ? Help
          </button>
          <NavLink to="/portal/notifications" style={{ position: 'relative', display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
            <span style={{ fontSize: 20 }}>🔔</span>
            {notifBadge > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -6,
                background: 'var(--lime)', color: '#000',
                borderRadius: 9, minWidth: 18, height: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, padding: '0 3px',
              }}>{notifBadge > 99 ? '99+' : notifBadge}</span>
            )}
          </NavLink>
        </div>
      </div>

      <main className="student-main">
        <Outlet />
      </main>

      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />

      {pendingModals.length > 0 && (
        <AnnouncementModalQueue
          modals={pendingModals}
          onDismissed={() => setModalsDismissed(true)}
        />
      )}

      {/* Mobile bottom nav */}
      <nav className="student-bottom-nav">
        {[
          { to: '/portal',               label: 'Dashboard',    icon: '◆', end: true },
          { to: '/portal/book',          label: 'Book',         icon: '+' },
          { to: '/portal/classes',       label: 'My Classes',   icon: '□' },
          { to: '/portal/notifications', label: 'Alerts',       icon: '🔔', isBell: true },
          { to: '/portal/account',       label: 'Account',      icon: '■' },
        ].map(({ to, label, icon, end, isBell }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `student-bottom-item${isActive ? ' active' : ''}`}>
            <span className="student-bottom-icon" style={{ position: 'relative', display: 'inline-block' }}>
              {icon}
              {isBell && notifBadge > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  background: 'var(--lime)', color: '#000',
                  borderRadius: 9, minWidth: 16, height: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, padding: '0 2px',
                }}>{notifBadge > 9 ? '9+' : notifBadge}</span>
              )}
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
