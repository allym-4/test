import { useState, useEffect } from 'react'
import '../StudentsPage.css'
import { useApi } from '../../hooks/useApi'
import { campaigns as campaignsApi, emailLists as emailListsApi, automations as automationsApi, settings as settingsApi, mailchimp as mailchimpApi } from '../../api'
import client from '../../api/client'

function CreateCampaignModal({ onClose, onCreated, existing }) {
  const [form, setForm] = useState({
    name: existing?.name || '',
    subject: existing?.subject || '',
    body: existing?.body || '',
    list_name: existing?.list_name || '',
    status: existing?.status || 'draft',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const { data: listsData } = useApi(() => emailListsApi.list())
  const emailLists = listsData?.results || listsData || []

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setErr('Name is required'); return }
    setSaving(true)
    setErr(null)
    try {
      if (existing) {
        await campaignsApi.update(existing.id, form)
      } else {
        await campaignsApi.create(form)
      }
      onCreated()
      onClose()
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Failed to save campaign')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card" style={{ width: 540, padding: '28px 32px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 20 }}>{existing ? 'Edit Campaign' : 'New Campaign'}</div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 4 }}>Name *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Season 5 Launch" style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 4 }}>Subject</label>
            <input className="input" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Email subject line" style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 4 }}>Body</label>
            <textarea
              className="input"
              rows={7}
              value={form.body}
              onChange={e => set('body', e.target.value)}
              placeholder="Write the email body here…"
              style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 4 }}>List</label>
            <select className="input" value={form.list_name} onChange={e => set('list_name', e.target.value)} style={{ width: '100%' }}>
              <option value="">All active students</option>
              {emailLists.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 4 }}>Status</label>
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)} style={{ width: '100%' }}>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="sent">Sent</option>
            </select>
          </div>
          {err && <div style={{ color: 'var(--red, #f55)', fontSize: 12, marginBottom: 12 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : existing ? 'Save' : 'Create Campaign'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CampaignViewModal({ campaign, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 500, padding: '28px 32px', maxWidth: '90vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{campaign.name}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--grey)' }}>Status</span><span className={`tag ${campaign.status === 'sent' ? 'tag-lime' : campaign.status === 'scheduled' ? 'tag-amber' : 'tag-grey'}`} style={{ fontSize: 10 }}>{campaign.status}</span></div>
          {campaign.subject && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--grey)' }}>Subject</span><span>{campaign.subject}</span></div>}
          {campaign.list_name && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--grey)' }}>List</span><span>{campaign.list_name}</span></div>}
          {campaign.sent_at && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--grey)' }}>Sent</span><span>{new Date(campaign.sent_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>}
          {campaign.open_rate != null && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--grey)' }}>Open rate</span><span style={{ color: 'var(--lime)' }}>{campaign.open_rate}%</span></div>}
          {campaign.body && (
            <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Body</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--white)', whiteSpace: 'pre-wrap' }}>{campaign.body}</div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function MailchimpTab() {
  const [form, setForm] = useState({ mailchimp_api_key: '', mailchimp_list_id: '' })
  const [status, setStatus] = useState(null) // null | {connected, account_name, list_name, member_count, error}
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [toast, setToast] = useState('')

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  useEffect(() => {
    settingsApi.get().then(r => {
      setForm({ mailchimp_api_key: r.data.mailchimp_api_key || '', mailchimp_list_id: r.data.mailchimp_list_id || '' })
    })
    mailchimpApi.status().then(r => setStatus(r.data)).catch(() => setStatus({ connected: false })).finally(() => setLoadingStatus(false))
  }, [])

  async function save() {
    setSaving(true)
    try {
      await settingsApi.save({ mailchimp_api_key: form.mailchimp_api_key, mailchimp_list_id: form.mailchimp_list_id })
      setLoadingStatus(true)
      const r = await mailchimpApi.status()
      setStatus(r.data)
      showToast(r.data.connected ? 'Connected successfully' : 'Saved — ' + (r.data.error || 'check your API key'))
    } catch {
      showToast('Failed to save')
    } finally {
      setSaving(false)
      setLoadingStatus(false)
    }
  }

  async function sync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const r = await mailchimpApi.sync()
      setSyncResult(r.data)
      showToast(`Sync complete — ${r.data.added} added, ${r.data.updated} updated`)
    } catch {
      showToast('Sync failed — check connection')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      {toast && (
        <div style={{ background: 'var(--lime)', color: '#000', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{toast}</div>
      )}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          {loadingStatus ? (
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#333' }} />
          ) : status?.connected ? (
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--lime)' }} />
          ) : (
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#333' }} />
          )}
          <span style={{ fontSize: 13, color: status?.connected ? 'var(--white)' : 'var(--grey)' }}>
            {loadingStatus ? 'Checking…' : status?.connected
              ? `Connected — ${status.account_name}${status.list_name ? ` · ${status.list_name} (${status.member_count} members)` : ''}`
              : status?.error ? `Error: ${status.error}` : 'Not connected'}
          </span>
        </div>

        <div className="field" style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 4 }}>API Key</label>
          <input
            className="input"
            value={form.mailchimp_api_key}
            onChange={e => setForm(f => ({ ...f, mailchimp_api_key: e.target.value }))}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us1"
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
          />
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>
            Find in Mailchimp → Account → Extras → API Keys
          </div>
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--grey)', display: 'block', marginBottom: 4 }}>Audience / List ID</label>
          <input
            className="input"
            value={form.mailchimp_list_id}
            onChange={e => setForm(f => ({ ...f, mailchimp_list_id: e.target.value }))}
            placeholder="e.g. a1b2c3d4e5"
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
          />
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>
            Find in Mailchimp → Audience → Manage Audience → Settings → Audience name and campaign defaults
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-lime btn-sm" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save & Test Connection'}
          </button>
          {status?.connected && (
            <button className="btn btn-ghost btn-sm" onClick={sync} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync Members Now'}
            </button>
          )}
        </div>
      </div>

      {syncResult && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last Sync</div>
          <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
            <div><span style={{ color: 'var(--lime)', fontWeight: 700 }}>{syncResult.added}</span> added</div>
            <div><span style={{ color: 'var(--lav)', fontWeight: 700 }}>{syncResult.updated}</span> updated</div>
            {syncResult.errors > 0 && <div><span style={{ color: 'var(--red)', fontWeight: 700 }}>{syncResult.errors}</span> errors</div>}
            <div style={{ color: 'var(--grey)' }}>{syncResult.total} total students</div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 16, lineHeight: 1.6 }}>
        Sync pushes all active students to your Mailchimp audience as subscribed contacts. Re-running sync is safe — existing members are updated, not duplicated.
      </div>
    </div>
  )
}

