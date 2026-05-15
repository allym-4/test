import { useState } from 'react'
import '../StudentsPage.css'
import { useApi } from '../../hooks/useApi'
import { actionItems as actionItemsApi } from '../../api'

function AddItemModal({ onClose, onSaved }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSaved({ icon: '📌', title, body, meta: 'Manual', is_urgent: isUrgent })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 420 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Add Action Item</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={submit}>
          <div className="field"><label>Title</label><input value={title} onChange={e => setTitle(e.target.value)} required autoFocus /></div>
          <div className="field"><label>Details</label><textarea rows={3} value={body} onChange={e => setBody(e.target.value)} /></div>
          <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="urgent" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)} style={{ accentColor: 'var(--amber)', width: 14, height: 14 }} />
            <label htmlFor="urgent" style={{ marginBottom: 0, fontSize: 13 }}>Mark as urgent</label>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Add Item'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminActionLog() {
  const [tab, setTab] = useState('pending')
  const [showModal, setShowModal] = useState(false)

  const { data: pendingData, loading: pendingLoading, refetch: refetchPending } = useApi(
    () => actionItemsApi.list({ done: 'false' })
  )
  const { data: doneData, loading: doneLoading, refetch: refetchDone } = useApi(
    () => actionItemsApi.list({ done: 'true' })
  )

  const pending = pendingData?.results || pendingData || []
  const done = doneData?.results || doneData || []

  async function markDone(item) {
    await actionItemsApi.update(item.id, { is_done: true })
    refetchPending()
    refetchDone()
  }

  async function handleSaved(data) {
    await actionItemsApi.create(data)
    refetchPending()
    setShowModal(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Action Items Log</div>
          <div className="page-sub">All studio action items — pending and completed</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => setShowModal(true)}>+ Add Item</button>
      </div>

      <div className="subtabs" style={{ marginBottom: 16 }}>
        {[['pending', `Pending (${pending.length})`], ['completed', `Completed (${done.length})`]].map(([key, label]) => (
          <div key={key} className={`subtab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</div>
        ))}
      </div>

      {tab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pendingLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>}
          {!pendingLoading && pending.length === 0 && <div className="empty-state">All caught up — no pending items</div>}
          {pending.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', background: item.is_urgent ? '#1a0505' : 'var(--card)', border: `1px solid ${item.is_urgent ? '#3a1010' : 'var(--border)'}`, borderRadius: 10 }}>
              <input type="checkbox" style={{ accentColor: 'var(--lime)', width: 16, height: 16, flexShrink: 0, marginTop: 2, cursor: 'pointer' }} onChange={() => markDone(item)} />
              <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon || '📌'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</div>
                {item.body && <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{item.body}</div>}
                {item.meta && <div style={{ fontSize: 11, color: item.is_urgent ? 'var(--amber)' : 'var(--grey)', marginTop: 4 }}>{item.meta}</div>}
              </div>
              {item.is_urgent && <span className="tag tag-amber" style={{ fontSize: 10, flexShrink: 0 }}>Urgent</span>}
            </div>
          ))}
        </div>
      )}

      {tab === 'completed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {doneLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>}
          {!doneLoading && done.length === 0 && <div className="empty-state">No completed items yet</div>}
          {done.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, opacity: 0.6 }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>✓</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, textDecoration: 'line-through' }}>{item.title}</div>
                {item.body && <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{item.body}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <AddItemModal onClose={() => setShowModal(false)} onSaved={handleSaved} />}
    </div>
  )
}
