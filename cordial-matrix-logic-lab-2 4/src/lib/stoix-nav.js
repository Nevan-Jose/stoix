/**
 * Intro lives at `/` with multiple in-page phases. The default landing is the
 * pill choice ("which side are you on"). Only a full **browser reload** on `/`
 * (or `?fullIntro=1`, stripped after read) starts again at "Hello.".
 */

function isPageReload() {
  if (typeof window === 'undefined' || !performance?.getEntriesByType) return false;
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    return nav != null && nav.type === 'reload';
  } catch {
    return false;
  }
}

/**
 * Initial IntroScreen phase on first paint.
 * Full document reload → "hello". Otherwise → "choice" (home is the pill screen).
 * Optional URL `?fullIntro=1` forces "hello" without a reload (param is stripped).
 */
export function getIntroInitialPhase() {
  if (typeof window === 'undefined') return 'choice';
  if (isPageReload()) {
    return 'hello';
  }
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('fullIntro') === '1') {
      params.delete('fullIntro');
      const q = params.toString();
      const path = `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`;
      // Preserve React Router history metadata (idx); empty state breaks navigate(-1) / back.
      window.history.replaceState(window.history.state, '', path);
      return 'hello';
    }
  } catch {
    /* noop */
  }
  return 'choice';
}

/**
 * In-app back: one step in joint session history (same as browser Back once).
 * Uses `history.back()` so React Router syncs via its listener and we avoid
 * `useNavigate(-1)` no-ops when the navigate ref guard hasn't flipped yet.
 *
 * `createBrowserHistory` (BrowserRouter) stores `idx` on `history.state`; if
 * that was wiped by a bare `replaceState({}, …)` elsewhere, we fall back to
 * the Navigation API / `history.length` heuristics, then `navigate(fallback)`.
 */
export function goBackNavigate(navigate, { fallback = '/' } = {}) {
  if (typeof window === 'undefined' || typeof navigate !== 'function') return;

  const st = window.history.state;
  const idx = st && typeof st.idx === 'number' ? st.idx : null;

  if (idx != null && idx > 0) {
    window.history.back();
    return;
  }

  const nav = window.navigation;
  if (nav && typeof nav.canGoBack === 'boolean' && nav.canGoBack) {
    window.history.back();
    return;
  }

  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  navigate(fallback, { replace: true });
}
