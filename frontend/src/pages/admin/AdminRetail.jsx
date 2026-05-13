import { useState } from 'react'

const PRODUCTS = [
  { id: 1, name: 'Pole Grip Aid', sku: 'GRP-001', price: 18, stock: 24, category: 'Accessories', active: true },
  { id: 2, name: 'Duality Grip Socks', sku: 'SCK-001', price: 14, stock: 18, category: 'Apparel', active: true },
  { id: 3, name: 'Duality Crop Top — Black', sku: 'TOP-BLK', price: 45, stock: 12, category: 'Apparel', active: true },
  { id: 4, name: 'Duality Crop Top — Lime', sku: 'TOP-LIM', price: 45, stock: 6, category: 'Apparel', active: true },
  { id: 5, name: 'Pole Shorts — Black', sku: 'SHT-BLK', price: 55, stock: 9, category: 'Apparel', active: true },
  { id: 6, name: 'Water Bottle — 750ml', sku: 'BTL-750', price: 22, stock: 30, category: 'Accessories', active: true },
  { id: 7, name: 'Resistance Band Set', sku: 'RBS-001', price: 28, stock: 0, category: 'Equipment', active: false },
  { id: 8, name: 'Pole Cleaning Spray', sku: 'CLN-001', price: 12, stock: 15, category: 'Accessories', active: true },
]

const ORDERS = [
  { id: 1001, student: 'Lily Anderson', items: 'Grip Socks × 1, Grip Aid × 1', total: 32, status: 'pending_pickup', date: '12 May', location: 'The Box' },
  { id: 1002, student: 'Priya Sharma', items: 'Crop Top (Lime, S) × 1', total: 45, status: 'pending_pickup', date: '12 May', location: 'The Box' },
  { id: 1003, student: 'Katie Wu', items: 'Pole Shorts (M) × 1, Grip Aid × 1', total: 73, status: 'picked_up', date: '11 May', location: 'Rhapsody' },
  { id: 1004, student: 'Bianca Forde', items: 'Water Bottle × 2', total: 44, status: 'picked_up', date: '10 May', location: 'The Box' },
  { id: 1005, student: 'Zara Nguyen', items: 'Crop Top (Black, XS) × 1', total: 45, status: 'cancelled', date: '9 May', location: 'The Box' },
  { id: 1006, student: 'Mia Torres', items: 'Grip Aid × 2, Cleaning Spray × 1', total: 48, status: 'picked_up', date: '8 May', location: 'Rhapsody' },
]

const STATUS_STYLE = {
  pending_pickup: { label: 'Pending Pickup', cls: 'tag-amber' },
  picked_up: { label: 'Picked Up', cls: 'tag-lime' },
  cancelled: { label: 'Cancelled', cls: 'tag-grey' },
}

export default function AdminRetail() {
  const [tab, setTab] = useState('products')

  const pendingPickup = ORDERS.filter(o => o.status === 'pending_pickup')
  const totalRevenue = ORDERS.filter(o => o.status === 'picked_up').reduce((s, o) => s + o.total, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Retail</div>
          <div className="page-sub">Products, orders and in-studio pickups</div>
        </div>
        <button className="btn btn-lime btn-sm">+ Add Product</button>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {[
          ['Products', PRODUCTS.filter(p => p.active).length, 'kpi-lime'],
          ['Pending Pickup', pendingPickup.length, pendingPickup.length > 0 ? 'kpi-amber' : 'kpi-lime'],
          ['Revenue (May)', `$${totalRevenue}`, 'kpi-lav'],
          ['Low Stock', PRODUCTS.filter(p => p.stock <= 6 && p.active).length, 'kpi-amber'],
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
        {[['products', 'Products'], ['orders', 'Orders'], ['pending', `Pending Pickup (${pendingPickup.length})`]].map(([key, label]) => (
          <div key={key} className={`subtab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</div>
        ))}
      </div>

      {tab === 'products' && (
        <div className="tbl-section">
          <table>
            <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {PRODUCTS.map(p => (
                <tr key={p.id}>
                  <td><b>{p.name}</b></td>
                  <td style={{ color: 'var(--grey)', fontSize: 11, fontFamily: 'monospace' }}>{p.sku}</td>
                  <td style={{ color: 'var(--grey)', fontSize: 12 }}>{p.category}</td>
                  <td style={{ color: 'var(--lime)', fontWeight: 600 }}>${p.price}</td>
                  <td>
                    <span style={{ color: p.stock === 0 ? 'var(--red)' : p.stock <= 6 ? 'var(--amber)' : 'var(--white)', fontWeight: 600, fontSize: 13 }}>
                      {p.stock === 0 ? 'Out of stock' : p.stock}
                    </span>
                  </td>
                  <td><span className={`tag ${p.active && p.stock > 0 ? 'tag-lime' : p.active && p.stock === 0 ? 'tag-red' : 'tag-grey'}`} style={{ fontSize: 10 }}>{p.active && p.stock > 0 ? 'Active' : p.active && p.stock === 0 ? 'Out of stock' : 'Inactive'}</span></td>
                  <td>
                    <button className="btn btn-ghost btn-xs" style={{ marginRight: 4 }}>Edit</button>
                    <button className="btn btn-ghost btn-xs">Restock</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'orders' && (
        <div className="tbl-section">
          <table>
            <thead><tr><th>Order #</th><th>Student</th><th>Items</th><th>Total</th><th>Location</th><th>Date</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {ORDERS.map(o => {
                const s = STATUS_STYLE[o.status] || { label: o.status, cls: 'tag-grey' }
                return (
                  <tr key={o.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--grey)' }}>#{o.id}</td>
                    <td><b>{o.student}</b></td>
                    <td style={{ fontSize: 12, color: 'var(--grey)', maxWidth: 180 }}>{o.items}</td>
                    <td style={{ color: 'var(--lime)', fontWeight: 600 }}>${o.total}</td>
                    <td style={{ fontSize: 12, color: 'var(--grey)' }}>{o.location}</td>
                    <td style={{ fontSize: 12, color: 'var(--grey)' }}>{o.date}</td>
                    <td><span className={`tag ${s.cls}`} style={{ fontSize: 10 }}>{s.label}</span></td>
                    <td>
                      {o.status === 'pending_pickup' && <button className="btn btn-lime btn-xs">Mark Picked Up</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pendingPickup.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <div>No orders pending pickup</div>
            </div>
          ) : pendingPickup.map(o => (
            <div key={o.id} style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 12, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{o.student}</div>
                <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 6 }}>{o.items}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--grey)' }}>
                  <span>Order #{o.id}</span>
                  <span>{o.location}</span>
                  <span>Ordered {o.date}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, color: 'var(--lime)' }}>${o.total}</div>
                <button className="btn btn-lime btn-sm">Mark Picked Up</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
