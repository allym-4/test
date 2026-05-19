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
  root: { flex: 1, backgroundColor: '#000' },
  inner: { flex: 1, padding: 28, justifyContent: 'center' },
  eyebrow: { fontSize: 13, fontWeight: '700', color: '#ccff00', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 },
  title: { fontSize: 30, fontWeight: '800', color: '#fff', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 32 },
  options: { gap: 10, marginBottom: 32 },
  option: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#222', gap: 14 },
  optionSelected: { backgroundColor: 'rgba(204,255,0,0.06)', borderColor: '#ccff00' },
  optionEmoji: { fontSize: 26 },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  optionTitleSelected: { color: '#ccff00' },
  optionBody: { fontSize: 13, color: '#666', lineHeight: 18 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#ccff00' },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#ccff00' },
  btn: { backgroundColor: '#ccff00', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: '#000', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },
  skip: { alignItems: 'center', marginTop: 16 },
  skipText: { fontSize: 14, color: '#444' },
})
