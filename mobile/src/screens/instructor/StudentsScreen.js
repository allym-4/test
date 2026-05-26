import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Modal, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import client from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { users, payments as paymentsApi, enrolments } from '../../api'

const LEVELS = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6']

function AddStudentModal({ visible, onClose, onSuccess }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [level, setLevel] = useState('Level 1')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function reset() {
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
    setLevel('Level 1')
    setSaving(false)
    setError('')
    setSuccess(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit() {
    if (!firstName.trim()) { setError('First name is required.'); return }
    if (!lastName.trim()) { setError('Last name is required.'); return }
    if (!email.trim()) { setError('Email is required.'); return }
    setError('')
    setSaving(true)
    try {
      await client.post('/api/users/students/create/', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        level,
      })
      setSuccess(true)
      setTimeout(() => {
        reset()
        onSuccess()
        onClose()
      }, 1200)
    } catch (err) {
      const detail = err.response?.data?.detail
        || (err.response?.data && typeof err.response.data === 'object'
          ? Object.values(err.response.data).flat().join(' ')
          : null)
        || 'Could not create student. Please try again.'
      setError(detail)
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={m.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={m.sheet}>
          <View style={m.header}>
            <Text style={m.title}>Add Student</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={m.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {success ? (
              <View style={m.successBox}>
                <Text style={m.successText}>Student created successfully!</Text>
              </View>
            ) : (
              <>
                <Text style={m.label}>First Name *</Text>
                <TextInput
                  style={m.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor="#555"
                  autoCapitalize="words"
                />

                <Text style={m.label}>Last Name *</Text>
                <TextInput
                  style={m.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor="#555"
                  autoCapitalize="words"
                />

                <Text style={m.label}>Email *</Text>
                <TextInput
                  style={m.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="email@example.com"
                  placeholderTextColor="#555"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={m.label}>Phone (optional)</Text>
                <TextInput
                  style={m.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="e.g. 0400 000 000"
                  placeholderTextColor="#555"
                  keyboardType="phone-pad"
                />

                <Text style={m.label}>Level</Text>
                <View style={m.levelRow}>
                  {LEVELS.map(lvl => (
                    <TouchableOpacity
                      key={lvl}
                      style={[m.levelChip, level === lvl && m.levelChipActive]}
                      onPress={() => setLevel(lvl)}
                    >
                      <Text style={[m.levelChipText, level === lvl && m.levelChipTextActive]}>
                        {lvl}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {error ? <Text style={m.errorText}>{error}</Text> : null}

                <TouchableOpacity
                  style={[m.submitBtn, saving && m.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#000" size="small" />
                    : <Text style={m.submitBtnText}>Add Student</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function StudentRow({ student, balance, isEnrolled, onPress }) {
  const name = student.display_name || `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || student.email || 'Student'
  const initial = (student.first_name || student.display_name || '?')[0].toUpperCase()

  const balNum = balance !== undefined ? balance : null
  const isOwing = balNum !== null && balNum < 0
  const hasCredit = balNum !== null && balNum > 0

  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initial}</Text>
      </View>
      <View style={s.rowInfo}>
        <View style={s.rowTop}>
          <Text style={s.name} numberOfLines={1}>{name}</Text>
          <View style={[s.enrollBadge, isEnrolled ? s.enrollBadgeActive : s.enrollBadgeInactive]}>
            <Text style={[s.enrollBadgeText, isEnrolled ? s.enrollBadgeTextActive : s.enrollBadgeTextInactive]}>
              {isEnrolled ? 'Enrolled' : 'Not enrolled'}
            </Text>
          </View>
        </View>
        {student.pronouns ? <Text style={s.pronouns}>{student.pronouns}</Text> : null}
        {student.email ? <Text style={s.email} numberOfLines={1}>{student.email}</Text> : null}
        {balNum !== null && (
          <Text style={[s.balText, isOwing ? s.balOwing : hasCredit ? s.balCredit : s.balClear]}>
            {isOwing ? `⚠ $${Math.abs(balNum).toFixed(2)} owing` : hasCredit ? `$${balNum.toFixed(2)} credit` : '$0 clear'}
          </Text>
        )}
      </View>
      <Text style={s.chevron}>›</Text>
    </TouchableOpacity>
  )
}

export default function StudentsScreen({ navigation }) {
  const [search, setSearch] = useState('')
  const [balances, setBalances] = useState({})
  const [enrolledIds, setEnrolledIds] = useState(new Set())
  const [addModalVisible, setAddModalVisible] = useState(false)
  const { data, loading, error, refetch } = useApi(() => users.list({ role: 'student' }), [])
  const allStudents = data?.results ?? data ?? []

  // Fetch all active enrolments once to determine enrolled status
  useEffect(() => {
    enrolments.list({ status: 'active', page_size: 500 })
      .then(res => {
        const items = res.data?.results ?? res.data ?? []
        setEnrolledIds(new Set(items.map(e => e.student ?? e.student_id)))
      })
      .catch(() => {})
  }, [])

  // Fetch balances for all students
  useEffect(() => {
    if (!allStudents.length) return
    allStudents.forEach(student => {
      paymentsApi.balance(student.id)
        .then(res => setBalances(prev => ({ ...prev, [student.id]: parseFloat(res.data.balance) })))
        .catch(() => {})
    })
  }, [allStudents.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = search.trim()
    ? allStudents.filter(s => {
        const q = search.toLowerCase()
        const name = (s.display_name || `${s.first_name ?? ''} ${s.last_name ?? ''}`).toLowerCase()
        const email = (s.email ?? '').toLowerCase()
        return name.includes(q) || email.includes(q)
      })
    : allStudents

  return (
    <View style={s.root}>
      <AddStudentModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSuccess={refetch}
      />
      <View style={s.headingRow}>
        <Text style={s.heading}>Students</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setAddModalVisible(true)}>
          <Text style={s.addBtnText}>＋</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={s.searchBar}
        placeholder="Search by name or email..."
        placeholderTextColor="#555"
        value={search}
        onChangeText={setSearch}
        clearButtonMode="while-editing"
      />

      {loading && !allStudents.length ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#ccff00" />
      ) : error ? (
        <Text style={s.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#ccff00" />}
          ListEmptyComponent={
            <Text style={s.emptyText}>
              {search ? 'No students match your search.' : 'No students found.'}
            </Text>
          }
          renderItem={({ item }) => (
            <StudentRow
              student={item}
              balance={balances[item.id]}
              isEnrolled={enrolledIds.has(item.id)}
              onPress={() => navigation.navigate('StudentDetail', {
                studentId: item.id,
                studentName: item.display_name || `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() || 'Student',
              })}
            />
          )}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16 },
  heading: { fontSize: 20, fontWeight: '700', color: '#fff', padding: 16, paddingBottom: 8 },
  addBtn: {
    backgroundColor: '#ccff00', borderRadius: 20,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#000', fontWeight: '700', fontSize: 20, lineHeight: 24 },
  searchBar: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#111', borderWidth: 1, borderColor: '#333',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: '#fff',
  },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  emptyText: { textAlign: 'center', color: '#555', marginTop: 40 },
  errorText: { textAlign: 'center', color: '#ff5050', marginTop: 40, paddingHorizontal: 24 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111', borderRadius: 12, marginBottom: 8,
    padding: 12, borderWidth: 1, borderColor: '#222', gap: 10,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#2a1a6e', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { color: '#b0a0ff', fontWeight: '700', fontSize: 16 },
  rowInfo: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  name: { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1 },
  enrollBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 0 },
  enrollBadgeActive: { borderColor: 'rgba(204,255,0,0.4)', backgroundColor: 'rgba(204,255,0,0.1)' },
  enrollBadgeInactive: { borderColor: '#333', backgroundColor: '#1a1a1a' },
  enrollBadgeText: { fontSize: 10, fontWeight: '700' },
  enrollBadgeTextActive: { color: '#ccff00' },
  enrollBadgeTextInactive: { color: '#555' },
  pronouns: { fontSize: 11, color: '#555', marginBottom: 1 },
  email: { fontSize: 12, color: '#888' },
  balText: { fontSize: 11, fontWeight: '600', marginTop: 3 },
  balOwing: { color: '#ff5050' },
  balCredit: { color: '#ccff00' },
  balClear: { color: '#555' },
  chevron: { fontSize: 20, color: '#444', flexShrink: 0 },
})

const m = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  closeBtn: { fontSize: 18, color: '#888' },

  label: { fontSize: 13, color: '#888', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#000', borderWidth: 1, borderColor: '#333',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: '#fff',
  },

  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  levelChip: {
    borderWidth: 1, borderColor: '#333', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  levelChipActive: { backgroundColor: '#ccff00', borderColor: '#ccff00' },
  levelChipText: { fontSize: 13, color: '#888', fontWeight: '600' },
  levelChipTextActive: { color: '#000' },

  errorText: { color: '#ff5050', fontSize: 13, marginTop: 12 },

  submitBtn: {
    backgroundColor: '#ccff00', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 24,
  },
  submitBtnDisabled: { backgroundColor: 'rgba(204,255,0,0.4)' },
  submitBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },

  successBox: {
    alignItems: 'center', paddingVertical: 40,
  },
  successText: { color: '#ccff00', fontSize: 16, fontWeight: '700' },
})
