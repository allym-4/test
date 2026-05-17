import { useState } from 'react'
import {
  ScrollView, View, Text, TouchableOpacity, Image,
  StyleSheet, Linking, ActivityIndicator,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { settings, users } from '../../api'

const TABS = ['About', 'Team', 'Policies']

function InfoRow({ icon, label, value, onPress }) {
  const content = (
    <View style={s.infoRow}>
      <Text style={s.infoIcon}>{icon}</Text>
      <View style={s.infoText}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={[s.infoValue, !!onPress && s.infoValueLink]}>{value}</Text>
      </View>
    </View>
  )
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    )
  }
  return content
}

function InstructorCard({ instructor }) {
  const initials = [instructor.first_name?.[0], instructor.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase()
  const displayName = instructor.display_name
    || `${instructor.first_name ?? ''} ${instructor.last_name ?? ''}`.trim()

  return (
    <View style={s.instructorCard}>
      <View style={s.instructorHeader}>
        {instructor.profile_photo_url ? (
          <Image source={{ uri: instructor.profile_photo_url }} style={s.avatar} />
        ) : (
          <View style={s.avatarFallback}>
            <Text style={s.avatarInitials}>{initials || '?'}</Text>
          </View>
        )}
        <View style={s.instructorMeta}>
          <Text style={s.instructorName}>{displayName}</Text>
          {!!instructor.email && (
            <Text style={s.instructorEmail}>{instructor.email}</Text>
          )}
        </View>
      </View>
      {!!instructor.bio && (
        <Text style={s.instructorBio}>{instructor.bio}</Text>
      )}
    </View>
  )
}

export default function StudioInfoScreen() {
  const [activeTab, setActiveTab] = useState('About')

  const { data: studioSettings, loading: settingsLoading } = useApi(
    () => settings.get(), [],
  )
  const { data: instructorData, loading: instructorsLoading } = useApi(
    () => users.list({ role: 'instructor' }), [],
  )

  const studio = studioSettings ?? {}
  const instructorList = instructorData?.results ?? instructorData ?? []
  const loading = settingsLoading || instructorsLoading

  function openMaps() {
    if (!studio.studio_address) return
    const encoded = encodeURIComponent(studio.studio_address)
    Linking.openURL(`https://maps.google.com/?q=${encoded}`)
  }

  function openPhone() {
    if (!studio.studio_phone) return
    Linking.openURL(`tel:${studio.studio_phone}`)
  }

  function openEmail() {
    if (!studio.studio_email) return
    Linking.openURL(`mailto:${studio.studio_email}`)
  }

  function openInstagram() {
    if (!studio.studio_instagram) return
    const handle = studio.studio_instagram.replace(/^@/, '')
    Linking.openURL(`https://instagram.com/${handle}`)
  }

  function openFacebook() {
    if (!studio.studio_facebook) return
    Linking.openURL(
      studio.studio_facebook.startsWith('http')
        ? studio.studio_facebook
        : `https://facebook.com/${studio.studio_facebook}`,
    )
  }

  return (
    <View style={s.root}>
      {/* Tab bar */}
      <View style={s.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && (
        <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} />
      )}

      {/* About tab */}
      {!loading && activeTab === 'About' && (
        <ScrollView contentContainerStyle={s.content}>
          {!!studio.studio_name && (
            <Text style={s.studioName}>{studio.studio_name}</Text>
          )}
          {!!studio.studio_about && (
            <View style={s.card}>
              <Text style={s.cardTitle}>About</Text>
              <Text style={s.aboutText}>{studio.studio_about}</Text>
            </View>
          )}

          <View style={s.card}>
            <Text style={s.cardTitle}>Contact</Text>
            {!!studio.studio_address && (
              <InfoRow icon="📍" label="Address" value={studio.studio_address} onPress={openMaps} />
            )}
            {!!studio.studio_phone && (
              <InfoRow icon="📞" label="Phone" value={studio.studio_phone} onPress={openPhone} />
            )}
            {!!studio.studio_email && (
              <InfoRow icon="✉️" label="Email" value={studio.studio_email} onPress={openEmail} />
            )}
            {!studio.studio_address && !studio.studio_phone && !studio.studio_email && (
              <Text style={s.empty}>No contact info available.</Text>
            )}
          </View>

          {(!!studio.studio_instagram || !!studio.studio_facebook) && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Social</Text>
              {!!studio.studio_instagram && (
                <InfoRow
                  icon="📸"
                  label="Instagram"
                  value={studio.studio_instagram}
                  onPress={openInstagram}
                />
              )}
              {!!studio.studio_facebook && (
                <InfoRow
                  icon="👥"
                  label="Facebook"
                  value={studio.studio_facebook}
                  onPress={openFacebook}
                />
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Team tab */}
      {!loading && activeTab === 'Team' && (
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.sectionHeading}>Our Team</Text>
          {instructorList.length === 0 && (
            <Text style={s.empty}>No instructors listed.</Text>
          )}
          {instructorList.map((instructor) => (
            <InstructorCard key={instructor.id} instructor={instructor} />
          ))}
        </ScrollView>
      )}

      {/* Policies tab */}
      {!loading && activeTab === 'Policies' && (
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.sectionHeading}>Studio Policies</Text>
          {studio.studio_policies ? (
            <View style={s.card}>
              <Text style={s.policiesText}>{studio.studio_policies}</Text>
            </View>
          ) : (
            <Text style={s.empty}>No policies have been published yet.</Text>
          )}
        </ScrollView>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 13,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#6366f1' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#6366f1' },

  content: { padding: 20, paddingBottom: 40 },
  studioName: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 16, textAlign: 'center' },
  sectionHeading: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTitle: {
    fontSize: 12, fontWeight: '700', color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12,
  },
  aboutText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  policiesText: { fontSize: 14, color: '#374151', lineHeight: 22 },

  // Info row
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  infoIcon: { fontSize: 18, marginRight: 12, marginTop: 1 },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 2, fontWeight: '500' },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  infoValueLink: { color: '#6366f1', textDecorationLine: 'underline' },

  // Instructor card
  instructorCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  instructorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 14 },
  avatarFallback: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#6366f1',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarInitials: { color: '#fff', fontSize: 18, fontWeight: '700' },
  instructorMeta: { flex: 1 },
  instructorName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  instructorEmail: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  instructorBio: { fontSize: 14, color: '#374151', lineHeight: 20 },

  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 24, fontSize: 14 },
})
