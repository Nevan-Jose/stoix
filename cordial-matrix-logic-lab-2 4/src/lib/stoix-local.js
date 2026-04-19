const rawId = import.meta.env.VITE_BASE44_APP_ID;
const appId = typeof rawId === 'string' ? rawId.trim() : '';

/**
 * STOIX / Red Pill local dev: Python backend on :8787, no Base44 app.
 * Set VITE_BASE44_APP_ID (+ .env.local) to use Base44 auth and hosting instead.
 */
export const isStoixLocal =
  import.meta.env.VITE_STOIX_LOCAL === 'true' ||
  (import.meta.env.VITE_STOIX_LOCAL !== 'false' && !appId);
