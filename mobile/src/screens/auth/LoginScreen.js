import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image,
  StatusBar,
} from 'react-native'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginScreen({ navigation }) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!username || !password) return
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      Alert.alert('Login failed', err.response?.data?.detail || 'Check your credentials and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.inner}>
          <View style={s.logoWrap}>
            <Image source={require('../../../assets/icon.png')} style={s.logo} resizeMode="contain" />
          </View>
          <Text style={s.studio}>DUALITY POLE</Text>
          <Text style={s.tagline}>Sign in to your account</Text>

          <View style={s.form}>
            <TextInput
              style={s.input}
              placeholder="Email or username"
              placeholderTextColor="#555"
              autoCapitalize="none"
              keyboardType="email-address"
              value={username}
              onChangeText={setUsername}
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
            <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text style={s.btnText}>Sign in</Text>
              }
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7} style={s.linkWrap}>
            <Text style={s.link}>Don't have an account? <Text style={s.linkAccent}>Create account</Text></Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Enquire')} activeOpacity={0.7} style={[s.linkWrap, { marginTop: 12 }]}>
            <Text style={s.link}>Interested in joining? <Text style={s.linkAccent}>Send an enquiry</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
