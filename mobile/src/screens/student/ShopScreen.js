import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../contexts/AuthContext'
import { products, orders } from '../../api'

const T = {
  bg: '#000', card: '#111', border: '#222',
  text: '#fff', muted: '#666', lime: '#ccff00', red: '#ff4444', amber: '#ffaa44',
}

export default function ShopScreen({ navigation }) {
  const { user } = useAuth()
  const { data: productsData, loading } = useApi(() => products.list(), [])
  const { data: myOrdersData, refetch: refetchOrders } = useApi(() => orders.list(), [])
  const [ordering, setOrdering] = useState(null)
  const [orderSuccess, setOrderSuccess] = useState({})
  const [activeCategory, setActiveCategory] = useState('all')

  const items = productsData?.results ?? productsData ?? []
  const myOrders = myOrdersData?.results ?? myOrdersData ?? []
  const pendingOrders = myOrders.filter(o => o.status === 'pending_pickup')

  const categories = ['all', ...Array.from(new Set(items.map(p => p.category).filter(Boolean)))]
  const filtered = activeCategory === 'all' ? items : items.filter(p => p.category === activeCategory)

  async function handleOrder(product) {
    setOrdering(product.id)
    try {
      await orders.create({
        items: product.name,
        total: product.price,
        status: 'pending_pickup',
      })
      setOrderSuccess(prev => ({ ...prev, [product.id]: true }))
      await refetchOrders()
      setTimeout(() => setOrderSuccess(prev => ({ ...prev, [product.id]: false })), 4000)
    } catch {
      Alert.alert('Error', 'Could not place your order. Please try again.')
    } finally {
      setOrdering(null)
    }
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.heading}>Shop</Text>
      <Text style={s.sub}>Order apparel and accessories for pickup at the studio.</Text>

      {pendingOrders.length > 0 && (
        <View style={s.pendingCard}>
          <Text style={s.pendingLabel}>Pending pickup</Text>
          {pendingOrders.map(o => (
            <View key={o.id} style={s.pendingRow}>
              <Text style={s.pendingItem}>{o.items}</Text>
              <Text style={s.pendingPrice}>${parseFloat(o.total).toFixed(2)}</Text>
            </View>
          ))}
          <Text style={s.pendingNote}>Ready to collect at your next class.</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catBar} contentContainerStyle={{ gap: 8 }}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            onPress={() => setActiveCategory(cat)}
            style={[s.catBtn, activeCategory === cat && s.catBtnActive]}
          >
            <Text style={[s.catText, activeCategory === cat && s.catTextActive]} numberOfLines={1}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={T.lime} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>🛍️</Text>
          <Text style={s.emptyTitle}>No items available right now</Text>
          <Text style={s.emptySub}>Check back soon — new stock is added regularly.</Text>
        </View>
      ) : (
        <View style={s.grid}>
          {filtered.map(product => {
            const outOfStock = product.stock === 0
            const isOrdering = ordering === product.id
            const isSuccess = orderSuccess[product.id]

            return (
              <View key={product.id} style={s.card}>
                {product.image ? (
                  <Image source={{ uri: product.image }} style={s.productImage} resizeMode="cover" />
                ) : (
                  <View style={s.productImagePlaceholder}>
                    <Text style={{ fontSize: 32 }}>👗</Text>
                  </View>
                )}
                <View style={s.cardBody}>
                  <Text style={s.productName} numberOfLines={2}>{product.name}</Text>
                  {!!product.category && (
                    <Text style={s.productCategory}>{product.category}</Text>
                  )}
                  <View style={s.cardFooter}>
                    <Text style={s.price}>${parseFloat(product.price).toFixed(2)}</Text>
                    {outOfStock ? (
                      <Text style={s.outOfStock}>Out of stock</Text>
                    ) : isSuccess ? (
                      <Text style={s.successText}>Ordered ✓</Text>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleOrder(product)}
                        disabled={isOrdering}
                        style={[s.orderBtn, isOrdering && { opacity: 0.6 }]}
                      >
                        {isOrdering
                          ? <ActivityIndicator color="#000" size="small" />
                          : <Text style={s.orderBtnText}>Order</Text>}
                      </TouchableOpacity>
                    )}
                  </View>
                  {!outOfStock && product.stock <= 5 && product.stock > 0 && (
                    <Text style={s.lowStock}>Only {product.stock} left</Text>
                  )}
                </View>
              </View>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontFamily: 'Archivo Black', fontSize: 24, color: T.text, marginBottom: 4 },
  sub: { fontSize: 13, color: T.muted, marginBottom: 20 },
  pendingCard: { backgroundColor: 'rgba(124,58,237,0.1)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', borderRadius: 12, padding: 16, marginBottom: 20 },
  pendingLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: '#a78bfa', marginBottom: 10 },
  pendingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  pendingItem: { fontSize: 13, color: T.text },
  pendingPrice: { fontSize: 13, color: T.muted },
  pendingNote: { fontSize: 11, color: T.muted, marginTop: 8 },
  catBar: { marginBottom: 20 },
  catBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: T.border, backgroundColor: 'transparent' },
  catBtnActive: { backgroundColor: T.lime, borderColor: T.lime },
  catText: { fontSize: 12, fontWeight: '600', color: T.muted, textTransform: 'capitalize' },
  catTextActive: { color: '#000' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 15, color: T.text, fontWeight: '600', marginBottom: 6 },
  emptySub: { fontSize: 13, color: T.muted, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%', backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: 12, overflow: 'hidden' },
  productImage: { width: '100%', height: 130 },
  productImagePlaceholder: { height: 130, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' },
  cardBody: { padding: 12 },
  productName: { fontSize: 13, fontWeight: '700', color: T.text, marginBottom: 2 },
  productCategory: { fontSize: 11, color: T.muted, textTransform: 'capitalize', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  price: { fontSize: 15, fontWeight: '700', color: T.lime },
  outOfStock: { fontSize: 11, color: T.muted },
  successText: { fontSize: 12, color: T.lime, fontWeight: '700' },
  orderBtn: { backgroundColor: T.lime, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, minWidth: 60, alignItems: 'center' },
  orderBtnText: { color: '#000', fontWeight: '700', fontSize: 12 },
  lowStock: { fontSize: 11, color: T.amber, marginTop: 6 },
})
