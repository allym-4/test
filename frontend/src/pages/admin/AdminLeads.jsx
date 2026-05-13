import { useState } from 'react'

const LEADS = [
  { id: 1, name: 'Priya Sharma', email: 'priya.sharma@gmail.com', source: 'Instagram', date: '12 May', status: 'new', lastContact: null, assigned: 'Mimi' },
  { id: 2, name: 'Katie Wu', email: 'katiewu@hotmail.com', source: 'Google', date: '11 May', status: 'trial_booked', lastContact: '12 May', assigned: 'Chloe' },
  { id: 3, name: 'Bianca Forde', email: 'bianca.forde@me.com', source: 'Referral', date: '10 May', status: 'follow_up', lastContact: '11 May', assigned: 'Mimi' },
  { id: 4, name: 'Lily Anderson', email: 'lily.a@gmail.com', source: 'Instagram', date: '9 May', status: 'follow_up', lastContact: '10 May', assigned: 'Mimi' },
  { id: 5, name: 'Zara Nguyen', email: 'zara.n@gmail.com', source: 'Website', date: '8 May', status: 'new', lastContact: null, assigned: null },
  { id: 6, name: 'Mia Torres', email: 'mia.torres@outlook.com', source: 'Instagram', date: '7 May', status: 'trial_booked', lastContact: '8 May', assigned: 'Chloe' },
  { id: 7, name: 'Rachel Kim', email: 'rachk@gmail.com', source: 'Google', date: '5 May', status: 'cold', lastContact: '6 May', assigned: 'Mimi' },
  { id: 8, name: 'Sienna Park', email: 'siennapark@gmail.com', source: 'Referral', date: '3 May', status: 'follow_up', lastContact: '5 May', assigned: 'Mimi' },
]

const STATUS_TAG = {
  new:          { label: 'New Enquiry',      cls: 'tag-lav' },
  trial_booked: { label: 'Trial Booked',     cls: 'tag-amber' },
  follow_up:    { label: 'Follow-up Needed', cls: 'tag-red' },
  cold:         { label: 'Cold',             cls: 'tag-grey' },
  enrolled:     { label: 'Enrolled',         cls: 'tag-lime' },
}

export default function AdminLeads() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const counts = { all: LEADS.length }
  for (const s of ['new', 'trial_booked', 'follow_up', 'cold']) {
    counts[s] = LEADS.filter(l => l.status === s).length
  }

  const shown = LEADS.filter(l => {
    const matchFilter = filter === 'all' || l.status === filter
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Leads</div>
          <div className="page-sub">Enquiries, sign-ups and trial follow-ups</div>
        </div>
        <button className="btn btn-lime btn-sm">+ Add Lead</button>
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        {[['all', 'All'], ['new', 'New Enquiry'], ['trial_booked', 'Trial Booked'], ['follow_up', 'Follow-up'], ['cold', 'Cold']].map(([key, label]) => (
          <span key={key} className={`filter-tag ${filter === key ? 'active-tag' : ''}`} onClick={() => setFilter(key)}>
            {label} {counts[key] > 0 ? `(${counts[key]})` : ''}
          </span>
        ))}
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '8px 12px', fontSize: 13, outline: 'none', width: 260 }}
        />
      </div>

      <div className="tbl-section">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Source</th>
              <th>Enquiry Date</th>
              <th>Status</th>
              <th>Last Contact</th>
              <th>Assigned</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(l => {
              const tag = STATUS_TAG[l.status] || { label: l.status, cls: 'tag-grey' }
              return (
                <tr key={l.id} className="clickable">
                  <td>
                    <b>{l.name}</b>
                    <div style={{ fontSize: 11, color: 'var(--grey)' }}>{l.email}</div>
                  </td>
                  <td style={{ color: 'var(--grey)', fontSize: 12 }}>{l.source}</td>
                  <td style={{ color: 'var(--grey)', fontSize: 12 }}>{l.date}</td>
                  <td><span className={`tag ${tag.cls}`} style={{ fontSize: 10 }}>{tag.label}</span></td>
                  <td style={{ color: 'var(--grey)', fontSize: 12 }}>{l.lastContact || '—'}</td>
                  <td style={{ color: 'var(--grey)', fontSize: 12 }}>{l.assigned || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-xs" style={{ marginRight: 4 }}>View</button>
                    {l.status === 'follow_up' && <button className="btn btn-lime btn-xs" style={{ marginRight: 4 }}>Follow Up</button>}
                    {l.status === 'trial_booked' && <button className="btn btn-lime btn-xs" style={{ marginRight: 4 }}>Enroll</button>}
                    {l.status === 'cold' && <button className="btn btn-ghost btn-xs">Re-engage</button>}
                  </td>
                </tr>
              )
            })}
            {shown.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--grey)', padding: '32px 0' }}>No leads found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
