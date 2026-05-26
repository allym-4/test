import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { classes, enrolments, attendance, payments, settings as settingsApi } from '../api'
import { useApi } from '../hooks/useApi'
import client from '../api/client'
import './AttendancePage.css'
import { fmt12 } from '../utils/time'

const AVATAR_COLORS = ['#b0a0ff', '#ccff00', '#ffaa00', '#ff88aa', '#44ffcc', '#ffcc88', '#b0f0b0', '#9ac4ff', '#ffb3de', '#44ff99']
function avatarColor(name) {
  let h = 0
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

const STATUS_OPTS = [
  { value: 'pending',        label: 'Pending',             color: '#555' },
  { value: 'present',        label: 'Attended',            color: '#ccff00' },
  { value: 'late',           label: 'Late',                color: '#ffaa00' },
  { value: 'no_show',        label: 'No-show + $20 fee',   color: '#ff5050' },
  { value: 'no_show_waived', label: 'No-show — fee waived', color: '#ff8888' },
  { value: 'absent',         label: 'Excused / Absent',    color: '#666' },
  { value: 'cancelled',      label: 'Cancelled',           color: '#666' },
]
const STATUS_COLOR = Object.fromEntries(STATUS_OPTS.map(o => [o.value, o.color]))

const NOTE_TAGS = [
  { id: 'general', label: 'General', color: '#888' },
  { id: 'injury',  label: 'Injury',  color: '#ff8888' },
  { id: 'vibes',   label: 'Vibes',   color: '#b0a0ff' },
]
const NOTE_TAG_COLOR = Object.fromEntries(NOTE_TAGS.map(t => [t.id, t.color]))

function getMilestones(st, today) {
  const badges = []
  if (!st) return badges

  // Birthday
  if (st.date_of_birth) {
    const dob = new Date(st.date_of_birth)
    const thisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
    const diff = Math.round((thisYear - today) / 86400000)
    if (diff === 0) badges.push({ label: 'Birthday today 🎂', color: '#ffaa00', bg: 'rgba(255,170,0,0.1)', border: 'rgba(255,170,0,0.35)' })
    else if (diff === 1) badges.push({ label: 'Birthday tomorrow 🎂', color: '#ffaa00', bg: 'rgba(255,170,0,0.08)', border: 'rgba(255,170,0,0.25)' })
    else if (diff > 1 && diff <= 7) badges.push({ label: `Birthday in ${diff} days 🎂`, color: '#ffaa00', bg: 'rgba(255,170,0,0.06)', border: 'rgba(255,170,0,0.2)' })
  }

  // Class count milestones — show when they've just hit a round number
  const count = st.total_classes_attended || 0
  const MILESTONES = [10, 25, 50, 75, 100, 150, 200, 300, 500]
  if (MILESTONES.includes(count)) {
    badges.push({ label: `${count} classes 🎉`, color: '#ccff00', bg: 'rgba(204,255,0,0.08)', border: 'rgba(204,255,0,0.25)' })
  }

  // Studio anniversary (years)
  if (st.date_joined) {
    const joined = new Date(st.date_joined)
    const years = today.getFullYear() - joined.getFullYear()
    if (years > 0) {
      const anniversary = new Date(today.getFullYear(), joined.getMonth(), joined.getDate())
      const diff = Math.round((anniversary - today) / 86400000)
      if (diff === 0) badges.push({ label: `${years} year${years !== 1 ? 's' : ''} at Duality 🥂`, color: '#b0a0ff', bg: 'rgba(176,160,255,0.1)', border: 'rgba(176,160,255,0.3)' })
    }
  }

  return badges
}

function enrollLabel(e, session) {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  if (e.enrolment_type === 'trial') return 'Trial class'
  if (e.enrolment_type === 'casual') return 'Casual class'
  if (e.enrolment_type === 'makeup') {
    const from = e.makeup_from_detail || e.original_session_detail
    if (from) return `Makeup — ${from.name} ${DAYS[from.day_of_week] || ''} ${fmt12(from.start_time)}`
    return 'Makeup session'
  }
  return 'Course enrolment'
}

function ConvertTrialModal({ enrolment: e, onClose, onSuccess }) {
  const { data: studioData } = useApi(() => settingsApi.get(), [])
  const studio = studioData?.data || studioData || {}
  const seasonPrice = parseFloat(studio.price_season || 270)
  const trialPrice = parseFloat(studio.price_trial || 35)
  const defaultAmount = Math.max(0, seasonPrice - trialPrice).toFixed(2)
  const [amount, setAmount] = useState('')
  const [paymentType, setPaymentType] = useState('payment')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const amountVal = amount !== '' ? amount : defaultAmount

  async function handleSubmit(ev) {
    ev.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await enrolments.convertTrial(e.id, {
        amount_paid: parseFloat(amountVal),
        payment_type: paymentType,
        reference,
        description: `Season enrolment — ${e.class_session_detail?.name || 'class'} (converted from trial)`,
      })
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || 'Conversion failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={ev => ev.target === ev.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div className="modal-title">
          Convert Trial → Full
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '0 0 4px' }}>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
            <b style={{ color: 'var(--white)' }}>{e.student_detail?.display_name}</b> · {e.class_session_detail?.name}
          </div>
          <div style={{ background: '#111', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--grey)', marginBottom: 14 }}>
            Season ${seasonPrice.toFixed(2)} − trial ${trialPrice.toFixed(2)} = <b style={{ color: 'var(--lime)' }}>${defaultAmount} remaining</b>
          </div>
          {error && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</div>}
          <div className="field"><label>Amount ($)</label><input type="number" step="0.01" min="0" value={amountVal} onChange={ev => setAmount(ev.target.value)} /></div>
          <div className="field"><label>Payment type</label>
            <select value={paymentType} onChange={ev => setPaymentType(ev.target.value)}>
              <option value="payment">Payment received</option>
              <option value="charge">Charge (invoice / owing)</option>
            </select>
          </div>
          <div className="field"><label>Reference <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(optional)</span></label>
            <input value={reference} onChange={ev => setReference(ev.target.value)} placeholder="cash, Square #, etc." />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Converting…' : `Confirm $${parseFloat(amountVal || 0).toFixed(2)}`}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AttendancePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession]         = useState(null)
  const [occurrence, setOccurrence]   = useState(null)
  const [students, setStudents]       = useState([])
  const [waitlist, setWaitlist]       = useState([])
  const [register, setRegister]       = useState({})
  const [balances, setBalances]       = useState({})
  const [notes, setNotes]             = useState({})
  const [noteTags, setNoteTags]       = useState({})
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState('attending')
  const [noteModal, setNoteModal]     = useState(null)
  const [noteText, setNoteText]       = useState('')
  const [noteTag, setNoteTag]         = useState('')
  const [saveBanner, setSaveBanner]   = useState(false)
  const [convertEnrol, setConvertEnrol] = useState(null)

  const today = new Date()

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [sessRes, occRes, enrolRes] = await Promise.all([
          classes.get(id),
          classes.occurrences({ session: id }),
          enrolments.list({ session: id, status: 'active' }),
        ])
        const s = sessRes.data
        const occs = occRes.data.results || []
        const todayStr = new Date().toISOString().slice(0, 10)
        const occ = occs.find(o => o.date === todayStr) || occs[0] || null
        setSession(s)
        setOccurrence(occ)

        const enrolled = enrolRes.data.results || []
        setStudents(enrolled)

        const initial = {}
        const initialNotes = {}
        const initialNoteTags = {}
        if (occ) {
          const attRes = await attendance.list({ occurrence: occ.id })
          for (const r of (attRes.data.results || [])) {
            initial[r.student] = r.status === 'no_show' && r.no_show_fee_waived ? 'no_show_waived' : r.status
            initialNotes[r.student] = r.note || ''
            initialNoteTags[r.student] = r.note_tag || ''
          }

          // Load waitlist
          try {
            const wlRes = await client.get('/api/classes/waitlist/', { params: { occurrence: occ.id } })
            setWaitlist(wlRes.data?.results || [])
          } catch {
            try {
              const wlRes2 = await client.get('/api/classes/waitlist/', { params: { session: id } })
              setWaitlist(wlRes2.data?.results || [])
            } catch { setWaitlist([]) }
          }
        }
        // Default to pending (not present) for unrecorded students
        for (const e of enrolled) {
          if (!initial[e.student]) initial[e.student] = 'pending'
        }
        setRegister(initial)
        setNotes(initialNotes)
        setNoteTags(initialNoteTags)

        const balMap = {}
        await Promise.all(enrolled.map(async e => {
          try {
            const res = await payments.balance(e.student)
            balMap[e.student] = parseFloat(res.data.balance)
          } catch { balMap[e.student] = 0 }
        }))
        setBalances(balMap)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  function setStatus(studentId, status) {
    setRegister(r => ({ ...r, [studentId]: status }))
    setSaved(false)
  }

  function markAllPresent() {
    const all = {}
    students.forEach(e => { all[e.student] = 'present' })
    setRegister(all)
    setSaved(false)
  }

  async function handleSave() {
    if (!occurrence) return
    setSaving(true)
    try {
      const records = students.map(e => {
        const raw = register[e.student] || 'pending'
        return {
          student: e.student,
          status: raw === 'no_show_waived' ? 'no_show' : raw,
          no_show_fee_charged: raw === 'no_show',
          no_show_fee_waived: raw === 'no_show_waived',
          note: notes[e.student] || '',
          note_tag: noteTags[e.student] || '',
        }
      })
      await attendance.bulkSave(occurrence.id, records)
      setSaved(true)
      setSaveBanner(true)
    } finally {
      setSaving(false)
    }
  }

  const awayStatuses = ['no_show', 'no_show_waived', 'absent', 'cancelled']
  const attendingStudents = students.filter(e => !awayStatuses.includes(register[e.student] || 'pending'))
  const awayStudents = students.filter(e => awayStatuses.includes(register[e.student] || 'pending'))

  const counts = {
    present: Object.values(register).filter(v => v === 'present').length,
    late: Object.values(register).filter(v => v === 'late').length,
    no_show: Object.values(register).filter(v => v === 'no_show' || v === 'no_show_waived').length,
    absent: Object.values(register).filter(v => v === 'absent').length,
    cancelled: Object.values(register).filter(v => v === 'cancelled').length,
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  const shownStudents = tab === 'attending' ? attendingStudents : awayStudents

  return (
    <div className="att-page">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Link to="/classes" style={{ fontSize: 12, color: 'var(--grey)', display: 'inline-block', marginBottom: 10, textDecoration: 'none' }}>← My Classes</Link>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, lineHeight: 1.2, marginBottom: 6 }}>{session?.name}</div>
        <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 14 }}>
          {occurrence ? new Date(occurrence.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'No occurrence today'}
          {session?.start_time && <span> · {fmt12(session.start_time)}</span>}
          {session?.studio_detail?.name && <span> · {session.studio_detail.name}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={markAllPresent}>✓ All Present</button>
          <button className={`btn btn-sm ${saved ? 'btn-ghost' : 'btn-lime'}`} onClick={handleSave} disabled={saving || !occurrence}>
            {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : saved ? '✓ Saved' : 'Save Register'}
          </button>
        </div>
      </div>

      {/* Save banner */}
      {saveBanner && (
        <div style={{ background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Register saved — {counts.present} attended{counts.late > 0 ? `, ${counts.late} late` : ''}{counts.no_show > 0 ? `, ${counts.no_show} no-show` : ''}</span>
          <button style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 16 }} onClick={() => setSaveBanner(false)}>✕</button>
        </div>
      )}

      {/* Stats strip */}
      <div className="att-stats-row" style={{ marginBottom: 20 }}>
        {[
          ['Enrolled', students.length, '#fff'],
          ['Attended', counts.present, '#ccff00'],
          ['Late', counts.late, '#ffaa00'],
          ['No-show', counts.no_show, '#ff5050'],
          ['Absent', counts.absent, '#555'],
          ['Waitlist', waitlist.length, 'var(--lav)'],
        ].map(([label, val, color]) => (
          <div key={label} className="att-stat-chip">
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e1e1e', marginBottom: 16, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        {[
          ['attending', `Attending (${attendingStudents.length})`],
          ['waitlist', `Waitlist (${waitlist.length})`],
          ['away', `Away (${awayStudents.length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '10px 14px', border: 'none', background: 'transparent',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              whiteSpace: 'nowrap',
              color: tab === key ? 'var(--lime)' : 'var(--grey)',
              borderBottom: `2px solid ${tab === key ? 'var(--lime)' : 'transparent'}`,
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Waitlist tab */}
      {tab === 'waitlist' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {waitlist.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--grey)', fontSize: 13 }}>No one on the waitlist</div>
          ) : waitlist.map((entry, i) => {
            const st = entry.student_detail || entry.student
            return (
              <div key={entry.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1a1a1a', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--lav)', flexShrink: 0 }}>
                  {entry.position || i + 1}
                </div>
                <div className="avatar" style={{ background: avatarColor(st?.display_name || st?.first_name || ''), flexShrink: 0 }}>
                  {(st?.first_name || st?.display_name || '?')[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{st?.display_name || `${st?.first_name || ''} ${st?.last_name || ''}`.trim()}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
                    {entry.waitlist_type === 'season' ? 'Full season waitlist' : 'Casual spot waitlist'}
                    {entry.created_at && <span style={{ marginLeft: 8 }}>· Joined {new Date(entry.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>}
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(176,160,255,0.1)', color: 'var(--lav)', borderRadius: 6, padding: '3px 8px' }}>#{entry.position || i + 1}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Attending / Away tabs */}
      {tab !== 'waitlist' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shownStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--grey)', fontSize: 13 }}>
              {tab === 'attending' ? 'No students attending' : 'No one marked away or cancelled'}
            </div>
          ) : shownStudents.map(e => {
            const st = e.student_detail
            const status = register[e.student] || 'pending'
            const owing = balances[e.student] < 0 ? Math.abs(balances[e.student]) : 0
            const noteText_ = notes[e.student]
            const noteTag_ = noteTags[e.student]
            const isFirstTime = e.is_first_class || e.classes_attended === 0 || e.total_attendance === 0
            const fromWaitlist = e.promoted_from_waitlist || e.from_waitlist
            const milestones = getMilestones(st, today)

            return (
              <div
                key={e.student}
                className="att-student-row"
                style={{
                  background: '#111', border: '1px solid #1e1e1e',
                  borderRadius: 14, padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Avatar */}
                  <div className="avatar" style={{ background: avatarColor(st?.display_name || ''), flexShrink: 0, marginTop: 2 }}>
                    {st?.first_name?.[0] || '?'}
                  </div>

                  {/* Left: identity + enrolment + callouts */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span
                        style={{ fontWeight: 700, fontSize: 15, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.2)' }}
                        onClick={ev => { ev.stopPropagation(); navigate(`/students/${e.student}`) }}
                      >{st?.display_name}</span>
                      {st?.pronouns && <span style={{ fontSize: 12, color: '#555' }}>{st.pronouns}</span>}
                    </div>

                    {/* Enrolment type */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--grey)' }}>{enrollLabel(e, session)}</span>
                      {e.enrolment_type === 'trial' && e.status === 'active' && (
                        <button
                          className="btn btn-lime btn-xs"
                          style={{ fontSize: 10, padding: '2px 8px' }}
                          onClick={ev => { ev.stopPropagation(); setConvertEnrol(e) }}
                        >
                          Convert to full →
                        </button>
                      )}
                    </div>

                    {/* Callout badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {isFirstTime && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--lime)', background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.2)', borderRadius: 6, padding: '2px 8px' }}>
                          🌟 FIRST TIME
                        </span>
                      )}
                      {fromWaitlist && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--lav)', background: 'rgba(176,160,255,0.1)', border: '1px solid rgba(176,160,255,0.25)', borderRadius: 6, padding: '2px 8px' }}>
                          WAITLIST PROMO
                        </span>
                      )}
                      {owing > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#ff8888', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)', borderRadius: 6, padding: '2px 8px' }}>
                          ⚠ ${Math.round(owing)} owing — collect today
                        </span>
                      )}
                      {milestones.map((m, i) => (
                        <span key={i} style={{ fontSize: 10, fontWeight: 700, color: m.color, background: m.bg, border: `1px solid ${m.border}`, borderRadius: 6, padding: '2px 8px' }}>
                          {m.label}
                        </span>
                      ))}
                    </div>

                    {/* Inline note display */}
                    {noteText_ && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        {noteTag_ && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: NOTE_TAG_COLOR[noteTag_] || '#888', background: 'rgba(255,255,255,0.05)', border: `1px solid ${NOTE_TAG_COLOR[noteTag_] || '#333'}44`, borderRadius: 4, padding: '2px 6px', flexShrink: 0, marginTop: 1 }}>
                            {noteTag_}
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: '#aaa', lineHeight: 1.4 }}>{noteText_}</span>
                        <button
                          onClick={() => { setNoteModal(e.student); setNoteText(notes[e.student] || ''); setNoteTag(noteTags[e.student] || '') }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: 11, padding: '1px 4px', flexShrink: 0 }}
                        >Edit</button>
                      </div>
                    )}
                  </div>

                  {/* Right: add note + status */}
                  <div className="att-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    {/* Add note button (only when no note) */}
                    {!noteText_ && (
                      <button
                        onClick={() => { setNoteModal(e.student); setNoteText(''); setNoteTag('') }}
                        style={{
                          background: '#1a1a1a', border: '1px solid #2a2a2a',
                          borderRadius: 8, cursor: 'pointer',
                          padding: '5px 8px', fontSize: 11,
                          color: 'var(--grey)',
                        }}
                      >
                        + Note
                      </button>
                    )}

                    {/* Status select */}
                    <select
                      value={status}
                      onChange={ev => setStatus(e.student, ev.target.value)}
                      className="att-status-select"
                      style={{
                        background: '#0a0a0a',
                        border: `1px solid ${STATUS_COLOR[status] || '#333'}44`,
                        borderRadius: 8,
                        padding: '6px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: STATUS_COLOR[status] || '#fff',
                        cursor: 'pointer',
                        minWidth: 170,
                        outline: 'none',
                      }}
                    >
                      {STATUS_OPTS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>

                    {status === 'no_show' && (
                      <span style={{ fontSize: 10, color: '#ff5050' }}>$20 fee will be charged</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom save */}
      {tab !== 'waitlist' && (
        <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={markAllPresent}>Mark All Present</button>
          <button className={`btn btn-sm ${saved ? 'btn-ghost' : 'btn-lime'}`} onClick={handleSave} disabled={saving || !occurrence}>
            {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : saved ? '✓ Saved' : 'Save Register'}
          </button>
        </div>
      )}

      {convertEnrol && (
        <ConvertTrialModal
          enrolment={convertEnrol}
          onClose={() => setConvertEnrol(null)}
          onSuccess={() => {
            setConvertEnrol(null)
            setStudents(prev => prev.map(s => s.id === convertEnrol.id ? { ...s, enrolment_type: 'course' } : s))
          }}
        />
      )}

      {noteModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setNoteModal(null)}>
          <div className="modal-box">
            <div className="modal-title">
              Add a Note — {students.find(e => e.student === noteModal)?.student_detail?.display_name}
              <button className="modal-close" onClick={() => setNoteModal(null)}>✕</button>
            </div>
            <div className="field">
              <label>Tag</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                {NOTE_TAGS.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNoteTag(noteTag === t.id ? '' : t.id)}
                    style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: noteTag === t.id ? `${t.color}22` : '#1a1a1a',
                      border: `1px solid ${noteTag === t.id ? t.color : '#2a2a2a'}`,
                      color: noteTag === t.id ? t.color : '#888',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Note</label>
              <textarea
                rows={3}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="e.g. Arrived late, left early, wrist injury noted…"
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setNoteModal(null)}>Cancel</button>
              {notes[noteModal] && (
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => {
                  setNotes(n => ({ ...n, [noteModal]: '' }))
                  setNoteTags(t => ({ ...t, [noteModal]: '' }))
                  setNoteModal(null)
                  setSaved(false)
                }}>Remove</button>
              )}
              <button className="btn btn-lime btn-sm" onClick={() => {
                setNotes(n => ({ ...n, [noteModal]: noteText }))
                setNoteTags(t => ({ ...t, [noteModal]: noteTag }))
                setNoteModal(null)
                setSaved(false)
              }}>Save Note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
