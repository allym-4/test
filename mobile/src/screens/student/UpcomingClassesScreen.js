import { useState, useMemo } from 'react'
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Modal, TextInput,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { classes as classesApi, attendance as attendanceApi, enrolments as enrolmentsApi } from '../../api'

const TYPE_LABELS = {
  enrolled: 'Enrolled',
  casual: 'Casual',
  catchup: 'Catch-up',
  classpass: 'Class Pass',
  practice: 'Practice',
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00').toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function StatusBadge({ item }) {
  if (item.status === 'away') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={[s.badge, { backgroundColor: 'rgba(255,170,0,0.15)', borderColor: 'rgba(255,170,0,0.3)' }]}>
          <Text style={[s.badgeText, { color: '#ffaa00' }]}>Away</Text>
        </View>
        {item.makeup_credit_issued && (
          <Text style={{ fontSize: 10, color: '#666' }}>Make-up issued</Text>
        )}
      </View>
    )
  }
  if (item.status === 'waitlisted') {
    return (
      <View style={[s.badge, { backgroundColor: 'rgba(176,160,255,0.15)', borderColor: 'rgba(176,160,255,0.3)' }]}>
        <Text style={[s.badgeText, { color: '#b0a0ff' }]}>Waitlisted</Text>
      </View>
    )
  }
  if (item.type === 'practice' || item.status === 'confirmed') {
    return (
      <View style={[s.badge, { backgroundColor: 'rgba(0,180,255,0.12)', borderColor: 'rgba(0,180,255,0.2)' }]}>
        <Text style={[s.badgeText, { color: '#4fc3f7' }]}>Confirmed</Text>
      </View>
    )
  }
  return (
    <View style={[s.badge, { backgroundColor: 'rgba(204,255,0,0.12)', borderColor: 'rgba(204,255,0,0.2)' }]}>
      <Text style={[s.badgeText, { color: '#ccff00' }]}>Attending</Text>
    </View>
  )
}

function MadeMistakeModal({ item, onClose, onDone }) {
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
      <Modal visible transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { alignItems: 'center', paddingVertical: 32 }]}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>{isWaitlisted ? '😬' : '🎉'}</Text>
            <Text style={[s.modalTitle, { textAlign: 'center' }]}>
              {isWaitlisted ? "You're on the waitlist!" : "You're back in!"}
            </Text>
            <Text style={[s.modalBody, { textAlign: 'center', marginBottom: 20 }]}>
              {result.message || (isWaitlisted ? "Your spot was given away, but we've added you to the waitlist." : "Great! We've got you back in the class.")}
            </Text>
            <TouchableOpacity style={s.btnLime} onPress={onDone}>
              <Text style={s.btnLimeText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    )
  }

  const isFull = item.spots_left === 0

  return (
    <Modal visible transparent animationType="fade">
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={s.modalBox} onPress={() => {}}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Made a mistake?</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: '#666', fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={s.modalContent}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 4 }}>{item.session_name}</Text>
            <Text style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
              {formatDate(item.date)}{item.start_time ? ` · ${item.start_time}` : ''}
            </Text>
            <Text style={[s.modalBody, { marginBottom: 20 }]}>
              {isFull
                ? "Oops — you gave this week's spot away, and in case you didn't realise, we're very popular! If you still want to come, click below to join the waitlist."
                : "Changed your mind? We'll put you back in the class."}
            </Text>
            <TouchableOpacity style={[s.btnLime, { marginBottom: 10 }]} onPress={comingBack} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#000" size="small" />
                : <Text style={s.btnLimeText}>{isFull ? 'Join waitlist' : "I'm coming!"}</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={s.btnGhost} onPress={onClose}>
              <Text style={s.btnGhostText}>Keep it cancelled</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

