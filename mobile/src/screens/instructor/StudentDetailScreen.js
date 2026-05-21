import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import { users, enrolments, payments as paymentsApi } from '../../api'

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  )
}

function Section({ title, children }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

export default function StudentDetailScreen({ route }) {
  const { studentId, studentName } = route.params ?? {}

  const [student, setStudent] = useState(null)
  const [loadingStudent, setLoadingStudent] = useState(true)
  const [studentEnrolments, setStudentEnrolments] = useState([])
  const [loadingEnr, setLoadingEnr] = useState(true)
  const [balance, setBalance] = useState(null)

  useEffect(() => {
    if (!studentId) return
    setLoadingStudent(true)
    users.get(studentId)
      .then(res => setStudent(res.data))
      .catch(() => {})
      .finally(() => setLoadingStudent(false))
  }, [studentId])

  useEffect(() => {
    if (!studentId) return
    setLoadingEnr(true)
    enrolments.list({ student: studentId, status: 'active' })
      .then(res => {
        const data = res.data?.results ?? res.data ?? []
        setStudentEnrolments(data)
      })
      .catch(() => {})
      .finally(() => setLoadingEnr(false))
  }, [studentId])

  useEffect(() => {
    if (!studentId) return
    paymentsApi.balance(studentId)
      .then(res => setBalance(parseFloat(res.data.balance)))
      .catch(() => {})
  }, [studentId])

  const displayName = student?.display_name
    || [student?.first_name, student?.last_name].filter(Boolean).join(' ')
    || studentName
    || 'Student'

  const initials = (
    (student?.first_name?.[0] ?? '') +
    (student?.last_name?.[0] ?? '')
  ).toUpperCase() || displayName[0]?.toUpperCase() || '?'

  const owing = balance != null && balance < 0 ? Math.abs(balance) : 0

  if (loadingStudent) {
    return (
      <View style={s.root}>
        <ActivityIndicator style={{ marginTop: 60 }} color="#ccff00" />
      </View>
    )
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Avatar + name */}
      <View style={s.profileCard}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.name}>{displayName}</Text>
        {student?.pronouns ? (
          <Text style={s.pronouns}>{student.pronouns}</Text>
        ) : null}
        {student?.level_display || student?.level ? (
          <View style={s.levelBadge}>
            <Text style={s.levelBadgeText}>
              {student.level_display ?? `Level ${student.level}`}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Balance warning */}
      {owing > 0 && (
        <View style={s.owingBanner}>
          <Text style={s.owingText}>⚠ ${owing.toFixed(2)} owing</Text>
        </View>
      )}

      {/* Contact info */}
      <Section title="Contact">
        <InfoRow label="Email" value={student?.email} />
        <InfoRow label="Phone" value={student?.phone} />
        <InfoRow label="Emergency contact" value={student?.emergency_contact_name} />
        <InfoRow label="Emergency phone" value={student?.emergency_contact_phone} />
      </Section>

      {/* Active enrolments */}
      <Section title="Active Enrolments">
        {loadingEnr ? (
          <ActivityIndicator style={{ marginVertical: 16 }} color="#ccff00" />
        ) : studentEnrolments.length === 0 ? (
          <Text style={s.empty}>No active enrolments.</Text>
        ) : (
          studentEnrolments.map(enr => (
            <View key={enr.id} style={s.enrCard}>
              <View style={s.enrTop}>
                <Text style={s.enrName} numberOfLines={1}>
                  {enr.class_session_detail?.name ?? enr.session?.name ?? 'Class'}
                </Text>
                <View style={[
                  s.enrTypeBadge,
                  enr.enrolment_type === 'trial' && s.enrTypeBadgeTrial,
                ]}>
                  <Text style={[
                    s.enrTypeBadgeText,
                    enr.enrolment_type === 'trial' && s.enrTypeBadgeTextTrial,
                  ]}>
                    {enr.enrolment_type}
                  </Text>
                </View>
              </View>
              {enr.season_detail?.name ? (
                <Text style={s.enrSeason}>{enr.season_detail.name}</Text>
              ) : null}
            </View>
          ))
        )}
      </Section>

      {/* Notes */}
      {student?.notes ? (
        <Section title="Notes">
          <Text style={s.notes}>{student.notes}</Text>
        </Section>
      ) : null}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { padding: 16, paddingBottom: 48 },

  // Profile card
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#2a1a6e',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#b0a0ff', fontSize: 26, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  pronouns: { fontSize: 13, color: '#555', marginTop: 3 },
  levelBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(204,255,0,0.12)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  levelBadgeText: { fontSize: 12, fontWeight: '700', color: '#ccff00' },

  // Owing banner
  owingBanner: {
    backgroundColor: 'rgba(255,80,80,0.12)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.3)',
    alignItems: 'center',
  },
  owingText: { color: '#ff5050', fontWeight: '700', fontSize: 14 },

  // Section
  section: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#222',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  infoLabel: { fontSize: 13, color: '#555', flex: 1 },
  infoValue: { fontSize: 13, color: '#fff', flex: 2, textAlign: 'right' },

  // Enrolment cards
  enrCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  enrTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  enrName: { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1, marginRight: 8 },
  enrTypeBadge: {
    backgroundColor: 'rgba(176,160,255,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  enrTypeBadgeText: { fontSize: 11, fontWeight: '600', color: '#b0a0ff', textTransform: 'capitalize' },
  enrTypeBadgeTrial: { backgroundColor: 'rgba(245,158,11,0.15)' },
  enrTypeBadgeTextTrial: { color: '#f59e0b' },
  enrSeason: { fontSize: 12, color: '#555', marginTop: 4 },

  // Empty / notes
  empty: { fontSize: 13, color: '#555', paddingVertical: 4 },
  notes: { fontSize: 14, color: '#ccc', lineHeight: 20 },
})
