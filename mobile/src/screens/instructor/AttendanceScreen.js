import { useState, useEffect, useMemo } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, Alert, ScrollView, TextInput,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { classes, attendance, enrolments, payments as paymentsApi, homework } from '../../api'
import client from '../../api/client'
import { fmt12 } from '../../utils/time'
import { useAuth } from '../../contexts/AuthContext'

const STATUS_OPTS = [
  { key: 'pending',        label: 'Pending',        color: '#555' },
  { key: 'present',        label: 'Attended',       color: '#ccff00' },
  { key: 'late',           label: 'Late',           color: '#ffaa00' },
  { key: 'no_show',        label: 'No-show +$20',  color: '#ff5050' },
  { key: 'no_show_waived', label: 'No-show waived', color: '#ff8888' },
  { key: 'absent',         label: 'Excused',        color: '#555' },
  { key: 'cancelled',      label: 'Cancelled',      color: '#555' },
]
const AWAY_STATUSES = ['absent', 'cancelled', 'no_show', 'no_show_waived']
const STATUS_COLOR = Object.fromEntries(STATUS_OPTS.map(o => [o.key, o.color]))

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getMilestones(st, today) {
  const badges = []
  if (!st) return badges

  // Birthday
  if (st.date_of_birth) {
    const dob = new Date(st.date_of_birth)
    let thisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
    if (thisYear < today && thisYear.toDateString() !== today.toDateString()) {
      thisYear = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate())
    }
    const diff = Math.round((thisYear - today) / 86400000)
    if (diff === 0) badges.push({ icon: '🎂', label: 'Birthday today' })
    else if (diff === 1) badges.push({ icon: '🎂', label: 'Birthday tomorrow' })
    else if (diff > 1 && diff <= 7) badges.push({ icon: '🎂', label: `Birthday in ${diff} days` })
  }

  // Class count milestones
  const count = st.total_classes_attended || 0
  const MILESTONES = [10, 25, 50, 75, 100, 150, 200, 300, 500]
  if (MILESTONES.includes(count)) {
    badges.push({ icon: '🎉', label: `${count} classes` })
  }

  // Studio anniversary
  if (st.date_joined) {
    const joined = new Date(st.date_joined)
    const years = today.getFullYear() - joined.getFullYear()
    if (years > 0) {
      const anniversary = new Date(today.getFullYear(), joined.getMonth(), joined.getDate())
      const diff = Math.round((anniversary - today) / 86400000)
      if (diff === 0) badges.push({ icon: '🥂', label: `${years} year${years !== 1 ? 's' : ''} at Duality` })
    }
  }

  return badges
}

function enrollLabel(e) {
  if (e.enrolment_type === 'trial') return 'Trial class'
  if (e.enrolment_type === 'casual') return 'Casual'
  if (e.enrolment_type === 'makeup') {
    const from = e.makeup_from_detail || e.original_session_detail
    if (from) return `Makeup — ${from.name} ${DAYS[from.day_of_week] ?? ''} ${fmt12(from.start_time)}`
    return 'Makeup'
  }
  return 'Enrolled'
}

function avatarLetter(e) {
  const st = e.student_detail
  return (st?.first_name || st?.display_name || '?')[0].toUpperCase()
}

// ── Student row ───────────────────────────────────────────────────────────────

const NOTE_TAGS = [
  { id: 'injury', label: '🩹 Injury' },
  { id: 'general', label: '📝 General' },
  { id: 'vibes', label: '✨ Vibes' },
]

