import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../StudentsPage.css'
import { useApi } from '../../hooks/useApi'
import { tags as tagsApi } from '../../api'
import client from '../../api/client'

const RULE_TYPES = [
  { value: 'enrolled_in_class',   label: 'Enrolled in a specific class' },
  { value: 'first_timer',         label: 'First timer this season' },
  { value: 'active_enrolment',    label: 'Has active enrolment this season' },
  { value: 'three_plus_classes',  label: '3+ classes this season' },
  { value: 'lapsed_1',            label: 'Lapsed — missed 1 season' },
  { value: 'lapsed_2',            label: 'Lapsed — missed 2 seasons' },
  { value: 'lapsed_3_plus',       label: 'Lapsed — missed 3+ seasons' },
  { value: 'casual_only',         label: 'Casual bookings only this season' },
  { value: 'trial_not_converted', label: 'Trial, never converted' },
  { value: 'has_locker',          label: 'Has active locker' },
  { value: 'level',               label: 'Level' },
]

function ruleLabel(tag) {
  if (tag.is_manual) return 'Manual only'
  if (tag.rule_type) {
    const rt = RULE_TYPES.find(r => r.value === tag.rule_type)
    const base = rt ? rt.label : tag.rule_type
    if (tag.rule_type === 'enrolled_in_class' && tag.rule_params?.class_name) {
      const season = tag.rule_params.season || 'current'
      return `${base}: ${tag.rule_params.class_name} (${season})`
    }
    if (tag.rule_type === 'level' && tag.rule_params?.level) {
      const lv = tag.rule_params.level === 'supplementary' ? 'Supplementary' : `Level ${tag.rule_params.level}`
      return `${base}: ${lv}`
    }
    return base
  }
  if (tag.auto_rule && tag.auto_rule !== 'Manual only') return tag.auto_rule
  return 'Manual only'
}

