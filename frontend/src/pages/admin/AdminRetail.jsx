import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { products as productsApi, orders as ordersApi, users, square as squareApi } from '../../api'
import '../StudentsPage.css'

const STATUS_STYLE = {
  pending_pickup: { label: 'Pending Pickup', cls: 'tag-amber' },
  picked_up: { label: 'Picked Up', cls: 'tag-lime' },
  cancelled: { label: 'Cancelled', cls: 'tag-grey' },
}

function NewOrderModal({ onClose, onSaved }) {
  const { data: studData } = useApi(() => users.list({ role: 'student' }))
  const { data: prodData } = useApi(() => productsApi.list())
  const students = studData?.results || []
  const allProducts = (prodData?.results || prodData || []).filter(p => p.is_active && p.stock > 0)

  const [studentId, setStudentId] = useState('')
  const [quantities, setQuantities] = useState({}) // { productId: qty }
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = allProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  const lineItems = allProducts.filter(p => quantities[p.id] > 0)
  const total = lineItems.reduce((s, p) => s + parseFloat(p.price) * (quantities[p.id] || 0), 0)
  const itemsSummary = lineItems.map(p => `${p.name} ×${quantities[p.id]}`).join(', ')

  function setQty(productId, val) {
    const n = Math.max(0, parseInt(val) || 0)
    setQuantities(q => ({ ...q, [productId]: n }))
  }

  async function submit(e) {
    e.preventDefault()
    if (lineItems.length === 0) return
    setSaving(true)
    try {
      const chosen = students.find(s => s.id === parseInt(studentId))
      await ordersApi.create({
        student: studentId ? parseInt(studentId) : null,
        student_name: chosen?.display_name || '',
        items: itemsSummary,
        total: total.toFixed(2),
        location,
        status: 'pending_pickup',
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { background: '#1a1a1a', border: '1px solid var(--border)', color: 'var(--white)', borderRadius: 8, padding: '8px 12px', fontFamily: 'inherit', fontSize: 13, width: '100%', boxSizing: 'border-box' }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 520 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>New Purchase</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <form className="sd-body" onSubmit={submit} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <div className="field">
            <label>Student</label>
            <select value={studentId} onChange={e => setStudentId(e.target.value)} style={inputStyle}>
              <option value="">— Walk-in / no student —</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
            </select>
          </div>

          {/* Product picker */}
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--grey)', marginBottom: 8, fontWeight: 700 }}>Products</div>
          <input
            style={{ ...inputStyle, marginBottom: 10 }}
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {allProducts.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16, padding: '12px 0' }}>No active products in stock. Add products first.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, maxHeight: 260, overflowY: 'auto' }}>
              {filtered.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#1a1a1a', border: `1px solid ${quantities[p.id] > 0 ? 'var(--lime)' : 'var(--border)'}`, borderRadius: 8, padding: '10px 12px' }}>
                  {p.image_url && (
                    <img src={p.image_url} alt={p.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--grey)' }}>${parseFloat(p.price).toFixed(2)} · {p.stock} in stock</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button type="button" className="btn btn-ghost btn-xs" style={{ padding: '2px 8px', fontSize: 16 }} onClick={() => setQty(p.id, (quantities[p.id] || 0) - 1)}>−</button>
                    <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{quantities[p.id] || 0}</span>
                    <button type="button" className="btn btn-ghost btn-xs" style={{ padding: '2px 8px', fontSize: 16 }} onClick={() => setQty(p.id, (quantities[p.id] || 0) + 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Order summary */}
          {lineItems.length > 0 && (
            <div style={{ background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 6 }}>Order Summary</div>
              {lineItems.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>{p.name} ×{quantities[p.id]}</span>
                  <span style={{ color: 'var(--lime)' }}>${(parseFloat(p.price) * quantities[p.id]).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontFamily: "'Archivo Black', sans-serif", fontSize: 15 }}>
                <span>Total</span>
                <span style={{ color: 'var(--lime)' }}>${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="field">
            <label>Location</label>
            <input style={inputStyle} value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. The Box, Rhapsody" />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-lime btn-sm" disabled={saving || lineItems.length === 0}>
              {saving ? 'Saving…' : `Create Order${total > 0 ? ` — $${total.toFixed(2)}` : ''}`}
            </button>
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
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(existing?.image_url || null)
  const [saving, setSaving] = useState(false)

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { name, sku, price: parseFloat(price), stock: parseInt(stock) || 0, category, is_active: isActive }
      let saved
      if (existing) {
        const res = await productsApi.update(existing.id, payload)
        saved = res.data
      } else {
        const res = await productsApi.create(payload)
        saved = res.data
      }
      // Upload image separately (multipart)
      if (imageFile) {
        await productsApi.uploadImage(saved.id, imageFile)
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sd-modal" style={{ maxWidth: 440 }}>
        <div className="sd-header">
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 17 }}>{existing ? 'Edit Product' : 'Add Product'}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="sd-body">
          <form onSubmit={submit}>
            {/* Image upload */}
            <div className="field">
              <label>Product Image</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Product" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: 8, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--grey)', fontSize: 20 }}>📷</div>
                )}
                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                  {imagePreview ? 'Change photo' : 'Upload photo'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                </label>
              </div>
            </div>

            <div className="field"><label>Name *</label><input value={name} onChange={e => setName(e.target.value)} required /></div>
            <div className="field"><label>SKU</label><input value={sku} onChange={e => setSku(e.target.value)} placeholder="Optional" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field"><label>Price ($) *</label><input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} required /></div>
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
              <button type="submit" className="btn btn-lime btn-sm" disabled={saving}>{saving ? 'Saving…' : existing ? 'Save Changes' : 'Add Product'}</button>
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
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  async function handleSquareSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await squareApi.sync()
      setSyncResult(res.data)
      refetch()
    } catch (e) {
      setSyncResult({ error: e.response?.data?.detail || 'Sync failed' })
    } finally {
      setSyncing(false)
    }
  }

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
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={handleSquareSync} disabled={syncing}>🔄 Sync with Square</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: 'product', existing: null })}>+ Add Product</button>
          <button className="btn btn-lime btn-sm" onClick={() => setModal({ type: 'order' })}>🛒 New Purchase</button>
        </div>
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

      <div style={{ background: 'rgba(176,160,255,0.06)', border: '1px solid rgba(176,160,255,0.2)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, fontSize: 13 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: syncResult?.error ? 'var(--red)' : syncResult && !syncResult.error ? 'var(--lime)' : 'var(--lav)', flexShrink: 0 }} />
        <span style={{ color: 'var(--grey)', flex: 1 }}>
          Square catalog sync — pull products from your Square POS.
          {syncResult?.error === 'Square not configured' && (
            <> <a href="/admin/settings" style={{ color: 'var(--lav)' }}>Add your Square Access Token in Settings →</a></>
          )}
        </span>
        {syncResult && !syncResult.error && (
          <span style={{ color: 'var(--lime)', fontSize: 12 }}>
            ✓ {syncResult.created} created · {syncResult.updated} updated · {syncResult.skipped} skipped
          </span>
        )}
        {syncResult?.error && syncResult.error !== 'Square not configured' && (
          <span style={{ color: 'var(--red)', fontSize: 12 }}>{syncResult.error}</span>
        )}
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
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: 6, background: '#1a1a1a', border: '1px solid var(--border)', flexShrink: 0 }} />
                      )}
                      <b>{p.name}</b>
                    </div>
                  </td>
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
                    <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)' }} onClick={() => deleteProduct(p.id)}>Archive</button>
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
