import { useState } from 'react'
import '../StudentsPage.css'

const PROMO_CODES = [
  { id: 1, code: 'NEWPOLE10', discount: '10%', type: 'Percentage', uses: 34, active: true },
  { id: 2, code: 'SUMMER25', discount: '$25', type: 'Fixed', uses: 12, active: true },
  { id: 3, code: 'FRIEND50', discount: '$50', type: 'Fixed', uses: 8, active: true },
  { id: 4, code: 'TRIAL0', discount: '100%', type: 'Percentage', uses: 22, active: false },
  { id: 5, code: 'BRING2', discount: '15%', type: 'Percentage', uses: 6, active: true },
  { id: 6, code: 'EARLYBIRD', discount: '$20', type: 'Fixed', uses: 18, active: false },
]

const VOUCHERS = [
  { id: 1, code: 'DPGIFT-8821', value: '$50', issued: '3 May 2025', redeemed: false },
  { id: 2, code: 'DPGIFT-4410', value: '$100', issued: '28 Apr 2025', redeemed: true },
  { id: 3, code: 'DPGIFT-7753', value: '$25', issued: '1 May 2025', redeemed: false },
]

const PRICING_TIERS = [
  { classes: '1 class/wk', price: 160, perClass: 40, savings: '—' },
  { classes: '2 classes/wk', price: 290, perClass: 36.25, savings: '$14' },
  { classes: '3 classes/wk', price: 390, perClass: 32.5, savings: '$45' },
  { classes: '4+ classes/wk', price: 470, perClass: 29.375, savings: '$90' },
]

