import { useApi } from '../hooks/useApi'
import { useAuth } from '../contexts/AuthContext'
import { classes, payments } from '../api'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function InstructorPay() {
  const { user } = useAuth()
  const { data: sessions, loading: sessLoading } = useApi(() => classes.list({ instructor: user?.id }), [user?.id])
  const { data: payData, loading: payLoading } = useApi(() => payments.list({ instructor: user?.id }), [user?.id])

  const sessionList = sessions?.results || sessions || []
  const payList = payData?.results || payData || []

  const loading = sessLoading || payLoading

  const classCount = sessionList.length
  const totalEarned = payList.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Pay & Earnings</div>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>Your teaching schedule and payment history</div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', marginBottom: 8 }}>Classes Teaching</div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lime)' }}>{classCount}</div>
            </div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', marginBottom: 8 }}>Total Paid</div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lime)' }}>${totalEarned.toFixed(2)}</div>
            </div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', marginBottom: 8 }}>Pay Records</div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lav)' }}>{payList.length}</div>
            </div>
          </div>

          {sessionList.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Your Classes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sessionList.map(s => (
                  <div key={s.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                        {DAYS[s.day_of_week]} · {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                      </div>
                    </div>
                    <span className="tag tag-lav" style={{ fontSize: 10 }}>{s.level || 'All levels'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {payList.length > 0 ? (
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Payment History</div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {payList.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderBottom: i < payList.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.description || p.payment_type || 'Payment'}</div>
                      <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                      </div>
                    </div>
                    <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, color: 'var(--lime)' }}>
                      ${parseFloat(p.amount || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--grey)', fontSize: 13 }}>
              No payment records yet. Contact your studio admin to set up pay.
            </div>
          )}
        </>
      )}
    </div>
  )
}
