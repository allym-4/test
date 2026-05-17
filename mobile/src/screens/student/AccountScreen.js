import { useState, useEffect } from 'react'
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Switch, Image, ActivityIndicator, Modal,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as ImagePicker from 'expo-image-picker'
import { useAuth } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { payments, auth, classes } from '../../api'

const EXPERIENCE_LABELS = {
  beginner: "I'm brand new 👋",
  some: 'A bit of experience 🙌',
  experienced: "I've been training 🔥",
}

function Row({ label, value }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value ?? '—'}</Text>
    </View>
  )
}

function NavRow({ label, onPress }) {
  return (
    <TouchableOpacity style={s.navRow} onPress={onPress}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.navArrow}>›</Text>
    </TouchableOpacity>
  )
}

function ChangePasswordModal({ visible, onClose }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!current || !next) {
      Alert.alert('Required', 'Please fill in all fields.')
      return
    }
    if (next !== confirm) {
      Alert.alert('Mismatch', 'New passwords do not match.')
      return
    }
    if (next.length < 8) {
      Alert.alert('Too short', 'Password must be at least 8 characters.')
      return
    }
    setSaving(true)
    try {
      await auth.changePassword({ old_password: current, new_password: next })
      Alert.alert('Done', 'Password changed successfully.')
      setCurrent(''); setNext(''); setConfirm('')
      onClose()
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || err.response?.data?.old_password?.[0] || 'Could not change password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.modalRoot}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>Change password</Text>
          <TouchableOpacity onPress={onClose}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
        </View>
        <View style={s.modalBody}>
          <Text style={s.inputLabel}>Current password</Text>
          <TextInput style={s.input} value={current} onChangeText={setCurrent} secureTextEntry placeholder="Current password" />
          <Text style={s.inputLabel}>New password</Text>
          <TextInput style={s.input} value={next} onChangeText={setNext} secureTextEntry placeholder="New password (min 8 chars)" />
          <Text style={s.inputLabel}>Confirm new password</Text>
          <TextInput style={s.input} value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Confirm new password" />
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Change password</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export default function AccountScreen({ navigation }) {
  const { user, logout } = useAuth()
  const { data: balanceData } = useApi(
    () => user ? payments.balance(user.id) : null, [user?.id]
  )

  const [showInRoster, setShowInRoster] = useState(user?.show_in_roster ?? false)
  const [rosterName, setRosterName] = useState(user?.roster_name ?? 'first_name')
  const [savingRoster, setSavingRoster] = useState(false)
  const [experienceLevel, setExperienceLevel] = useState(null)
  const [classLevel, setClassLevel] = useState(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoUri, setPhotoUri] = useState(user?.profile_photo ?? null)

  const { data: sessionsData } = useApi(() => classes.list(), [])
  const availableLevels = [...new Set(
    (sessionsData?.results ?? sessionsData ?? [])
      .map(s => s.level).filter(Boolean)
  )].sort()

  useEffect(() => {
    if (user?.id) {
      AsyncStorage.getItem(`experience_level_${user.id}`).then(val => setExperienceLevel(val))
      AsyncStorage.getItem(`class_level_${user.id}`).then(val => setClassLevel(val))
    }
  }, [user?.id])

  function handleChangeExperience() {
    Alert.alert(
      'Your experience level',
      'This helps us show you the right trial classes.',
      [
        { text: "I'm brand new 👋", onPress: () => saveExperience('beginner') },
        { text: 'A bit of experience 🙌', onPress: () => saveExperience('some') },
        { text: "I've been training 🔥", onPress: () => saveExperience('experienced') },
        { text: 'Cancel', style: 'cancel' },
      ]
    )
  }

  async function saveExperience(level) {
    await AsyncStorage.setItem(`experience_level_${user.id}`, level)
    setExperienceLevel(level)
  }

  function handleChangeClassLevel() {
    const options = availableLevels.map(level => ({
      text: level,
      onPress: () => saveClassLevel(level),
    }))
    Alert.alert(
      'My class level',
      'Sets the default filter on your classes and bookings.',
      [
        ...options,
        { text: 'Show all levels', onPress: () => saveClassLevel(null) },
        { text: 'Cancel', style: 'cancel' },
      ]
    )
  }

  async function saveClassLevel(level) {
    if (level) {
      await AsyncStorage.setItem(`class_level_${user.id}`, level)
    } else {
      await AsyncStorage.removeItem(`class_level_${user.id}`)
    }
    setClassLevel(level)
  }

  useEffect(() => {
    setShowInRoster(user?.show_in_roster ?? false)
    setRosterName(user?.roster_name ?? 'first_name')
  }, [user])

  async function saveRosterPrefs(newShowInRoster, newRosterName) {
    setSavingRoster(true)
    try {
      await auth.updateMe({ show_in_roster: newShowInRoster, roster_name: newRosterName })
    } catch {
      Alert.alert('Error', 'Could not save preference.')
    } finally {
      setSavingRoster(false)
    }
  }

  function handleToggleRoster(val) {
    setShowInRoster(val)
    saveRosterPrefs(val, rosterName)
  }

  function handleRosterNameChoice(choice) {
    setRosterName(choice)
    saveRosterPrefs(showInRoster, choice)
  }

  function confirmLogout() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ])
  }

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to upload a profile picture.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (result.canceled) return

    const uri = result.assets[0].uri
    const filename = uri.split('/').pop()
    const match = /\.(\w+)$/.exec(filename)
    const type = match ? `image/${match[1]}` : 'image/jpeg'

    const formData = new FormData()
    formData.append('profile_photo', { uri, name: filename, type })

    setUploadingPhoto(true)
    try {
      await auth.uploadPhoto(formData)
      setPhotoUri(uri)
    } catch {
      Alert.alert('Error', 'Could not upload photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const balance = balanceData?.balance
  const balanceNum = parseFloat(balance ?? 0)
  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase()

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <TouchableOpacity onPress={handlePickPhoto} disabled={uploadingPhoto} style={s.avatarWrap}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={s.avatarImg} />
        ) : (
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
        )}
        {uploadingPhoto
          ? <ActivityIndicator style={s.avatarSpinner} color="#6366f1" />
          : <Text style={s.avatarHint}>Change photo</Text>
        }
      </TouchableOpacity>
      <Text style={s.name}>{user?.first_name} {user?.last_name}</Text>
      <Text style={s.email}>{user?.email}</Text>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Account</Text>
        <Row label="Role" value={user?.role} />
        <Row label="Phone" value={user?.phone} />
        <TouchableOpacity style={s.navRow} onPress={handleChangeExperience}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>Experience level</Text>
            <Text style={s.rowSubValue}>
              {experienceLevel ? EXPERIENCE_LABELS[experienceLevel] : 'Not set'}
            </Text>
          </View>
          <Text style={s.navArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.navRow} onPress={handleChangeClassLevel}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>My class level</Text>
            <Text style={s.rowSubValue}>{classLevel ?? 'All levels'}</Text>
          </View>
          <Text style={s.navArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.navRow, { borderBottomWidth: 0 }]} onPress={() => setShowPasswordModal(true)}>
          <Text style={s.rowLabel}>Change password</Text>
          <Text style={s.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Billing</Text>
        <View style={[s.row, { alignItems: 'center' }]}>
          <Text style={s.rowLabel}>Account balance</Text>
          <Text style={[s.rowValue, balanceNum < 0 && s.negative, balanceNum > 0 && s.positive]}>
            {balance != null ? `$${Math.abs(balanceNum).toFixed(2)} ${balanceNum < 0 ? 'owed' : balanceNum > 0 ? 'credit' : ''}` : '—'}
          </Text>
        </View>
        <NavRow label="Billing & payment history" onPress={() => navigation.navigate('Billing')} />
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Studio</Text>
        <NavRow label="Notifications" onPress={() => navigation.navigate('Notifications')} />
        <NavRow label="Forms & waivers" onPress={() => navigation.navigate('Forms')} />
        <NavRow label="Studio info" onPress={() => navigation.navigate('StudioInfo')} />
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Who's coming</Text>
        <Text style={s.sectionDesc}>
          Let other students in your classes see that you're attending.
        </Text>
        <View style={[s.row, { alignItems: 'center' }]}>
          <Text style={s.rowLabel}>Show my name in class</Text>
          <Switch
            value={showInRoster}
            onValueChange={handleToggleRoster}
            disabled={savingRoster}
            trackColor={{ true: '#6366f1' }}
          />
        </View>

        {showInRoster && (
          <View style={s.nameChoiceRow}>
            <Text style={s.nameChoiceLabel}>Show as</Text>
            <View style={s.nameChoiceBtns}>
              <TouchableOpacity
                style={[s.choiceBtn, rosterName === 'first_name' && s.choiceBtnActive]}
                onPress={() => handleRosterNameChoice('first_name')}
                disabled={savingRoster}
              >
                <Text style={[s.choiceBtnText, rosterName === 'first_name' && s.choiceBtnTextActive]}>
                  First name
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.choiceBtn, rosterName === 'nickname' && s.choiceBtnActive]}
                onPress={() => handleRosterNameChoice('nickname')}
                disabled={savingRoster}
              >
                <Text style={[s.choiceBtnText, rosterName === 'nickname' && s.choiceBtnTextActive]}>
                  Nickname
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout}>
        <Text style={s.logoutText}>Sign out</Text>
      </TouchableOpacity>

      <ChangePasswordModal visible={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 24, paddingBottom: 50, alignItems: 'center' },
  avatarWrap: { alignItems: 'center', marginBottom: 4 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  avatarSpinner: { marginTop: 4 },
  avatarHint: { fontSize: 12, color: '#6366f1', marginTop: 4, marginBottom: 8 },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  email: { fontSize: 14, color: '#6b7280', marginTop: 4, marginBottom: 24 },
  section: { width: '100%', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  sectionDesc: { fontSize: 13, color: '#9ca3af', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowLabel: { fontSize: 15, color: '#374151' },
  rowValue: { fontSize: 15, color: '#111827', fontWeight: '500', textTransform: 'capitalize' },
  negative: { color: '#ef4444' },
  positive: { color: '#10b981' },
  nameChoiceRow: { paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameChoiceLabel: { fontSize: 14, color: '#374151' },
  nameChoiceBtns: { flexDirection: 'row', gap: 8 },
  choiceBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#f3f4f6' },
  choiceBtnActive: { backgroundColor: '#e0e7ff' },
  choiceBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  choiceBtnTextActive: { color: '#4338ca' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  navArrow: { fontSize: 20, color: '#9ca3af' },
  rowSubValue: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  logoutBtn: { marginTop: 8, width: '100%', borderWidth: 1.5, borderColor: '#ef4444', borderRadius: 12, padding: 14, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
  // modal
  modalRoot: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  modalClose: { fontSize: 18, color: '#6b7280', padding: 4 },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#fafafa' },
  saveBtn: { backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
