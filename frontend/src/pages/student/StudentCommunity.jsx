import { useState } from 'react'

const GROUPS = [
  { id: 1, name: 'Season 3 Students', members: 94, lastPost: '2 min ago', unread: 3, preview: 'Lily Anderson: Has anyone tried the new grip aid?', active: true },
  { id: 2, name: 'Pole Foundations', members: 22, lastPost: '1 hour ago', unread: 0, preview: 'Zara Nguyen: See you all Wednesday! 🙌', active: true },
  { id: 3, name: 'General', members: 94, lastPost: '3 hours ago', unread: 1, preview: 'Rachel Kim: Anyone keen for open practice Saturday?', active: true },
  { id: 4, name: 'Flexibility & Conditioning', members: 15, lastPost: '1 day ago', unread: 0, preview: 'Mia Torres: That workshop was AMAZING', active: true },
]

const POSTS = {
  1: [
    { id: 1, author: 'Lily Anderson', avatar: 'LA', time: '2 min ago', text: 'Has anyone tried the new grip aid? Thinking about buying some before our next class 🤔', likes: 4, comments: 2 },
    { id: 2, author: 'Katie Wu', avatar: 'KW', time: '3 hours ago', text: 'Just had the most amazing class!! My shoulder mount is finally clicking 🎉🎉', likes: 12, comments: 5 },
    { id: 3, author: 'Bianca Forde', avatar: 'BF', time: '1 day ago', text: 'Reminder that Chloe said we can use the studio for open practice on Saturday 11am–1pm if anyone wants to work on choreo 💪', likes: 8, comments: 3 },
    { id: 4, author: 'Mimi (Admin)', avatar: '🌟', time: '2 days ago', text: 'Season 4 enrolments will open on 14 July for all current Season 3 students. Keep an eye on your email!', likes: 22, comments: 1 },
  ],
}

export default function StudentCommunity() {
  const [activeGroup, setActiveGroup] = useState(GROUPS[0])
  const [newPost, setNewPost] = useState('')
  const [likedPosts, setLikedPosts] = useState([])

  const posts = POSTS[activeGroup?.id] || []

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Community</div>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>Connect with your fellow students</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
        {/* Group list */}
        <div>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 10, fontWeight: 600 }}>Your Groups</div>
          {GROUPS.map(g => (
            <div key={g.id} onClick={() => setActiveGroup(g)} style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', marginBottom: 6, background: activeGroup?.id === g.id ? '#1a1a1a' : 'transparent', border: `1px solid ${activeGroup?.id === g.id ? 'var(--border)' : 'transparent'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{g.name}</div>
                {g.unread > 0 && (
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--lime)', color: '#000', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{g.unread}</div>
                )}
              </div>
              <div style={{ fontSize: 10, color: 'var(--grey)', marginBottom: 4 }}>{g.members} members</div>
              <div style={{ fontSize: 11, color: 'var(--grey)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.preview}</div>
            </div>
          ))}
        </div>

        {/* Posts */}
        <div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
            <textarea
              rows={2}
              placeholder={`Share something with ${activeGroup?.name}…`}
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
              style={{ width: '100%', background: '#111', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '10px 12px', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-lime btn-sm" onClick={() => setNewPost('')} disabled={!newPost.trim()}>Post</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {posts.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--grey)', padding: 40, fontSize: 13 }}>No posts yet. Be the first to share!</div>
            ) : posts.map(post => (
              <div key={post.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: post.author.includes('Admin') ? 'var(--lime)' : 'var(--lav)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: post.author.includes('Admin') ? 16 : 12, fontWeight: 700, flexShrink: 0 }}>
                    {typeof post.avatar === 'string' && post.avatar.length <= 2 ? post.avatar : post.avatar}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{post.author}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)' }}>{post.time}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>{post.text}</div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                  <button
                    onClick={() => setLikedPosts(l => l.includes(post.id) ? l.filter(x => x !== post.id) : [...l, post.id])}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: likedPosts.includes(post.id) ? 'var(--lime)' : 'var(--grey)', fontSize: 12, padding: 0 }}
                  >
                    ♥ {post.likes + (likedPosts.includes(post.id) ? 1 : 0)}
                  </button>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey)', fontSize: 12, padding: 0 }}>
                    💬 {post.comments}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
