/**
 * @file Links between the apps: handling lorekeeper://… links (whether they
 * started the app or arrived while it was open) and opening things in
 * Encounters (encounters://…).
 */
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { openUrl } from '@tauri-apps/plugin-opener';
import { linkUrl, parseLinkUrl, type LinkTarget } from 'campaign-link';
import { isTauri } from '../platform';
import { useLibrary } from './libraryStore';
import { useNotebook } from './notebookStore';
import { switchNotebook } from './notebooks';
import { useUi } from './uiStore';

/** Opens an encounter or character in Encounters (starting it if needed). */
export async function openInEncounters(target: Extract<LinkTarget, { app: 'encounters' }>): Promise<void> {
  const notifyError = useUi.getState().notifyError;
  if (!isTauri()) {
    notifyError('Opening Encounters needs the desktop app.');
    return;
  }
  try {
    await openUrl(linkUrl(target));
  } catch (err) {
    notifyError(`Could not open Encounters. Is it installed and opened at least once? (${(err as Error).message ?? err})`);
  }
}

/** Opens the page a lorekeeper:// link points at, switching notebooks if needed. */
async function handle(url: string) {
  const ui = useUi.getState();
  const target = parseLinkUrl(url);
  if (target?.app !== 'lorekeeper') {
    ui.notifyError(`Lorekeeper can't open this link: ${url}`);
    return;
  }
  if (!useLibrary.getState().notebooks.some((n) => n.id === target.notebookId)) {
    ui.notifyError('The notebook that page was in no longer exists.');
    return;
  }
  await switchNotebook(target.notebookId);
  if (useLibrary.getState().activeId !== target.notebookId) return; // switching failed and said why
  if (useNotebook.getState().pages.some((p) => p.id === target.pageId)) ui.selectPage(target.pageId);
  else ui.notifyError('That page no longer exists.');
}

/** Handles the link that started the app, if any, and every link opened while it runs. */
export async function startAppLinks(): Promise<void> {
  if (!isTauri()) return;
  try {
    for (const url of (await getCurrent()) ?? []) await handle(url);
    await onOpenUrl((urls) => urls.forEach((url) => handle(url)));
  } catch (err) {
    useUi.getState().notifyError(`Links from Encounters won't open here: ${(err as Error).message ?? err}`);
  }
}
