import api from './axios';

export const assignmentApi = {
  getByCourse: (courseId) => api.get(`/courses/${courseId}/assignments`),
  getById: (id) => api.get(`/assignments/${id}`),
  create: (courseId, data) => api.post(`/courses/${courseId}/assignments`, data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),
  addQuestion: (id, data) => api.post(`/assignments/${id}/questions`, data),
  submit: (id, data) => api.post(`/assignments/${id}/submit`, data),
  getSubmissions: (id) => api.get(`/assignments/${id}/submissions`),
  getMySubmission: (id) => api.get(`/assignments/${id}/my-submission`),
};