export default function AdminMarketing() {
  const [tab, setTab] = useState('campaigns')
  const [showCreateCampaign, setShowCreateCampaign] = useState(false)
  const [editCampaign, setEditCampaign] = useState(null)
  const [viewCampaign, setViewCampaign] = useState(null)
  const [sendingCampaignId, setSendingCampaignId] = useState(null)
  const [confirmSendId, setConfirmSendId] = useState(null)
  const [sendResult, setSendResult] = useState(null)

  const { data: campData, loading: loadingCamp, refetch: refetchCamp } = useApi(() => campaignsApi.list())
  const campaignList = campData?.results || campData || []

  const { data: listsData, refetch: refetchLists } = useApi(() => emailListsApi.list())
  const emailListList = listsData?.results || listsData || []

  const { data: autoData, refetch: refetchAuto } = useApi(() => automationsApi.list())
  const automationList = autoData?.results || autoData || []

  async function toggleAutomation(rule) {
    await automationsApi.update(rule.id, { enabled: !rule.enabled })
    refetchAuto()
  }

  async function sendCampaign(id) {
    setSendingCampaignId(id)
    setConfirmSendId(null)
    setSendResult(null)
    try {
      const res = await campaignsApi.send(id)
      setSendResult(`Sent to ${res.data.count} students.`)
      refetchCamp()
    } catch (err) {
      setSendResult(err.response?.data?.detail || 'Send failed.')
    } finally {
      setSendingCampaignId(null)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Marketing</div>
          <div className="page-sub">Campaigns, customer lists and automations</div>
        </div>
        {tab === 'campaigns' && <button className="btn btn-lime btn-sm" onClick={() => { setShowCreateCampaign(true); setEditCampaign(null) }}>+ New Campaign</button>}
        {tab === 'lists' && <button className="btn btn-lime btn-sm">+ New List</button>}
      </div>

      <div className="subtabs" style={{ marginBottom: 24 }}>
        {[['campaigns', 'Campaigns'], ['lists', 'Customer Lists'], ['automations', 'Automations'], ['mailchimp', 'Mailchimp']].map(([key, label]) => (
          <div key={key} className={`subtab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</div>
        ))}
      </div>

      {tab === 'campaigns' && (
        <div className="tbl-section">
          {loadingCamp ? (
            <div style={{ padding: 24, color: 'var(--grey)', fontSize: 13 }}>Loading…</div>
          ) : (
            <table>
              <thead><tr><th>Campaign</th><th>Type</th><th>List</th><th>Date</th><th>Status</th><th>Opens</th><th></th></tr></thead>
              <tbody>
                {campaignList.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>Email</td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{c.list_name || '—'}</td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{c.sent_at ? new Date(c.sent_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td>
                      <span className={`tag ${c.status === 'sent' ? 'tag-lime' : c.status === 'scheduled' ? 'tag-amber' : 'tag-grey'}`} style={{ fontSize: 10 }}>{c.status}</span>
                    </td>
                    <td style={{ color: c.open_rate ? 'var(--lime)' : 'var(--grey)' }}>{c.open_rate ? `${c.open_rate}%` : '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => setViewCampaign(c)}>View</button>
                        {c.status !== 'sent' && (
                          <button className="btn btn-ghost btn-xs" onClick={() => setEditCampaign(c)}>Edit</button>
                        )}
                        {c.status !== 'sent' && (
                          confirmSendId === c.id ? (
                            <span style={{ display: 'flex', gap: 4 }}>
                              <button
                                className="btn btn-xs"
                                style={{ background: 'var(--lime)', color: '#000' }}
                                onClick={() => sendCampaign(c.id)}
                                disabled={sendingCampaignId === c.id}
                              >{sendingCampaignId === c.id ? '…' : 'Confirm Send'}</button>
                              <button className="btn btn-ghost btn-xs" onClick={() => setConfirmSendId(null)}>No</button>
                            </span>
                          ) : (
                            <button className="btn btn-ghost btn-xs" style={{ color: 'var(--lime)' }} onClick={() => setConfirmSendId(c.id)}>Send</button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {campaignList.length === 0 && (
                  <tr><td colSpan={7} style={{ color: 'var(--grey)', fontSize: 13, textAlign: 'center', padding: 24 }}>No campaigns yet</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'lists' && (
        <div className="tbl-section">
          <table>
            <thead><tr><th>List Name</th><th>Students</th><th>Type</th><th></th></tr></thead>
            <tbody>
              {emailListList.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 500 }}>{l.name}</td>
                  <td>{l.student_count ?? 0}</td>
                  <td><span className={`tag ${l.is_auto ? 'tag-lav' : 'tag-grey'}`} style={{ fontSize: 10 }}>{l.is_auto ? 'Auto-updated' : 'Manual'}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-xs" style={{ marginRight: 4 }} onClick={() => window.open(emailListsApi.exportUrl(l.id), '_blank')}>Export CSV</button>
                  </td>
                </tr>
              ))}
              {emailListList.length === 0 && (
                <tr><td colSpan={4} style={{ color: 'var(--grey)', fontSize: 13, textAlign: 'center', padding: 24 }}>No lists yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'automations' && (
        <div style={{ maxWidth: 700 }}>
          {automationList.length === 0 && (
            <div className="empty-state">No automations configured</div>
          )}
          {automationList.map(a => (
            <div key={a.id || a.slug} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: '1px solid #1a1a1a' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2 }}>{a.description || `Trigger: ${a.trigger_type}`}</div>
              </div>
              <div onClick={() => toggleAutomation(a)} style={{ width: 36, height: 20, borderRadius: 10, background: a.enabled ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: a.enabled ? 19 : 3, transition: 'left 0.2s' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'mailchimp' && <MailchimpTab />}

      {sendResult && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--card)', border: '1px solid var(--lime)', borderRadius: 10, padding: '12px 18px', fontSize: 13, zIndex: 2000, maxWidth: 320 }}>
          {sendResult}
          <button onClick={() => setSendResult(null)} style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey)', fontSize: 16 }}>×</button>
        </div>
      )}

      {(showCreateCampaign || editCampaign) && (
        <CreateCampaignModal
          existing={editCampaign || null}
          onClose={() => { setShowCreateCampaign(false); setEditCampaign(null) }}
          onCreated={refetchCamp}
        />
      )}
      {viewCampaign && <CampaignViewModal campaign={viewCampaign} onClose={() => setViewCampaign(null)} />}
    </div>
  )
}
