import { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { auth } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    AsyncStorage.getItem('access_token').then(token => {
      if (token) {
        auth.me()
          .then(res => setUser(res.data))
          .catch(() => AsyncStorage.multiRemove(['access_token', 'refresh_token']))
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })
  }, [])

  async function login(username, password) {
    const { data } = await auth.login(username, password)
    await AsyncStorage.setItem('access_token', data.access)
    await AsyncStorage.setItem('refresh_token', data.refresh)
    const me = await auth.me()
    setUser(me.data)
    return me.data
  }

  async function logout() {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token'])
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
