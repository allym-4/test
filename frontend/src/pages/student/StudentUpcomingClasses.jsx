import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { classes as classesApi, attendance as attendanceApi, settings as settingsApi } from '../../api'
import MarkAwayModal from '../../components/MarkAwayModal'

const TYPE_LABELS = {
  enrolled: 'Enrolled',
  casual: 'Casual',
  catchup: 'Catch-up',
  classpass: 'Class Pass',
  practice: 'Practice',
}

const TYPE_TAG_CLASS = {
  enrolled: 'tag-lime',
  casual: 'tag-lav',
  catchup: 'tag-lav',
  classpass: 'tag-lav',
  practice: 'tag-grey',
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00').toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function formatDateShort(dateStr) {
  return new Date(dateStr + 'T00:00').toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function StatusBadge({ item }) {
  if (item.status === 'away') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="tag tag-amber" style={{ fontSize: 10 }}>Away</span>
        {item.makeup_credit_issued && (
          <span style={{ fontSize: 10, color: 'var(--grey)' }}>Make-up issued</span>
        )}
      </div>
    )
  }
  if (item.status === 'waitlisted') {
    return <span className="tag tag-lav" style={{ fontSize: 10 }}>Waitlisted</span>
  }
  if (item.status === 'confirmed') {
    const label = item.type === 'practice' ? 'Confirmed' : 'Booked'
    return <span style={{ fontSize: 10, background: 'rgba(0,180,255,0.12)', color: '#4fc3f7', borderRadius: 4, padding: '2px 7px', fontWeight: 700, letterSpacing: '0.04em' }}>{label}</span>
  }
  return <span className="tag tag-lime" style={{ fontSize: 10 }}>Attending</span>
}

