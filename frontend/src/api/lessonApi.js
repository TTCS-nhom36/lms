import api from './axios';

export const lessonApi = {
  getByChapter: (chapterId) => api.get(`/chapters/${chapterId}/lessons`),
  getById: (id) => api.get(`/lessons/${id}`),
  create: (chapterId, data) => api.post(`/chapters/${chapterId}/lessons`, data),
  update: (id, data) => api.put(`/lessons/${id}`, data),
  delete: (id) => api.delete(`/lessons/${id}`),
  complete: (id) => api.post(`/lessons/${id}/complete`),
  updateProgress: (id, data) => api.put(`/lessons/${id}/progress`, data),
  uploadDocument: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/lessons/upload-document', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getDocumentUrl: (id) => api.get(`/lessons/${id}/document-url`),
};
