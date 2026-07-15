import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const api = axios.create({ baseURL: `${BASE}/api` });

function readAuth() {
  const raw = localStorage.getItem('auth');
  return raw ? JSON.parse(raw) : null;
}

api.interceptors.request.use((config) => {
  const auth = readAuth();
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const auth = readAuth();
  if (!auth?.refreshToken) return null;
  try {
    const { data } = await axios.post(`${BASE}/api/auth/refresh`, {
      refreshToken: auth.refreshToken,
    });
    const updated = { ...auth, accessToken: data.accessToken, refreshToken: data.refreshToken };
    localStorage.setItem('auth', JSON.stringify(updated));
    return data.accessToken;
  } catch {
    localStorage.removeItem('auth');
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      refreshing = refreshing || refreshAccessToken();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
