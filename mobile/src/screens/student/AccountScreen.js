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

// ─── ChangePasswordModal ─────────────────────────────────────────────────────

function ChangePasswordModal({ visible, onClose }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!current || !next) { Alert.alert('Required', 'Please fill in all fields.'); return }
    if (next !== confirm) { Alert.alert('Mismatch', 'New passwords do not match.'); return }
    if (next.length < 8) { Alert.alert('Too short', 'Password must be at least 8 characters.'); return }
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
          <TextInput style={s.input} value={current} onChangeText={setCurrent} secureTextEntry placeholder="Current password" placeholderTextColor="#555" />
          <Text style={s.inputLabel}>New password</Text>
          <TextInput style={s.input} value={next} onChangeText={setNext} secureTextEntry placeholder="New password (min 8 chars)" placeholderTextColor="#555" />
          <Text style={s.inputLabel}>Confirm new password</Text>
          <TextInput style={s.input} value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Confirm new password" placeholderTextColor="#555" />
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#000" /> : <Text style={s.saveBtnText}>Change password</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ─── SectionCard ─────────────────────────────────────────────────────────────

function SectionCard({ title, children }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

// ─── NotifRow ────────────────────────────────────────────────────────────────

function NotifRow({ label, desc, value, onChange }) {
  return (
    <View style={s.notifRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.notifLabel}>{label}</Text>
        {desc ? <Text style={s.notifDesc}>{desc}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#333', true: '#ccff00' }}
        thumbColor={value ? '#000' : '#666'}
      />
    </View>
  )
}

// ─── FieldInput ──────────────────────────────────────────────────────────────

function FieldInput({ label, value, onChangeText, placeholder, keyboardType, multiline, secureTextEntry }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.inputLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ''}
        placeholderTextColor="#555"
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
      />
    </View>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AccountScreen({ navigation, onSwitchToInstructor }) {
  const { user, logout } = useAuth()
  const { data: balanceData } = useApi(() => user ? payments.balance(user.id) : null, [user?.id])

  // Profile fields
  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [preferredName, setPreferredName] = useState(user?.preferred_name || '')
  const [pronouns, setPronouns] = useState(user?.pronouns || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [address, setAddress] = useState(user?.address || '')
  const [dob, setDob] = useState(user?.date_of_birth || '')
  const [experienceLevel, setExperienceLevel] = useState(user?.experience_level || '')
  const [referralSource, setReferralSource] = useState(user?.referral_source || '')
  const [medicalNotes, setMedicalNotes] = useState(user?.medical_notes || '')
  const [photoConsent, setPhotoConsent] = useState(user?.photo_consent ?? false)

  // Emergency contact
  const [ecName, setEcName] = useState(user?.emergency_contact_name || '')
  const [ecPhone, setEcPhone] = useState(user?.emergency_contact_phone || '')
  const [ecRelationship, setEcRelationship] = useState(user?.emergency_contact_relationship || '')

  // UI state
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoUri, setPhotoUri] = useState(user?.profile_photo ?? null)

  // Roster prefs
  const [showInRoster, setShowInRoster] = useState(user?.show_in_roster ?? false)
  const [rosterName, setRosterName] = useState(user?.roster_name ?? 'first_name')
  const [savingRoster, setSavingRoster] = useState(false)

  // Notification preferences
  const prefs = user?.notification_preferences || {}
  const [classReminders, setClassReminders] = useState(prefs.class_reminders ?? true)
  const [waitlistEmail, setWaitlistEmail] = useState(prefs.waitlist_email ?? true)
  const [waitlistApp, setWaitlistApp] = useState(prefs.waitlist_app ?? true)
  const [studioUpdates, setStudioUpdates] = useState(prefs.studio_updates ?? false)
  const [homeworkNotif, setHomeworkNotif] = useState(prefs.homework ?? true)

  // Level preferences
  const [classLevel, setClassLevel] = useState(null)
  const { data: sessionsData } = useApi(() => classes.list(), [])
  const availableLevels = [...new Set(
    (sessionsData?.results ?? sessionsData ?? []).map(s => s.level).filter(Boolean)
  )].sort()

  useEffect(() => {
    if (user?.id) {
      AsyncStorage.getItem(`class_level_${user.id}`).then(val => setClassLevel(val))
    }
  }, [user?.id])

  useEffect(() => {
    setShowInRoster(user?.show_in_roster ?? false)
    setRosterName(user?.roster_name ?? 'first_name')
  }, [user])

  // Waiver
  const waiverSigned = user?.waiver_signed || user?.forms_completed?.includes('waiver')

  // Referral code
  const referralCode = user?.referral_code || `SHARE${user?.id || ''}`

  const balance = balanceData?.balance
  const balanceNum = parseFloat(balance ?? 0)
  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase()

  async function handleSaveProfile() {
    setSaving(true)
    try {
      await auth.updateMe({
        first_name: firstName,
        last_name: lastName,
        preferred_name: preferredName,
        pronouns,
        phone,
        address,
        date_of_birth: dob || null,
        experience_level: experienceLevel,
        referral_source: referralSource,
        medical_notes: medicalNotes,
        photo_consent: photoConsent,
        emergency_contact_name: ecName,
        emergency_contact_phone: ecPhone,
        emergency_contact_relationship: ecRelationship,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      Alert.alert('Error', 'Could not save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleNotifToggle(key, value) {
    const setters = {
      class_reminders: setClassReminders,
      waitlist_email: setWaitlistEmail,
      waitlist_app: setWaitlistApp,
      studio_updates: setStudioUpdates,
      homework: setHomeworkNotif,
    }
    const current = { class_reminders: classReminders, waitlist_email: waitlistEmail, waitlist_app: waitlistApp, studio_updates: studioUpdates, homework: homeworkNotif }
    setters[key]?.(value)
    try {
      await auth.updateMe({ notification_preferences: { ...current, [key]: value } })
    } catch {
      setters[key]?.(!value)
      Alert.alert('Error', 'Could not update preference.')
    }
  }

  async function saveRosterPrefs(newShow, newName) {
    setSavingRoster(true)
    try {
      await auth.updateMe({ show_in_roster: newShow, roster_name: newName })
    } catch {
      Alert.alert('Error', 'Could not save preference.')
    } finally {
      setSavingRoster(false)
    }
  }

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access to upload a profile picture.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
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

  function handleExperienceLevel() {
    Alert.alert(
      'Experience level',
      'Select your experience level',
      [
        { text: 'Beginner', onPress: () => setExperienceLevel('beginner') },
        { text: 'Some experience', onPress: () => setExperienceLevel('some_experience') },
        { text: 'Intermediate', onPress: () => setExperienceLevel('intermediate') },
        { text: 'Advanced', onPress: () => setExperienceLevel('advanced') },
        { text: 'Cancel', style: 'cancel' },
      ]
    )
  }

  function handleReferralSource() {
    Alert.alert(
      'How did you hear about us?',
      '',
      [
        { text: 'Instagram', onPress: () => setReferralSource('instagram') },
        { text: 'Google', onPress: () => setReferralSource('google') },
        { text: 'Friend referral', onPress: () => setReferralSource('friend_referral') },
        { text: 'Walk-in', onPress: () => setReferralSource('walk_in') },
        { text: 'Other', onPress: () => setReferralSource('other') },
        { text: 'Cancel', style: 'cancel' },
      ]
    )
  }

  function handleChangeClassLevel() {
    const options = availableLevels.map(level => ({
      text: level, onPress: async () => {
        await AsyncStorage.setItem(`class_level_${user.id}`, level)
        setClassLevel(level)
      },
    }))
    Alert.alert('My class level', 'Sets the default filter on your classes.',
      [...options, { text: 'Show all', onPress: async () => { await AsyncStorage.removeItem(`class_level_${user.id}`); setClassLevel(null) } }, { text: 'Cancel', style: 'cancel' }]
    )
  }

  function confirmLogout() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ])
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Avatar */}
      <TouchableOpacity onPress={handlePickPhoto} disabled={uploadingPhoto} style={s.avatarWrap}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={s.avatarImg} />
        ) : (
          <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
        )}
        {uploadingPhoto
          ? <ActivityIndicator style={s.avatarSpinner} color="#ccff00" />
          : <Text style={s.avatarHint}>Change photo</Text>
        }
      </TouchableOpacity>
      <Text style={s.name}>{user?.first_name} {user?.last_name}</Text>
      <Text style={s.email}>{user?.email}</Text>

      {/* Balance */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Billing</Text>
        <View style={[s.row, { alignItems: 'center' }]}>
          <Text style={s.rowLabel}>Account balance</Text>
          <Text style={[s.rowValue, balanceNum < 0 && s.negative, balanceNum > 0 && s.positive]}>
            {balance != null ? `$${Math.abs(balanceNum).toFixed(2)} ${balanceNum < 0 ? 'owed' : balanceNum > 0 ? 'credit' : ''}` : '—'}
          </Text>
        </View>
        <TouchableOpacity style={s.navRow} onPress={() => navigation.navigate('Billing')}>
          <Text style={s.rowLabel}>Billing & payment history</Text>
          <Text style={s.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Profile form */}
      <SectionCard title="Profile">
        <FieldInput label="First name" value={firstName} onChangeText={setFirstName} />
        <FieldInput label="Last name" value={lastName} onChangeText={setLastName} />
        <FieldInput label="Preferred name" value={preferredName} onChangeText={setPreferredName} placeholder="Optional" />
        <FieldInput label="Pronouns" value={pronouns} onChangeText={setPronouns} placeholder="e.g. she/her" />
        <FieldInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <FieldInput label="Address" value={address} onChangeText={setAddress} />
        <FieldInput label="Date of birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" />

        <View style={{ marginBottom: 14 }}>
          <Text style={s.inputLabel}>Experience level</Text>
          <TouchableOpacity style={s.selectBtn} onPress={handleExperienceLevel}>
            <Text style={experienceLevel ? s.selectBtnText : s.selectBtnPlaceholder}>
              {experienceLevel ? experienceLevel.replace(/_/g, ' ') : 'Select…'}
            </Text>
            <Text style={s.selectArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginBottom: 14 }}>
          <Text style={s.inputLabel}>How did you hear about us?</Text>
          <TouchableOpacity style={s.selectBtn} onPress={handleReferralSource}>
            <Text style={referralSource ? s.selectBtnText : s.selectBtnPlaceholder}>
              {referralSource ? referralSource.replace(/_/g, ' ') : 'Select…'}
            </Text>
            <Text style={s.selectArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <FieldInput label="Medical / injury notes" value={medicalNotes} onChangeText={setMedicalNotes} placeholder="Any injuries or conditions we should know about…" multiline />

        <TouchableOpacity style={s.checkRow} onPress={() => setPhotoConsent(v => !v)}>
          <View style={[s.checkbox, photoConsent && s.checkboxChecked]}>
            {photoConsent && <Text style={s.checkmark}>✓</Text>}
          </View>
          <Text style={s.checkLabel}>I consent to photos/videos being taken for studio use</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSaveProfile}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#000" />
            : <Text style={s.saveBtnText}>{saved ? '✓ Saved' : 'Save changes'}</Text>
          }
        </TouchableOpacity>
      </SectionCard>

      {/* Emergency contact */}
      <SectionCard title="Emergency Contact">
        <FieldInput label="Name" value={ecName} onChangeText={setEcName} placeholder="Full name" />
        <FieldInput label="Relationship" value={ecRelationship} onChangeText={setEcRelationship} placeholder="e.g. Sister, Partner, Mother" />
        <FieldInput label="Phone" value={ecPhone} onChangeText={setEcPhone} keyboardType="phone-pad" />
        <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveProfile} disabled={saving}>
          <Text style={s.saveBtnText}>{saved ? '✓ Saved' : 'Save emergency contact'}</Text>
        </TouchableOpacity>
      </SectionCard>

      {/* Waiver status */}
      <SectionCard title="Waiver & Terms">
        <View style={s.waiverRow}>
          <Text style={{ fontSize: 20, marginRight: 12 }}>{waiverSigned ? '✅' : '⚠️'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>{waiverSigned ? 'Waiver accepted' : 'Waiver required'}</Text>
            {user?.waiver_signed_at ? (
              <Text style={s.rowSubValue}>
                Signed {new Date(user.waiver_signed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            ) : !waiverSigned ? (
              <Text style={s.rowSubValue}>Please sign before attending classes</Text>
            ) : null}
          </View>
          {!waiverSigned && (
            <TouchableOpacity onPress={() => navigation.navigate('Forms')}>
              <Text style={s.waiverLink}>Sign now</Text>
            </TouchableOpacity>
          )}
        </View>
      </SectionCard>

      {/* Referral code */}
      <SectionCard title="Refer a Friend">
        <Text style={s.inputLabel}>Your referral code</Text>
        <View style={s.referralRow}>
          <Text style={s.referralCode}>{referralCode}</Text>
          <TouchableOpacity
            style={s.copyBtn}
            onPress={() => Alert.alert('Referral Code', `Share this code: ${referralCode}`)}
          >
            <Text style={s.copyBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
      </SectionCard>

      {/* Notifications */}
      <SectionCard title="Notifications">
        <NotifRow
          label="Class reminders"
          desc="Get notified 24hrs before each class"
          value={classReminders}
          onChange={v => handleNotifToggle('class_reminders', v)}
        />
        <NotifRow
          label="Waitlist alerts — email"
          desc="Email me when a spot opens or expires"
          value={waitlistEmail}
          onChange={v => handleNotifToggle('waitlist_email', v)}
        />
        <NotifRow
          label="Waitlist alerts — in-app"
          desc="In-app notification when a spot opens"
          value={waitlistApp}
          onChange={v => handleNotifToggle('waitlist_app', v)}
        />
        <NotifRow
          label="Studio updates"
          desc="News and updates from the studio"
          value={studioUpdates}
          onChange={v => handleNotifToggle('studio_updates', v)}
        />
        <NotifRow
          label="Homework"
          desc="Notified when new homework is assigned"
          value={homeworkNotif}
          onChange={v => handleNotifToggle('homework', v)}
        />
      </SectionCard>

      {/* Who's coming */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Who's Coming</Text>
        <Text style={s.sectionDesc}>Let other students in your classes see that you're attending.</Text>
        <View style={[s.row, { alignItems: 'center' }]}>
          <Text style={s.rowLabel}>Show my name in class</Text>
          <Switch
            value={showInRoster}
            onValueChange={val => { setShowInRoster(val); saveRosterPrefs(val, rosterName) }}
            disabled={savingRoster}
            trackColor={{ false: '#333', true: '#ccff00' }}
            thumbColor={showInRoster ? '#000' : '#666'}
          />
        </View>
        {showInRoster && (
          <View style={s.nameChoiceRow}>
            <Text style={s.nameChoiceLabel}>Show as</Text>
            <View style={s.nameChoiceBtns}>
              {[['first_name', 'First name'], ['nickname', 'Nickname']].map(([val, label]) => (
                <TouchableOpacity
                  key={val}
                  style={[s.choiceBtn, rosterName === val && s.choiceBtnActive]}
                  onPress={() => { setRosterName(val); saveRosterPrefs(showInRoster, val) }}
                  disabled={savingRoster}
                >
                  <Text style={[s.choiceBtnText, rosterName === val && s.choiceBtnTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Quick links */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Studio</Text>
        <TouchableOpacity style={s.navRow} onPress={() => navigation.navigate('Notifications')}>
          <Text style={s.rowLabel}>Notifications</Text>
          <Text style={s.navArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.navRow} onPress={() => navigation.navigate('Forms')}>
          <Text style={s.rowLabel}>Forms & waivers</Text>
          <Text style={s.navArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.navRow} onPress={() => navigation.navigate('StudioInfo')}>
          <Text style={s.rowLabel}>Studio info</Text>
          <Text style={s.navArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.navRow, { borderBottomWidth: 0 }]} onPress={() => setShowPasswordModal(true)}>
          <Text style={s.rowLabel}>Change password</Text>
          <Text style={s.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Class level */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Preferences</Text>
        <TouchableOpacity style={[s.navRow, { borderBottomWidth: 0 }]} onPress={handleChangeClassLevel}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>My class level</Text>
            <Text style={s.rowSubValue}>{classLevel ?? 'All levels'}</Text>
          </View>
          <Text style={s.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {onSwitchToInstructor && (
        <TouchableOpacity style={s.switchBtn} onPress={onSwitchToInstructor}>
          <Text style={s.switchBtnText}>Switch to instructor view</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout}>
        <Text style={s.logoutText}>Sign out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      <ChangePasswordModal visible={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { padding: 24, paddingBottom: 50, alignItems: 'center' },

  // Avatar
  avatarWrap: { alignItems: 'center', marginBottom: 4 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ccff00' },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { color: '#ccff00', fontSize: 28, fontWeight: '700' },
  avatarSpinner: { marginTop: 4 },
  avatarHint: { fontSize: 12, color: '#ccff00', marginTop: 4, marginBottom: 8 },
  name: { fontSize: 20, fontWeight: '700', color: '#fff' },
  email: { fontSize: 14, color: '#888', marginTop: 4, marginBottom: 24 },

  // Section
  section: { width: '100%', backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#222' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  sectionDesc: { fontSize: 13, color: '#666', marginBottom: 12 },

  // Rows
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#222' },
  rowLabel: { fontSize: 15, color: '#ccc' },
  rowValue: { fontSize: 15, color: '#fff', fontWeight: '500' },
  rowSubValue: { fontSize: 12, color: '#888', marginTop: 1 },
  negative: { color: '#ef4444' },
  positive: { color: '#ccff00' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#222' },
  navArrow: { fontSize: 20, color: '#555' },

  // Input
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#fff', backgroundColor: '#0a0a0a' },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#0a0a0a' },
  selectBtnText: { fontSize: 15, color: '#fff', textTransform: 'capitalize' },
  selectBtnPlaceholder: { fontSize: 15, color: '#555' },
  selectArrow: { fontSize: 18, color: '#555' },

  // Checkbox
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#444', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxChecked: { backgroundColor: '#ccff00', borderColor: '#ccff00' },
  checkmark: { fontSize: 13, color: '#000', fontWeight: '700' },
  checkLabel: { flex: 1, fontSize: 14, color: '#ccc', lineHeight: 20 },

  // Save button
  saveBtn: { backgroundColor: '#ccff00', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },

  // Waiver
  waiverRow: { flexDirection: 'row', alignItems: 'center' },
  waiverLink: { fontSize: 13, color: '#ccff00', fontWeight: '600' },

  // Referral
  referralRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  referralCode: { fontSize: 22, fontWeight: '800', color: '#ccff00', letterSpacing: 2 },
  copyBtn: { backgroundColor: '#1a2a00', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#ccff00' },
  copyBtnText: { fontSize: 13, fontWeight: '700', color: '#ccff00' },

  // Notif rows
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingBottom: 14, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  notifLabel: { fontSize: 14, fontWeight: '500', color: '#fff' },
  notifDesc: { fontSize: 12, color: '#555', marginTop: 2 },

  // Name choice
  nameChoiceRow: { paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameChoiceLabel: { fontSize: 14, color: '#ccc' },
  nameChoiceBtns: { flexDirection: 'row', gap: 8 },
  choiceBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333' },
  choiceBtnActive: { backgroundColor: '#1a2a00', borderColor: '#ccff00' },
  choiceBtnText: { fontSize: 13, fontWeight: '600', color: '#888' },
  choiceBtnTextActive: { color: '#ccff00' },

  // Actions
  switchBtn: { marginTop: 8, width: '100%', borderWidth: 1.5, borderColor: '#ccff00', borderRadius: 12, padding: 14, alignItems: 'center' },
  switchBtnText: { color: '#ccff00', fontWeight: '600', fontSize: 15 },
  logoutBtn: { marginTop: 8, width: '100%', borderWidth: 1.5, borderColor: '#ef4444', borderRadius: 12, padding: 14, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },

  // Modal
  modalRoot: { flex: 1, backgroundColor: '#000' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  modalClose: { fontSize: 18, color: '#888', padding: 4 },
  modalBody: { padding: 20 },
})
