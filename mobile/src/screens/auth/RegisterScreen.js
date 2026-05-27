import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image,
  StatusBar, ScrollView,
} from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { auth } from '../../api'
import client from '../../api/client'

// ─── helpers ──────────────────────────────────────────────────────────────────
function parseDob(str) {
  // str = "DD/MM/YYYY"
  const [d, m, y] = str.split('/').map(Number)
  if (!d || !m || !y || y < 1900) return null
  return new Date(y, m - 1, d)
}

function checkAge(dobStr) {
  const dob = parseDob(dobStr)
  if (!dob) return 'Please enter your date of birth as DD/MM/YYYY'
  const today = new Date()
  const age = today.getFullYear() - dob.getFullYear() - (
    today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0
  )
  if (age < 18) return 'You must be at least 18 to register.'
  return null
}

// ─── StepIndicator ────────────────────────────────────────────────────────────
function StepIndicator({ step, total }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{
          width: i === step - 1 ? 24 : 8, height: 8, borderRadius: 4,
          backgroundColor: i < step ? '#ccff00' : '#333',
        }} />
      ))}
    </View>
  )
}

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth()
  const [step, setStep] = useState(1)

  // Step 1 fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [dob, setDob] = useState('')
  const [phone, setPhone] = useState('')

  // Step 2 fields
  const [address, setAddress] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')

  // Step 3 fields
  const [waiverText, setWaiverText] = useState('')
  const [waiverLoading, setWaiverLoading] = useState(false)
  const [waiverAgreed, setWaiverAgreed] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch waiver text when reaching step 3
  useEffect(() => {
    if (step === 3) {
      setWaiverLoading(true)
      client.get('/api/users/waiver/')
        .then(r => {
          const text = r.data?.text ?? r.data?.content ?? r.data?.waiver_text ?? (typeof r.data === 'string' ? r.data : '')
          setWaiverText(text)
        })
        .catch(() => setWaiverText(''))
        .finally(() => setWaiverLoading(false))
    }
  }, [step])

  function handleStep1Next() {
    setError('')
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('All fields are required.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!dob.trim()) {
      setError('Please enter your date of birth as DD/MM/YYYY')
      return
    }
    const ageError = checkAge(dob.trim())
    if (ageError) {
      setError(ageError)
      return
    }
    if (!phone.trim()) {
      setError('Phone number is required.')
      return
    }
    setStep(2)
  }

  function handleStep2Next() {
    setError('')
    if (!address.trim()) {
      setError('Address is required.')
      return
    }
    if (!emergencyName.trim() || !emergencyPhone.trim()) {
      setError('Emergency contact name and phone are required.')
      return
    }
    setStep(3)
  }

  async function handleRegister() {
    if (!waiverAgreed) return
    setError('')
    setLoading(true)
    try {
      // Convert DD/MM/YYYY → YYYY-MM-DD
      const [d, m, y] = dob.trim().split('/').map(Number)
      const dobIso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

      const { data: registered } = await auth.register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
        date_of_birth: dobIso,
        phone: phone.trim(),
        address: address.trim(),
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_phone: emergencyPhone.trim(),
        waiver_agreed: true,
      })
      await login(registered.username, password)

      // Try to submit waiver form (best effort)
      try {
        const { forms } = await import('../../api')
        await forms.submit('waiver', { agreed: true, signed_at: new Date().toISOString() })
      } catch {}
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const messages = Object.values(data).flat()
        setError(messages.join(' '))
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.logoWrap}>
            <Image source={require('../../../assets/icon.png')} style={s.logo} resizeMode="contain" />
          </View>
          <Text style={s.studio}>DUALITY POLE</Text>
          <Text style={s.tagline}>Create your account</Text>

          <StepIndicator step={step} total={3} />

          {/* ══ STEP 1: Account Details ══ */}
          {step === 1 && (
            <View style={s.form}>
              <Text style={s.stepTitle}>Account details</Text>

              <TextInput
                style={s.input}
                placeholder="First name"
                placeholderTextColor="#555"
                autoCapitalize="words"
                value={firstName}
                onChangeText={setFirstName}
                selectionColor="#ccff00"
              />
              <TextInput
                style={s.input}
                placeholder="Last name"
                placeholderTextColor="#555"
                autoCapitalize="words"
                value={lastName}
                onChangeText={setLastName}
                selectionColor="#ccff00"
              />
              <TextInput
                style={s.input}
                placeholder="Email"
                placeholderTextColor="#555"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                selectionColor="#ccff00"
              />
              <TextInput
                style={s.input}
                placeholder="Password (min 8 characters)"
                placeholderTextColor="#555"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                selectionColor="#ccff00"
              />
              <TextInput
                style={s.input}
                placeholder="Confirm password"
                placeholderTextColor="#555"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                selectionColor="#ccff00"
              />
              <TextInput
                style={s.input}
                placeholder="Date of birth (DD/MM/YYYY)"
                placeholderTextColor="#555"
                keyboardType="numbers-and-punctuation"
                value={dob}
                onChangeText={setDob}
                selectionColor="#ccff00"
              />
              <TextInput
                style={s.input}
                placeholder="Phone number"
                placeholderTextColor="#555"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                selectionColor="#ccff00"
              />

              {!!error && <Text style={s.error}>{error}</Text>}

              <TouchableOpacity style={s.btn} onPress={handleStep1Next} activeOpacity={0.85}>
                <Text style={s.btnText}>Next →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══ STEP 2: Contact Details ══ */}
          {step === 2 && (
            <View style={s.form}>
              <Text style={s.stepTitle}>Contact details</Text>

              <TextInput
                style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder="Address"
                placeholderTextColor="#555"
                autoCapitalize="words"
                multiline
                value={address}
                onChangeText={setAddress}
                selectionColor="#ccff00"
              />
              <TextInput
                style={s.input}
                placeholder="Emergency contact name"
                placeholderTextColor="#555"
                autoCapitalize="words"
                value={emergencyName}
                onChangeText={setEmergencyName}
                selectionColor="#ccff00"
              />
              <TextInput
                style={s.input}
                placeholder="Emergency contact phone"
                placeholderTextColor="#555"
                keyboardType="phone-pad"
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}
                selectionColor="#ccff00"
              />

              {!!error && <Text style={s.error}>{error}</Text>}

              <View style={s.navRow}>
                <TouchableOpacity style={s.backBtn} onPress={() => { setStep(1); setError('') }} activeOpacity={0.85}>
                  <Text style={s.backBtnText}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={handleStep2Next} activeOpacity={0.85}>
                  <Text style={s.btnText}>Next →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ══ STEP 3: Waiver ══ */}
          {step === 3 && (
            <View style={s.form}>
              <Text style={s.stepTitle}>Studio waiver</Text>
              <Text style={s.stepSub}>Please read and agree to the studio's terms before completing your registration.</Text>

              <View style={s.waiverBox}>
                {waiverLoading ? (
                  <ActivityIndicator color="#ccff00" style={{ paddingVertical: 24 }} />
                ) : (
                  <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator nestedScrollEnabled>
                    <Text style={s.waiverText}>
                      {waiverText || 'I understand that pole fitness and aerial activities carry inherent risks including but not limited to injury from falling, equipment failure, or overexertion. I voluntarily participate in all activities and accept full responsibility for my own wellbeing. I agree to follow all studio rules and instructor guidance at all times.'}
                    </Text>
                  </ScrollView>
                )}
              </View>

              <TouchableOpacity
                style={s.checkboxRow}
                onPress={() => setWaiverAgreed(a => !a)}
                activeOpacity={0.8}
              >
                <View style={[s.checkbox, waiverAgreed && s.checkboxChecked]}>
                  {waiverAgreed && <Text style={s.checkboxTick}>✓</Text>}
                </View>
                <Text style={s.checkboxLabel}>I have read and agree to the studio's terms and waiver</Text>
              </TouchableOpacity>

              {!!error && <Text style={s.error}>{error}</Text>}

              <View style={s.navRow}>
                <TouchableOpacity style={s.backBtn} onPress={() => { setStep(2); setError('') }} activeOpacity={0.85}>
                  <Text style={s.backBtnText}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btn, { flex: 1, opacity: waiverAgreed ? 1 : 0.4 }]}
                  onPress={handleRegister}
                  disabled={!waiverAgreed || loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color="#000" />
                    : <Text style={s.btnText}>Complete Registration</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7} style={s.linkWrap}>
            <Text style={s.link}>Already have an account? <Text style={s.linkAccent}>Sign in</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  logo: {
    width: 72,
    height: 72,
  },
  studio: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ccff00',
    letterSpacing: 4,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  stepSub: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
  },
  error: {
    color: '#ff4444',
    fontSize: 13,
    marginBottom: 8,
  },
  btn: {
    backgroundColor: '#ccff00',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  navRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  backBtn: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  backBtnText: {
    color: '#888',
    fontWeight: '700',
    fontSize: 15,
  },
  waiverBox: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  waiverText: {
    fontSize: 13,
    color: '#aaa',
    lineHeight: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#ccff00',
    borderColor: '#ccff00',
  },
  checkboxTick: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  linkWrap: {
    marginTop: 32,
  },
  link: {
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
  },
  linkAccent: {
    color: '#ccff00',
  },
})
