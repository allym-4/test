import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  StatusBar,
} from 'react-native'
import client from '../api/client'

const SOURCES = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'google', label: 'Google' },
  { value: 'referral', label: 'Referred by someone' },
  { value: 'website', label: 'Website' },
  { value: 'walkin', label: 'Walked in' },
  { value: 'other', label: 'Other' },
]

export default function EnquireScreen({ navigation }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', source: 'instagram', notes: '' })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)
  const [sourceOpen, setSourceOpen] = useState(false)

  function set(f, v) { setForm(x => ({ ...x, [f]: v })) }

  async function handleSubmit() {
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await client.post('/api/leads/public/', form)
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.name?.[0] || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#000' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Back */}
          <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={s.studio}>DUALITY POLE</Text>
          <Text style={s.heading}>New Student Enquiry</Text>
          <Text style={s.sub}>
            Interested in classes? Fill in your details and we'll reach out to help you find the right class.
          </Text>

          {done ? (
            <View style={s.successCard}>
              <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 14 }}>🎉</Text>
              <Text style={s.successTitle}>Thanks! We'll be in touch soon.</Text>
              <Text style={s.successBody}>
                One of our team will reach out to help you get started. In the meantime, follow us on Instagram for class updates.
              </Text>
              <TouchableOpacity style={s.doneBtn} onPress={() => navigation.goBack()}>
                <Text style={s.doneBtnText}>Back to sign in</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.card}>
              {error && (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              <Text style={s.label}>Name *</Text>
              <TextInput
                style={s.input}
                placeholder="Your name"
                placeholderTextColor="#555"
                value={form.name}
                onChangeText={v => set('name', v)}
                autoFocus
                selectionColor="#ccff00"
              />

              <Text style={s.label}>Phone</Text>
              <TextInput
                style={s.input}
                placeholder="04xx xxx xxx"
                placeholderTextColor="#555"
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={v => set('phone', v)}
                selectionColor="#ccff00"
              />

              <Text style={s.label}>Email</Text>
              <TextInput
                style={s.input}
                placeholder="you@example.com"
                placeholderTextColor="#555"
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={v => set('email', v)}
                selectionColor="#ccff00"
              />

              <Text style={s.label}>How did you hear about us?</Text>
              <TouchableOpacity style={s.select} onPress={() => setSourceOpen(o => !o)}>
                <Text style={s.selectText}>{SOURCES.find(src => src.value === form.source)?.label ?? 'Select…'}</Text>
                <Text style={{ color: '#555' }}>{sourceOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {sourceOpen && (
                <View style={s.dropdown}>
                  {SOURCES.map(src => (
                    <TouchableOpacity
                      key={src.value}
                      style={[s.dropdownItem, form.source === src.value && s.dropdownItemActive]}
                      onPress={() => { set('source', src.value); setSourceOpen(false) }}
                    >
                      <Text style={[s.dropdownItemText, form.source === src.value && s.dropdownItemTextActive]}>
                        {src.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={s.label}>Message (optional)</Text>
              <TextInput
                style={[s.input, s.textarea]}
                placeholder="e.g. which class you're interested in, your experience level, any questions…"
                placeholderTextColor="#555"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={form.notes}
                onChangeText={v => set('notes', v)}
                selectionColor="#ccff00"
              />

              <TouchableOpacity
                style={[s.btn, (!form.name.trim() || saving) && s.btnDisabled]}
                onPress={handleSubmit}
                disabled={!form.name.trim() || saving}
              >
                {saving
                  ? <ActivityIndicator color="#000" />
                  : <Text style={s.btnText}>Send enquiry</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },
  back: { marginBottom: 24 },
  backText: { fontSize: 14, color: '#555' },
  studio: { fontSize: 20, fontWeight: '900', color: '#ccff00', letterSpacing: 4, marginBottom: 6 },
  heading: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 8 },
  sub: { fontSize: 14, color: '#666', lineHeight: 22, marginBottom: 28 },
  card: { backgroundColor: '#111', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#222' },
  errorBox: { backgroundColor: 'rgba(255,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(255,68,68,0.3)', borderRadius: 8, padding: 12, marginBottom: 14 },
  errorText: { fontSize: 13, color: '#ff4444' },
  label: { fontSize: 12, color: '#666', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 8, color: '#fff', fontSize: 15, padding: 14 },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  select: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectText: { fontSize: 15, color: '#fff' },
  dropdown: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 8, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#222' },
  dropdownItemActive: { backgroundColor: 'rgba(204,255,0,0.08)' },
  dropdownItemText: { fontSize: 14, color: '#aaa' },
  dropdownItemTextActive: { color: '#ccff00', fontWeight: '700' },
  btn: { backgroundColor: '#ccff00', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 20 },
  btnDisabled: { backgroundColor: '#333' },
  btnText: { color: '#000', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
  successCard: { backgroundColor: '#111', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#222', alignItems: 'center' },
  successTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 10 },
  successBody: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  doneBtn: { backgroundColor: '#ccff00', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14 },
  doneBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
})
