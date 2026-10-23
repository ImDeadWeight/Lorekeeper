/**
 * @file The shared Campaign Link folder, where Lorekeeper and Encounters
 * publish what the other app needs (see the campaign-link package).
 *
 * - Windows: %APPDATA%\CampaignLink for both apps, so there is nothing to
 *   set up.
 * - Android: each app's files are private, so the user picks one folder
 *   (the same one in both apps) with the system folder picker; the
 *   link-folder plugin keeps that access and does the reading and writing.
 * - A plain browser can't share files with another app, so it's unavailable.
 */
import { invoke } from '@tauri-apps/api/core';
import { dataDir, join } from '@tauri-apps/api/path';
import { BaseDirectory, exists, mkdir, readTextFile, rename, writeTextFile } from '@tauri-apps/plugin-fs';
import { LINK_FOLDER_NAME } from 'campaign-link';
import { isMobile, isTauri } from '../platform';

/** Files inside the Campaign Link folder, by their path in it (e.g. "lorekeeper.json"). */
export interface LinkFolder {
  /** Where the folder is (a full path, or on Android the folder's name), for showing the user. */
  location: string;
  /** A file's text, or null if it doesn't exist (yet). */
  read(path: string): Promise<string | null>;
  /** Writes a file, creating folders as needed. Readers never see a half-written file on Windows; on Android they tolerate one. */
  write(path: string, text: string): Promise<void>;
}

/** Whether this device can use the Campaign Link folder; if not, why, and whether choosing a folder would fix it. */
export type LinkFolderAccess = { available: true; folder: LinkFolder } | { available: false; reason: string; canChoose: boolean };

/** fs plugin options: paths are relative to the user's data folder (%APPDATA% on Windows). */
const opts = { baseDir: BaseDirectory.Data };
/** A path inside the Campaign Link folder, relative to the data folder. */
const inFolder = (path: string) => `${LINK_FOLDER_NAME}/${path}`;

/** The Windows folder: %APPDATA%\CampaignLink. */
async function desktopFolder(): Promise<LinkFolder> {
  return {
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
}

/** A folder picked on Android, as the link-folder plugin reports it. */
interface PickedFolder {
  uri: string;
  name: string;
}

/** The Android folder, read and written through the link-folder plugin. */
function androidFolder(picked: PickedFolder): LinkFolder {
  return {
    location: picked.name,
    read: (path) => invoke<string | null>('plugin:link-folder|read_text', { path }),
    write: (path, text) => invoke<void>('plugin:link-folder|write_text', { path, text }),
  };
}

/** The Campaign Link folder on this device, or the reason it can't be used. */
export async function openLinkFolder(): Promise<LinkFolderAccess> {
  if (!isTauri()) {
    return { available: false, canChoose: false, reason: 'Linking with Encounters needs the app; a browser tab can\'t share files with it.' };
  }
  if (isMobile()) {
    const picked = await invoke<PickedFolder | null>('plugin:link-folder|get_folder');
    if (!picked) {
      return {
        available: false,
        canChoose: true,
        reason: 'Choose a folder to share with Encounters, and choose the same folder in Encounters.',
      };
    }
    return { available: true, folder: androidFolder(picked) };
  }
  return { available: true, folder: await desktopFolder() };
}

/** Android: lets the user pick the shared folder. Resolves false if they cancelled. */
export async function chooseLinkFolder(): Promise<boolean> {
  return (await invoke<PickedFolder | null>('plugin:link-folder|pick_folder')) !== null;
}
