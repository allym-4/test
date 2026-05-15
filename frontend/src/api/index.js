import client from './client'

export const auth = {
  login: (username, password) =>
    client.post('/api/auth/token/', { username, password }),
  me: () => client.get('/api/users/me/'),
  updateMe: (data) => client.patch('/api/users/me/', data),
  uploadPhoto: (file) => {
    const fd = new FormData()
    fd.append('profile_photo', file)
    return client.patch('/api/users/me/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

export const classes = {
  list: (params) => client.get('/api/classes/sessions/', { params }),
  get: (id) => client.get(`/api/classes/sessions/${id}/`),
  create: (data) => client.post('/api/classes/sessions/', data),
  update: (id, data) => client.patch(`/api/classes/sessions/${id}/`, data),
  delete: (id) => client.delete(`/api/classes/sessions/${id}/`),
  occurrences: (params) => client.get('/api/classes/occurrences/', { params }),
  getOccurrence: (id) => client.get(`/api/classes/occurrences/${id}/`),
}

export const studios = {
  list: () => client.get('/api/classes/studios/'),
  create: (data) => client.post('/api/classes/studios/', data),
  update: (id, data) => client.patch(`/api/classes/studios/${id}/`, data),
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
}

export const payments = {
  list: (params) => client.get('/api/payments/', { params }),
  balance: (studentId) => client.get(`/api/payments/balance/${studentId}/`),
  create: (data) => client.post('/api/payments/', data),
  stripe: {
    config: () => client.get('/api/payments/stripe/config/'),
    createPaymentIntent: (data) => client.post('/api/payments/stripe/payment-intent/', data),
    createSetupIntent: () => client.post('/api/payments/stripe/setup-intent/', {}),
    paymentMethods: () => client.get('/api/payments/stripe/payment-methods/'),
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
}

export const leads = {
  list: (params) => client.get('/api/leads/', { params }),
  create: (data) => client.post('/api/leads/', data),
  update: (id, data) => client.patch(`/api/leads/${id}/`, data),
  delete: (id) => client.delete(`/api/leads/${id}/`),
}

export const seasons = {
  list: () => client.get('/api/classes/seasons/'),
  get: (id) => client.get(`/api/classes/seasons/${id}/`),
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
  createConversation: (data) => client.post('/api/helpdesk/conversations/', data),
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
  create: (data) => client.post('/api/users/automations/', data),
  update: (id, data) => client.patch(`/api/users/automations/${id}/`, data),
  delete: (id) => client.delete(`/api/users/automations/${id}/`),
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
}

export const availability = {
  list: (instructorId) => client.get('/api/users/availability/', instructorId ? { params: { instructor: instructorId } } : {}),
  save: (slots) => client.post('/api/users/availability/', slots),
}

export const instructorPay = {
  list: (params) => client.get('/api/users/pay-records/', { params }),
  create: (data) => client.post('/api/users/pay-records/', data),
  update: (id, data) => client.patch(`/api/users/pay-records/${id}/`, data),
  delete: (id) => client.delete(`/api/users/pay-records/${id}/`),
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
}

export const attendance = {
  list: (params) => client.get('/api/attendance/', { params }),
  bulkSave: (occurrenceId, records) => client.post(`/api/attendance/occurrence/${occurrenceId}/bulk/`, { records }),
  markAway: (occurrence_id) => client.post('/api/attendance/mark-away/', { occurrence_id }),
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
  groups: (levelId) => client.get('/api/users/skill-groups/', { params: { level: levelId } }),
  createGroup: (data) => client.post('/api/users/skill-groups/', data),
  updateGroup: (id, data) => client.patch(`/api/users/skill-groups/${id}/`, data),
  deleteGroup: (id) => client.delete(`/api/users/skill-groups/${id}/`),
  definitions: (groupId) => client.get('/api/users/skill-definitions/', { params: { group: groupId } }),
  createDefinition: (data) => client.post('/api/users/skill-definitions/', data),
  updateDefinition: (id, data) => client.patch(`/api/users/skill-definitions/${id}/`, data),
  deleteDefinition: (id) => client.delete(`/api/users/skill-definitions/${id}/`),
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

export const giftCards = {
  list: (params) => client.get('/api/payments/gift-cards/', { params }),
  create: (data) => client.post('/api/payments/gift-cards/', data),
  update: (id, data) => client.patch(`/api/payments/gift-cards/${id}/`, data),
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
  list: (params) => client.get('/api/surveys/', { params }),
  get: (id) => client.get(`/api/surveys/${id}/`),
  create: (data) => client.post('/api/surveys/', data),
  update: (id, data) => client.patch(`/api/surveys/${id}/`, data),
  questions: (surveyId) => client.get('/api/surveys/questions/', { params: { survey: surveyId } }),
  respond: (data) => client.post('/api/surveys/responses/', data),
  responses: (surveyId) => client.get('/api/surveys/responses/', { params: { survey: surveyId } }),
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
}

export const emailLists = {
  list: () => client.get('/api/users/email-lists/'),
  create: (data) => client.post('/api/users/email-lists/', data),
  update: (id, data) => client.patch(`/api/users/email-lists/${id}/`, data),
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
