import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { notifications as notificationsApi } from '../api'

export default function InstructorNotifications() {
  const { data, loading, refetch } = useApi(() => notificationsApi.list())
  const [escalating, setEscalating] = useState({})
  const [escalated, setEscalated] = useState({})

  const notifs = data?.results || data || []
  const unread = notifs.filter(n => !n.read)

  async function markRead(id) {
    await notificationsApi.markRead([id])
    refetch()
  }

  async function markAllRead() {
    await notificationsApi.markRead(null)
    refetch()
  }

  async function escalate(id) {
    setEscalating(s => ({ ...s, [id]: true }))
    try {
      await notificationsApi.escalate(id)
      setEscalated(s => ({ ...s, [id]: true }))
      refetch()
    } finally {
      setEscalating(s => ({ ...s, [id]: false }))
    }
  }

  return (
    <div style={{ maxWidth: 680, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26, marginBottom: 4 }}>Notifications</div>
          <div style={{ fontSize: 13, color: 'var(--grey)' }}>
            {loading ? '…' : unread.length > 0 ? `${unread.length} unread` : 'All caught up'}
          </div>
        </div>
        {unread.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : notifs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--grey)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No notifications</div>
          <div style={{ fontSize: 12 }}>You're all up to date.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifs.map(n => {
            const isAccessIssue = n.notification_type === 'warning'
            return (
              <div
                key={n.id}
                onClick={() => !n.read && !isAccessIssue && markRead(n.id)}
                style={{
                  background: n.read ? 'var(--card)' : isAccessIssue ? 'rgba(255,80,80,0.06)' : 'rgba(204,255,0,0.04)',
                  border: `1px solid ${n.read ? 'var(--border)' : isAccessIssue ? 'rgba(255,80,80,0.25)' : 'rgba(204,255,0,0.15)'}`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  cursor: (!n.read && !isAccessIssue) ? 'pointer' : 'default',
                }}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{isAccessIssue ? '🚨' : '🔔'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                    <div style={{ fontWeight: n.read ? 500 : 700, fontSize: 14 }}>{n.title}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginLeft: 12 }}>
                      <span style={{ fontSize: 10, color: 'var(--grey)' }}>
                        {new Date(n.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </span>
                      {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: isAccessIssue ? '#ff5050' : 'var(--lime)' }} />}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.6, marginBottom: isAccessIssue ? 10 : 0 }}>{n.body}</div>
                  {isAccessIssue && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {!n.read && (
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => markRead(n.id)}>
                          Mark read
                        </button>
                      )}
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: 11, background: escalated[n.id] ? 'var(--border)' : '#ff5050', color: '#fff', border: 'none' }}
                        onClick={() => escalate(n.id)}
                        disabled={escalating[n.id] || escalated[n.id]}
                      >
                        {escalated[n.id] ? 'Escalated' : escalating[n.id] ? '…' : 'Escalate to Mimi & Chloe'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
