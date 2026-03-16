import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

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
