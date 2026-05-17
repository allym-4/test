import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const OPTIONS = [
  {
    key: 'beginner',
    emoji: '👋',
    title: "I'm brand new",
    body: "Never done anything like this before — looking to try my first class.",
  },
  {
    key: 'some',
    emoji: '🙌',
    title: 'A bit of experience',
    body: "I've done a class or two and want to find my feet.",
  },
  {
    key: 'experienced',
    emoji: '🔥',
    title: "I've been training",
    body: "I have a solid base and want to find the right class level.",
  },
]

export default function OnboardingScreen({ userId, onDone }) {
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  async function handleContinue() {
    if (!selected) return
    setSaving(true)
    await AsyncStorage.setItem(`experience_level_${userId}`, selected)
    await AsyncStorage.setItem(`onboarding_done_${userId}`, 'true')
    onDone(selected)
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.inner}>
        <Text style={s.eyebrow}>Welcome</Text>
        <Text style={s.title}>Where are you at?</Text>
        <Text style={s.subtitle}>
          This helps us point you to the right trial class. You can always change this later.
        </Text>

        <View style={s.options}>
          {OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[s.option, selected === opt.key && s.optionSelected]}
              onPress={() => setSelected(opt.key)}
              activeOpacity={0.8}
            >
              <Text style={s.optionEmoji}>{opt.emoji}</Text>
              <View style={s.optionText}>
                <Text style={[s.optionTitle, selected === opt.key && s.optionTitleSelected]}>
                  {opt.title}
                </Text>
                <Text style={s.optionBody}>{opt.body}</Text>
              </View>
              <View style={[s.radio, selected === opt.key && s.radioSelected]}>
                {selected === opt.key && <View style={s.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[s.btn, !selected && s.btnDisabled]}
          onPress={handleContinue}
          disabled={!selected || saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Continue</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={s.skip} onPress={async () => {
          await AsyncStorage.setItem(`onboarding_done_${userId}`, 'true')
          onDone(null)
        }}>
          <Text style={s.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 28, justifyContent: 'center' },
  eyebrow: { fontSize: 13, fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  title: { fontSize: 30, fontWeight: '800', color: '#111827', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#6b7280', lineHeight: 22, marginBottom: 32 },
  options: { gap: 12, marginBottom: 32 },
  option: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: 'transparent', gap: 14 },
  optionSelected: { backgroundColor: '#eef2ff', borderColor: '#6366f1' },
  optionEmoji: { fontSize: 28 },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  optionTitleSelected: { color: '#4338ca' },
  optionBody: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#6366f1' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6366f1' },
  btn: { backgroundColor: '#6366f1', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#a5b4fc' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  skip: { alignItems: 'center', marginTop: 16 },
  skipText: { fontSize: 14, color: '#9ca3af' },
})
