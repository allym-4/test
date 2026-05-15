import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { surveys as surveysApi } from '../../api'
import '../StudentsPage.css'

const TEMPLATES = [
  { id: 1, name: 'End of Season Feedback', questions: 8, desc: 'General season satisfaction, class quality, instructor rating' },
  { id: 2, name: 'New Student Check-in', questions: 5, desc: 'Experience after first 4 weeks, comfort level, goals' },
  { id: 3, name: 'Instructor Rating', questions: 6, desc: 'Teaching quality, communication, technical feedback' },
  { id: 4, name: 'Studio Experience', questions: 7, desc: 'Facilities, safety, atmosphere, admin experience' },
]

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function CreateSurveyModal({ initialName = '', onClose, onSaved }) {
  const [form, setForm] = useState({ name: initialName, description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  function set(f, v) { setForm(x => ({ ...x, [f]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await surveysApi.create({ name: form.name, description: form.description, status: 'draft' })
      onSaved(res.data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to create survey')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="sd-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>Create Survey</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>
          )}
          <div className="field">
            <label>Survey Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required autoFocus placeholder="e.g. Season 4 Feedback" />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Optional description" style={{ width: '100%', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Creating…' : 'Create Survey'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SurveyResultsModal({ survey, onClose }) {
  const { data, loading } = useApi(() => surveysApi.responses(survey.id), [survey.id])
  const responses = data?.results || data || []

  const questionMap = {}
  ;(survey.questions || []).forEach(q => { questionMap[q.id] = q })

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 640 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{survey.name} — Results</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--grey)' }}>Loading…</div>
          ) : responses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--grey)', fontSize: 13 }}>No responses yet.</div>
          ) : responses.map((r, i) => (
            <div key={r.id} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: i < responses.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                {r.student_name}
                <span style={{ fontWeight: 400, color: 'var(--grey)', fontSize: 11, marginLeft: 8 }}>
                  {new Date(r.submitted_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              {(r.answers || []).map(a => (
                <div key={a.id} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 2 }}>{questionMap[a.question]?.question_text || `Q${a.question}`}</div>
                  <div style={{ fontSize: 13, background: '#111', borderRadius: 6, padding: '6px 10px' }}>{a.answer_text || <span style={{ color: 'var(--grey)' }}>—</span>}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--grey)' }}>
          <span>{responses.length} response{responses.length !== 1 ? 's' : ''}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function SurveyCard({ survey, onRefetch }) {
  const [showResults, setShowResults] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const pct = Math.round((survey.response_count || 0) / Math.max(survey.question_count || 1, 1) * 100)

  async function handleClose() {
    await surveysApi.update(survey.id, { status: 'completed' })
    onRefetch()
  }

  async function handleSend() {
    setSending(true)
    setSendError(null)
    try {
      await surveysApi.send(survey.id)
      onRefetch()
    } catch (err) {
      setSendError(err?.response?.data?.detail || 'Failed to send survey')
      setTimeout(() => setSendError(null), 4000)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{survey.name}</div>
          <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
            {survey.sent_at ? `Sent ${formatDate(survey.sent_at)}` : `Created ${formatDate(survey.created_at)}`} · {survey.response_count || 0} responses
          </div>
        </div>
        <span className={`tag ${survey.status === 'active' ? 'tag-lime' : 'tag-grey'}`} style={{ fontSize: 10 }}>{survey.status}</span>
      </div>
      {sendError && (
        <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{sendError}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} /></div>
        <span style={{ fontSize: 11, color: 'var(--grey)', width: 36, textAlign: 'right' }}>{pct}%</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-xs" onClick={() => setShowResults(true)}>View Results</button>
        {survey.status === 'draft' && (
          <button className="btn btn-lime btn-xs" onClick={handleSend} disabled={sending}>{sending ? 'Sending…' : 'Send to All Students'}</button>
        )}
        {survey.status === 'active' && (
          <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }} onClick={handleClose}>Close</button>
        )}
      </div>
      {showResults && <SurveyResultsModal survey={survey} onClose={() => setShowResults(false)} />}
    </div>
  )
}

export default function AdminSurveys() {
  const [tab, setTab] = useState('active')
  const [showCreate, setShowCreate] = useState(false)
  const [createInitialName, setCreateInitialName] = useState('')

  const { data, loading, refetch } = useApi(() => surveysApi.list())
  const allSurveys = data?.results || data || []
  const active = allSurveys.filter(s => s.status === 'active')
  const completed = allSurveys.filter(s => s.status === 'completed')
  const draft = allSurveys.filter(s => s.status === 'draft')

  function openCreate(name = '') {
    setCreateInitialName(name)
    setShowCreate(true)
  }

  function handleSaved() {
    setShowCreate(false)
    refetch()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Surveys</div>
          <div className="page-sub">Collect feedback from students</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => openCreate()}>+ Create Survey</button>
      </div>

      <div className="subtabs" style={{ marginBottom: 24 }}>
        {[
          ['active', `Active (${active.length})`],
          ['draft', `Draft (${draft.length})`],
          ['completed', 'Completed'],
          ['templates', 'Templates'],
        ].map(([key, label]) => (
          <div key={key} className={`subtab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : (
        <>
          {tab === 'active' && (
            <div style={{ maxWidth: 700 }}>
              {active.length === 0
                ? <div className="empty-state">No active surveys</div>
                : active.map(s => <SurveyCard key={s.id} survey={s} onRefetch={refetch} />)
              }
            </div>
          )}

          {tab === 'draft' && (
            <div style={{ maxWidth: 700 }}>
              {draft.length === 0
                ? <div className="empty-state">No draft surveys</div>
                : draft.map(s => <SurveyCard key={s.id} survey={s} onRefetch={refetch} />)
              }
            </div>
          )}

          {tab === 'completed' && (
            <div style={{ maxWidth: 700 }}>
              {completed.length === 0
                ? <div className="empty-state">No completed surveys</div>
                : completed.map(s => <SurveyCard key={s.id} survey={s} onRefetch={refetch} />)
              }
            </div>
          )}

          {tab === 'templates' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
              {TEMPLATES.map(t => (
                <div key={t.id} className="card" style={{ padding: '18px 20px' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 4 }}>{t.questions} questions</div>
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 14, lineHeight: 1.5 }}>{t.desc}</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => openCreate(t.name)}>Use Template</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showCreate && (
        <CreateSurveyModal
          initialName={createInitialName}
          onClose={() => setShowCreate(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
