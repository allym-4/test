import { useState, useEffect } from 'react'
import { useApi } from '../../hooks/useApi'
import { users, classes, instructorPay as instructorPayApi, availability as availabilityApi } from '../../api'
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

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SLOTS = [
  { key: 'morning', label: 'Morning', sub: '9am–12pm' },
  { key: 'afternoon', label: 'Afternoon', sub: '12pm–5pm' },
  { key: 'evening', label: 'Evening', sub: '5pm–10pm' },
]

function InstructorScheduleTab({ allStaff, sessions }) {
  const instructors = allStaff.filter(s => s.role === 'instructor' || s.role === 'admin')
  const [selectedId, setSelectedId] = useState(instructors[0]?.id || null)
  const [avail, setAvail] = useState({}) // { '0_morning': true, ... }
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!selectedId) return
    availabilityApi.list(selectedId).then(res => {
      const map = {}
      for (const row of (res.data?.results || res.data || [])) {
        map[`${row.day_of_week}_${row.slot}`] = row.available
      }
      setAvail(map)
    }).catch(() => setAvail({}))
  }, [selectedId])

  function toggle(day, slot) {
    const key = `${day}_${slot}`
    setAvail(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSave() {
    if (!selectedId) return
    setSaving(true)
    try {
      const slots = []
      for (let d = 0; d < 7; d++) {
        for (const s of SLOTS) {
          slots.push({ instructor: selectedId, day_of_week: d, slot: s.key, available: !!avail[`${d}_${s.key}`] })
        }
      }
      await availabilityApi.save(slots)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const selected = instructors.find(s => s.id === selectedId)
  const myClasses = sessions.filter(s => s.instructor === selectedId)

  return (
    <div>
      {/* Instructor picker */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {instructors.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedId(s.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10,
              border: `1px solid ${selectedId === s.id ? 'var(--lime)' : 'var(--border)'}`,
              background: selectedId === s.id ? 'rgba(204,255,0,0.08)' : 'var(--card)',
              cursor: 'pointer', fontSize: 13,
            }}
          >
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: avatarColor(s.display_name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#000', fontWeight: 700 }}>
              {s.first_name?.[0] || '?'}
            </div>
            <span style={{ color: selectedId === s.id ? 'var(--lime)' : 'var(--white)' }}>{s.display_name}</span>
          </button>
        ))}
      </div>

      {selected && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* Availability grid */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, marginBottom: 14 }}>Weekly Availability</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '4px 8px', textAlign: 'left', color: 'var(--grey)', width: 90 }}></th>
                      {DAYS.map(d => (
                        <th key={d} style={{ padding: '4px 6px', textAlign: 'center', color: 'var(--grey)', fontWeight: 600 }}>{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SLOTS.map(slot => (
                      <tr key={slot.key}>
                        <td style={{ padding: '6px 8px', color: 'var(--grey)' }}>
                          <div style={{ fontWeight: 600 }}>{slot.label}</div>
                          <div style={{ fontSize: 10, color: '#555' }}>{slot.sub}</div>
                        </td>
                        {DAYS.map((_, d) => {
                          const key = `${d}_${slot.key}`
                          const isAvail = !!avail[key]
                          // Check if they actually have a class in this slot
                          const hasClass = myClasses.some(s => {
                            if (s.day_of_week !== d) return false
                            const hr = parseInt((s.start_time || '').split(':')[0])
                            if (slot.key === 'morning') return hr >= 9 && hr < 12
                            if (slot.key === 'afternoon') return hr >= 12 && hr < 17
                            return hr >= 17
                          })
                          return (
                            <td key={d} style={{ padding: '4px 6px', textAlign: 'center' }}>
                              <div
                                onClick={() => toggle(d, slot.key)}
                                style={{
                                  width: 28, height: 28, borderRadius: 6, cursor: 'pointer', margin: '0 auto',
                                  background: hasClass ? 'rgba(204,255,0,0.2)' : isAvail ? 'rgba(204,255,0,0.12)' : 'rgba(255,255,255,0.04)',
                                  border: `1px solid ${hasClass ? 'var(--lime)' : isAvail ? 'rgba(204,255,0,0.3)' : 'var(--border)'}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 13,
                                  transition: 'all 0.15s',
                                }}
                                title={hasClass ? 'Teaching a class here' : isAvail ? 'Available' : 'Not available'}
                              >
                                {hasClass ? '★' : isAvail ? '✓' : ''}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 10, display: 'flex', gap: 14 }}>
                <span><span style={{ color: 'var(--lime)' }}>★</span> Teaching</span>
                <span><span style={{ color: 'var(--lime)' }}>✓</span> Available</span>
                <span style={{ opacity: 0.5 }}>□ Unavailable</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="btn btn-lime btn-sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Availability'}
                </button>
              </div>
            </div>

            {/* Assigned classes */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, marginBottom: 14 }}>
                Teaching Schedule
                {myClasses.length > 0 && <span style={{ fontSize: 12, color: 'var(--grey)', fontFamily: 'inherit', fontWeight: 400, marginLeft: 8 }}>{myClasses.length} class{myClasses.length !== 1 ? 'es' : ''}</span>}
              </div>
              {myClasses.length === 0 ? (
                <div style={{ color: 'var(--grey)', fontSize: 13 }}>No classes assigned.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[...myClasses].sort((a, b) => a.day_of_week - b.day_of_week || (a.start_time || '').localeCompare(b.start_time || '')).map(s => (
                    <div key={s.id} style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>
                          {DAYS[s.day_of_week]} {s.start_time?.slice(0, 5)} · {s.studio_detail?.name || '—'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, color: s.enrolled_count >= s.capacity ? 'var(--amber)' : 'var(--lime)' }}>
                          {s.enrolled_count}/{s.capacity}
                        </div>
                        <span className={`tag ${s.is_active ? 'tag-lime' : 'tag-grey'}`} style={{ fontSize: 9, marginTop: 2 }}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pay rate and shadow instructor */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, marginBottom: 12 }}>Pay Settings</div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 4 }}>Pay rate</div>
                <div style={{ fontWeight: 600 }}>{selected.pay_rate ? `$${selected.pay_rate}/class` : 'Not set (defaults to $40)'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 4 }}>Shadow instructor</div>
                <div style={{ fontWeight: 600, color: selected.is_shadow_instructor ? 'var(--amber)' : 'var(--grey)' }}>
                  {selected.is_shadow_instructor ? 'Yes — $30/class' : 'No'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 4 }}>Total classes (active)</div>
                <div style={{ fontWeight: 600 }}>{myClasses.filter(s => s.is_active).length}</div>
              </div>
            </div>
          </div>
        </>
      )}

      {instructors.length === 0 && (
        <div className="empty-state">No instructors yet — add staff above.</div>
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
                  <th>Classes</th>
                  <th>Pay Rate</th>
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
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                      {s.pay_rate ? `$${s.pay_rate}/class` : '—'}
                    </td>
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
        <div>
          <p style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 20, lineHeight: 1.5 }}>
            Each staff member is assigned a role. Roles define what they can see and do in the system.
          </p>

          {/* Role cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 28 }}>
            {/* Admin / Founder */}
            <div style={{ background: '#0f1600', border: '2px solid var(--lime)', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: 'var(--lime)' }}>Admin / Founder</span>
                <span style={{ fontSize: 11, color: 'var(--grey)' }}>{allStaff.filter(s => s.role === 'admin').length} people</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                {allStaff.filter(s => s.role === 'admin').map(s => (
                  <div key={s.id} title={s.display_name} style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor(s.display_name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#000', fontWeight: 700 }}>{s.first_name?.[0] || '?'}</div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--lime)', display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                <div>✓ Full access — all screens and actions</div>
                <div>✓ Edit billing, refunds, payment plans</div>
                <div>✓ Manage staff, roles and settings</div>
                <div>✓ View all reporting and financials</div>
                <div>✓ Send marketing campaigns</div>
              </div>
              <button className="btn btn-ghost btn-sm" disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}>Cannot edit Admin role</button>
            </div>

            {/* Instructor */}
            <div style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15 }}>Instructor</span>
                <span style={{ fontSize: 11, color: 'var(--grey)' }}>{allStaff.filter(s => s.role === 'instructor').length} people</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                {allStaff.filter(s => s.role === 'instructor').map(s => (
                  <div key={s.id} title={s.display_name} style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor(s.display_name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#000', fontWeight: 700 }}>{s.first_name?.[0] || '?'}</div>
                ))}
              </div>
              <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {[
                  'View students in own classes only',
                  'Mark attendance + add notes',
                  'View owing status (own classes)',
                  'Take payments',
                  'Assign homework',
                  'Send comms to students',
                ].map(perm => (
                  <div key={perm} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--grey)' }}>{perm}</span>
                    <div style={{ width: 32, height: 18, borderRadius: 9, background: 'var(--lime)', flexShrink: 0, position: 'relative' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, right: 3 }} />
                    </div>
                  </div>
                ))}
                {[
                  'Issue refunds / credits',
                  'Edit timetable / seasons',
                  'Access staff / settings',
                  'View reporting',
                ].map(perm => (
                  <div key={perm} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--grey)' }}>{perm}</span>
                    <div style={{ width: 32, height: 18, borderRadius: 9, background: '#333', flexShrink: 0, position: 'relative' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#666', position: 'absolute', top: 3, left: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>Permissions are fixed per role. Change a staff member's role below to adjust their access.</div>
            </div>
          </div>

          {/* Individual role assignment */}
          <div className="section" style={{ padding: '18px 20px' }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, marginBottom: 6 }}>Individual Role Assignment</div>
            <p style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 16 }}>Change a staff member's role here to adjust their access instantly.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allStaff.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="staff-photo" style={{ background: avatarColor(s.display_name), width: 30, height: 30, fontSize: 12, flexShrink: 0 }}>
                    {s.first_name?.[0] || '?'}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{s.display_name}</div>
                  <span className={`tag ${s.role === 'admin' ? 'tag-lime' : 'tag-lav'}`} style={{ fontSize: 10 }}>
                    {s.role === 'admin' ? 'Admin' : 'Instructor'}
                  </span>
                  <button className="btn btn-ghost btn-xs" onClick={() => { setEditStaff(s); setShowAddStaff(true) }}>Edit</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'availability' && (
        <InstructorScheduleTab allStaff={allStaff} sessions={sessions} />
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
