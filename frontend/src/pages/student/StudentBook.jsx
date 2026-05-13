import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { classes, enrolments } from '../../api'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function ClassCard({ session, onBook }) {
  const spotsLeft = (session.capacity || 12) - (session.enrolled_count || 0)
  const isFull = spotsLeft <= 0

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, marginBottom: 3 }}>{session.name}</div>
          <div style={{ fontSize: 12, color: 'var(--grey)' }}>
            {DAYS[session.day_of_week]} · {session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}
          </div>
          {session.studio_detail && (
            <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{session.studio_detail.name}</div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, color: 'var(--lime)' }}>$35</div>
          <div style={{ fontSize: 10, color: 'var(--grey)' }}>per class</div>
        </div>
      </div>

      {session.instructor_detail && (
        <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10 }}>
          Instructor: <span style={{ color: 'var(--white)' }}>{session.instructor_detail.display_name || session.instructor_detail.first_name}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: isFull ? 'var(--red)' : spotsLeft <= 3 ? 'var(--amber)' : 'var(--grey)' }}>
          {isFull ? 'Class full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
        </span>
        {isFull ? (
          <button className="btn btn-ghost btn-sm" onClick={() => onBook(session, 'waitlist')}>Join Waitlist</button>
        ) : (
          <button className="btn btn-lime btn-sm" onClick={() => onBook(session, 'book')}>Book</button>
        )}
      </div>
    </div>
  )
}

export default function StudentBook() {
  const { user } = useAuth()
  const [tab, setTab] = useState('casual')
  const [booked, setBooked] = useState([])
  const { data: sessionsData, loading } = useApi(() => classes.list())

  const sessions = sessionsData?.results || []

  function handleBook(session, type) {
    setBooked(b => [...b, session.id])
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Book a Class</div>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>Browse available classes and secure your spot</div>
      </div>

      <div className="tab-strip" style={{ marginBottom: 20 }}>
        {[['season', 'Season Enrolment'], ['casual', 'Casual / Drop-in'], ['catchup', 'Catch-up Classes'], ['workshop', 'Workshops']].map(([key, label]) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === 'season' && (
        <div>
          <div style={{ background: 'rgba(176,160,255,0.08)', border: '1px solid rgba(176,160,255,0.25)', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Season 4 — Opens 14 July 2025</div>
            <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.6 }}>
              Season enrolment runs for 8 weeks and gives you a reserved spot in your class. Season 4 runs 11 Aug – 26 Sep 2025.
              Enrolments open to current students on 14 July. Stay tuned for your reminder email!
            </div>
          </div>

          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 14, fontWeight: 600 }}>
            Current Season Classes
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {sessions.map(s => (
                <ClassCard key={s.id} session={s} onBook={handleBook} />
              ))}
              {sessions.length === 0 && (
                <div style={{ color: 'var(--grey)', fontSize: 13, gridColumn: '1 / -1' }}>No classes available</div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'casual' && (
        <div>
          <div style={{ background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Drop-in Rate: $35 per class</div>
            <div style={{ fontSize: 12, color: 'var(--grey)' }}>Class passes available: 5× for $150, 10× for $280</div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {sessions.map(s => (
                <ClassCard key={s.id} session={{ ...s, type: 'casual' }} onBook={handleBook} />
              ))}
              {sessions.length === 0 && (
                <div style={{ color: 'var(--grey)', fontSize: 13, gridColumn: '1 / -1' }}>No casual classes available right now</div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'catchup' && (
        <div>
          <div style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Catch-up Credits</div>
            <div style={{ fontSize: 12, color: 'var(--grey)' }}>
              If you have an approved absence this season, you may have a catch-up credit. Credits expire 60 days after issue and can be used for any equivalent or lower level class.
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {sessions.map(s => (
                <div key={s.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, marginBottom: 4 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10 }}>
                    {DAYS[s.day_of_week]} · {s.start_time?.slice(0, 5)} · {s.studio_detail?.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="tag tag-lime" style={{ fontSize: 10 }}>Uses 1 credit</span>
                    <button className="btn btn-lime btn-sm" onClick={() => handleBook(s, 'catchup')}>Book (Credit)</button>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <div style={{ color: 'var(--grey)', fontSize: 13, gridColumn: '1 / -1' }}>No catch-up classes available</div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'workshop' && (
        <div>
          {[
            { name: 'Flexibility Masterclass', date: 'Sat 24 May', time: '2:00 – 4:30 PM', instructor: 'Chloe', price: 65, spots: 4, desc: 'Deep dive into flexibility and conditioning for pole athletes.' },
            { name: 'Spins & Transitions Workshop', date: 'Sun 1 Jun', time: '11:00 AM – 1:30 PM', instructor: 'Mimi', price: 75, spots: 8, desc: 'Explore dynamic spins and seamless transitions for intermediate–advanced students.' },
          ].map(w => (
            <div key={w.name} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 4 }}>{w.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey)' }}>{w.date} · {w.time} · Instructor: {w.instructor}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, color: 'var(--lime)' }}>${w.price}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 12, lineHeight: 1.6 }}>{w.desc}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: w.spots <= 3 ? 'var(--amber)' : 'var(--grey)' }}>{w.spots} spots left</span>
                <button className="btn btn-lime btn-sm">Book Workshop — ${w.price}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {booked.length > 0 && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: 'var(--lime)', color: '#000', padding: '10px 20px', borderRadius: 20, fontSize: 13, fontWeight: 700, zIndex: 100 }}>
          ✓ Booking confirmed!
        </div>
      )}
    </div>
  )
}
