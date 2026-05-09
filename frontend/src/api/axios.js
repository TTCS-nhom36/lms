import axios from 'axios';

const api = axios.create({
  baseURL: '/api/lms',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lms_access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('lms_refresh_token');

      if (refreshToken) {
        return new Promise(function (resolve, reject) {
          axios.post('/api/lms/auth/refresh', { refreshToken })
            .then(({ data }) => {
              const { accessToken, refreshToken: newRefreshToken } = data;
              
              localStorage.setItem('lms_access_token', accessToken);
              if (newRefreshToken) {
                localStorage.setItem('lms_refresh_token', newRefreshToken);
              }
              
              api.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;
              originalRequest.headers['Authorization'] = 'Bearer ' + accessToken;
              
              processQueue(null, accessToken);
              resolve(api(originalRequest));
            })
            .catch((err) => {
              processQueue(err, null);
              localStorage.removeItem('lms_access_token');
              localStorage.removeItem('lms_refresh_token');
              window.location.href = '/login';
              reject(err);
            })
            .finally(() => {
              isRefreshing = false;
            });
        });
      } else {
        localStorage.removeItem('lms_access_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    const message = error.response?.data?.message || error.message || 'Something went wrong';
    console.error('API Error:', message);
    return Promise.reject(error);
  }
);

export default api;
