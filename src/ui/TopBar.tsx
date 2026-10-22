/**
 * @file The top application bar. On desktop it is also the window title bar.
 */
import { hasCustomTitleBar } from '../platform';
import { NotebookMenu } from './notebooks/NotebookMenu';
import { WindowControls } from './WindowControls';

/** Decided once at startup: draw window controls and drag regions? */
const customTitleBar = hasCustomTitleBar();

/**
 * App bar. On desktop it doubles as the window title bar: empty areas drag the
 * window (double-click maximizes) and the window buttons sit at the right.
 * Tauri only drags from elements that carry the attribute themselves.
 */
export function TopBar() {
  const drag = customTitleBar ? { 'data-tauri-drag-region': true } : {};
  return (
    <header className={`top-bar${customTitleBar ? ' title-bar' : ''}`} {...drag}>
      <span className="brand" {...drag}>Lorekeeper</span>
      <NotebookMenu />
      <span className="spacer" {...drag} />
      {customTitleBar && <WindowControls />}
    </header>
  );
}
