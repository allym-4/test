import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image,
  StatusBar, ScrollView,
} from 'react-native'
import { useAuth } from '../../contexts/AuthContext'
import { auth } from '../../api'

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister() {
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

    setLoading(true)
    try {
      await auth.register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
      })
      await login(email.trim(), password)
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

          <View style={s.form}>
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
              placeholder="Password"
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

            {!!error && <Text style={s.error}>{error}</Text>}

            <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text style={s.btnText}>Create account</Text>
              }
            </TouchableOpacity>
          </View>

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
    marginBottom: 40,
    letterSpacing: 0.5,
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
