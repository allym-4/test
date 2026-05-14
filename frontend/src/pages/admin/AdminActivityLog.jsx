import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { payments } from '../../api'
import '../StudentsPage.css'

const TYPE_TAG = {
  payment: 'tag-lime',
  charge: 'tag-red',
  credit: 'tag-lav',
  refund: 'tag-amber',
  no_show_fee: 'tag-red',
}

export default function AdminActivityLog() {
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const { data, loading } = useApi(() => payments.list(), [])
  const allPayments = data?.results || []

  const filtered = allPayments.filter(p => {
    if (typeFilter !== 'all' && p.payment_type !== typeFilter) return false
    if (search) {
      const name = (p.student_display || '').toLowerCase()
      if (!name.includes(search.toLowerCase())) return false
    }
    return true
  })

  function exportCSV() {
    const rows = [['Date', 'Student', 'Type', 'Amount', 'Description']]
    filtered.forEach(p => rows.push([
      new Date(p.created_at).toLocaleDateString('en-AU'),
      p.student_display || '',
      p.payment_type,
      p.amount,
      p.description || '',
    ]))
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv,' + encodeURIComponent(csv)
    a.download = 'activity-log.csv'
    a.click()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Activity Log</div>
          <div className="page-sub">All studio transactions and events in real time</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={exportCSV}>↓ Export</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {[
          {
            label: 'Activity Type', id: 'type', val: typeFilter, set: setTypeFilter,
            options: [['all', 'All'], ['payment', 'Payment'], ['charge', 'Charge'], ['credit', 'Credit'], ['refund', 'Refund'], ['no_show_fee', 'No-show Fee']],
          },
          {
            label: 'Search Student', id: 'search', val: search, set: setSearch, isText: true,
          },
        ].map(f => (
          <div key={f.id} style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{f.label}</div>
            {f.isText ? (
              <input value={f.val} onChange={e => f.set(e.target.value)} placeholder="Name or email…" style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', fontFamily: 'inherit', fontSize: 13, padding: '9px 12px', boxSizing: 'border-box' }} />
            ) : (
              <select value={f.val} onChange={e => f.set(e.target.value)} style={{ width: '100%', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', fontFamily: 'inherit', fontSize: 13, padding: '9px 12px', cursor: 'pointer' }}>
                {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            )}
          </div>
        ))}
      </div>

      <div className="tbl-section">
        <table>
          <thead><tr><th>Date</th><th>Student</th><th>Type</th><th>Amount</th><th>Description</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--grey)', padding: '24px 0' }}>Loading…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--grey)', padding: '32px 0' }}>No activity found</td></tr>}
            {filtered.map(p => {
              const isPayment = p.payment_type === 'payment' || p.payment_type === 'credit'
              return (
                <tr key={p.id}>
                  <td style={{ color: 'var(--grey)', whiteSpace: 'nowrap' }}>{new Date(p.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td style={{ fontWeight: 500 }}>{p.student_display || '—'}</td>
                  <td><span className={`tag ${TYPE_TAG[p.payment_type] || 'tag-grey'}`} style={{ fontSize: 10 }}>{p.payment_type.replace(/_/g, ' ')}</span></td>
                  <td style={{ color: isPayment ? 'var(--lime)' : 'var(--red)', fontWeight: 600 }}>
                    {isPayment ? '+' : '-'}${Math.abs(parseFloat(p.amount || 0)).toFixed(2)}
                  </td>
                  <td style={{ color: 'var(--grey)', fontSize: 12 }}>{p.description || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
