import axios from 'axios';

const api = axios.create({
  baseURL: '/api/lms',
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lms_access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('lms_refresh_token');

      if (!refreshToken) {
        localStorage.removeItem('lms_access_token');
        localStorage.removeItem('lms_refresh_token');
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            if (!token) {
              reject(error);
              return;
            }
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const refreshResponse = await axios.post('/api/lms/auth/refresh', { refreshToken }, {
          headers: { 'Content-Type': 'application/json' },
        });
        const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data;
        localStorage.setItem('lms_access_token', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('lms_refresh_token', newRefreshToken);
        }
        onRefreshed(accessToken);
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        onRefreshed(null);
        localStorage.removeItem('lms_access_token');
        localStorage.removeItem('lms_refresh_token');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const message = error.response?.data?.message || error.message || 'Something went wrong';
    console.error('API Error:', message);
    return Promise.reject(error);
  }
);

export default api;
