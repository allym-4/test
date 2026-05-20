import { useState } from 'react'
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Image, ActivityIndicator,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useAuth } from '../../contexts/AuthContext'
import { auth } from '../../api'

export default function InstructorProfileScreen({ navigation }) {
  const { user } = useAuth()
  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName, setLastName] = useState(user?.last_name ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await auth.updateMe({ first_name: firstName, last_name: lastName, bio })
      Alert.alert('Saved', 'Profile updated.')
      navigation.goBack()
    } catch {
      Alert.alert('Error', 'Could not save profile.')
    } finally {
      setSaving(false)
    }
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
      Alert.alert('Done', 'Profile photo updated.')
    } catch {
      Alert.alert('Error', 'Could not upload photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || '?'

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={s.avatarWrap} onPress={handlePickPhoto} disabled={uploadingPhoto}>
        {user?.profile_photo ? (
          <Image source={{ uri: user.profile_photo }} style={s.avatarImg} />
        ) : (
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
        )}
        {uploadingPhoto
          ? <ActivityIndicator style={s.avatarOverlay} color="#ccff00" />
          : <Text style={s.avatarHint}>Tap to change photo</Text>
        }
      </TouchableOpacity>

      <View style={s.card}>
        <Text style={s.label}>First name</Text>
        <TextInput style={s.input} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor="#555" />
        <Text style={s.label}>Last name</Text>
        <TextInput style={s.input} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor="#555" />
        <Text style={s.label}>Bio</Text>
        <TextInput
          style={[s.input, s.textarea]}
          value={bio}
          onChangeText={setBio}
          placeholder="A short bio shown to students..."
          placeholderTextColor="#555"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
        {saving
          ? <ActivityIndicator color="#000" />
          : <Text style={s.saveBtnText}>Save profile</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingBottom: 40 },
  avatarWrap: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 90, height: 90, borderRadius: 45 },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '700' },
  avatarOverlay: { position: 'absolute' },
  avatarHint: { fontSize: 12, color: '#ccff00', marginTop: 6 },
  card: { backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#222' },
  label: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#fff', backgroundColor: '#1a1a1a' },
  textarea: { height: 100, paddingTop: 10 },
  saveBtn: { backgroundColor: '#ccff00', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
})
