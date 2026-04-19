/**
 * Intro lives at `/` with multiple in-page phases. Once the user reaches the
 * pill choice, we record that so browser/in-app "back" can land on choice —
 * never replay the "Hello." / question typewriter sequence.
 */
export const INTRO_AT_CHOICE_KEY = 'stoix-intro-at-choice';

export function introShouldStartAtChoice() {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(INTRO_AT_CHOICE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markIntroReachedChoice() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(INTRO_AT_CHOICE_KEY, '1');
  } catch {
    /* noop */
  }
}

/** Real history back (previous URL), not a hard-coded route. */
export function goBackNavigate(navigate) {
  navigate(-1);
}
