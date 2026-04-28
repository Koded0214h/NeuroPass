const BASE = 'http://localhost:8000'

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

async function refreshAccessToken() {
  const { refresh } = getTokens()
  if (!refresh) throw new Error('No refresh token')
  const res = await fetch(`${BASE}/api/users/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  if (!res.ok) { clearTokens(); throw new Error('Session expired') }
  const data = await res.json()
  setTokens({ access: data.access, refresh: data.refresh || refresh })
  return data.access
}

async function request(path, opts = {}) {
  const { access } = getTokens()
  const headers = { ...opts.headers }
  if (access) headers['Authorization'] = `Bearer ${access}`
  if (!(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  let res = await fetch(`${BASE}${path}`, { ...opts, headers })

  if (res.status === 401) {
    try {
      const newAccess = await refreshAccessToken()
      headers['Authorization'] = `Bearer ${newAccess}`
      res = await fetch(`${BASE}${path}`, { ...opts, headers })
    } catch {
      clearTokens()
      window.location.href = '/auth'
      throw new Error('Session expired')
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw Object.assign(new Error(err.detail || JSON.stringify(err)), { data: err, status: res.status })
  }

  if (res.status === 204) return null
  return res.json()
}

// ── Auth ──────────────────────────────────────────────
export const auth = {
  login: (username, password) =>
    request('/api/users/login/', { method: 'POST', body: JSON.stringify({ username, password }) }).then(data => {
      setTokens(data)
      return data
    }),

  register: (username, email, password, wallet_address = '') =>
    request('/api/users/register/', { method: 'POST', body: JSON.stringify({ username, email, password, wallet_address }) }),

  me: () => request('/api/users/me/'),

  linkWallet: (wallet_address) =>
    request('/api/users/wallet/', { method: 'PATCH', body: JSON.stringify({ wallet_address }) }),

  logout: () => clearTokens(),

  isLoggedIn: () => !!getTokens().access,
}

// ── Skills ────────────────────────────────────────────
export const skills = {
  list: () => request('/api/core/skills/'),

  submit: (formData) =>
    request('/api/core/skill/submit/', { method: 'POST', body: formData }),

  audio: (id) => `${BASE}/api/core/skill/${id}/audio/`,
}

// ── Verifier ──────────────────────────────────────────
export const verifier = {
  queue: () => request('/api/core/skills/queue/'),

  decide: (id, decision, comment = '') =>
    request(`/api/core/skill/${id}/verify/`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, comment }),
    }),
}

// ── Credentials ───────────────────────────────────────
export const credentials = {
  verify: (credentialId) => request(`/api/core/credential/${credentialId}/`),

  passport: () => request('/api/core/passport/'),

  publicPassport: (username) => fetch(`${BASE}/api/core/passport/${username}/`).then(r => r.json()),
}

export { setTokens, clearTokens, getTokens }
