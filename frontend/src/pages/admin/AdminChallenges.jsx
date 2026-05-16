import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { challenges as challengesApi } from '../../api'

const TYPE_LABELS = {
  attendance_count: 'Attend X classes',
  style_variety: 'Try X different styles',
  streak: 'X weeks in a row',
  custom: 'Custom (manual)',
}

const REWARD_LABELS = {
  badge: 'Badge',
  credit: 'Account credit',
  none: 'No reward',
}

const EMPTY_FORM = {
  title: '',
  description: '',
  challenge_type: 'attendance_count',
  target_value: 8,
  start_date: '',
  end_date: '',
  reward_type: 'badge',
  reward_badge_name: '',
  reward_credit_amount: '',
  is_active: true,
}

function ChallengeModal({ challenge, onClose, onSaved }) {
  const editing = !!challenge?.id
  const [form, setForm] = useState(challenge ? {
    title: challenge.title || '',
    description: challenge.description || '',
    challenge_type: challenge.challenge_type || 'attendance_count',
    target_value: challenge.target_value || 1,
    start_date: challenge.start_date || '',
    end_date: challenge.end_date || '',
    reward_type: challenge.reward_type || 'badge',
    reward_badge_name: challenge.reward_badge_name || '',
    reward_credit_amount: challenge.reward_credit_amount || '',
    is_active: challenge.is_active ?? true,
  } : { ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      const payload = {
        ...form,
        target_value: parseInt(form.target_value) || 1,
        reward_credit_amount: form.reward_type === 'credit' ? (parseFloat(form.reward_credit_amount) || null) : null,
        reward_badge_name: form.reward_type === 'badge' ? form.reward_badge_name : '',
      }
      if (editing) {
        await challengesApi.update(challenge.id, payload)
      } else {
        await challengesApi.create(payload)
      }
      onSaved()
    } catch (ex) {
      setErr(ex.response?.data?.detail || JSON.stringify(ex.response?.data) || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const typeHint = {
    attendance_count: 'Students must attend this many classes during the challenge period.',
    style_variety: 'Students must attend classes of this many different style levels.',
    streak: 'Students must attend at least one class in this many consecutive weeks.',
    custom: 'You manually mark students as complete — no automatic tracking.',
  }[form.challenge_type]

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 520 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>
            {editing ? 'Edit Challenge' : 'New Challenge'}
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit}>
          <div className="field">
            <label>Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} required placeholder="e.g. June Warrior" />
          </div>

          <div className="field">
            <label>Description <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(shown to students)</span></label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              placeholder="What's this challenge about?"
              style={{ width: '100%', background: 'var(--input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--white)', padding: '9px 12px', fontSize: 13, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Type</label>
              <select value={form.challenge_type} onChange={e => set('challenge_type', e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Target</label>
              <input
                type="number"
                min={1}
                value={form.target_value}
                onChange={e => set('target_value', e.target.value)}
                required
              />
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: -8, marginBottom: 14 }}>{typeHint}</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Start date</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} required />
            </div>
            <div className="field">
              <label>End date</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} required />
            </div>
          </div>

          <div className="field">
            <label>Reward</label>
            <select value={form.reward_type} onChange={e => set('reward_type', e.target.value)}>
              {Object.entries(REWARD_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {form.reward_type === 'badge' && (
            <div className="field">
              <label>Badge name</label>
              <input value={form.reward_badge_name} onChange={e => set('reward_badge_name', e.target.value)} placeholder="e.g. June Warrior" />
            </div>
          )}

          {form.reward_type === 'credit' && (
            <div className="field">
              <label>Credit amount ($)</label>
              <input type="number" min={0} step={0.01} value={form.reward_credit_amount} onChange={e => set('reward_credit_amount', e.target.value)} placeholder="10.00" />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <input
              type="checkbox"
              id="isActive"
              checked={form.is_active}
              onChange={e => set('is_active', e.target.checked)}
              style={{ accentColor: 'var(--lime)' }}
            />
            <label htmlFor="isActive" style={{ fontSize: 13, cursor: 'pointer' }}>Active (visible to students)</label>
          </div>

          {err && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create challenge'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LeaderboardModal({ challenge, onClose }) {
  const { data, loading } = useApi(() => challengesApi.leaderboard(challenge.id), [challenge.id])
  const entries = data || []

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 480 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>
            Leaderboard — {challenge.title}
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 16 }}>
            {challenge.participant_count} opted in · {challenge.completion_count} completed
          </div>
          {loading ? (
            <div style={{ color: 'var(--grey)', fontSize: 13 }}>Loading…</div>
          ) : entries.length === 0 ? (
            <div style={{ color: 'var(--grey)', fontSize: 13 }}>No participants yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {entries.map((entry, i) => {
                const pct = Math.min(100, (entry.current_value / challenge.target_value) * 100)
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                return (
                  <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                    <div style={{ width: 28, textAlign: 'center', fontSize: 15, flexShrink: 0 }}>
                      {medal || <span style={{ fontSize: 12, color: 'var(--grey)' }}>#{i + 1}</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{entry.student_name}</span>
                        <span style={{ fontSize: 12, color: entry.completed ? 'var(--lime)' : 'var(--grey)' }}>
                          {entry.completed ? 'Complete' : `${entry.current_value}/${challenge.target_value}`}
                        </span>
                      </div>
                      <div style={{ background: 'var(--border)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: entry.completed ? 'var(--lime)' : 'var(--lav)', transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminChallenges() {
  const { data, loading, refetch } = useApi(() => challengesApi.list(), [])
  const challengeList = data?.results || data || []

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewLeaderboard, setViewLeaderboard] = useState(null)
  const [deleting, setDeleting] = useState(null)

  async function handleDelete(c) {
    if (!window.confirm(`Delete "${c.title}"? This cannot be undone.`)) return
    setDeleting(c.id)
    try {
      await challengesApi.delete(c.id)
      refetch()
    } finally {
      setDeleting(null)
    }
  }

  async function handleRecalculate(c) {
    await challengesApi.recalculate(c.id)
    refetch()
  }

  const now = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Challenges</div>
          <div className="page-sub">Set monthly challenges — students opt in and track their progress</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => setShowCreate(true)}>+ New challenge</button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--grey)', fontSize: 13 }}>Loading…</div>
      ) : challengeList.length === 0 ? (
        <div className="empty-state">No challenges yet — create your first one</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {challengeList.map(c => {
            const isLive = c.is_active && c.start_date <= now && c.end_date >= now
            const isUpcoming = c.is_active && c.start_date > now
            const isPast = c.end_date < now

            return (
              <div key={c.id} className="card" style={{ opacity: isPast ? 0.7 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15 }}>{c.title}</div>
                      {isLive && <span className="tag tag-lime" style={{ fontSize: 10 }}>Live</span>}
                      {isUpcoming && <span className="tag" style={{ fontSize: 10, background: 'rgba(150,100,255,0.15)', color: 'var(--lav)' }}>Upcoming</span>}
                      {isPast && <span className="tag" style={{ fontSize: 10 }}>Ended</span>}
                      {!c.is_active && <span className="tag" style={{ fontSize: 10 }}>Inactive</span>}
                    </div>
                    {c.description && (
                      <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 8 }}>{c.description}</div>
                    )}
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--grey)' }}>
                        {TYPE_LABELS[c.challenge_type]} · target: <strong style={{ color: 'var(--white)' }}>{c.target_value}</strong>
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--grey)' }}>
                        {new Date(c.start_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – {new Date(c.end_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {c.reward_type !== 'none' && (
                        <span style={{ fontSize: 12, color: 'var(--grey)' }}>
                          Reward: {c.reward_type === 'badge' ? `"${c.reward_badge_name}" badge` : `$${c.reward_credit_amount} credit`}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--grey)' }}>
                      {c.participant_count} opted in · {c.completion_count} completed
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setViewLeaderboard(c)}>Leaderboard</button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => handleRecalculate(c)}>Recalculate</button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setEditing(c)}>Edit</button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, color: 'var(--red)' }}
                      disabled={deleting === c.id}
                      onClick={() => handleDelete(c)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(showCreate || editing) && (
        <ChallengeModal
          challenge={editing}
          onClose={() => { setShowCreate(false); setEditing(null) }}
          onSaved={() => { setShowCreate(false); setEditing(null); refetch() }}
        />
      )}

      {viewLeaderboard && (
        <LeaderboardModal
          challenge={viewLeaderboard}
          onClose={() => setViewLeaderboard(null)}
        />
      )}
    </div>
  )
}
