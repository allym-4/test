import { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import client from '../api/client'
import { helpdesk, users, enrolments } from '../api'
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
      { to: '/admin/students', label: 'Students',  icon: '👤' },
      { to: '/admin/staff',    label: 'Staff',     icon: '🧑‍🏫' },
      { to: '/admin/leads',    label: 'Leads',     icon: '🎯' },
      { to: '/admin/tags',     label: 'Tags',      icon: '🏷' },
    ]
  },
  {
    divider: true,
    label: 'Classes',
    items: [
      { to: '/admin/timetable',  label: 'Timetable',    icon: '📅' },
      { to: '/admin/classes',    label: 'Classes',      icon: '📚' },
      { to: '/admin/waitlist',   label: 'Waitlist',     icon: '⏳' },
      { to: '/admin/trials',    label: 'Trials',       icon: '🎯' },
      { to: '/admin/seasons',    label: 'Seasons',      icon: '🌀' },
      { to: '/admin/practice',   label: 'Practice Time',icon: '🏋️' },
      { to: '/admin/categories', label: 'Categories',   icon: '🗂' },
      { to: '/admin/skills',     label: 'Skill Lists',  icon: '✅' },
      { to: '/admin/rooms',      label: 'Rooms',        icon: '🏢' },
    ]
  },
  {
    divider: true,
    label: 'Finance',
    items: [
      { to: '/admin/billing',       label: 'Billing',       icon: '💳' },
      { to: '/admin/payment-plans', label: 'Payment Plans', icon: '📋' },
      { to: '/admin/bookings',      label: 'Bookings',      icon: '🎟' },
      { to: '/admin/memberships',   label: 'Memberships',   icon: '🎫' },
      { to: '/admin/packages',      label: 'Packages',      icon: '📦' },
      { to: '/admin/offers',        label: 'Offers',        icon: '🏷' },
      { to: '/admin/reporting',     label: 'Analytics',     icon: '📊' },
    ]
  },
  {
    divider: true,
    label: 'Community',
    items: [
      { to: '/admin/messages',        label: 'Messages',        icon: '📩', badge: 'messages' },
      { to: '/admin/community',       label: 'Community',       icon: '💬' },
      { to: '/admin/marketing',       label: 'Marketing',       icon: '📣' },
      { to: '/admin/recommendations', label: 'Recommendations', icon: '💡' },
      { to: '/admin/surveys',         label: 'Surveys',         icon: '📝' },
      { to: '/admin/challenges',      label: 'Challenges',      icon: '🏆' },
      { to: '/admin/helpdesk',        label: 'Helpdesk',        icon: '🎧', badge: 'helpdesk' },
    ]
  },
  {
    divider: true,
    label: 'Ops',
    items: [
      { to: '/admin/retail',       label: 'Retail',        icon: '🛍' },
      { to: '/admin/lockers',      label: 'Lockers',       icon: '🔐' },
      { to: '/admin/kisi',         label: 'Kisi Access',   icon: '🔑' },
      { to: '/admin/activity-log', label: 'Activity Log',  icon: '📋' },
      { to: '/admin/assistant',    label: 'Assistant',     icon: '🤖' },
      { to: '/admin/automations',  label: 'Automations',   icon: '🔔' },
      { to: '/admin/settings',     label: 'Settings',      icon: '⚙️' },
    ]
  },
]

