import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { classes } from '../../api'
import { fmt12 } from '../../utils/time'

const PRICE_TIERS = [0, 270, 440, 580, 700, 800, 900]

function ordinal(n) {
  if (!n) return '—'
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function incrementalPrice(count) {
  if (!count || count <= 0) return null
  const idx = Math.min(count, PRICE_TIERS.length - 1)
  return PRICE_TIERS[idx] - PRICE_TIERS[idx - 1]
}

function FlagBadge({ label, color = '#444', textColor = '#fff' }) {
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 10,
      fontWeight: 700,
      padding: '2px 7px',
      borderRadius: 4,
      background: color,
      color: textColor,
      letterSpacing: '0.04em',
      marginRight: 4,
      marginBottom: 2,
    }}>
      {label}
    </span>
  )
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function AdminClassEnrolments() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('enrolled')

  useEffect(() => {
    classes.seasonEnrolments(id).then(r => {
      setData(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>
  }

  if (!data) {
    return <div style={{ padding: 40, color: 'var(--grey)' }}>Failed to load enrolment data.</div>
  }

  const { session, enrolled, waitlist, transfers } = data
  const transfersIn  = transfers.filter(t => t.direction === 'in')
  const transfersOut = transfers.filter(t => t.direction === 'out')

  const tabs = [
    { key: 'enrolled',   label: `Enrolled (${enrolled.length})` },
    { key: 'waitlist',   label: `Waitlist (${waitlist.length})` },
    { key: 'transfers',  label: `Transfers (${transfers.length})` },
  ]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', color: 'var(--grey)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
          >←</button>
          <div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: 'var(--white)' }}>
              {session.name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {session.day_of_week && <span>{session.day_of_week}</span>}
              {session.start_time && <span>{fmt12(session.start_time)}</span>}
              {session.instructor && <span>{session.instructor}</span>}
              {session.studio && <span>{session.studio}</span>}
              {session.season && <span style={{ color: 'var(--lime)' }}>{session.season}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: enrolled.length >= session.capacity ? '#ff6b6b' : 'var(--lime)' }}>
            {enrolled.length}/{session.capacity}
          </span>
          <Link to={`/admin/classes/${id}`}>
            <button className="btn btn-ghost btn-sm">Edit Class</button>
          </Link>
          <Link to={`/admin/classes/${id}/attendance`}>
            <button className="btn btn-ghost btn-sm">Attendance Register</button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--lime)' : '2px solid transparent',
              color: tab === t.key ? 'var(--white)' : 'var(--grey)',
              fontWeight: tab === t.key ? 700 : 400,
              padding: '10px 18px',
              fontSize: 13,
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Enrolled Tab */}
      {tab === 'enrolled' && (
        <div className="tbl-section">
          {enrolled.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--grey)', fontSize: 13 }}>
              No enrolled students.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Level</th>
                  <th>Enrolled</th>
                  <th>Class # in season</th>
                  <th>Price paid</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {enrolled.map(e => (
                  <tr key={e.id}>
                    <td>
                      <Link to={`/admin/students/${e.student_id}`} style={{ color: 'var(--white)', fontWeight: 600, textDecoration: 'none' }}>
                        {e.student_name}
                      </Link>
                    </td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                      {e.student_level || '—'}
                    </td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                      {e.enrolled_date ? new Date(e.enrolled_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {e.season_enrolment_count
                        ? <span style={{ color: 'var(--lime)' }}>{ordinal(e.season_enrolment_count)} class</span>
                        : '—'}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {e.incremental_price != null
                        ? <span style={{ color: 'var(--white)' }}>${e.incremental_price}</span>
                        : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {e.is_new_to_duality && <FlagBadge label="New to Duality" color="#1a3a1a" textColor="#ccff00" />}
                        {e.is_first_visit && <FlagBadge label="First visit" color="#1a2a3a" textColor="#88ccff" />}
                        {e.level_override && <FlagBadge label="Bypassed level warning" color="#3a2a00" textColor="#ffcc44" />}
                        {e.flag_dismissed && <FlagBadge label="Flag dismissed" color="#2a1a1a" textColor="#ff8888" />}
                        {!e.is_new_to_duality && !e.is_first_visit && !e.level_override && !e.flag_dismissed && (
                          <span style={{ color: 'var(--grey)', fontSize: 12 }}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Waitlist Tab */}
      {tab === 'waitlist' && (
        <div className="tbl-section">
          {waitlist.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--grey)', fontSize: 13 }}>
              Nobody on the waitlist.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Level</th>
                  <th>Joined waitlist</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.map(e => (
                  <tr key={e.id}>
                    <td style={{ color: 'var(--amber)', fontWeight: 700 }}>
                      {e.waitlist_position ?? '—'}
                    </td>
                    <td>
                      <Link to={`/admin/students/${e.student_id}`} style={{ color: 'var(--white)', fontWeight: 600, textDecoration: 'none' }}>
                        {e.student_name}
                      </Link>
                    </td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                      {e.student_level || '—'}
                    </td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                      {e.enrolled_date ? new Date(e.enrolled_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Transfers Tab */}
      {tab === 'transfers' && (
        <div>
          {transfers.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--grey)', fontSize: 13 }}>
              No transfer requests for this class.
            </div>
          ) : (
            <>
              {transfersIn.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--lime)', marginBottom: 12 }}>
                    Transferring In ({transfersIn.length})
                  </div>
                  <div className="tbl-section">
                    <table>
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>From</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transfersIn.map(t => (
                          <tr key={t.id}>
                            <td>
                              <Link to={`/admin/students/${t.student_id}`} style={{ color: 'var(--white)', fontWeight: 600, textDecoration: 'none' }}>
                                {t.student_name}
                              </Link>
                            </td>
                            <td style={{ color: 'var(--grey)', fontSize: 12 }}>{t.from_class || '—'}</td>
                            <td><StatusBadge status={t.status} /></td>
                            <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                              {t.created_at ? new Date(t.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}
                            </td>
                            <td style={{ color: 'var(--grey)', fontSize: 12, maxWidth: 200 }}>{t.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {transfersOut.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--lav)', marginBottom: 12 }}>
                    Transferring Out ({transfersOut.length})
                  </div>
                  <div className="tbl-section">
                    <table>
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>To</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transfersOut.map(t => (
                          <tr key={t.id}>
                            <td>
                              <Link to={`/admin/students/${t.student_id}`} style={{ color: 'var(--white)', fontWeight: 600, textDecoration: 'none' }}>
                                {t.student_name}
                              </Link>
                            </td>
                            <td style={{ color: 'var(--grey)', fontSize: 12 }}>{t.to_class || '—'}</td>
                            <td><StatusBadge status={t.status} /></td>
                            <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                              {t.created_at ? new Date(t.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}
                            </td>
                            <td style={{ color: 'var(--grey)', fontSize: 12, maxWidth: 200 }}>{t.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    pending:            { label: 'Pending',           bg: '#2a2a00', color: '#ffcc44' },
    awaiting_response:  { label: 'Awaiting response', bg: '#1a2a3a', color: '#88ccff' },
    approved:           { label: 'Approved',          bg: '#1a3a1a', color: '#ccff00' },
    rejected:           { label: 'Rejected',          bg: '#3a1a1a', color: '#ff8888' },
  }
  const s = map[status] || { label: status, bg: '#222', color: '#888' }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}
