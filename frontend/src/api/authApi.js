import api from './axios';

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/users', data),
  logout: () => api.post('/auth/logout'),
  refresh: (data) => api.post('/auth/refresh', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};