function StudentRow({ entry, status, balance, onStatusChange, onNote, note, noteTag, onNoteTagChange, onViewStudent }) {
  const st = entry.student_detail
  const name = st?.display_name || `${st?.first_name ?? ''} ${st?.last_name ?? ''}`.trim() || 'Student'
  const owing = balance < 0 ? Math.abs(balance) : 0
  const currentColor = STATUS_COLOR[status] || '#fff'
  const isFirst = entry.is_first_class
  const isWaitlistPromo = entry.promoted_from_waitlist
  const today = new Date()
  const milestones = getMilestones(st, today)

  const [expanded, setExpanded] = useState(false)

  return (
    <View style={[s.row, { borderColor: '#222' }]}>
      {/* Top line: avatar + name + badges */}
      <TouchableOpacity style={s.rowTop} onPress={() => setExpanded(e => !e)} activeOpacity={0.7}>
        <View style={[s.avatar, { backgroundColor: '#2a1a6e' }]}>
          <Text style={s.avatarText}>{avatarLetter(entry)}</Text>
        </View>
        <View style={s.rowMeta}>
          <View style={s.nameRow}>
            <TouchableOpacity
              onPress={e => { e.stopPropagation?.(); onViewStudent?.() }}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text style={[s.name, s.nameTappable]}>{name}</Text>
            </TouchableOpacity>
            {st?.pronouns ? <Text style={s.pronouns}>{st.pronouns}</Text> : null}
          </View>
          <Text style={s.enrolType}>{enrollLabel(entry)}</Text>
          {/* Callout badges */}
          <View style={s.badges}>
            {isFirst && (
              <View style={s.badgeLime}><Text style={s.badgeLimeText}>★ FIRST TIME</Text></View>
            )}
            {isWaitlistPromo && (
              <View style={s.badgeLav}><Text style={s.badgeLavText}>WAITLIST</Text></View>
            )}
            {owing > 0 && (
              <View style={s.badgeRed}><Text style={s.badgeRedText}>⚠ ${owing.toFixed(0)} owing</Text></View>
            )}
            {milestones.map((m, i) => (
              <View key={i} style={s.badgeMilestone}>
                <Text style={s.badgeMilestoneText}>{m.icon} {m.label}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={[s.statusPill, { borderColor: currentColor }]}>
          <Text style={[s.statusPillText, { color: currentColor }]} numberOfLines={1}>
            {STATUS_OPTS.find(o => o.key === status)?.label ?? status}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Expanded: status options + note tags + note */}
      {expanded && (
        <View style={s.expanded}>
          <View style={s.statusGrid}>
            {STATUS_OPTS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[s.statusBtn, status === opt.key && { backgroundColor: `${opt.color}22`, borderColor: opt.color }]}
                onPress={() => { onStatusChange(opt.key); setExpanded(false) }}
              >
                <Text style={[s.statusBtnText, status === opt.key && { color: opt.color }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Note tags */}
          <View style={s.noteTagRow}>
            {NOTE_TAGS.map(tag => (
              <TouchableOpacity
                key={tag.id}
                style={[s.noteTagChip, noteTag === tag.id && s.noteTagChipActive]}
                onPress={() => onNoteTagChange(noteTag === tag.id ? '' : tag.id)}
              >
                <Text style={[s.noteTagChipText, noteTag === tag.id && s.noteTagChipTextActive]}>
                  {tag.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.noteBtn} onPress={onNote}>
            <Text style={[s.noteBtnText, note ? { color: '#ffaa00' } : {}]}>
              {note ? `📝 ${note}` : '+ Add note'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ── Waitlist row ──────────────────────────────────────────────────────────────

function WaitlistRow({ item, position }) {
  const name = item.student_detail?.display_name || item.student_name || `Student #${item.student}`
  return (
    <View style={s.wlRow}>
      <View style={s.wlPos}><Text style={s.wlPosText}>#{position}</Text></View>
      <Text style={s.wlName}>{name}</Text>
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AttendanceScreen({ navigation, route }) {
  const { user } = useAuth()
  function goToStudent(studentId, studentName) {
    navigation.navigate('StudentDetail', { studentId, studentName })
  }
  // Before 5am Sydney time, show the previous day's classes so instructors can mark attendance after late-night classes
  const today = (() => {
    const now = new Date()
    const sydHour = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' })).getHours()
    const d = new Date(now)
    if (sydHour < 5) d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  })()
  const [selectedOcc, setSelectedOcc] = useState(route.params?.occurrence ?? null)
  const [tab, setTab] = useState('attending')
  const [register, setRegister] = useState({})
  const [notes, setNotes] = useState({})
  const [noteTags, setNoteTags] = useState({})
  const [balances, setBalances] = useState({})
  const [waitlist, setWaitlist] = useState([])
  const [saving, setSaving] = useState(false)
  const [noteModal, setNoteModal] = useState(null)  // studentId
  const [noteText, setNoteText] = useState('')
  const [appendNoteText, setAppendNoteText] = useState('')
  const [savingNoteAppend, setSavingNoteAppend] = useState(false)
  const [localInstructorNotes, setLocalInstructorNotes] = useState(null)
  const [hwList, setHwList] = useState([])
  const [hwLoading, setHwLoading] = useState(false)
  const [showAddHw, setShowAddHw] = useState(false)
  const [newHwTitle, setNewHwTitle] = useState('')
  const [newHwDesc, setNewHwDesc] = useState('')
  const [newHwDue, setNewHwDue] = useState('')
  const [savingHw, setSavingHw] = useState(false)

  const { data: occData, loading } = useApi(
    () => classes.occurrences({ date: today, instructor: 'me' }), []
  )
  const occurrences = occData?.results ?? occData ?? []

  // Use enrolments as source of truth (matches enrolled_count from class list)
  const sessionId = selectedOcc?.session ?? selectedOcc?.session_detail?.id ?? null
  const { data: enrData, loading: enrLoading, refetch: refetchEnr } = useApi(
    () => sessionId ? enrolments.list({ session: sessionId, status: 'active' }) : null,
    [sessionId]
  )
  // Saved attendance records — to overlay status onto enrolment list
  const { data: attData, refetch: refetchAtt } = useApi(
    () => selectedOcc ? attendance.list({ occurrence: selectedOcc.id }) : null,
    [selectedOcc?.id]
  )
  const enrolledStudents = useMemo(() => enrData?.results ?? enrData ?? [], [enrData])
  const attRecords = useMemo(() => attData?.results ?? attData ?? [], [attData])

  // Merge: enrolments as base, overlay with saved attendance status
  const students = useMemo(() => {
    const attMap = {}
    attRecords.forEach(r => {
      const sid = String(r.student ?? r.student_id ?? '')
      if (sid) attMap[sid] = r
    })
    return enrolledStudents.map(enr => ({
      ...enr,
      _attRecord: attMap[String(enr.student)] ?? null,
    }))
  }, [enrolledStudents, attRecords])

  function refetchEnrAndAtt() {
    refetchEnr()
    refetchAtt()
  }

  // Init register from saved attendance records
  useEffect(() => {
    const init = {}
    const initNotes = {}
    const initNoteTags = {}
    attRecords.forEach(r => {
      const sid = String(r.student ?? r.student_id ?? '')
      if (!sid) return
      const rawStatus = r.status === 'no_show' && r.no_show_fee_waived ? 'no_show_waived' : r.status
      init[sid] = rawStatus || 'pending'
      initNotes[sid] = r.note || ''
      initNoteTags[sid] = r.note_tag || ''
    })
    setRegister(init)
    setNotes(initNotes)
    setNoteTags(initNoteTags)
  }, [attRecords]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync localInstructorNotes when occurrence changes
  useEffect(() => {
    setLocalInstructorNotes(selectedOcc?.session_detail?.instructor_notes ?? null)
  }, [selectedOcc?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load homework when session is known
  useEffect(() => {
    if (!sessionId) return
    setHwLoading(true)
    homework.list({ session: sessionId })
      .then(r => setHwList(r.data?.results ?? r.data ?? []))
      .catch(() => setHwList([]))
      .finally(() => setHwLoading(false))
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load balances + waitlist when occurrence selected
  useEffect(() => {
    if (!selectedOcc) return
    // Waitlist
    client.get('/api/classes/waitlist/', { params: { occurrence: selectedOcc.id } })
      .then(r => setWaitlist(r.data?.results ?? r.data ?? []))
      .catch(() => client.get('/api/classes/waitlist/', { params: { session: selectedOcc.session?.id } })
        .then(r => setWaitlist(r.data?.results ?? r.data ?? []))
        .catch(() => setWaitlist([])))
  }, [selectedOcc?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load balances
  useEffect(() => {
    if (!students.length) return
    students.forEach(enr => {
      const sid = enr.student
      if (!sid) return
      paymentsApi.balance(sid).then(res => {
        setBalances(prev => ({ ...prev, [String(sid)]: parseFloat(res.data.balance) }))
      }).catch(() => {})
    })
  }, [students.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function setStatus(sid, status) {
    setRegister(prev => ({ ...prev, [sid]: status }))
  }

  async function appendNote() {
    if (!appendNoteText.trim() || !sessionId) return
    setSavingNoteAppend(true)
    try {
      const now = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
      const byLine = user?.display_name || user?.first_name || 'Instructor'
      const entry = `[${now} — ${byLine}] ${appendNoteText.trim()}`
      const current = localInstructorNotes ?? selectedOcc?.session_detail?.instructor_notes ?? ''
      const updated = current ? `${current}\n\n${entry}` : entry
      await classes.update(sessionId, { instructor_notes: updated })
      setLocalInstructorNotes(updated)
      setAppendNoteText('')
    } catch {
      Alert.alert('Error', 'Could not save note.')
    } finally {
      setSavingNoteAppend(false)
    }
  }

  async function createHomework() {
    if (!newHwTitle.trim() || !sessionId) return
    setSavingHw(true)
    try {
      const res = await homework.create({
        class_session: sessionId,
        title: newHwTitle.trim(),
        description: newHwDesc.trim(),
        due_date: newHwDue || null,
      })
      setHwList(prev => [res.data, ...prev])
      setNewHwTitle('')
      setNewHwDesc('')
      setNewHwDue('')
      setShowAddHw(false)
    } catch {
      Alert.alert('Error', 'Could not create homework.')
    } finally {
      setSavingHw(false)
    }
  }

  async function toggleHomeworkStatus(hw) {
    const newStatus = hw.status === 'active' ? 'closed' : 'active'
    try {
      await homework.update(hw.id, { status: newStatus })
      setHwList(prev => prev.map(h => h.id === hw.id ? { ...h, status: newStatus } : h))
    } catch {
      Alert.alert('Error', 'Could not update homework.')
    }
  }

  async function saveRegister() {
    if (!selectedOcc) return
    setSaving(true)
    try {
      const records = students.map(enr => {
        const sid = String(enr.student)
        const raw = register[sid] || 'pending'
        const status = raw === 'no_show_waived' ? 'no_show' : raw
        return { student: sid, status, no_show_fee_waived: raw === 'no_show_waived', note: notes[sid] || '', note_tag: noteTags[sid] || '' }
      })
      await attendance.bulkSave(selectedOcc.id, records)
      Alert.alert('Saved', 'Register saved.')
      refetchEnrAndAtt()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not save register.')
    } finally {
      setSaving(false)
    }
  }

  // ── Class list ──────────────────────────────────────────────────────────────
  if (!selectedOcc) {
    return (
      <View style={s.root}>
        <Text style={s.heading}>Today's Classes</Text>
        <Text style={s.sub}>{new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        {loading && <ActivityIndicator style={{ marginTop: 40 }} color="#ccff00" />}
        {!loading && occurrences.length === 0 && (
          <Text style={s.empty}>No classes scheduled for today.</Text>
        )}
        <FlatList
          data={occurrences}
          keyExtractor={o => String(o.id)}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.occCard} onPress={() => setSelectedOcc(item)}>
              <View style={[s.occAccent, { backgroundColor: '#ccff00' }]} />
              <View style={s.occBody}>
                <Text style={s.occName}>{item.session_name || item.session_detail?.name || 'Class'}</Text>
                <Text style={s.occMeta}>
                  {item.start_time ? fmt12(item.start_time) : ''}
                  {item.studio_name ? `  ·  ${item.studio_name}` : item.session_detail?.studio_detail?.name ? `  ·  ${item.session_detail.studio_detail.name}` : ''}
                  {item.enrolled_count != null ? `  ·  ${item.enrolled_count} enrolled` : ''}
                </Text>
                <Text style={s.occCta}>Take register →</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    )
  }

  // ── Register view ───────────────────────────────────────────────────────────
  const attending = students.filter(enr => {
    const sid = String(enr.student)
    return !AWAY_STATUSES.includes(register[sid] || 'pending')
  })
  const away = students.filter(enr => {
    const sid = String(enr.student)
    return AWAY_STATUSES.includes(register[sid] || 'pending')
  })

  const sessionName = selectedOcc.session_name || selectedOcc.session_detail?.name || 'Class'
  const dateLabel = new Date(selectedOcc.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  // Calculate current week number from season start date
  const currentWeekNum = (() => {
    const seasonStart = selectedOcc.session_detail?.season_start_date
    if (!seasonStart || !selectedOcc.date) return null
    const start = new Date(seasonStart + 'T00:00')
    const occ = new Date(selectedOcc.date + 'T00:00')
    const diff = Math.floor((occ - start) / (7 * 24 * 60 * 60 * 1000))
    return diff >= 0 ? diff + 1 : null
  })()

  // Syllabus entry for this week
  const sessionSyllabus = selectedOcc.session_detail?.syllabus
  const syllabusEntry = Array.isArray(sessionSyllabus) && currentWeekNum
    ? sessionSyllabus.find(e => e.week === currentWeekNum)
    : null
  const hasSyllabusEntry = syllabusEntry && (syllabusEntry.title || syllabusEntry.content || syllabusEntry.moves)
  const instructorNotes = (localInstructorNotes ?? selectedOcc.session_detail?.instructor_notes ?? '').trim() || ''
  const showWeekPlan = hasSyllabusEntry || !!instructorNotes || true  // always show for append input

  return (
    <View style={s.root}>
      {/* Header */}
      <TouchableOpacity style={s.back} onPress={() => { setSelectedOcc(null); setRegister({}); setNotes({}); setNoteTags({}); setBalances({}) }}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={s.heading}>{sessionName}</Text>
      <Text style={s.sub}>{dateLabel}</Text>

      {/* Stats row */}
      <View style={s.statsRow}>
        {[
          ['Enrolled', students.length, '#fff'],
          ['Attending', attending.length, '#ccff00'],
          ['Away', away.length, '#ffaa00'],
          ['Waitlist', waitlist.length, '#b0a0ff'],
        ].map(([label, val, color]) => (
          <View key={label} style={s.stat}>
            <Text style={[s.statVal, { color }]}>{val}</Text>
            <Text style={s.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Week plan card */}
      {showWeekPlan && (
        <View style={s.weekPlanCard}>
          {currentWeekNum && (
            <Text style={s.weekPlanLabel}>Week {currentWeekNum} Plan</Text>
          )}
          {hasSyllabusEntry && (
            <View>
              {syllabusEntry.title ? (
                <Text style={s.weekPlanTitle}>{syllabusEntry.title}</Text>
              ) : null}
              {syllabusEntry.content ? (
                <Text style={s.weekPlanContent}>{syllabusEntry.content}</Text>
              ) : null}
              {syllabusEntry.moves ? (
                <Text style={s.weekPlanMoves}>Moves: {syllabusEntry.moves}</Text>
              ) : null}
            </View>
          )}
          <View style={[s.notesBox, hasSyllabusEntry && { marginTop: 12 }]}>
            <Text style={s.notesLabel}>Instructor Notes</Text>
            {instructorNotes ? (
              <Text style={s.notesText}>{instructorNotes}</Text>
            ) : (
              <Text style={[s.notesText, { color: '#555' }]}>No notes yet.</Text>
            )}
            <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,170,0,0.15)', paddingTop: 10 }}>
              <TextInput
                style={s.appendInput}
                value={appendNoteText}
                onChangeText={setAppendNoteText}
                placeholder="Add a note…"
                placeholderTextColor="#555"
                multiline
              />
              <TouchableOpacity
                style={[s.appendBtn, (!appendNoteText.trim() || savingNoteAppend) && { opacity: 0.4 }]}
                onPress={appendNote}
                disabled={!appendNoteText.trim() || savingNoteAppend}
              >
                {savingNoteAppend
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={s.appendBtnText}>Add Note</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={s.tabBar}>
        {[
          ['attending', `Attending (${attending.length})`],
          ['away', `Away (${away.length})`],
          ['waitlist', `Waitlist (${waitlist.length})`],
          ['homework', `Homework${hwList.filter(h => h.status === 'active').length > 0 ? ` (${hwList.filter(h => h.status === 'active').length})` : ''}`],
        ].map(([key, label]) => (
          <TouchableOpacity key={key} style={[s.tabBtn, tab === key && s.tabBtnActive]} onPress={() => setTab(key)}>
            <Text style={[s.tabBtnText, tab === key && s.tabBtnTextActive]} numberOfLines={1}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {tab === 'homework' ? (
        <ScrollView contentContainerStyle={[s.list, { paddingBottom: 100 }]}>
          {/* Add homework form */}
          {showAddHw ? (
            <View style={s.hwForm}>
              <Text style={s.hwFormTitle}>New Homework</Text>
              <TextInput
                style={s.hwInput}
                value={newHwTitle}
                onChangeText={setNewHwTitle}
                placeholder="Title *"
                placeholderTextColor="#555"
              />
              <TextInput
                style={[s.hwInput, { minHeight: 60, textAlignVertical: 'top' }]}
                value={newHwDesc}
                onChangeText={setNewHwDesc}
                placeholder="Description (optional)"
                placeholderTextColor="#555"
                multiline
              />
              <TextInput
                style={s.hwInput}
                value={newHwDue}
                onChangeText={setNewHwDue}
                placeholder="Due date YYYY-MM-DD (optional)"
                placeholderTextColor="#555"
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity style={s.hwCancelBtn} onPress={() => { setShowAddHw(false); setNewHwTitle(''); setNewHwDesc(''); setNewHwDue('') }}>
                  <Text style={s.hwCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.hwSaveBtn, (!newHwTitle.trim() || savingHw) && { opacity: 0.4 }]}
                  onPress={createHomework}
                  disabled={!newHwTitle.trim() || savingHw}
                >
                  {savingHw ? <ActivityIndicator color="#000" size="small" /> : <Text style={s.hwSaveBtnText}>Add</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={s.hwAddBtn} onPress={() => setShowAddHw(true)}>
              <Text style={s.hwAddBtnText}>+ Assign Homework</Text>
            </TouchableOpacity>
          )}
          {/* Homework list */}
          {hwLoading && <ActivityIndicator color="#ccff00" style={{ marginTop: 20 }} />}
          {!hwLoading && hwList.length === 0 && (
            <Text style={s.empty}>No homework assigned yet.</Text>
          )}
          {hwList.map(hw => (
            <View key={hw.id} style={[s.hwCard, hw.status === 'closed' && { opacity: 0.5 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.hwCardTitle}>{hw.title}</Text>
                {hw.description ? <Text style={s.hwCardDesc}>{hw.description}</Text> : null}
                {hw.due_date ? <Text style={s.hwCardMeta}>Due: {hw.due_date}</Text> : null}
                <Text style={[s.hwCardStatus, { color: hw.status === 'active' ? '#ccff00' : '#555' }]}>
                  {hw.status === 'active' ? 'Active' : 'Closed'}
                </Text>
              </View>
              <TouchableOpacity
                style={s.hwToggleBtn}
                onPress={() => toggleHomeworkStatus(hw)}
              >
                <Text style={s.hwToggleBtnText}>{hw.status === 'active' ? 'Close' : 'Reopen'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : enrLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#ccff00" />
      ) : (
        <FlatList
          data={tab === 'attending' ? attending : tab === 'away' ? away : waitlist}
          keyExtractor={(item, i) => String(item.id ?? i)}
          contentContainerStyle={[s.list, { paddingBottom: 100 }]}
          ListEmptyComponent={
            <Text style={s.empty}>
              {tab === 'waitlist' ? 'No one on the waitlist.' : tab === 'away' ? 'No one marked away.' : 'No students attending.'}
            </Text>
          }
          renderItem={({ item, index }) => {
            if (tab === 'waitlist') {
              return <WaitlistRow item={item} position={index + 1} />
            }
            const sid = String(item.student)
            const studentName = item.student_detail?.display_name || `${item.student_detail?.first_name ?? ''} ${item.student_detail?.last_name ?? ''}`.trim() || 'Student'
            return (
              <StudentRow
                entry={item}
                status={register[sid] || 'pending'}
                balance={balances[sid] ?? 0}
                note={notes[sid] || ''}
                noteTag={noteTags[sid] || ''}
                onStatusChange={status => setStatus(sid, status)}
                onNote={() => { setNoteModal(sid); setNoteText(notes[sid] || '') }}
                onNoteTagChange={tag => setNoteTags(prev => ({ ...prev, [sid]: tag }))}
                onViewStudent={() => goToStudent(sid, studentName)}
              />
            )
          }}
        />
      )}

      {/* Save button */}
      {students.length > 0 && tab !== 'waitlist' && tab !== 'homework' && (
        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.5 }]}
          onPress={saveRegister}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#000" /> : <Text style={s.saveBtnText}>Save Register</Text>}
        </TouchableOpacity>
      )}

      {/* Note modal */}
      {noteModal !== null && (
        <View style={s.noteOverlay}>
          <View style={s.noteModal}>
            <Text style={s.noteModalTitle}>
              Note — {students.find(r => String(r.student) === String(noteModal))?.student_detail?.display_name ?? 'Student'}
            </Text>
            <TextInput
              style={s.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Add a note…"
              placeholderTextColor="#555"
              multiline
              autoFocus
            />
            <View style={s.noteActions}>
              <TouchableOpacity style={s.noteCancelBtn} onPress={() => setNoteModal(null)}>
                <Text style={s.noteCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.noteSaveBtn}
                onPress={() => { setNotes(prev => ({ ...prev, [noteModal]: noteText })); setNoteModal(null) }}
              >
                <Text style={s.noteSaveText}>Save Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  heading: { fontSize: 20, fontWeight: '700', color: '#fff', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 2 },
  sub: { fontSize: 13, color: '#888', paddingHorizontal: 16, marginBottom: 10 },
  back: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  backText: { color: '#ccff00', fontWeight: '600', fontSize: 15 },
  list: { padding: 12 },
  empty: { textAlign: 'center', color: '#555', marginTop: 40 },

  // Class list
  occCard: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#222', overflow: 'hidden' },
  occAccent: { width: 4 },
  occBody: { flex: 1, padding: 16 },
  occName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  occMeta: { fontSize: 13, color: '#888', marginTop: 4 },
  occCta: { fontSize: 13, color: '#ccff00', fontWeight: '600', marginTop: 8 },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 10, gap: 8 },
  stat: { flex: 1, backgroundColor: '#111', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  statVal: { fontSize: 20, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Tabs
  tabBar: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 8, backgroundColor: '#0a0a0a', borderRadius: 10, padding: 3, gap: 2 },
  tabBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#222' },
  tabBtnText: { fontSize: 11, fontWeight: '600', color: '#555' },
  tabBtnTextActive: { color: '#fff' },

  // Student row
  row: { backgroundColor: '#111', borderRadius: 12, marginBottom: 8, borderWidth: 1, overflow: 'hidden' },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#b0a0ff', fontWeight: '700', fontSize: 15 },
  rowMeta: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  name: { fontSize: 14, fontWeight: '700', color: '#fff' },
  nameTappable: { textDecorationLine: 'underline', color: '#ccff00' },
  pronouns: { fontSize: 11, color: '#555' },
  enrolType: { fontSize: 12, color: '#888', marginBottom: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  badgeLime: { backgroundColor: 'rgba(204,255,0,0.12)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  badgeLimeText: { fontSize: 9, fontWeight: '700', color: '#ccff00', letterSpacing: 0.3 },
  badgeLav: { backgroundColor: 'rgba(176,160,255,0.15)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  badgeLavText: { fontSize: 9, fontWeight: '700', color: '#b0a0ff' },
  badgeRed: { backgroundColor: 'rgba(255,80,80,0.12)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  badgeRedText: { fontSize: 9, fontWeight: '700', color: '#ff5050' },
  badgeMilestone: { backgroundColor: '#1a0a4a', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginRight: 4 },
  badgeMilestoneText: { color: '#ccff00', fontSize: 10, fontWeight: '700' },

  // Status pill (right side)
  statusPill: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0, maxWidth: 110, alignItems: 'center' },
  statusPillText: { fontSize: 11, fontWeight: '600' },

  // Expanded
  expanded: { borderTopWidth: 1, borderTopColor: '#1e1e1e', padding: 10, gap: 8 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333' },
  statusBtnText: { fontSize: 12, fontWeight: '600', color: '#666' },
  noteTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  noteTagChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333' },
  noteTagChipActive: { backgroundColor: 'rgba(204,255,0,0.1)', borderColor: 'rgba(204,255,0,0.4)' },
  noteTagChipText: { fontSize: 12, fontWeight: '600', color: '#555' },
  noteTagChipTextActive: { color: '#ccff00' },
  noteBtn: { paddingVertical: 6 },
  noteBtnText: { fontSize: 12, color: '#555' },

  // Waitlist row
  wlRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 10, marginBottom: 6, padding: 12, borderWidth: 1, borderColor: '#222', gap: 12 },
  wlPos: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(176,160,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  wlPosText: { color: '#b0a0ff', fontWeight: '700', fontSize: 13 },
  wlName: { fontSize: 14, color: '#fff', fontWeight: '500', flex: 1 },

  // Week plan card
  weekPlanCard: { marginHorizontal: 12, marginBottom: 10, backgroundColor: '#111', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#222' },
  weekPlanLabel: { fontSize: 10, fontWeight: '700', color: '#ccff00', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 },
  weekPlanTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 4 },
  weekPlanContent: { fontSize: 13, color: '#aaa', lineHeight: 19, marginBottom: 4 },
  weekPlanMoves: { fontSize: 12, color: '#888' },
  notesBox: { backgroundColor: 'rgba(255,170,0,0.06)', borderWidth: 1, borderColor: 'rgba(255,170,0,0.25)', borderRadius: 8, padding: 10 },
  notesLabel: { fontSize: 10, fontWeight: '700', color: '#ffaa00', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  notesText: { fontSize: 13, color: '#ccc', lineHeight: 19 },

  // Append note
  appendInput: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: 'rgba(255,170,0,0.2)', borderRadius: 8, padding: 10, color: '#fff', fontSize: 13, minHeight: 56, textAlignVertical: 'top', marginBottom: 8 },
  appendBtn: { alignSelf: 'flex-end', backgroundColor: '#ccff00', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  appendBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },

  // Homework tab
  hwAddBtn: { backgroundColor: '#111', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#333', marginBottom: 12, alignItems: 'center' },
  hwAddBtnText: { color: '#ccff00', fontWeight: '600', fontSize: 14 },
  hwForm: { backgroundColor: '#111', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#333', marginBottom: 12, gap: 10 },
  hwFormTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 4 },
  hwInput: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 10, color: '#fff', fontSize: 14 },
  hwCancelBtn: { flex: 1, padding: 10, alignItems: 'center' },
  hwCancelBtnText: { color: '#888', fontWeight: '600', fontSize: 14 },
  hwSaveBtn: { flex: 1, backgroundColor: '#ccff00', borderRadius: 8, padding: 10, alignItems: 'center' },
  hwSaveBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  hwCard: { backgroundColor: '#111', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#222', marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  hwCardTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  hwCardDesc: { fontSize: 13, color: '#aaa', marginBottom: 4 },
  hwCardMeta: { fontSize: 12, color: '#888', marginBottom: 2 },
  hwCardStatus: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  hwToggleBtn: { backgroundColor: '#1a1a1a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#333', flexShrink: 0 },
  hwToggleBtnText: { color: '#888', fontWeight: '600', fontSize: 12 },

  // Save button
  saveBtn: { position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#ccff00', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '700', fontSize: 16 },

  // Note modal
  noteOverlay: { position: 'absolute', inset: 0, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  noteModal: { backgroundColor: '#111', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#333' },
  noteModalTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 12 },
  noteInput: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 },
  noteActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  noteCancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  noteCancelText: { color: '#888', fontWeight: '600', fontSize: 14 },
  noteSaveBtn: { backgroundColor: '#ccff00', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  noteSaveText: { color: '#000', fontWeight: '700', fontSize: 14 },
})
