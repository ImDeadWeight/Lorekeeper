/**
 * @file Document storage for plain-browser development (npm run dev):
 * documents live in localStorage.
 */
import type { DocumentStore } from './types';

/** localStorage key for a document, e.g. "lorekeeper:notebook". */
const key = (name: string) => `lorekeeper:${name}`;

/** Used when running in a plain browser (npm run dev without Tauri). */
export const browserStore: DocumentStore = {
  async read(name) {
    return localStorage.getItem(key(name));
  },
  async write(name, text) {
    localStorage.setItem(key(name), text);
  },
  async backup(name, text) {
    localStorage.setItem(`${key(name)}.corrupt-${Date.now()}`, text);
  },
  async remove(name) {
    localStorage.removeItem(key(name));
  },
};
