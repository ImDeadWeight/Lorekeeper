/**
 * @file Document storage for the desktop/mobile app: JSON files in the
 * app's AppData folder, written atomically via Tauri's fs plugin.
 */
import { BaseDirectory, exists, mkdir, readTextFile, remove, rename, writeTextFile } from '@tauri-apps/plugin-fs';
import type { DocumentStore } from './types';

/** Sub-folder of AppData holding the documents. */
const DIR = 'data';
/** fs plugin options: paths are relative to AppData. */
const opts = { baseDir: BaseDirectory.AppData };
/** Relative path of a document's file, e.g. "data/notebook.json". */
const path = (name: string) => `${DIR}/${name}.json`;

/** Creates the data folder on first use. */
async function ensureDir() {
  if (!(await exists(DIR, opts))) await mkdir(DIR, { ...opts, recursive: true });
}

/** JSON files under the app's AppData folder (%APPDATA%\com.lorekeeper.app\data on Windows). */
export const tauriStore: DocumentStore = {
  async read(name) {
    if (!(await exists(path(name), opts))) return null;
    return readTextFile(path(name), opts);
  },
  async write(name, text) {
    await ensureDir();
    // Write then rename so a crash mid-write never leaves a half-written file.
    const tmp = `${path(name)}.tmp`;
    await writeTextFile(tmp, text, opts);
    await rename(tmp, path(name), { oldPathBaseDir: BaseDirectory.AppData, newPathBaseDir: BaseDirectory.AppData });
  },
  async backup(name, text) {
    await ensureDir();
    await writeTextFile(`${DIR}/${name}.corrupt-${Date.now()}.json`, text, opts);
  },
  async remove(name) {
    if (await exists(path(name), opts)) await remove(path(name), opts);
  },
};
