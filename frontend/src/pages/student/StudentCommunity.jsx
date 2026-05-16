import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import client from '../../api/client'

export default function StudentCommunity() {
  const { user } = useAuth()

  // Fetch joined groups
  const { data: groupData, refetch: refetchGroups } = useApi(() => client.get('/api/community/groups/'), [])
  const allGroups = groupData?.results || groupData || []
  const joinedGroups = allGroups.filter(g => g.is_member || g.joined || g.member)
  const discoverGroups = allGroups.filter(g => !g.is_member && !g.joined && !g.member)

  const [activeGroupId, setActiveGroupId] = useState(null)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [posts, setPosts] = useState({})
  const [msgInput, setMsgInput] = useState('')
  const [sending, setSending] = useState(false)
  const [joiningId, setJoiningId] = useState(null)
  const chatEndRef = useRef(null)

  // Set default active group
  useEffect(() => {
    if (joinedGroups.length && !activeGroupId) {
      setActiveGroupId(joinedGroups[0].id)
    }
  }, [joinedGroups.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch posts for active group
  useEffect(() => {
    if (!activeGroupId) return
    client.get(`/api/community/groups/${activeGroupId}/posts/`)
      .then(res => {
        const data = res.data?.results || res.data || []
        setPosts(prev => ({ ...prev, [activeGroupId]: data }))
      })
      .catch(() => {
        setPosts(prev => ({ ...prev, [activeGroupId]: [] }))
      })
  }, [activeGroupId])

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [posts, activeGroupId])

  function sendMessage() {
    if (!msgInput.trim() || !activeGroupId || sending) return
    const text = msgInput.trim()
    setMsgInput('')
    const optimistic = {
      id: Date.now(),
      body: text,
      author: user?.first_name || 'Me',
      author_id: user?.id,
      created_at: new Date().toISOString(),
      _mine: true,
    }
    setPosts(prev => ({
      ...prev,
      [activeGroupId]: [...(prev[activeGroupId] || []), optimistic],
    }))
    setSending(true)
    client.post(`/api/community/groups/${activeGroupId}/posts/`, { body: text })
      .catch(() => {})
      .finally(() => setSending(false))
  }

  function joinGroup(groupId) {
    setJoiningId(groupId)
    client.post(`/api/community/groups/${groupId}/join/`)
      .then(() => { refetchGroups(); setJoiningId(null) })
      .catch(() => setJoiningId(null))
  }

  function leaveGroup(groupId) {
    client.post(`/api/community/groups/${groupId}/leave/`)
      .then(() => { refetchGroups(); setActiveGroupId(null) })
      .catch(() => {})
  }

  const activeGroup = joinedGroups.find(g => g.id === activeGroupId)
  const activePosts = posts[activeGroupId] || []

  return (
    <div style={{ paddingBottom: 24 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Community</div>
          <div className="page-sub">Connect with your fellow students</div>
        </div>
      </div>

      {joinedGroups.length === 0 && discoverGroups.length === 0 ? (
        <div className="empty-state">No groups yet — your studio will set these up</div>
      ) : (
        <div className="split-layout" style={{ minHeight: 520, border: '1px solid var(--border)', borderRadius: 12 }}>

          {/* Left sidebar */}
          <div
            className={`split-sidebar${mobilePanelOpen ? ' mobile-panel-open' : ''}`}
            style={{
              width: 240,
              minWidth: 240,
              borderRight: '1px solid var(--border)',
            }}
          >
            {/* Joined groups */}
            <div style={{ padding: '14px 12px 6px' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', fontWeight: 600, marginBottom: 8 }}>
                Groups
              </div>

              {joinedGroups.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--grey)', padding: '8px 0' }}>No groups joined yet</div>
              ) : (
                joinedGroups.map(g => {
                  const isActive = g.id === activeGroupId
                  const memberCount = g.member_count ?? g.members_count ?? g.members ?? ''
                  const unread = g.unread_count ?? g.unread ?? 0
                  return (
                    <div
                      key={g.id}
                      onClick={() => { setActiveGroupId(g.id); setMobilePanelOpen(true) }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        marginBottom: 2,
                        background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                        borderLeft: `3px solid ${isActive ? 'var(--lime)' : 'transparent'}`,
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {g.name}
                        </div>
                        {unread > 0 && (
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: 'var(--lime)',
                              color: '#000',
                              fontSize: 9,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginLeft: 6,
                            }}
                          >
                            {unread}
                          </div>
                        )}
                      </div>
                      {memberCount !== '' && (
                        <div style={{ fontSize: 11, color: 'var(--grey)' }}>{memberCount} members</div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Discover section */}
            {discoverGroups.length > 0 && (
              <div style={{ padding: '14px 12px 12px', borderTop: '1px solid var(--border)', marginTop: 8 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', fontWeight: 600, marginBottom: 8 }}>
                  Discover Groups
                </div>
                {discoverGroups.map(g => {
                  const memberCount = g.member_count ?? g.members_count ?? g.members ?? ''
                  return (
                    <div
                      key={g.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        marginBottom: 2,
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{g.name}</div>
                      {memberCount !== '' && (
                        <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 6 }}>{memberCount} members</div>
                      )}
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: 11, padding: '3px 10px' }}
                        onClick={() => joinGroup(g.id)}
                        disabled={joiningId === g.id}
                      >
                        {joiningId === g.id ? 'Joining…' : 'Join'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right pane */}
          <div className={`split-main${!mobilePanelOpen ? ' mobile-list-showing' : ''}`}>
            {!activeGroup ? (
              <div className="empty-state" style={{ margin: 'auto' }}>Select a group to start chatting</div>
            ) : (
              <>
                {/* Group header */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                  }}
                >
                  <button className="mobile-back-btn" onClick={() => setMobilePanelOpen(false)}>← Back</button>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{activeGroup.name}</div>
                    {(activeGroup.member_count ?? activeGroup.members_count ?? activeGroup.members) != null && (
                      <div style={{ fontSize: 11, color: 'var(--grey)' }}>
                        {activeGroup.member_count ?? activeGroup.members_count ?? activeGroup.members} members
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11, color: '#f87171', borderColor: '#f87171' }}
                    onClick={() => leaveGroup(activeGroup.id)}
                  >
                    Leave group
                  </button>
                </div>

                {/* Message thread */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {activePosts.length === 0 ? (
                    <div className="empty-state" style={{ margin: 'auto' }}>
                      No messages yet — say hi to the group!
                    </div>
                  ) : (
                    activePosts.map(post => {
                      const mine = post._mine || post.author_id === user?.id || post.user_id === user?.id || post.user === user?.id
                      const authorName = post.author || post.author_name || post.user_display || 'Student'
                      const initial = authorName.charAt(0).toUpperCase()
                      const ts = post.created_at
                        ? new Date(post.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
                        : post.time || ''

                      return (
                        <div
                          key={post.id}
                          style={{
                            display: 'flex',
                            flexDirection: mine ? 'row-reverse' : 'row',
                            alignItems: 'flex-end',
                            gap: 8,
                          }}
                        >
                          {/* Avatar */}
                          {!mine && (
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                background: 'var(--lav)',
                                color: '#000',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {initial}
                            </div>
                          )}

                          {/* Bubble + meta */}
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: mine ? 'flex-end' : 'flex-start',
                              maxWidth: '75%',
                            }}
                          >
                            {!mine && (
                              <div style={{ fontSize: 10, color: 'var(--grey)', marginBottom: 3, marginLeft: 4 }}>
                                {authorName}
                              </div>
                            )}
                            <div
                              style={{
                                background: mine ? 'rgba(204,255,0,0.15)' : '#1a1a1a',
                                border: mine ? '1px solid rgba(204,255,0,0.2)' : '1px solid var(--border)',
                                borderRadius: 12,
                                padding: '8px 12px',
                                fontSize: 13,
                                lineHeight: 1.5,
                              }}
                            >
                              {post.body || post.text || post.content}
                            </div>
                            {ts && (
                              <div style={{ fontSize: 10, color: 'var(--grey)', marginTop: 3, marginLeft: 4, marginRight: 4 }}>
                                {ts}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Message input */}
                <div
                  style={{
                    borderTop: '1px solid var(--border)',
                    padding: '12px 14px',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <label
                    className="btn btn-ghost btn-sm"
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                    title="Upload photo or video"
                  >
                    <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={() => {}} />
                    📎
                  </label>
                  <input
                    type="text"
                    placeholder={`Message ${activeGroup.name}…`}
                    value={msgInput}
                    onChange={e => setMsgInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }}
                    style={{
                      flex: 1,
                      background: '#111',
                      border: '1px solid #2a2a2a',
                      borderRadius: 8,
                      color: 'var(--white)',
                      padding: '10px 14px',
                      fontSize: 13,
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                  <button
                    className="btn btn-lime btn-sm"
                    onClick={sendMessage}
                    disabled={!msgInput.trim() || sending}
                    style={{ flexShrink: 0 }}
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