function PromoModal({ existing, onClose, onSaved }) {
  const [code, setCode] = useState(existing?.code || '')
  const [discount, setDiscount] = useState(existing?.discount || '')
  const [type, setType] = useState(existing?.type || 'Percentage')
  const [active, setActive] = useState(existing?.active ?? true)

  function submit(e) {
    e.preventDefault()
    onSaved({ ...existing, code, discount, type, active })
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 400 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{existing ? 'Edit Code' : 'New Promo Code'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={submit}>
          <div className="field"><label>Code</label><input value={code} onChange={e => setCode(e.target.value.toUpperCase())} required style={{ fontFamily: 'monospace' }} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Type</label>
              <select value={type} onChange={e => setType(e.target.value)}>
                <option>Percentage</option>
                <option>Fixed</option>
              </select>
            </div>
            <div className="field"><label>Discount ({type === 'Percentage' ? '%' : '$'})</label><input value={discount} onChange={e => setDiscount(e.target.value)} required /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div onClick={() => setActive(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, background: active ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: active ? 19 : 3, transition: 'left 0.2s' }} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--grey)' }}>Active</span>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminOffers() {
  const [tab, setTab] = useState('pricing')
  const [codes, setCodes] = useState(PROMO_CODES)
  const [modal, setModal] = useState(null)

  function handleSaved(c) {
    if (c.id) {
      setCodes(cs => cs.map(x => x.id === c.id ? c : x))
    } else {
      setCodes(cs => [...cs, { ...c, id: Date.now(), uses: 0 }])
    }
    setModal(null)
  }

  function toggleCode(id) {
    setCodes(cs => cs.map(c => c.id === id ? { ...c, active: !c.active } : c))
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Offers</div>
          <div className="page-sub">Discounts, promo codes and gift vouchers</div>
        </div>
        {tab === 'promo' && <button className="btn btn-lime btn-sm" onClick={() => setModal({ existing: null })}>+ New Code</button>}
        {tab === 'vouchers' && <button className="btn btn-lime btn-sm" onClick={() => alert('Create gift voucher')}>+ Issue Voucher</button>}
      </div>

      <div className="subtabs" style={{ marginBottom: 24 }}>
        {[['pricing', 'Season Pricing'], ['promo', 'Promo Codes'], ['vouchers', 'Gift Vouchers'], ['referrals', 'Referrals']].map(([key, label]) => (
          <div key={key} className={`subtab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</div>
        ))}
      </div>

      {tab === 'pricing' && (
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 14, fontWeight: 600 }}>Multi-class Season Pricing</div>
          <div className="tbl-section">
            <table>
              <thead><tr><th>Classes / Week</th><th>Season Price</th><th>Per Class</th><th>Savings vs Single</th></tr></thead>
              <tbody>
                {PRICING_TIERS.map(t => (
                  <tr key={t.classes}>
                    <td style={{ fontWeight: 600 }}>{t.classes}</td>
                    <td style={{ color: 'var(--lime)', fontWeight: 600 }}>${t.price}</td>
                    <td style={{ color: 'var(--grey)' }}>${t.perClass.toFixed(2)}</td>
                    <td style={{ color: t.savings === '—' ? 'var(--grey)' : 'var(--lime)' }}>{t.savings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 10 }}>Prices are per 8-week season. Update in Settings → Pricing.</div>
        </div>
      )}

      {tab === 'promo' && (
        <div className="tbl-section">
          <table>
            <thead><tr><th>Code</th><th>Discount</th><th>Type</th><th>Uses</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {codes.map(c => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>{c.code}</td>
                  <td style={{ color: 'var(--lime)', fontWeight: 600 }}>{c.discount}</td>
                  <td style={{ color: 'var(--grey)', fontSize: 12 }}>{c.type}</td>
                  <td style={{ color: 'var(--grey)' }}>{c.uses}</td>
                  <td>
                    <div onClick={() => toggleCode(c.id)} style={{ width: 36, height: 20, borderRadius: 10, background: c.active ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', display: 'inline-block' }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: c.active ? 19 : 3, transition: 'left 0.2s' }} />
                    </div>
                  </td>
                  <td><button className="btn btn-ghost btn-xs" onClick={() => setModal({ existing: c })}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'vouchers' && (
        <div className="tbl-section">
          <table>
            <thead><tr><th>Code</th><th>Value</th><th>Issued</th><th>Status</th></tr></thead>
            <tbody>
              {VOUCHERS.map(v => (
                <tr key={v.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>{v.code}</td>
                  <td style={{ color: 'var(--lime)', fontWeight: 600 }}>{v.value}</td>
                  <td style={{ color: 'var(--grey)', fontSize: 12 }}>{v.issued}</td>
                  <td><span className={`tag ${v.redeemed ? 'tag-grey' : 'tag-lime'}`} style={{ fontSize: 10 }}>{v.redeemed ? 'Redeemed' : 'Active'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'referrals' && (
        <div>
          <div className="kpi-grid" style={{ marginBottom: 24 }}>
            {[['Total Referrals', '23', 'kpi-lav'], ['Pending Credits', '$350', 'kpi-amber'], ['Paid Out', '$800', 'kpi-lime'], ['Conversion', '68%', 'kpi-lime']].map(([label, val, cls]) => (
              <div key={label} className={`kpi ${cls}`}>
                <div className="kpi-label">{label}</div>
                <div className="kpi-value">{val}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 14, fontWeight: 600 }}>Recent Referrals</div>
          <div className="tbl-section">
            <table>
              <thead><tr><th>Referrer</th><th>Referred</th><th>Date</th><th>Status</th><th>Credit</th></tr></thead>
              <tbody>
                {[
                  ['Ruby Kim', 'Priya Sharma', '3 May', 'Converted', '$50'],
                  ['Mia Santos', 'Zoe Clarke', '28 Apr', 'Trial booked', 'Pending'],
                  ['Jess Malone', 'Emma Davis', '22 Apr', 'Converted', '$50'],
                ].map(([ref, referred, date, status, credit]) => (
                  <tr key={ref + referred}>
                    <td style={{ fontWeight: 500 }}>{ref}</td>
                    <td style={{ color: 'var(--grey)' }}>{referred}</td>
                    <td style={{ color: 'var(--grey)', fontSize: 12 }}>{date}</td>
                    <td><span className={`tag ${status === 'Converted' ? 'tag-lime' : 'tag-amber'}`} style={{ fontSize: 10 }}>{status}</span></td>
                    <td style={{ color: status === 'Converted' ? 'var(--lime)' : 'var(--grey)', fontWeight: 600 }}>{credit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && <PromoModal existing={modal.existing} onClose={() => setModal(null)} onSaved={handleSaved} />}
    </div>
  )
}
