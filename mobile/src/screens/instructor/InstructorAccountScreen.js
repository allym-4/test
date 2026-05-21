import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image, Alert } from 'react-native'
import { useAuth } from '../../contexts/AuthContext'

function NavRow({ label, icon, onPress, danger }) {
  return (
    <TouchableOpacity style={s.navRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.navIcon}>{icon}</Text>
      <Text style={[s.navLabel, danger && s.navLabelDanger]}>{label}</Text>
      {!danger && <Text style={s.navArrow}>›</Text>}
    </TouchableOpacity>
  )
}

export default function InstructorAccountScreen({ navigation, route }) {
  const { user, logout } = useAuth()
  const onSwitchToStudent = route?.params?.onSwitchToStudent

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || '?'
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email

  function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ])
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.profileCard}>
        {user?.profile_photo ? (
          <Image source={{ uri: user.profile_photo }} style={s.avatarImg} />
        ) : (
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
        )}
        <Text style={s.name}>{fullName}</Text>
        <Text style={s.role}>Instructor</Text>
      </View>

      <View style={s.section}>
        <NavRow icon="👤" label="Edit profile" onPress={() => navigation.navigate('InstructorProfile')} />
        <NavRow icon="📅" label="My availability" onPress={() => navigation.navigate('Availability')} />
        <NavRow icon="⭐" label="Skills approval" onPress={() => navigation.navigate('SkillsApproval')} />
        <NavRow icon="💰" label="Pay records" onPress={() => navigation.navigate('Pay')} />
        <NavRow icon="🔔" label="Notifications" onPress={() => navigation.navigate('Notifications')} />
      </View>

      {onSwitchToStudent && (
        <View style={[s.section, { marginTop: 16 }]}>
          <NavRow icon="🎓" label="Switch to student view" onPress={onSwitchToStudent} />
        </View>
      )}

      <View style={[s.section, { marginTop: 16 }]}>
        <NavRow icon="🚪" label="Log out" onPress={handleLogout} danger />
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { padding: 16, paddingBottom: 40 },
  profileCard: { alignItems: 'center', backgroundColor: '#111', borderRadius: 14, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: '#222' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarImg: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700', color: '#fff' },
  role: { fontSize: 13, color: '#ccff00', marginTop: 2, fontWeight: '600' },
  section: { backgroundColor: '#111', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#222' },
  navRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  navIcon: { fontSize: 18, marginRight: 12 },
  navLabel: { flex: 1, fontSize: 15, color: '#fff' },
  navLabelDanger: { color: '#ef4444' },
  navArrow: { fontSize: 18, color: '#444' },
})
