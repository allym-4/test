import { useState, useEffect } from 'react'
import { useApi } from '../../hooks/useApi'
import { lockers, users, seasons } from '../../api'

const TOTAL_LOCKERS = 36

// ─── Assign / Edit Modal ────────────────────────────────────────────────────

function AssignModal({ locker, activeSeason, onClose, onSaved }) {
  const defaultExpiry = locker?.expires_at || activeSeason?.end_date || ''
  const [studentSearch, setStudentSearch] = useState(locker?.assigned_to_detail?.display_name || '')
  const [studentList, setStudentList] = useState([])
  const [picked, setPicked] = useState(locker?.assigned_to_detail || null)
  const [expiresAt, setExpiresAt] = useState(defaultExpiry)
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>
            {isEdit ? `Edit Locker #${String(locker.number).padStart(2,'0')}` : `Assign Locker #${String(locker?.number || '').padStart(2,'0')}`}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student</div>
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
                      <div key={s.id} onClick={() => { setPicked(s); setStudentSearch('') }}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}>
                        {s.display_name || `${s.first_name} ${s.last_name}`}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          {[
            ['Locker Type', <select value={lockerType} onChange={e => setLockerType(e.target.value)}>
              <option value="complimentary">Complimentary (4-class perk)</option>
              <option value="paid">Paid ($50/season)</option>
            </select>],
            ...(lockerType === 'paid' ? [['Payment method', <select value={paymentType} onChange={e => setPaymentType(e.target.value)}>
              <option value="">Select…</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="eftpos">EFTPOS</option>
            </select>]] : []),
            ['Payment Status', <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="waived">Waived</option>
            </select>],
            ['Expiry Date', <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} placeholder={activeSeason?.end_date || ''} />],
            ['Notes', <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional…" />],
          ].map(([label, field]) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              {field}
            </div>
          ))}
          {activeSeason?.end_date && !locker?.expires_at && (
            <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 14, marginTop: -8 }}>
              Auto-set to season end: {activeSeason.end_date}
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={keyIssued} onChange={e => setKeyIssued(e.target.checked)} style={{ width: 15, height: 15 }} />
            Key issued to student
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" style={{ flex: 1 }} disabled={saving || !picked}>
              {saving ? 'Saving…' : isEdit ? 'Save' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminLockers() {
  const { data: lockerData, loading, refetch } = useApi(() => lockers.list(), [])
  const { data: eligibleData, refetch: refetchEligible } = useApi(() => lockers.eligible(), [])
  const { data: seasonsData } = useApi(() => seasons.list(), [])
  const lockerList = lockerData?.results || lockerData || []
  const activeSeason = (seasonsData?.results || seasonsData || []).find(s => s.status === 'active') || null

  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState(null)
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const lockerMap = {}
  lockerList.forEach(l => { lockerMap[l.number] = l })

  const eligible = eligibleData?.eligible || []
  const eligibleWithoutLocker = eligible.filter(s => !s.has_locker)
  const seasonName = eligibleData?.season?.name || activeSeason?.name || 'Current Season'

  // Stats
  const freeLockers = lockerList.filter(l => l.locker_type === 'complimentary').length
  const paidLockers = lockerList.filter(l => l.locker_type === 'paid').length
  const overdue = lockerList.filter(l => l.locker_type === 'paid' && l.payment_status === 'unpaid').length
  const available = TOTAL_LOCKERS - lockerList.length

  // Grid color per locker
  function gridStyle(num) {
    const l = lockerMap[num]
    if (!l) return { bg: '#181818', border: 'var(--border)', color: '#444' }
    if (l.key_lost) return { bg: 'rgba(255,68,68,0.15)', border: 'rgba(255,68,68,0.5)', color: 'var(--red)' }
    if (l.locker_type === 'paid' && l.payment_status === 'unpaid')
      return { bg: 'rgba(255,68,68,0.12)', border: 'rgba(255,68,68,0.35)', color: 'var(--red)' }
    if (l.locker_type === 'paid')
      return { bg: 'rgba(100,220,100,0.12)', border: 'rgba(100,220,100,0.4)', color: '#7cf07c' }
    return { bg: 'rgba(255,165,0,0.1)', border: 'rgba(255,165,0,0.4)', color: 'var(--amber)' }
  }

  async function toggleKeyIssued(l) {
    setBusy(l.id + '-ki')
    await lockers.update(l.id, { key_issued: !l.key_issued })
    refetch(); setBusy(null)
  }

  async function toggleKeyReturned(l) {
    setBusy(l.id + '-kr')
    await lockers.update(l.id, { key_returned: !l.key_returned })
    refetch(); setBusy(null)
  }

  async function reportLostKey(l) {
    if (!confirm(`Report key lost for Locker #${l.number} (${l.assigned_to_detail?.display_name})? This creates a $50 charge.`)) return
    setBusy(l.id + '-lk')
    try { await lockers.lostKey(l.id); refetch(); showToast('Key marked as lost. $50 charge created.') }
    catch (e) { showToast(e.response?.data?.detail || 'Failed to report lost key.', 'err') }
    setBusy(null)
  }

  async function chasePayment(l) {
    if (!confirm(`Send a payment reminder to ${l.assigned_to_detail?.display_name} for Locker #${l.number}?`)) return
    setBusy(l.id + '-chase')
    try { await lockers.chase(l.id); showToast(`Reminder sent to ${l.assigned_to_detail?.display_name}.`) }
    catch (e) { showToast(e.response?.data?.detail || 'Failed to send reminder.', 'err') }
    setBusy(null)
  }

  async function unassign(l) {
    if (!confirm(`Unassign Locker #${l.number}?`)) return
    await lockers.update(l.id, { assigned_to: null, expires_at: null, assigned_at: null })
    refetch()
  }

  function openAssign(number, prefillStudent) {
    const existing = lockerMap[number]
    const locker = prefillStudent
      ? { number, assigned_to_detail: prefillStudent, locker_type: 'complimentary', payment_status: 'waived' }
      : existing || { number }
    setModal(locker)
  }

  function openAssignForStudent(student) {
    let freeNum = null
    for (let i = 1; i <= TOTAL_LOCKERS; i++) { if (!lockerMap[i]) { freeNum = i; break } }
    if (!freeNum) { showToast('No free lockers available.', 'err'); return }
    openAssign(freeNum, student)
  }

  return (
    <div className="page-content">
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.type === 'err' ? 'var(--red)' : '#1a3800', border: `1px solid ${toast.type === 'err' ? 'rgba(255,68,68,0.5)' : 'var(--lime)'}`, color: toast.type === 'err' ? '#fff' : 'var(--lime)', padding: '10px 20px', borderRadius: 10, fontSize: 13, pointerEvents: 'none' }}>
          {toast.msg}
        </div>
      )}
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Lockers</h1>
          <div className="page-sub">{TOTAL_LOCKERS} lockers · {seasonName} · Reception Area</div>
        </div>
        <button className="btn btn-lime" onClick={() => {
          const num = parseInt(prompt('Enter locker number (1–36):'))
          if (num >= 1 && num <= TOTAL_LOCKERS) openAssign(num)
        }}>+ Assign Locker</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'FREE LOCKERS', val: loading ? '…' : freeLockers, sub: 'Auto — 4+ classes/season', color: 'var(--amber)' },
          { label: 'PAID LOCKERS', val: loading ? '…' : paidLockers, sub: '$50/season', color: 'var(--lime)' },
          { label: 'AVAILABLE', val: loading ? '…' : available, sub: 'Unassigned', color: '#fff' },
          { label: 'PENDING', val: loading ? '…' : eligibleWithoutLocker.length, sub: 'Need locker assigned', color: eligibleWithoutLocker.length > 0 ? 'var(--amber)' : 'var(--grey)' },
          { label: 'OVERDUE', val: loading ? '…' : overdue, sub: 'Chase needed', color: overdue > 0 ? 'var(--red)' : 'var(--grey)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Auto-Assign Required banner */}
      {eligibleWithoutLocker.length > 0 && (
        <div style={{ background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)', marginBottom: 12 }}>
            ⚡ Auto-Assign Required — students in 4+ classes without a locker
          </div>
          {eligibleWithoutLocker.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid rgba(255,165,0,0.15)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.display_name}</div>
                <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{s.enrolment_count} classes this season — entitled to a free locker</div>
              </div>
              <button className="btn btn-sm" style={{ background: 'var(--amber)', color: '#000', fontWeight: 700, flexShrink: 0 }}
                onClick={() => openAssignForStudent(s)}>
                Assign Locker
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Locker Map */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 10 }}>Locker Map</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          {[
            ['rgba(255,165,0,0.1)', 'rgba(255,165,0,0.4)', 'Free (auto)'],
            ['rgba(100,220,100,0.12)', 'rgba(100,220,100,0.4)', 'Paid'],
            ['rgba(255,68,68,0.12)', 'rgba(255,68,68,0.35)', 'Overdue / Key Lost'],
            ['#181818', 'var(--border)', 'Available'],
          ].map(([bg, border, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--grey)' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: bg, border: `1px solid ${border}` }} />
              {label}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, maxWidth: 480 }}>
          {Array.from({ length: TOTAL_LOCKERS }, (_, i) => {
            const num = i + 1
            const s = gridStyle(num)
            const l = lockerMap[num]
            return (
              <div key={num}
                onClick={() => openAssign(num)}
                title={l ? `${l.assigned_to_detail?.display_name}` : 'Available'}
                style={{ aspectRatio: '1', borderRadius: 8, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, color: s.color }}>{String(num).padStart(2, '0')}</div>
                {l && <div style={{ fontSize: 9, color: s.color, opacity: 0.8 }}>{l.locker_type === 'paid' ? 'Paid' : 'Free'}</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Assignments Table */}
      <div>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 14 }}>Assignments</div>
        {loading ? (
          <div style={{ color: 'var(--grey)', fontSize: 13 }}>Loading…</div>
        ) : lockerList.length === 0 ? (
          <div style={{ color: 'var(--grey)', fontSize: 13, padding: '24px', textAlign: 'center', background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)' }}>
            No lockers assigned yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['LOCKER', 'STUDENT', 'TYPE', 'SEASON FEE', 'PAID', 'KEY STATUS', 'ACTIONS'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: 'var(--grey)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lockerList.map(l => {
                  const isOverdue = l.locker_type === 'paid' && l.payment_status === 'unpaid'
                  const isPaid = l.locker_type === 'paid' && l.payment_status === 'paid'
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 12px', fontFamily: "'Archivo Black', sans-serif", color: isOverdue ? 'var(--red)' : 'var(--lav)', whiteSpace: 'nowrap' }}>
                        #{String(l.number).padStart(2, '0')}
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{l.assigned_to_detail?.display_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 1 }}>{l.assigned_to_detail?.email}</div>
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '3px 8px', border: '1px solid',
                          ...(l.locker_type === 'paid'
                            ? { color: '#7cf07c', borderColor: 'rgba(100,220,100,0.5)', background: 'rgba(100,220,100,0.1)' }
                            : { color: 'var(--amber)', borderColor: 'rgba(255,165,0,0.5)', background: 'rgba(255,165,0,0.1)' })
                        }}>
                          {l.locker_type === 'paid' ? 'PAID' : 'FREE'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 12px', color: isOverdue ? 'var(--red)' : l.locker_type === 'paid' ? '#fff' : 'var(--grey)', fontWeight: isOverdue ? 700 : 400 }}>
                        {l.locker_type === 'paid' ? (isOverdue ? '$50 OVERDUE' : '$50') : '—'}
                      </td>
                      <td style={{ padding: '12px 12px', color: isOverdue ? 'var(--red)' : isPaid ? 'var(--lime)' : l.locker_type === 'paid' ? 'var(--amber)' : 'var(--lime)', fontWeight: 600 }}>
                        {isOverdue ? 'Overdue' : isPaid ? 'Paid' : l.locker_type === 'paid' ? 'Unpaid' : seasonName}
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>
                            <input type="checkbox" checked={l.key_issued} disabled={busy === l.id + '-ki'}
                              onChange={() => toggleKeyIssued(l)} style={{ width: 13, height: 13 }} />
                            Key given
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>
                            <input type="checkbox" checked={l.key_returned} disabled={busy === l.id + '-kr'}
                              onChange={() => toggleKeyReturned(l)} style={{ width: 13, height: 13 }} />
                            Key returned
                          </label>
                          {l.key_lost && (
                            <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>⚠ KEY LOST</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="btn btn-ghost btn-xs" onClick={() => openAssign(l.number)}>Edit</button>
                          {isOverdue && (
                            <button className="btn btn-xs" style={{ background: 'var(--amber)', color: '#000', fontWeight: 700 }}
                              onClick={() => chasePayment(l)} disabled={busy === l.id + '-chase'}>
                              {busy === l.id + '-chase' ? '…' : 'Chase'}
                            </button>
                          )}
                          {!l.key_lost && (
                            <button className="btn btn-ghost btn-xs" style={{ color: 'var(--amber)', fontSize: 10 }}
                              onClick={() => reportLostKey(l)} disabled={busy === l.id + '-lk'}>
                              {busy === l.id + '-lk' ? '…' : 'Lost Key'}
                            </button>
                          )}
                          <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => unassign(l)}>Unassign</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <AssignModal
          locker={modal}
          activeSeason={activeSeason}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refetch(); refetchEligible() }}
        />
      )}
    </div>
  )
}
