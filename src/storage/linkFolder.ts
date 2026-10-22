/**
 * @file The shared Campaign Link folder, where Lorekeeper and Encounters
 * publish what the other app needs (see the campaign-link package). On
 * Windows it is %APPDATA%\CampaignLink for both apps, so there is nothing to
 * set up. Not available in a plain browser (two dev servers can't share
 * files) or on Android yet (that needs folder access through the system
 * picker, which comes later).
 */
import { dataDir, join } from '@tauri-apps/api/path';
import { BaseDirectory, exists, mkdir, readTextFile, rename, writeTextFile } from '@tauri-apps/plugin-fs';
import { LINK_FOLDER_NAME } from 'campaign-link';
import { isMobile, isTauri } from '../platform';

/** Files inside the Campaign Link folder, by their path in it (e.g. "lorekeeper.json"). */
export interface LinkFolder {
  /** Full path of the folder, for showing the user. */
  location: string;
  /** A file's text, or null if it doesn't exist (yet). */
  read(path: string): Promise<string | null>;
  /** Writes a file, creating folders as needed. Atomic: readers never see half a file. */
  write(path: string, text: string): Promise<void>;
}

/** Whether this device can use the Campaign Link folder, and if not, why. */
export type LinkFolderAccess = { available: true; folder: LinkFolder } | { available: false; reason: string };

/** fs plugin options: paths are relative to the user's data folder (%APPDATA% on Windows). */
const opts = { baseDir: BaseDirectory.Data };
/** A path inside the Campaign Link folder, relative to the data folder. */
const inFolder = (path: string) => `${LINK_FOLDER_NAME}/${path}`;

/** The Campaign Link folder on this device, or the reason it can't be used. */
export async function openLinkFolder(): Promise<LinkFolderAccess> {
  if (!isTauri()) return { available: false, reason: 'Linking with Encounters needs the desktop app; a browser tab can\'t share files with it.' };
  if (isMobile()) return { available: false, reason: 'Linking with Encounters isn\'t available on Android yet.' };

  const folder: LinkFolder = {
    location: await join(await dataDir(), LINK_FOLDER_NAME),
    async read(path) {
      if (!(await exists(inFolder(path), opts))) return null;
      return readTextFile(inFolder(path), opts);
    },
    async write(path, text) {
      const target = inFolder(path);
      const dir = target.slice(0, target.lastIndexOf('/'));
      if (!(await exists(dir, opts))) await mkdir(dir, { ...opts, recursive: true });
      // Write then rename, so the other app never reads a half-written file.
      const tmp = `${target}.tmp`;
      await writeTextFile(tmp, text, opts);
      await rename(tmp, target, { oldPathBaseDir: BaseDirectory.Data, newPathBaseDir: BaseDirectory.Data });
    },
  };
  return { available: true, folder };
}
