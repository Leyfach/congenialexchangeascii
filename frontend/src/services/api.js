import axios from 'axios'
import { API_BASE_URL } from '../utils/constants.js'
import { authService } from './auth.js'

const api = axios.create({ baseURL: API_BASE_URL })

api.interceptors.request.use((config) => {
  const token = authService.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api