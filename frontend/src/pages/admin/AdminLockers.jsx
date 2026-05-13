import { useState, useEffect } from 'react'
import { useApi } from '../../hooks/useApi'
import { lockers, users } from '../../api'
import '../StudentsPage.css'

const TOTAL_LOCKERS = 36

function AssignModal({ locker, onClose, onSaved }) {
  const [studentSearch, setStudentSearch] = useState(locker?.assigned_to_detail?.display_name || '')
  const [studentList, setStudentList] = useState([])
  const [picked, setPicked] = useState(locker?.assigned_to_detail || null)
  const [expiresAt, setExpiresAt] = useState(locker?.expires_at || '')
  const [notes, setNotes] = useState(locker?.notes || '')
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
      <div className="sd-modal" style={{ maxWidth: 400 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{title}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <form onSubmit={submit}>
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
                        <div key={s.id} onClick={() => { setPicked(s); setStudentSearch('') }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}>{s.display_name || `${s.first_name} ${s.last_name}`}</div>
                      ))}
                    </div>
                  )}
                </>
              )}
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

export default function AdminLockers() {
  const { data: lockerData, loading, refetch } = useApi(() => lockers.list(), [])
  const lockerList = lockerData?.results || lockerData || []

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

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Lockers</div>
          <div className="page-sub">Locker assignments at The Box</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => {
          const num = parseInt(prompt('Enter locker number (1–36):'))
          if (num >= 1 && num <= TOTAL_LOCKERS) openAssign(num)
        }}>+ Assign Locker</button>
      </div>

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

      <div className="grid-2" style={{ gap: 24 }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Locker Grid — The Box</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {Array.from({ length: TOTAL_LOCKERS }, (_, i) => {
              const num = i + 1
              const locker = lockerMap[num]
              const isAssigned = !!locker
              const isSelected = selected === num
              return (
                <div
                  key={num}
                  onClick={() => setSelected(isSelected ? null : num)}
                  title={isAssigned ? locker.assigned_to_detail?.display_name : 'Available'}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 8,
                    background: isSelected ? 'var(--lime)' : isAssigned ? 'rgba(176,160,255,0.2)' : '#1a1a1a',
                    border: `1px solid ${isSelected ? 'var(--lime)' : isAssigned ? 'rgba(176,160,255,0.4)' : 'var(--border)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                    color: isSelected ? '#000' : isAssigned ? 'var(--lav)' : 'var(--grey)',
                    transition: 'all 0.15s',
                  }}
                >
                  {num}
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 11 }}>
            {[['rgba(176,160,255,0.2)', 'rgba(176,160,255,0.4)', 'Occupied'], ['#1a1a1a', 'var(--border)', 'Available'], ['var(--lime)', 'var(--lime)', 'Selected']].map(([bg, border, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: bg, border: `1px solid ${border}` }} />
                <span style={{ color: 'var(--grey)' }}>{label}</span>
              </div>
            ))}
          </div>

          {selected && (
            <div style={{ marginTop: 16, background: 'var(--card)', border: `1px solid ${selectedLocker ? 'rgba(176,160,255,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Locker #{selected}</div>
              {selectedLocker ? (
                <>
                  <div style={{ fontSize: 13, marginBottom: 2 }}>{selectedLocker.assigned_to_detail?.display_name}</div>
                  {selectedLocker.expires_at && (
                    <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 4 }}>Expires {selectedLocker.expires_at}</div>
                  )}
                  {selectedLocker.notes && (
                    <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 10 }}>{selectedLocker.notes}</div>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-xs" onClick={() => openAssign(selected)}>Edit</button>
                    <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }} onClick={() => unassign(selectedLocker.id)}>Unassign</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10 }}>This locker is available.</div>
                  <button className="btn btn-lime btn-xs" onClick={() => openAssign(selected)}>Assign to Student</button>
                </>
              )}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Assignments</div>
          {loading ? (
            <div style={{ fontSize: 13, color: 'var(--grey)' }}>Loading…</div>
          ) : (
            <div className="tbl-section" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead><tr><th>#</th><th>Student</th><th>Assigned</th><th>Expires</th><th></th></tr></thead>
                <tbody>
                  {lockerList.map(l => (
                    <tr key={l.id} onClick={() => setSelected(l.number)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontFamily: "'Archivo Black', sans-serif", color: selected === l.number ? 'var(--lime)' : 'var(--lav)' }}>{l.number}</td>
                      <td><b>{l.assigned_to_detail?.display_name || '—'}</b></td>
                      <td style={{ fontSize: 12, color: 'var(--grey)' }}>{l.assigned_at || '—'}</td>
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
