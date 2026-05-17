import { createContext, useContext, useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'
import { auth } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    SecureStore.getItemAsync('access_token').then(token => {
      if (token) {
        auth.me()
          .then(res => setUser(res.data))
          .catch(async () => {
            await SecureStore.deleteItemAsync('access_token')
            await SecureStore.deleteItemAsync('refresh_token')
          })
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })
  }, [])

  async function login(username, password) {
    const { data } = await auth.login(username, password)
    await SecureStore.setItemAsync('access_token', data.access)
    await SecureStore.setItemAsync('refresh_token', data.refresh)
    const me = await auth.me()
    setUser(me.data)
    return me.data
  }

  async function logout() {
    await SecureStore.deleteItemAsync('access_token')
    await SecureStore.deleteItemAsync('refresh_token')
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
