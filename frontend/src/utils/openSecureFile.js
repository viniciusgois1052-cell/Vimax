export async function openSecureFile(path) {
  if (!path) return;

  let cleanPath = path.replace(/^\/+/, '')
                      .replace(/^static\/uploads\//, '')
                      .replace(/^uploads\//, '');

  const token = (() => {
    try { return JSON.parse(localStorage.getItem('user'))?.api_token; }
    catch { return null; }
  })();

  if (!token) { window.open(`/static/uploads/${cleanPath}`, '_blank'); return; }

  try {
    const resp = await fetch(`/static/uploads/${cleanPath}`, {
      headers: { 'X-API-Token': token }
    });
    if (!resp.ok) throw new Error('Erro ao carregar ficheiro');
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    if (!win) alert('Permita popups para abrir ficheiros.');
  } catch (e) {
    console.error('openSecureFile:', e);
    alert('Não foi possível abrir o ficheiro.');
  }
}
