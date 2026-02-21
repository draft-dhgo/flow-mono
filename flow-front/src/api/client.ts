import axios from 'axios';
import type { ApiError } from './types';

/** 에러 코드별 사용자 친화적 메시지 매핑 */
const ERROR_MESSAGES: Record<string, string> = {
  INTERNAL_ERROR: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  NETWORK_ERROR: '네트워크 연결에 문제가 있습니다.',
  TIMEOUT: '요청 시간이 초과되었습니다.',
};

const TOKEN_KEYS = {
  access: 'flowflow_access_token',
  refresh: 'flowflow_refresh_token',
} as const;

function toUserFriendlyMessage(code: string, fallback: string): string {
  return ERROR_MESSAGES[code] ?? fallback;
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: Bearer 토큰 주입 ──
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEYS.access);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: 401 토큰 갱신 + 에러 매핑 ──
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // 401 처리: 토큰 갱신 시도
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem(TOKEN_KEYS.refresh);

      // 리프레시 토큰이 없거나, auth 엔드포인트 자체의 401이면 로그인 페이지로
      if (!refreshToken || originalRequest.url?.includes('/auth/')) {
        localStorage.removeItem(TOKEN_KEYS.access);
        localStorage.removeItem(TOKEN_KEYS.refresh);
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // 이미 갱신 중이면 큐에 추가
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // 직접 axios로 호출 (apiClient 사용 시 인터셉터 무한루프 방지)
        const { data } = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        );

        localStorage.setItem(TOKEN_KEYS.access, data.accessToken);
        localStorage.setItem(TOKEN_KEYS.refresh, data.refreshToken);

        onRefreshed(data.accessToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        localStorage.removeItem(TOKEN_KEYS.access);
        localStorage.removeItem(TOKEN_KEYS.refresh);
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // 일반 에러 매핑
    const code = error.response?.data?.code || 'UNKNOWN';
    const rawMessage = error.response?.data?.message || error.message;

    const apiError: ApiError = {
      code,
      message: toUserFriendlyMessage(code, rawMessage),
      status: error.response?.status || 500,
    };
    return Promise.reject(apiError);
  },
);

export { apiClient };
