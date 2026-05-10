/**
 * In Vite dev, an empty base uses same-origin /api so the proxy can reach the backend.
 * Set VITE_BACKEND_URL when the API is on another host (e.g. production).
 */
export function getBackendBaseURL() {
  const raw = import.meta.env.VITE_BACKEND_URL;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (trimmed) return trimmed;
  return import.meta.env.DEV ? '' : 'http://localhost:5001';
}
