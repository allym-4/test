import { useState } from 'react'
import {
  ScrollView, View, Text, TouchableOpacity, Image,
  StyleSheet, Linking, ActivityIndicator,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { settings, users, studios as studiosApi } from '../../api'

const TABS = [
  ['about', 'About'],
  ['our-studio', 'Our Studio'],
  ['team', 'Team'],
  ['policies', 'Policies'],
  ['code', 'The Code'],
]

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
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>
  }
  return content
}

function InstructorCard({ instructor }) {
  const initials = [instructor.first_name?.[0], instructor.last_name?.[0]]
    .filter(Boolean).join('').toUpperCase()
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
          <Text style={s.instructorRole}>Instructor</Text>
          {!!instructor.pronouns && <Text style={s.instructorPronouns}>{instructor.pronouns}</Text>}
        </View>
      </View>
      {!!instructor.bio && <Text style={s.instructorBio}>{instructor.bio}</Text>}
    </View>
  )
}

export default function StudioInfoScreen() {
  const [activeTab, setActiveTab] = useState('about')

  const { data: studioSettings, loading: settingsLoading } = useApi(() => settings.get(), [])
  const { data: instructorData, loading: instructorsLoading } = useApi(() => users.list({ role: 'instructor' }), [])
  const { data: studiosData } = useApi(() => studiosApi.list(), [])

  const studio = studioSettings ?? {}
  const instructorList = instructorData?.results ?? instructorData ?? []
  const locations = (studiosData?.results ?? studiosData ?? []).filter(l => l.is_active)
  const loading = settingsLoading || instructorsLoading

  const cancelWindow = studio.cancellation_window_hours ?? 24
  const noShowFee = studio.no_show_fee ? `$${parseFloat(studio.no_show_fee).toFixed(0)}` : '$20'
  const lateCancelFee = studio.late_cancel_fee ? `$${parseFloat(studio.late_cancel_fee).toFixed(0)}` : '$10'
  const creditExpiry = studio.credit_expiry_days ?? 60
  const maxFreeze = studio.max_freeze_weeks ?? 8

  const policies = [
    {
      title: 'Cancellation Policy',
      body: `Cancellations must be made at least ${cancelWindow} hours before class. Late cancellations (within ${cancelWindow} hours) incur a ${lateCancelFee} fee. No-shows incur a ${noShowFee} fee.`,
    },
    {
      title: 'Waitlist Policy',
      body: "When a spot opens, the first student on the waitlist is notified by email and has 12 hours to accept. If they don't respond, the next student is offered the spot.",
    },
    {
      title: 'Makeup Credits',
      body: `Approved absences (illness, injury, or emergency) may receive a makeup credit. Credits expire ${creditExpiry} days after issue. Maximum 2 credits per season. Credits are non-transferable.`,
    },
    {
      title: 'Refund Policy',
      body: "Season enrolments are non-refundable after the season commences. If you are unable to continue due to medical reasons, please contact us — we'll do our best to help.",
    },
    {
      title: 'Photography & Filming',
      body: `You must obtain consent from all individuals before filming or photographing in the studio. ${studio.studio_name || 'The studio'} may photograph or film classes for marketing purposes — let us know if you opt out.`,
    },
  ]

  const studioAddress = studio.address || 'Level 1, 88 Kippax St, Surry Hills NSW 2010'
  const studioPhone = studio.phone || '(02) 9160 0223'
  const studioInstagram = studio.instagram_username || studio.instagram?.replace('@', '') || 'dualitypole'

  function openMaps() {
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(studioAddress)}`)
  }

  function openPhone(ph) {
    Linking.openURL(`tel:${ph.replace(/[\s()]/g, '')}`)
  }

  function openEmail(em) {
    Linking.openURL(`mailto:${em}`)
  }

  function openInstagram() {
    Linking.openURL(`https://instagram.com/${studioInstagram}`)
  }

  return (
    <View style={s.root}>
      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabBarContent}>
        {TABS.map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[s.tab, activeTab === key && s.tabActive]}
            onPress={() => setActiveTab(key)}
          >
            <Text style={[s.tabText, activeTab === key && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && <ActivityIndicator color="#ccff00" style={{ marginTop: 40 }} />}

      {/* About */}
      {!loading && activeTab === 'about' && (
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.card}>
            <Text style={s.tagline}>{studio.tagline || 'Our purpose-built playground for all things pole.'}</Text>
            {(studio.description || '').split('\n\n').map((para, i) => (
              <Text key={i} style={[s.aboutText, i > 0 && { marginTop: 10 }]}>{para}</Text>
            ))}
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            {[['2021', 'Est.'], ['3', 'Studios'], [`${instructorList.length || ''}+`, 'Instructors']].map(([val, label]) => (
              <View key={label} style={s.statCard}>
                <Text style={s.statVal}>{val}</Text>
                <Text style={s.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Contact */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Get in Touch</Text>
            <InfoRow icon="✉️" label="General enquiries" value="intrigued@dualitypole.com" onPress={() => openEmail('intrigued@dualitypole.com')} />
            {studioPhone ? <InfoRow icon="📞" label="Phone" value={studioPhone} onPress={() => openPhone(studioPhone)} /> : null}
            {studioInstagram ? <InfoRow icon="📸" label="Instagram" value={`@${studioInstagram}`} onPress={openInstagram} /> : null}
            {studioAddress ? <InfoRow icon="📍" label="Address" value={studioAddress} onPress={openMaps} /> : null}
            <View style={s.urgentNote}>
              <Text style={s.urgentNoteText}>
                For the fastest response, use the{' '}
                <Text style={{ color: '#ccff00', fontWeight: '700' }}>I Need Help</Text>
                {' '}tab to lodge a support ticket — our team is notified immediately. For same-day urgent issues (e.g. can't access the studio, running late), email{' '}
                <Text style={{ color: '#fff' }}>intrigued@dualitypole.com</Text>
                {' '}— monitored before and during class time.
              </Text>
            </View>
          </View>

          {/* Acknowledgements */}
          <View style={[s.card, { borderColor: '#333' }]}>
            <Text style={s.cardTitle}>Acknowledgements</Text>
            <Text style={s.ackText}>
              We acknowledge the Traditional Custodians of the land on which we dance, the Gadigal People. We pay our respects to their Elders past and present. We dance on stolen land.
            </Text>
            <View style={s.divider} />
            <Text style={s.ackText}>
              We honour and respect the pioneers of pole dance — the past and present sex workers whose artistry, resilience, and innovation built the foundation of this industry. Their courage and creativity carved a path that allows us to move, express, and connect through pole today.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Our Studio */}
      {!loading && activeTab === 'our-studio' && (
        <ScrollView contentContainerStyle={s.content}>
          <TouchableOpacity onPress={openMaps} style={s.addressRow}>
            <Text style={s.addressText}>📍 {studioAddress}{studioPhone ? ` · ${studioPhone}` : ''}</Text>
          </TouchableOpacity>

          {locations.map(loc => (
            <View key={loc.name} style={s.locationCard}>
              <View style={s.locationHeader}>
                <Text style={s.locationName}>{loc.name}</Text>
                <View style={s.polesBadge}>
                  <Text style={s.polesBadgeText}>{loc.poles} poles</Text>
                </View>
              </View>
              {loc.features.map((f, i) => (
                <View key={i} style={s.featureRow}>
                  <View style={s.featureDot} />
                  <Text style={s.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          ))}

          <View style={s.card}>
            <Text style={s.cardTitle}>Shared Spaces</Text>
            <Text style={s.sharedText}>
              Spacious and luxe reception area · Change rooms · Gender-neutral bathrooms with shower · Dyson tap-and-dryer · Locker room for season storage
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Team */}
      {!loading && activeTab === 'team' && (
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.sectionHeading}>Our Team</Text>
          {instructorList.length === 0 && (
            <Text style={s.empty}>No instructors listed.</Text>
          )}
          {instructorList.map(instructor => (
            <InstructorCard key={instructor.id} instructor={instructor} />
          ))}
        </ScrollView>
      )}

      {/* Policies */}
      {!loading && activeTab === 'policies' && (
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.sectionHeading}>Studio Policies</Text>
          {policies.map((policy, i) => (
            <View key={i} style={s.policyCard}>
              <Text style={s.policyTitle}>{policy.title}</Text>
              <Text style={s.policyBody}>{policy.body}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* The Code */}
      {!loading && activeTab === 'code' && (
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.sectionHeading}>{studio.studio_name ? `The ${studio.studio_name} Code` : 'Studio Code'}</Text>
          <Text style={s.codeSubtitle}>A very important guide on being a good human within our space.</Text>
          {(studio.studio_code || []).map((item, i) => (
            <View key={i} style={s.codeCard}>
              <Text style={s.codeIcon}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.codeTitle}>{item.title}</Text>
                <Text style={s.codeBody}>{item.body}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  // Tab bar
  tabBar: { flexGrow: 0, backgroundColor: '#000', borderBottomWidth: 1, borderBottomColor: '#222' },
  tabBarContent: { flexDirection: 'row' },
  tab: { paddingVertical: 13, paddingHorizontal: 18, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#ccff00' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#ccff00' },

  content: { padding: 16, paddingBottom: 40 },
  sectionHeading: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 },

  // Card
  card: { backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#222' },
  cardTitle: { fontSize: 11, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },

  // About
  tagline: { fontSize: 17, fontWeight: '700', color: '#ccff00', marginBottom: 12 },
  aboutText: { fontSize: 14, color: '#aaa', lineHeight: 22 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: '#111', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  statVal: { fontSize: 22, fontWeight: '800', color: '#ccff00', marginBottom: 4 },
  statLabel: { fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },

  // Acknowledgements
  ackText: { fontSize: 13, color: '#888', lineHeight: 22 },
  divider: { height: 1, backgroundColor: '#1a1a1a', marginVertical: 12 },
  urgentNote: { backgroundColor: '#0a0a0a', borderRadius: 8, padding: 12, marginTop: 8 },
  urgentNoteText: { fontSize: 12, color: '#666', lineHeight: 18 },

  // Info row
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  infoIcon: { fontSize: 18, marginRight: 12, marginTop: 1 },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#555', marginBottom: 2, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue: { fontSize: 14, color: '#ccc', fontWeight: '500' },
  infoValueLink: { color: '#ccff00' },

  // Address row
  addressRow: { backgroundColor: '#111', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#222' },
  addressText: { fontSize: 13, color: '#888', lineHeight: 18 },

  // Locations
  locationCard: { backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#222' },
  locationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  locationName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  polesBadge: { backgroundColor: 'rgba(204,255,0,0.12)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.3)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  polesBadgeText: { fontSize: 12, fontWeight: '700', color: '#ccff00' },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  featureDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#555', marginTop: 7, marginRight: 10, flexShrink: 0 },
  featureText: { fontSize: 13, color: '#888', lineHeight: 20, flex: 1 },
  sharedText: { fontSize: 13, color: '#888', lineHeight: 22 },

  // Instructor card
  instructorCard: { backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#222' },
  instructorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 14 },
  avatarFallback: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#1a0f2e', alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 1, borderColor: '#7c3aed' },
  avatarInitials: { color: '#ccff00', fontSize: 18, fontWeight: '700' },
  instructorMeta: { flex: 1 },
  instructorName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  instructorRole: { fontSize: 12, color: '#555', marginTop: 2, textTransform: 'capitalize' },
  instructorPronouns: { fontSize: 12, color: '#7c3aed', marginTop: 2 },
  instructorBio: { fontSize: 14, color: '#aaa', lineHeight: 20 },

  // Policy cards
  policyCard: { backgroundColor: '#111', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  policyTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 6 },
  policyBody: { fontSize: 13, color: '#888', lineHeight: 22 },

  // Code cards
  codeSubtitle: { fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 20 },
  codeCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#111', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#222', gap: 14 },
  codeIcon: { fontSize: 24, flexShrink: 0 },
  codeTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 4 },
  codeBody: { fontSize: 13, color: '#888', lineHeight: 20 },

  empty: { color: '#555', textAlign: 'center', marginTop: 24, fontSize: 14 },
})
