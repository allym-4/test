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
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#ccff00" />}
        ListHeaderComponent={
          <View>
            <Text style={s.heading}>Pay & Earnings</Text>
            <Text style={s.subheading}>Your payment history from the studio</Text>

            <View style={s.totalCard}>
              <Text style={s.totalLabel}>Total Earnings</Text>
              {loading
                ? <ActivityIndicator color="#ccff00" style={{ marginTop: 8 }} />
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
  root: { flex: 1, backgroundColor: '#000' },
  listContent: { padding: 16, paddingBottom: 40 },

  heading: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 },
  subheading: { fontSize: 13, color: '#888', marginBottom: 16 },

  totalCard: { backgroundColor: '#111', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#333', borderLeftWidth: 4, borderLeftColor: '#ccff00' },
  totalLabel: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  totalAmount: { fontSize: 36, fontWeight: '800', color: '#ccff00' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  recordRow: { backgroundColor: '#111', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  recordDesc: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 3 },
  recordPeriod: { fontSize: 12, color: '#555' },
  recordRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusPaid: { backgroundColor: 'rgba(204,255,0,0.12)' },
  statusPending: { backgroundColor: 'rgba(245,158,11,0.12)' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusPaidText: { color: '#ccff00' },
  statusPendingText: { color: '#f59e0b' },
  recordAmount: { fontSize: 16, fontWeight: '800' },
  amountPaid: { color: '#ccff00' },
  amountPending: { color: '#f59e0b' },

  separator: { height: 8 },
  empty: { textAlign: 'center', color: '#555', marginTop: 40, fontSize: 14 },
})
