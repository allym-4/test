import { useState, useEffect } from 'react'
import { useApi } from '../../hooks/useApi'
import { promoCodes, giftCards, referrals, settings } from '../../api'
import '../StudentsPage.css'

// ─── Toggle switch ──────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: value ? 'var(--lime)' : '#333',
        cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
        display: 'inline-block', flexShrink: 0,
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: '50%', background: '#000',
        position: 'absolute', top: 3, left: value ? 19 : 3, transition: 'left 0.2s',
      }} />
    </div>
  )
}

// ─── Promo Code Modal ────────────────────────────────────────────────────────
function PromoModal({ existing, onClose, onSaved }) {
  const [code, setCode] = useState(existing?.code || '')
  const [discountType, setDiscountType] = useState(existing?.discount_type || 'percentage')
  const [discountValue, setDiscountValue] = useState(existing?.discount_value || '')
  const [appliesTo, setAppliesTo] = useState(existing?.applies_to || 'all')
  const [unlimited, setUnlimited] = useState(existing ? existing.max_uses === null : true)
  const [maxUses, setMaxUses] = useState(existing?.max_uses ?? '')
  const [expiresAt, setExpiresAt] = useState(existing?.expires_at || '')
  const [active, setActive] = useState(existing?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    const payload = {
      code: code.toUpperCase(),
      discount_type: discountType,
      discount_value: discountValue,
      applies_to: appliesTo,
      max_uses: unlimited ? null : (maxUses === '' ? null : Number(maxUses)),
      expires_at: expiresAt || null,
      is_active: active,
    }
    try {
      if (existing?.id) {
        await promoCodes.update(existing.id, payload)
      } else {
        await promoCodes.create(payload)
      }
      onSaved()
    } catch (e) {
      setErr(e.response?.data?.detail || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 420 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>
            {existing ? 'Edit Promo Code' : 'New Promo Code'}
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={submit}>
          {err && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{err}</div>}

          <div className="field">
            <label>Code</label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              required
              style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
              placeholder="e.g. SUMMER25"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Discount Type</label>
              <select value={discountType} onChange={e => setDiscountType(e.target.value)}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div className="field">
              <label>Value ({discountType === 'percentage' ? '%' : '$'})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={e => setDiscountValue(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field">
            <label>Applies To</label>
            <select value={appliesTo} onChange={e => setAppliesTo(e.target.value)}>
              <option value="all">All Classes</option>
              <option value="season">Season Enrolment</option>
              <option value="casual">Casual / Drop-in</option>
              <option value="workshop">Workshops &amp; Events</option>
            </select>
          </div>

          <div className="field">
            <label>Max Uses</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={unlimited}
                  onChange={e => setUnlimited(e.target.checked)}
                />
                Unlimited
              </label>
              {!unlimited && (
                <input
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={e => setMaxUses(e.target.value)}
                  placeholder="e.g. 100"
                  style={{ width: 100 }}
                />
              )}
            </div>
          </div>

          <div className="field">
            <label>Expiry Date (optional)</label>
            <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Toggle value={active} onChange={setActive} />
            <span style={{ fontSize: 13, color: 'var(--grey)' }}>Active</span>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Gift Voucher Modal ──────────────────────────────────────────────────────
function VoucherModal({ onClose, onSaved }) {
  const [issuedToName, setIssuedToName] = useState('')
  const [issuedToEmail, setIssuedToEmail] = useState('')
  const [value, setValue] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      const numVal = parseFloat(value)
      // Generate a simple code
      const code = 'DPGIFT-' + Math.random().toString(36).slice(2, 6).toUpperCase() + Math.floor(Math.random() * 9000 + 1000)
      await giftCards.create({
        issued_to_name: issuedToName,
        issued_to_email: issuedToEmail,
        value: numVal,
        balance: numVal,
        expires_at: expiresAt || null,
        code,
      })
      onSaved()
    } catch (e) {
      setErr(e.response?.data?.detail || JSON.stringify(e.response?.data) || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 400 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Issue Gift Voucher</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={submit}>
          {err && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <div className="field">
            <label>Recipient Name</label>
            <input value={issuedToName} onChange={e => setIssuedToName(e.target.value)} required placeholder="Full name" />
          </div>
          <div className="field">
            <label>Recipient Email</label>
            <input type="email" value={issuedToEmail} onChange={e => setIssuedToEmail(e.target.value)} required placeholder="email@example.com" />
          </div>
          <div className="field">
            <label>Value ($)</label>
            <input type="number" min="1" step="0.01" value={value} onChange={e => setValue(e.target.value)} required placeholder="e.g. 50" />
          </div>
          <div className="field">
            <label>Expiry Date (optional)</label>
            <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>
              {saving ? 'Issuing…' : 'Issue Voucher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Referral Detail Modal ───────────────────────────────────────────────────
function ReferralDetailModal({ referral, onClose, onCredited }) {
  const [saving, setSaving] = useState(false)

  async function markCredited() {
    setSaving(true)
    try {
      await referrals.update(referral.id, { status: 'credited' })
      onCredited()
    } finally {
      setSaving(false)
    }
  }

  const statusClass = { pending: 'tag-amber', active: 'tag-lav', credited: 'tag-lime' }[referral.status] || 'tag-grey'

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 400 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Referral Detail</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Referrer</div>
              <div style={{ fontWeight: 600 }}>{referral.referrer_name || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Referee</div>
              <div>{referral.referee_email}</div>
              {referral.referee_name && <div style={{ fontSize: 12, color: 'var(--grey)' }}>{referral.referee_name} (joined)</div>}
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Status</div>
                <span className={`tag ${statusClass}`}>{referral.status}</span>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Credit</div>
                <div style={{ color: 'var(--lime)', fontWeight: 600 }}>${referral.credit_amount}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Date</div>
                <div style={{ fontSize: 13 }}>{new Date(referral.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
            </div>
          </div>
          {referral.status !== 'credited' && (
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
              <button className="btn btn-lime btn-sm" onClick={markCredited} disabled={saving}>
                {saving ? 'Saving…' : 'Mark as Credited'}
              </button>
            </div>
          )}
          {referral.status === 'credited' && (
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdminOffers() {
  const [tab, setTab] = useState('pricing')
  const [promoModal, setPromoModal] = useState(null) // null | { existing: obj|null }
  const [voucherModal, setVoucherModal] = useState(false)
  const [referralDetail, setReferralDetail] = useState(null)
  const [toast, setToast] = useState(null)

  // Season pricing local state — loaded from StudioSettings.season_pricing_config
  const DEFAULT_SEASON = [
    { label: '1 class/week', price: '270', discount: '$33.75 per class' },
    { label: '2 classes/week', price: '440', discount: '$27.50 per class' },
    { label: '3 classes/week', price: '580', discount: '$24.17 per class + 1 practice/week' },
    { label: '4 classes/week', price: '700', discount: '$21.88 per class + unlimited practice + free locker' },
    { label: '5 classes/week', price: '800', discount: '$20.00 per class + unlimited practice + free locker' },
    { label: '6 classes/week', price: '900', discount: '$18.75 per class + unlimited practice + free locker' },
  ]
  const DEFAULT_SPECIAL = [
    { type: '1 class/week + Kiki', price: '420', notes: '+ 1 Kiki or Unravel class per week' },
    { type: '2 classes/week + Kiki', price: '560', notes: '+ 1 Kiki or Unravel class per week' },
    { type: '3 classes/week + Kiki', price: '680', notes: '+ 1 Kiki or Unravel class per week + 1 practice' },
  ]
  const [seasonPricing, setSeasonPricing] = useState(DEFAULT_SEASON)
  const [specialPricing, setSpecialPricing] = useState(DEFAULT_SPECIAL)
  const [savingPricing, setSavingPricing] = useState(false)

  // API data
  const { data: settingsData } = useApi(() => settings.get(), [])
  const { data: codesData, refetch: refetchCodes } = useApi(() => promoCodes.list(), [])
  const { data: cardsData, refetch: refetchCards } = useApi(() => giftCards.list(), [])
  const { data: referralsData, refetch: refetchReferrals } = useApi(() => referrals.list(), [])

  // Seed pricing from settings once loaded
  useEffect(() => {
    const cfg = settingsData?.season_pricing_config
    if (Array.isArray(cfg) && cfg.length > 0) {
      const season = cfg.filter(r => r.label)
      const special = cfg.filter(r => r.type)
      if (season.length) setSeasonPricing(season)
      if (special.length) setSpecialPricing(special)
    }
  }, [settingsData])

  const codes = codesData?.results || codesData || []
  const cards = cardsData?.results || cardsData || []
  const referralsList = referralsData?.results || referralsData || []

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Promo code actions
  async function deleteCode(id) {
    if (!window.confirm('Delete this promo code?')) return
    try {
      await promoCodes.delete(id)
      refetchCodes()
    } catch {
      showToast('Delete failed')
    }
  }

  async function toggleCodeActive(code) {
    try {
      await promoCodes.update(code.id, { is_active: !code.is_active })
      refetchCodes()
    } catch {
      showToast('Update failed')
    }
  }

  // Season pricing save
  async function savePricing() {
    setSavingPricing(true)
    try {
      await settings.save({ season_pricing_config: [...seasonPricing, ...specialPricing] })
      showToast('Pricing saved')
    } catch {
      showToast('Save failed')
    } finally {
      setSavingPricing(false)
    }
  }

  // Referral KPIs
  const totalReferrals = referralsList.length
  const pendingCredits = referralsList
    .filter(r => r.status === 'pending' || r.status === 'active')
    .reduce((sum, r) => sum + parseFloat(r.credit_amount || 0), 0)
  const paidOut = referralsList
    .filter(r => r.status === 'credited')
    .reduce((sum, r) => sum + parseFloat(r.credit_amount || 0), 0)
  const converted = referralsList.filter(r => r.status === 'credited').length
  const conversionRate = totalReferrals > 0 ? Math.round((converted / totalReferrals) * 100) : 0

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: 'var(--lime)', color: '#000', borderRadius: 8,
          padding: '10px 18px', fontWeight: 600, fontSize: 13,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>
          {toast}
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Offers</div>
          <div className="page-sub">Discounts, promo codes and gift vouchers</div>
        </div>
        {tab === 'promo' && (
          <button className="btn btn-lime btn-sm" onClick={() => setPromoModal({ existing: null })}>
            + New Code
          </button>
        )}
        {tab === 'vouchers' && (
          <button className="btn btn-lime btn-sm" onClick={() => setVoucherModal(true)}>
            + Issue Voucher
          </button>
        )}
      </div>

      <div className="subtabs" style={{ marginBottom: 24 }}>
        {[['pricing', 'Season Pricing'], ['promo', 'Promo Codes'], ['vouchers', 'Gift Vouchers'], ['referrals', 'Referrals']].map(([key, label]) => (
          <div key={key} className={`subtab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </div>
        ))}
      </div>

      {/* ── Season Pricing ── */}
      {tab === 'pricing' && (
        <div style={{ display: 'grid', gap: 32 }}>
          {/* Season Classes */}
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 14, fontWeight: 600 }}>
              Season Classes
            </div>
            <div className="tbl-section">
              <table>
                <thead>
                  <tr>
                    <th>Classes Per Week</th>
                    <th>Price ($)</th>
                    <th>Discount Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {seasonPricing.map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{row.label}</td>
                      <td>
                        <input
                          type="number"
                          value={row.price}
                          onChange={e => setSeasonPricing(prev => prev.map((r, j) => j === i ? { ...r, price: e.target.value } : r))}
                          style={{ width: 90, background: 'transparent', border: '1px solid #333', borderRadius: 4, padding: '4px 8px', color: 'var(--lime)', fontWeight: 600 }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.discount}
                          onChange={e => setSeasonPricing(prev => prev.map((r, j) => j === i ? { ...r, discount: e.target.value } : r))}
                          style={{ width: 200, background: 'transparent', border: '1px solid #333', borderRadius: 4, padding: '4px 8px', color: 'var(--grey)', fontSize: 13 }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-lime btn-sm" onClick={savePricing} disabled={savingPricing}>
                {savingPricing ? 'Saving…' : 'Save Pricing'}
              </button>
            </div>
          </div>

          {/* Kiki / Unravel & Special Format */}
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 14, fontWeight: 600 }}>
              Kiki / Unravel &amp; Special Format
            </div>
            <div className="tbl-section">
              <table>
                <thead>
                  <tr>
                    <th>Class Type</th>
                    <th>Price ($/session)</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {specialPricing.map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{row.type}</td>
                      <td>
                        <input
                          type="number"
                          value={row.price}
                          onChange={e => setSpecialPricing(prev => prev.map((r, j) => j === i ? { ...r, price: e.target.value } : r))}
                          style={{ width: 90, background: 'transparent', border: '1px solid #333', borderRadius: 4, padding: '4px 8px', color: 'var(--lime)', fontWeight: 600 }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.notes}
                          onChange={e => setSpecialPricing(prev => prev.map((r, j) => j === i ? { ...r, notes: e.target.value } : r))}
                          style={{ width: 200, background: 'transparent', border: '1px solid #333', borderRadius: 4, padding: '4px 8px', color: 'var(--grey)', fontSize: 13 }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--grey)' }}>
                Bundled season prices including Kiki or Unravel add-on.
              </div>
              <button className="btn btn-lime btn-sm" onClick={savePricing} disabled={savingPricing}>
                {savingPricing ? 'Saving…' : 'Save Pricing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Promo Codes ── */}
      {tab === 'promo' && (
        <div className="tbl-section">
          {codes.length === 0 ? (
            <div style={{ padding: '32px 24px', color: 'var(--grey)', textAlign: 'center', fontSize: 14 }}>
              No promo codes yet. Click + New Code to create one.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Applies To</th>
                  <th>Uses</th>
                  <th>Expiry</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {codes.map(c => {
                  const discountLabel = c.discount_type === 'percentage'
                    ? `${c.discount_value}%`
                    : `$${c.discount_value}`
                  const appliesToLabels = { all: 'All Classes', season: 'Season', casual: 'Casual', workshop: 'Workshops' }
                  return (
                    <tr key={c.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>{c.code}</td>
                      <td style={{ color: 'var(--lime)', fontWeight: 600 }}>{discountLabel}</td>
                      <td style={{ color: 'var(--grey)', fontSize: 12 }}>{appliesToLabels[c.applies_to] || c.applies_to}</td>
                      <td style={{ color: 'var(--grey)', fontSize: 13 }}>{c.uses_display || `${c.current_uses} / ${c.max_uses ?? 'unlimited'}`}</td>
                      <td style={{ color: 'var(--grey)', fontSize: 12 }}>{c.expires_at || '—'}</td>
                      <td>
                        <Toggle value={c.is_active} onChange={() => toggleCodeActive(c)} />
                      </td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => setPromoModal({ existing: c })}>Edit</button>
                        <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => deleteCode(c.id)}>Delete</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Gift Vouchers ── */}
      {tab === 'vouchers' && (
        <div className="tbl-section">
          {cards.length === 0 ? (
            <div style={{ padding: '32px 24px', color: 'var(--grey)', textAlign: 'center', fontSize: 14 }}>
              No gift vouchers yet. Click + Issue Voucher to create one.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Issued To</th>
                  <th>Value</th>
                  <th>Balance</th>
                  <th>Expiry</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {cards.map(v => {
                  const isActive = v.is_active && parseFloat(v.balance) > 0
                  return (
                    <tr key={v.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>{v.code}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{v.issued_to_name || '—'}</div>
                        {v.issued_to_email && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{v.issued_to_email}</div>}
                      </td>
                      <td style={{ color: 'var(--lime)', fontWeight: 600 }}>${v.value}</td>
                      <td style={{ color: parseFloat(v.balance) > 0 ? 'var(--lime)' : 'var(--grey)' }}>${v.balance}</td>
                      <td style={{ color: 'var(--grey)', fontSize: 12 }}>{v.expires_at || '—'}</td>
                      <td>
                        <span className={`tag ${isActive ? 'tag-lime' : 'tag-grey'}`} style={{ fontSize: 10 }}>
                          {isActive ? 'Active' : 'Redeemed'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Referrals ── */}
      {tab === 'referrals' && (
        <div>
          <div className="kpi-grid" style={{ marginBottom: 24 }}>
            <div className="kpi kpi-lav">
              <div className="kpi-label">Total Referrals</div>
              <div className="kpi-value">{totalReferrals}</div>
            </div>
            <div className="kpi kpi-amber">
              <div className="kpi-label">Pending Credits</div>
              <div className="kpi-value">${pendingCredits.toFixed(0)}</div>
            </div>
            <div className="kpi kpi-lime">
              <div className="kpi-label">Paid Out</div>
              <div className="kpi-value">${paidOut.toFixed(0)}</div>
            </div>
            <div className="kpi kpi-lime">
              <div className="kpi-label">Conversion</div>
              <div className="kpi-value">{conversionRate}%</div>
            </div>
          </div>

          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 14, fontWeight: 600 }}>
            Recent Referrals
          </div>

          {referralsList.length === 0 ? (
            <div style={{ padding: '32px 24px', color: 'var(--grey)', textAlign: 'center', fontSize: 14 }}>
              No referrals yet. Share your referral code with students.
            </div>
          ) : (
            <div className="tbl-section">
              <table>
                <thead>
                  <tr>
                    <th>Referrer</th>
                    <th>Referred</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {referralsList.map(r => {
                    const statusClass = { pending: 'tag-amber', active: 'tag-lav', credited: 'tag-lime' }[r.status] || 'tag-grey'
                    return (
                      <tr key={r.id}>
                        <td>
                          <span
                            style={{ fontWeight: 500, cursor: 'pointer', borderBottom: '1px dashed var(--grey)' }}
                            onClick={() => setReferralDetail(r)}
                          >
                            {r.referrer_name || '—'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--grey)' }}>{r.referee_email}</td>
                        <td style={{ color: 'var(--grey)', fontSize: 12 }}>
                          {new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </td>
                        <td><span className={`tag ${statusClass}`} style={{ fontSize: 10 }}>{r.status}</span></td>
                        <td style={{ color: r.status === 'credited' ? 'var(--lime)' : 'var(--grey)', fontWeight: 600 }}>
                          ${r.credit_amount}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {promoModal !== null && (
        <PromoModal
          existing={promoModal.existing}
          onClose={() => setPromoModal(null)}
          onSaved={() => { setPromoModal(null); refetchCodes(); showToast(promoModal.existing ? 'Promo code updated' : 'Promo code created') }}
        />
      )}

      {voucherModal && (
        <VoucherModal
          onClose={() => setVoucherModal(false)}
          onSaved={() => { setVoucherModal(false); refetchCards(); showToast('Gift voucher created') }}
        />
      )}

      {referralDetail && (
        <ReferralDetailModal
          referral={referralDetail}
          onClose={() => setReferralDetail(null)}
          onCredited={() => { setReferralDetail(null); refetchReferrals(); showToast('Referral marked as credited') }}
        />
      )}
    </div>
  )
}
