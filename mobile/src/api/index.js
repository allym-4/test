import client from './client'

export const auth = {
  login: (username, password) =>
    client.post('/api/auth/token/', { username, password }),
  me: () => client.get('/api/users/me/'),
  updateMe: (data) => client.patch('/api/users/me/', data),
  changePassword: (data) => client.post('/api/users/change-password/', data),
}

export const classes = {
  list: (params) => client.get('/api/classes/sessions/', { params }),
  occurrences: (params) => client.get('/api/classes/occurrences/', { params }),
  workshops: {
    list: () => client.get('/api/classes/workshops/'),
    book: (id) => client.post(`/api/classes/workshops/${id}/book/`),
    cancel: (id) => client.delete(`/api/classes/workshops/${id}/book/`),
  },
}

export const enrolments = {
  list: (params) => client.get('/api/enrolments/', { params }),
  create: (data) => client.post('/api/enrolments/', data),
  update: (id, data) => client.patch(`/api/enrolments/${id}/`, data),
  delete: (id) => client.delete(`/api/enrolments/${id}/`),
  claimSpot: (id) => client.post(`/api/enrolments/${id}/claim-spot/`),
}

export const attendance = {
  list: (params) => client.get('/api/attendance/', { params }),
  bulkSave: (occurrenceId, records) =>
    client.post(`/api/attendance/occurrence/${occurrenceId}/bulk/`, { records }),
  markAway: (occurrence_id) =>
    client.post('/api/attendance/mark-away/', { occurrence_id }),
  makeupCredits: {
    list: (params) => client.get('/api/attendance/makeup-credits/', { params }),
  },
}

export const helpdesk = {
  myTickets: () => client.get('/api/helpdesk/my-tickets/'),
  myTicketMessages: (ticketId) =>
    client.get(`/api/helpdesk/my-tickets/${ticketId}/messages/`),
  myTicketReply: (ticketId, data) =>
    client.post(`/api/helpdesk/my-tickets/${ticketId}/messages/`, data),
  submitTicket: (data) => client.post('/api/helpdesk/submit/', data),
  myConversation: () => client.get('/api/helpdesk/my-conversation/'),
  sendMyDm: (data) => client.post('/api/helpdesk/my-conversation/', data),
}

export const payments = {
  balance: (studentId) => client.get(`/api/payments/balance/${studentId}/`),
  list: (params) => client.get('/api/payments/', { params }),
  stripe: {
    config: () => client.get('/api/payments/stripe/config/'),
    createPaymentIntent: (data) => client.post('/api/payments/stripe/payment-intent/', data),
  },
  promoCodes: {
    validate: (data) => client.post('/api/payments/promo-codes/validate/', data),
    use: (data) => client.post('/api/payments/promo-codes/use/', data),
  },
}

export const seasons = {
  list: () => client.get('/api/classes/seasons/'),
}

export const notifications = {
  list: () => client.get('/api/users/notifications/'),
  markRead: (ids) =>
    client.post('/api/users/notifications/mark-read/', ids ? { ids } : {}),
}

export const announcements = {
  list: (params) => client.get('/api/users/announcements/', { params }),
  acknowledge: (id) =>
    client.post(`/api/users/announcements/${id}/acknowledge/`),
}

export const skills = {
  list: (userId) => client.get(`/api/users/${userId}/skills/`),
  save: (userId, data) => client.post(`/api/users/${userId}/skills/`, data),
  pendingAll: () => client.get('/api/users/pending-skills/'),
}

export const homework = {
  list: (params) => client.get('/api/homework/', { params }),
  submissions: (params) => client.get('/api/homework/submissions/', { params }),
  submitHomework: (data) => client.post('/api/homework/submissions/', data),
}

export const users = {
  get: (id) => client.get(`/api/users/${id}/`),
}

export const settings = {
  get: () => client.get('/api/users/settings/'),
}

export const roster = {
  get: (sessionId) => client.get(`/api/classes/sessions/${sessionId}/roster/`),
}
