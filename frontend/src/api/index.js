import client from './client'

export const auth = {
  login: (username, password) =>
    client.post('/api/auth/token/', { username, password }),
  me: () => client.get('/api/users/me/'),
}

export const classes = {
  list: (params) => client.get('/api/classes/sessions/', { params }),
  get: (id) => client.get(`/api/classes/sessions/${id}/`),
  occurrences: (params) => client.get('/api/classes/occurrences/', { params }),
  getOccurrence: (id) => client.get(`/api/classes/occurrences/${id}/`),
}

export const enrolments = {
  list: (params) => client.get('/api/enrolments/', { params }),
}

export const attendance = {
  list: (params) => client.get('/api/attendance/', { params }),
  bulkSave: (occurrenceId, records) =>
    client.post(`/api/attendance/occurrence/${occurrenceId}/bulk/`, { records }),
}

export const payments = {
  list: (params) => client.get('/api/payments/', { params }),
  balance: (studentId) => client.get(`/api/payments/balance/${studentId}/`),
  plans: (params) => client.get('/api/payments/plans/', { params }),
}

export const homework = {
  list: (params) => client.get('/api/homework/', { params }),
  get: (id) => client.get(`/api/homework/${id}/`),
  create: (data) => client.post('/api/homework/', data),
  submissions: (params) => client.get('/api/homework/submissions/', { params }),
}

export const users = {
  list: (params) => client.get('/api/users/', { params }),
  get: (id) => client.get(`/api/users/${id}/`),
  create: (data) => client.post('/api/users/', data),
  update: (id, data) => client.patch(`/api/users/${id}/`, data),
  notes: (userId) => client.get(`/api/users/${userId}/notes/`),
  addNote: (userId, data) => client.post(`/api/users/${userId}/notes/`, data),
  bulkImport: (formData) => client.post('/api/users/import/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}
