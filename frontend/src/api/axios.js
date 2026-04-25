import axios from 'axios';

const api = axios.create({
  baseURL: '/api/lms',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const userId = localStorage.getItem('lms_user_id');
  if (userId) {
    config.headers['X-User-Id'] = userId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    console.error('API Error:', message);
    return Promise.reject(error);
  }
);

export default api;