function MonthCalendar({ items, selectedDate, onSelectDate }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun

  const bookingDates = new Set(items.map(i => i.date))
  const todayStr = today.toISOString().slice(0, 10)

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const cells = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <TouchableOpacity onPress={prevMonth} style={s.calNavBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.calNavText}>‹</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{monthLabel}</Text>
        <TouchableOpacity onPress={nextMonth} style={s.calNavBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.calNavText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {DAY_LABELS.map(d => (
          <View key={d} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: '#555', fontWeight: '700', textTransform: 'uppercase' }}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`empty-${idx}`} style={{ width: '14.28%', aspectRatio: 1 }} />
          const pad = String(day).padStart(2, '0')
          const monPad = String(viewMonth + 1).padStart(2, '0')
          const dateStr = `${viewYear}-${monPad}-${pad}`
          const hasBooking = bookingDates.has(dateStr)
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate

          return (
            <TouchableOpacity
              key={day}
              style={[
                { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
                isSelected && { backgroundColor: 'rgba(176,160,255,0.18)' },
                isToday && !isSelected && { backgroundColor: 'rgba(204,255,0,0.08)' },
              ]}
              onPress={() => hasBooking && onSelectDate(isSelected ? null : dateStr)}
              activeOpacity={hasBooking ? 0.7 : 1}
            >
              <Text style={{ fontSize: 13, color: isToday ? '#ccff00' : '#fff', fontWeight: isToday ? '700' : '400' }}>
                {day}
              </Text>
              {hasBooking && (
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#b0a0ff', marginTop: 2 }} />
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

function ItemRow({ item, onMarkAway, onUndoAway, onCancel }) {
  const typeLabel = TYPE_LABELS[item.type] || item.type

  return (
    <View style={s.itemCard}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          {item.start_time && (
            <Text style={{ fontSize: 12, color: '#666', fontWeight: '600' }}>{item.start_time}</Text>
          )}
          <View style={s.typeBadge}>
            <Text style={s.typeBadgeText}>{typeLabel}</Text>
          </View>
        </View>
        <Text style={s.itemName}>{item.session_name}</Text>
        <Text style={s.itemSub}>
          {[item.studio_name, item.instructor_name ? `with ${item.instructor_name}` : null].filter(Boolean).join(' · ')}
        </Text>
        <View style={{ marginTop: 6 }}>
          <StatusBadge item={item} />
        </View>
      </View>
      <View style={{ flexShrink: 0, gap: 6, alignItems: 'flex-end' }}>
        {item.type === 'enrolled' && item.status === 'attending' && (
          <TouchableOpacity style={s.actionBtn} onPress={() => onMarkAway(item)}>
            <Text style={s.actionBtnText}>Mark away</Text>
          </TouchableOpacity>
        )}
        {item.type === 'enrolled' && item.status === 'away' && (
          <TouchableOpacity style={[s.actionBtn, { borderColor: 'rgba(204,255,0,0.3)' }]} onPress={() => onUndoAway(item)}>
            <Text style={[s.actionBtnText, { color: '#ccff00' }]}>I can make it!</Text>
          </TouchableOpacity>
        )}
        {(item.type === 'casual' || item.type === 'catchup' || item.type === 'classpass' || item.type === 'practice') && item.status === 'confirmed' && (
          <TouchableOpacity style={s.actionBtn} onPress={() => onCancel(item)}>
            <Text style={[s.actionBtnText, { color: '#ff4444' }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

function ChangeRequestBadge({ status }) {
  const configs = {
    pending:     { label: 'Change pending',     color: '#ffaa00', bg: 'rgba(255,170,0,0.12)',  border: 'rgba(255,170,0,0.3)'  },
    in_progress: { label: 'Change in progress', color: '#4fc3f7', bg: 'rgba(0,180,255,0.10)', border: 'rgba(0,180,255,0.25)' },
    approved:    { label: 'Change approved',    color: '#ccff00', bg: 'rgba(204,255,0,0.10)', border: 'rgba(204,255,0,0.25)' },
    resolved:    { label: 'Change resolved',    color: '#ccff00', bg: 'rgba(204,255,0,0.10)', border: 'rgba(204,255,0,0.25)' },
    rejected:    { label: 'Change declined',    color: '#ff4444', bg: 'rgba(255,68,68,0.10)', border: 'rgba(255,68,68,0.25)' },
  }
  const cfg = configs[status] || configs.pending
  return (
    <View style={[s.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  )
}

function RequestChangeModal({ enrolment, onClose, onSuccess }) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!notes.trim()) { setError('Please describe what you\'d like to change.'); return }
    setSaving(true)
    setError('')
    try {
      await enrolmentsApi.changeRequests.create({
        current_enrolment: enrolment.id,
        notes,
      })
      setDone(true)
    } catch (e) {
      setError(e.response?.data?.detail || e.response?.data?.current_enrolment?.[0] || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ backgroundColor: '#111', borderRadius: 16, width: '100%', borderWidth: 1, borderColor: '#222', padding: 24 }}>
          {done ? (
            <>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#ccff00', marginBottom: 8 }}>Request sent!</Text>
              <Text style={{ fontSize: 14, color: '#888', lineHeight: 22, marginBottom: 24 }}>
                We've received your request and opened a support ticket. We'll be in touch soon.
              </Text>
              <TouchableOpacity style={s.btnLime} onPress={onSuccess}>
                <Text style={s.btnLimeText}>Done</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff' }}>Request a class change</Text>
                <TouchableOpacity onPress={onClose}><Text style={{ color: '#555', fontSize: 18 }}>✕</Text></TouchableOpacity>
              </View>
              <Text style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>{enrolment.class_session_name || enrolment.session_name}</Text>
              <Text style={{ fontSize: 13, color: '#888', lineHeight: 20, marginBottom: 12 }}>
                Tell us what you'd like to change — which class you'd prefer, why, and any other details.
                We'll review your request and follow up via the support portal.
              </Text>
              {error ? (
                <View style={{ backgroundColor: 'rgba(255,68,68,0.08)', borderRadius: 8, padding: 10, marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, color: '#ff4444' }}>{error}</Text>
                </View>
              ) : null}
              <TextInput
                style={{
                  backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 10,
                  color: '#fff', padding: 12, fontSize: 14, minHeight: 100, textAlignVertical: 'top', marginBottom: 16,
                }}
                placeholder="e.g. I'd like to move from Thursday Level 2 to Friday Dance if there's a spot available…"
                placeholderTextColor="#444"
                multiline
                value={notes}
                onChangeText={setNotes}
              />
              <TouchableOpacity style={s.btnLime} onPress={submit} disabled={saving}>
                <Text style={s.btnLimeText}>{saving ? 'Sending…' : 'Submit request'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnGhost, { marginTop: 10 }]} onPress={onClose}>
                <Text style={s.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

export default function UpcomingClassesScreen({ navigation }) {
  const { data, loading, refetch } = useApi(() => classesApi.myUpcoming(), [])
  const { data: enrolData, refetch: refetchEnrol } = useApi(
    () => enrolmentsApi.list({ status: 'active', enrolment_type: 'course' }),
    []
  )
  const { data: changeRequestData, refetch: refetchChangeRequests } = useApi(
    () => enrolmentsApi.changeRequests.mine(), []
  )

  const [view, setView] = useState('list')
  const [selectedDate, setSelectedDate] = useState(null)
  const [madeMistakeItem, setMadeMistakeItem] = useState(null)
  const [markAwayItem, setMarkAwayItem] = useState(null)
  const [markingAway, setMarkingAway] = useState(false)
  const [actionError, setActionError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [changeRequestEnrolment, setChangeRequestEnrolment] = useState(null)
  const [cancelEnrolPending, setCancelEnrolPending] = useState(null)

  const changeRequestMap = useMemo(() => {
    const requests = changeRequestData?.results ?? changeRequestData ?? []
    const map = {}
    for (const req of requests) {
      if (!map[req.current_enrolment] || req.id > map[req.current_enrolment].id) {
        map[req.current_enrolment] = req
      }
    }
    return map
  }, [changeRequestData])

  const items = data || []

  const grouped = {}
  for (const item of items) {
    if (!grouped[item.date]) grouped[item.date] = []
    grouped[item.date].push(item)
  }
  const sortedDates = Object.keys(grouped).sort()

  const displayedDates = view === 'calendar' && selectedDate
    ? (grouped[selectedDate] ? [selectedDate] : [])
    : sortedDates

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([refetch(), refetchEnrol(), refetchChangeRequests()])
    setRefreshing(false)
  }

  async function confirmMarkAway(item) {
    setMarkingAway(true)
    try {
      await attendanceApi.markAway(item.occurrence_id, item.enrolment_id)
      setMarkAwayItem(null)
      refetch()
    } catch (e) {
      setActionError(e.response?.data?.detail || 'Failed to mark away.')
      setMarkAwayItem(null)
    } finally {
      setMarkingAway(false)
    }
  }

  async function handleCancel(item) {
    setActionError('')
    try {
      if (item.type === 'practice') {
        await classesApi.practice.cancel(item.booking_id)
      } else {
        await classesApi.casual.cancel(item.occurrence_id)
      }
      refetch()
    } catch (e) {
      setActionError(e.response?.data?.detail || 'Failed to cancel.')
    }
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ccff00" />}
    >
      <View style={s.viewToggle}>
        <TouchableOpacity
          style={[s.toggleBtn, view === 'list' && s.toggleBtnActive]}
          onPress={() => setView('list')}
        >
          <Text style={[s.toggleBtnText, view === 'list' && s.toggleBtnTextActive]}>List</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toggleBtn, view === 'calendar' && s.toggleBtnActive]}
          onPress={() => setView('calendar')}
        >
          <Text style={[s.toggleBtnText, view === 'calendar' && s.toggleBtnTextActive]}>Calendar</Text>
        </TouchableOpacity>
      </View>

      {actionError ? (
        <View style={{ backgroundColor: 'rgba(255,68,68,0.07)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <Text style={{ fontSize: 13, color: '#ff4444' }}>{actionError}</Text>
        </View>
      ) : null}

      {loading && !refreshing ? (
        <ActivityIndicator color="#ccff00" style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: 40 }}>
          <Text style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>No upcoming bookings</Text>
          <Text style={{ color: '#444', fontSize: 12, textAlign: 'center' }}>
            Your enrolled classes, casual bookings, and practice sessions will appear here
          </Text>
        </View>
      ) : (
        <>
          {view === 'calendar' && (
            <View style={[s.card, { marginBottom: 16 }]}>
              <MonthCalendar
                items={items}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </View>
          )}

          {view === 'calendar' && !selectedDate ? (
            <Text style={{ color: '#555', fontSize: 13, textAlign: 'center', paddingVertical: 24 }}>
              Tap a day with a dot to see what's on
            </Text>
          ) : (
            <View style={{ gap: 20 }}>
              {displayedDates.map(date => (
                <View key={date}>
                  <Text style={s.dateLabel}>{formatDate(date)}</Text>
                  <View style={{ gap: 8 }}>
                    {grouped[date].map(item => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        onMarkAway={(item) => setMarkAwayItem(item)}
                        onUndoAway={setMadeMistakeItem}
                        onCancel={handleCancel}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Season Enrolments section */}
      {(() => {
        const activeEnrolments = (enrolData?.results ?? enrolData ?? []).filter(
          e => e.status === 'active' && e.enrolment_type === 'course'
        )
        if (!activeEnrolments.length) return null

        // Group by season name
        const seasons = {}
        for (const e of activeEnrolments) {
          const sName = e.class_session_detail?.season?.name || e.season_name || 'Current Season'
          if (!seasons[sName]) seasons[sName] = []
          seasons[sName].push(e)
        }

        return (
          <View style={{ marginTop: 24 }}>
            <Text style={[s.dateLabel, { marginBottom: 12 }]}>Season Enrolments</Text>
            {Object.entries(seasons).map(([seasonName, enrols]) => (
              <View key={seasonName} style={[s.card, { marginBottom: 12 }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                  {seasonName}
                </Text>
                {enrols.map(e => {
                  const pendingCR = changeRequestMap[e.id]
                  const hasOpenCR = pendingCR && (pendingCR.status === 'pending' || pendingCR.status === 'in_progress')
                  return (
                    <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#1c1c1c' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, color: '#fff', fontWeight: '600' }}>
                          {e.class_session_detail?.name || e.class_name}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
                          {e.class_session_detail?.day_of_week_display || ''}{e.class_session_detail?.start_time ? ` · ${e.class_session_detail.start_time.slice(0, 5)}` : ''}
                        </Text>
                        {pendingCR && (
                          <View style={{ marginTop: 5 }}>
                            <ChangeRequestBadge status={pendingCR.status} />
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[s.badge, { backgroundColor: 'rgba(204,255,0,0.08)', borderColor: 'rgba(204,255,0,0.2)', alignSelf: 'flex-start' }]}>
                          <Text style={[s.badgeText, { color: '#ccff00' }]}>Enrolled</Text>
                        </View>
                        {!hasOpenCR && (
                          <TouchableOpacity
                            style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: '#333' }}
                            onPress={() => setChangeRequestEnrolment(e)}
                          >
                            <Text style={{ fontSize: 11, color: '#666' }}>✏️ Change</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => setCancelEnrolPending(e)}>
                          <Text style={{ fontSize: 11, color: '#ff4444' }}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                })}
              </View>
            ))}
          </View>
        )
      })()}

      {madeMistakeItem && (
        <MadeMistakeModal
          item={madeMistakeItem}
          onClose={() => setMadeMistakeItem(null)}
          onDone={() => { setMadeMistakeItem(null); refetch() }}
        />
      )}

      {/* Mark Away confirmation modal */}
      {markAwayItem && (() => {
        const [h, m] = (markAwayItem.start_time || '00:00').split(':').map(Number)
        const classDateTime = new Date(markAwayItem.date + 'T00:00')
        classDateTime.setHours(h, m, 0, 0)
        const withinCutoff = (classDateTime - Date.now()) < 4 * 60 * 60 * 1000
        const dateLabel = new Date(markAwayItem.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
        return (
          <Modal visible transparent animationType="fade" onRequestClose={() => setMarkAwayItem(null)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
              <View style={{ backgroundColor: '#111', borderRadius: 16, width: '100%', borderWidth: 1, borderColor: '#222', padding: 24 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 }}>Mark away?</Text>
                <Text style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>{markAwayItem.session_name} · {dateLabel}</Text>
                {withinCutoff ? (
                  <View style={{ backgroundColor: 'rgba(255,170,0,0.08)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,170,0,0.25)', padding: 14, marginBottom: 20 }}>
                    <Text style={{ fontWeight: '700', color: '#ffaa00', marginBottom: 4 }}>No catch-up credit for this one</Text>
                    <Text style={{ fontSize: 13, color: '#888', lineHeight: 20 }}>This is within 4 hours of your class — the cancellation window has passed. No credit will be issued. You can still mark away so we know you're not coming.</Text>
                  </View>
                ) : (
                  <View style={{ backgroundColor: 'rgba(204,255,0,0.06)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(204,255,0,0.2)', padding: 14, marginBottom: 20 }}>
                    <Text style={{ fontWeight: '700', color: '#ccff00', marginBottom: 4 }}>You'll receive a catch-up credit</Text>
                    <Text style={{ fontSize: 13, color: '#888', lineHeight: 20 }}>More than 4 hours away — you're within the cancellation window. A catch-up credit will be added to your account to use within this season.</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={{ backgroundColor: '#ccff00', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 }}
                  disabled={markingAway}
                  onPress={() => confirmMarkAway(markAwayItem)}
                >
                  <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>{markingAway ? 'Saving…' : 'Confirm away'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#333' }}
                  onPress={() => setMarkAwayItem(null)}
                >
                  <Text style={{ color: '#888', fontSize: 15 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )
      })()}

      {changeRequestEnrolment && (
        <RequestChangeModal
          enrolment={changeRequestEnrolment}
          onClose={() => setChangeRequestEnrolment(null)}
          onSuccess={() => { setChangeRequestEnrolment(null); refetchEnrol() }}
        />
      )}

      {cancelEnrolPending && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setCancelEnrolPending(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <View style={{ backgroundColor: '#111', borderRadius: 16, width: '100%', borderWidth: 1, borderColor: '#222', padding: 24 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 6 }}>Cancel enrolment?</Text>
              <Text style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
                {cancelEnrolPending.class_session_detail?.name || cancelEnrolPending.class_name}
              </Text>
              <View style={{ backgroundColor: 'rgba(255,170,0,0.07)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,170,0,0.2)', padding: 12, marginBottom: 20 }}>
                <Text style={{ fontSize: 13, color: '#ffaa00', lineHeight: 20 }}>
                  If you'd like to move to a different class, use "✏️ Change" instead — that way we can find you a spot in your preferred class.
                </Text>
              </View>
              <TouchableOpacity
                style={{ borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,68,68,0.4)' }}
                onPress={async () => {
                  try {
                    await enrolmentsApi.delete(cancelEnrolPending.id)
                    setCancelEnrolPending(null)
                    refetchEnrol()
                    refetch()
                  } catch (e) {
                    setActionError(e.response?.data?.detail || 'Failed to cancel enrolment.')
                    setCancelEnrolPending(null)
                  }
                }}
              >
                <Text style={{ color: '#ff4444', fontWeight: '700', fontSize: 15 }}>Yes, cancel my enrolment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#333' }}
                onPress={() => setCancelEnrolPending(null)}
              >
                <Text style={{ color: '#888', fontSize: 15 }}>Keep it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#222',
  },
  toggleBtnText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 14,
    padding: 16,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  itemCard: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  itemSub: {
    fontSize: 12,
    color: '#666',
  },
  typeBadge: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 10,
    color: '#aaa',
    fontWeight: '700',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  actionBtnText: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: '600',
  },
  btnLime: {
    backgroundColor: '#ccff00',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  btnLimeText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  calNavBtn: {
    width: 36, height: 36, borderRadius: 8,
    borderWidth: 1, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center',
  },
  calNavText: { color: '#888', fontSize: 20, fontWeight: '600', lineHeight: 24 },
  btnGhost: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: '100%',
  },
  btnGhostText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  modalTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: '#fff',
  },
  modalContent: {
    padding: 18,
  },
  modalBody: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
})
