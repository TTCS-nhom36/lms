import api from './axios';

export const courseApi = {
  getAll: (params) => api.get('/courses', { params }),
  getById: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  publish: (id) => api.patch(`/courses/${id}/publish`),
  enroll: (id) => api.post(`/courses/${id}/enroll`),
  enrollStudent: (id, userId) => api.post(`/courses/${id}/students/${userId}`),
  unenrollStudent: (id, userId) => api.delete(`/courses/${id}/students/${userId}`),
  getStudents: (id) => api.get(`/courses/${id}/students`),
  getMyCourses: () => api.get('/courses/my-courses'),
  getGradebook: (id) => api.get(`/courses/${id}/gradebook`),
  exportGradebook: (id) => api.get(`/courses/${id}/gradebook/export`, { responseType: 'blob' }),
  uploadThumbnail: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/courses/upload-thumbnail', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

