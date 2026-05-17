import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const BASE_URL = 'https://YOUR_API_URL_HERE'

const client = axios.create({ baseURL: BASE_URL })

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
          const { data } = await axios.post(`${BASE_URL}/api/auth/token/refresh/`, { refresh })
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
