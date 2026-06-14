const DEFAULT_ALLOWED_ORIGINS = new Set([
  'https://axplatform.app',
  'https://www.axplatform.app',
  'https://eos-platform.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
]);

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (DEFAULT_ALLOWED_ORIGINS.has(origin)) return true;
  if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'https:' && !hostname.startsWith('localhost')) return false;
    return hostname === 'axplatform.app' || hostname.endsWith('.axplatform.app');
  } catch {
    return false;
  }
}

/**
 * Resolve a safe frontend base URL from OAuth state / referer.
 * Rejects open redirects; falls back to production default.
 */
export function resolveOAuthRedirectBase(state) {
  if (!state) {
    return process.env.FRONTEND_URL || 'https://axplatform.app';
  }

  // Legacy substring hints
  if (typeof state === 'string' && state.includes('myboyum')) {
    return 'https://myboyum.axplatform.app';
  }

  try {
    const url = new URL(state);
    if (isAllowedOrigin(url.origin)) {
      return url.origin;
    }
  } catch {
    // state may be a full page URL from referer
    if (typeof state === 'string' && state.startsWith('http')) {
      try {
        const refererUrl = new URL(state);
        if (isAllowedOrigin(refererUrl.origin)) {
          return refererUrl.origin;
        }
      } catch {
        // fall through
      }
    }
  }

  return process.env.FRONTEND_URL || 'https://axplatform.app';
}

export function buildOAuthState(req) {
  const candidate = req.query?.redirect_url || req.headers.referer;
  const base = resolveOAuthRedirectBase(candidate);
  return base;
}