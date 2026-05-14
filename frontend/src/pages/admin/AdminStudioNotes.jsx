import { useState } from 'react'
import '../StudentsPage.css'

const STAFF_NOTES_DEFAULT = [
  { id: 1, title: 'Jess Malone — shoulder injury', body: 'Right shoulder impingement. No shoulder mounts or iron X until clearance from physio. Check-in due 24 May.', author: 'Mimi', date: '12 May', pinned: true },
  { id: 2, title: 'Studio temp control', body: 'The Box AC remote is in the top drawer of the front desk. Set to 21°C for class. Please return after use.', author: 'Mimi', date: '1 May', pinned: true },
  { id: 3, title: 'Grip aid restock needed', body: 'Running low on Dry Hands and iTac. Please order before end of week.', author: 'Chloe', date: '10 May', pinned: false },
]

const ANNOUNCEMENTS_DEFAULT = [
  { id: 1, title: 'Season 4 opens 14 July 🎉', body: 'Enrolments open to existing students on 14 July at 9am. New student bookings open 21 July. Share the excitement!', author: 'Mimi', date: '13 May', pinned: true },
  { id: 2, title: 'Studio closed — Queen\'s Birthday weekend', body: 'The studio will be closed Saturday 7 June and Sunday 8 June for the long weekend. No classes scheduled.', author: 'Mimi', date: '5 May', pinned: false },
]

function NoteModal({ note, onClose, onSaved }) {
  const [title, setTitle] = useState(note?.title || '')
  const [body, setBody] = useState(note?.body || '')
  const [pinned, setPinned] = useState(note?.pinned ?? false)

  function submit(e) {
    e.preventDefault()
    onSaved({ ...note, title, body, pinned, date: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }), author: 'Mimi' })
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
          <div className="field"><label>Content</label><textarea rows={4} value={body} onChange={e => setBody(e.target.value)} required /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div onClick={() => setPinned(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, background: pinned ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: pinned ? 19 : 3, transition: 'left 0.2s' }} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--grey)' }}>Pin to top</span>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function NoteList({ notes, onEdit, onDelete, onTogglePin }) {
  const sorted = [...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
  if (sorted.length === 0) return <div className="empty-state">No notes yet</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sorted.map(note => (
        <div key={note.id} style={{ background: 'var(--card)', border: `1px solid ${note.pinned ? 'rgba(204,255,0,0.2)' : 'var(--border)'}`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {note.pinned && <span className="tag tag-lime" style={{ fontSize: 9 }}>Pinned</span>}
              <div style={{ fontWeight: 600, fontSize: 13 }}>{note.title}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn btn-ghost btn-xs" onClick={() => onTogglePin(note.id)}>{note.pinned ? 'Unpin' : 'Pin'}</button>
              <button className="btn btn-ghost btn-xs" onClick={() => onEdit(note)}>Edit</button>
              <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }} onClick={() => onDelete(note.id)}>Del</button>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.5, marginBottom: 8 }}>{note.body}</div>
          <div style={{ fontSize: 11, color: 'var(--grey)' }}>{note.author} · {note.date}</div>
        </div>
      ))}
    </div>
  )
}

export default function AdminStudioNotes() {
  const [tab, setTab] = useState('staff')
  const [staffNotes, setStaffNotes] = useState(STAFF_NOTES_DEFAULT)
  const [announcements, setAnnouncements] = useState(ANNOUNCEMENTS_DEFAULT)
  const [modal, setModal] = useState(null)

  const notes = tab === 'staff' ? staffNotes : announcements
  const setNotes = tab === 'staff' ? setStaffNotes : setAnnouncements

  function handleSaved(note) {
    if (note.id) {
      setNotes(ns => ns.map(n => n.id === note.id ? note : n))
    } else {
      setNotes(ns => [...ns, { ...note, id: Date.now() }])
    }
    setModal(null)
  }

  function handleDelete(id) {
    if (!confirm('Delete this note?')) return
    setNotes(ns => ns.filter(n => n.id !== id))
  }

  function handleTogglePin(id) {
    setNotes(ns => ns.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n))
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

      <NoteList notes={notes} onEdit={note => setModal({ note })} onDelete={handleDelete} onTogglePin={handleTogglePin} />

      {modal && <NoteModal note={modal.note} onClose={() => setModal(null)} onSaved={handleSaved} />}
    </div>
  )
}
