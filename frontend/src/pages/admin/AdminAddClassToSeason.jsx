import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { classes as classesApi, categories as categoriesApi, studios as studiosApi, users as usersApi, seasons as seasonsApi } from '../../api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const inputStyle = {
  width: '100%',
  background: '#1a1a1a',
  border: '1px solid #222',
  borderRadius: 8,
  color: '#fff',
  padding: '9px 12px',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#888',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const sectionCard = {
  background: '#111',
  border: '1px solid #222',
  borderRadius: 12,
  padding: '20px 24px',
  marginBottom: 24,
}

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: value ? 'var(--lime, #ccff00)' : '#333',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 3,
        left: value ? 19 : 3,
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: '#000',
        transition: 'left 0.2s',
      }} />
    </div>
  )
}

function TagChipSelector({ selectedIds, onChange }) {
  const [allTags, setAllTags] = useState([])
  const [newTagName, setNewTagName] = useState('')
  const [addingTag, setAddingTag] = useState(false)

  function loadTags() {
    classesApi.classTags.list().then(r => setAllTags(r.data?.results || r.data || []))
  }
  useEffect(() => { loadTags() }, [])

  function toggle(id) {
    if (selectedIds.includes(id)) onChange(selectedIds.filter(x => x !== id))
    else onChange([...selectedIds, id])
  }

  async function handleAddTag() {
    if (!newTagName.trim()) return
    setAddingTag(true)
    try {
      const r = await classesApi.classTags.create({ name: newTagName.trim(), colour: '#ccff00' })
      loadTags()
      onChange([...selectedIds, r.data.id])
      setNewTagName('')
    } finally { setAddingTag(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {allTags.map(tag => {
          const active = selectedIds.includes(tag.id)
          return (
            <div
              key={tag.id}
              onClick={() => toggle(tag.id)}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', userSelect: 'none',
                background: active ? (tag.colour + '33') : 'transparent',
                color: active ? tag.colour : '#888',
                border: `1px solid ${active ? tag.colour : '#333'}`,
                transition: 'all 0.15s',
              }}
            >
              {tag.name}
            </div>
          )
        })}
        {allTags.length === 0 && <div style={{ fontSize: 12, color: '#888' }}>No tags yet — add one below.</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={newTagName}
          onChange={e => setNewTagName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
          placeholder="New tag name…"
          style={{ ...inputStyle, width: 180 }}
        />
        <button
          type="button"
          onClick={handleAddTag}
          disabled={!newTagName.trim() || addingTag}
          style={{ background: 'rgba(204,255,0,0.1)', border: '1px solid rgba(204,255,0,0.3)', color: '#ccff00', borderRadius: 8, padding: '9px 14px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          {addingTag ? '…' : '+ Add tag'}
        </button>
      </div>
    </div>
  )
}

function emptyOccurrence() {
  return {
    courseType: 'full',
    startWeek: 1,
    numWeeks: 8,
    dayOfWeek: 0,
    startTime: '18:00',
    durationMinutes: 55,
    capacity: 12,
    instructor: '',
    studio: '',
    priceOverride: '',
    instructorFee: '',
    requiresFullPayment: false,
    exemptFromSeasonDiscount: false,
  }
}

function formatTime12h(time24) {
  if (!time24) return ''
  const [hStr, mStr] = time24.split(':')
  const h = parseInt(hStr)
  const m = mStr || '00'
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return `${h12}:${m}${ampm}`
}

function OccurrenceBlock({ index, data, onChange, onRemove, studios, instructors, isFirst }) {
  function set(field, val) {
    onChange({ ...data, [field]: val })
  }

  function handleStudioChange(studioId) {
    const studio = studios.find(s => String(s.id) === String(studioId))
    const capacity = studio?.poles ? parseInt(studio.poles) : (studio?.capacity ? parseInt(studio.capacity) : data.capacity)
    onChange({ ...data, studio: studioId, capacity: isNaN(capacity) ? data.capacity : capacity })
  }

  const pillBase = {
    padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
  }
  const pillActive = { ...pillBase, background: '#ccff00', color: '#000', borderColor: '#ccff00' }
  const pillInactive = { ...pillBase, background: '#1a1a1a', color: '#888', borderColor: '#333' }

  return (
    <div style={{ ...sectionCard, position: 'relative' }}>
      {!isFirst && (
        <button
          type="button"
          onClick={onRemove}
          style={{
            position: 'absolute', top: 14, right: 16,
            background: 'none', border: 'none', color: 'var(--red, #ff4444)',
            cursor: 'pointer', fontSize: 13, fontWeight: 700,
          }}
        >✕ Remove</button>
      )}

      {/* Course type */}
      <div style={{ marginBottom: 18 }}>
        <div style={labelStyle}>Course Type</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={data.courseType === 'full' ? pillActive : pillInactive} onClick={() => set('courseType', 'full')}>
            Full Course
          </button>
          <button type="button" style={data.courseType === 'short' ? pillActive : pillInactive} onClick={() => set('courseType', 'short')}>
            Short Course
          </button>
        </div>
        {data.courseType === 'short' && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Starting Week (1–8)</label>
                <input
                  type="number" min={1} max={8} value={data.startWeek}
                  onChange={e => set('startWeek', parseInt(e.target.value) || 1)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Number of Weeks (1–8)</label>
                <input
                  type="number" min={1} max={8} value={data.numWeeks}
                  onChange={e => set('numWeeks', parseInt(e.target.value) || 1)}
                  style={inputStyle}
                />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={data.exemptFromSeasonDiscount}
                onChange={e => set('exemptFromSeasonDiscount', e.target.checked)}
                style={{ accentColor: '#ccff00' }}
              />
              <span style={{ fontSize: 13, color: '#ccc' }}>Exempt from discount structure</span>
              <span style={{ fontSize: 11, color: '#888' }}>(short course priced separately, not counted in multi-class discounts)</span>
            </label>
          </div>
        )}
      </div>

      {/* Schedule grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Day of Week</label>
          <select value={data.dayOfWeek} onChange={e => set('dayOfWeek', parseInt(e.target.value))} style={inputStyle}>
            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Start Time</label>
          <input type="time" value={data.startTime} onChange={e => set('startTime', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Duration (mins)</label>
          <input type="number" min={1} value={data.durationMinutes} onChange={e => set('durationMinutes', parseInt(e.target.value) || 55)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Capacity</label>
          <input type="number" min={1} value={data.capacity} onChange={e => set('capacity', parseInt(e.target.value) || 12)} style={inputStyle} />
        </div>
      </div>

      {/* Instructor & Room */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Instructor</label>
          <select value={data.instructor} onChange={e => set('instructor', e.target.value)} style={inputStyle}>
            <option value="">— No instructor —</option>
            {instructors.map(i => <option key={i.id} value={i.id}>{i.display_name || i.first_name + ' ' + i.last_name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Studio / Room</label>
          <select value={data.studio} onChange={e => handleStudioChange(e.target.value)} style={inputStyle}>
            <option value="">— No studio —</option>
            {studios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Price Override ($)</label>
          <input
            type="number" min={0} step="0.01"
            value={data.priceOverride}
            onChange={e => set('priceOverride', e.target.value)}
            placeholder="Leave blank for standard ($270)"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Instructor Fee (per class, $)</label>
          <input
            type="number" min={0} step="0.01"
            value={data.instructorFee}
            onChange={e => set('instructorFee', e.target.value)}
            placeholder="e.g. 40"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Require full payment */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Toggle value={data.requiresFullPayment} onChange={v => set('requiresFullPayment', v)} />
        <span style={{ fontSize: 13, color: '#ccc' }}>Require full upfront payment</span>
      </div>
    </div>
  )
}

function emptyDetails() {
  return {
    name: '',
    sessionType: 'course',
    level: '',
    category: '',
    catchupCutoffWeeks: '',
    skillLevel: '',
    prerequisites: '',
    autoExemptSameName: true,
    catchupEligibleNames: '',
    tags: [],
    description: '',
    firstTimerHeadline: '',
    firstTimerBody: '',
  }
}

function Step1({ occurrences, setOccurrences, template, setTemplate, firstTimerAppropriate, setFirstTimerAppropriate, onNext, allSessions, studios, instructors }) {
  function updateOccurrence(i, val) {
    setOccurrences(prev => prev.map((o, idx) => idx === i ? val : o))
  }
  function removeOccurrence(i) {
    setOccurrences(prev => prev.filter((_, idx) => idx !== i))
  }
  function addOccurrence() {
    setOccurrences(prev => [...prev, emptyOccurrence()])
  }

  // Unique class names for template dropdown (sorted)
  const uniqueNames = [...new Set(allSessions.map(s => s.name))].sort()

  return (
    <div>
      {/* Template selector */}
      <div style={{ ...sectionCard }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: 12 }}>
          Auto-populate from existing class style (optional)
        </div>
        <select
          value={template ? template.id : ''}
          onChange={e => {
            const found = allSessions.find(s => String(s.id) === e.target.value)
            setTemplate(found || null)
          }}
          style={inputStyle}
        >
          <option value="">— Select a class style to pre-fill details —</option>
          {uniqueNames.map(name => {
            const s = allSessions.find(x => x.name === name)
            return <option key={s.id} value={s.id}>{name}</option>
          })}
        </select>
        {template && (
          <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
            Will pre-fill class details from <strong style={{ color: '#ccc' }}>{template.name}</strong>
          </div>
        )}
      </div>

      {/* Occurrence blocks */}
      {occurrences.map((occ, i) => (
        <OccurrenceBlock
          key={i}
          index={i}
          data={occ}
          onChange={val => updateOccurrence(i, val)}
          onRemove={() => removeOccurrence(i)}
          studios={studios}
          instructors={instructors}
          isFirst={i === 0}
        />
      ))}

      <button
        type="button"
        onClick={addOccurrence}
        style={{
          background: 'none', border: '1px solid #333', borderRadius: 8, color: '#ccff00',
          padding: '9px 18px', fontSize: 13, cursor: 'pointer', marginBottom: 24, width: '100%',
        }}
      >
        + Add another occurrence
      </button>

      {/* First-timer appropriate toggle (applies to all) */}
      <div style={{ ...sectionCard, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Toggle value={firstTimerAppropriate} onChange={setFirstTimerAppropriate} />
        <div>
          <div style={{ fontSize: 13, color: '#ccc', fontWeight: 600 }}>First-timer appropriate</div>
          <div style={{ fontSize: 12, color: '#888' }}>Mark this class as suitable for absolute first timers</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-lime"
          onClick={onNext}
        >
          Next →
        </button>
      </div>
    </div>
  )
}

function Step2({ details, setDetails, template, onBack, onNext, categories }) {
  function set(field, val) {
    setDetails(d => ({ ...d, [field]: val }))
  }

  return (
    <div>
      {/* Basic info */}
      <div style={sectionCard}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: 16 }}>
          Class Details
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input
              type="text"
              value={details.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Level 2"
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Class Type</label>
            <select value={details.sessionType} onChange={e => set('sessionType', e.target.value)} style={inputStyle}>
              <option value="course">Course</option>
              <option value="casual">Drop-In</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Level</label>
            <input
              type="text"
              value={details.level}
              onChange={e => set('level', e.target.value)}
              placeholder="e.g. Level 2"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={details.category} onChange={e => set('category', e.target.value)} style={inputStyle}>
              <option value="">— No category —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Catch-up Cutoff Weeks</label>
            <input
              type="number" min={1} max={8}
              value={details.catchupCutoffWeeks}
              onChange={e => set('catchupCutoffWeeks', e.target.value)}
              placeholder="Leave blank for any week"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Skill Level</label>
            <input
              type="text"
              value={details.skillLevel}
              onChange={e => set('skillLevel', e.target.value)}
              placeholder="e.g. Intermediate"
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Prerequisites</label>
          <textarea
            value={details.prerequisites}
            onChange={e => set('prerequisites', e.target.value)}
            rows={3}
            placeholder="What students need to know or be able to do"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={details.description}
            onChange={e => set('description', e.target.value)}
            rows={4}
            placeholder="Class description"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
      </div>

      {/* Catch-up settings */}
      <div style={sectionCard}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: 16 }}>
          Catch-up Settings
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Toggle value={details.autoExemptSameName} onChange={v => set('autoExemptSameName', v)} />
          <div>
            <div style={{ fontSize: 13, color: '#ccc', fontWeight: 600 }}>Auto-exempt same name</div>
            <div style={{ fontSize: 12, color: '#888' }}>Students enrolled in a same-name session are auto-exempt from catch-up cutoff</div>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Catch-up Eligible Classes (comma-separated names)</label>
          <input
            type="text"
            value={details.catchupEligibleNames}
            onChange={e => set('catchupEligibleNames', e.target.value)}
            placeholder="e.g. Level 1, Level 2"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Tags */}
      <div style={sectionCard}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: 12 }}>
          Tags
        </div>
        <TagChipSelector selectedIds={details.tags} onChange={v => set('tags', v)} />
      </div>

      {/* First-timer info */}
      <div style={sectionCard}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: 16 }}>
          First-timer Info
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Headline</label>
          <input
            type="text"
            value={details.firstTimerHeadline}
            onChange={e => set('firstTimerHeadline', e.target.value)}
            placeholder="Short headline for first-time students"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Body</label>
          <textarea
            value={details.firstTimerBody}
            onChange={e => set('firstTimerBody', e.target.value)}
            rows={5}
            placeholder="Detailed info for first-time students"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Back</button>
        <button
          type="button"
          className="btn btn-lime"
          onClick={onNext}
          disabled={!details.name.trim()}
        >
          Next →
        </button>
      </div>
    </div>
  )
}

function Step3({ occurrences, details, firstTimerAppropriate, studios, instructors, season, onBack, onConfirm, creating, error }) {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  function getCourseLabel(occ) {
    if (occ.courseType === 'full') return `Full Course · Weeks 1–8`
    const sw = occ.startWeek
    const ew = Math.min(8, sw + occ.numWeeks - 1)
    return `Short Course · Weeks ${sw}–${ew}`
  }

  function getPriceLabel(occ) {
    if (occ.priceOverride) return `$${parseFloat(occ.priceOverride).toFixed(0)}`
    return 'Standard ($270)'
  }

  function getInstructorName(id) {
    const found = instructors.find(i => String(i.id) === String(id))
    return found ? (found.display_name || found.first_name + ' ' + found.last_name) : '—'
  }

  function getStudioName(id) {
    const found = studios.find(s => String(s.id) === String(id))
    return found ? found.name : '—'
  }

  function formatSeasonDates() {
    if (!season) return ''
    const fmt = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
    return `${fmt(season.start_date)} – ${fmt(season.end_date)}`
  }

  return (
    <div>
      {error && (
        <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff4444', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Occurrence summaries */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: 14 }}>
          Occurrences to Create ({occurrences.length})
        </div>
        {occurrences.map((occ, i) => (
          <div key={i} style={{ ...sectionCard, marginBottom: 14, borderLeft: '3px solid #ccff00' }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17, marginBottom: 6 }}>
              {details.name || 'Unnamed class'}
            </div>
            {season && (
              <div style={{ fontSize: 12, color: '#ccff00', marginBottom: 6 }}>
                {season.name} · {formatSeasonDates()}
              </div>
            )}
            <div style={{ fontSize: 13, color: '#ddd', marginBottom: 4 }}>
              {DAYS[occ.dayOfWeek]} · {formatTime12h(occ.startTime)} · {occ.durationMinutes} min
            </div>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>
              Instructor: {getInstructorName(occ.instructor)} · Studio: {getStudioName(occ.studio)}
            </div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
              {getCourseLabel(occ)} · Capacity: {occ.capacity}
            </div>
            <div style={{ fontSize: 12, color: '#888', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span>Price: {getPriceLabel(occ)}</span>
              {occ.requiresFullPayment && <span style={{ color: '#ccff00' }}>Full payment required</span>}
              {occ.exemptFromSeasonDiscount && <span style={{ color: 'var(--amber, #ffaa00)' }}>Exempt from discount structure</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Class details summary */}
      <div style={sectionCard}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: 12 }}>
          Class Details Summary
        </div>
        <div style={{ fontSize: 13, color: '#ccc', marginBottom: 6 }}>
          <strong>Type:</strong> {details.sessionType === 'course' ? 'Course' : 'Drop-In'}
          {details.level && <span style={{ marginLeft: 12 }}><strong>Level:</strong> {details.level}</span>}
        </div>
        {details.description && (
          <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>
            {details.description.length > 120 ? details.description.slice(0, 120) + '…' : details.description}
          </div>
        )}
        {details.catchupCutoffWeeks && (
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
            Catch-up cutoff: Week {details.catchupCutoffWeeks}
          </div>
        )}
        {details.tags.length > 0 && (
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
            Tags: {details.tags.length} selected
          </div>
        )}
        <div style={{ fontSize: 12, color: '#888' }}>
          First-timer appropriate: {firstTimerAppropriate ? 'Yes' : 'No'}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button type="button" className="btn btn-ghost" onClick={onBack} disabled={creating}>← Back</button>
        <button
          type="button"
          className="btn btn-lime"
          onClick={onConfirm}
          disabled={creating}
        >
          {creating ? 'Creating…' : 'Confirm & Create'}
        </button>
      </div>
    </div>
  )
}

export default function AdminAddClassToSeason() {
  const { id: seasonId } = useParams()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [template, setTemplate] = useState(null)
  const [occurrences, setOccurrences] = useState([emptyOccurrence()])
  const [firstTimerAppropriate, setFirstTimerAppropriate] = useState(false)
  const [details, setDetails] = useState(emptyDetails())

  const [allSessions, setAllSessions] = useState([])
  const [studios, setStudios] = useState([])
  const [instructors, setInstructors] = useState([])
  const [categories, setCategories] = useState([])

  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [seasonData, setSeasonData] = useState(null)

  useEffect(() => {
    classesApi.list({ page_size: 500 }).then(r => setAllSessions(r.data?.results || r.data || []))
    studiosApi.list().then(r => setStudios(r.data?.results || r.data || []))
    usersApi.list({ role: 'instructor', page_size: 200 }).then(r => setInstructors(r.data?.results || r.data || []))
    categoriesApi.list().then(r => setCategories(r.data?.results || r.data || []))
    seasonsApi.get(seasonId).then(r => setSeasonData(r.data)).catch(() => {})
  }, [seasonId])

  // When template changes, pre-fill occurrence block defaults and class details
  function applyTemplate(t) {
    setTemplate(t)
    if (!t) return
    // Pre-fill class details from template
    setDetails({
      name: t.name || '',
      sessionType: t.session_type || 'course',
      level: t.level || '',
      category: t.category ? String(t.category) : '',
      catchupCutoffWeeks: t.catchup_cutoff_weeks ? String(t.catchup_cutoff_weeks) : '',
      skillLevel: t.skill_level ? String(t.skill_level) : '',
      prerequisites: t.prerequisites || '',
      autoExemptSameName: t.auto_exempt_same_name !== false,
      catchupEligibleNames: t.catchup_eligible_names || '',
      tags: t.tags || [],
      description: t.description || '',
      firstTimerHeadline: t.first_timer_headline || '',
      firstTimerBody: t.first_timer_body || '',
    })
    setFirstTimerAppropriate(!!t.first_timer_appropriate)
    // Pre-fill first occurrence from template schedule
    setOccurrences(prev => prev.map((o, i) => i === 0 ? {
      ...o,
      dayOfWeek: t.day_of_week !== undefined ? t.day_of_week : o.dayOfWeek,
      startTime: t.start_time ? t.start_time.slice(0, 5) : o.startTime,
      durationMinutes: t.duration_minutes || o.durationMinutes,
      capacity: t.capacity || o.capacity,
      instructor: t.instructor ? String(t.instructor) : '',
      studio: t.studio ? String(t.studio) : '',
      priceOverride: t.price_override ? String(t.price_override) : '',
      instructorFee: t.instructor_fee ? String(t.instructor_fee) : '',
      requiresFullPayment: !!t.requires_full_payment,
    } : o))
  }

  async function handleConfirm() {
    if (!details.name.trim()) {
      setError('Class name is required.')
      return
    }
    setCreating(true)
    setError(null)
    try {
      for (const occ of occurrences) {
        const startWeek = occ.courseType === 'full' ? 1 : (occ.startWeek || 1)
        const endWeek = occ.courseType === 'full' ? 8 : Math.min(8, (occ.startWeek || 1) + (occ.numWeeks || 1) - 1)
        const payload = {
          name: details.name.trim(),
          session_type: details.sessionType,
          level: details.level || '',
          season: parseInt(seasonId),
          day_of_week: occ.dayOfWeek,
          start_time: occ.startTime + ':00',
          duration_minutes: occ.durationMinutes,
          capacity: occ.capacity,
          instructor: occ.instructor ? parseInt(occ.instructor) : null,
          studio: occ.studio ? parseInt(occ.studio) : null,
          price_override: occ.priceOverride ? parseFloat(occ.priceOverride) : null,
          instructor_fee: occ.instructorFee ? parseFloat(occ.instructorFee) : null,
          requires_full_payment: occ.requiresFullPayment,
          exempt_from_season_discount: occ.exemptFromSeasonDiscount || false,
          first_timer_appropriate: firstTimerAppropriate,
          start_week: startWeek,
          end_week: endWeek,
          category: details.category ? parseInt(details.category) : null,
          catchup_cutoff_weeks: details.catchupCutoffWeeks ? parseInt(details.catchupCutoffWeeks) : null,
          skill_level: details.skillLevel ? parseInt(details.skillLevel) : null,
          prerequisites: details.prerequisites || '',
          auto_exempt_same_name: details.autoExemptSameName,
          catchup_eligible_names: details.catchupEligibleNames || '',
          tags: details.tags,
          description: details.description || '',
          first_timer_headline: details.firstTimerHeadline || '',
          first_timer_body: details.firstTimerBody || '',
          is_active: true,
        }
        await classesApi.create(payload)
      }
      navigate(`/admin/seasons/${seasonId}/overview`)
    } catch (e) {
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : 'Failed to create class(es). Please try again.'
      setError(msg)
    } finally {
      setCreating(false)
    }
  }

  const stepLabels = ['Schedule', 'Class Details', 'Confirm']

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button
          onClick={() => navigate(`/admin/seasons/${seasonId}/overview`)}
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }}
        >←</button>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22 }}>Add Class to Season</div>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
        {stepLabels.map((label, i) => {
          const stepNum = i + 1
          const isActive = stepNum === step
          const isDone = stepNum < step
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < stepLabels.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 64 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: isDone ? '#ccff00' : isActive ? '#ccff00' : '#222',
                  color: isDone || isActive ? '#000' : '#888',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, marginBottom: 4,
                }}>
                  {isDone ? '✓' : stepNum}
                </div>
                <div style={{ fontSize: 11, color: isActive ? '#ccff00' : '#888', fontWeight: isActive ? 700 : 400, whiteSpace: 'nowrap' }}>
                  {label}
                </div>
              </div>
              {i < stepLabels.length - 1 && (
                <div style={{ flex: 1, height: 2, background: isDone ? '#ccff00' : '#222', margin: '0 4px', marginBottom: 20 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      {step === 1 && (
        <Step1
          occurrences={occurrences}
          setOccurrences={setOccurrences}
          template={template}
          setTemplate={applyTemplate}
          firstTimerAppropriate={firstTimerAppropriate}
          setFirstTimerAppropriate={setFirstTimerAppropriate}
          onNext={() => setStep(2)}
          allSessions={allSessions}
          studios={studios}
          instructors={instructors}
        />
      )}
      {step === 2 && (
        <Step2
          details={details}
          setDetails={setDetails}
          template={template}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
          categories={categories}
        />
      )}
      {step === 3 && (
        <Step3
          occurrences={occurrences}
          details={details}
          firstTimerAppropriate={firstTimerAppropriate}
          studios={studios}
          instructors={instructors}
          season={seasonData}
          onBack={() => setStep(2)}
          onConfirm={handleConfirm}
          creating={creating}
          error={error}
        />
      )}
    </div>
  )
}
