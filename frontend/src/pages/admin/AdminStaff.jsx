import { useState, useEffect } from 'react'
import { useApi } from '../../hooks/useApi'
import { users, classes, instructorPay as instructorPayApi } from '../../api'
import AddEditStaffModal from '../../components/AddEditStaffModal'

const AVATAR_COLORS = ['#b0a0ff', '#ccff00', '#ffaa00', '#ff88aa', '#44ffcc', '#ffcc88', '#b0f0b0', '#9ac4ff', '#ffb3de', '#44ff99']
function avatarColor(name) {
  let h = 0
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

function CreatePayModal({ staff, onClose, onSaved }) {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = today.slice(0, 8) + '01'

  const [form, setForm] = useState({
    instructor: staff.id,
    period_start: monthStart,
    period_end: today,
    amount: '',
    description: `Pay — ${staff.display_name}`,
    status: 'pending',
  })
  const [calc, setCalc] = useState(null)
  const [calcLoading, setCalcLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  function set(f, v) { setForm(x => ({ ...x, [f]: v })) }

  async function runCalc() {
    if (!form.period_start || !form.period_end) return
    setCalcLoading(true)
    try {
      const res = await instructorPayApi.calculatePay(staff.id, {
        period_start: form.period_start,
        period_end: form.period_end,
      })
      setCalc(res.data)
      if (res.data.suggested_amount > 0) {
        set('amount', String(res.data.suggested_amount))
      }
    } catch {
      setCalc(null)
    } finally {
      setCalcLoading(false)
    }
  }

  useEffect(() => { runCalc() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      await instructorPayApi.create(form)
      onSaved()
      onClose()
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Failed to create pay record')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 460 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Create Pay Record</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit}>
          {err && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{err}</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 12px', background: 'rgba(176,160,255,0.06)', border: '1px solid rgba(176,160,255,0.15)', borderRadius: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor(staff.display_name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#000', fontWeight: 700, flexShrink: 0 }}>
              {staff.first_name?.[0] || '?'}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{staff.display_name}</div>
              <div style={{ fontSize: 11, color: 'var(--grey)' }}>{staff.pay_rate ? `$${staff.pay_rate}/class` : 'No pay rate set'}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
            <div className="field">
              <label>Period Start *</label>
              <input type="date" value={form.period_start} onChange={e => set('period_start', e.target.value)} required />
            </div>
            <div className="field">
              <label>Period End *</label>
              <input type="date" value={form.period_end} onChange={e => set('period_end', e.target.value)} required />
            </div>
          </div>

          <button type="button" className="btn btn-ghost btn-xs" style={{ marginBottom: 14 }} onClick={runCalc} disabled={calcLoading}>
            {calcLoading ? 'Calculating…' : '⟳ Recalculate from attendance'}
          </button>

          {calc && (
            <div style={{ background: 'rgba(204,255,0,0.05)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12 }}>
              <div style={{ display: 'flex', gap: 20 }}>
                <div><span style={{ color: 'var(--grey)' }}>Classes taught</span><br /><b style={{ fontSize: 15 }}>{calc.class_count}</b></div>
                <div><span style={{ color: 'var(--grey)' }}>Total students</span><br /><b style={{ fontSize: 15 }}>{calc.total_students}</b></div>
                <div><span style={{ color: 'var(--grey)' }}>Rate</span><br /><b style={{ fontSize: 15 }}>${calc.pay_rate}/class</b></div>
                <div><span style={{ color: 'var(--grey)' }}>Suggested</span><br /><b style={{ fontSize: 15, color: 'var(--lime)' }}>${calc.suggested_amount}</b></div>
              </div>
            </div>
          )}

          <div className="field">
            <label>Amount ($) *</label>
            <input type="number" step="0.01" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} required placeholder="0.00" />
          </div>
          <div className="field">
            <label>Description</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Create Pay Record'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PayTab({ allStaff }) {
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [showPayModal, setShowPayModal] = useState(null)
  const { data: payData, loading, refetch } = useApi(
    () => selectedStaff ? instructorPayApi.list({ instructor: selectedStaff }) : instructorPayApi.list(),
    [selectedStaff]
  )
  const records = payData?.results || payData || []

  async function markPaid(record) {
    await instructorPayApi.update(record.id, { status: 'paid' })
    refetch()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <select
          value={selectedStaff || ''}
          onChange={e => setSelectedStaff(e.target.value || null)}
          style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: 'var(--white)' }}
        >
          <option value="">All instructors</option>
          {allStaff.filter(s => s.role === 'instructor').map(s => (
            <option key={s.id} value={s.id}>{s.display_name}</option>
          ))}
        </select>
        {selectedStaff && (
          <button
            className="btn btn-lime btn-sm"
            onClick={() => setShowPayModal(allStaff.find(s => s.id === parseInt(selectedStaff)))}
          >
            + Pay Record
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
      ) : records.length === 0 ? (
        <div className="empty-state">No pay records yet — select an instructor and add one</div>
      ) : (
        <div className="tbl-section">
          <table>
            <thead>
              <tr>
                <th>Instructor</th>
                <th>Period</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.instructor_name}</td>
                  <td style={{ fontSize: 12, color: 'var(--grey)' }}>
                    {r.period_start && r.period_end
                      ? `${new Date(r.period_start + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${new Date(r.period_end + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`
                      : '—'}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--lime)' }}>${parseFloat(r.amount).toFixed(2)}</td>
                  <td style={{ fontSize: 12, color: 'var(--grey)' }}>{r.description || '—'}</td>
                  <td>
                    <span className={`tag ${r.status === 'paid' ? 'tag-lime' : 'tag-amber'}`} style={{ fontSize: 10 }}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    {r.status === 'pending' && (
                      <button className="btn btn-ghost btn-xs" onClick={() => markPaid(r)}>Take Payment</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPayModal && (
        <CreatePayModal
          staff={showPayModal}
          onClose={() => setShowPayModal(null)}
          onSaved={refetch}
        />
      )}
    </div>
  )
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
        {[['team', 'Team'], ['permissions', 'Permissions'], ['availability', 'Availability'], ['pay', 'Pay Records']].map(([key, label]) => (
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
                  <th>Pay Rate</th>
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
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                      {s.pay_rate ? `$${s.pay_rate}/class` : '—'}
                    </td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{classesForInstructor(s.id)}</td>
                    <td><span className="tag tag-lime" style={{ fontSize: 10 }}>Active</span></td>
                    <td><button className="btn btn-ghost btn-xs" onClick={() => { setEditStaff(s); setShowAddStaff(true) }}>Edit</button></td>
                  </tr>
                ))}
                {allStaff.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--grey)', padding: '24px 0' }}>No staff yet — add your first team member above</td></tr>
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

      {tab === 'pay' && <PayTab allStaff={allStaff} />}

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
