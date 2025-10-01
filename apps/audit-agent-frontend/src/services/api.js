// src/services/api.js
import axios from 'axios'

// Base API points to Vite proxy '/api' in dev
const BASE = (import.meta.env.VITE_API_BASE_ROOT || '/api').replace(/\/+$/, '')

const api = axios.create({
  baseURL: BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
})

// Attach auth token if present
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    // Pass role for simple admin gating on backend (dev-friendly)
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const u = JSON.parse(userStr)
      if (u?.role) config.headers['x-user-role'] = u.role
      if (u?.email) config.headers['x-user-email'] = u.email
      if (u?.uid) config.headers['x-user-id'] = u.uid
    }
  } catch {}
  return config
})

export default api
