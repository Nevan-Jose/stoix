/**
 * Resolve paths for `server.py` (OpenRouter/Ollama + `/api/generate-tasks`, `/api/health`).
 *
 * - Default (empty `VITE_STOIX_API_ORIGIN`): use same-origin `/api/...` — correct when
 *   the UI is served by `server.py` on :8787, or when Vite dev/preview proxies `/api`.
 * - Set `VITE_STOIX_API_ORIGIN=http://127.0.0.1:8787` to call Python directly (CORS is open).
 */
export function stoixApiUrl(path) {
  const raw = (import.meta.env.VITE_STOIX_API_ORIGIN || '').trim().replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return raw ? `${raw}${p}` : p;
}
