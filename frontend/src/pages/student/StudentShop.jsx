import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../contexts/AuthContext'
import { products, orders } from '../../api'

export default function StudentShop() {
  const { user } = useAuth()
  const { data: productsData, loading } = useApi(() => products.list())
  const { data: myOrdersData, refetch: refetchOrders } = useApi(() => orders.list())
  const [ordering, setOrdering] = useState(null) // productId
  const [orderSuccess, setOrderSuccess] = useState(null)
  const [orderError, setOrderError] = useState(null)
  const [activeCategory, setActiveCategory] = useState('all')

  const items = productsData?.results || productsData || []
  const myOrders = myOrdersData?.results || myOrdersData || []

  const categories = ['all', ...Array.from(new Set(items.map(p => p.category).filter(Boolean)))]
  const filtered = activeCategory === 'all' ? items : items.filter(p => p.category === activeCategory)

  async function handleOrder(product) {
    setOrdering(product.id)
    setOrderError(null)
    try {
      await orders.create({
        items: product.name,
        total: product.price,
        status: 'pending_pickup',
        notes: `Order for ${product.name}`,
      })
      setOrderSuccess(product.id)
      await refetchOrders()
      setTimeout(() => setOrderSuccess(null), 4000)
    } catch (e) {
      setOrderError(product.id)
      setTimeout(() => setOrderError(null), 4000)
    } finally {
      setOrdering(null)
    }
  }

  const pendingOrders = myOrders.filter(o => o.status === 'pending_pickup')

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 4 }}>Shop</div>
        <div style={{ fontSize: 13, color: 'var(--grey)' }}>Order apparel, accessories and equipment for pickup at the studio.</div>
      </div>

      {pendingOrders.length > 0 && (
        <div style={{ background: 'rgba(179,157,219,0.1)', border: '1px solid rgba(179,157,219,0.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--lav)', marginBottom: 8 }}>Pending pickup</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pendingOrders.map(o => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>{o.items}</span>
                <span style={{ color: 'var(--grey)' }}>${parseFloat(o.total).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 8 }}>Your order will be ready to collect at your next class.</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              background: activeCategory === cat ? 'var(--lime)' : 'transparent',
              color: activeCategory === cat ? '#000' : 'var(--grey)',
              border: '1px solid',
              borderColor: activeCategory === cat ? 'var(--lime)' : 'var(--border)',
              borderRadius: 20,
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--grey)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🛍️</div>
          <div style={{ fontSize: 14 }}>No items available right now.</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Check back soon — new stock is added regularly.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {filtered.map(product => {
            const isOrdering = ordering === product.id
            const isSuccess = orderSuccess === product.id
            const isError = orderError === product.id
            const outOfStock = product.stock === 0

            return (
              <div key={product.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {product.image ? (
                  <img src={product.image} alt={product.name} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                ) : (
                  <div style={{ height: 160, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>👗</div>
                )}
                <div style={{ padding: '14px 14px 16px' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{product.name}</div>
                  {product.category && (
                    <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'capitalize', marginBottom: 8 }}>{product.category}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--lime)' }}>${parseFloat(product.price).toFixed(2)}</div>
                    {outOfStock ? (
                      <span style={{ fontSize: 11, color: 'var(--grey)', background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px' }}>Out of stock</span>
                    ) : isSuccess ? (
                      <span style={{ fontSize: 12, color: 'var(--lime)', fontWeight: 600 }}>Ordered ✓</span>
                    ) : isError ? (
                      <span style={{ fontSize: 12, color: 'var(--red)' }}>Try again</span>
                    ) : (
                      <button
                        onClick={() => handleOrder(product)}
                        disabled={isOrdering}
                        style={{ background: 'var(--lime)', color: '#000', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: isOrdering ? 'default' : 'pointer', opacity: isOrdering ? 0.7 : 1 }}
                      >
                        {isOrdering ? '…' : 'Order'}
                      </button>
                    )}
                  </div>
                  {!outOfStock && product.stock <= 5 && product.stock > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 6 }}>Only {product.stock} left</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
