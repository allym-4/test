import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { classes as classesApi } from '../../api'

const PRESET_COLOURS = ['#ccff00', '#88ccff', '#ff8888', '#ffcc44', '#cc88ff', '#88ffcc']

function TagForm({ existing, onClose, onSaved }) {
  const [name, setName] = useState(existing?.name || '')
  const [colour, setColour] = useState(existing?.colour || '#ccff00')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (existing?.id) {
        await classesApi.classTags.update(existing.id, { name: name.trim(), colour })
      } else {
        await classesApi.classTags.create({ name: name.trim(), colour })
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.name?.[0] || err.response?.data?.detail || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, padding: '16px 18px', marginBottom: 12 }}>
      <form onSubmit={submit}>
        {error && (
          <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10, background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 6, padding: '6px 10px' }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Tag Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              placeholder="e.g. Beginner Friendly"
              style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', padding: '8px 11px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Colour
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRESET_COLOURS.map(c => (
                <div
                  key={c}
                  onClick={() => setColour(c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: colour === c ? '2px solid #fff' : '2px solid transparent',
                    boxSizing: 'border-box',
                    transition: 'border 0.1s',
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving || !name.trim()}>
              {saving ? 'Saving…' : existing ? 'Update' : 'Add Tag'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          </div>
        </div>
        {colour && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#555' }}>Preview:</span>
            <span style={{
              padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: colour + '33', color: colour, border: `1px solid ${colour}66`,
            }}>
              {name || 'Tag name'}
            </span>
          </div>
        )}
      </form>
    </div>
  )
}

export default function AdminClassTags() {
  const { data, loading, refetch } = useApi(() => classesApi.classTags.list())
  const tags = data?.results || data || []
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleting, setDeleting] = useState(null)

  async function handleDelete(id) {
    if (!window.confirm('Delete this tag? It will be removed from all classes.')) return
    setDeleting(id)
    try {
      await classesApi.classTags.delete(id)
      refetch()
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22 }}>Class Tags</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
            Tag class sessions for filtering and grouping. Tags appear on the class detail page.
          </div>
        </div>
        {!adding && (
          <button className="btn btn-lime btn-sm" onClick={() => { setAdding(true); setEditingId(null) }}>
            + Add Tag
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <TagForm
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); refetch() }}
        />
      )}

      {/* Tags list */}
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading…</div>
        ) : tags.length === 0 && !adding ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#666', fontSize: 13 }}>
            No class tags yet. Tags help you categorise and filter classes.
            <br />
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setAdding(true)}>
              + Create your first tag
            </button>
          </div>
        ) : (
          tags.map((tag, i) => (
            <div key={tag.id}>
              {i > 0 && <div style={{ height: 1, background: '#1a1a1a' }} />}
              {editingId === tag.id ? (
                <div style={{ padding: '12px 16px' }}>
                  <TagForm
                    existing={tag}
                    onClose={() => setEditingId(null)}
                    onSaved={() => { setEditingId(null); refetch() }}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px' }}>
                  <span style={{
                    padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: tag.colour + '33', color: tag.colour, border: `1px solid ${tag.colour}66`,
                    flexShrink: 0,
                  }}>
                    {tag.name}
                  </span>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: tag.colour, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#555', flex: 1 }}>{tag.colour}</span>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => { setEditingId(tag.id); setAdding(false) }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-ghost btn-xs"
                      style={{ color: 'var(--red)' }}
                      onClick={() => handleDelete(tag.id)}
                      disabled={deleting === tag.id}
                    >
                      {deleting === tag.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
