import { useState, useEffect } from 'react'
import { useApi } from '../../hooks/useApi'
import { lockers, users } from '../../api'
import '../StudentsPage.css'

const TOTAL_LOCKERS = 36

// ─── Assign / Edit Modal ────────────────────────────────────────────────────

function AssignModal({ locker, onClose, onSaved }) {
  const [studentSearch, setStudentSearch] = useState(locker?.assigned_to_detail?.display_name || '')
  const [studentList, setStudentList] = useState([])
  const [picked, setPicked] = useState(locker?.assigned_to_detail || null)
  const [expiresAt, setExpiresAt] = useState(locker?.expires_at || '')
  const [notes, setNotes] = useState(locker?.notes || '')
  const [lockerType, setLockerType] = useState(locker?.locker_type || 'complimentary')
  const [paymentType, setPaymentType] = useState(locker?.payment_type || '')
  const [paymentStatus, setPaymentStatus] = useState(locker?.payment_status || 'unpaid')
  const [keyIssued, setKeyIssued] = useState(locker?.key_issued || false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (studentSearch.length < 2 || picked) { setStudentList([]); return }
    users.list({ search: studentSearch }).then(r => setStudentList(r.data.results || r.data))
  }, [studentSearch, picked])

  async function submit(e) {
    e.preventDefault()
    if (!picked) return
    setSaving(true)
    try {
      const payload = {
        number: locker?.number,
        assigned_to: picked.id,
        expires_at: expiresAt || null,
        assigned_at: locker?.assigned_at || new Date().toISOString().slice(0, 10),
        notes,
        locker_type: lockerType,
        payment_type: lockerType === 'paid' ? paymentType : '',
        payment_status: paymentStatus,
        key_issued: keyIssued,
      }
      if (locker?.id) {
        await lockers.update(locker.id, payload)
      } else {
        await lockers.create(payload)
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const isEdit = !!(locker?.assigned_to)
  const title = isEdit ? `Edit Locker #${locker.number}` : `Assign Locker #${locker?.number}`

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 420 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{title}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <form onSubmit={submit}>
            {/* Student */}
            <div className="field">
              <label>Student</label>
              {picked ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13 }}>{picked.display_name || picked.first_name}</span>
                  <button type="button" className="btn btn-ghost btn-xs" onClick={() => { setPicked(null); setStudentSearch('') }}>Change</button>
                </div>
              ) : (
                <>
                  <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search by name…" />
                  {studentList.length > 0 && (
                    <div style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: 'auto' }}>
                      {studentList.slice(0, 6).map(s => (
                        <div key={s.id} onClick={() => { setPicked(s); setStudentSearch('') }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}>
                          {s.display_name || `${s.first_name} ${s.last_name}`}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Locker Type */}
            <div className="field">
              <label>Locker Type</label>
              <select value={lockerType} onChange={e => setLockerType(e.target.value)}>
                <option value="complimentary">Complimentary</option>
                <option value="paid">Paid ($50)</option>
              </select>
            </div>

            {/* Payment Type — only for paid */}
            {lockerType === 'paid' && (
              <div className="field">
                <label>Payment Type</label>
                <select value={paymentType} onChange={e => setPaymentType(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="4_class_perk">4-Class Perk</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                </select>
              </div>
            )}

            {/* Payment Status */}
            <div className="field">
              <label>Payment Status</label>
              <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="waived">Waived</option>
              </select>
            </div>

            {/* Key Issued */}
            <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id="keyIssued"
                checked={keyIssued}
                onChange={e => setKeyIssued(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="keyIssued" style={{ marginBottom: 0, cursor: 'pointer' }}>Key Issued</label>
            </div>

            <div className="field"><label>Expiry Date</label><input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} /></div>
            <div className="field"><label>Notes</label><input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" /></div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-lime btn-sm" disabled={saving || !picked}>{saving ? 'Saving…' : isEdit ? 'Save' : 'Assign'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Selected Locker Detail Panel ────────────────────────────────────────────

function LockerDetailPanel({ locker, number, onEdit, onUnassign, onAssign, onRefetch }) {
  const [togglingKey, setTogglingKey] = useState(false)
  const [lostKeyPending, setLostKeyPending] = useState(false)

  async function toggleKeyIssued() {
    setTogglingKey(true)
    try {
      await lockers.markKeyIssued(locker.id, !locker.key_issued)
      onRefetch()
    } finally {
      setTogglingKey(false)
    }
  }

  async function reportLostKey() {
    if (!confirm(`Report the key for Locker #${number} as lost? This will create a $50 charge for ${locker.assigned_to_detail?.display_name}.`)) return
    setLostKeyPending(true)
    try {
      await lockers.lostKey(locker.id)
      onRefetch()
    } catch (err) {
      alert('Failed to report lost key.')
    } finally {
      setLostKeyPending(false)
    }
  }

  const paymentTypeLabel = {
    '4_class_perk': '4-Class Perk',
    cash: 'Cash',
    card: 'Card',
  }

  const paymentStatusColor = {
    paid: 'var(--lime)',
    unpaid: 'var(--amber)',
    waived: 'var(--lav)',
  }

  return (
    <div style={{ marginTop: 16, background: 'var(--card)', border: `1px solid ${locker ? 'rgba(176,160,255,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Locker #{number}</div>
      {locker ? (
        <>
          <div style={{ fontSize: 13, marginBottom: 2, fontWeight: 600 }}>{locker.assigned_to_detail?.display_name}</div>
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 6 }}>{locker.assigned_to_detail?.email}</div>

          {/* Badges row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {locker.key_lost && (
              <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(255,68,68,0.15)', color: 'var(--red)', border: '1px solid rgba(255,68,68,0.4)', borderRadius: 4, padding: '2px 7px', letterSpacing: '0.5px' }}>
                KEY LOST
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: 'var(--grey)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px' }}>
              {locker.locker_type === 'paid' ? 'Paid $50' : 'Complimentary'}
            </span>
            {locker.payment_type && (
              <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(176,160,255,0.1)', color: 'var(--lav)', border: '1px solid rgba(176,160,255,0.3)', borderRadius: 4, padding: '2px 7px' }}>
                {paymentTypeLabel[locker.payment_type] || locker.payment_type}
              </span>
            )}
            {locker.payment_status && (
              <span style={{ fontSize: 10, fontWeight: 700, background: `${paymentStatusColor[locker.payment_status]}18`, color: paymentStatusColor[locker.payment_status], border: `1px solid ${paymentStatusColor[locker.payment_status]}44`, borderRadius: 4, padding: '2px 7px' }}>
                {locker.payment_status.charAt(0).toUpperCase() + locker.payment_status.slice(1)}
              </span>
            )}
          </div>

          {locker.expires_at && (
            <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 4 }}>Expires {locker.expires_at}</div>
          )}
          {locker.notes && (
            <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 10 }}>{locker.notes}</div>
          )}

          {/* Key Issued toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--grey)' }}>Key issued:</span>
            <button
              className={`btn btn-xs ${locker.key_issued ? 'btn-lime' : 'btn-ghost'}`}
              onClick={toggleKeyIssued}
              disabled={togglingKey}
              style={{ minWidth: 52 }}
            >
              {togglingKey ? '…' : locker.key_issued ? 'Yes' : 'No'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-xs" onClick={onEdit}>Edit</button>
            <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }} onClick={onUnassign}>Unassign</button>
            {!locker.key_lost && (
              <button
                className="btn btn-ghost btn-xs"
                style={{ color: 'var(--amber)', borderColor: 'rgba(255,165,0,0.3)' }}
                onClick={reportLostKey}
                disabled={lostKeyPending}
              >
                {lostKeyPending ? 'Reporting…' : 'Report Lost Key'}
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10 }}>This locker is available.</div>
          <button className="btn btn-lime btn-xs" onClick={onAssign}>Assign to Student</button>
        </>
      )}
    </div>
  )
}

// ─── Eligible Students Tab ───────────────────────────────────────────────────

function EligibleStudentsTab({ onAssign }) {
  const { data, loading, error } = useApi(() => lockers.eligible(), [])

  if (loading) return <div style={{ fontSize: 13, color: 'var(--grey)', padding: '24px 0' }}>Loading…</div>
  if (error) return <div style={{ fontSize: 13, color: 'var(--red)', padding: '24px 0' }}>Failed to load eligible students.</div>
  if (!data) return null

  const { season, eligible = [], paid_holders = [] } = data

  return (
    <div>
      {season ? (
        <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 16 }}>
          Current season: <strong style={{ color: 'var(--lav)' }}>{season.name}</strong>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--amber)', marginBottom: 16 }}>No active season found.</div>
      )}

      {/* Eligible Students — 4+ classes */}
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 10, fontWeight: 600 }}>
        4-Class Perk Eligible ({eligible.length})
      </div>

      {eligible.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 24 }}>No students with 4+ classes this season.</div>
      ) : (
        <div className="tbl-section" style={{ border: 'none', borderRadius: 0, marginBottom: 32 }}>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Classes</th>
                <th>Locker</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {eligible.map(s => (
                <tr key={s.id}>
                  <td><b>{s.display_name}</b></td>
                  <td style={{ fontSize: 12, color: 'var(--grey)' }}>{s.email}</td>
                  <td style={{ fontSize: 13, color: 'var(--lav)', fontWeight: 600 }}>{s.enrolment_count}</td>
                  <td>
                    {s.has_locker ? (
                      <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(176, 255, 100, 0.12)', color: 'var(--lime)', border: '1px solid rgba(176, 255, 100, 0.35)', borderRadius: 4, padding: '2px 8px' }}>
                        Locker #{s.locker_number}
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(255,165,0,0.1)', color: 'var(--amber)', border: '1px solid rgba(255,165,0,0.3)', borderRadius: 4, padding: '2px 8px' }}>
                        No locker
                      </span>
                    )}
                  </td>
                  <td>
                    {!s.has_locker && (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => onAssign(s)}
                      >
                        Assign
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paid Locker Holders — fewer than 4 classes */}
      {paid_holders.length > 0 && (
        <>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 10, fontWeight: 600 }}>
            Paid Locker Holders ({paid_holders.length})
          </div>
          <div className="tbl-section" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Email</th>
                  <th>Classes This Season</th>
                  <th>Locker</th>
                </tr>
              </thead>
              <tbody>
                {paid_holders.map(s => (
                  <tr key={s.id}>
                    <td><b>{s.display_name}</b></td>
                    <td style={{ fontSize: 12, color: 'var(--grey)' }}>{s.email}</td>
                    <td style={{ fontSize: 13, color: 'var(--grey)' }}>{s.enrolment_count}</td>
                    <td>
                      <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(176,160,255,0.1)', color: 'var(--lav)', border: '1px solid rgba(176,160,255,0.3)', borderRadius: 4, padding: '2px 8px' }}>
                        Locker #{s.locker_number}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminLockers() {
  const { data: lockerData, loading, refetch } = useApi(() => lockers.list(), [])
  const lockerList = lockerData?.results || lockerData || []

  const [activeTab, setActiveTab] = useState('grid')
  const [selected, setSelected] = useState(null)
  const [modal, setModal] = useState(null)

  const lockerMap = {}
  lockerList.forEach(l => { lockerMap[l.number] = l })

  const occupied = lockerList.length
  const free = TOTAL_LOCKERS - occupied

  const selectedLocker = selected ? lockerMap[selected] : null

  async function unassign(lockerId) {
    if (!confirm('Unassign this locker?')) return
    await lockers.update(lockerId, { assigned_to: null, expires_at: null, assigned_at: null })
    refetch()
    setSelected(null)
  }

  function openAssign(number) {
    const existing = lockerMap[number]
    setModal({ locker: existing || { number }, mode: existing ? 'edit' : 'assign' })
  }

  // Called from Eligible Students tab to pre-fill a student
  function openAssignForStudent(student) {
    // Find first free locker number
    let freeNum = null
    for (let i = 1; i <= TOTAL_LOCKERS; i++) {
      if (!lockerMap[i]) { freeNum = i; break }
    }
    if (!freeNum) {
      alert('No free lockers available.')
      return
    }
    setModal({
      locker: {
        number: freeNum,
        assigned_to_detail: student,
        locker_type: 'complimentary',
        payment_type: '4_class_perk',
        payment_status: 'waived',
      },
      mode: 'assign',
    })
    setActiveTab('grid')
  }

  const tabs = [
    { key: 'grid', label: 'Locker Grid' },
    { key: 'eligible', label: 'Eligible Students' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Lockers</div>
          <div className="page-sub">Locker assignments — Reception Area</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => {
          const num = parseInt(prompt('Enter locker number (1–36):'))
          if (num >= 1 && num <= TOTAL_LOCKERS) openAssign(num)
        }}>+ Assign Locker</button>
      </div>

      {/* KPI Strip */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {[
          ['Total Lockers', TOTAL_LOCKERS, 'kpi-lime'],
          ['Occupied', loading ? '…' : occupied, 'kpi-lav'],
          ['Available', loading ? '…' : free, free > 0 ? 'kpi-lime' : 'kpi-amber'],
          ['Occupancy', loading ? '…' : `${Math.round(occupied / TOTAL_LOCKERS * 100)}%`, 'kpi-amber'],
        ].map(([label, val, cls]) => (
          <div key={label} className={`kpi ${cls}`}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t.key ? '2px solid var(--lime)' : '2px solid transparent',
              color: activeTab === t.key ? 'var(--lime)' : 'var(--grey)',
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: 13,
              padding: '8px 16px',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Locker Grid Tab */}
      {activeTab === 'grid' && (
        <div className="grid-2" style={{ gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Locker Grid — Reception Area</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
              {Array.from({ length: TOTAL_LOCKERS }, (_, i) => {
                const num = i + 1
                const locker = lockerMap[num]
                const isAssigned = !!locker
                const isSelected = selected === num
                const hasLostKey = isAssigned && locker.key_lost
                return (
                  <div
                    key={num}
                    onClick={() => setSelected(isSelected ? null : num)}
                    title={isAssigned ? locker.assigned_to_detail?.display_name : 'Available'}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 8,
                      background: isSelected
                        ? 'var(--lime)'
                        : hasLostKey
                          ? 'rgba(255,68,68,0.15)'
                          : isAssigned
                            ? 'rgba(176,160,255,0.2)'
                            : '#1a1a1a',
                      border: `1px solid ${isSelected
                        ? 'var(--lime)'
                        : hasLostKey
                          ? 'rgba(255,68,68,0.4)'
                          : isAssigned
                            ? 'rgba(176,160,255,0.4)'
                            : 'var(--border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                      color: isSelected ? '#000' : hasLostKey ? 'var(--red)' : isAssigned ? 'var(--lav)' : 'var(--grey)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {num}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 11, flexWrap: 'wrap' }}>
              {[
                ['rgba(176,160,255,0.2)', 'rgba(176,160,255,0.4)', 'Occupied'],
                ['#1a1a1a', 'var(--border)', 'Available'],
                ['var(--lime)', 'var(--lime)', 'Selected'],
                ['rgba(255,68,68,0.15)', 'rgba(255,68,68,0.4)', 'Key Lost'],
              ].map(([bg, border, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: bg, border: `1px solid ${border}` }} />
                  <span style={{ color: 'var(--grey)' }}>{label}</span>
                </div>
              ))}
            </div>

            {selected && (
              <LockerDetailPanel
                locker={selectedLocker}
                number={selected}
                onEdit={() => openAssign(selected)}
                onUnassign={() => selectedLocker && unassign(selectedLocker.id)}
                onAssign={() => openAssign(selected)}
                onRefetch={refetch}
              />
            )}
          </div>

          {/* Assignments Table */}
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Assignments</div>
            {loading ? (
              <div style={{ fontSize: 13, color: 'var(--grey)' }}>Loading…</div>
            ) : (
              <div className="tbl-section" style={{ border: 'none', borderRadius: 0 }}>
                <table>
                  <thead><tr><th>#</th><th>Student</th><th>Type</th><th>Expires</th><th></th></tr></thead>
                  <tbody>
                    {lockerList.map(l => (
                      <tr key={l.id} onClick={() => setSelected(l.number)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontFamily: "'Archivo Black', sans-serif", color: selected === l.number ? 'var(--lime)' : l.key_lost ? 'var(--red)' : 'var(--lav)' }}>{l.number}</td>
                        <td>
                          <b>{l.assigned_to_detail?.display_name || '—'}</b>
                          {l.key_lost && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: 'var(--red)', background: 'rgba(255,68,68,0.12)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 3, padding: '1px 5px' }}>KEY LOST</span>}
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--grey)' }}>
                          {l.locker_type === 'paid' ? 'Paid' : 'Comp'}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--grey)' }}>{l.expires_at || '—'}</td>
                        <td><button className="btn btn-ghost btn-xs" onClick={e => { e.stopPropagation(); openAssign(l.number) }}>Edit</button></td>
                      </tr>
                    ))}
                    {lockerList.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--grey)', padding: '24px 0' }}>No lockers assigned yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Eligible Students Tab */}
      {activeTab === 'eligible' && (
        <EligibleStudentsTab onAssign={openAssignForStudent} />
      )}

      {modal && (
        <AssignModal
          locker={modal.locker}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refetch(); setSelected(null) }}
        />
      )}
    </div>
  )
}
