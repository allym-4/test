import { useState, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { enrolments, seasons, attendance as attendanceApi, classes as classesApi, skills as skillsApi, announcements as announcementsApi, payments, settings as settingsApi } from '../../api'
import CancellationOfferPopup from '../../components/CancellationOfferPopup'
import PostTrialPopup from '../../components/PostTrialPopup'

import { Link } from 'react-router-dom'

const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAYS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDayDate(dayOfWeek) {
  const today = new Date()
  const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1
  let diff = dayOfWeek - todayDow
  if (diff < 0) diff += 7
  const d = new Date(today)
  d.setDate(today.getDate() + diff)
  return d.getDate()
}

function MarkAwayModal({ enrolment, cancellationWindowHours, onClose, onDone }) {
  const s = enrolment.class_session_detail
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const { data: occData } = useApi(
    () => s?.id ? classesApi.occurrences({ session: s.id, upcoming: 'true' }) : null,
    [s?.id]
  )
  const nextOcc = occData?.results?.[0] || occData?.[0] || null

  const windowHours = cancellationWindowHours ?? 4
  const withinCutoff = useMemo(() => {
    if (!nextOcc?.date || !s?.start_time) return false
    const classDateTime = new Date(`${nextOcc.date}T${s.start_time}`)
    return (classDateTime - new Date()) < windowHours * 60 * 60 * 1000
  }, [nextOcc, s, windowHours])

  async function handleConfirm() {
    if (!nextOcc) { setError('No upcoming class found'); return }
    setConfirming(true)
    setError('')
    try {
      await attendanceApi.markAway(nextOcc.id)
      setDone(true)
      setTimeout(onDone, 1200)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not mark away')
    } finally {
      setConfirming(false)
    }
  }

  const nextDateLabel = nextOcc?.date
    ? new Date(nextOcc.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
    : null

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 420, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>Mark Away</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{s?.name}</div>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: nextDateLabel ? 4 : 16 }}>
            {DAYS_FULL[s?.day_of_week]} · {s?.start_time?.slice(0, 5)}
          </div>
          {nextDateLabel && (
            <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 16 }}>{nextDateLabel}</div>
          )}

          {!withinCutoff ? (
            <div style={{ background: '#0f1600', border: '1px solid var(--lime)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: 'var(--lime)', marginBottom: 6 }}>You'll receive a catch-up credit</div>
              <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
                You're outside the cancellation window — a catch-up credit will be added to your account to use within this season.
              </div>
            </div>
          ) : (
            <div style={{ background: '#1a0900', border: '1px solid #ffaa44', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: '#ffaa44', marginBottom: 6 }}>No catch-up credit for this one</div>
              <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
                You're within the cancellation window — no credit will be issued. You can still mark away so we know you're not coming, but no credit will be issued.{' '}
                If you don't mark away and don't attend, a <strong style={{ color: '#ffaa44' }}>$20 no-show fee</strong> will be charged.
              </div>
            </div>
          )}

          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</div>}
          {done ? (
            <div style={{ textAlign: 'center', color: 'var(--lime)', fontWeight: 600, padding: '8px 0' }}>✓ Marked as away</div>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button className="btn btn-lime btn-sm" style={{ flex: 1 }} onClick={handleConfirm} disabled={confirming || !nextOcc}>
                {confirming ? 'Saving…' : withinCutoff ? 'Mark away anyway' : 'Confirm — mark me away'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const { data: enrolData, loading: loadingEnrol } = useApi(() => enrolments.list({ student: user?.id, status: 'active' }), [user?.id])
  const { data: seasonData } = useApi(() => seasons.list(), [])
  const { data: skillsData } = useApi(() => user?.id ? skillsApi.list(user.id) : null, [user?.id])
  const { data: creditsData } = useApi(() => attendanceApi.makeupCredits.list({ student: user?.id, status: 'available' }), [user?.id])
  const { data: annData, refetch: refetchAnn } = useApi(() => announcementsApi.list({ note_type: 'announcement' }), [])
  const { data: offersData, refetch: refetchOffers } = useApi(() => payments.cancellationOffers.mine(), [])
  const { data: trialPendingData, refetch: refetchTrialFeedback } = useApi(() => enrolments.trialFeedback.pending(), [])
  const { data: studioSettings } = useApi(() => settingsApi.get(), [])

  const [markAwayEnrol, setMarkAwayEnrol] = useState(null)
  const [acknowledging, setAcknowledging] = useState({})

  const allAnnouncements = annData?.results || annData || []
  const pendingAnnouncements = allAnnouncements.filter(a => !a.is_acknowledged)

  async function acknowledgeAnn(id) {
    setAcknowledging(s => ({ ...s, [id]: true }))
    try {
      await announcementsApi.acknowledge(id)
      refetchAnn()
    } finally {
      setAcknowledging(s => ({ ...s, [id]: false }))
    }
  }

  const enrolments_ = enrolData?.results || enrolData || []
  const tricksUnlocked = (skillsData?.results || skillsData || []).filter(s => s.achieved).length

  // Current active season
  const allSeasons = seasonData?.results || seasonData || []
  const now = new Date()
  const currentSeason = allSeasons.find(s => s.status === 'active') ||
    allSeasons.find(s => {
      const start = s.start_date ? new Date(s.start_date) : null
      const end = s.end_date ? new Date(s.end_date) : null
      return start && end && now >= start && now <= end
    }) || allSeasons[0]

  // Weeks remaining
  let weeksRemaining = '—'
  if (currentSeason?.end_date) {
    const end = new Date(currentSeason.end_date)
    const msLeft = end - now
    if (msLeft > 0) weeksRemaining = Math.ceil(msLeft / (1000 * 60 * 60 * 24 * 7))
  }

  // Enrolled class names for summary sentence
  const enrolledNames = enrolments_.map(e => e.class_session_detail?.name).filter(Boolean)

  const hasEnrolments = enrolments_.length > 0
  const pendingOffers = offersData?.results || offersData || []
  const pendingTrialFeedback = trialPendingData || []

  return (
    <div>
      {pendingTrialFeedback.length > 0 && (
        <PostTrialPopup
          pending={pendingTrialFeedback}
          onDone={() => refetchTrialFeedback()}
        />
      )}
      {pendingOffers.length > 0 && pendingTrialFeedback.length === 0 && (
        <CancellationOfferPopup
          offers={pendingOffers}
          onResolved={() => refetchOffers()}
        />
      )}
      {/* Season open banner — shown when no active enrolments */}
      {!loadingEnrol && !hasEnrolments && (
        <div style={{ background: 'var(--lime)', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#000' }}>{currentSeason ? `${currentSeason.name} is now open` : 'New season is now open'} — book your spot</div>
          <Link to="/portal/book"><button className="btn btn-sm" style={{ background: '#000', color: 'var(--lime)', whiteSpace: 'nowrap' }}>Book Now</button></Link>
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-title">{greeting()}, {user?.first_name} 👋</div>
          <div className="page-sub">{new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      {/* Enrolled classes summary sentence */}
      {hasEnrolments && (
        <div style={{ fontSize: 14, color: 'var(--grey)', marginBottom: 20 }}>
          You're enrolled in {enrolledNames.join(' and ')} this season.
        </div>
      )}

      {/* Profile incomplete banner */}
      {(!user?.phone || !user?.emergency_contact_name || !user?.emergency_contact_phone) && (
        <div style={{ background: 'rgba(176,160,255,0.08)', border: '1px solid rgba(176,160,255,0.25)', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--lav)', marginBottom: 4 }}>Complete your profile</div>
            <div style={{ fontSize: 13, color: 'var(--grey)' }}>Add your phone number and emergency contact so we can reach you if needed.</div>
          </div>
          <Link to="/portal/account"><button className="btn btn-sm" style={{ background: 'var(--lav)', color: '#000', whiteSpace: 'nowrap' }}>Update now</button></Link>
        </div>
      )}

      {/* KPI Stats */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <Link to="/portal/my-classes" style={{ textDecoration: 'none' }}>
          <div className="kpi card" style={{ textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lime)' }}>{loadingEnrol ? '—' : enrolments_.length}</div>
            <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>Classes This Season</div>
          </div>
        </Link>
        <div className="kpi card" style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lav)' }}>{creditsData ? (creditsData?.results || creditsData || []).length : '—'}</div>
          <Link to="/portal/billing" style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4, display: 'block', textDecoration: 'none' }}>Catch-up Credits</Link>
        </div>
        <div className="kpi card" style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lime)' }}>{skillsData ? tricksUnlocked : '—'}</div>
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>Tricks Unlocked in your level</div>
        </div>
        <div className="kpi card" style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, color: 'var(--lav)' }}>{weeksRemaining}</div>
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>Weeks Remaining</div>
        </div>
      </div>

      {/* Announcements */}
      {pendingAnnouncements.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {pendingAnnouncements.map(a => (
            <div key={a.id} style={{
              background: a.requires_acknowledgement ? 'rgba(255,170,0,0.07)' : 'rgba(176,160,255,0.07)',
              border: `1px solid ${a.requires_acknowledgement ? 'rgba(255,170,0,0.3)' : 'rgba(176,160,255,0.25)'}`,
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {a.is_pinned && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pinned</span>}
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                </div>
                {a.requires_acknowledgement && (
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--amber)', color: '#000', whiteSpace: 'nowrap', flexShrink: 0, fontSize: 12 }}
                    onClick={() => acknowledgeAnn(a.id)}
                    disabled={acknowledging[a.id]}
                  >
                    {acknowledging[a.id] ? '…' : 'Acknowledge'}
                  </button>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.7 }}>{a.body}</div>
              {a.requires_acknowledgement && (
                <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 8 }}>
                  Please read and acknowledge this notice to dismiss it.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Classes This Week */}
      <div style={{ marginBottom: 28 }}>
        <div className="section-title" style={{ fontSize: 15, marginBottom: 12 }}>Classes This Week</div>
        {loadingEnrol ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
        ) : enrolments_.length === 0 ? (
          <div className="empty-state">
            <div style={{ marginBottom: 8 }}>No classes enrolled yet</div>
            <div style={{ fontSize: 12 }}>Contact your studio to get set up</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {enrolments_.map(e => {
              const s = e.class_session_detail
              const instructorName = s?.instructor_detail
                ? `${s.instructor_detail.first_name || ''} ${s.instructor_detail.last_name || ''}`.trim()
                : (s?.instructor_name || '—')
              return (
                <div key={e.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ textAlign: 'center', flexShrink: 0, width: 44 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--grey)', textTransform: 'uppercase' }}>{DAYS_SHORT[s?.day_of_week]}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Archivo Black', sans-serif", color: 'var(--lime)', lineHeight: 1.1 }}>{formatDayDate(s?.day_of_week)}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s?.name} · {s?.studio_detail?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey)' }}>{s?.start_time?.slice(0, 5)} · {instructorName}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={() => setMarkAwayEnrol(e)}>
                    Mark Away
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Level Progression Tracker */}
      {hasEnrolments && skillsData && (() => {
        const allSkills = skillsData?.results || skillsData || []
        const nextLevelSkills = allSkills.filter(s => !s.achieved && s.required_for_next_level)
        if (nextLevelSkills.length === 0) return null
        const doneSelf = nextLevelSkills.filter(s => s.self_marked).length
        const allDone = doneSelf === nextLevelSkills.length
        return (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
              <div>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 4 }}>Ready for the next level?</div>
                <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>Tick off these moves as you nail them. Your instructor signs you off when you're ready to move up.</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--grey)', flexShrink: 0 }}>
                {doneSelf} / {nextLevelSkills.length}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {nextLevelSkills.map(skill => (
                <div key={skill.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 8, background: skill.self_marked ? 'rgba(204,255,0,0.05)' : 'transparent' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${skill.self_marked ? 'var(--lime)' : 'var(--border)'}`, background: skill.self_marked ? 'rgba(204,255,0,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, color: 'var(--lime)' }}>
                    {skill.self_marked ? '✓' : ''}
                  </div>
                  <div style={{ fontSize: 13, color: skill.self_marked ? 'var(--white)' : 'var(--grey)' }}>{skill.name}</div>
                </div>
              ))}
            </div>
            {allDone && (
              <div style={{ marginTop: 12, padding: '14px 16px', background: 'rgba(204,255,0,0.05)', border: '1px solid var(--lime)', borderRadius: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--lime)', marginBottom: 10 }}>🎉 Looking good! Your instructor will do a formal check-off when they're happy you're ready — tap below to flag it to them.</div>
                <button className="btn btn-lime btn-sm">Notify instructor</button>
              </div>
            )}
          </div>
        )
      })()}

      {/* Quick Links */}
      <div style={{ marginBottom: 24 }}>
        <div className="section-title" style={{ fontSize: 15, marginBottom: 12 }}>Quick links</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { symbol: '○', label: 'Makeup or casual class', sub: 'Drop into any eligible class', to: '/portal/book' },
            { symbol: '■', label: 'Book practice time', sub: 'Open studio - $20', to: '/portal/book' },
            { symbol: '△', label: 'See my progress', sub: 'Tricks, levels and resources', to: '/portal/progress' },
          ].map(({ symbol, label, sub, to }) => (
            <Link key={label} to={to} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ textAlign: 'center', cursor: 'pointer', padding: '22px 16px', borderColor: '#2a2a2a' }}>
                <div style={{ fontSize: 26, marginBottom: 10, color: 'var(--lime)' }}>{symbol}</div>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, marginBottom: 5 }}>{label}</div>
                <div style={{ fontSize: 13, color: 'var(--grey)' }}>{sub}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Upsell strip */}
      {hasEnrolments && (() => {
        const n = enrolments_.length
        const priceSeason = parseFloat(studioSettings?.price_season || 270)
        const discountTiers = studioSettings?.season_discount_tiers || {2:100,3:130,4:150,5:170,6:170}
        const nextDiscount = parseFloat(discountTiers[n + 1] ?? discountTiers[String(n + 1)] ?? 0)
        const nextClassPrice = Math.max(0, priceSeason - nextDiscount)

        let headline, sub, cta
        if (n < 3) {
          const need = 3 - n
          headline = `You're on ${n} class${n !== 1 ? 'es' : ''} per week`
          sub = <>Add <strong>{need}</strong> more class{need !== 1 ? 'es' : ''} to unlock <span style={{ color: 'var(--lime)' }}>1 free practice session per week</span>.</>
          cta = 'Add a class'
        } else if (n === 3) {
          headline = `You're on 3 classes per week`
          sub = <>Add <strong>1 more class</strong> to unlock <span style={{ color: 'var(--lime)' }}>unlimited free practice time</span> and a <span style={{ color: 'var(--lime)' }}>free locker</span>.</>
          cta = 'Add a class'
        } else {
          headline = `You're on ${n} classes per week`
          sub = <>Adding another class is only <span style={{ color: 'var(--lime)' }}>${nextClassPrice}/season</span>.</>
          cta = 'Add a class'
        }

        return (
          <div style={{ background: '#0d0d0d', border: '1px solid var(--border)', borderRadius: 12, padding: '22px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginBottom: 8, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, marginBottom: 6 }}>{headline}</div>
              <div style={{ fontSize: 14, color: 'var(--grey)' }}>{sub}</div>
            </div>
            <Link to="/portal/book"><button className="btn btn-ghost btn-sm" style={{ whiteSpace: 'nowrap' }}>{cta}</button></Link>
          </div>
        )
      })()}

      {markAwayEnrol && (
        <MarkAwayModal
          enrolment={markAwayEnrol}
          cancellationWindowHours={studioSettings?.cancellation_window_hours ?? 4}
          onClose={() => setMarkAwayEnrol(null)}
          onDone={() => setMarkAwayEnrol(null)}
        />
      )}
    </div>
  )
}
