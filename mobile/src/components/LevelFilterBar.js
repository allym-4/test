import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native'

export default function LevelFilterBar({ levels, selected, onSelect }) {
  const all = ['All', ...levels]
  return (
    <View style={s.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        {all.map(level => {
          const active = selected === level || (level === 'All' && !selected)
          return (
            <TouchableOpacity
              key={level}
              style={[s.chip, active && s.chipActive]}
              onPress={() => onSelect(active && level !== 'All' ? null : level === 'All' ? null : level)}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{level}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  wrapper: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  row: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: 'transparent' },
  chipActive: { backgroundColor: '#eef2ff', borderColor: '#6366f1' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  chipTextActive: { color: '#4338ca' },
})
