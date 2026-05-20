import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const BASE_URL = 'https://test-production-8a97.up.railway.app'

const client = axios.create({ baseURL: BASE_URL })

// Single shared promise to prevent concurrent refresh attempts
let refreshPromise = null

client.interceptors.request.use(async config => {
  const token = await SecureStore.getItemAsync('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = await SecureStore.getItemAsync('refresh_token')
      if (refresh) {
        try {
          // Reuse an in-flight refresh rather than firing multiple simultaneous requests
          if (!refreshPromise) {
            refreshPromise = axios
              .post(`${BASE_URL}/api/auth/token/refresh/`, { refresh })
              .finally(() => { refreshPromise = null })
          }
          const { data } = await refreshPromise
          await SecureStore.setItemAsync('access_token', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return client(original)
        } catch {
          await SecureStore.deleteItemAsync('access_token')
          await SecureStore.deleteItemAsync('refresh_token')
        }
      }
    }
    return Promise.reject(err)
  }
)

export default client
