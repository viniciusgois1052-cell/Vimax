/**
 * Wrapper sobre fetch que dispara 'auth:expired' em respostas 401
 * Use este helper em vez de fetch direto nas páginas.
 */
export async function apiFetch(url, options = {}) {
  const response = await fetch(url, options);
  if (response.status === 401 && !url.includes('/login') && !url.includes('/logout')) {
    window.dispatchEvent(new CustomEvent('auth:expired', { detail: { url } }));
  }
  return response;
}
