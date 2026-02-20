import axios from 'axios';
import type { ApiError } from './types';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const apiError: ApiError = {
      code: error.response?.data?.code || 'UNKNOWN',
      message: error.response?.data?.message || error.message,
      status: error.response?.status || 500,
    };
    return Promise.reject(apiError);
  },
);

export default apiClient;
