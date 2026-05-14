import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { products as productsApi, orders as ordersApi, users } from '../../api'
import '../StudentsPage.css'

const STATUS_STYLE = {
  pending_pickup: { label: 'Pending Pickup', cls: 'tag-amber' },
  picked_up: { label: 'Picked Up', cls: 'tag-lime' },
  cancelled: { label: 'Cancelled', cls: 'tag-grey' },
}

function NewOrderModal({ onClose, onSaved }) {
  const { data: studData } = useApi(() => users.list({ role: 'student' }))
  const students = studData?.results || []

  const [studentId, setStudentId] = useState('')
  const [items, setItems] = useState('')
  const [total, setTotal] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const chosen = students.find(s => s.id === parseInt(studentId))
      await ordersApi.create({
        student: studentId ? parseInt(studentId) : null,
        student_name: chosen?.display_name || '',
        items,
        total: parseFloat(total),
        location,
        status: 'pending_pickup',
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 420 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>New Order</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={submit}>
          <div className="field">
            <label>Student</label>
            <select value={studentId} onChange={e => setStudentId(e.target.value)}>
              <option value="">— Walk-in / no student —</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
            </select>
          </div>
          <div className="field"><label>Items *</label><textarea rows={2} value={items} onChange={e => setItems(e.target.value)} placeholder="e.g. Grip Socks × 1, Crop Top (S) × 1" required /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Total ($) *</label><input type="number" step="0.01" min="0" value={total} onChange={e => setTotal(e.target.value)} required /></div>
            <div className="field"><label>Location</label><input value={location} onChange={e => setLocation(e.target.value)} placeholder="The Box / Rhapsody" /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Create Order'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProductModal({ existing, onClose, onSaved }) {
  const [name, setName] = useState(existing?.name || '')
  const [sku, setSku] = useState(existing?.sku || '')
  const [price, setPrice] = useState(existing?.price || '')
  const [stock, setStock] = useState(existing?.stock ?? '')
  const [category, setCategory] = useState(existing?.category || 'Accessories')
  const [isActive, setIsActive] = useState(existing?.is_active ?? true)
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { name, sku, price: parseFloat(price), stock: parseInt(stock) || 0, category, is_active: isActive }
      if (existing) {
        await productsApi.update(existing.id, payload)
      } else {
        await productsApi.create(payload)
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
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{existing ? 'Edit Product' : 'Add Product'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <form onSubmit={submit}>
            <div className="field"><label>Name</label><input value={name} onChange={e => setName(e.target.value)} required /></div>
            <div className="field"><label>SKU</label><input value={sku} onChange={e => setSku(e.target.value)} placeholder="Optional" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field"><label>Price ($)</label><input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} required /></div>
              <div className="field"><label>Stock</label><input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} /></div>
            </div>
            <div className="field">
              <label>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option>Apparel</option>
                <option>Accessories</option>
                <option>Equipment</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div onClick={() => setIsActive(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, background: isActive ? 'var(--lime)' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#000', position: 'absolute', top: 3, left: isActive ? 19 : 3, transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--grey)' }}>Active / for sale</span>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : existing ? 'Save' : 'Add Product'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function RestockModal({ product, onClose, onSaved }) {
  const [qty, setQty] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!qty) return
    setSaving(true)
    try {
      await productsApi.update(product.id, { stock: product.stock + parseInt(qty) })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 360 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>Restock — {product.name}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <p style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16 }}>Current stock: <b style={{ color: 'var(--white)' }}>{product.stock}</b></p>
          <form onSubmit={submit}>
            <div className="field"><label>Add quantity</label><input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} autoFocus required /></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Add Stock'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function AdminRetail() {
  const { data: prodData, loading, refetch } = useApi(() => productsApi.list(), [])
  const { data: orderData, refetch: refetchOrders } = useApi(() => ordersApi.list(), [])
  const productList = prodData?.results || prodData || []
  const orderList = orderData?.results || orderData || []

  const [tab, setTab] = useState('products')
  const [modal, setModal] = useState(null)

  const pendingPickup = orderList.filter(o => o.status === 'pending_pickup')
  const activeProducts = productList.filter(p => p.is_active)
  const lowStock = productList.filter(p => p.stock <= 6 && p.is_active)
  const totalRevenue = orderList.filter(o => o.status === 'picked_up').reduce((s, o) => s + parseFloat(o.total || 0), 0)

  async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return
    await productsApi.delete(id)
    refetch()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Retail</div>
          <div className="page-sub">Products, orders and in-studio pickups</div>
        </div>
        <button className="btn btn-lime btn-sm" onClick={() => setModal({ type: 'product', existing: null })}>+ Add Product</button>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {[
          ['Products', loading ? '…' : activeProducts.length, 'kpi-lime'],
          ['Pending Pickup', pendingPickup.length, pendingPickup.length > 0 ? 'kpi-amber' : 'kpi-lime'],
          ['Revenue (All Time)', `$${totalRevenue.toFixed(0)}`, 'kpi-lav'],
          ['Low Stock', loading ? '…' : lowStock.length, lowStock.length > 0 ? 'kpi-amber' : 'kpi-lime'],
        ].map(([label, val, cls]) => (
          <div key={label} className={`kpi ${cls}`}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, fontSize: 13 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#333', flexShrink: 0 }} />
        <span style={{ color: 'var(--grey)' }}>Square POS not connected — orders are managed manually. <button className="btn btn-ghost btn-xs" style={{ marginLeft: 8 }}>Connect Square</button></span>
      </div>

      <div className="subtabs" style={{ marginBottom: 20 }}>
        {[['products', 'Products'], ['orders', `Orders (${orderList.length})`], ['pending', `Pending Pickup (${pendingPickup.length})`]].map(([key, label]) => (
          <div key={key} className={`subtab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</div>
        ))}
      </div>

      {tab === 'products' && (
        <div className="tbl-section">
          <table>
            <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--grey)', padding: '24px 0' }}>Loading…</td></tr>}
              {productList.map(p => (
                <tr key={p.id}>
                  <td><b>{p.name}</b></td>
                  <td style={{ color: 'var(--grey)', fontSize: 11, fontFamily: 'monospace' }}>{p.sku || '—'}</td>
                  <td style={{ color: 'var(--grey)', fontSize: 12 }}>{p.category}</td>
                  <td style={{ color: 'var(--lime)', fontWeight: 600 }}>${parseFloat(p.price).toFixed(2)}</td>
                  <td>
                    <span style={{ color: p.stock === 0 ? 'var(--red)' : p.stock <= 6 ? 'var(--amber)' : 'var(--white)', fontWeight: 600, fontSize: 13 }}>
                      {p.stock === 0 ? 'Out of stock' : p.stock}
                    </span>
                  </td>
                  <td><span className={`tag ${p.is_active && p.stock > 0 ? 'tag-lime' : p.is_active && p.stock === 0 ? 'tag-red' : 'tag-grey'}`} style={{ fontSize: 10 }}>
                    {p.is_active && p.stock > 0 ? 'Active' : p.is_active && p.stock === 0 ? 'Out of stock' : 'Inactive'}
                  </span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-xs" style={{ marginRight: 4 }} onClick={() => setModal({ type: 'product', existing: p })}>Edit</button>
                    <button className="btn btn-ghost btn-xs" style={{ marginRight: 4 }} onClick={() => setModal({ type: 'restock', product: p })}>Restock</button>
                    <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }} onClick={() => deleteProduct(p.id)}>Del</button>
                  </td>
                </tr>
              ))}
              {!loading && productList.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--grey)', padding: '32px 0' }}>No products yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'orders' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: 'order' })}>+ New Order</button>
          </div>
          <div className="tbl-section">
            <table>
              <thead><tr><th>Order #</th><th>Student</th><th>Items</th><th>Total</th><th>Location</th><th>Date</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {orderList.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--grey)', padding: '32px 0' }}>No orders yet</td></tr>}
                {orderList.map(o => {
                  const s = STATUS_STYLE[o.status] || { label: o.status, cls: 'tag-grey' }
                  return (
                    <tr key={o.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--grey)' }}>#{o.id}</td>
                      <td><b>{o.student_display || o.student_name || '—'}</b></td>
                      <td style={{ fontSize: 12, color: 'var(--grey)', maxWidth: 180 }}>{o.items}</td>
                      <td style={{ color: 'var(--lime)', fontWeight: 600 }}>${parseFloat(o.total).toFixed(2)}</td>
                      <td style={{ fontSize: 12, color: 'var(--grey)' }}>{o.location || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--grey)' }}>{new Date(o.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</td>
                      <td><span className={`tag ${s.cls}`} style={{ fontSize: 10 }}>{s.label}</span></td>
                      <td>
                        {o.status === 'pending_pickup' && (
                          <button className="btn btn-lime btn-xs" onClick={async () => {
                            await ordersApi.update(o.id, { status: 'picked_up' })
                            refetchOrders()
                          }}>Mark Picked Up</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pendingPickup.length === 0 ? (
            <div className="empty-state"><div style={{ fontSize: 32, marginBottom: 12 }}>✓</div><div>No orders pending pickup</div></div>
          ) : pendingPickup.map(o => (
            <div key={o.id} style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 12, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{o.student_display || o.student_name || '—'}</div>
                <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 6 }}>{o.items}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--grey)' }}>
                  <span>Order #{o.id}</span>
                  {o.location && <span>{o.location}</span>}
                  <span>Ordered {new Date(o.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, color: 'var(--lime)' }}>${parseFloat(o.total).toFixed(2)}</div>
                <button className="btn btn-lime btn-sm" onClick={async () => {
                  await ordersApi.update(o.id, { status: 'picked_up' })
                  refetchOrders()
                }}>Mark Picked Up</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal?.type === 'product' && (
        <ProductModal existing={modal.existing} onClose={() => setModal(null)} onSaved={() => { setModal(null); refetch() }} />
      )}
      {modal?.type === 'restock' && (
        <RestockModal product={modal.product} onClose={() => setModal(null)} onSaved={() => { setModal(null); refetch() }} />
      )}
      {modal?.type === 'order' && (
        <NewOrderModal onClose={() => setModal(null)} onSaved={() => { setModal(null); refetchOrders() }} />
      )}
    </div>
  )
}
