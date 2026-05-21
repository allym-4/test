import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useApi } from '../../hooks/useApi'
import { users } from '../../api'

const LEVEL_COLORS = {
  1: '#b0a0ff', 2: '#b0a0ff', 3: '#ccff00',
  4: '#ccff00', 5: '#ffaa00', 6: '#ff5050',
}

function StudentRow({ student, onPress }) {
  const name = student.display_name || `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || student.email || 'Student'
  const initial = (student.first_name || student.display_name || '?')[0].toUpperCase()
  const level = student.level
  const levelColor = LEVEL_COLORS[level] ?? '#888'

  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initial}</Text>
      </View>
      <View style={s.rowInfo}>
        <View style={s.rowTop}>
          <Text style={s.name} numberOfLines={1}>{name}</Text>
          {level != null && (
            <View style={[s.levelBadge, { borderColor: levelColor }]}>
              <Text style={[s.levelBadgeText, { color: levelColor }]}>Level {level}</Text>
            </View>
          )}
        </View>
        {student.pronouns ? <Text style={s.pronouns}>{student.pronouns}</Text> : null}
        {student.email ? <Text style={s.email} numberOfLines={1}>{student.email}</Text> : null}
      </View>
      <Text style={s.chevron}>›</Text>
    </TouchableOpacity>
  )
}

export default function StudentsScreen({ navigation }) {
  const [search, setSearch] = useState('')
  const { data, loading, error, refetch } = useApi(() => users.list({ role: 'student' }), [])
  const allStudents = data?.results ?? data ?? []

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
      <Text style={s.heading}>Students</Text>
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
  heading: { fontSize: 20, fontWeight: '700', color: '#fff', padding: 16, paddingBottom: 8 },
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
  levelBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 0 },
  levelBadgeText: { fontSize: 10, fontWeight: '700' },
  pronouns: { fontSize: 11, color: '#555', marginBottom: 1 },
  email: { fontSize: 12, color: '#888' },
  chevron: { fontSize: 20, color: '#444', flexShrink: 0 },
})
