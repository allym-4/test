import client from './client'

export const auth = {
  login: (username, password) =>
    client.post('/api/auth/token/', { username, password }),
  register: (data) =>
    client.post('/api/auth/register/', data),
  me: () => client.get('/api/users/me/'),
  updateMe: (data) => client.patch('/api/users/me/', data),
  uploadPhoto: (formData) =>
    client.patch('/api/users/me/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
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
  chat: {
    list: (sessionId) => client.get(`/api/classes/sessions/${sessionId}/chat/`),
    send: (sessionId, data) => client.post(`/api/classes/sessions/${sessionId}/chat/`, data),
  },
  casual: {
    occurrences: (params) => client.get('/api/classes/occurrences/', { params }),
    book: (occurrenceId, data) => client.post(`/api/classes/occurrences/${occurrenceId}/casual-book/`, data),
    cancel: (occurrenceId) => client.post(`/api/classes/occurrences/${occurrenceId}/casual-cancel/`),
    myBookings: () => client.get('/api/classes/casual-bookings/'),
    upgrade: (bookingId) => client.post(`/api/classes/casual-bookings/${bookingId}/upgrade/`),
    release: (bookingId) => client.post(`/api/classes/casual-bookings/${bookingId}/release/`),
  },
  practice: {
    list: (params) => client.get('/api/classes/practice/', { params }),
    book: (id) => client.post(`/api/classes/practice/${id}/book/`),
    cancel: (id) => client.post(`/api/classes/practice/${id}/cancel/`),
    myBookings: () => client.get('/api/classes/practice/my-bookings/'),
  },
  myUpcoming: () => client.get('/api/classes/my-upcoming/'),
}

export const media = {
  list: (params) => client.get('/api/users/media/', { params }),
}

export const enrolments = {
  list: (params) => client.get('/api/enrolments/', { params }),
  create: (data) => client.post('/api/enrolments/', data),
  update: (id, data) => client.patch(`/api/enrolments/${id}/`, data),
  delete: (id) => client.delete(`/api/enrolments/${id}/`),
  claimSpot: (id) => client.post(`/api/enrolments/${id}/claim-spot/`),
  trialFeedback: {
    pending: () => client.get('/api/enrolments/trial-feedback/pending/'),
    submit: (id, data) => client.post(`/api/enrolments/${id}/trial-feedback/`, data),
  },
  changeRequests: {
    mine: () => client.get('/api/enrolments/change-requests/'),
    create: (data) => client.post('/api/enrolments/change-requests/', data),
  },
  enrolAfterTrial: (id, data) => client.post(`/api/enrolments/${id}/enrol-after-trial/`, data),
}

export const attendance = {
  list: (params) => client.get('/api/attendance/', { params }),
  bulkSave: (occurrenceId, records) =>
    client.post(`/api/attendance/occurrence/${occurrenceId}/bulk/`, { records }),
  markAway: (occurrence_id, enrolment_id) =>
    client.post('/api/attendance/mark-away/', { occurrence_id, enrolment_id }),
  cancelAway: (occurrence_id) =>
    client.post('/api/attendance/cancel-away/', { occurrence_id }),
  makeupCredits: {
    list: (params) => client.get('/api/attendance/makeup-credits/', { params }),
  },
  classPasses: {
    list: (params) => client.get('/api/attendance/class-passes/', { params }),
    purchase: () => client.post('/api/attendance/class-passes/purchase/'),
  },
}

export const helpdesk = {
  faqs: () => client.get('/api/helpdesk/faqs/'),
  myTickets: () => client.get('/api/helpdesk/my-tickets/'),
  myTicketMessages: (ticketId) =>
    client.get(`/api/helpdesk/my-tickets/${ticketId}/messages/`),
  myTicketReply: (ticketId, data) =>
    client.post(`/api/helpdesk/my-tickets/${ticketId}/messages/`, data),
  submitTicket: (data) => client.post('/api/helpdesk/submit/', data),
  myConversation: () => client.get('/api/helpdesk/my-conversation/'),
  sendMyDm: (data) => client.post('/api/helpdesk/my-conversation/', data),
  conversations: () => client.get('/api/helpdesk/conversations/'),
  dms: (convId) => client.get(`/api/helpdesk/conversations/${convId}/messages/`),
  sendDm: (convId, data) => client.post(`/api/helpdesk/conversations/${convId}/messages/`, data),
}

export const payments = {
  balance: (studentId) => client.get(`/api/payments/balance/${studentId}/`),
  list: (params) => client.get('/api/payments/', { params }),
  stripe: {
    config: () => client.get('/api/payments/stripe/config/'),
    createPaymentIntent: (data) => client.post('/api/payments/stripe/payment-intent/', data),
    setupIntent: () => client.post('/api/payments/stripe/setup-intent/'),
    paymentMethods: (params) => client.get('/api/payments/stripe/payment-methods/', { params }),
    removePaymentMethod: (data) => client.delete('/api/payments/stripe/payment-methods/', { data }),
    updateAutoCharge: (data) => client.patch('/api/payments/stripe/config/', data),
  },
  promoCodes: {
    validate: (data) => client.post('/api/payments/promo-codes/validate/', data),
    use: (data) => client.post('/api/payments/promo-codes/use/', data),
  },
  plans: {
    list: (params) => client.get('/api/payments/plans/', { params }),
    get: (id) => client.get(`/api/payments/plans/${id}/`),
  },
  cancellationOffers: {
    mine: () => client.get('/api/payments/cancellation-offers/mine/'),
    resolve: (id, choice) => client.post(`/api/payments/cancellation-offers/${id}/resolve/`, { choice }),
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
  submissionItems: (submissionId) => client.get(`/api/homework/submissions/${submissionId}/items/`),
  createSubmissionItem: (submissionId, data) => client.post(`/api/homework/submissions/${submissionId}/items/`, data),
}

export const users = {
  get: (id) => client.get(`/api/users/${id}/`),
  list: (params) => client.get('/api/users/', { params }),
}

export const forms = {
  list: () => client.get('/api/users/forms/'),
  submit: (form_type, responses) => client.post('/api/users/forms/', { form_type, responses }),
  pendingRequired: () => client.get('/api/users/forms/pending-required/'),
}

export const settings = {
  get: () => client.get('/api/users/settings/'),
}

export const roster = {
  get: (sessionId) => client.get(`/api/classes/sessions/${sessionId}/roster/`),
}

export const challenges = {
  list: (params) => client.get('/api/users/challenges/', { params }),
  optIn: (id) => client.post(`/api/users/challenges/${id}/opt-in/`, { action: 'in' }),
  optOut: (id) => client.post(`/api/users/challenges/${id}/opt-in/`, { action: 'out' }),
  leaderboard: (id) => client.get(`/api/users/challenges/${id}/leaderboard/`),
}

export const community = {
  groups: () => client.get('/api/community/groups/'),
  groupPosts: (groupId) => client.get(`/api/community/groups/${groupId}/posts/`),
  createGroupPost: (groupId, data) => client.post(`/api/community/groups/${groupId}/posts/`, data),
  joinGroup: (groupId) => client.post(`/api/community/groups/${groupId}/join/`),
  leaveGroup: (groupId) => client.post(`/api/community/groups/${groupId}/leave/`),
  posts: (groupId) => client.get('/api/community/posts/', { params: { group: groupId } }),
  createPost: (data) => client.post('/api/community/posts/', data),
  likePost: (postId) => client.post('/api/community/posts/like/', { post_id: postId }),
  replies: (postId) => client.get('/api/community/replies/', { params: { post: postId } }),
  createReply: (data) => client.post('/api/community/replies/', data),
}

export const assistant = {
  chat: (message) => client.post('/api/users/assistant/', { message }),
}

export const pushTokens = {
  register: (token, platform) =>
    client.post('/api/users/push-token/', { token, platform }),
  unregister: (token) =>
    client.delete('/api/users/push-token/', { data: { token } }),
}

export const referrals = {
  list: (params) => client.get('/api/users/referrals/', { params }),
}

export const giftCards = {
  redeem: (code) => client.post('/api/payments/gift-cards/redeem/', { code }),
}

export const lockers = {
  mine: () => client.get('/api/classes/lockers/mine/'),
  lostKey: (id) => client.post(`/api/classes/lockers/${id}/lost_key/`),
}

export const availability = {
  list: () => client.get('/api/users/availability/'),
  save: (slots) => client.post('/api/users/availability/', slots),
  unavailableDates: {
    list: (params) => client.get('/api/users/unavailable-dates/', { params }),
    create: (data) => client.post('/api/users/unavailable-dates/', data),
    delete: (id) => client.delete(`/api/users/unavailable-dates/${id}/`),
  },
}

export const instructorPay = {
  list: (params) => client.get('/api/users/pay-records/', { params }),
  calculatePay: (userId, params) =>
    client.get(`/api/users/${userId}/calculate-pay/`, { params }),
}


export const products = {
  list: () => client.get('/api/users/products/'),
}

export const orders = {
  list: () => client.get('/api/users/orders/'),
  create: (data) => client.post('/api/users/orders/', data),
}


export const surveys = {
  mine: () => client.get('/api/surveys/mine/'),
  respond: (data) => client.post('/api/surveys/responses/', data),
}

export const studios = {
  list: () => client.get('/api/classes/studios/'),
}