function MadeMistakeDialog({ item, onClose, onDone }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  async function comingBack() {
    setLoading(true)
    try {
      const res = await attendanceApi.cancelAway(item.occurrence_id)
      setResult(res.data)
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    const isWaitlisted = result.status === 'waitlisted'
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 400, width: '100%', padding: '28px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{isWaitlisted ? '😬' : '🎉'}</div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, marginBottom: 10 }}>
            {isWaitlisted ? "You're on the waitlist!" : "You're back in!"}
          </div>
          <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6, marginBottom: 20 }}>
            {result.message || (isWaitlisted ? "Your spot was given away, but we've added you to the waitlist." : "Great! We've got you back in the class.")}
          </div>
          <button className="btn btn-lime btn-sm" onClick={onDone}>Got it</button>
        </div>
      </div>
    )
  }

  const isFull = item.spots_left === 0

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 420, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>Made a mistake?</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{item.session_name}</div>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16 }}>
            {formatDate(item.date)}{item.start_time ? ` · ${item.start_time}` : ''}
          </div>
          {isFull ? (
            <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6, marginBottom: 20 }}>
              Oops — you gave this week's spot away, and in case you didn't realise, we're very popular! If you still want to come, click below to join the waitlist.
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6, marginBottom: 20 }}>
              Changed your mind? We'll put you back in the class.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-lime btn-sm" onClick={comingBack} disabled={loading} style={{ fontWeight: 700 }}>
              {loading ? 'Checking…' : isFull ? 'Join waitlist' : "I'm coming!"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ color: 'var(--grey)' }}>
              Keep it cancelled
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple month calendar
function MonthCalendar({ items, onSelectDate, selectedDate }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-indexed

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun

  const bookingDates = new Set(items.map(i => i.date))

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const todayStr = today.toISOString().slice(0, 10)

  // Build cells: leading empties + day numbers
  const cells = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={prevMonth} style={{ fontSize: 14, padding: '4px 12px' }}>‹</button>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15 }}>{monthLabel}</div>
        <button className="btn btn-ghost btn-sm" onClick={nextMonth} style={{ fontSize: 14, padding: '4px 12px' }}>›</button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--grey)', fontWeight: 700, padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />
          const pad = String(day).padStart(2, '0')
          const monPad = String(viewMonth + 1).padStart(2, '0')
          const dateStr = `${viewYear}-${monPad}-${pad}`
          const hasBooking = bookingDates.has(dateStr)
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate

          return (
            <div
              key={day}
              onClick={() => hasBooking && onSelectDate(isSelected ? null : dateStr)}
              style={{
                textAlign: 'center',
                padding: '6px 2px',
                borderRadius: 8,
                cursor: hasBooking ? 'pointer' : 'default',
                background: isSelected ? 'rgba(176,160,255,0.18)' : isToday ? 'rgba(204,255,0,0.08)' : 'transparent',
                border: isToday ? '1px solid rgba(204,255,0,0.25)' : isSelected ? '1px solid rgba(176,160,255,0.4)' : '1px solid transparent',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--lime)' : 'var(--white)' }}>{day}</div>
              {hasBooking && (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#b0a0ff', margin: '3px auto 0' }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ItemRow({ item, onMarkAway, onUndoAway, onCancel }) {
  const typeBadgeClass = TYPE_TAG_CLASS[item.type] || 'tag-grey'
  const typeLabel = TYPE_LABELS[item.type] || item.type

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          {item.start_time && <span style={{ fontSize: 12, color: 'var(--grey)', fontWeight: 600 }}>{item.start_time}</span>}
          <span className={`tag ${typeBadgeClass}`} style={{ fontSize: 10 }}>{typeLabel}</span>
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{item.session_name}</div>
        <div style={{ fontSize: 12, color: 'var(--grey)' }}>
          {[item.studio_name, item.instructor_name ? `with ${item.instructor_name}` : null].filter(Boolean).join(' · ')}
        </div>
        <div style={{ marginTop: 6 }}>
          <StatusBadge item={item} />
        </div>
        {item.classmates?.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 5 }}>
            Also coming: {item.classmates.join(', ')}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        {item.type === 'enrolled' && item.status === 'attending' && (
          <button className="btn btn-ghost btn-xs" style={{ fontSize: 11 }} onClick={() => onMarkAway(item)}>
            Mark away
          </button>
        )}
        {item.type === 'enrolled' && item.status === 'away' && (
          <button className="btn btn-ghost btn-xs" style={{ fontSize: 11, color: 'var(--lime)', borderColor: 'rgba(204,255,0,0.3)' }} onClick={() => onUndoAway(item)}>
            I can make it!
          </button>
        )}
        {(item.type === 'casual' || item.type === 'catchup' || item.type === 'classpass') && item.status === 'confirmed' && (
          <button className="btn btn-ghost btn-xs" style={{ fontSize: 11, color: 'var(--red)' }} onClick={() => onCancel(item)}>
            Cancel
          </button>
        )}
        {item.type === 'practice' && item.status === 'confirmed' && (
          <button className="btn btn-ghost btn-xs" style={{ fontSize: 11, color: 'var(--red)' }} onClick={() => onCancel(item)}>
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

export default function StudentUpcomingClasses() {
  const navigate = useNavigate()
  const { data, loading, refetch } = useApi(() => classesApi.myUpcoming(), [])
  const { data: studioSettings } = useApi(() => settingsApi.get(), [])

  const [view, setView] = useState('list') // 'list' | 'calendar'
  const [selectedDate, setSelectedDate] = useState(null)
  const [madeMistakeItem, setMadeMistakeItem] = useState(null)
  const [markAwayOcc, setMarkAwayOcc] = useState(null)
  const [actionError, setActionError] = useState('')

  const items = data || []

  // Group by date
  const grouped = {}
  for (const item of items) {
    if (!grouped[item.date]) grouped[item.date] = []
    grouped[item.date].push(item)
  }
  const sortedDates = Object.keys(grouped).sort()

  const displayedDates = view === 'calendar' && selectedDate
    ? (grouped[selectedDate] ? [selectedDate] : [])
    : sortedDates

  function handleMarkAway(item) {
    setMarkAwayOcc({
      id: item.occurrence_id,
      date: item.date,
      session_detail: { name: item.session_name, start_time: item.start_time },
    })
  }

  async function handleCancel(item) {
    setActionError('')
    try {
      if (item.type === 'practice') {
        const { classes: classesApiInner } = await import('../../api')
        await classesApiInner.practice.cancel(item.booking_id)
      } else {
        const { classes: classesApiInner } = await import('../../api')
        await classesApiInner.casual.cancel(item.occurrence_id)
      }
      refetch()
    } catch (e) {
      setActionError(e.response?.data?.detail || 'Failed to cancel. Please try again.')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Upcoming Classes</div>
          <div className="page-sub">{items.length} upcoming booking{items.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => navigate('/portal/classes')}>
          ← My Classes
        </button>
      </div>

      {/* View toggle */}
      <div className="subtabs" style={{ marginBottom: 20 }}>
        <button className={`subtab${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>List</button>
        <button className={`subtab${view === 'calendar' ? ' active' : ''}`} onClick={() => setView('calendar')}>Calendar</button>
      </div>

      {actionError && (
        <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12, padding: '10px 14px', background: 'rgba(255,68,68,0.07)', borderRadius: 8 }}>
          {actionError}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div style={{ marginBottom: 8 }}>No upcoming bookings</div>
          <div style={{ fontSize: 12 }}>Your enrolled classes, casual bookings, and practice sessions will appear here</div>
        </div>
      ) : (
        <>
          {view === 'calendar' && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 16px', marginBottom: 20 }}>
              <MonthCalendar items={items} onSelectDate={setSelectedDate} selectedDate={selectedDate} />
            </div>
          )}

          {view === 'calendar' && !selectedDate ? (
            <div style={{ fontSize: 13, color: 'var(--grey)', textAlign: 'center', padding: '24px 0' }}>
              Tap a day with a dot to see what's on
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {displayedDates.map(date => (
                <div key={date}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
                    {formatDate(date)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {grouped[date].map(item => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        onMarkAway={handleMarkAway}
                        onUndoAway={setMadeMistakeItem}
                        onCancel={handleCancel}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {madeMistakeItem && (
        <MadeMistakeDialog
          item={madeMistakeItem}
          onClose={() => setMadeMistakeItem(null)}
          onDone={() => { setMadeMistakeItem(null); refetch() }}
        />
      )}

      {markAwayOcc && (
        <MarkAwayModal
          occurrence={markAwayOcc}
          cancellationWindowHours={studioSettings?.cancellation_window_hours}
          noShowFee={studioSettings?.no_show_fee}
          onClose={() => setMarkAwayOcc(null)}
          onDone={() => { setMarkAwayOcc(null); refetch() }}
        />
      )}
    </div>
  )
}
