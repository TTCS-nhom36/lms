import api from './axios';

export const userApi = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  updateRole: (id, data) => api.patch(`/users/${id}/role`, data),
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
  changePassword: (data) => api.patch('/users/me/password', data),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
