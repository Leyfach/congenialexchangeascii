import axios from 'axios'
import { API_BASE_URL } from '../utils/constants.js'
import { authService } from './auth.js'

const api = axios.create({ baseURL: API_BASE_URL })

api.interceptors.request.use((config) => {
  const token = authService.getToken()
  // Check if token looks like a valid JWT (has 3 parts separated by dots)
  if (token && token.trim() && token !== 'null' && token !== 'undefined') {
    const parts = token.split('.')
    if (parts.length === 3) {
      config.headers.Authorization = `Bearer ${token}`
    } else {
      // Clear invalid demo token
      authService.logout()
    }
  }
  return config
})

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Clear invalid token
      authService.logout()
      // Redirect to login if not already there
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api