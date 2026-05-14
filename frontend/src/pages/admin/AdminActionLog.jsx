import { useState } from 'react'
import '../StudentsPage.css'

const PENDING_DEFAULT = [
  { id: 0, icon: '🛍', title: 'New order — prepare for pickup', body: 'Ruby Kim ordered Pole Grip Aid (Medium) — not yet collected', meta: '9:32am · Retail', urgent: false },
  { id: 1, icon: '🛍', title: 'New order — prepare for pickup', body: 'Tara Bell ordered Duality Crop Top (S) — not yet collected', meta: '8:14am · Retail', urgent: false },
  { id: 2, icon: '👋', title: 'New student coming today — please greet', body: 'Priya Sharma · Level 1 at 5:30pm · Instructor: Chloe · Waiver not yet signed', meta: 'Today · Student', urgent: false },
  { id: 3, icon: '🩹', title: 'Injury check-in overdue', body: 'Jess Malone · right shoulder impingement · check-in was due 17 May', meta: 'Overdue · Health', urgent: true },
]

const HISTORY = [
  { date: '12 May', item: 'New order — Jess Malone: Pole Shorts (M)', type: 'Retail', by: 'Mimi', time: '10:14am' },
  { date: '11 May', item: 'Injury check-in — Ruby Kim', type: 'Health', by: 'Chloe', time: '6:45pm' },
  { date: '11 May', item: 'New order — Nina Torres: Grip Aid (Small)', type: 'Retail', by: 'Mimi', time: '9:02am' },
  { date: '10 May', item: 'Exemption request — Amber Cole ($40 workshop)', type: 'Payment', by: 'Mimi', time: '2:30pm' },
  { date: '9 May', item: 'New student today — Zoe Clarke, Level 1', type: 'Student', by: 'Chloe', time: '5:28pm' },
  { date: '8 May', item: 'New order — Sophie Lawson: Pole Shorts (XS)', type: 'Retail', by: 'Mimi', time: '11:20am' },
  { date: '7 May', item: 'Catch-up approved — Jess Malone', type: 'Catch-up', by: 'Mimi', time: '3:15pm' },
]

function AddItemModal({ onClose, onSaved }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  function submit(e) {
    e.preventDefault()
    onSaved({ id: Date.now(), icon: '📌', title, body, meta: 'Just now · Manual', urgent: false })
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 420 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Add Action Item</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={submit}>
          <div className="field"><label>Title</label><input value={title} onChange={e => setTitle(e.target.value)} required /></div>
          <div className="field"><label>Details</label><textarea rows={3} value={body} onChange={e => setBody(e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm">Add Item</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminActionLog() {
  const [tab, setTab] = useState('pending')
  const [pending, setPending] = useState(PENDING_DEFAULT)
  const [completed, setCompleted] = useState([])
  const [showModal, setShowModal] = useState(false)

  function markDone(id) {
    const item = pending.find(p => p.id === id)
    if (item) {
      setPending(ps => ps.filter(p => p.id !== id))
      setCompleted(cs => [...cs, item])
    }
  }

  function handleSaved(item) {
    setPending(ps => [...ps, item])
    setShowModal(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Action Items Log</div>
          <div className="page-sub">All studio action items — pending, completed, and history</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => setShowModal(true)}>+ Add Item</button>
      </div>

      <div className="subtabs" style={{ marginBottom: 16 }}>
        {[['pending', `Pending (${pending.length})`], ['completed', 'Completed Today'], ['history', 'History']].map(([key, label]) => (
          <div key={key} className={`subtab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</div>
        ))}
      </div>

      {tab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pending.length === 0 && <div className="empty-state">All caught up — no pending items</div>}
          {pending.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', background: item.urgent ? '#1a0505' : 'var(--card)', border: `1px solid ${item.urgent ? '#3a1010' : 'var(--border)'}`, borderRadius: 10 }}>
              <input type="checkbox" style={{ accentColor: 'var(--lime)', width: 16, height: 16, flexShrink: 0, marginTop: 2, cursor: 'pointer' }} onChange={() => markDone(item.id)} />
              <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{item.body}</div>
                <div style={{ fontSize: 11, color: item.urgent ? 'var(--amber)' : 'var(--grey)', marginTop: 4 }}>{item.meta}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'completed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {completed.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--grey)', padding: '20px 0', textAlign: 'center' }}>No items completed yet today. Tick items above to move them here.</div>
          ) : completed.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, opacity: 0.6 }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>✓</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, textDecoration: 'line-through' }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{item.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="tbl-section">
          <table>
            <thead><tr><th>Date</th><th>Item</th><th>Type</th><th>Completed by</th><th>Time</th></tr></thead>
            <tbody>
              {HISTORY.map((h, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--grey)' }}>{h.date}</td>
                  <td>{h.item}</td>
                  <td><span className="tag tag-grey" style={{ fontSize: 10 }}>{h.type}</span></td>
                  <td>{h.by}</td>
                  <td style={{ color: 'var(--grey)' }}>{h.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <AddItemModal onClose={() => setShowModal(false)} onSaved={handleSaved} />}
    </div>
  )
}
