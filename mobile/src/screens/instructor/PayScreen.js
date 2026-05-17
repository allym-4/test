import {
  View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { instructorPay } from '../../api'

function formatDate(d) {
  if (!d) return ''
  return new Date(d + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatPeriod(record) {
  if (record.period_start && record.period_end) {
    return `${formatDate(record.period_start)} – ${formatDate(record.period_end)}`
  }
  if (record.created_at) {
    return new Date(record.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  return ''
}

function PayRecord({ record }) {
  const isPaid = record.status === 'paid'
  return (
    <View style={s.recordRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.recordDesc}>{record.description || 'Payment'}</Text>
        <Text style={s.recordPeriod}>{formatPeriod(record)}</Text>
      </View>
      <View style={s.recordRight}>
        <View style={[s.statusBadge, isPaid ? s.statusPaid : s.statusPending]}>
          <Text style={[s.statusText, isPaid ? s.statusPaidText : s.statusPendingText]}>
            {isPaid ? 'Paid' : 'Pending'}
          </Text>
        </View>
        <Text style={[s.recordAmount, isPaid ? s.amountPaid : s.amountPending]}>
          ${parseFloat(record.amount || 0).toFixed(2)}
        </Text>
      </View>
    </View>
  )
}

export default function PayScreen() {
  const { data, loading, refetch } = useApi(() => instructorPay.list(), [])

  const records = Array.isArray(data) ? data : data?.results ?? []
  const total = records.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0)

  return (
    <View style={s.root}>
      <FlatList
        data={records}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#6366f1" />}
        ListHeaderComponent={
          <View>
            <Text style={s.heading}>Pay & Earnings</Text>
            <Text style={s.subheading}>Your payment history from the studio</Text>

            {/* Total card */}
            <View style={s.totalCard}>
              <Text style={s.totalLabel}>Total Earnings</Text>
              {loading
                ? <ActivityIndicator color="#6366f1" style={{ marginTop: 8 }} />
                : <Text style={s.totalAmount}>${total.toFixed(2)}</Text>
              }
            </View>

            {records.length > 0 && (
              <Text style={s.sectionLabel}>Payment Records</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={s.empty}>No pay records yet. Your studio admin will add payments here.</Text>
          ) : null
        }
        renderItem={({ item }) => <PayRecord record={item} />}
        ItemSeparatorComponent={() => <View style={s.separator} />}
      />
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  listContent: { padding: 16, paddingBottom: 40 },

  heading: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 2 },
  subheading: { fontSize: 13, color: '#6b7280', marginBottom: 16 },

  // Total card
  totalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#6366f1' },
  totalLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  totalAmount: { fontSize: 36, fontWeight: '800', color: '#6366f1' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  // Record rows
  recordRow: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  recordDesc: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 3 },
  recordPeriod: { fontSize: 12, color: '#9ca3af' },
  recordRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusPaid: { backgroundColor: '#d1fae5' },
  statusPending: { backgroundColor: '#fef3c7' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusPaidText: { color: '#065f46' },
  statusPendingText: { color: '#92400e' },
  recordAmount: { fontSize: 16, fontWeight: '800' },
  amountPaid: { color: '#10b981' },
  amountPending: { color: '#f59e0b' },

  separator: { height: 8 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 14 },
})
