import api from './axios';

export const submissionApi = {
  grade: (id, data) => api.put(`/submissions/${id}/grade`, data),
};

export const questionApi = {
  update: (id, data) => api.put(`/questions/${id}`, data),
  delete: (id) => api.delete(`/questions/${id}`),
};
