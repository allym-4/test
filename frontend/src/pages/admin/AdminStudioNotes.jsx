import { useState } from 'react'
import '../StudentsPage.css'
import { useApi } from '../../hooks/useApi'
import { announcements as announcementsApi } from '../../api'

function NoteModal({ note, noteType, onClose, onSaved }) {
  const [title, setTitle] = useState(note?.title || '')
  const [body, setBody] = useState(note?.body || '')
  const [pinned, setPinned] = useState(note?.is_pinned ?? false)
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (note?.id) {
        await announcementsApi.update(note.id, { title, body, is_pinned: pinned })
      } else {
        await announcementsApi.create({ title, body, is_pinned: pinned, note_type: noteType })
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 480 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{note?.id ? 'Edit Note' : 'New Note'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={submit}>
          <div className="field"><label>Title</label><input value={title} onChange={e => setTitle(e.target.value)} required /></div>
          <div className="field"><label>Content</label><textarea rows={4} value={body} onChange={e => setBody(e.target.value)} required style={{ width: '100%', background: 'var(--input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '9px 12px', fontSize: 13, resize: 'vertical' }} /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div onClick={() => setPinned(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, background: pinned ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: pinned ? 19 : 3, transition: 'left 0.2s' }} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--grey)' }}>Pin to top</span>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function NoteList({ notes, onEdit, onDelete, onTogglePin, deleting }) {
  const sorted = [...notes].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
  if (sorted.length === 0) return <div className="empty-state">No notes yet</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sorted.map(note => (
        <div key={note.id} style={{ background: 'var(--card)', border: `1px solid ${note.is_pinned ? 'rgba(204,255,0,0.2)' : 'var(--border)'}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {note.is_pinned && <span className="tag tag-lime" style={{ fontSize: 9 }}>Pinned</span>}
              <div style={{ fontWeight: 600, fontSize: 13 }}>{note.title}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn btn-ghost btn-xs" onClick={() => onTogglePin(note)}>{note.is_pinned ? 'Unpin' : 'Pin'}</button>
              <button className="btn btn-ghost btn-xs" onClick={() => onEdit(note)}>Edit</button>
              <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }} disabled={deleting === note.id} onClick={() => onDelete(note.id)}>{deleting === note.id ? '…' : 'Del'}</button>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.5, marginBottom: 8 }}>{note.body}</div>
          <div style={{ fontSize: 11, color: 'var(--grey)' }}>
            {note.created_by_name || 'Staff'} · {new Date(note.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminStudioNotes() {
  const [tab, setTab] = useState('staff')
  const [modal, setModal] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const noteType = tab === 'staff' ? 'staff' : 'announcement'
  const { data, loading, refetch } = useApi(() => announcementsApi.list({ note_type: noteType }), [noteType])
  const notes = data?.results || data || []

  async function handleDelete(id) {
    if (!confirm('Delete this note?')) return
    setDeleting(id)
    try {
      await announcementsApi.delete(id)
      refetch()
    } finally {
      setDeleting(null)
    }
  }

  async function handleTogglePin(note) {
    await announcementsApi.update(note.id, { is_pinned: !note.is_pinned })
    refetch()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Studio Notes</div>
          <div className="page-sub">Noticeboard for staff and students</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => setModal({ note: null })}>+ New Note</button>
      </div>

      <div className="subtabs" style={{ marginBottom: 20 }}>
        {[['staff', 'Staff Notes'], ['announcements', 'Student Announcements']].map(([key, label]) => (
          <div key={key} className={`subtab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--grey)' }}>Loading…</div>
      ) : (
        <NoteList notes={notes} onEdit={note => setModal({ note })} onDelete={handleDelete} onTogglePin={handleTogglePin} deleting={deleting} />
      )}

      {modal && (
        <NoteModal
          note={modal.note}
          noteType={noteType}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refetch() }}
        />
      )}
    </div>
  )
}
