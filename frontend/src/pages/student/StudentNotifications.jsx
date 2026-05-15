import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { notifications as notificationsApi, announcements as announcementsApi } from '../../api'

const TYPE_ICONS = {
  reminder:     '📅',
  waitlist:     '🔔',
  payment:      '💳',
  form:         '📋',
  info:         '🎉',
  message:      '💬',
  cancellation: '⚠️',
  billing:      '💰',
  success:      '✅',
}

export default function StudentNotifications() {
  const { data, loading, refetch } = useApi(() => notificationsApi.list())
  const { data: annData, refetch: refetchAnn } = useApi(() => announcementsApi.list({ note_type: 'announcement' }))
  const [acknowledging, setAcknowledging] = useState({})

  const notifs = data?.results || data || []
  const allAnns = annData?.results || annData || []
  const pendingAnns = allAnns.filter(a => a.requires_acknowledgement && !a.is_acknowledged)
  const unread = notifs.filter(n => !n.read)

  async function markAllRead() {
    await notificationsApi.markRead(null)
    refetch()
  }

  async function markRead(id) {
    await notificationsApi.markRead([id])
    refetch()
  }

  async function acknowledgeAnn(id) {
    setAcknowledging(s => ({ ...s, [id]: true }))
    try {
      await announcementsApi.acknowledge(id)
      refetchAnn()
    } finally {
      setAcknowledging(s => ({ ...s, [id]: false }))
    }
  }

  const totalUnread = unread.length + pendingAnns.length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Notifications</div>
          <div style={{ fontSize: 13, color: 'var(--grey)' }}>
            {loading ? '…' : totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
          </div>
        </div>
        {unread.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
        )}
      </div>

      {/* Pending announcements requiring acknowledgement */}
      {pendingAnns.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--amber)', fontWeight: 600, marginBottom: 10 }}>
            Requires Acknowledgement
          </div>
          {pendingAnns.map(a => (
            <div key={`ann-${a.id}`} style={{
              background: 'rgba(255,170,0,0.07)',
              border: '1px solid rgba(255,170,0,0.3)',
              borderRadius: 12,
              padding: '14px 16px',
              marginBottom: 8,
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>📢</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--amber)', color: '#000', whiteSpace: 'nowrap', flexShrink: 0, fontSize: 11 }}
                    onClick={() => acknowledgeAnn(a.id)}
                    disabled={acknowledging[a.id]}
                  >
                    {acknowledging[a.id] ? '…' : 'Acknowledge'}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.6 }}>{a.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : notifs.length === 0 && pendingAnns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--grey)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No notifications yet</div>
          <div style={{ fontSize: 12 }}>You're all up to date.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifs.map(n => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              style={{
                background: n.read ? 'var(--card)' : 'rgba(204,255,0,0.04)',
                border: `1px solid ${n.read ? 'var(--border)' : 'rgba(204,255,0,0.15)'}`,
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                cursor: n.read ? 'default' : 'pointer',
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{TYPE_ICONS[n.notification_type] || '🔔'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                  <div style={{ fontWeight: n.read ? 500 : 700, fontSize: 14 }}>{n.title}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginLeft: 12 }}>
                    <span style={{ fontSize: 10, color: 'var(--grey)' }}>
                      {new Date(n.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </span>
                    {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--lime)' }} />}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.6, marginBottom: n.action_label ? 10 : 0 }}>{n.body}</div>
                {n.action_label && n.action_url && (
                  <a href={n.action_url} className="btn btn-lime btn-sm" style={{ fontSize: 11, textDecoration: 'none', display: 'inline-block' }}>{n.action_label}</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
