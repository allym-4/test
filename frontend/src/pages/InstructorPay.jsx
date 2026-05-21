import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../contexts/AuthContext'
import { instructorPay, classes } from '../api'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function InvoiceModal({ record, onClose }) {
  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 420 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Invoice</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{record.description || 'Payment'}</div>
            {record.period_start && record.period_end && (
              <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 4 }}>
                Period: {new Date(record.period_start + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} – {new Date(record.period_end + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 4 }}>
              Status: <span style={{ color: record.status === 'paid' ? 'var(--lime)' : 'var(--amber)' }}>{record.status === 'paid' ? 'Paid' : 'Pending'}</span>
            </div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 24, color: 'var(--lime)', marginTop: 8 }}>
              ${parseFloat(record.amount || 0).toFixed(2)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
            <button className="btn btn-lime btn-sm" onClick={() => window.print()}>Print</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InstructorPay() {
  const { user } = useAuth()
  const { data: payData, loading: payLoading } = useApi(() => instructorPay.list(), [])
  const { data: sessData, loading: sessLoading } = useApi(() => classes.list(), [])
  const [invoiceRecord, setInvoiceRecord] = useState(null)

  const records = payData?.results || payData || []
  const sessions = sessData?.results || sessData || []

  const loading = payLoading || sessLoading

  // KPI calculations
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  function inPeriod(r, start, end) {
    if (!r.period_start || !r.period_end) return false
    const ps = new Date(r.period_start + 'T00:00')
    const pe = new Date(r.period_end + 'T00:00')
    return ps <= end && pe >= start
  }

  // This pay period: period that includes today
  const thisPayRecords = records.filter(r => inPeriod(r, now, now))
  const thisPayTotal = thisPayRecords.reduce((s, r) => s + parseFloat(r.amount || 0), 0)

  // Last pay period: find period just before today's period
  // Heuristic: records whose period_end < today, sorted by period_end desc, take first group
  const pastRecords = records.filter(r => {
    if (!r.period_end) return false
    return new Date(r.period_end + 'T00:00') < now
  }).sort((a, b) => new Date(b.period_end + 'T00:00') - new Date(a.period_end + 'T00:00'))
  const lastPeriodEnd = pastRecords[0]?.period_end
  const lastPayRecords = lastPeriodEnd
    ? pastRecords.filter(r => r.period_end === lastPeriodEnd)
    : []
  const lastPayTotal = lastPayRecords.reduce((s, r) => s + parseFloat(r.amount || 0), 0)

  // Classes this month: records where date or created_at falls in current month
  const classesThisMonth = records.filter(r => {
    const d = r.date ? new Date(r.date + 'T00:00') : r.created_at ? new Date(r.created_at) : null
    if (!d) return false
    return d >= monthStart && d <= monthEnd
  })
  const classesCount = classesThisMonth.length

  // Hours this month: classes × 1.5
  const hoursThisMonth = (classesCount * 1.5).toFixed(1)

  // Season total for classes taught table
  const seasonTotal = records.reduce((s, r) => s + parseFloat(r.amount || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26 }}>Pay &amp; Earnings</div>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 4 }}>Your classes taught and income</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : (
        <>
          {/* 4 KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
            <div className="kpi-lime" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', marginBottom: 8 }}>This Pay Period</div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lime)' }}>${thisPayTotal.toFixed(2)}</div>
            </div>
            <div className="kpi-lav" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', marginBottom: 8 }}>Last Pay Period</div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lav)' }}>${lastPayTotal.toFixed(2)}</div>
            </div>
            <div className="kpi-amber" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', marginBottom: 8 }}>Classes This Month</div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--amber)' }}>{classesCount}</div>
            </div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', marginBottom: 8 }}>Hours This Month</div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--white)' }}>{hoursThisMonth}</div>
            </div>
          </div>

          {/* Classes Taught This Season */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Classes Taught This Season</div>
            {records.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--grey)', fontSize: 13 }}>
                No class records yet.
              </div>
            ) : (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Date', 'Class', 'Students', 'Hours', 'Rate', 'Amount'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--grey)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: i < records.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '11px 14px', color: 'var(--grey)', whiteSpace: 'nowrap' }}>
                          {(r.date || r.created_at) ? new Date((r.date ? r.date + 'T00:00' : r.created_at)).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td style={{ padding: '11px 14px', fontWeight: 500 }}>{r.description || r.class_name || 'Class'}</td>
                        <td style={{ padding: '11px 14px', color: 'var(--grey)' }}>{r.student_count ?? '—'}</td>
                        <td style={{ padding: '11px 14px', color: 'var(--grey)' }}>{r.hours ?? 1.5}</td>
                        <td style={{ padding: '11px 14px', color: 'var(--grey)' }}>{r.rate ? '$' + r.rate : '—'}</td>
                        <td style={{ padding: '11px 14px', color: 'var(--lime)', fontWeight: 600 }}>{r.amount ? '$' + parseFloat(r.amount).toFixed(2) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'rgba(204,255,0,0.07)', borderTop: '1px solid var(--border)' }}>
                      <td colSpan={5} style={{ padding: '11px 14px', fontWeight: 700, fontSize: 13 }}>Season total</td>
                      <td style={{ padding: '11px 14px', fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: 'var(--lime)' }}>${seasonTotal.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Payment History */}
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
                      <button className="btn btn-ghost btn-xs" onClick={() => setInvoiceRecord(r)}>Invoice</button>
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

          <p style={{ fontSize: 12, color: 'var(--grey)', marginTop: 24 }}>
            Questions about your pay? Contact <a href="mailto:admin@dualitypole.com" style={{ color: 'var(--lime)' }}>admin@dualitypole.com</a>
          </p>
        </>
      )}

      {invoiceRecord && <InvoiceModal record={invoiceRecord} onClose={() => setInvoiceRecord(null)} />}
    </div>
  )
}
