import api from './api.js'

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

export const authService = {
  login: async (credentials) => {
    const { data } = await api.post('/api/auth/login', credentials)
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    return data
  },
  register: async (userData) => {
    const { data } = await api.post('/api/auth/register', userData)
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    return data
  },
  logout: () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY) },
  getCurrentUser: () => { try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null } },
  getToken: () => {
    const token = localStorage.getItem(TOKEN_KEY)
    // Check if token looks like a valid JWT (should have 3 parts separated by dots)
    if (token && token.split('.').length !== 3) {
      // Clear invalid demo token
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      return null
    }
    return token
  },
  isAuthenticated: () => Boolean(authService.getToken()),
  
  // Auto-login for demo/testing purposes
  autoLogin: async () => {
    try {
      const credentials = { email: 'test@test.com', password: 'password123' }
      return await authService.login(credentials)
    } catch (error) {
      console.error('Auto-login failed:', error)
      throw error
    }
  }
}