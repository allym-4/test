import client from './client'

export const auth = {
  login: (username, password) =>
    client.post('/api/auth/token/', { username, password }),
  register: (data) => client.post('/api/auth/register/', data),
  me: () => client.get('/api/users/me/'),
  updateMe: (data) => client.patch('/api/users/me/', data),
  uploadPhoto: (file) => {
    const fd = new FormData()
    fd.append('profile_photo', file)
    return client.patch('/api/users/me/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  changePassword: (data) => client.post('/api/users/change-password/', data),
}

export const classes = {
  list: (params) => client.get('/api/classes/sessions/', { params }),
  trialSessions: () => client.get('/api/classes/sessions/trial/'),
  get: (id) => client.get(`/api/classes/sessions/${id}/`),
  create: (data) => client.post('/api/classes/sessions/', data),
  update: (id, data) => client.patch(`/api/classes/sessions/${id}/`, data),
  delete: (id) => client.delete(`/api/classes/sessions/${id}/`),
  occurrences: (params) => client.get('/api/classes/occurrences/', { params }),
  getOccurrence: (id) => client.get(`/api/classes/occurrences/${id}/`),
  stats: () => client.get('/api/classes/stats/'),
  revenueStats: () => client.get('/api/classes/revenue-stats/'),
  roster: (sessionId) => client.get(`/api/classes/sessions/${sessionId}/roster/`),
  chat: {
    list: (sessionId) => client.get(`/api/classes/sessions/${sessionId}/chat/`),
    send: (sessionId, data) => client.post(`/api/classes/sessions/${sessionId}/chat/`, data),
  },
  workshops: {
    list: () => client.get('/api/classes/workshops/'),
    get: (id) => client.get(`/api/classes/workshops/${id}/`),
    create: (data) => client.post('/api/classes/workshops/', data),
    update: (id, data) => client.patch(`/api/classes/workshops/${id}/`, data),
    delete: (id) => client.delete(`/api/classes/workshops/${id}/`),
    book: (id) => client.post(`/api/classes/workshops/${id}/book/`),
    cancel: (id) => client.delete(`/api/classes/workshops/${id}/book/`),
    bookings: (id) => client.get(`/api/classes/workshops/${id}/bookings/`),
  },
  casual: {
    occurrences: (params) => client.get('/api/classes/occurrences/', { params }),
    book: (occurrenceId, data) => client.post(`/api/classes/occurrences/${occurrenceId}/casual-book/`, data),
    cancel: (occurrenceId) => client.post(`/api/classes/occurrences/${occurrenceId}/casual-cancel/`),
    myBookings: () => client.get('/api/classes/casual-bookings/'),
    upgrade: (bookingId) => client.post(`/api/classes/casual-bookings/${bookingId}/upgrade/`),
    release: (bookingId) => client.post(`/api/classes/casual-bookings/${bookingId}/release/`),
    exemptionRequest: (sessionId, data) => client.post('/api/enrolments/', { class_session: sessionId, status: 'exemption_requested', ...data }),
  },
  practice: {
    list: (params) => client.get('/api/classes/practice/', { params }),
    get: (id) => client.get(`/api/classes/practice/${id}/`),
    create: (data) => client.post('/api/classes/practice/', data),
    update: (id, data) => client.patch(`/api/classes/practice/${id}/`, data),
    delete: (id) => client.delete(`/api/classes/practice/${id}/`),
    book: (id, data) => client.post(`/api/classes/practice/${id}/book/`, data || {}),
    cancel: (id) => client.post(`/api/classes/practice/${id}/cancel/`),
    myBookings: () => client.get('/api/classes/practice/my-bookings/'),
    allBookings: (params) => client.get('/api/classes/practice/all-bookings/', { params }),
    credits: {
      list: (params) => client.get('/api/classes/practice/credits/', { params }),
      create: (data) => client.post('/api/classes/practice/credits/', data),
      delete: (id) => client.delete(`/api/classes/practice/credits/${id}/`),
    },
  },
  upsells: {
    list: (params) => client.get('/api/classes/upsells/', { params }),
    create: (data) => client.post('/api/classes/upsells/', data),
    update: (id, data) => client.patch(`/api/classes/upsells/${id}/`, data),
    delete: (id) => client.delete(`/api/classes/upsells/${id}/`),
    suggest: (sessionIds) => client.get('/api/classes/upsells/suggest/', { params: { session_ids: sessionIds.join(',') } }),
  },
  myUpcoming: () => client.get('/api/classes/my-upcoming/'),
  emailClass: (sessionId, data) => client.post(`/api/classes/sessions/${sessionId}/email/`, data),
}

export const studios = {
  list: () => client.get('/api/classes/studios/'),
  create: (data) => client.post('/api/classes/studios/', data),
  update: (id, data) => client.patch(`/api/classes/studios/${id}/`, data),
  uploadPhoto: (id, file) => {
    const fd = new FormData(); fd.append('photo', file)
    return client.patch(`/api/classes/studios/${id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  delete: (id) => client.delete(`/api/classes/studios/${id}/`),
}

export const kisi = {
  grants: {
    list: () => client.get('/api/classes/kisi/grants/'),
    create: (data) => client.post('/api/classes/kisi/grants/', data),
    revoke: (id) => client.delete(`/api/classes/kisi/grants/${id}/`),
  },
}

export const enrolments = {
  list: (params) => client.get('/api/enrolments/', { params }),
  create: (data) => client.post('/api/enrolments/', data),
  update: (id, data) => client.patch(`/api/enrolments/${id}/`, data),
  delete: (id) => client.delete(`/api/enrolments/${id}/`),
  convertTrial: (id, data) => client.post(`/api/enrolments/${id}/convert-trial/`, data),
  claimSpot: (id) => client.post(`/api/enrolments/${id}/claim-spot/`),
  pricing: (student, session) => client.get('/api/enrolments/pricing/', { params: { student, session } }),
  flagged: () => client.get('/api/enrolments/flagged/'),
  retentionStats: () => client.get('/api/enrolments/retention-stats/'),
  dismissFlag: (id) => client.patch(`/api/enrolments/flagged/${id}/dismiss/`, {}),
  trialFeedback: {
    pending: () => client.get('/api/enrolments/trial-feedback/pending/'),
    submit: (id, data) => client.post(`/api/enrolments/${id}/trial-feedback/`, data),
  },
  changeRequests: {
    list: (params) => client.get('/api/enrolments/change-requests/', { params }),
    create: (data) => client.post('/api/enrolments/change-requests/', data),
    approve: (id, data) => client.post(`/api/enrolments/change-requests/${id}/approve/`, data),
    reject: (id, data) => client.post(`/api/enrolments/change-requests/${id}/reject/`, data),
    requestInfo: (id, data) => client.post(`/api/enrolments/change-requests/${id}/request-info/`, data),
  },
  waitlist: {
    reorder: (data) => client.post('/api/enrolments/waitlist-reorder/', data),
    promote: (id, data) => client.post(`/api/enrolments/${id}/promote-waitlist/`, data),
    casualList: () => client.get('/api/classes/casual-bookings/admin-waitlist/'),
    casualPromote: (id, data) => client.post(`/api/classes/casual-bookings/${id}/admin-promote/`, data),
  },
}

export const payments = {
  list: (params) => client.get('/api/payments/', { params }),
  stats: () => client.get('/api/payments/stats/'),
  dashboard: () => client.get('/api/payments/dashboard/'),
  balance: (studentId) => client.get(`/api/payments/balance/${studentId}/`),
  create: (data) => client.post('/api/payments/', data),
  stripe: {
    config: () => client.get('/api/payments/stripe/config/'),
    createPaymentIntent: (data) => client.post('/api/payments/stripe/payment-intent/', data),
    createSetupIntent: () => client.post('/api/payments/stripe/setup-intent/', {}),
    paymentMethods: (params) => client.get('/api/payments/stripe/payment-methods/', { params }),
    removePaymentMethod: (data) => client.delete('/api/payments/stripe/payment-methods/', { data }),
    updateAutoCharge: (data) => client.patch('/api/payments/stripe/payment-methods/', data),
    chargeSaved: (data) => client.post('/api/payments/stripe/charge-saved/', data),
  },
  promoCodes: {
    validate: (data) => client.post('/api/payments/promo-codes/validate/', data),
    use: (data) => client.post('/api/payments/promo-codes/use/', data),
  },
  plans: {
    list: (params) => client.get('/api/payments/plans/', { params }),
    get: (id) => client.get(`/api/payments/plans/${id}/`),
    create: (data) => client.post('/api/payments/plans/', data),
    update: (id, data) => client.patch(`/api/payments/plans/${id}/`, data),
    createInstalment: (data) => client.post('/api/payments/instalments/', data),
    updateInstalment: (id, data) => client.patch(`/api/payments/plans/instalments/${id}/`, data),
    remind: (planId) => client.post(`/api/payments/plans/${planId}/remind/`),
  },
  cancellationOffers: {
    list: (params) => client.get('/api/payments/cancellation-offers/', { params }),
    mine: () => client.get('/api/payments/cancellation-offers/mine/'),
    resolve: (id, choice) => client.post(`/api/payments/cancellation-offers/${id}/resolve/`, { choice }),
    sendForOccurrence: (occurrenceId) => client.post(`/api/payments/occurrences/${occurrenceId}/send-cancellation-offers/`),
  },
  chase: {
    list: (params) => client.get('/api/payments/chase/', { params }),
    create: (data) => client.post('/api/payments/chase/', data),
  },
  cashPromises: {
    action: (id, data) => client.post(`/api/payments/cash-promises/${id}/action/`, data),
  },
}

export const leads = {
  list: (params) => client.get('/api/leads/', { params }),
  create: (data) => client.post('/api/leads/', data),
  update: (id, data) => client.patch(`/api/leads/${id}/`, data),
  delete: (id) => client.delete(`/api/leads/${id}/`),
  logContact: (id) => client.post(`/api/leads/${id}/log-contact/`),
}

export const seasons = {
  list: () => client.get('/api/classes/seasons/'),
  get: (id) => client.get(`/api/classes/seasons/${id}/`),
  create: (data) => client.post('/api/classes/seasons/', data),
  update: (id, data) => client.patch(`/api/classes/seasons/${id}/`, data),
  delete: (id) => client.delete(`/api/classes/seasons/${id}/`),
  toggleBookings: (id) => client.post(`/api/classes/seasons/${id}/toggle-bookings/`),
  toggleBookingsEnabled: (id) => client.post(`/api/classes/seasons/${id}/toggle-bookings-enabled/`),
  archive: (id) => client.post(`/api/classes/seasons/${id}/archive/`),
  close: (id) => client.post(`/api/classes/seasons/${id}/close/`),
  duplicate: (id, data) => client.post(`/api/classes/seasons/${id}/duplicate/`, data),
  notifyMe: (id, data) => client.post(`/api/classes/seasons/${id}/notify-me/`, data),
}

export const lockers = {
  list: () => client.get('/api/classes/lockers/'),
  mine: () => client.get('/api/classes/lockers/mine/'),
  byStudent: (id) => client.get('/api/classes/lockers/', { params: { assigned_to: id } }),
  create: (data) => client.post('/api/classes/lockers/', data),
  update: (id, data) => client.patch(`/api/classes/lockers/${id}/`, data),
  delete: (id) => client.delete(`/api/classes/lockers/${id}/`),
  eligible: () => client.get('/api/classes/lockers/eligible/'),
  lostKey: (id) => client.post(`/api/classes/lockers/${id}/lost_key/`),
  chase: (id) => client.post(`/api/classes/lockers/${id}/chase/`),
  carryOver: (id) => client.post(`/api/classes/lockers/${id}/carry-over/`),
  invoice: (id, data) => client.post(`/api/classes/lockers/${id}/invoice/`, data || {}),
  markKeyIssued: (id, issued) => client.patch(`/api/classes/lockers/${id}/`, { key_issued: issued }),
  pendingReturn: (id) => client.post(`/api/classes/lockers/${id}/pending-return/`),
  capacity: () => client.get('/api/classes/lockers/capacity/'),
  setCarryOverPaused: (paused) => client.post('/api/classes/lockers/capacity/', { carry_over_paused: paused }),
}

export const helpdesk = {
  list: (params) => client.get('/api/helpdesk/', { params }),
  get: (id) => client.get(`/api/helpdesk/${id}/`),
  create: (data) => client.post('/api/helpdesk/', data),
  update: (id, data) => client.patch(`/api/helpdesk/${id}/`, data),
  messages: (ticketId) => client.get(`/api/helpdesk/${ticketId}/messages/`),
  reply: (ticketId, data) => client.post(`/api/helpdesk/${ticketId}/messages/`, data),
  conversations: (params) => client.get('/api/helpdesk/conversations/', { params }),
  createConversation: (data) => client.post('/api/helpdesk/conversations/', data),
  getConversation: (id) => client.get(`/api/helpdesk/conversations/${id}/`),
  updateConversation: (id, data) => client.patch(`/api/helpdesk/conversations/${id}/`, data),
  dms: (convId) => client.get(`/api/helpdesk/conversations/${convId}/messages/`),
  sendDm: (convId, data) => client.post(`/api/helpdesk/conversations/${convId}/messages/`, data),
  myConversation: (instructorId) => client.get('/api/helpdesk/my-conversation/', instructorId ? { params: { instructor_id: instructorId } } : {}),
  sendMyDm: (data) => client.post('/api/helpdesk/my-conversation/', data),
  submitTicket: (data) => client.post('/api/helpdesk/submit/', data),
  myTickets: () => client.get('/api/helpdesk/my-tickets/'),
  myTicketMessages: (ticketId) => client.get(`/api/helpdesk/my-tickets/${ticketId}/messages/`),
  myTicketReply: (ticketId, data) => client.post(`/api/helpdesk/my-tickets/${ticketId}/messages/`, data),
  faqs: {
    list: () => client.get('/api/helpdesk/faqs/'),
    create: (d) => client.post('/api/helpdesk/faqs/', d),
    update: (id, d) => client.patch('/api/helpdesk/faqs/' + id + '/', d),
    delete: (id) => client.delete('/api/helpdesk/faqs/' + id + '/'),
  },
  staffNotes: {
    list: (params) => client.get('/api/helpdesk/staff-notes/', { params }),
    create: (data) => client.post('/api/helpdesk/staff-notes/', data),
    resolve: (id) => client.patch(`/api/helpdesk/staff-notes/${id}/`, { is_resolved: true }),
  },
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
  remind: (id) => client.post(`/api/homework/${id}/remind/`),
}

export const users = {
  list: (params) => client.get('/api/users/', { params }),
  publicInstructors: () => client.get('/api/users/instructors/public/'),
  get: (id) => client.get(`/api/users/${id}/`),
  create: (data) => client.post('/api/users/', data),
  update: (id, data) => client.patch(`/api/users/${id}/`, data),
  notes: (userId, params) => client.get(`/api/users/${userId}/notes/`, { params }),
  addNote: (userId, data) => client.post(`/api/users/${userId}/notes/`, data),
  updateNote: (userId, noteId, data) => client.patch(`/api/users/${userId}/notes/${noteId}/`, data),
  deleteNote: (userId, noteId) => client.delete(`/api/users/${userId}/notes/${noteId}/`),
  recheckNotesToday: () => client.get('/api/users/notes/recheck-today/'),
  resetPassword: (id, password) => client.post(`/api/users/${id}/set-password/`, { password }),
  bulkImport: (formData) => client.post('/api/users/import/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}

export const settings = {
  get: () => client.get('/api/users/settings/'),
  save: (data) => client.patch('/api/users/settings/', data),
}

export const announcements = {
  list: (params) => client.get('/api/users/announcements/', { params }),
  create: (data) => client.post('/api/users/announcements/', data),
  update: (id, data) => client.patch(`/api/users/announcements/${id}/`, data),
  delete: (id) => client.delete(`/api/users/announcements/${id}/`),
  acknowledge: (id) => client.post(`/api/users/announcements/${id}/acknowledge/`),
  dismiss: (id) => client.post(`/api/users/announcements/${id}/dismiss/`),
}

export const products = {
  list: () => client.get('/api/users/products/'),
  create: (data) => client.post('/api/users/products/', data),
  update: (id, data) => client.patch(`/api/users/products/${id}/`, data),
  uploadImage: (id, file) => {
    const fd = new FormData()
    fd.append('image', file)
    return client.patch(`/api/users/products/${id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  delete: (id) => client.delete(`/api/users/products/${id}/`),
}

export const automations = {
  list: () => client.get('/api/users/automations/'),
  toggle: (slug, enabled) => client.patch('/api/users/automations/', { slug, enabled }),
  saveActions: (slug, actions) => client.patch('/api/users/automations/', { slug, actions }),
  create: (data) => client.post('/api/users/automations/', data),
  update: (id, data) => client.patch(`/api/users/automations/${id}/`, data),
  delete: (id) => client.delete(`/api/users/automations/${id}/`),
  stats: () => client.get('/api/users/automations/stats/'),
  runs: (limit = 50) => client.get('/api/users/automation-runs/', { params: { limit } }),
}

export const orders = {
  list: (params) => client.get('/api/users/orders/', { params }),
  create: (data) => client.post('/api/users/orders/', data),
  update: (id, data) => client.patch(`/api/users/orders/${id}/`, data),
  delete: (id) => client.delete(`/api/users/orders/${id}/`),
}

export const notifications = {
  list: () => client.get('/api/users/notifications/'),
  markRead: (ids) => client.post('/api/users/notifications/mark-read/', ids ? { ids } : {}),
  send: (userId, title, body, notificationType = 'info') =>
    client.post('/api/users/notifications/', { user: userId, title, body, notification_type: notificationType }),
  bulk: (data) => client.post('/api/users/notifications/bulk/', data),
  escalate: (id) => client.post(`/api/users/notifications/${id}/escalate/`),
}

export const availability = {
  list: (instructorId) => client.get('/api/users/availability/', instructorId ? { params: { instructor: instructorId } } : {}),
  save: (slots) => client.post('/api/users/availability/', slots),
  unavailableDates: {
    list: (params) => client.get('/api/users/unavailable-dates/', { params }),
    create: (data) => client.post('/api/users/unavailable-dates/', data),
    delete: (id) => client.delete(`/api/users/unavailable-dates/${id}/`),
  },
}

export const instructorPay = {
  list: (params) => client.get('/api/users/pay-records/', { params }),
  create: (data) => client.post('/api/users/pay-records/', data),
  update: (id, data) => client.patch(`/api/users/pay-records/${id}/`, data),
  delete: (id) => client.delete(`/api/users/pay-records/${id}/`),
  calculatePay: (userId, params) => client.get(`/api/users/${userId}/calculate-pay/`, { params }),
}

export const square = {
  sync: () => client.post('/api/users/square-sync/', {}),
}

export const forms = {
  list: () => client.get('/api/users/forms/'),
  listForStudent: (studentId) => client.get('/api/users/forms/', { params: { student: studentId } }),
  submit: (form_type, responses) => client.post('/api/users/forms/', { form_type, responses }),
}

export const skills = {
  list: (userId) => client.get(`/api/users/${userId}/skills/`),
  save: (userId, data) => client.post(`/api/users/${userId}/skills/`, data),
  batchApprove: (userId, skills) => client.post(`/api/users/${userId}/skills/batch-approve/`, { skills }),
  pendingAll: () => client.get('/api/users/pending-skills/'),
}

export const attendance = {
  list: (params) => client.get('/api/attendance/', { params }),
  stats: () => client.get('/api/attendance/stats/'),
  bulkSave: (occurrenceId, records) => client.post(`/api/attendance/occurrence/${occurrenceId}/bulk/`, { records }),
  markAway: (occurrence_id) => client.post('/api/attendance/mark-away/', { occurrence_id }),
  cancelAway: (occurrence_id) => client.post('/api/attendance/cancel-away/', { occurrence_id }),
  makeupCredits: {
    list: (params) => client.get('/api/attendance/makeup-credits/', { params }),
    create: (data) => client.post('/api/attendance/makeup-credits/', data),
    update: (id, data) => client.patch(`/api/attendance/makeup-credits/${id}/`, data),
  },
  classPasses: {
    list: (params) => client.get('/api/attendance/class-passes/', { params }),
    purchase: () => client.post('/api/attendance/class-passes/purchase/'),
    update: (id, data) => client.patch(`/api/attendance/class-passes/${id}/`, data),
  },
}

export const tags = {
  list: () => client.get('/api/users/tags/'),
  create: (data) => client.post('/api/users/tags/', data),
  update: (id, data) => client.patch(`/api/users/tags/${id}/`, data),
  delete: (id) => client.delete(`/api/users/tags/${id}/`),
  forStudent: (userId) => client.get(`/api/users/${userId}/tags/`),
  addToStudent: (userId, tagId) => client.post(`/api/users/${userId}/tags/`, { tag_id: tagId }),
  removeFromStudent: (userId, tagId) => client.delete(`/api/users/${userId}/tags/`, { data: { tag_id: tagId } }),
}

export const skillLevels = {
  list: () => client.get('/api/users/skill-levels/'),
  create: (data) => client.post('/api/users/skill-levels/', data),
  update: (id, data) => client.patch(`/api/users/skill-levels/${id}/`, data),
  delete: (id) => client.delete(`/api/users/skill-levels/${id}/`),
  addSkill: (levelId, name) => client.post(`/api/users/skill-levels/${levelId}/skills/`, { name }),
  updateDefinition: (id, data) => client.patch(`/api/users/skill-definitions/${id}/`, data),
  deleteDefinition: (id) => client.delete(`/api/users/skill-definitions/${id}/`),
  sessionNames: () => client.get('/api/classes/session-names/'),
}

export const packages = {
  list: () => client.get('/api/payments/packages/'),
  create: (data) => client.post('/api/payments/packages/', data),
  update: (id, data) => client.patch(`/api/payments/packages/${id}/`, data),
  delete: (id) => client.delete(`/api/payments/packages/${id}/`),
}

export const membershipTypes = {
  list: () => client.get('/api/payments/membership-types/'),
  create: (data) => client.post('/api/payments/membership-types/', data),
  update: (id, data) => client.patch(`/api/payments/membership-types/${id}/`, data),
  delete: (id) => client.delete(`/api/payments/membership-types/${id}/`),
}

export const studentMemberships = {
  list: (params) => client.get('/api/payments/student-memberships/', { params }),
  create: (data) => client.post('/api/payments/student-memberships/', data),
  update: (id, data) => client.patch(`/api/payments/student-memberships/${id}/`, data),
  bulkAssign: (data) => client.post('/api/payments/student-memberships/bulk-assign/', data),
}

export const giftCards = {
  list: (params) => client.get('/api/payments/gift-cards/', { params }),
  create: (data) => client.post('/api/payments/gift-cards/', data),
  update: (id, data) => client.patch(`/api/payments/gift-cards/${id}/`, data),
  redeem: (code) => client.post('/api/payments/gift-cards/redeem/', { code }),
}

export const categories = {
  list: () => client.get('/api/classes/categories/'),
  create: (data) => client.post('/api/classes/categories/', data),
  update: (id, data) => client.patch(`/api/classes/categories/${id}/`, data),
  delete: (id) => client.delete(`/api/classes/categories/${id}/`),
}

export const community = {
  groups: () => client.get('/api/community/groups/'),
  createGroup: (data) => client.post('/api/community/groups/', data),
  updateGroup: (id, data) => client.patch(`/api/community/groups/${id}/`, data),
  posts: (groupId) => client.get('/api/community/posts/', { params: { group: groupId } }),
  createPost: (data) => client.post('/api/community/posts/', data),
  likePost: (postId) => client.post('/api/community/posts/like/', { post_id: postId }),
  replies: (postId) => client.get('/api/community/replies/', { params: { post: postId } }),
  createReply: (data) => client.post('/api/community/replies/', data),
}

export const surveys = {
  mine: () => client.get('/api/surveys/mine/'),
  list: (params) => client.get('/api/surveys/', { params }),
  get: (id) => client.get(`/api/surveys/${id}/`),
  create: (data) => client.post('/api/surveys/', data),
  update: (id, data) => client.patch(`/api/surveys/${id}/`, data),
  delete: (id) => client.delete(`/api/surveys/${id}/`),
  send: (id) => client.post(`/api/surveys/${id}/send/`, {}),
  questions: (surveyId) => client.get('/api/surveys/questions/', { params: { survey: surveyId } }),
  createQuestion: (data) => client.post('/api/surveys/questions/', data),
  updateQuestion: (id, data) => client.patch(`/api/surveys/questions/${id}/`, data),
  deleteQuestion: (id) => client.delete(`/api/surveys/questions/${id}/`),
  respond: (data) => client.post('/api/surveys/responses/', data),
  responses: (surveyId) => client.get('/api/surveys/responses/', { params: { survey: surveyId } }),
  exportCsv: (surveyId) => client.get(`/api/surveys/${surveyId}/export-csv/`, { responseType: 'blob' }),
  seasonalCheckin: {
    pending: () => client.get('/api/surveys/seasonal-checkin/'),
    respond: (id, data) => client.post(`/api/surveys/seasonal-checkin/${id}/respond/`, data),
    adminList: () => client.get('/api/surveys/seasonal-checkin/admin/'),
  },
}

export const media = {
  list: (params) => client.get('/api/users/media/', { params }),
  create: (formData) => client.post('/api/users/media/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => client.patch(`/api/users/media/${id}/`, data),
  delete: (id) => client.delete(`/api/users/media/${id}/`),
}

export const campaigns = {
  list: () => client.get('/api/users/campaigns/'),
  create: (data) => client.post('/api/users/campaigns/', data),
  update: (id, data) => client.patch(`/api/users/campaigns/${id}/`, data),
  delete: (id) => client.delete(`/api/users/campaigns/${id}/`),
  send: (id) => client.post(`/api/users/campaigns/${id}/send/`),
}

export const emailLists = {
  list: () => client.get('/api/users/email-lists/'),
  create: (data) => client.post('/api/users/email-lists/', data),
  update: (id, data) => client.patch(`/api/users/email-lists/${id}/`, data),
  exportUrl: (id) => `/api/users/email-lists/${id}/export/`,
}

export const promoCodes = {
  list: (params) => client.get('/api/payments/promo-codes/', { params }),
  create: (data) => client.post('/api/payments/promo-codes/', data),
  update: (id, data) => client.patch(`/api/payments/promo-codes/${id}/`, data),
  delete: (id) => client.delete(`/api/payments/promo-codes/${id}/`),
}

export const referrals = {
  list: (params) => client.get('/api/users/referrals/', { params }),
  create: (data) => client.post('/api/users/referrals/', data),
  update: (id, data) => client.patch(`/api/users/referrals/${id}/`, data),
}

export const assistant = {
  chat: (message) => client.post('/api/users/assistant/', { message }),
  chats: () => client.get('/api/users/assistant/chats/'),
  userChats: (userId) => client.get('/api/users/assistant/chats/', { params: { user_id: userId } }),
}

export const actionItems = {
  list: (params) => client.get('/api/users/action-items/', { params }),
  create: (data) => client.post('/api/users/action-items/', data),
  update: (id, data) => client.patch(`/api/users/action-items/${id}/`, data),
  delete: (id) => client.delete(`/api/users/action-items/${id}/`),
}

export const mailchimp = {
  status: () => client.get('/api/users/mailchimp/status/'),
  sync: () => client.post('/api/users/mailchimp/sync/', {}),
}

export const xero = {
  connect: () => client.get('/api/users/xero/connect/'),
  status: () => client.get('/api/users/xero/status/'),
  sync: () => client.post('/api/users/xero/sync/', {}),
  disconnect: () => client.delete('/api/users/xero/status/'),
}

export const challenges = {
  list: (params) => client.get('/api/users/challenges/', { params }),
  get: (id) => client.get(`/api/users/challenges/${id}/`),
  create: (data) => client.post('/api/users/challenges/', data),
  update: (id, data) => client.patch(`/api/users/challenges/${id}/`, data),
  delete: (id) => client.delete(`/api/users/challenges/${id}/`),
  leaderboard: (id) => client.get(`/api/users/challenges/${id}/leaderboard/`),
  optIn: (id) => client.post(`/api/users/challenges/${id}/opt-in/`, { action: 'in' }),
  optOut: (id) => client.post(`/api/users/challenges/${id}/opt-in/`, { action: 'out' }),
  recalculate: (id) => client.post(`/api/users/challenges/${id}/recalculate/`, {}),
}
