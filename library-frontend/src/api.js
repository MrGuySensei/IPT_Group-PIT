// api.js
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Helper to get the CSRF cookie Django sets automatically
function getCsrfToken() {
  const name = 'csrftoken'
  const cookies = document.cookie.split(';')
  for (let cookie of cookies) {
    const [key, val] = cookie.trim().split('=')
    if (key === name) return decodeURIComponent(val)
  }
  return ''
}

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
})

// Attach CSRF token to every mutating request
api.interceptors.request.use((config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    config.headers['X-CSRFToken'] = getCsrfToken()
  }
  return config
})

/** Turn axios/DRF errors into a readable string for the UI */
export function parseApiError(err) {
  const data = err.response?.data
  if (!data) return err.message || 'Request failed'
  if (typeof data === 'string') return data
  if (data.detail) return String(data.detail)
  if (data.error) return String(data.error)
  const parts = Object.entries(data).map(([key, val]) => {
    const msg = Array.isArray(val) ? val[0] : val
    return key === 'non_field_errors' ? msg : `${key}: ${msg}`
  })
  return parts[0] || 'Request failed'
}

/** Fetch CSRF cookie before first mutating request */
export async function ensureCsrfCookie() {
  await fetch(`${API_BASE}/auth/me/`, { credentials: 'include' })
}

export const dashboardApi = {
  stats: () => api.get('/dashboard/'),
}

export const booksApi = {
  list: (params = {}) => api.get('/books/', { params }),
  create: (data) => api.post('/books/', data),
  update: (id, data) => api.patch(`/books/${id}/`, data),
  delete: (id) => api.delete(`/books/${id}/`),
}

export const borrowApi = {
  list: (params = {}) => api.get('/borrow-records/', { params }),
  borrow: (data) => api.post('/borrow-records/', data),
  returnBook: (id) => api.post(`/borrow-records/${id}/return_book/`),
  history: (bookId = null) => api.get('/borrow-records/history/', { params: bookId ? { book_id: bookId } : {} }),
  members: () => api.get('/borrow-records/members/'),
}

export const profileApi = {
  get: () => api.get('/auth/profile/'),
}
