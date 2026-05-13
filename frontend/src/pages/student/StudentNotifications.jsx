import { useState } from 'react'

const NOTIFICATIONS = [
  { id: 1, icon: '📅', title: 'Class reminder', body: 'You have Pole Foundations tomorrow at 6:00 PM at The Box.', time: '1 hour ago', read: false, type: 'reminder' },
  { id: 2, icon: '🔔', title: 'Waitlist spot available', body: "A spot has opened up in Intermediate Flows on Wednesday 6pm. You have 12 hours to accept.", time: '3 hours ago', read: false, type: 'waitlist', action: 'Accept Spot' },
  { id: 3, icon: '💳', title: 'Payment received', body: "Your payment of $180.00 for Season 3 enrolment has been received. Thank you!", time: '2 days ago', read: true, type: 'payment' },
  { id: 4, icon: '📋', title: 'Form reminder', body: 'Please complete your PAR-Q health questionnaire before your next class.', time: '3 days ago', read: true, type: 'form', action: 'Complete Now' },
  { id: 5, icon: '🎉', title: 'Season 4 enrolment opens soon', body: 'Season 4 (11 Aug – 26 Sep) enrolments open on 14 July for current students. Save the date!', time: '5 days ago', read: true, type: 'info' },
  { id: 6, icon: '💬', title: 'New message from Mimi', body: "Hi! Just wanted to check in — how are you finding Season 3?", time: '1 week ago', read: true, type: 'message' },
  { id: 7, icon: '⚠️', title: 'Class cancelled', body: 'Thursday 7pm Pole Foundations has been cancelled due to unforeseen circumstances. A makeup credit has been added to your account.', time: '1 week ago', read: true, type: 'cancellation' },
]

const TYPE_COLORS = {
  reminder: 'var(--lav)',
  waitlist: 'var(--lime)',
  payment: 'var(--lime)',
  form: 'var(--amber)',
  info: 'var(--grey)',
  message: 'var(--lav)',
  cancellation: 'var(--amber)',
}

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState(NOTIFICATIONS)

  const unreadCount = notifications.filter(n => !n.read).length

  function markAllRead() {
    setNotifications(ns => ns.map(n => ({ ...n, read: true })))
  }

  function markRead(id) {
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Notifications</div>
          <div style={{ fontSize: 13, color: 'var(--grey)' }}>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</div>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
          <div>No notifications yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              style={{
                background: n.read ? 'var(--card)' : 'rgba(204,255,0,0.04)',
                border: `1px solid ${n.read ? 'var(--border)' : 'rgba(204,255,0,0.15)'}`,
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{n.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                  <div style={{ fontWeight: n.read ? 500 : 700, fontSize: 14 }}>{n.title}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginLeft: 12 }}>
                    <span style={{ fontSize: 10, color: 'var(--grey)' }}>{n.time}</span>
                    {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--lime)' }} />}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.6, marginBottom: n.action ? 10 : 0 }}>{n.body}</div>
                {n.action && (
                  <button className="btn btn-lime btn-sm" style={{ fontSize: 11 }}>{n.action}</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
