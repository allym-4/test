import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { classes } from '../api'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function TrialPage() {
  const [sessions, setSessions] = useState(null)
  const [seasonName, setSeasonName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    classes.trialSessions()
      .then(r => {
        setSessions(r.data.results || [])
        setSeasonName(r.data.season || '')
      })
      .catch(() => setError('Could not load classes — please try again later.'))
  }, [])

  const spotsLeft = s => Math.max(0, (s.capacity || 12) - (s.enrolled_count || 0))

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#000', borderBottom: '1px solid #1a1a1a', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: '#ccff00', letterSpacing: 2, textTransform: 'uppercase' }}>
          DUALITY POLE
        </div>
        <Link to="/login" style={{ background: '#ccff00', color: '#000', textDecoration: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 900, fontSize: 13 }}>
          LOG IN
        </Link>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px' }}>
        {/* Hero */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(28px, 6vw, 42px)', lineHeight: 1.15, marginBottom: 16 }}>
            Try your first class.<br />
            <span style={{ color: '#ccff00' }}>No experience needed.</span>
          </div>
          <div style={{ fontSize: 16, color: '#888', lineHeight: 1.7, maxWidth: 500 }}>
            Pick a class below and come as you are. Just bring comfortable activewear and water — we'll take care of the rest.
          </div>
        </div>

        {/* Price callout */}
        <div style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 14, padding: '16px 20px', marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, color: '#ffaa00', marginBottom: 4 }}>Trial Rate</div>
            <div style={{ fontSize: 13, color: '#ccc' }}>
              $35 for your first class. If you love it and enrol in a season, the $35 is deducted from your season fee.
            </div>
          </div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, color: '#ffaa00', flexShrink: 0 }}>$35</div>
        </div>

        {/* Season label */}
        {seasonName && (
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#444', marginBottom: 16, fontWeight: 600 }}>
            Available this season — {seasonName}
          </div>
        )}

        {/* Session grid */}
        {error ? (
          <div style={{ color: '#ff6666', fontSize: 14, padding: '20px 0' }}>{error}</div>
        ) : sessions === null ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: '#111', borderRadius: 12, height: 140, animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ color: '#666', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
            No trial classes available right now — check back soon.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {sessions.map(s => {
              const spots = spotsLeft(s)
              const full = spots === 0
              const bookUrl = `/portal/book?session=${s.id}&tab=trial`
              return (
                <div key={s.id} style={{
                  background: '#111',
                  border: '1px solid rgba(255,170,0,0.2)',
                  borderRadius: 12,
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  opacity: full ? 0.5 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, marginBottom: 4 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>
                        {s.day_of_week != null ? DAYS[s.day_of_week] : ''} · {s.start_time?.slice(0, 5)}
                        {s.end_time ? ` – ${s.end_time.slice(0, 5)}` : ''}
                      </div>
                      {s.studio_detail?.name && (
                        <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{s.studio_detail.name}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: '#ffaa00' }}>$35</div>
                    </div>
                  </div>

                  {s.instructor_detail && (
                    <div style={{ fontSize: 12, color: '#666' }}>
                      with <span style={{ color: '#ccc' }}>{s.instructor_detail.display_name || s.instructor_detail.first_name}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: spots <= 3 && spots > 0 ? '#ffaa00' : spots === 0 ? '#ff4444' : '#555' }}>
                      {full ? 'Class full' : spots <= 3 ? `${spots} spot${spots !== 1 ? 's' : ''} left` : `${spots} spots available`}
                    </span>
                    {full ? (
                      <span style={{ fontSize: 12, color: '#444', fontWeight: 600 }}>Full</span>
                    ) : (
                      <Link
                        to={bookUrl}
                        style={{ background: '#ffaa00', color: '#000', textDecoration: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 900, fontSize: 12 }}
                      >
                        Book Trial →
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer note */}
        <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid #111', fontSize: 13, color: '#444', lineHeight: 1.8 }}>
          <strong style={{ color: '#666' }}>Already have an account?</strong>{' '}
          <Link to="/login" style={{ color: '#ccff00' }}>Log in</Link> to book.{' '}
          New to Duality?{' '}
          <Link to="/enquire" style={{ color: '#ccff00' }}>Send us a message</Link> if you have questions.
        </div>
      </div>
    </div>
  )
}
