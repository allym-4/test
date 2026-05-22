import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { kisi, studios, users, settings, automations } from '../../api'

function GrantModal({ studioList, studentList, onSave, onClose }) {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  const localDT = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

  // Use the first studio with a kisi_place_id, or the first studio overall
  const defaultStudio = studioList.find(s => s.kisi_place_id) || studioList[0]

  const [form, setForm] = useState({
    student: '',
    studio: defaultStudio?.id || '',
    valid_from: localDT(now),
    valid_until: localDT(new Date(now.getTime() + 2 * 60 * 60 * 1000)),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await kisi.grants.create({
        student: form.student,
        studio: form.studio,
        valid_from: new Date(form.valid_from).toISOString(),
        valid_until: new Date(form.valid_until).toISOString(),
      })
      onSave()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create grant')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Grant Studio Access</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Student</label>
            <select className="input" value={form.student} onChange={e => set('student', e.target.value)} required style={{ width: '100%' }}>
              <option value="">Select student…</option>
              {studentList.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label className="form-label">Valid From</label>
              <input className="input" type="datetime-local" value={form.valid_from} onChange={e => set('valid_from', e.target.value)} required style={{ width: '100%' }} />
            </div>
            <div>
              <label className="form-label">Valid Until</label>
              <input className="input" type="datetime-local" value={form.valid_until} onChange={e => set('valid_until', e.target.value)} required style={{ width: '100%' }} />
            </div>
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Granting…' : 'Grant Access'}</button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Toggle({ label, sub, slug, rules, onToggle }) {
  const rule = rules.find(r => r.slug === slug)
  const enabled = rule?.enabled ?? false

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--grey)' }}>{sub}</div>
      </div>
      <button
        onClick={() => onToggle(slug, !enabled)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: enabled ? 'var(--lime)' : 'var(--border)',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: enabled ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%',
          background: enabled ? '#000' : 'var(--grey)',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}

export default function AdminKisi() {
  const [showModal, setShowModal] = useState(false)
  const [revoking, setRevoking] = useState(null)
  const [savingConfig, setSavingConfig] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)

  const { data: grantsData, loading: grantsLoading, refetch: refetchGrants } = useApi(() => kisi.grants.list(), [])
  const { data: studioData } = useApi(() => studios.list(), [])
  const { data: stuData } = useApi(() => users.list({ role: 'student' }), [])
  const { data: settingsData, refetch: refetchSettings } = useApi(() => settings.get(), [])
  const { data: rulesData, refetch: refetchRules } = useApi(() => automations.list(), [])

  const grants = grantsData?.results || grantsData || []
  const studioList = studioData?.results || studioData || []
  const studentList = stuData?.results || stuData || []
  const rules = rulesData?.results || rulesData || []

  const [config, setConfig] = useState(null)
  if (settingsData && config === null) {
    setConfig({
      kisi_api_key: settingsData.kisi_api_key || '',
      kisi_org_id: settingsData.kisi_org_id || '',
      kisi_enrolment_place_id: settingsData.kisi_enrolment_place_id || '',
      kisi_practice_place_id: settingsData.kisi_practice_place_id || '',
    })
  }

  // Per-studio place IDs
  const [placeIds, setPlaceIds] = useState({})

  async function handleRevokeGrant(id) {
    setRevoking(id)
    try {
      await kisi.grants.revoke(id)
      refetchGrants()
    } finally {
      setRevoking(null)
    }
  }

  async function handleToggle(slug, enabled) {
    await automations.toggle(slug, enabled)
    refetchRules()
  }

  async function handleSaveConfig(e) {
    e.preventDefault()
    setSavingConfig(true)
    try {
      await settings.save(config)
      // Save place IDs per studio
      for (const [studioId, placeId] of Object.entries(placeIds)) {
        await studios.update(studioId, { kisi_place_id: placeId })
      }
      setConfigSaved(true)
      refetchSettings()
      setTimeout(() => setConfigSaved(false), 2000)
    } finally {
      setSavingConfig(false)
    }
  }

  function formatDT(dt) {
    if (!dt) return '—'
    const d = new Date(dt)
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) +
      ' ' + d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  return (
    <div>
      {showModal && studioList.length > 0 && (
        <GrantModal
          studioList={studioList}
          studentList={studentList}
          onSave={() => { setShowModal(false); refetchGrants() }}
          onClose={() => setShowModal(false)}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Kisi Access</div>
          <div style={{ fontSize: 13, color: 'var(--grey)' }}>Studio door access control and practice time grants</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Grant Access</button>
      </div>

      {/* Automation Toggles */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '4px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', padding: '14px 0 6px', fontWeight: 600 }}>Automation</div>
        <Toggle
          label="Auto-grant Kisi access when practice time is booked"
          sub="Student receives an access link by email immediately after booking confirmation."
          slug="kisi_auto_grant"
          rules={rules}
          onToggle={handleToggle}
        />
        <Toggle
          label="Auto-revoke access if booking is cancelled"
          sub="Immediately invalidates the access link if the student cancels."
          slug="kisi_auto_revoke"
          rules={rules}
          onToggle={handleToggle}
        />
        <Toggle
          label="Log unlock events to attendance"
          sub="When a student unlocks the door, their session is automatically marked attended."
          slug="kisi_log_unlocks"
          rules={rules}
          onToggle={handleToggle}
        />
      </div>

      {/* Active Grants */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--grey)', marginBottom: 12, fontWeight: 600 }}>Active Access Grants</div>
        {grantsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : grants.length === 0 ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '28px 0', textAlign: 'center', color: 'var(--grey)', fontSize: 13 }}>
            No active grants.
          </div>
        ) : (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Student', 'Space', 'Valid From', 'Valid Until', 'Sent', 'Unlocked', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--grey)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grants.map((g, i) => (
                  <tr key={g.id} style={{ borderBottom: i < grants.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 13 }}>{g.student_detail?.display_name || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--grey)' }}>{g.studio_name || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12 }}>{formatDT(g.valid_from)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12 }}>{formatDT(g.valid_until)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {g.link_sent
                        ? <span style={{ color: 'var(--lime)', fontSize: 12 }}>✓ Sent</span>
                        : <span style={{ color: 'var(--grey)', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {g.unlocked
                        ? <span style={{ color: 'var(--lime)', fontSize: 12 }}>✓</span>
                        : <span style={{ color: 'var(--grey)', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleRevokeGrant(g.id)}
                        disabled={revoking === g.id}
                        style={{ color: 'var(--red)' }}
                      >{revoking === g.id ? '…' : 'Revoke'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* API Configuration */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 18 }}>API Configuration</div>
        {config !== null && (
          <form onSubmit={handleSaveConfig}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label className="form-label">Kisi API Key</label>
                <input
                  className="input"
                  type="password"
                  value={config.kisi_api_key}
                  onChange={e => setConfig(c => ({ ...c, kisi_api_key: e.target.value }))}
                  placeholder="KISI-LOGIN ..."
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="form-label">Organisation ID</label>
                <input
                  className="input"
                  value={config.kisi_org_id}
                  onChange={e => setConfig(c => ({ ...c, kisi_org_id: e.target.value }))}
                  placeholder="12345"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label className="form-label">Auto-Enrolment Place ID</label>
                <input className="input" value={config.kisi_enrolment_place_id} onChange={e => setConfig(c => ({ ...c, kisi_enrolment_place_id: e.target.value }))} placeholder="Duality Babes group ID" style={{ width: '100%' }} />
                <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>Auto-granted to enrolled students — expires at season end</div>
              </div>
              <div>
                <label className="form-label">Practice Time Place ID</label>
                <input className="input" value={config.kisi_practice_place_id} onChange={e => setConfig(c => ({ ...c, kisi_practice_place_id: e.target.value }))} placeholder="Practice Time group ID" style={{ width: '100%' }} />
                <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>Auto-granted on practice booking — expires at practice end</div>
              </div>
            </div>

            {studioList.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10 }}>Studio Place ID (Kisi Lock Group ID)</div>
                {(() => {
                  const s = studioList.find(s => s.kisi_place_id) || studioList[0]
                  if (!s) return null
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 140, fontSize: 13, fontWeight: 600 }}>Duality Pole Studio</div>
                      <input
                        className="input"
                        value={placeIds[s.id] ?? s.kisi_place_id ?? ''}
                        onChange={e => setPlaceIds(p => ({ ...p, [s.id]: e.target.value }))}
                        placeholder="Lock group ID"
                        style={{ width: 180 }}
                      />
                    </div>
                  )
                })()}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={savingConfig}>
                {savingConfig ? 'Saving…' : 'Save Configuration'}
              </button>
              {configSaved && <span style={{ fontSize: 12, color: 'var(--lime)' }}>✓ Saved</span>}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
