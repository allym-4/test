import client from './client'

export const auth = {
  login: (username, password) =>
    client.post('/api/auth/token/', { username, password }),
  me: () => client.get('/api/users/me/'),
  updateMe: (data) => client.patch('/api/users/me/', data),
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
  create: (data) => client.post('/api/payments/', data),
}

export const leads = {
  list: (params) => client.get('/api/leads/', { params }),
  create: (data) => client.post('/api/leads/', data),
  update: (id, data) => client.patch(`/api/leads/${id}/`, data),
  delete: (id) => client.delete(`/api/leads/${id}/`),
}

export const seasons = {
  list: () => client.get('/api/classes/seasons/'),
  create: (data) => client.post('/api/classes/seasons/', data),
  update: (id, data) => client.patch(`/api/classes/seasons/${id}/`, data),
  delete: (id) => client.delete(`/api/classes/seasons/${id}/`),
}

export const lockers = {
  list: () => client.get('/api/classes/lockers/'),
  create: (data) => client.post('/api/classes/lockers/', data),
  update: (id, data) => client.patch(`/api/classes/lockers/${id}/`, data),
  delete: (id) => client.delete(`/api/classes/lockers/${id}/`),
}

export const helpdesk = {
  list: (params) => client.get('/api/helpdesk/', { params }),
  get: (id) => client.get(`/api/helpdesk/${id}/`),
  create: (data) => client.post('/api/helpdesk/', data),
  update: (id, data) => client.patch(`/api/helpdesk/${id}/`, data),
  messages: (ticketId) => client.get(`/api/helpdesk/${ticketId}/messages/`),
  reply: (ticketId, data) => client.post(`/api/helpdesk/${ticketId}/messages/`, data),
  conversations: (params) => client.get('/api/helpdesk/conversations/', { params }),
  getConversation: (id) => client.get(`/api/helpdesk/conversations/${id}/`),
  dms: (convId) => client.get(`/api/helpdesk/conversations/${convId}/messages/`),
  sendDm: (convId, data) => client.post(`/api/helpdesk/conversations/${convId}/messages/`, data),
  myConversation: () => client.get('/api/helpdesk/my-conversation/'),
  sendMyDm: (data) => client.post('/api/helpdesk/my-conversation/', data),
  submitTicket: (data) => client.post('/api/helpdesk/submit/', data),
}

export const homework = {
  list: (params) => client.get('/api/homework/', { params }),
  get: (id) => client.get(`/api/homework/${id}/`),
  create: (data) => client.post('/api/homework/', data),
  update: (id, data) => client.patch(`/api/homework/${id}/`, data),
  addChecklist: (assignmentId, items) => client.post(`/api/homework/${assignmentId}/checklist/`, items),
  submissions: (params) => client.get('/api/homework/submissions/', { params }),
  getSubmission: (id) => client.get(`/api/homework/submissions/${id}/`),
  reviewSubmission: (id, data) => client.patch(`/api/homework/submissions/${id}/`, data),
  submitHomework: (data) => client.post('/api/homework/submissions/', data),
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

export const settings = {
  get: () => client.get('/api/users/settings/'),
  save: (data) => client.patch('/api/users/settings/', data),
}

export const announcements = {
  list: () => client.get('/api/users/announcements/'),
  create: (data) => client.post('/api/users/announcements/', data),
  update: (id, data) => client.patch(`/api/users/announcements/${id}/`, data),
  delete: (id) => client.delete(`/api/users/announcements/${id}/`),
}

export const products = {
  list: () => client.get('/api/users/products/'),
  create: (data) => client.post('/api/users/products/', data),
  update: (id, data) => client.patch(`/api/users/products/${id}/`, data),
  delete: (id) => client.delete(`/api/users/products/${id}/`),
}

export const automations = {
  list: () => client.get('/api/users/automations/'),
  toggle: (slug, enabled) => client.patch('/api/users/automations/', { slug, enabled }),
}
