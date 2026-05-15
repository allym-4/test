import { useState, useEffect } from 'react'
import { automations } from '../../api'
import { useApi } from '../../hooks/useApi'

const AUTOMATION_DEFS = [
  { slug: 'noshow_fee', icon: '⚠️', name: 'No-show Fee Charge', desc: "Automatically charges a $20 fee when a student misses a class without cancelling.", trigger: 'Class marked: no-show', action: 'Charge $20 + send email', category: 'billing', defaultEnabled: true },
  { slug: 'reengagement', icon: '💬', name: 'Re-engagement Email', desc: "Sends a check-in email to students who haven't attended in 3+ weeks.", trigger: '21 days no attendance', action: 'Send re-engagement email via Gmail', category: 'comms', defaultEnabled: true },
  { slug: 'waitlist_notify', icon: '🔔', name: 'Waitlist Spot Notification', desc: 'Notifies the next student on the waitlist when a spot opens up.', trigger: 'Enrolment cancelled or dropped', action: 'Send email + 12h response window', category: 'bookings', defaultEnabled: true },
  { slug: 'parq_reminder', icon: '📋', name: 'PAR-Q Form Reminder', desc: 'Reminds new students to complete their health questionnaire before their first class.', trigger: 'Trial class booked + PAR-Q not submitted', action: 'Send reminder email 48h before class', category: 'forms', defaultEnabled: true },
  { slug: 'season_enrol_open', icon: '📅', name: 'Season Enrolment Open Alert', desc: 'Notifies all active students when a new season opens for enrolment.', trigger: 'Season status → Upcoming', action: 'Bulk email all active students', category: 'comms', defaultEnabled: false },
  { slug: 'payment_overdue', icon: '💳', name: 'Overdue Payment Reminder', desc: 'Sends a friendly reminder to students with outstanding balances over $30.', trigger: 'Balance owing > $30 for 7+ days', action: 'Send payment reminder email', category: 'billing', defaultEnabled: true },
  { slug: 'welfare_checkin', icon: '💚', name: 'Welfare Check-in', desc: 'Sends a personal check-in to students showing concerning attendance patterns.', trigger: 'Attendance < 50% over 4 classes', action: 'Send welfare email from Mimi', category: 'comms', defaultEnabled: false },
  { slug: 'birthday', icon: '🎂', name: 'Birthday Message', desc: 'Sends a personalised birthday message to students on their birthday.', trigger: 'Student birthday (date of birth)', action: 'Send birthday email', category: 'comms', defaultEnabled: false },
]

const CATEGORY_LABELS = { billing: 'Billing', comms: 'Communications', bookings: 'Bookings', forms: 'Forms' }

const TRIGGER_OPTIONS = [
  { value: 'student_created', label: 'New student registered' },
  { value: 'enrolment_active', label: 'Student enrolled in a class' },
  { value: 'enrolment_cancelled', label: 'Enrolment cancelled' },
  { value: 'attendance_no_show', label: 'Student marked as no-show' },
  { value: 'attendance_present', label: 'Student attended a class' },
  { value: 'payment_overdue', label: 'Payment instalment becomes overdue' },
  { value: 'form_submitted', label: 'Student submits a form' },
]

const CONDITION_TYPES = [
  { value: 'has_tag', label: 'Student has tag' },
  { value: 'class_level', label: 'Class level is' },
]

const ACTION_TYPES = [
  { value: 'send_email', label: 'Send email to student' },
  { value: 'send_notification', label: 'Send in-app notification' },
  { value: 'add_tag', label: 'Add tag to student' },
]

function Toggle({ checked, onChange }) {
  return (
    <div onClick={onChange} style={{ width: 40, height: 22, borderRadius: 11, background: checked ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: checked ? 21 : 3, transition: 'left 0.2s' }} />
    </div>
  )
}

function FlowConnector() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', height: 16 }}>
      <div style={{ width: 4, height: 16, background: '#333', borderRadius: 2 }} />
    </div>
  )
}

function ConditionChip({ cond, onRemove }) {
  const typeLabel = CONDITION_TYPES.find(t => t.value === cond.type)?.label || cond.type
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(179,157,219,0.15)', border: '1px solid rgba(179,157,219,0.35)', borderRadius: 20, padding: '3px 10px 3px 10px', fontSize: 12, marginRight: 6, marginBottom: 6 }}>
      <span style={{ color: 'var(--lav)' }}>{typeLabel}:</span>
      <span>{cond.value}</span>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0, marginLeft: 2 }}>✕</button>
    </div>
  )
}

