import api from './axios';

export const submissionApi = {
  getById: (id) => api.get(`/submissions/${id}`),
  create: (data) => api.post('/submissions', data),
  update: (id, data) => api.put(`/submissions/${id}`, data),
  delete: (id) => api.delete(`/submissions/${id}`),
  grade: (id, data) => api.put(`/submissions/${id}/grade`, data),
  uploadFile: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/submissions/upload-file', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getFileUrl: (id) => api.get(`/submissions/${id}/file-url`),
};

export const questionApi = {
  update: (id, data) => api.put(`/questions/${id}`, data),
  delete: (id) => api.delete(`/questions/${id}`),
};
