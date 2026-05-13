import { useState } from 'react'

const TOTAL_LOCKERS = 36
const ASSIGNMENTS = [
  { locker: 1, student: 'Lily Anderson', since: 'Mar 2025', plan: 'Season 3', expires: 'Jul 2025' },
  { locker: 2, student: 'Bianca Forde', since: 'Feb 2025', plan: 'Season 3', expires: 'Jul 2025' },
  { locker: 3, student: 'Katie Wu', since: 'Apr 2025', plan: 'Season 3', expires: 'Jul 2025' },
  { locker: 5, student: 'Sienna Park', since: 'Mar 2025', plan: 'Season 3', expires: 'Jul 2025' },
  { locker: 8, student: 'Mia Torres', since: 'Feb 2025', plan: 'Season 3', expires: 'Jul 2025' },
  { locker: 9, student: 'Priya Sharma', since: 'May 2025', plan: 'Trial', expires: 'Jun 2025' },
  { locker: 12, student: 'Rachel Kim', since: 'Jan 2025', plan: 'Season 3', expires: 'Jul 2025' },
  { locker: 14, student: 'Zara Nguyen', since: 'Apr 2025', plan: 'Season 3', expires: 'Jul 2025' },
  { locker: 17, student: 'Emma Chen', since: 'Feb 2025', plan: 'Season 3', expires: 'Jul 2025' },
  { locker: 22, student: 'Sofia Russo', since: 'Mar 2025', plan: 'Season 3', expires: 'Jul 2025' },
  { locker: 25, student: 'Jasmine Tran', since: 'May 2025', plan: 'Season 3', expires: 'Jul 2025' },
  { locker: 28, student: 'Natalie Wong', since: 'Jan 2025', plan: 'Season 3', expires: 'Jul 2025' },
  { locker: 30, student: 'Chloe Davies', since: 'Apr 2025', plan: 'Season 3', expires: 'Jul 2025' },
  { locker: 33, student: 'Isabella Moore', since: 'Mar 2025', plan: 'Season 3', expires: 'Jul 2025' },
]

const assignedSet = new Set(ASSIGNMENTS.map(a => a.locker))

export default function AdminLockers() {
  const [selected, setSelected] = useState(null)
  const [showAssign, setShowAssign] = useState(false)

  const selectedAssignment = ASSIGNMENTS.find(a => a.locker === selected)
  const occupied = ASSIGNMENTS.length
  const free = TOTAL_LOCKERS - occupied

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Lockers</div>
          <div className="page-sub">Locker assignments at The Box</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => setShowAssign(true)}>+ Assign Locker</button>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {[
          ['Total Lockers', TOTAL_LOCKERS, 'kpi-lime'],
          ['Occupied', occupied, 'kpi-lav'],
          ['Available', free, free > 0 ? 'kpi-lime' : 'kpi-amber'],
          ['Occupancy', `${Math.round(occupied / TOTAL_LOCKERS * 100)}%`, 'kpi-amber'],
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
              const isAssigned = assignedSet.has(num)
              const isSelected = selected === num
              return (
                <div
                  key={num}
                  onClick={() => setSelected(isSelected ? null : num)}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(176,160,255,0.2)', border: '1px solid rgba(176,160,255,0.4)' }} />
              <span style={{ color: 'var(--grey)' }}>Occupied</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#1a1a1a', border: '1px solid var(--border)' }} />
              <span style={{ color: 'var(--grey)' }}>Available</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--lime)' }} />
              <span style={{ color: 'var(--grey)' }}>Selected</span>
            </div>
          </div>

          {selected && (
            <div style={{ marginTop: 16, background: 'var(--card)', border: `1px solid ${selectedAssignment ? 'rgba(176,160,255,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Locker #{selected}</div>
              {selectedAssignment ? (
                <>
                  <div style={{ fontSize: 13, marginBottom: 2 }}>{selectedAssignment.student}</div>
                  <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 10 }}>Assigned {selectedAssignment.since} · {selectedAssignment.plan} · Expires {selectedAssignment.expires}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-xs">Reassign</button>
                    <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }}>Unassign</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10 }}>This locker is available.</div>
                  <button className="btn btn-lime btn-xs">Assign to Student</button>
                </>
              )}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Assignments</div>
          <div className="tbl-section" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead><tr><th>#</th><th>Student</th><th>Since</th><th>Expires</th><th></th></tr></thead>
              <tbody>
                {ASSIGNMENTS.map(a => (
                  <tr key={a.locker} onClick={() => setSelected(a.locker)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontFamily: "'Archivo Black', sans-serif", color: selected === a.locker ? 'var(--lime)' : 'var(--lav)' }}>{a.locker}</td>
                    <td><b>{a.student}</b></td>
                    <td style={{ fontSize: 12, color: 'var(--grey)' }}>{a.since}</td>
                    <td style={{ fontSize: 12, color: 'var(--grey)' }}>{a.expires}</td>
                    <td><button className="btn btn-ghost btn-xs">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAssign && (
        <div className="sd-overlay" onClick={e => e.target === e.currentTarget && setShowAssign(false)}>
          <div className="sd-modal" style={{ maxWidth: 400 }}>
            <div className="sd-header">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Assign Locker</div>
              <button className="modal-close-btn" onClick={() => setShowAssign(false)}>✕</button>
            </div>
            <div className="sd-body">
              <div className="field"><label>Student</label><input placeholder="Search student…" /></div>
              <div className="field"><label>Locker Number</label><input type="number" min={1} max={TOTAL_LOCKERS} placeholder="1–36" /></div>
              <div className="field"><label>Expiry Date</label><input type="date" /></div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAssign(false)}>Cancel</button>
                <button className="btn btn-lime btn-sm" onClick={() => setShowAssign(false)}>Assign</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
