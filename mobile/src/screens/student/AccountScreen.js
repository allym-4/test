import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { payments } from '../../api'

function Row({ label, value }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value ?? '—'}</Text>
    </View>
  )
}

export default function AccountScreen() {
  const { user, logout } = useAuth()
  const { data: balanceData } = useApi(
    () => user ? payments.balance(user.id) : null, [user?.id]
  )

  function confirmLogout() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ])
  }

  const balance = balanceData?.balance
  const balanceNum = parseFloat(balance ?? 0)

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>
          {(user?.first_name?.[0] ?? '') + (user?.last_name?.[0] ?? '')}
        </Text>
      </View>
      <Text style={s.name}>{user?.first_name} {user?.last_name}</Text>
      <Text style={s.email}>{user?.email}</Text>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Account</Text>
        <Row label="Role" value={user?.role} />
        <Row label="Phone" value={user?.phone} />
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Billing</Text>
        <View style={[s.row, s.balanceRow]}>
          <Text style={s.rowLabel}>Account balance</Text>
          <Text style={[s.rowValue, balanceNum < 0 && s.negative, balanceNum > 0 && s.positive]}>
            {balance != null ? `$${Math.abs(balanceNum).toFixed(2)} ${balanceNum < 0 ? 'owed' : balanceNum > 0 ? 'credit' : ''}` : '—'}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout}>
        <Text style={s.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 24, paddingBottom: 50, alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  email: { fontSize: 14, color: '#6b7280', marginTop: 4, marginBottom: 24 },
  section: { width: '100%', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  balanceRow: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 15, color: '#374151' },
  rowValue: { fontSize: 15, color: '#111827', fontWeight: '500', textTransform: 'capitalize' },
  negative: { color: '#ef4444' },
  positive: { color: '#10b981' },
  logoutBtn: { marginTop: 8, width: '100%', borderWidth: 1.5, borderColor: '#ef4444', borderRadius: 12, padding: 14, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
})
