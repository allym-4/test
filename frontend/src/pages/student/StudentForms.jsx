import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { forms } from '../../api'

const PARQ_QUESTIONS = [
  { id: 'heart', label: 'Has a doctor ever said you have a heart condition?' },
  { id: 'chest_pain_activity', label: 'Do you feel pain in your chest when you do physical activity?' },
  { id: 'chest_pain_rest', label: 'In the past month, have you had chest pain when you were not doing physical activity?' },
  { id: 'balance', label: 'Do you lose your balance because of dizziness, or do you ever lose consciousness?' },
  { id: 'bone_joint', label: 'Do you have a bone or joint problem that could be made worse by physical activity?' },
  { id: 'medication', label: 'Are you currently taking medication for blood pressure or a heart condition?' },
  { id: 'other', label: 'Do you know of any other reason why you should not do physical activity?' },
]

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 520, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: '18px 20px' }}>{children}</div>
      </div>
    </div>
  )
}

function ParqForm({ existing, onDone }) {
  const initAnswers = () => {
    const base = {}
    PARQ_QUESTIONS.forEach(q => { base[q.id] = existing?.responses?.[q.id] ?? null })
    return base
  }
  const [answers, setAnswers] = useState(initAnswers)
  const [saving, setSaving] = useState(false)

  const allAnswered = PARQ_QUESTIONS.every(q => answers[q.id] !== null)
  const anyYes = Object.values(answers).some(v => v === true)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await forms.submit('parq', answers)
      onDone()
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit}>
      <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.7, marginBottom: 20 }}>
        Please answer <strong style={{ color: 'var(--white)' }}>YES</strong> or <strong style={{ color: 'var(--white)' }}>NO</strong> to each question honestly. If you're unsure, answer YES.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {PARQ_QUESTIONS.map(q => (
          <div key={q.id} style={{ background: '#111', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 13, marginBottom: 10, lineHeight: 1.6 }}>{q.label}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['Yes', true], ['No', false]].map(([label, val]) => (
                <button key={label} type="button" onClick={() => setAnswers(a => ({ ...a, [q.id]: val }))}
                  style={{ padding: '6px 20px', borderRadius: 8, border: `1px solid ${answers[q.id] === val ? (val ? 'var(--amber)' : 'var(--lime)') : 'var(--border)'}`, background: answers[q.id] === val ? (val ? 'rgba(255,170,0,0.12)' : 'rgba(204,255,0,0.08)') : 'transparent', color: answers[q.id] === val ? (val ? 'var(--amber)' : 'var(--lime)') : 'var(--grey)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >{label}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {anyYes && (
        <div style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: 'var(--amber)', lineHeight: 1.6 }}>
          You answered YES to one or more questions. We recommend you speak with your doctor before starting or increasing physical activity. You may still attend classes — please let your instructor know.
        </div>
      )}
      <button type="submit" className="btn btn-lime btn-sm" disabled={!allAnswered || saving} style={{ width: '100%' }}>
        {saving ? 'Submitting…' : 'Submit PAR-Q'}
      </button>
    </form>
  )
}

function CheckboxForm({ text, buttonLabel, onSubmit, saving }) {
  const [checked, setChecked] = useState(false)
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.8, marginBottom: 20 }}>{text}</div>
      <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 20 }}>
        <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ marginTop: 2, accentColor: 'var(--lime)', width: 16, height: 16, flexShrink: 0 }} />
        <span style={{ fontSize: 13, lineHeight: 1.6 }}>I have read and agree to the above.</span>
      </label>
      <button className="btn btn-lime btn-sm" style={{ width: '100%' }} disabled={!checked || saving} onClick={onSubmit}>
        {saving ? 'Submitting…' : buttonLabel}
      </button>
    </div>
  )
}

const FORM_DEFS = [
  { type: 'parq',             title: 'PAR-Q Health Questionnaire', desc: 'A standard pre-exercise health screening form. Required before your first class.', icon: '🩺' },
  { type: 'waiver',           title: 'Liability Waiver',           desc: 'Acknowledgment of risks associated with pole fitness activities.',                   icon: '📝' },
  { type: 'photo_consent',    title: 'Photo & Video Consent',      desc: 'Permission for the studio to photograph or film you during classes.',                icon: '📸' },
  { type: 'season_agreement', title: 'Season Agreement',           desc: 'Season enrolment terms including cancellation and makeup credit policy.',            icon: '📋' },
]

