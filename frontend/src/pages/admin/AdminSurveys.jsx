import { useState } from 'react'
import '../StudentsPage.css'

const ACTIVE = [
  { id: 1, name: 'Season 3 Feedback', sent: '1 May 2025', responses: 42, total: 138, status: 'active' },
  { id: 2, name: 'New Student Experience', sent: '15 Apr 2025', responses: 18, total: 24, status: 'active' },
]

const COMPLETED = [
  { id: 3, name: 'Season 2 Feedback', sent: '12 Jan 2025', responses: 94, total: 112, status: 'completed' },
  { id: 4, name: 'Instructor Satisfaction', sent: '20 Feb 2025', responses: 67, total: 112, status: 'completed' },
]

const TEMPLATES = [
  { id: 1, name: 'End of Season Feedback', questions: 8, desc: 'General season satisfaction, class quality, instructor rating' },
  { id: 2, name: 'New Student Check-in', questions: 5, desc: 'Experience after first 4 weeks, comfort level, goals' },
  { id: 3, name: 'Instructor Rating', questions: 6, desc: 'Teaching quality, communication, technical feedback' },
  { id: 4, name: 'Studio Experience', questions: 7, desc: 'Facilities, safety, atmosphere, admin experience' },
]

function SurveyCard({ survey }) {
  const pct = Math.round(survey.responses / survey.total * 100)
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{survey.name}</div>
          <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>Sent {survey.sent} · {survey.responses} of {survey.total} responses</div>
        </div>
        <span className={`tag ${survey.status === 'active' ? 'tag-lime' : 'tag-grey'}`} style={{ fontSize: 10 }}>{survey.status}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        <span style={{ fontSize: 11, color: 'var(--grey)', width: 36, textAlign: 'right' }}>{pct}%</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-xs">View Results</button>
        {survey.status === 'active' && <button className="btn btn-ghost btn-xs">Send Reminder</button>}
        {survey.status === 'active' && <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }}>Close</button>}
      </div>
    </div>
  )
}

export default function AdminSurveys() {
  const [tab, setTab] = useState('active')

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Surveys</div>
          <div className="page-sub">Collect feedback from students</div>
        </div>
        <button className="btn btn-lime btn-sm">+ Create Survey</button>
      </div>

      <div className="subtabs" style={{ marginBottom: 24 }}>
        {[['active', `Active (${ACTIVE.length})`], ['scheduled', 'Scheduled'], ['completed', 'Completed'], ['templates', 'Templates']].map(([key, label]) => (
          <div key={key} className={`subtab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</div>
        ))}
      </div>

      {tab === 'active' && (
        <div style={{ maxWidth: 700 }}>
          {ACTIVE.map(s => <SurveyCard key={s.id} survey={s} />)}
        </div>
      )}

      {tab === 'scheduled' && (
        <div className="empty-state">No scheduled surveys</div>
      )}

      {tab === 'completed' && (
        <div style={{ maxWidth: 700 }}>
          {COMPLETED.map(s => <SurveyCard key={s.id} survey={s} />)}
        </div>
      )}

      {tab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
          {TEMPLATES.map(t => (
            <div key={t.id} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 4 }}>{t.questions} questions</div>
              <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 14, lineHeight: 1.5 }}>{t.desc}</div>
              <button className="btn btn-ghost btn-sm">Use Template</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
