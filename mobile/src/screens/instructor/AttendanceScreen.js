import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { classes, attendance } from '../../api'

const STATUS_OPTIONS = [
  { key: 'present', label: 'Present', color: '#10b981', bg: '#d1fae5' },
  { key: 'absent', label: 'Absent', color: '#f59e0b', bg: '#fef3c7' },
  { key: 'no_show', label: 'No-show', color: '#ef4444', bg: '#fee2e2' },
  { key: 'late', label: 'Late', color: '#6366f1', bg: '#e0e7ff' },
]

function StudentRow({ record, onStatusChange, saving }) {
  const current = STATUS_OPTIONS.find(s => s.key === record.status) ?? STATUS_OPTIONS[0]
  return (
    <View style={s.studentRow}>
      <View style={s.studentInfo}>
        <Text style={s.studentName}>{record.student?.display_name ?? record.student?.email ?? 'Student'}</Text>
      </View>
      <View style={s.statusBtns}>
        {STATUS_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[s.statusBtn, record.status === opt.key && { backgroundColor: opt.bg }]}
            onPress={() => onStatusChange(record.student_id ?? record.student?.id, opt.key)}
            disabled={saving}
          >
            <Text style={[s.statusBtnText, record.status === opt.key && { color: opt.color }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

export default function AttendanceScreen() {
  const today = new Date().toISOString().slice(0, 10)
  const [selectedOccurrence, setSelectedOccurrence] = useState(null)
  const [register, setRegister] = useState({})
  const [saving, setSaving] = useState(false)

  const { data: occData, loading } = useApi(
    () => classes.occurrences({ date: today, instructor: 'me' }), []
  )
  const occurrences = occData?.results ?? occData ?? []

  const { data: enrData, loading: enrLoading, refetch: refetchEnr } = useApi(
    () => selectedOccurrence ? attendance.list({ occurrence: selectedOccurrence.id }) : null,
    [selectedOccurrence?.id]
  )

  const records = (enrData?.results ?? enrData ?? []).map(r => ({
    ...r,
    status: register[r.student_id ?? r.student?.id] ?? r.status ?? 'present',
  }))

  function handleStatusChange(studentId, status) {
    setRegister(prev => ({ ...prev, [studentId]: status }))
  }

  async function saveRegister() {
    if (!selectedOccurrence) return
    setSaving(true)
    try {
      const updatedRecords = records.map(r => ({
        student: r.student_id ?? r.student?.id,
        status: register[r.student_id ?? r.student?.id] ?? r.status ?? 'present',
      }))
      await attendance.bulkSave(selectedOccurrence.id, updatedRecords)
      Alert.alert('Saved', 'Attendance register saved.')
      setRegister({})
      refetchEnr()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not save register.')
    } finally {
      setSaving(false)
    }
  }

  if (!selectedOccurrence) {
    return (
      <View style={s.root}>
        <Text style={s.heading}>Today's Classes</Text>
        {loading && <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" />}
        {!loading && occurrences.length === 0 && (
          <Text style={s.empty}>No classes scheduled for today.</Text>
        )}
        <FlatList
          data={occurrences}
          keyExtractor={o => String(o.id)}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.occCard} onPress={() => setSelectedOccurrence(item)}>
              <Text style={s.occName}>{item.session?.name ?? 'Class'}</Text>
              <Text style={s.occMeta}>
                {item.start_time ? item.start_time.slice(0, 5) : ''}
                {item.session?.studio?.name ? `  ·  ${item.session.studio.name}` : ''}
              </Text>
              <Text style={s.occArrow}>Take register →</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    )
  }

  return (
    <View style={s.root}>
      <TouchableOpacity style={s.back} onPress={() => { setSelectedOccurrence(null); setRegister({}) }}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={s.heading}>{selectedOccurrence.session?.name}</Text>
      <Text style={s.subheading}>
        {new Date(selectedOccurrence.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
      </Text>

      {enrLoading
        ? <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" />
        : (
          <FlatList
            data={records}
            keyExtractor={r => String(r.id)}
            contentContainerStyle={s.list}
            ListEmptyComponent={<Text style={s.empty}>No students enrolled.</Text>}
            renderItem={({ item }) => (
              <StudentRow record={item} onStatusChange={handleStatusChange} saving={saving} />
            )}
          />
        )
      }

      {records.length > 0 && (
        <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={saveRegister} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save register</Text>}
        </TouchableOpacity>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827', padding: 16, paddingBottom: 4 },
  subheading: { fontSize: 14, color: '#6b7280', paddingHorizontal: 16, marginBottom: 8 },
  back: { padding: 16, paddingBottom: 4 },
  backText: { color: '#6366f1', fontWeight: '600', fontSize: 15 },
  list: { padding: 16, paddingBottom: 100 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  occCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  occName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  occMeta: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  occArrow: { fontSize: 13, color: '#6366f1', fontWeight: '600', marginTop: 8 },
  studentRow: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  studentInfo: { marginBottom: 10 },
  studentName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  statusBtns: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  statusBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#f3f4f6' },
  statusBtnText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  saveBtn: { position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#6366f1', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#a5b4fc' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