function ActionChip({ action, onRemove }) {
  const typeLabel = ACTION_TYPES.find(t => t.value === action.type)?.label || action.type
  let detail = ''
  if (action.type === 'send_email') detail = action.subject ? ` — ${action.subject}` : ''
  else if (action.type === 'send_notification') detail = action.title ? ` — ${action.title}` : ''
  else if (action.type === 'add_tag') detail = action.tag ? ` — ${action.tag}` : ''
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,193,7,0.12)', border: '1px solid rgba(255,193,7,0.3)', borderRadius: 20, padding: '3px 10px 3px 10px', fontSize: 12, marginRight: 6, marginBottom: 6 }}>
      <span style={{ color: 'var(--amber)' }}>{typeLabel}</span>
      {detail && <span style={{ color: '#aaa' }}>{detail}</span>}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0, marginLeft: 2 }}>✕</button>
    </div>
  )
}

function AddConditionForm({ onAdd, onCancel }) {
  const [type, setType] = useState('has_tag')
  const [value, setValue] = useState('')
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 12px', marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <select value={type} onChange={e => setType(e.target.value)} style={{ background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 6, padding: '5px 8px', fontSize: 12 }}>
          {CONDITION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={type === 'has_tag' ? 'Tag name' : 'Level name'}
          style={{ background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 6, padding: '5px 8px', fontSize: 12, flex: 1, minWidth: 120 }}
        />
        <button
          onClick={() => { if (value.trim()) { onAdd({ type, value: value.trim() }); setValue('') } }}
          style={{ background: 'var(--lav)', color: '#000', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
        >Add</button>
        <button onClick={onCancel} style={{ background: 'none', border: '1px solid #333', color: '#888', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

function AddActionForm({ onAdd, onCancel }) {
  const [type, setType] = useState('send_email')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [title, setTitle] = useState('')
  const [tag, setTag] = useState('')

  function handleAdd() {
    if (type === 'send_email' && subject.trim()) {
      onAdd({ type, subject: subject.trim(), body: body.trim() })
    } else if (type === 'send_notification' && title.trim()) {
      onAdd({ type, title: title.trim(), body: body.trim() })
    } else if (type === 'add_tag' && tag.trim()) {
      onAdd({ type, tag: tag.trim() })
    }
  }

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 12px', marginTop: 8 }}>
      <select value={type} onChange={e => setType(e.target.value)} style={{ background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 6, padding: '5px 8px', fontSize: 12, marginBottom: 8, width: '100%' }}>
        {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>

      {type === 'send_email' && (
        <>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" style={{ display: 'block', width: '100%', boxSizing: 'border-box', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 6, padding: '5px 8px', fontSize: 12, marginBottom: 6 }} />
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Email body…" rows={3} style={{ display: 'block', width: '100%', boxSizing: 'border-box', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 6, padding: '5px 8px', fontSize: 12, resize: 'vertical', marginBottom: 6 }} />
        </>
      )}
      {type === 'send_notification' && (
        <>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title" style={{ display: 'block', width: '100%', boxSizing: 'border-box', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 6, padding: '5px 8px', fontSize: 12, marginBottom: 6 }} />
          <input value={body} onChange={e => setBody(e.target.value)} placeholder="Notification body" style={{ display: 'block', width: '100%', boxSizing: 'border-box', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 6, padding: '5px 8px', fontSize: 12, marginBottom: 6 }} />
        </>
      )}
      {type === 'add_tag' && (
        <input value={tag} onChange={e => setTag(e.target.value)} placeholder="Tag name" style={{ display: 'block', width: '100%', boxSizing: 'border-box', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 6, padding: '5px 8px', fontSize: 12, marginBottom: 6 }} />
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={handleAdd} style={{ background: 'var(--amber)', color: '#000', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Add</button>
        <button onClick={onCancel} style={{ background: 'none', border: '1px solid #333', color: '#888', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

function FlowBuilderModal({ initial, onClose, onSave }) {
  const isEdit = !!initial?.id
  const [name, setName] = useState(initial?.name || '')
  const [triggerType, setTriggerType] = useState(initial?.trigger_type || '')
  const [conditions, setConditions] = useState(initial?.conditions || [])
  const [actions, setActions] = useState(initial?.actions || [])
  const [showAddCond, setShowAddCond] = useState(false)
  const [showAddAction, setShowAddAction] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) { setError('Flow name is required.'); return }
    if (!triggerType) { setError('Please select a trigger.'); return }
    if (actions.length === 0) { setError('Add at least one action.'); return }
    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        await automations.update(initial.id, { name: name.trim(), trigger_type: triggerType, conditions, actions })
      } else {
        await automations.create({ name: name.trim(), trigger_type: triggerType, conditions, actions, is_custom: true, enabled: true })
      }
      onSave()
    } catch (e) {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const cardStyle = (borderColor) => ({
    background: 'var(--card)',
    border: '1px solid #222',
    borderLeft: `3px solid ${borderColor}`,
    borderRadius: 10,
    padding: '14px 16px',
  })

  const sectionLabel = {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--grey)',
    marginBottom: 8,
    fontWeight: 600,
  }

  return (
    <div className="sd-overlay" style={{ zIndex: 1000 }}>
      <div className="sd-modal" style={{ maxWidth: 580, width: '100%' }}>
        <div className="sd-header">
          <div style={{ fontWeight: 700, fontSize: 16 }}>{isEdit ? 'Edit Flow' : 'New Custom Flow'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body" style={{ overflowY: 'auto', maxHeight: '80vh' }}>
          {/* Flow name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 6 }}>Flow name <span style={{ color: '#e74c3c' }}>*</span></label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Welcome new students"
              style={{ width: '100%', boxSizing: 'border-box', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}
            />
          </div>

          {/* Flow cards */}
          <div style={{ maxWidth: 540, margin: '0 auto' }}>
            {/* TRIGGER */}
            <div style={cardStyle('var(--lime)')}>
              <div style={sectionLabel}>Trigger — What starts this flow?</div>
              <select
                value={triggerType}
                onChange={e => setTriggerType(e.target.value)}
                style={{ width: '100%', background: '#111', color: triggerType ? '#fff' : '#666', border: '1px solid #333', borderRadius: 7, padding: '7px 10px', fontSize: 13 }}
              >
                <option value="" disabled>Choose a trigger…</option>
                {TRIGGER_OPTIONS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <FlowConnector />

            {/* CONDITIONS */}
            <div style={cardStyle('var(--lav)')}>
              <div style={sectionLabel}>Conditions — Only if… (optional)</div>
              <div style={{ flexWrap: 'wrap', display: conditions.length ? 'block' : 'none', marginBottom: conditions.length ? 6 : 0 }}>
                {conditions.map((cond, i) => (
                  <ConditionChip key={i} cond={cond} onRemove={() => setConditions(prev => prev.filter((_, idx) => idx !== i))} />
                ))}
              </div>
              {conditions.length === 0 && !showAddCond && (
                <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>No conditions — flow runs for all matching triggers.</div>
              )}
              {showAddCond
                ? <AddConditionForm onAdd={c => { setConditions(prev => [...prev, c]); setShowAddCond(false) }} onCancel={() => setShowAddCond(false)} />
                : <button onClick={() => setShowAddCond(true)} style={{ background: 'none', border: '1px dashed rgba(179,157,219,0.4)', color: 'var(--lav)', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', marginTop: 4 }}>+ Add Condition</button>
              }
            </div>

            <FlowConnector />

            {/* ACTIONS */}
            <div style={cardStyle('var(--amber)')}>
              <div style={sectionLabel}>Actions — Then do this…</div>
              <div style={{ flexWrap: 'wrap', display: actions.length ? 'block' : 'none', marginBottom: actions.length ? 6 : 0 }}>
                {actions.map((action, i) => (
                  <ActionChip key={i} action={action} onRemove={() => setActions(prev => prev.filter((_, idx) => idx !== i))} />
                ))}
              </div>
              {actions.length === 0 && !showAddAction && (
                <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>No actions added yet.</div>
              )}
              {showAddAction
                ? <AddActionForm onAdd={a => { setActions(prev => [...prev, a]); setShowAddAction(false) }} onCancel={() => setShowAddAction(false)} />
                : <button onClick={() => setShowAddAction(true)} style={{ background: 'none', border: '1px dashed rgba(255,193,7,0.4)', color: 'var(--amber)', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', marginTop: 4 }}>+ Add Action</button>
              }
            </div>
          </div>

          {error && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 16 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid #333', color: '#aaa', borderRadius: 8, padding: '8px 18px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ background: 'var(--lime)', color: '#000', border: 'none', borderRadius: 8, padding: '8px 22px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Flow'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminAutomations() {
  const [activeTab, setActiveTab] = useState('builtin')
  const [filter, setFilter] = useState('all')
  const [enabledMap, setEnabledMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [customFlows, setCustomFlows] = useState([])
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingFlow, setEditingFlow] = useState(null)

  const { data: stats } = useApi(() => automations.stats(), [])
  const { data: runs } = useApi(() => automations.runs(), [])

  useEffect(() => {
    loadData()
  }, [])

  function loadData() {
    setLoading(true)
    automations.list().then(r => {
      const stored = r.data.results || r.data
      const map = {}
      AUTOMATION_DEFS.forEach(def => {
        const found = stored.find(s => s.slug === def.slug)
        map[def.slug] = found ? found.enabled : def.defaultEnabled
      })
      setEnabledMap(map)
      setCustomFlows(stored.filter(r => r.is_custom))
    }).finally(() => setLoading(false))
  }

  async function toggle(slug) {
    const newVal = !enabledMap[slug]
    setEnabledMap(prev => ({ ...prev, [slug]: newVal }))
    try {
      await automations.toggle(slug, newVal)
    } catch {
      setEnabledMap(prev => ({ ...prev, [slug]: !newVal }))
    }
  }

  async function toggleCustom(flow) {
    const newVal = !flow.enabled
    setCustomFlows(prev => prev.map(f => f.id === flow.id ? { ...f, enabled: newVal } : f))
    try {
      await automations.update(flow.id, { enabled: newVal })
    } catch {
      setCustomFlows(prev => prev.map(f => f.id === flow.id ? { ...f, enabled: flow.enabled } : f))
    }
  }

  async function deleteFlow(flow) {
    if (!confirm(`Delete "${flow.name}"? This cannot be undone.`)) return
    try {
      await automations.delete(flow.id)
      setCustomFlows(prev => prev.filter(f => f.id !== flow.id))
    } catch {
      alert('Failed to delete flow.')
    }
  }

  const shown = AUTOMATION_DEFS.filter(a => filter === 'all' || a.category === filter)
  const enabledCount = AUTOMATION_DEFS.filter(a => enabledMap[a.slug]).length

  const triggerLabel = (v) => TRIGGER_OPTIONS.find(t => t.value === v)?.label || v

  const tabStyle = (active) => ({
    padding: '8px 20px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    background: active ? 'var(--lime)' : 'transparent',
    color: active ? '#000' : '#888',
    transition: 'all 0.15s',
  })

  return (
    <div>
      {showBuilder && (
        <FlowBuilderModal
          initial={editingFlow}
          onClose={() => { setShowBuilder(false); setEditingFlow(null) }}
          onSave={() => { setShowBuilder(false); setEditingFlow(null); loadData() }}
        />
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Automations</div>
          <div className="page-sub">Automated workflows and triggers</div>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {[
          ['Active', loading ? '…' : enabledCount, 'kpi-lime'],
          ['Inactive', loading ? '…' : AUTOMATION_DEFS.length - enabledCount, 'kpi-grey'],
          ['Runs This Month', stats?.runs_this_month ?? '…', 'kpi-lav'],
          ['Emails Sent', stats?.emails_sent ?? '…', 'kpi-amber'],
        ].map(([label, val, cls]) => (
          <div key={label} className={`kpi ${cls}`}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.2)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, fontSize: 13 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)', flexShrink: 0 }} />
        <span>Gmail connected — <b>mimi@dualitypole.com.au</b>. All email automations are active.</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#111', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
        <button style={tabStyle(activeTab === 'builtin')} onClick={() => setActiveTab('builtin')}>Built-in</button>
        <button style={tabStyle(activeTab === 'custom')} onClick={() => setActiveTab('custom')}>
          Custom Flows
          {customFlows.length > 0 && (
            <span style={{ marginLeft: 6, background: activeTab === 'custom' ? '#000' : '#333', color: activeTab === 'custom' ? 'var(--lime)' : '#aaa', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{customFlows.length}</span>
          )}
        </button>
        <button style={tabStyle(activeTab === 'history')} onClick={() => setActiveTab('history')}>Run History</button>
      </div>

      {/* BUILT-IN TAB */}
      {activeTab === 'builtin' && (
        <>
          <div className="filter-bar" style={{ marginBottom: 20 }}>
            {[['all', 'All'], ['billing', 'Billing'], ['comms', 'Communications'], ['bookings', 'Bookings'], ['forms', 'Forms']].map(([key, label]) => (
              <span key={key} className={`filter-tag ${filter === key ? 'active-tag' : ''}`} onClick={() => setFilter(key)}>{label}</span>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {shown.map(a => {
              const enabled = loading ? a.defaultEnabled : (enabledMap[a.slug] ?? a.defaultEnabled)
              return (
                <div key={a.slug} style={{ background: 'var(--card)', border: `1px solid ${enabled ? 'var(--border)' : '#111'}`, borderRadius: 12, padding: '16px 18px', opacity: enabled ? 1 : 0.65 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{a.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                        <span className={`tag ${a.category === 'billing' ? 'tag-amber' : a.category === 'comms' ? 'tag-lav' : a.category === 'bookings' ? 'tag-lime' : 'tag-grey'}`} style={{ fontSize: 9 }}>{CATEGORY_LABELS[a.category]}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10, lineHeight: 1.5 }}>{a.desc}</div>
                      <div style={{ display: 'flex', gap: 20, fontSize: 11 }}>
                        <div><span style={{ color: 'var(--grey)' }}>Trigger: </span><span>{a.trigger}</span></div>
                        <div><span style={{ color: 'var(--grey)' }}>Action: </span><span>{a.action}</span></div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <Toggle checked={enabled} onChange={() => toggle(a.slug)} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* RUN HISTORY TAB */}
      {activeTab === 'history' && (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Last 10 Automation Runs</div>
          {!runs || runs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555', fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div>No automation runs recorded yet.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #222', color: '#666', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Automation</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Student</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Actions Taken</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>When</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map(run => (
                    <tr key={run.id} style={{ borderBottom: '1px solid #111' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: 'rgba(204,255,0,0.1)', color: 'var(--lime)', border: '1px solid rgba(204,255,0,0.2)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontFamily: 'monospace' }}>{run.slug}</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#ccc' }}>{run.student_name || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#888', fontSize: 11 }}>{Array.isArray(run.actions_taken) ? run.actions_taken.join(', ') : run.actions_taken}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          background: run.status === 'completed' ? 'rgba(204,255,0,0.1)' : run.status === 'failed' ? 'rgba(231,76,60,0.1)' : 'rgba(255,255,255,0.05)',
                          color: run.status === 'completed' ? 'var(--lime)' : run.status === 'failed' ? '#e74c3c' : '#888',
                          borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                        }}>{run.status}</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#666', fontSize: 11 }}>{new Date(run.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CUSTOM FLOWS TAB */}
      {activeTab === 'custom' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              onClick={() => { setEditingFlow(null); setShowBuilder(true) }}
              style={{ background: 'var(--lime)', color: '#000', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >+ New Flow</button>
          </div>

          {loading ? (
            <div style={{ color: '#666', fontSize: 13, padding: 24 }}>Loading…</div>
          ) : customFlows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555', fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No custom flows yet.</div>
              <div>Create your first automation to get started.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {customFlows.map(flow => (
                <div key={flow.id} style={{ background: 'var(--card)', border: `1px solid ${flow.enabled ? 'var(--border)' : '#111'}`, borderRadius: 12, padding: '14px 18px', opacity: flow.enabled ? 1 : 0.65 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{flow.name || 'Untitled Flow'}</div>
                        {flow.trigger_type && (
                          <span style={{ fontSize: 10, background: 'rgba(204,255,0,0.12)', color: 'var(--lime)', border: '1px solid rgba(204,255,0,0.25)', borderRadius: 20, padding: '2px 9px', fontWeight: 600 }}>
                            {triggerLabel(flow.trigger_type)}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#666' }}>
                        {flow.conditions?.length || 0} condition{flow.conditions?.length !== 1 ? 's' : ''} · {flow.actions?.length || 0} action{flow.actions?.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <Toggle checked={flow.enabled} onChange={() => toggleCustom(flow)} />
                      <button
                        onClick={() => { setEditingFlow(flow); setShowBuilder(true) }}
                        style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#ccc', borderRadius: 7, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}
                      >Edit</button>
                      <button
                        onClick={() => deleteFlow(flow)}
                        style={{ background: 'none', border: '1px solid rgba(231,76,60,0.3)', color: '#e74c3c', borderRadius: 7, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}
                      >Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
