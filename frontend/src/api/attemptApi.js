import api from './axios';

export const attemptApi = {
  create: (assignmentId, data) => api.post(`/assignments/${assignmentId}/attempts`, data),
  getById: (id) => api.get(`/attempts/${id}`),
  getByAssignment: (assignmentId) => api.get(`/assignments/${assignmentId}/attempts`),
  getByStudent: (studentId) => api.get(`/students/${studentId}/attempts`),
  getByLesson: (lessonId) => api.get(`/lessons/${lessonId}/attempts`),
  submit: (id, data) => api.post(`/attempts/${id}/submit`, data),
  update: (id, data) => api.put(`/attempts/${id}`, data),
  delete: (id) => api.delete(`/attempts/${id}`),
  getProgress: (id) => api.get(`/attempts/${id}/progress`),
};
