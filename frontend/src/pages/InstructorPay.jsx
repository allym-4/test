import { useApi } from '../hooks/useApi'
import { useAuth } from '../contexts/AuthContext'
import { instructorPay, classes } from '../api'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function InstructorPay() {
  const { user } = useAuth()
  const { data: payData, loading: payLoading } = useApi(() => instructorPay.list(), [])
  const { data: sessData, loading: sessLoading } = useApi(() => classes.list(), [])

  const records = payData?.results || payData || []
  const sessions = sessData?.results || sessData || []

  const loading = payLoading || sessLoading

  const totalPaid = records.filter(r => r.status === 'paid').reduce((s, r) => s + parseFloat(r.amount || 0), 0)
  const totalPending = records.filter(r => r.status === 'pending').reduce((s, r) => s + parseFloat(r.amount || 0), 0)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Pay & Earnings</div>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>Your payment history from the studio</div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', marginBottom: 8 }}>Total Paid</div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lime)' }}>${totalPaid.toFixed(2)}</div>
            </div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', marginBottom: 8 }}>Pending</div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--amber)' }}>${totalPending.toFixed(2)}</div>
            </div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', marginBottom: 8 }}>Classes Teaching</div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lav)' }}>{sessions.length}</div>
            </div>
          </div>

          {sessions.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Your Classes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sessions.map(s => (
                  <div key={s.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Payment History</div>
            {records.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--grey)', fontSize: 13 }}>
                No pay records yet. Your studio admin will add payments here.
              </div>
            ) : (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {records.map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: i < records.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{r.description || 'Payment'}</div>
                      <div style={{ fontSize: 11, color: 'var(--grey)' }}>
                        {r.period_start && r.period_end
                          ? `${new Date(r.period_start + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${new Date(r.period_end + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
                          : r.created_at ? new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className={`tag ${r.status === 'paid' ? 'tag-lime' : 'tag-amber'}`} style={{ fontSize: 10 }}>
                        {r.status === 'paid' ? '✓ Paid' : 'Pending'}
                      </span>
                      <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, color: r.status === 'paid' ? 'var(--lime)' : 'var(--amber)' }}>
                        ${parseFloat(r.amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
