import api from './axios';

export const lessonApi = {
  getByChapter: (chapterId) => api.get(`/chapters/${chapterId}/lessons`),
  getById: (id) => api.get(`/lessons/${id}`),
  create: (chapterId, data) => api.post(`/chapters/${chapterId}/lessons`, data),
  update: (id, data) => api.put(`/lessons/${id}`, data),
  delete: (id) => api.delete(`/lessons/${id}`),
  complete: (id) => api.post(`/lessons/${id}/complete`),
  updateProgress: (id, data) => api.put(`/lessons/${id}/progress`, data),
};
