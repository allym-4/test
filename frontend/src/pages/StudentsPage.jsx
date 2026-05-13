import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { users, payments } from '../api'

const AVATAR_COLORS = ['#b0a0ff', '#ccff00', '#ffaa00', '#ff88aa', '#44ffcc', '#ffcc88', '#b0f0b0']
function avatarColor(name) {
  let h = 0
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

export default function StudentsPage() {
  const { data, loading } = useApi(() => users.list({ role: 'student' }))
  const [selected, setSelected] = useState(null)
  const [balanceData, setBalanceData] = useState(null)
  const [loadingBalance, setLoadingBalance] = useState(false)

  const students = data?.results || []

  async function openStudent(student) {
    setSelected(student)
    setBalanceData(null)
    setLoadingBalance(true)
    try {
      const res = await payments.balance(student.id)
      setBalanceData(res.data)
    } finally {
      setLoadingBalance(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Students</div>
          <div className="page-sub">{students.length} enrolled</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><div className="spinner" /></div>
      ) : (
        <div className="list-card">
          {students.map(s => (
            <div key={s.id} className="list-row clickable" onClick={() => openStudent(s)}>
              <div className="avatar" style={{ background: avatarColor(s.display_name) }}>
                {s.first_name?.[0] || '?'}
              </div>
              <div className="list-body">
                <div className="list-title">{s.display_name}</div>
                <div className="list-sub">{s.pronouns || 'No pronouns listed'}</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--grey)' }}>›</span>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 600, maxHeight: '80dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatar" style={{ background: avatarColor(selected.display_name), width: 42, height: 42, fontSize: 16 }}>
                {selected.first_name?.[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>{selected.display_name}</div>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{selected.pronouns} · {selected.email}</div>
              </div>
              <button className="btn btn-ghost btn-xs" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={{ padding: 20, overflowY: 'auto' }}>
              {loadingBalance ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
              ) : balanceData && (
                <>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 12, fontWeight: 500 }}>Balance</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                    <div className="card" style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: parseFloat(balanceData.balance) >= 0 ? 'var(--lime)' : 'var(--red)' }}>
                        ${Math.abs(balanceData.balance)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--grey)', marginTop: 3 }}>{parseFloat(balanceData.balance) >= 0 ? 'Credit' : 'Owing'}</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20 }}>${balanceData.total_charged}</div>
                      <div style={{ fontSize: 10, color: 'var(--grey)', marginTop: 3 }}>Charged</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20 }}>${balanceData.total_paid}</div>
                      <div style={{ fontSize: 10, color: 'var(--grey)', marginTop: 3 }}>Paid</div>
                    </div>
                  </div>
                </>
              )}
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 8, fontWeight: 500 }}>Contact</div>
              <div className="card" style={{ marginBottom: 0 }}>
                {selected.phone && <div style={{ fontSize: 13, marginBottom: 6 }}>{selected.phone}</div>}
                <div style={{ fontSize: 13, color: 'var(--grey)' }}>{selected.email}</div>
                {selected.emergency_contact_name && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--grey)' }}>
                    Emergency: {selected.emergency_contact_name} · {selected.emergency_contact_phone}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