function TagModal({ existing, onClose, onSaved }) {
  const [name, setName] = useState(existing?.name || '')
  const [colour, setColour] = useState(existing?.colour || '#ccff00')
  const [manual, setManual] = useState(existing?.is_manual ?? true)
  const [ruleType, setRuleType] = useState(existing?.rule_type || '')
  const [ruleParams, setRuleParams] = useState(existing?.rule_params || {})
  const [saving, setSaving] = useState(false)

  function updateParam(key, value) {
    setRuleParams(prev => ({ ...prev, [key]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name,
        colour,
        is_manual: manual,
        auto_rule: manual ? 'Manual only' : (existing?.auto_rule || ''),
        rule_type: manual ? '' : ruleType,
        rule_params: manual ? {} : ruleParams,
      }
      if (existing?.id) {
        await tagsApi.update(existing.id, payload)
      } else {
        await tagsApi.create(payload)
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 420 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{existing?.id ? 'Edit Tag' : 'New Tag'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={submit}>
          <div className="field"><label>Tag Name</label><input value={name} onChange={e => setName(e.target.value)} required /></div>
          <div className="field">
            <label>Colour</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="color" value={colour} onChange={e => setColour(e.target.value)} style={{ width: 40, height: 36, padding: 2, background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }} />
              <span style={{ fontSize: 12, color: 'var(--grey)' }}>{colour}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div onClick={() => setManual(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, background: !manual ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: !manual ? 19 : 3, transition: 'left 0.2s' }} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--grey)' }}>Auto-assign with rule</span>
          </div>

          {!manual && (
            <>
              <div className="field">
                <label>Rule type</label>
                <select value={ruleType} onChange={e => { setRuleType(e.target.value); setRuleParams({}) }} required={!manual}>
                  <option value="">— Select a rule —</option>
                  {RULE_TYPES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {ruleType === 'enrolled_in_class' && (
                <>
                  <div className="field">
                    <label>Class name (partial match)</label>
                    <input
                      value={ruleParams.class_name || ''}
                      onChange={e => updateParam('class_name', e.target.value)}
                      placeholder="e.g. Level 1"
                      required
                    />
                  </div>
                  <div className="field">
                    <label>Season</label>
                    <select value={ruleParams.season || 'current'} onChange={e => updateParam('season', e.target.value)}>
                      <option value="current">Current season</option>
                      <option value="previous">Previous season</option>
                      <option value="any">Any season</option>
                    </select>
                  </div>
                </>
              )}

              {ruleType === 'level' && (
                <div className="field">
                  <label>Level</label>
                  <select value={ruleParams.level || ''} onChange={e => updateParam('level', e.target.value)} required>
                    <option value="">— Select level —</option>
                    {['1', '2', '3', '4', '5', '6'].map(l => (
                      <option key={l} value={l}>Level {l}</option>
                    ))}
                    <option value="supplementary">Supplementary (not in a Level class)</option>
                  </select>
                </div>
              )}
            </>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminTags() {
  const navigate = useNavigate()
  const { data, loading, refetch } = useApi(() => tagsApi.list())
  const tags = data?.results || data || []
  const [modal, setModal] = useState(null)
  const [autoRemove, setAutoRemove] = useState(true)
  const [notifyAtRisk, setNotifyAtRisk] = useState(true)
  const [runningRules, setRunningRules] = useState(false)
  const [rulesOutput, setRulesOutput] = useState(null)

  async function handleDelete(id) {
    await tagsApi.delete(id)
    refetch()
  }

  function handleSaved() {
    setModal(null)
    refetch()
  }

  async function handleRunRules() {
    setRunningRules(true)
    setRulesOutput(null)
    try {
      const res = await client.post('/api/users/tags/apply-rules/')
      setRulesOutput(res.data?.output || 'Done.')
    } catch (err) {
      setRulesOutput('Error: ' + (err?.response?.data?.detail || err.message))
    } finally {
      setRunningRules(false)
      refetch()
    }
  }

  const autoTags = tags.filter(t => !t.is_manual && (t.rule_type || (t.auto_rule && t.auto_rule !== 'Manual only')))

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Tags</div>
          <div className="page-sub">Organise students with labels and automate tag rules</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleRunRules}
            disabled={runningRules}
          >{runningRules ? 'Running…' : '▶ Run rules now'}</button>
          <button className="btn btn-lime btn-sm" onClick={() => setModal({ existing: null })}>+ New Tag</button>
        </div>
      </div>

      {rulesOutput && (
        <div style={{ background: '#111', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: 'var(--grey)', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
          {rulesOutput}
          <button className="btn btn-ghost btn-xs" style={{ marginLeft: 12, fontFamily: 'inherit' }} onClick={() => setRulesOutput(null)}>Dismiss</button>
        </div>
      )}

      <div className="tbl-section" style={{ marginBottom: 24 }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--grey)' }}>Loading…</div>
        ) : tags.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--grey)', fontSize: 13 }}>No tags yet — create your first tag above.</div>
        ) : (
          <table>
            <thead><tr><th>Tag</th><th>Colour</th><th>Students</th><th>Auto-rule</th><th></th></tr></thead>
            <tbody>
              {tags.map(tag => (
                <tr key={tag.id}>
                  <td>
                    <span style={{ display: 'inline-block', background: tag.colour + '33', color: tag.colour, fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                      {tag.name}
                    </span>
                  </td>
                  <td><span style={{ display: 'inline-block', width: 16, height: 16, background: tag.colour, borderRadius: 3 }} /></td>
                  <td style={{ fontSize: 12, color: 'var(--grey)' }}>—</td>
                  <td style={{ fontSize: 12, color: tag.is_manual ? 'var(--grey)' : 'inherit' }}>{ruleLabel(tag)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-xs" style={{ marginRight: 4 }} onClick={() => setModal({ existing: tag })}>Edit</button>
                    <button className="btn btn-ghost btn-xs" onClick={() => navigate(`/admin/students?tag=${tag.id}`)}>View Students</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14 }}>Auto-tag Rules</div>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => setModal({ existing: { name: '', colour: '#ccff00', auto_rule: '', is_manual: false } })}
          >+ Add Rule</button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 14 }}>Tags with rules are applied automatically and updated daily. Manual-only tags must be applied individually.</p>

        {autoTags.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {autoTags.map(tag => (
              <div key={tag.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'inline-block', background: tag.colour + '33', color: tag.colour, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>{tag.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--grey)' }}>{ruleLabel(tag)}</span>
                </div>
                <button className="btn btn-ghost btn-xs" onClick={() => setModal({ existing: tag })}>Edit</button>
              </div>
            ))}
          </div>
        )}
        {autoTags.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 16, fontStyle: 'italic' }}>
            No auto-tag rules configured. Use "+ Add Rule" to create one, or enable "Auto-assign with rule" when editing a tag.
          </div>
        )}

        {[
          { label: 'Auto-remove tags when conditions no longer apply', sub: 'e.g. remove "At Risk" if student books again', val: autoRemove, set: setAutoRemove },
          { label: 'Notify admin when a student gains an At Risk tag', sub: '', val: notifyAtRisk, set: setNotifyAtRisk },
        ].map(({ label, sub, val, set }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{label}</div>
              {sub && <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{sub}</div>}
            </div>
            <div onClick={() => set(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, background: val ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: val ? 19 : 3, transition: 'left 0.2s' }} />
            </div>
          </div>
        ))}
      </div>

      {modal && <TagModal existing={modal.existing} onClose={() => setModal(null)} onSaved={handleSaved} />}
    </div>
  )
}