export default function StudentForms() {
  const { data, loading, refetch } = useApi(() => forms.list())
  const [activeForm, setActiveForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const submitted = data || []
  function getForm(type) { return submitted.find(f => f.form_type === type) }

  const pending = FORM_DEFS.filter(f => !getForm(f.type)?.completed)
  const done = FORM_DEFS.filter(f => getForm(f.type)?.completed)

  async function submitSimple(type, responses) {
    setSaving(true)
    try {
      await forms.submit(type, responses)
      refetch()
      setActiveForm(null)
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Forms</div>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>Surveys and documents from the studio</div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : (
        <>
          {pending.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--red)', marginBottom: 12, fontWeight: 600 }}>Action Required ({pending.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pending.map(f => (
                  <div key={f.type} style={{ background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 12, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 24, flexShrink: 0 }}>{f.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{f.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.6 }}>{f.desc}</div>
                      </div>
                    </div>
                    <button className="btn btn-lime btn-sm" style={{ flexShrink: 0 }} onClick={() => setActiveForm(f.type)}>Complete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Completed ({done.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {done.map(f => {
                  const sub = getForm(f.type)
                  return (
                    <div key={f.type} style={{ background: 'rgba(204,255,0,0.03)', border: '1px solid rgba(204,255,0,0.12)', borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: 22 }}>{f.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{f.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
                            Submitted {sub?.completed_at ? new Date(sub.completed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                          </div>
                        </div>
                      </div>
                      <span className="tag tag-lime" style={{ fontSize: 10 }}>✓ Complete</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {pending.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--grey)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>All done!</div>
              <div style={{ fontSize: 12 }}>All required forms have been submitted.</div>
            </div>
          )}
        </>
      )}

      {activeForm === 'parq' && (
        <Modal title="🩺 PAR-Q Health Questionnaire" onClose={() => setActiveForm(null)}>
          <ParqForm existing={getForm('parq')} onDone={() => { refetch(); setActiveForm(null) }} />
        </Modal>
      )}

      {activeForm === 'waiver' && (
        <Modal title="📝 Liability Waiver" onClose={() => setActiveForm(null)}>
          <CheckboxForm
            text="I understand that pole fitness involves physical activity and carries inherent risks, including the possibility of personal injury. I acknowledge that I am participating voluntarily and accept all risks associated with this activity.

I release Duality Pole Studio, its instructors, and staff from any liability for injury, loss, or damage arising from my participation. I confirm that I am medically fit to participate and have disclosed any relevant health conditions."
            buttonLabel="Sign & Submit"
            saving={saving}
            onSubmit={() => submitSimple('waiver', { agreed: true, agreed_at: new Date().toISOString() })}
          />
        </Modal>
      )}

      {activeForm === 'photo_consent' && (
        <Modal title="📸 Photo & Video Consent" onClose={() => setActiveForm(null)}>
          <CheckboxForm
            text="I consent to being photographed and/or filmed during classes at Duality Pole Studio. I understand that photos and videos may be used on the studio's social media accounts and in marketing materials.

I understand I can withdraw this consent at any time by notifying the studio in writing. Withdrawal of consent will not affect photos or videos already published."
            buttonLabel="Give Consent"
            saving={saving}
            onSubmit={() => submitSimple('photo_consent', { agreed: true, agreed_at: new Date().toISOString() })}
          />
        </Modal>
      )}

      {activeForm === 'season_agreement' && (
        <Modal title="📋 Season Agreement" onClose={() => setActiveForm(null)}>
          <CheckboxForm
            text="I understand that my season enrolment is for a fixed 8-week term and that the season fee is non-refundable except in documented medical circumstances.

I agree to the studio's absence and makeup credit policy. If I miss a class with more than 24 hours notice, a makeup credit may be issued at the studio's discretion. Credits expire 60 days after issue.

I understand that if I cancel my enrolment mid-season without a medical certificate, no refund will be issued. A late cancellation fee of $10 applies to cancellations within 24 hours of class."
            buttonLabel="Agree & Sign"
            saving={saving}
            onSubmit={() => submitSimple('season_agreement', { agreed: true, agreed_at: new Date().toISOString() })}
          />
        </Modal>
      )}
    </div>
  )
}