const BADGE_STYLE = {
  position: 'absolute',
  top: -4,
  right: -4,
  background: 'var(--red)',
  color: '#fff',
  fontSize: 9,
  fontWeight: 700,
  borderRadius: '50%',
  width: 16,
  height: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export default function AdminShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  // ── Feature 1: Global Search ─────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const searchInputRef = useRef(null)
  const searchDebounceRef = useRef(null)

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen) {
      setSearchQuery('')
      setSearchResults([])
    }
  }, [searchOpen])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') setSearchOpen(false)
    }
    if (searchOpen) {
      document.addEventListener('keydown', onKeyDown)
      return () => document.removeEventListener('keydown', onKeyDown)
    }
  }, [searchOpen])

  const handleSearchChange = useCallback((e) => {
    const q = e.target.value
    setSearchQuery(q)
    clearTimeout(searchDebounceRef.current)
    if (!q.trim()) { setSearchResults([]); return }
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await users.list({ search: q, role: 'student' })
        const items = res.data?.results || res.data || []
        setSearchResults(items)
      } catch {
        setSearchResults([])
      }
    }, 300)
  }, [])

  function handleSearchResultClick() {
    setSearchOpen(false)
    navigate('/admin/students')
  }

  // ── Feature 2: Check-in Kiosk ────────────────────────────────────────────
  const [kioskOpen, setKioskOpen] = useState(false)
  const [kioskQuery, setKioskQuery] = useState('')
  const [kioskResults, setKioskResults] = useState([])
  const [kioskToast, setKioskToast] = useState('')
  const kioskDebounceRef = useRef(null)

  useEffect(() => {
    if (!kioskOpen) {
      setKioskQuery('')
      setKioskResults([])
      setKioskToast('')
    }
  }, [kioskOpen])

  const handleKioskSearch = useCallback((e) => {
    const q = e.target.value
    setKioskQuery(q)
    clearTimeout(kioskDebounceRef.current)
    if (!q.trim()) { setKioskResults([]); return }
    kioskDebounceRef.current = setTimeout(async () => {
      try {
        const res = await users.list({ search: q, role: 'student' })
        const items = res.data?.results || res.data || []
        setKioskResults(items)
      } catch {
        setKioskResults([])
      }
    }, 300)
  }, [])

  async function handleCheckIn(studentId) {
    try {
      await client.post('/api/attendance/checkin/', { student_id: studentId })
      setKioskToast('✓ Checked in')
    } catch {
      setKioskToast('✗ Check-in failed')
    }
    setTimeout(() => setKioskToast(''), 3000)
  }

  // ── Feature 3: Unread badges ─────────────────────────────────────────────
  const { data: convData } = useApi(() => helpdesk.conversations(), [])
  const { data: ticketData } = useApi(() => client.get('/api/helpdesk/tickets/?status=open'), [])
  const { data: changeReqData } = useApi(() => client.get('/api/enrolments/change-requests/?status=pending'), [])

  const messagesUnread = (() => {
    const items = convData?.results || convData || []
    return items.filter(c => (c.unread_count ?? 0) > 0).length
  })()

  const helpdeskUnread = (() => {
    const openTickets = (() => {
      const items = ticketData?.results || ticketData || []
      return Array.isArray(items) ? items.length : 0
    })()
    const pendingChangeRequests = (() => {
      const items = changeReqData?.results || changeReqData || []
      return Array.isArray(items) ? items.length : 0
    })()
    return openTickets + pendingChangeRequests
  })()

  const badgeCounts = { messages: messagesUnread, helpdesk: helpdeskUnread }

  // ── Auth ─────────────────────────────────────────────────────────────────
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
              {group.items.map(({ to, label, icon, end, badge }) => {
                const count = badge ? badgeCounts[badge] : 0
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="admin-nav-icon">{icon}</span>
                    <span style={{ position: 'relative' }}>
                      {label}
                      {count > 0 && (
                        <span style={BADGE_STYLE}>{count > 99 ? '99+' : count}</span>
                      )}
                    </span>
                  </NavLink>
                )
              })}
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
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setSearchOpen(true)}>🔍 Search</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setKioskOpen(true)}>📱 Check-in Kiosk</button>
        </div>
      </div>

      {/* ── Global Search Overlay ─────────────────────────────────────── */}
      {searchOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 120 }}
          onClick={(e) => { if (e.target === e.currentTarget) setSearchOpen(false) }}
        >
          <div style={{ width: '100%', maxWidth: 600, padding: '0 16px' }}>
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search students…"
              style={{ fontSize: 20, width: '100%', maxWidth: 600, padding: '12px 16px', borderRadius: 8, border: '2px solid var(--lav)', background: '#1a1a2e', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
            />
            {searchResults.length > 0 && (
              <div style={{ marginTop: 8, background: '#1a1a2e', borderRadius: 8, border: '1px solid var(--lav)', overflow: 'hidden' }}>
                {searchResults.map((s) => (
                  <div
                    key={s.id}
                    onClick={handleSearchResultClick}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div className="avatar" style={{ background: 'var(--lav)', fontSize: 13, flexShrink: 0 }}>
                      {s.first_name?.[0] || s.email?.[0] || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{s.display_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.username}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey)' }}>{s.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {searchQuery && searchResults.length === 0 && (
              <div style={{ marginTop: 8, color: 'var(--grey)', fontSize: 14, textAlign: 'center' }}>No students found</div>
            )}
          </div>
        </div>
      )}

      {/* ── Check-in Kiosk Modal ──────────────────────────────────────── */}
      {kioskOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setKioskOpen(false) }}
        >
          <div style={{ background: '#1a1a2e', borderRadius: 12, border: '1px solid var(--lav)', width: '100%', maxWidth: 480, padding: 24, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Check-in Kiosk</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setKioskOpen(false)}>✕</button>
            </div>
            {kioskToast && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(0,200,100,0.15)', border: '1px solid rgba(0,200,100,0.4)', borderRadius: 6, color: '#0c0', fontSize: 14 }}>
                {kioskToast}
              </div>
            )}
            <input
              value={kioskQuery}
              onChange={handleKioskSearch}
              placeholder="Search student name or email…"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--lav)', background: '#0d0d1a', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
            />
            <div>
              {kioskResults.map((s) => (
                <div
                  key={s.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="avatar" style={{ background: 'var(--amber)', fontSize: 13, flexShrink: 0 }}>
                    {s.first_name?.[0] || s.email?.[0] || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.display_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.username}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey)' }}>{s.email}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--lime)', flexShrink: 0 }} onClick={() => handleCheckIn(s.id)}>
                    Check In
                  </button>
                </div>
              ))}
              {kioskQuery && kioskResults.length === 0 && (
                <div style={{ color: 'var(--grey)', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>No students found</div>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
