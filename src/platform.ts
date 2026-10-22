/**
 * @file Platform detection: Tauri app vs. plain browser, and whether the
 * app draws its own window title bar.
 */

/** Running inside the Tauri shell (desktop or mobile) rather than a plain browser. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Running on a phone or tablet (Android, iOS) rather than a desktop. */
export function isMobile(): boolean {
  return /Android|iPhone|iPad/i.test(navigator.userAgent);
}

/** Desktop Tauri draws its own title bar (the native one is hidden). */
export function hasCustomTitleBar(): boolean {
  return isTauri() && !isMobile();
}
