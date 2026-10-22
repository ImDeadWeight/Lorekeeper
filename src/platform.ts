/**
 * @file Platform detection: Tauri app vs. plain browser, and whether the
 * app draws its own window title bar.
 */

/** Running inside the Tauri shell (desktop or mobile) rather than a plain browser. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Desktop Tauri draws its own title bar (the native one is hidden). */
export function hasCustomTitleBar(): boolean {
  return isTauri() && !/Android|iPhone|iPad/i.test(navigator.userAgent);
}
