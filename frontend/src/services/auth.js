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
  getToken: () => localStorage.getItem(TOKEN_KEY),
  isAuthenticated: () => Boolean(localStorage.getItem(TOKEN_KEY))
}