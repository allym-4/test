import { useState } from 'react'
import { enrolments as enrolmentsApi } from '../api'

function StarRow({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <span style={{ fontSize: 14, color: 'var(--grey)' }}>{label}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <span
            key={n}
            onClick={() => onChange(n)}
            style={{ fontSize: 22, cursor: 'pointer', color: n <= value ? '#DBFF00' : '#333', lineHeight: 1 }}
          >★</span>
        ))}
      </div>
    </div>
  )
}

export default function PostTrialPopup({ pending, onDone }) {
  const item = pending[0]
  const [screen, setScreen] = useState('prompt') // prompt | feedback | thanks
  const [ratings, setRatings] = useState({ class: 0, instructor: 0, facilities: 0, structure: 0 })
  const [reason, setReason] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function setRating(key, val) {
    setRatings(r => ({ ...r, [key]: val }))
  }

  async function handleYes() {
    setSubmitting(true)
    try {
      await enrolmentsApi.trialFeedback.submit(item.id, { enrolled: true })
    } catch { }
    setSubmitting(false)
    onDone()
    window.location.href = '/portal/book'
  }

  async function handleNoThanks() {
    setScreen('feedback')
  }

  async function handleSubmitFeedback() {
    const allRated = Object.values(ratings).every(v => v > 0)
    if (!allRated || reason.trim().length < 10) {
      setError('Please rate each category and share a few words before submitting.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await enrolmentsApi.trialFeedback.submit(item.id, {
        enrolled: false,
        class_rating: ratings.class,
        instructor_rating: ratings.instructor,
        facilities_rating: ratings.facilities,
        structure_rating: ratings.structure,
        reason,
      })
      setScreen('thanks')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="sd-overlay" style={{ zIndex: 1000 }}>
      <div className="sd-modal" style={{ maxWidth: 460 }}>

        {screen === 'prompt' && (
          <div className="sd-body" style={{ textAlign: 'center', padding: '32px 28px' }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>🎉</div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 10 }}>
              We loved having you in class!
            </div>
            <div style={{ fontSize: 15, color: 'var(--grey)', lineHeight: 1.7, marginBottom: 28 }}>
              Did you love it as much as we did? Would you like to enrol in the rest of the course?
            </div>
            <div style={{ background: 'rgba(219,255,0,0.06)', border: '1px solid rgba(219,255,0,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 22, textAlign: 'left' }}>
              {item.season_name && (
                <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 6 }}>
                  {item.season_name} · {item.session_name}
                  {item.remaining_classes > 0 && ` · ${item.remaining_classes} classes remaining`}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 500 }}>Enrol and lock in your spot</div>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: 'var(--lime)' }}>
                  ${item.enrol_price}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 4 }}>
                Your trial class is credited toward the season price
              </div>
            </div>
            <button
              className="btn btn-lime"
              style={{ width: '100%', marginBottom: 10, fontSize: 15 }}
              onClick={handleYes}
              disabled={submitting}
            >
              Yes — enrol now · ${item.enrol_price}
            </button>
            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={handleNoThanks}>
              No thanks
            </button>
          </div>
        )}

        {screen === 'feedback' && (
          <div className="sd-body" style={{ padding: '28px' }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, marginBottom: 6 }}>
              Thanks for trying us out
            </div>
            <div style={{ fontSize: 14, color: 'var(--grey)', marginBottom: 22, lineHeight: 1.6 }}>
              We'd love to know what you thought — takes 30 seconds.
            </div>
            <StarRow label="Did you enjoy the class?" value={ratings.class} onChange={v => setRating('class', v)} />
            <StarRow label="Did you enjoy the instructor?" value={ratings.instructor} onChange={v => setRating('instructor', v)} />
            <StarRow label="Did you like the facilities?" value={ratings.facilities} onChange={v => setRating('facilities', v)} />
            <StarRow label="Did you like the class structure?" value={ratings.structure} onChange={v => setRating('structure', v)} />
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, marginTop: 6 }}>
              We'd love to know why you're not joining us for the season
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 10 }}>
              Please give us some details — it genuinely helps us improve.
            </div>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. timing doesn't work for me, I'd like to try a different class first, budget reasons..."
              style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 8, padding: 12, color: '#fff', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5, marginBottom: 6, boxSizing: 'border-box' }}
            />
            {error && <div style={{ fontSize: 12, color: '#ff6b6b', marginBottom: 10 }}>{error}</div>}
            <button
              className="btn btn-lime"
              style={{ width: '100%', marginTop: 12 }}
              onClick={handleSubmitFeedback}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit feedback'}
            </button>
          </div>
        )}

        {screen === 'thanks' && (
          <div className="sd-body" style={{ textAlign: 'center', padding: '40px 28px' }}>
            <div style={{ fontSize: 42, marginBottom: 14 }}>💜</div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, marginBottom: 10 }}>
              Thank you!
            </div>
            <div style={{ fontSize: 14, color: 'var(--grey)', lineHeight: 1.7, marginBottom: 26 }}>
              Your feedback means a lot. We hope to see you again — drop in for a casual class any time, or keep an eye out when the next season opens.
            </div>
            <button className="btn btn-outline" style={{ width: '100%' }} onClick={onDone}>
              Go to my dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
