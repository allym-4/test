import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, TextInput, FlatList,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { availability } from '../../api'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SLOTS = [
  { id: 'morning',   label: 'Morning',   sub: '9am–12pm' },
  { id: 'afternoon', label: 'Afternoon', sub: '12–5pm' },
  { id: 'evening',   label: 'Evening',   sub: '5–10pm' },
]

function makeGrid(slots) {
  const grid = {}
  DAYS.forEach((_, d) => {
    grid[d] = {}
    SLOTS.forEach(s => { grid[d][s.id] = false })
  })
  ;(slots || []).forEach(slot => {
    if (grid[slot.day_of_week] !== undefined) {
      grid[slot.day_of_week][slot.slot] = slot.available
    }
  })
  return grid
}

function AvailabilityTab({ availData, refetch }) {
  const [grid, setGrid] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (availData) setGrid(makeGrid(Array.isArray(availData) ? availData : availData?.results ?? []))
  }, [availData])

  function toggle(dayIdx, slotId) {
    setGrid(g => ({
      ...g,
      [dayIdx]: { ...g[dayIdx], [slotId]: !g[dayIdx]?.[slotId] },
    }))
  }

  async function save() {
    setSaving(true)
    try {
      const payload = []
      DAYS.forEach((_, d) => {
        SLOTS.forEach(s => {
          payload.push({ day_of_week: d, slot: s.id, available: grid[d]?.[s.id] ?? false })
        })
      })
      await availability.save(payload)
      await refetch()
      Alert.alert('Saved', 'Your availability has been updated.')
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not save availability.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.scrollContent}>
        {/* Grid header */}
        <View style={s.gridCard}>
          {/* Day header row */}
          <View style={s.headerRow}>
            <View style={s.slotLabelCell} />
            {DAYS.map(day => (
              <View key={day} style={s.dayCell}>
                <Text style={s.dayLabel}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Slot rows */}
          {SLOTS.map((slot, si) => (
            <View key={slot.id} style={[s.slotRow, si < SLOTS.length - 1 && s.slotRowBorder]}>
              <View style={s.slotLabelCell}>
                <Text style={s.slotLabel}>{slot.label}</Text>
                <Text style={s.slotSub}>{slot.sub}</Text>
              </View>
              {DAYS.map((_, dayIdx) => {
                const active = grid[dayIdx]?.[slot.id] ?? false
                return (
                  <TouchableOpacity
                    key={dayIdx}
                    style={[s.cell, active && s.cellActive]}
                    onPress={() => toggle(dayIdx, slot.id)}
                  >
                    <Text style={[s.cellText, active && s.cellTextActive]}>
                      {active ? '✓' : '–'}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          ))}
        </View>

        <Text style={s.hint}>Tap a cell to toggle your availability for that day and time.</Text>
      </ScrollView>

      <TouchableOpacity
        style={[s.saveBtn, saving && s.saveBtnDisabled]}
        onPress={save}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.saveBtnText}>Save Availability</Text>
        }
      </TouchableOpacity>
    </View>
  )
}

function TimeOffTab() {
  const { data: datesData, loading, refetch } = useApi(
    () => availability.unavailableDates.list(), []
  )
  const dates = Array.isArray(datesData) ? datesData : datesData?.results ?? []

  const [showAdd, setShowAdd] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reason, setReason] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  async function handleAdd() {
    if (!dateFrom) { Alert.alert('Required', 'Please enter a from date (YYYY-MM-DD).'); return }
    if (!dateTo) { Alert.alert('Required', 'Please enter a to date (YYYY-MM-DD).'); return }
    setAdding(true)
    try {
      await availability.unavailableDates.create({ date_from: dateFrom, date_to: dateTo, reason })
      setDateFrom('')
      setDateTo('')
      setReason('')
      setShowAdd(false)
      refetch()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not add time off.')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id) {
    Alert.alert('Remove', 'Remove this unavailable period?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setDeletingId(id)
          try {
            await availability.unavailableDates.delete(id)
            refetch()
          } catch (err) {
            Alert.alert('Error', err.response?.data?.detail || 'Could not remove.')
          } finally {
            setDeletingId(null)
          }
        },
      },
    ])
  }

  function formatDate(d) {
    if (!d) return ''
    return new Date(d + 'T00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={dates}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={s.scrollContent}
        refreshing={loading}
        onRefresh={refetch}
        ListHeaderComponent={
          showAdd ? (
            <View style={s.addCard}>
              <Text style={s.addCardTitle}>Add Time Off</Text>
              <Text style={s.fieldLabel}>From (YYYY-MM-DD)</Text>
              <TextInput
                style={s.input}
                value={dateFrom}
                onChangeText={setDateFrom}
                placeholder="2024-12-25"
                placeholderTextColor="#9ca3af"
                keyboardType="numbers-and-punctuation"
              />
              <Text style={s.fieldLabel}>To (YYYY-MM-DD)</Text>
              <TextInput
                style={s.input}
                value={dateTo}
                onChangeText={setDateTo}
                placeholder="2024-12-31"
                placeholderTextColor="#9ca3af"
                keyboardType="numbers-and-punctuation"
              />
              <Text style={s.fieldLabel}>Reason (optional)</Text>
              <TextInput
                style={[s.input, s.inputMulti]}
                value={reason}
                onChangeText={setReason}
                placeholder="e.g. Holiday, illness…"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />
              <View style={s.addCardBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setShowAdd(false)}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.submitBtn, adding && s.saveBtnDisabled]}
                  onPress={handleAdd}
                  disabled={adding}
                >
                  {adding
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.saveBtnText}>Add</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
              <Text style={s.addBtnText}>+ Add Time Off</Text>
            </TouchableOpacity>
          )
        }
        ListEmptyComponent={
          !loading ? <Text style={s.empty}>No time off scheduled.</Text> : null
        }
        renderItem={({ item }) => (
          <View style={s.dateCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.dateRange}>
                {formatDate(item.date_from)} – {formatDate(item.date_to)}
              </Text>
              {item.reason ? <Text style={s.dateReason}>{item.reason}</Text> : null}
            </View>
            <TouchableOpacity
              style={s.deleteBtn}
              onPress={() => handleDelete(item.id)}
              disabled={deletingId === item.id}
            >
              {deletingId === item.id
                ? <ActivityIndicator color="#ef4444" size="small" />
                : <Text style={s.deleteBtnText}>Remove</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  )
}

export default function AvailabilityScreen() {
  const [activeTab, setActiveTab] = useState('availability')
  const { data, loading, refetch } = useApi(() => availability.list(), [])

  const TABS = [
    { id: 'availability', label: 'Availability' },
    { id: 'timeoff', label: 'Time Off' },
  ]

  return (
    <View style={s.root}>
      <Text style={s.heading}>My Availability</Text>
      <Text style={s.subheading}>Set your weekly teaching schedule</Text>

      {/* Tabs */}
      <View style={s.tabRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[s.tab, activeTab === tab.id && s.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[s.tabText, activeTab === tab.id && s.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" />
      ) : activeTab === 'availability' ? (
        <AvailabilityTab availData={data} refetch={refetch} />
      ) : (
        <TimeOffTab />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 2 },
  subheading: { fontSize: 13, color: '#6b7280', paddingHorizontal: 16, marginBottom: 12 },

  // Tabs
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#e5e7eb', borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#6366f1' },

  // Availability grid
  scrollContent: { padding: 16, paddingBottom: 100 },
  gridCard: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  headerRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  slotLabelCell: { width: 72, padding: 10, justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#f3f4f6' },
  dayCell: { flex: 1, alignItems: 'center', padding: 10 },
  dayLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' },
  slotRow: { flexDirection: 'row' },
  slotRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  slotLabel: { fontSize: 11, fontWeight: '700', color: '#374151' },
  slotSub: { fontSize: 9, color: '#9ca3af', marginTop: 1 },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderLeftWidth: 1, borderLeftColor: '#f3f4f6' },
  cellActive: { backgroundColor: '#eef2ff' },
  cellText: { fontSize: 14, color: '#d1d5db' },
  cellTextActive: { color: '#6366f1', fontWeight: '700' },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 10, textAlign: 'center' },

  // Save button
  saveBtn: { position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#6366f1', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#a5b4fc' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Time Off tab
  addBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12, borderWidth: 1.5, borderColor: '#6366f1', borderStyle: 'dashed' },
  addBtnText: { color: '#6366f1', fontWeight: '700', fontSize: 15 },
  addCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  addCardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 12 },
  inputMulti: { height: 72, textAlignVertical: 'top' },
  addCardBtns: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: '#f3f4f6' },
  cancelBtnText: { fontWeight: '600', color: '#374151', fontSize: 14 },
  submitBtn: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: '#6366f1' },
  dateCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  dateRange: { fontSize: 14, fontWeight: '600', color: '#111827' },
  dateReason: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fee2e2', marginLeft: 10 },
  deleteBtnText: { fontSize: 12, fontWeight: '600', color: '#ef4444' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
})
