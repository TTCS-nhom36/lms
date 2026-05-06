import api from './axios';

export const chapterApi = {
  getByCourse: (courseId) => api.get(`/courses/${courseId}/chapters`),
  create: (courseId, data) => api.post(`/courses/${courseId}/chapters`, data),
  update: (id, data) => api.put(`/chapters/${id}`, data),
  delete: (id) => api.delete(`/chapters/${id}`),
  reorder: (data) => api.patch('/chapters/reorder', data),
};
