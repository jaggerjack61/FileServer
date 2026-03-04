import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken) {
        try {
          const response = await axios.post('http://localhost:8000/api/auth/refresh/', {
            refresh: refreshToken,
          });
          const { access } = response.data;
          useAuthStore.getState().setAccessToken(access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch {
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(error);
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
