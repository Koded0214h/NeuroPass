import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE,
});

function getTokens() {
  return {
    access: localStorage.getItem('np_access'),
    refresh: localStorage.getItem('np_refresh'),
  }
}

function setTokens({ access, refresh }) {
  localStorage.setItem('np_access', access)
  if (refresh) localStorage.setItem('np_refresh', refresh)
}

function clearTokens() {
  localStorage.removeItem('np_access')
  localStorage.removeItem('np_refresh')
}

// Request Interceptor
api.interceptors.request.use((config) => {
  const { access } = getTokens();
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response Interceptor for Token Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { refresh } = getTokens();
        if (!refresh) throw new Error('No refresh token');
        
        const res = await axios.post(`${BASE}/api/users/token/refresh/`, { refresh });
        const { access } = res.data;
        setTokens({ access, refresh });
        
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();
        window.location.href = '/auth';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────
export const auth = {
  login: async (username, password) => {
    const res = await api.post('/api/users/login/', { username, password });
    setTokens(res.data);
    return res.data;
  },

  register: (username, email, password, wallet_address = '') =>
    api.post('/api/users/register/', { username, email, password, wallet_address }),

  me: () => api.get('/api/users/me/').then(r => r.data),

  getNonce: (wallet_address) => 
    api.post('/api/users/nonce/', { wallet_address }).then(r => r.data.nonce),

  verifyWallet: async (wallet_address, signature) => {
    const res = await api.post('/api/users/verify/', { wallet_address, signature });
    setTokens(res.data);
    return res.data;
  },

  linkWallet: (wallet_address, signature) =>
    api.patch('/api/users/wallet/', { wallet_address, signature }),

  logout: () => clearTokens(),

  isLoggedIn: () => !!getTokens().access,
}

// ── Skills ────────────────────────────────────────────
export const skills = {
  list: () => api.get('/api/core/skills/').then(r => r.data),

  submit: (formData) =>
    api.post('/api/core/skill/submit/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  audio: (id) => `${BASE}/api/core/skill/${id}/audio/`,
}

// ── Verifier ──────────────────────────────────────────
export const verifier = {
  queue: () => api.get('/api/core/skills/queue/').then(r => r.data),

  decide: (id, decision, comment = '') =>
    api.patch(`/api/core/skill/${id}/verify/`, { decision, comment }),
}

// ── Credentials ───────────────────────────────────────
export const credentials = {
  verify: (credentialId) => api.get(`/api/core/credential/${credentialId}/`).then(r => r.data),

  passport: () => api.get('/api/core/passport/').then(r => r.data),

  publicPassport: (username) => axios.get(`${BASE}/api/core/passport/${username}/`).then(r => r.data),
}

export { setTokens, clearTokens, getTokens }
export default api;
