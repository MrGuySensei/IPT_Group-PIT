// api.js
import axios from 'axios'

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
  baseURL: '/api',
  withCredentials: true,  // ← sends session cookie with every request
})

// Attach CSRF token to every mutating request
api.interceptors.request.use((config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    config.headers['X-CSRFToken'] = getCsrfToken()
  }
  return config
})

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