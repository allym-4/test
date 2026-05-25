import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { announcements, community, users as usersApi, seasons as seasonsApi } from '../../api'
import '../StudentsPage.css'

const LEVEL_OPTIONS = [1, 2, 3, 4, 5, 6]

function Toggle({ value, onChange, color = 'var(--lime)' }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 36, height: 20, borderRadius: 10, background: value ? color : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: value ? 19 : 3, transition: 'left 0.2s' }} />
    </div>
  )
}

function AnnouncementModal({ existing, onClose, onSaved }) {
  const [title, setTitle] = useState(existing?.title || '')
  const [body, setBody] = useState(existing?.body || '')
  const [pinned, setPinned] = useState(existing?.is_pinned || false)
  const [requiresAck, setRequiresAck] = useState(existing?.requires_acknowledgement || false)
  const [showAsModal, setShowAsModal] = useState(existing?.show_as_modal || false)
  const [ctaLabel, setCtaLabel] = useState(existing?.cta_label || '')
  const [ctaUrl, setCtaUrl] = useState(existing?.cta_url || '')
  const [audience, setAudience] = useState(existing?.audience || 'all')
  const [audienceStudents, setAudienceStudents] = useState(existing?.audience_students || [])
  const [audienceSeason, setAudienceSeason] = useState(existing?.audience_season || '')
  const [audienceLevels, setAudienceLevels] = useState(existing?.audience_levels || [])
  const [studentSearch, setStudentSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: usersData } = useApi(() => usersApi.list({ role: 'student', limit: 500 }), [])
  const { data: seasonsData } = useApi(() => seasonsApi.list(), [])
  const allStudents = usersData?.results || usersData || []
  const allSeasons = seasonsData?.results || seasonsData || []

  const filteredStudents = studentSearch
    ? allStudents.filter(u => `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(studentSearch.toLowerCase()))
    : allStudents.slice(0, 20)

  function toggleLevel(level) {
    setAudienceLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    )
  }

  function toggleStudent(id) {
    setAudienceStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  async function submit(e) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setSaving(true)
    try {
      const payload = {
        title, body,
        is_pinned: pinned,
        requires_acknowledgement: requiresAck,
        show_as_modal: showAsModal,
        cta_label: ctaLabel,
        cta_url: ctaUrl,
        audience,
        audience_students: audience === 'specific' ? audienceStudents : [],
        audience_season: audience === 'enrolled_season' ? (audienceSeason || null) : null,
        audience_levels: audience === 'level' ? audienceLevels : [],
      }
      if (existing) {
        await announcements.update(existing.id, payload)
      } else {
        await announcements.create(payload)
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 560 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{existing ? 'Edit Announcement' : 'New Announcement'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <form onSubmit={submit}>
            <div className="field"><label>Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title…" required /></div>
            <div className="field">
              <label>Message</label>
              <textarea rows={5} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message… Use [link text](url) for clickable links." required style={{ width: '100%', boxSizing: 'border-box' }} />
              <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Tip: Use <code style={{ background: '#1a1a1a', padding: '1px 4px', borderRadius: 3 }}>[link text](url)</code> to add clickable links.</div>
            </div>

            {/* Audience */}
            <div className="field">
              <label>Audience</label>
              <select value={audience} onChange={e => setAudience(e.target.value)} style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', padding: '8px 10px' }}>
                <option value="all">All students</option>
                <option value="specific">Specific students</option>
                <option value="enrolled_season">Enrolled in season</option>
                <option value="level">Students at level(s)</option>
              </select>
            </div>

            {audience === 'specific' && (
              <div className="field">
                <label>Select students</label>
                <input
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Search students…"
                  style={{ marginBottom: 8 }}
                />
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #333', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {filteredStudents.map(u => (
                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0' }}>
                      <input type="checkbox" checked={audienceStudents.includes(u.id)} onChange={() => toggleStudent(u.id)} />
                      <span style={{ fontSize: 13, color: '#ddd' }}>{u.first_name} {u.last_name} <span style={{ color: '#555' }}>{u.email}</span></span>
                    </label>
                  ))}
                </div>
                {audienceStudents.length > 0 && <div style={{ fontSize: 12, color: 'var(--lime)', marginTop: 6 }}>{audienceStudents.length} student{audienceStudents.length !== 1 ? 's' : ''} selected</div>}
              </div>
            )}

            {audience === 'enrolled_season' && (
              <div className="field">
                <label>Season</label>
                <select value={audienceSeason} onChange={e => setAudienceSeason(e.target.value)} style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', padding: '8px 10px' }}>
                  <option value="">Select a season…</option>
                  {allSeasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {audience === 'level' && (
              <div className="field">
                <label>Levels</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {LEVEL_OPTIONS.map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => toggleLevel(level)}
                      style={{
                        padding: '6px 14px', borderRadius: 8, border: `1px solid ${audienceLevels.includes(level) ? 'var(--lime)' : '#333'}`,
                        background: audienceLevels.includes(level) ? 'rgba(204,255,0,0.12)' : '#1a1a1a',
                        color: audienceLevels.includes(level) ? 'var(--lime)' : '#888',
                        fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      }}
                    >Level {level}</button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Toggle value={pinned} onChange={setPinned} />
                <span style={{ fontSize: 13, color: 'var(--grey)' }}>Pin to top</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Toggle value={requiresAck} onChange={setRequiresAck} color="var(--amber)" />
                <span style={{ fontSize: 13, color: 'var(--grey)' }}>Require student acknowledgement</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Toggle value={showAsModal} onChange={setShowAsModal} color="#a855f7" />
                <span style={{ fontSize: 13, color: 'var(--grey)' }}>Show as pop-up</span>
              </div>
              {showAsModal && (
                <div style={{ background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#b0a0ff', marginLeft: 46 }}>
                  Students will see this as a blocking pop-up on next login, until dismissed.
                </div>
              )}
            </div>

            {showAsModal && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Button label</label>
                  <input value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} placeholder="e.g. Book Now, Fill the Form" />
                </div>
                <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Button URL</label>
                  <input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="/portal/book" />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : existing ? 'Save' : 'Post'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function GroupModal({ existing, onClose, onSaved }) {
  const [name, setName] = useState(existing?.name || '')
  const [description, setDescription] = useState(existing?.description || '')
  const [isActive, setIsActive] = useState(existing != null ? existing.is_active : true)
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      if (existing) {
        await community.updateGroup(existing.id, { name, description, is_active: isActive })
      } else {
        await community.createGroup({ name, description, is_active: isActive })
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 500 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{existing ? 'Edit Group' : 'New Group'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <form onSubmit={submit}>
            <div className="field"><label>Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Group name…" required /></div>
            <div className="field">
              <label>Description</label>
              <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description…" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div onClick={() => setIsActive(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, background: isActive ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: isActive ? 19 : 3, transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--grey)' }}>Active</span>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : existing ? 'Save' : 'Create'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function AdminCommunity() {
  const { data: annData, loading, refetch } = useApi(() => announcements.list(), [])
  const annList = annData?.results || annData || []

  const { data: groupsData, loading: groupsLoading, refetch: refetchGroups } = useApi(() => community.groups())
  const groups = groupsData?.results || groupsData || []

  const [tab, setTab] = useState('announcements')
  const [modal, setModal] = useState(null)
  const [confirmDeleteAnnId, setConfirmDeleteAnnId] = useState(null)

  async function deleteAnn(id) {
    await announcements.delete(id)
    setConfirmDeleteAnnId(null)
    refetch()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Community</div>
          <div className="page-sub">Manage groups, posts and broadcasts</div>
        </div>
        {tab === 'announcements' && (
          <button className="btn btn-lime btn-sm" onClick={() => setModal({ type: 'announcement', existing: null })}>+ New Announcement</button>
        )}
        {tab === 'groups' && (
          <button className="btn btn-lime btn-sm" onClick={() => setModal({ type: 'group', existing: null })}>+ New Group</button>
        )}
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {[
          ['Announcements', loading ? '…' : annList.length, 'kpi-lime'],
          ['Pinned', loading ? '…' : annList.filter(a => a.is_pinned).length, 'kpi-lav'],
          ['Active Groups', groupsLoading ? '…' : groups.filter(g => g.is_active).length, 'kpi-lime'],
          ['Total Posts', groupsLoading ? '…' : groups.reduce((s, g) => s + (g.post_count || 0), 0), 'kpi-amber'],
        ].map(([label, val, cls]) => (
          <div key={label} className={`kpi ${cls}`}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{val}</div>
          </div>
        ))}
      </div>

      <div className="subtabs" style={{ marginBottom: 20 }}>
        {[['announcements', 'Announcements'], ['groups', 'Groups']].map(([key, label]) => (
          <div key={key} className={`subtab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</div>
        ))}
      </div>

      {tab === 'announcements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && <div style={{ color: 'var(--grey)', fontSize: 13 }}>Loading…</div>}
          {!loading && annList.length === 0 && (
            <div className="empty-state">
              <div style={{ fontSize: 32, marginBottom: 12 }}>📢</div>
              <div>No announcements yet</div>
              <button className="btn btn-lime btn-sm" style={{ marginTop: 12 }} onClick={() => setModal({ type: 'announcement', existing: null })}>Post First Announcement</button>
            </div>
          )}
          {annList.map(a => (
            <div key={a.id} style={{ background: 'var(--card)', border: `1px solid ${a.is_pinned ? 'rgba(204,255,0,0.25)' : 'var(--border)'}`, borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {a.is_pinned && <span className="tag tag-lime" style={{ fontSize: 9 }}>Pinned</span>}
                  {a.requires_acknowledgement && <span className="tag tag-amber" style={{ fontSize: 9 }}>Requires Ack</span>}
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                  {a.requires_acknowledgement && (
                    <span style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {a.acknowledged_count || 0} ack'd
                    </span>
                  )}
                  <button className="btn btn-ghost btn-xs" onClick={() => setModal({ type: 'announcement', existing: a })}>Edit</button>
                  {confirmDeleteAnnId === a.id ? (
                    <span style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => deleteAnn(a.id)}>Confirm</button>
                      <button className="btn btn-ghost btn-xs" onClick={() => setConfirmDeleteAnnId(null)}>No</button>
                    </span>
                  ) : (
                    <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }} onClick={() => setConfirmDeleteAnnId(a.id)}>Delete</button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.7, marginBottom: 10 }}>{a.body}</div>
              <div style={{ fontSize: 11, color: 'var(--grey)' }}>
                Posted by {a.created_by_name || 'Studio'} · {timeAgo(a.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'groups' && (
        <div className="tbl-section">
          {groupsLoading && <div style={{ color: 'var(--grey)', fontSize: 13, padding: '16px' }}>Loading…</div>}
          {!groupsLoading && groups.length === 0 && (
            <div className="empty-state">
              <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
              <div>No groups yet</div>
              <button className="btn btn-lime btn-sm" style={{ marginTop: 12 }} onClick={() => setModal({ type: 'group', existing: null })}>Create First Group</button>
            </div>
          )}
          {!groupsLoading && groups.length > 0 && (
            <table>
              <thead><tr><th>Group</th><th>Members</th><th>Total Posts</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {groups.map(g => (
                  <tr key={g.id}>
                    <td><b>{g.name}</b></td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{g.member_count ?? 0}</td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{g.post_count ?? 0}</td>
                    <td><span className={`tag ${g.is_active ? 'tag-lime' : 'tag-grey'}`} style={{ fontSize: 10 }}>{g.is_active ? 'Active' : 'Archived'}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-xs" onClick={() => setModal({ type: 'group', existing: g })}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modal?.type === 'announcement' && (
        <AnnouncementModal
          existing={modal.existing}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refetch() }}
        />
      )}
      {modal?.type === 'group' && (
        <GroupModal
          existing={modal.existing}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refetchGroups() }}
        />
      )}
    </div>
  )
}
