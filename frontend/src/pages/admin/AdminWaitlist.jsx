import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { enrolments, classes as classesApi, seasons as seasonsApi } from '../../api'
import client from '../../api/client'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function offerStatus(booking) {
  if (!booking.waitlist_offered_at) return null
  const offeredAt = new Date(booking.waitlist_offered_at)
  const expiresAt = booking.waitlist_expires_at ? new Date(booking.waitlist_expires_at) : null
  const now = new Date()
  const hoursAgo = Math.round((now - offeredAt) / 3600000)
  const expired = expiresAt && now > expiresAt
  if (expired) return { label: 'Offer expired', color: 'var(--red)', bg: 'rgba(255,68,68,0.1)' }
  return {
    label: `Offered ${hoursAgo}h ago — pending`,
    color: '#ffaa00',
    bg: 'rgba(255,170,0,0.1)',
  }
}

function CapacityOverrideDialog({ msg, current, capacity, onConfirm, onCancel }) {
  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="sd-modal" style={{ maxWidth: 400 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>Over Capacity</div>
          <button className="modal-close-btn" onClick={onCancel}>✕</button>
        </div>
        <div className="sd-body">
          <p style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 20 }}>
            {msg || `You'll be taking this class over capacity to ${current + 1} of ${capacity} spots. Are you sure?`}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
            <button className="btn btn-sm" style={{ background: '#ff6644', color: '#fff' }} onClick={onConfirm}>
              Promote Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Season Waitlist ──────────────────────────────────────────────────────────

function SeasonWaitlist({ seasons }) {
  const navigate = useNavigate()
  const [seasonTab, setSeasonTab] = useState(null)
  const [expandedSessions, setExpandedSessions] = useState({})
  const [waitlistData, setWaitlistData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState({})
  const [overrideDialog, setOverrideDialog] = useState(null)

  const activeSeason = seasons.find(s => s.status === 'active' && !s.archived)
  const upcomingSeasons = seasons.filter(s => s.status === 'upcoming' && !s.archived)
  const archivedSeasons = seasons.filter(s => s.archived)

  const visibleSeasons = [
    ...(activeSeason ? [activeSeason] : []),
    ...upcomingSeasons,
  ]

  useEffect(() => {
    if (!seasonTab && visibleSeasons.length > 0) {
      setSeasonTab(visibleSeasons[0].id)
    }
  }, [seasons])

  useEffect(() => {
    if (!seasonTab) return
    setLoading(true)
    const fetchSeason = seasonTab === 'archived'
      ? enrolments.list({ status: 'waitlisted', enrolment_type: 'course' })
      : enrolments.list({ status: 'waitlisted', enrolment_type: 'course' })

    fetchSeason.then(r => {
      const all = r.data?.results || r.data || []
      setWaitlistData(all)
    }).finally(() => setLoading(false))
  }, [seasonTab])

  const filtered = (waitlistData || []).filter(e => {
    const sid = e.class_session_detail?.season
    if (seasonTab === 'archived') {
      return archivedSeasons.some(s => s.id === sid)
    }
    return sid === seasonTab
  })

  // Group by class session
  const bySession = {}
  for (const e of filtered) {
    const sid = e.class_session
    if (!bySession[sid]) bySession[sid] = { session: e.class_session_detail, enrolments: [] }
    bySession[sid].enrolments.push(e)
  }

  // Sort each session's waitlist by waitlist_position then enrolled_date
  for (const sid of Object.keys(bySession)) {
    bySession[sid].enrolments.sort((a, b) => {
      const pa = a.waitlist_position ?? 999
      const pb = b.waitlist_position ?? 999
      if (pa !== pb) return pa - pb
      return new Date(a.enrolled_date) - new Date(b.enrolled_date)
    })
  }

  function toggleSession(sid) {
    setExpandedSessions(prev => ({ ...prev, [sid]: !prev[sid] }))
  }

  function moveUp(sessionId, idx) {
    const group = { ...bySession[sessionId] }
    const list = [...group.enrolments]
    if (idx === 0) return
    ;[list[idx - 1], list[idx]] = [list[idx], list[idx - 1]]
    const ordered_ids = list.map(e => e.id)
    enrolments.waitlist.reorder({ ordered_ids })
    setWaitlistData(prev => prev.map(e => {
      const pos = ordered_ids.indexOf(e.id)
      if (pos >= 0) return { ...e, waitlist_position: pos + 1 }
      return e
    }))
  }

  function moveDown(sessionId, idx) {
    const group = { ...bySession[sessionId] }
    const list = [...group.enrolments]
    if (idx === list.length - 1) return
    ;[list[idx], list[idx + 1]] = [list[idx + 1], list[idx]]
    const ordered_ids = list.map(e => e.id)
    enrolments.waitlist.reorder({ ordered_ids })
    setWaitlistData(prev => prev.map(e => {
      const pos = ordered_ids.indexOf(e.id)
      if (pos >= 0) return { ...e, waitlist_position: pos + 1 }
      return e
    }))
  }

  async function promote(e, override = false) {
    setActing(a => ({ ...a, [e.id]: 'promoting' }))
    try {
      const res = await enrolments.waitlist.promote(e.id, { override_capacity: override })
      if (res.status === 409 || res.data?.requires_override) {
        setOverrideDialog({ enrolment: e, current: res.data.current, capacity: res.data.capacity })
        return
      }
      setWaitlistData(prev => prev.filter(x => x.id !== e.id))
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.requires_override) {
        setOverrideDialog({ enrolment: e, current: err.response.data.current, capacity: err.response.data.capacity })
      }
    } finally {
      setActing(a => ({ ...a, [e.id]: null }))
    }
  }

  async function remove(e) {
    setActing(a => ({ ...a, [e.id]: 'removing' }))
    try {
      await enrolments.delete(e.id)
      setWaitlistData(prev => prev.filter(x => x.id !== e.id))
    } finally {
      setActing(a => ({ ...a, [e.id]: null }))
    }
  }

  return (
    <div>
      {overrideDialog && (
        <CapacityOverrideDialog
          current={overrideDialog.current}
          capacity={overrideDialog.capacity}
          msg={`You'll be taking this class over capacity to ${overrideDialog.current + 1} of ${overrideDialog.capacity} spots. Are you sure?`}
          onConfirm={() => { promote(overrideDialog.enrolment, true); setOverrideDialog(null) }}
          onCancel={() => setOverrideDialog(null)}
        />
      )}

      {/* Season sub-tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {visibleSeasons.map(s => (
          <button
            key={s.id}
            onClick={() => setSeasonTab(s.id)}
            style={{ background: 'none', border: 'none', borderBottom: `2px solid ${seasonTab === s.id ? 'var(--lime)' : 'transparent'}`, color: seasonTab === s.id ? 'var(--white)' : 'var(--grey)', padding: '8px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', marginBottom: -1 }}
          >
            {s.name}
            {s.status === 'active' && <span style={{ marginLeft: 5, fontSize: 9, background: 'rgba(204,255,0,0.2)', color: 'var(--lime)', padding: '1px 5px', borderRadius: 10, fontWeight: 700 }}>ACTIVE</span>}
          </button>
        ))}
        {archivedSeasons.length > 0 && (
          <button
            onClick={() => setSeasonTab('archived')}
            style={{ background: 'none', border: 'none', borderBottom: `2px solid ${seasonTab === 'archived' ? 'var(--lime)' : 'transparent'}`, color: seasonTab === 'archived' ? 'var(--white)' : 'var(--grey)', padding: '8px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', marginBottom: -1 }}
          >
            Archived
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : Object.keys(bySession).length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
          <div>No season waitlists for this season</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(bySession).map(([sid, { session, enrolments: list }]) => {
            const isOpen = expandedSessions[sid]
            const sess = session || {}
            return (
              <div key={sid} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {/* Session header */}
                <div
                  onClick={() => toggleSession(sid)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', gap: 12 }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{sess.name || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>
                      {sess.day_of_week !== undefined ? DAYS[sess.day_of_week] : '—'} {sess.start_time?.slice(0, 5)}
                      {sess.instructor_detail?.display_name && ` · ${sess.instructor_detail.display_name}`}
                      {sess.studio_detail?.name && ` · ${sess.studio_detail.name}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)' }}>{list.length} waiting</span>
                    <span style={{ fontSize: 12, color: 'var(--grey)' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded student list */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {/* Header row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 120px 110px 140px', gap: 8, padding: '8px 16px', background: '#111', borderBottom: '1px solid var(--border)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>
                      <div></div>
                      <div>Student</div>
                      <div>Classes This Season</div>
                      <div>Date Added</div>
                      <div>Actions</div>
                    </div>
                    {list.map((e, idx) => {
                      const st = e.student_detail
                      const busy = acting[e.id]
                      return (
                        <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 120px 110px 140px', gap: 8, padding: '12px 16px', borderBottom: idx < list.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                          {/* Reorder arrows */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <button
                              className="btn btn-ghost btn-xs"
                              style={{ padding: '1px 4px', fontSize: 10, lineHeight: 1, opacity: idx === 0 ? 0.3 : 1 }}
                              onClick={() => moveUp(sid, idx)}
                              disabled={idx === 0}
                            >▲</button>
                            <button
                              className="btn btn-ghost btn-xs"
                              style={{ padding: '1px 4px', fontSize: 10, lineHeight: 1, opacity: idx === list.length - 1 ? 0.3 : 1 }}
                              onClick={() => moveDown(sid, idx)}
                              disabled={idx === list.length - 1}
                            >▼</button>
                          </div>

                          {/* Student */}
                          <div>
                            <div
                              style={{ fontWeight: 600, fontSize: 13, color: 'var(--lime)', cursor: 'pointer' }}
                              onClick={() => navigate(`/admin/students/${e.student}`)}
                            >
                              #{idx + 1} {st?.display_name || `Student ${e.student}`}
                            </div>
                            {st?.email && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{st.email}</div>}
                          </div>

                          {/* Classes this season */}
                          <div style={{ fontSize: 12, color: 'var(--grey)', textAlign: 'center' }}>
                            {e.season_enrolment_count != null
                              ? <span style={{ color: 'var(--white)' }}>{e.season_enrolment_count} class{e.season_enrolment_count !== 1 ? 'es' : ''}</span>
                              : '—'}
                          </div>

                          {/* Date added */}
                          <div style={{ fontSize: 11, color: 'var(--grey)' }}>
                            {e.enrolled_date ? new Date(e.enrolled_date + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-lime btn-xs"
                              disabled={!!busy}
                              onClick={() => promote(e)}
                            >
                              {busy === 'promoting' ? '…' : 'Promote'}
                            </button>
                            <button
                              className="btn btn-ghost btn-xs"
                              style={{ color: 'var(--red)' }}
                              disabled={!!busy}
                              onClick={() => remove(e)}
                            >
                              {busy === 'removing' ? '…' : 'Remove'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Casual / Catchup / Trial Waitlist ───────────────────────────────────────

const TYPE_LABELS = { casual: 'Casual', catchup: 'Catch-up', classpass: 'Class Pass', trial: 'Trial' }
const TYPE_COLORS = { casual: 'tag-lav', catchup: 'tag-amber', classpass: 'tag-grey', trial: 'tag-lime' }

function CasualWaitlist() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedOccs, setExpandedOccs] = useState({})
  const [acting, setActing] = useState({})
  const [overrideDialog, setOverrideDialog] = useState(null)

  function load() {
    setLoading(true)
    enrolments.waitlist.casualList().then(r => {
      setData(r.data || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function toggleOcc(key) {
    setExpandedOccs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function promote(booking, override = false) {
    setActing(a => ({ ...a, [booking.id]: 'promoting' }))
    try {
      await enrolments.waitlist.casualPromote(booking.id, { override_capacity: override })
      setData(prev => prev.filter(b => b.id !== booking.id))
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.requires_override) {
        setOverrideDialog({ booking, current: err.response.data.current, capacity: err.response.data.capacity })
      }
    } finally {
      setActing(a => ({ ...a, [booking.id]: null }))
    }
  }

  async function removeCasual(booking) {
    setActing(a => ({ ...a, [booking.id]: 'removing' }))
    try {
      await client.post(`/api/classes/occurrences/${booking.occurrence_id}/casual-cancel/`)
      setData(prev => prev.filter(b => b.id !== booking.id))
    } finally {
      setActing(a => ({ ...a, [booking.id]: null }))
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>

  const allBookings = data || []

  if (allBookings.length === 0) return (
    <div className="empty-state">
      <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
      <div>No casual, catch-up or trial students waiting</div>
    </div>
  )

  // Group by date
  const byDate = {}
  for (const b of allBookings) {
    const d = b.occurrence_date
    if (!byDate[d]) byDate[d] = {}
    const occKey = `${b.occurrence_id}`
    if (!byDate[d][occKey]) byDate[d][occKey] = { booking: b, list: [] }
    byDate[d][occKey].list.push(b)
  }

  const sortedDates = Object.keys(byDate).sort()

  return (
    <div>
      {overrideDialog && (
        <CapacityOverrideDialog
          current={overrideDialog.current}
          capacity={overrideDialog.capacity}
          msg={`You'll be taking this class over capacity to ${overrideDialog.current + 1} of ${overrideDialog.capacity} spots. Are you sure?`}
          onConfirm={() => { promote(overrideDialog.booking, true); setOverrideDialog(null) }}
          onCancel={() => setOverrideDialog(null)}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {sortedDates.map(dateStr => {
          const dateObj = new Date(dateStr + 'T00:00')
          const dateLabel = dateObj.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
          const occs = byDate[dateStr]

          return (
            <div key={dateStr}>
              {/* Date header */}
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, color: 'var(--lime)', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                {dateLabel}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(occs).map(([occKey, { booking: sample, list }]) => {
                  const isOpen = expandedOccs[occKey]
                  const enrolled = sample.confirmed_count
                  const capacity = sample.session_capacity

                  return (
                    <div key={occKey} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      {/* Occurrence header */}
                      <div
                        onClick={() => toggleOcc(occKey)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', gap: 12 }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {sample.start_time} {sample.session_name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>
                            {sample.instructor_name && `${sample.instructor_name} · `}{sample.studio_name}
                            <span style={{ marginLeft: 8, color: enrolled >= capacity ? 'var(--red)' : 'var(--grey)' }}>
                              {enrolled}/{capacity} confirmed
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)' }}>{list.length} waiting</span>
                          <span style={{ fontSize: 12, color: 'var(--grey)' }}>{isOpen ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {/* Expanded booking list */}
                      {isOpen && (
                        <div style={{ borderTop: '1px solid var(--border)' }}>
                          {/* Header */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 1fr 150px', gap: 8, padding: '8px 16px', background: '#111', borderBottom: '1px solid var(--border)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>
                            <div>Student</div>
                            <div>Type</div>
                            <div>Date Added</div>
                            <div>Offer Status</div>
                            <div>Actions</div>
                          </div>
                          {list.map((b, idx) => {
                            const offer = offerStatus(b)
                            const busy = acting[b.id]
                            return (
                              <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 1fr 150px', gap: 8, padding: '12px 16px', borderBottom: idx < list.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                                {/* Student */}
                                <div>
                                  <div
                                    style={{ fontWeight: 600, fontSize: 13, color: 'var(--lime)', cursor: 'pointer' }}
                                    onClick={() => navigate(`/admin/students/${b.student_id}`)}
                                  >
                                    {b.student_name}
                                  </div>
                                  {b.student_email && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{b.student_email}</div>}
                                </div>

                                {/* Type */}
                                <div>
                                  <span className={`tag ${TYPE_COLORS[b.enrolment_type] || 'tag-grey'}`} style={{ fontSize: 10 }}>
                                    {TYPE_LABELS[b.enrolment_type] || b.enrolment_type}
                                  </span>
                                </div>

                                {/* Date added */}
                                <div style={{ fontSize: 11, color: 'var(--grey)' }}>
                                  {b.created_at ? new Date(b.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}
                                </div>

                                {/* Offer status */}
                                <div>
                                  {offer ? (
                                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: offer.bg, color: offer.color, border: `1px solid ${offer.color}44` }}>
                                      {offer.label}
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: 11, color: 'var(--grey)' }}>No offer sent</span>
                                  )}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    className="btn btn-lime btn-xs"
                                    disabled={!!busy}
                                    onClick={() => promote(b)}
                                  >
                                    {busy === 'promoting' ? '…' : 'Promote'}
                                  </button>
                                  <button
                                    className="btn btn-ghost btn-xs"
                                    style={{ color: 'var(--red)' }}
                                    disabled={!!busy}
                                    onClick={() => removeCasual(b)}
                                  >
                                    {busy === 'removing' ? '…' : 'Remove'}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminWaitlist() {
  const [tab, setTab] = useState('season')
  const { data: seasonsData, loading: loadingSeasons } = useApi(() => seasonsApi.list(), [])
  const { data: enrolData, loading: loadingEnrols } = useApi(() => enrolments.list({ status: 'waitlisted', enrolment_type: 'course' }), [])

  const seasons = (seasonsData?.results || seasonsData || []).filter(s => !s.archived || tab === 'season')
  const seasonWaitlisted = enrolData?.results || enrolData || []

  const totalSeason = seasonWaitlisted.length

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Waitlist</div>
          <div className="page-sub">Manage class waitlists by type</div>
        </div>
      </div>

      {/* Top tabs */}
      <div className="subtabs" style={{ marginBottom: 24 }}>
        <div className={`subtab ${tab === 'season' ? 'active' : ''}`} onClick={() => setTab('season')}>
          Season Enrolments
          {totalSeason > 0 && <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(255,170,0,0.2)', color: '#ffaa00', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>{totalSeason}</span>}
        </div>
        <div className={`subtab ${tab === 'casual' ? 'active' : ''}`} onClick={() => setTab('casual')}>
          Casual / Catch-up / Trial
        </div>
      </div>

      {tab === 'season' && (
        loadingSeasons ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
        ) : (
          <SeasonWaitlist seasons={seasonsData?.results || seasonsData || []} />
        )
      )}

      {tab === 'casual' && <CasualWaitlist />}
    </div>
  )
}
