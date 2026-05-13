import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { classes, enrolments, attendance } from '../api'
import './AttendancePage.css'

const STATUSES = [
  { value: 'present',   label: 'Present',   color: 'var(--lime)' },
  { value: 'late',      label: 'Late',       color: 'var(--amber)' },
  { value: 'absent',    label: 'Absent',     color: 'var(--grey)' },
  { value: 'no_show',   label: 'No-show',    color: 'var(--red)' },
  { value: 'cancelled', label: 'Cancelled',  color: 'var(--grey)' },
]

const AVATAR_COLORS = ['#b0a0ff', '#ccff00', '#ffaa00', '#ff88aa', '#44ffcc', '#ffcc88', '#b0f0b0']

function avatarColor(name) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

export default function AttendancePage() {
  const { id } = useParams()
  const [session, setSession] = useState(null)
  const [occurrence, setOccurrence] = useState(null)
  const [students, setStudents] = useState([])
  const [register, setRegister] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

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

        if (occ) {
          const attRes = await attendance.list({ occurrence: occ.id })
          const attMap = {}
          for (const r of (attRes.data.results || [])) {
            attMap[r.student] = r.status
          }
          const initial = {}
          for (const e of enrolled) {
            initial[e.student] = attMap[e.student] || 'present'
          }
          setRegister(initial)
        } else {
          const initial = {}
          for (const e of enrolled) initial[e.student] = 'present'
          setRegister(initial)
        }
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

  async function handleSave() {
    if (!occurrence) return
    setSaving(true)
    try {
      const records = students.map(e => ({
        student: e.student,
        status: register[e.student] || 'present',
        no_show_fee_charged: register[e.student] === 'no_show',
      }))
      await attendance.bulkSave(occurrence.id, records)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const counts = STATUSES.reduce((acc, s) => {
    acc[s.value] = Object.values(register).filter(v => v === s.value).length
    return acc
  }, {})

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/classes" style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 4 }}>
            ← Classes
          </Link>
          <div className="page-title">
            {session?.name} · {session?.studio_detail?.name}
          </div>
          <div className="page-sub">
            {occurrence
              ? new Date(occurrence.date + 'T00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
              : 'No upcoming occurrence'}
          </div>
        </div>
        <button
          className={`btn ${saved ? 'btn-ghost' : 'btn-lime'}`}
          onClick={handleSave}
          disabled={saving || !occurrence}
        >
          {saving ? <span className="spinner" /> : saved ? '✓ Saved' : 'Save Register'}
        </button>
      </div>

      <div className="att-stats">
        {STATUSES.map(s => (
          <div key={s.value} className="att-stat">
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: s.color }}>{counts[s.value] || 0}</div>
            <div style={{ fontSize: 10, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {students.length === 0 ? (
        <div className="empty-state">No students enrolled</div>
      ) : (
        <div className="list-card">
          {students.map(e => {
            const st = e.student_detail
            const status = register[e.student] || 'present'
            const statusColor = STATUSES.find(s => s.value === status)?.color || 'var(--grey)'
            return (
              <div key={e.student} className="att-row">
                <div className="avatar" style={{ background: avatarColor(st?.display_name || '?') }}>
                  {st?.first_name?.[0] || '?'}
                </div>
                <div className="list-body">
                  <div className="list-title">{st?.display_name}</div>
                  {st?.pronouns && <div className="list-sub">{st.pronouns}</div>}
                </div>
                <div className="att-status-wrap">
                  {STATUSES.map(s => (
                    <button
                      key={s.value}
                      className={`att-status-btn ${status === s.value ? 'active' : ''}`}
                      style={{ '--active-color': s.color }}
                      onClick={() => setStatus(e.student, s.value)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
