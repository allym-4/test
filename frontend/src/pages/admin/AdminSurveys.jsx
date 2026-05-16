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

const QUESTION_TYPES = [
  { value: 'text',            label: 'Free Text' },
  { value: 'rating',          label: 'Star Rating' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'checkbox',        label: 'Checkboxes' },
  { value: 'yes_no',          label: 'Yes / No' },
  { value: 'scale',           label: 'Scale (1–10)' },
]

const AUDIENCE_OPTIONS = [
  { value: 'all',              label: 'All Students' },
  { value: 'trial',            label: 'Trial Students' },
  { value: 'active_enrolment', label: 'Currently Enrolled' },
  { value: 'lapsed',           label: 'Lapsed Students (no attendance 6+ wks)' },
]

const TRIGGER_OPTIONS = [
  { value: 'manual',            label: 'Manual Send' },
  { value: 'after_first_class', label: 'After First Class' },
  { value: 'after_season_ends', label: 'After Season Ends' },
  { value: 'scheduled',         label: 'Scheduled Date' },
]

function CreateSurveyModal({ initialName = '', onClose, onSaved }) {
  const [form, setForm] = useState({
    name: initialName,
    description: '',
    target_audience: 'all',
    trigger: 'manual',
  })
  const [questions, setQuestions] = useState([
    { question_text: '', question_type: 'text', required: false, options: [] },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function setField(f, v) { setForm(x => ({ ...x, [f]: v })) }

  function addQuestion() {
    setQuestions(qs => [...qs, { question_text: '', question_type: 'text', required: false, options: [] }])
  }

  function removeQuestion(i) {
    setQuestions(qs => qs.filter((_, idx) => idx !== i))
  }

  function setQuestion(i, field, val) {
    setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, [field]: val } : q))
  }

  function setQuestionOptions(i, val) {
    // val is a newline-separated string → split to array
    setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, options: val.split('\n').map(s => s.trim()).filter(Boolean) } : q))
  }

  const needsOptions = (type) => type === 'multiple_choice' || type === 'checkbox'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const surveyRes = await surveysApi.create({
        name: form.name,
        description: form.description,
        target_audience: form.target_audience,
        trigger: form.trigger,
        status: 'draft',
      })
      const survey = surveyRes.data
      // Create questions in order
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        if (!q.question_text.trim()) continue
        await surveysApi.createQuestion({
          survey: survey.id,
          question_text: q.question_text,
          question_type: q.question_type,
          required: q.required,
          options: q.options,
          order: i,
        })
      }
      onSaved(survey)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to create survey')
      setSaving(false)
    }
  }

  const selectStyle = {
    background: '#1a1a1a', border: '1px solid var(--border)', color: 'var(--white)',
    padding: '8px 12px', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, width: '100%',
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="sd-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18 }}>Create Survey</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" style={{ maxHeight: '80vh', overflowY: 'auto' }} onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>
          )}

          <div className="field">
            <label>Survey Name *</label>
            <input value={form.name} onChange={e => setField('name', e.target.value)} required autoFocus placeholder="e.g. Season 4 Feedback" />
          </div>

          <div className="field">
            <label>Description</label>
            <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={2} placeholder="What is this survey about?" style={{ width: '100%', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Target Audience</label>
              <select value={form.target_audience} onChange={e => setField('target_audience', e.target.value)} style={selectStyle}>
                {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Trigger</label>
              <select value={form.trigger} onChange={e => setField('trigger', e.target.value)} style={selectStyle}>
                {TRIGGER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Questions builder */}
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 10, fontWeight: 700 }}>Questions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            {questions.map((q, i) => (
              <div key={i} style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    style={{ flex: 1, background: '#111', border: '1px solid var(--border)', color: 'var(--white)', borderRadius: 7, padding: '8px 10px', fontFamily: 'inherit', fontSize: 13 }}
                    placeholder={`Question ${i + 1}…`}
                    value={q.question_text}
                    onChange={e => setQuestion(i, 'question_text', e.target.value)}
                  />
                  <select
                    value={q.question_type}
                    onChange={e => setQuestion(i, 'question_type', e.target.value)}
                    style={{ ...selectStyle, width: 160, padding: '8px 10px' }}
                  >
                    {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <button type="button" className="btn btn-ghost btn-xs" style={{ color: 'var(--red)', flexShrink: 0 }} onClick={() => removeQuestion(i)} disabled={questions.length === 1}>✕</button>
                </div>
                {needsOptions(q.question_type) && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 4 }}>Options (one per line)</div>
                    <textarea
                      rows={3}
                      value={q.options.join('\n')}
                      onChange={e => setQuestionOptions(i, e.target.value)}
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                      style={{ width: '100%', background: '#111', border: '1px solid var(--border)', color: 'var(--white)', borderRadius: 7, padding: '7px 10px', fontFamily: 'inherit', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--grey)' }}>
                  <input type="checkbox" checked={q.required} onChange={e => setQuestion(i, 'required', e.target.checked)} />
                  Required
                </label>
              </div>
            ))}
          </div>

          <button type="button" className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={addQuestion}>+ Add Question</button>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Creating…' : 'Save as Draft'}</button>
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

const AUDIENCE_LABELS = {
  all: 'All Students',
  trial: 'Trial Students',
  active_enrolment: 'Currently Enrolled',
  lapsed: 'Lapsed Students',
}

function SurveyCard({ survey, onRefetch }) {
  const [showResults, setShowResults] = useState(false)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sendError, setSendError] = useState(null)
  const responseCount = survey.response_count || 0

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

  async function handleDelete() {
    if (!window.confirm(`Delete "${survey.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await surveysApi.delete(survey.id)
      onRefetch()
    } catch {
      setDeleting(false)
    }
  }

  function handleExportCsv() {
    surveysApi.exportCsv(survey.id).then(res => {
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `survey-${survey.id}-responses.csv`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, marginBottom: 4 }}>{survey.name}</div>
          {survey.description && (
            <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 6 }}>{survey.description}</div>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--grey)' }}>
            <span>🎯 {AUDIENCE_LABELS[survey.target_audience] || survey.target_audience}</span>
            <span>📅 {survey.sent_at ? `Sent ${formatDate(survey.sent_at)}` : `Created ${formatDate(survey.created_at)}`}</span>
            <span>{survey.question_count || 0} questions · {responseCount} responses</span>
          </div>
        </div>
        <span className={`tag ${survey.status === 'active' ? 'tag-lime' : survey.status === 'completed' ? 'tag-grey' : 'tag-lav'}`} style={{ fontSize: 10, flexShrink: 0 }}>{survey.status}</span>
      </div>

      {sendError && (
        <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{sendError}</div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {(survey.status === 'active' || survey.status === 'completed') && (
          <>
            <button className="btn btn-lime btn-xs" onClick={() => setShowResults(true)}>View Results</button>
            <button className="btn btn-ghost btn-xs" onClick={handleExportCsv}>↓ CSV</button>
            {survey.status === 'active' && (
              <button className="btn btn-ghost btn-xs" onClick={handleSend} disabled={sending}>{sending ? 'Sending…' : 'Send Reminder'}</button>
            )}
          </>
        )}
        {survey.status === 'draft' && (
          <button className="btn btn-lime btn-xs" onClick={handleSend} disabled={sending}>
            {sending ? 'Sending…' : `Send to ${AUDIENCE_LABELS[survey.target_audience] || 'Students'} →`}
          </button>
        )}
        {survey.status === 'active' && (
          <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }} onClick={handleClose}>Close Survey</button>
        )}
        {survey.status === 'draft' && (
          <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)', marginLeft: 'auto' }} onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete Draft'}
          </button>
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
