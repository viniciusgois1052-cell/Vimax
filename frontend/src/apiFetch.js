export function apiFetch(url, options = {}) {
  const stored = localStorage.getItem('user');
  const token = stored ? JSON.parse(stored)?.api_token : null;
  const headers = { ...(options.headers || {}) };
  if (token) headers['X-API-Token'] = token;
  return fetch(url, { ...options, headers });
}
