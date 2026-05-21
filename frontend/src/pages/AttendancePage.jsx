import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { classes, enrolments, attendance, users, settings as settingsApi } from '../api'
import { useApi } from '../hooks/useApi'
import './AttendancePage.css'


const AVATAR_COLORS = ['#b0a0ff', '#ccff00', '#ffaa00', '#ff88aa', '#44ffcc', '#ffcc88', '#b0f0b0', '#9ac4ff', '#ffb3de', '#44ff99']
function avatarColor(name) {
  let h = 0
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

const STATUS_OPTS = [
  { value: 'present',   label: 'Present',              color: 'var(--lime)' },
  { value: 'late',      label: 'Late',                  color: 'var(--amber)' },
  { value: 'no_show',   label: 'No-show + $20 fee',     color: 'var(--red)' },
  { value: 'no_show_waived', label: 'No-show — fee waived', color: 'var(--red)' },
  { value: 'absent',    label: 'Excused / Absent',      color: 'var(--grey)' },
  { value: 'cancelled', label: 'Cancelled',             color: 'var(--grey)' },
]

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
          <div className="field"><label>Reference <span style={{ color: 'var(--grey)', fontWeight: 400 }}>(optional)</span></label><input value={reference} onChange={ev => setReference(ev.target.value)} placeholder="cash, Square #, etc." /></div>
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
  const [session, setSession]       = useState(null)
  const [occurrence, setOccurrence] = useState(null)
  const [students, setStudents]     = useState([])
  const [register, setRegister]     = useState({})
  const [balances, setBalances]     = useState({})
  const [notes, setNotes]           = useState({})
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('attending')
  const [noteModal, setNoteModal]   = useState(null)
  const [noteText, setNoteText]     = useState('')
  const [saveBanner, setSaveBanner] = useState(false)
  const [convertEnrol, setConvertEnrol] = useState(null)

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
        const today = new Date().toISOString().slice(0, 10)
        const occ = occs.find(o => o.date === today) || occs[0] || null
        setSession(s)
        setOccurrence(occ)

        const enrolled = enrolRes.data.results || []
        setStudents(enrolled)

        // Load existing attendance
        const initial = {}
        const initialNotes = {}
        if (occ) {
          const attRes = await attendance.list({ occurrence: occ.id })
          for (const r of (attRes.data.results || [])) {
            initial[r.student] = r.status === 'no_show' && r.no_show_fee_waived ? 'no_show_waived' : r.status
            initialNotes[r.student] = r.note || ''
          }
        }
        for (const e of enrolled) {
          if (!initial[e.student]) initial[e.student] = 'present'
        }
        setRegister(initial)
        setNotes(initialNotes)

        // Load balances for owing badges
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
        const raw = register[e.student] || 'present'
        const isNoShow = raw === 'no_show' || raw === 'no_show_waived'
        return {
          student: e.student,
          status: raw === 'no_show_waived' ? 'no_show' : raw,
          no_show_fee_charged: raw === 'no_show',
          no_show_fee_waived: raw === 'no_show_waived',
          note: notes[e.student] || '',
        }
      })
      await attendance.bulkSave(occurrence.id, records)
      setSaved(true)
      setSaveBanner(true)
    } finally {
      setSaving(false)
    }
  }

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  const awayStatuses = ['no_show', 'no_show_waived', 'absent', 'cancelled']
  const shown = students.filter(e => {
    const st = register[e.student] || 'present'
    return filter === 'attending' ? !awayStatuses.includes(st) : awayStatuses.includes(st)
  })

  const counts = {
    present: Object.values(register).filter(v => v === 'present').length,
    late: Object.values(register).filter(v => v === 'late').length,
    absent: Object.values(register).filter(v => v === 'absent').length,
    no_show: Object.values(register).filter(v => v === 'no_show' || v === 'no_show_waived').length,
    cancelled: Object.values(register).filter(v => v === 'cancelled').length,
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div className="att-page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link to="/classes" style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 8, textDecoration: 'none' }}>← My Classes</Link>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 26 }}>{session?.name}</div>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 4 }}>
            {occurrence ? new Date(occurrence.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'No occurrence today'}
            {session?.start_time && <span style={{ marginLeft: 8 }}>· {session.start_time.slice(0, 5)}</span>}
            {session?.studio_detail?.name && <span style={{ marginLeft: 8 }}>· {session.studio_detail.name}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <button className="btn btn-ghost btn-sm" onClick={markAllPresent}>✓ All Present</button>
          <button className={`btn btn-sm ${saved ? 'btn-ghost' : 'btn-lime'}`} onClick={handleSave} disabled={saving || !occurrence}>
            {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : saved ? '✓ Saved' : 'Save Register'}
          </button>
        </div>
      </div>

      {/* Post-save banner */}
      {saveBanner && (() => {
        const presentCount = Object.values(register).filter(v => v === 'present').length
        const noShowCount = Object.values(register).filter(v => v === 'no_show' || v === 'no_show_waived').length
        const lateCount = Object.values(register).filter(v => v === 'late').length
        return (
          <div style={{ background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Register saved — {presentCount} attended, {noShowCount} no-shows, {lateCount} late</span>
            <button style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 16 }} onClick={() => setSaveBanner(false)}>✕</button>
          </div>
        )
      })()}

      {/* Class info bar */}
      <div className="att-info-bar">
        <div className="att-info-item"><div className="att-info-label">Class</div><div className="att-info-val" style={{ fontFamily: "'Archivo Black', sans-serif" }}>{session?.name}</div></div>
        <div className="att-info-divider" />
        <div className="att-info-item"><div className="att-info-label">Date</div><div className="att-info-val">{occurrence ? new Date(occurrence.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</div></div>
        <div className="att-info-divider" />
        <div className="att-info-item"><div className="att-info-label">Time</div><div className="att-info-val">{session?.start_time?.slice(0, 5)}</div></div>
        <div className="att-info-divider" />
        <div className="att-info-item"><div className="att-info-label">Studio</div><div className="att-info-val">{session?.studio_detail?.name}</div></div>
        <div className="att-info-divider" />
        <div className="att-info-item"><div className="att-info-label">Enrolled</div><div className="att-info-val" style={{ fontFamily: "'Archivo Black', sans-serif", color: 'var(--lime)' }}>{students.length}/{session?.capacity}</div></div>
      </div>

      {/* Stats */}
      <div className="att-stats-row">
        {[['Present', counts.present, 'var(--lime)'], ['Late', counts.late, 'var(--amber)'], ['No-show', counts.no_show, 'var(--red)'], ['Absent', counts.absent, 'var(--grey)'], ['Cancelled', counts.cancelled, 'var(--grey)']].map(([label, val, color]) => (
          <div key={label} className="att-stat-chip">
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color }}>{val}</div>
            <div style={{ fontSize: 10, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--grey)' }}>Show:</span>
        <div className="att-filter-toggle">
          <button className={filter === 'attending' ? 'active' : ''} onClick={() => setFilter('attending')}>Attending</button>
          <button className={filter === 'away' ? 'active' : ''} onClick={() => setFilter('away')}>Marked Away / Cancelled</button>
        </div>
      </div>

      {/* Roster */}
      <div className="att-roster">
        {shown.length === 0 ? (
          <div className="empty-state">No students in this view</div>
        ) : shown.map(e => {
          const st = e.student_detail
          const status = register[e.student] || 'present'
          const owing = balances[e.student] < 0 ? Math.abs(balances[e.student]) : 0
          const hasNote = notes[e.student]

          return (
            <div key={e.student} className="att-row">
              <div className="att-card-head">
                <div className="avatar" style={{ background: avatarColor(st?.display_name || '') }}>
                  {st?.first_name?.[0] || '?'}
                </div>
                <div className="att-identity">
                  <div className="att-name-line">
                    <span className="att-name-text">{st?.display_name}</span>
                    {st?.pronouns && <span className="att-pronouns">{st.pronouns}</span>}
                    {e.enrolment_type === 'trial'
                      ? <span className="tag tag-amber" style={{ fontSize: 10 }}>Trial</span>
                      : e.enrolment_type === 'casual'
                      ? <span className="tag tag-lav" style={{ fontSize: 10 }}>Today Only</span>
                      : <span className="tag tag-lav" style={{ fontSize: 10 }}>Course</span>
                    }
                    {e.enrolment_type === 'trial' && e.status === 'active' && (
                      <button className="btn btn-lime btn-xs" style={{ fontSize: 9, padding: '2px 7px' }} onClick={ev => { ev.stopPropagation(); setConvertEnrol(e) }}>Convert →</button>
                    )}
                    {(e.is_first_class || e.classes_attended === 0 || e.total_attendance === 0) && (
                      <span style={{ fontSize: 10, color: 'var(--lime)', fontWeight: 700, marginLeft: 6 }}>FIRST TIME 🌟</span>
                    )}
                  </div>
                  <div className="att-sub">{session?.name} · {DAYS[session?.day_of_week]?.slice(0,3)} {session?.start_time?.slice(0,5)}</div>
                  {owing > 0 && (
                    <div className="att-alerts">
                      <span className="owing-badge">${Math.round(owing)} owing</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="att-action-row">
                <select
                  className={`att-status-sel att-sel-${status.replace('_', '-')}`}
                  value={status}
                  onChange={ev => setStatus(e.student, ev.target.value)}
                >
                  {STATUS_OPTS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button
                  className={`att-note-btn ${hasNote ? 'has-note' : ''}`}
                  onClick={() => { setNoteModal(e.student); setNoteText(notes[e.student] || '') }}
                  title="Add note"
                >✏️</button>
              </div>
              {(status === 'no_show') && (
                <div className="att-fee-msg">$20 no-show fee will be added</div>
              )}
              {(status === 'no_show_waived') && (
                <div className="att-fee-waived">No-show recorded — no fee charged</div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={markAllPresent}>Mark All Present</button>
        <button className={`btn btn-sm ${saved ? 'btn-ghost' : 'btn-lime'}`} onClick={handleSave} disabled={saving || !occurrence}>
          {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : saved ? '✓ Saved' : 'Save Register'}
        </button>
      </div>

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

      {/* Note modal */}
      {noteModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setNoteModal(null)}>
          <div className="modal-box">
            <div className="modal-title">
              Attendance Note
              <button className="modal-close" onClick={() => setNoteModal(null)}>✕</button>
            </div>
            <div className="field">
              <label>Note for {students.find(e => e.student === noteModal)?.student_detail?.display_name}</label>
              <textarea
                rows={3}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="e.g. Arrived 10 mins late, left early…"
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setNoteModal(null)}>Cancel</button>
              <button className="btn btn-lime btn-sm" onClick={() => {
                setNotes(n => ({ ...n, [noteModal]: noteText }))
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
