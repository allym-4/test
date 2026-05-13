import { useState } from 'react'

const PENDING_POSTS = [
  { id: 1, author: 'Lily Anderson', avatar: 'LA', group: 'Season 3 Students', time: '10 min ago', text: 'Has anyone tried the new grip aid? Thinking about buying some before our next class 🤔', likes: 0, comments: 0 },
  { id: 2, author: 'Zara Nguyen', avatar: 'ZN', group: 'Pole Foundations', time: '32 min ago', text: 'Just wanted to say how much I loved last week\'s class!! Chloe is an incredible teacher 🙌', likes: 0, comments: 0 },
  { id: 3, author: 'Rachel Kim', avatar: 'RK', group: 'General', time: '1 hour ago', text: 'Anyone keen to do an open practice session this weekend? I\'ll be in the studio Saturday arvo', likes: 0, comments: 0 },
]

const GROUPS = [
  { id: 1, name: 'Season 3 Students', members: 94, posts: 38, active: true, notifications: true },
  { id: 2, name: 'Pole Foundations', members: 22, posts: 14, active: true, notifications: true },
  { id: 3, name: 'Intermediate Flows', members: 18, posts: 21, active: true, notifications: false },
  { id: 4, name: 'Flexibility & Conditioning', members: 15, posts: 9, active: true, notifications: true },
  { id: 5, name: 'Advanced Technique', members: 12, posts: 17, active: true, notifications: false },
  { id: 6, name: 'General', members: 94, posts: 102, active: true, notifications: true },
  { id: 7, name: 'Alumni', members: 46, posts: 8, active: false, notifications: false },
]

function Toggle({ on }) {
  const [val, setVal] = useState(on)
  return (
    <div onClick={() => setVal(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, background: val ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: val ? 19 : 3, transition: 'left 0.2s' }} />
    </div>
  )
}

export default function AdminCommunity() {
  const [tab, setTab] = useState('pending')
  const [dismissed, setDismissed] = useState([])

  const visiblePending = PENDING_POSTS.filter(p => !dismissed.includes(p.id))

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Community</div>
          <div className="page-sub">Student groups and post moderation</div>
        </div>
        <button className="btn btn-lime btn-sm">+ New Group</button>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {[
          ['Groups', GROUPS.filter(g => g.active).length, 'kpi-lime'],
          ['Total Members', 94, 'kpi-lav'],
          ['Pending Posts', visiblePending.length, visiblePending.length > 0 ? 'kpi-amber' : 'kpi-lime'],
          ['Posts This Week', 24, 'kpi-lime'],
        ].map(([label, val, cls]) => (
          <div key={label} className={`kpi ${cls}`}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{val}</div>
          </div>
        ))}
      </div>

      <div className="subtabs" style={{ marginBottom: 20 }}>
        {[['pending', `Pending Approval (${visiblePending.length})`], ['groups', 'Groups'], ['all_posts', 'All Posts']].map(([key, label]) => (
          <div key={key} className={`subtab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</div>
        ))}
      </div>

      {tab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visiblePending.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <div>No posts pending approval</div>
            </div>
          ) : visiblePending.map(post => (
            <div key={post.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--lav)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{post.avatar}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{post.author}</div>
                  <div style={{ fontSize: 11, color: 'var(--grey)' }}>
                    <span style={{ color: 'var(--lav)' }}>{post.group}</span> · {post.time}
                  </div>
                </div>
                <span className="tag tag-amber" style={{ fontSize: 9, marginLeft: 'auto' }}>Pending</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 14, paddingLeft: 46 }}>{post.text}</div>
              <div style={{ display: 'flex', gap: 8, paddingLeft: 46 }}>
                <button className="btn btn-lime btn-sm" onClick={() => setDismissed(d => [...d, post.id])}>Approve</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setDismissed(d => [...d, post.id])}>Decline</button>
                <button className="btn btn-ghost btn-sm">Edit & Approve</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'groups' && (
        <div className="tbl-section">
          <table>
            <thead>
              <tr><th>Group</th><th>Members</th><th>Total Posts</th><th>Status</th><th>Notifications</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {GROUPS.map(g => (
                <tr key={g.id}>
                  <td><b>{g.name}</b></td>
                  <td style={{ color: 'var(--grey)', fontSize: 12 }}>{g.members}</td>
                  <td style={{ color: 'var(--grey)', fontSize: 12 }}>{g.posts}</td>
                  <td><span className={`tag ${g.active ? 'tag-lime' : 'tag-grey'}`} style={{ fontSize: 10 }}>{g.active ? 'Active' : 'Archived'}</span></td>
                  <td><Toggle on={g.notifications} /></td>
                  <td>
                    <button className="btn btn-ghost btn-xs" style={{ marginRight: 4 }}>View</button>
                    <button className="btn btn-ghost btn-xs">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'all_posts' && (
        <div style={{ color: 'var(--grey)', textAlign: 'center', padding: '48px 0', fontSize: 13 }}>
          All approved posts across all groups would appear here.
        </div>
      )}
    </div>
  )
}
