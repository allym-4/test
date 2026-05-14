import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { users, classes } from '../../api'
import AddEditStaffModal from '../../components/AddEditStaffModal'

const AVATAR_COLORS = ['#b0a0ff', '#ccff00', '#ffaa00', '#ff88aa', '#44ffcc', '#ffcc88', '#b0f0b0', '#9ac4ff', '#ffb3de', '#44ff99']
function avatarColor(name) {
  let h = 0
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

export default function AdminStaff() {
  const [tab, setTab] = useState('team')
  const { data: instructorsData, loading } = useApi(() => users.list({ role: 'instructor' }))
  const { data: adminData } = useApi(() => users.list({ role: 'admin' }))
  const { data: sessionsData } = useApi(() => classes.list())

  const instructors = instructorsData?.results || []
  const admins = adminData?.results || []
  const sessions = sessionsData?.results || []

  const [staffList, setStaffList] = useState(null)
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [editStaff, setEditStaff] = useState(null)

  const allStaff = staffList ?? [...admins, ...instructors]

  function classesForInstructor(instructorId) {
    return sessions.filter(s => s.instructor === instructorId).map(s => s.name).join(', ') || '—'
  }

  function handleStaffSaved(member) {
    if (editStaff) {
      setStaffList(prev => (prev ?? allStaff).map(s => s.id === member.id ? member : s))
    } else {
      setStaffList(prev => [...(prev ?? allStaff), member])
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Staff</div>
          <div className="page-sub">Instructors, team members and access</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => { setEditStaff(null); setShowAddStaff(true) }}>+ Add Staff</button>
      </div>

      <div className="subtabs">
        {[['team', 'Team'], ['permissions', 'Permissions'], ['availability', 'Availability']].map(([key, label]) => (
          <div key={key} className={`subtab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</div>
        ))}
      </div>

      {tab === 'team' && (
        loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : (
          <div className="tbl-section">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Classes</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {allStaff.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="staff-photo" style={{ background: avatarColor(s.display_name) }}>
                        {s.first_name?.[0] || '?'}
                      </div>
                    </td>
                    <td>
                      <b>{s.display_name}</b>
                      <div style={{ fontSize: 11, color: 'var(--grey)' }}>{s.email}</div>
                    </td>
                    <td>
                      <span className={`tag ${s.role === 'admin' ? 'tag-lime' : 'tag-lav'}`} style={{ fontSize: 10 }}>
                        {s.role === 'admin' ? 'Admin' : 'Instructor'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{classesForInstructor(s.id)}</td>
                    <td><span className="tag tag-lime" style={{ fontSize: 10 }}>Active</span></td>
                    <td><button className="btn btn-ghost btn-xs" onClick={() => { setEditStaff(s); setShowAddStaff(true) }}>Edit</button></td>
                  </tr>
                ))}
                {allStaff.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--grey)', padding: '24px 0' }}>No staff yet — add your first team member above</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'permissions' && (
        <div className="list-card">
          {allStaff.map(s => (
            <div key={s.id} className="list-row">
              <div className="staff-photo" style={{ background: avatarColor(s.display_name) }}>
                {s.first_name?.[0] || '?'}
              </div>
              <div className="list-body">
                <div className="list-title">{s.display_name}</div>
                <div className="list-sub">{s.role === 'admin' ? 'Full access — all features' : 'Instructor — classes, attendance, homework, students'}</div>
              </div>
              <span className={`tag ${s.role === 'admin' ? 'tag-lime' : 'tag-lav'}`} style={{ fontSize: 10 }}>
                {s.role === 'admin' ? 'Admin' : 'Instructor'}
              </span>
              <button className="btn btn-ghost btn-xs" onClick={() => { setEditStaff(s); setShowAddStaff(true) }}>Edit</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'availability' && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 20 }}>
            Classes assigned to each instructor across the week.
          </div>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dow) => {
            const daySessions = sessions.filter(s => s.day_of_week === dow)
            if (daySessions.length === 0) return null
            return (
              <div key={day} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 8, fontWeight: 600 }}>{day}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[...daySessions].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')).map(s => {
                    const instructor = allStaff.find(st => st.id === s.instructor)
                    return (
                      <div key={s.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{s.start_time?.slice(0, 5)} · {s.studio_detail?.name}</div>
                        </div>
                        {instructor ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor(instructor.display_name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#000', fontWeight: 700 }}>
                              {instructor.first_name?.[0] || '?'}
                            </div>
                            <span style={{ fontSize: 13, color: 'var(--grey)' }}>{instructor.display_name}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--amber)' }}>Unassigned</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {sessions.length === 0 && (
            <div className="empty-state">
              <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
              <div>No classes scheduled yet</div>
            </div>
          )}
        </div>
      )}

      {showAddStaff && (
        <AddEditStaffModal
          staff={editStaff}
          onClose={() => { setShowAddStaff(false); setEditStaff(null) }}
          onSaved={handleStaffSaved}
        />
      )}
    </div>
  )
}
