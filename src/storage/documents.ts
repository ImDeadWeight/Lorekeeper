/**
 * @file Loading and saving the app's JSON documents in a versioned
 * envelope, on whichever store the platform provides. Unreadable files are
 * backed up rather than overwritten.
 */
import { isTauri } from '../platform';
import { browserStore } from './browserStore';
import { tauriStore } from './tauriStore';
import type { DocumentStore } from './types';

/** Version written into saved documents; documents from newer versions are refused. */
const SCHEMA_VERSION = 1;

/** On-disk wrapper around a document's data. */
interface Envelope<T> {
  version: number;
  data: T;
}

/** The store for this platform: AppData files under Tauri, localStorage in a browser. */
const store: DocumentStore = isTauri() ? tauriStore : browserStore;

/** A loaded document. */
export interface LoadResult<T> {
  data: T;
  /** Set when the stored file was unreadable and was backed up. */
  warning?: string;
}

/**
 * Loads a document. A missing file yields the fallback. An unreadable file
 * is backed up next to the original and the fallback is used, so the user
 * never silently loses data to an overwrite. Fields missing from an older
 * document take the fallback's values.
 */
export async function loadDocument<T>(name: string, fallback: () => T): Promise<LoadResult<T>> {
  const text = await store.read(name);
  if (text === null) return { data: fallback() };
  try {
    const parsed = JSON.parse(text) as Envelope<T>;
    if (typeof parsed !== 'object' || parsed === null || !('data' in parsed)) throw new Error('missing data');
    if (parsed.version > SCHEMA_VERSION) throw new Error(`saved by a newer version (${parsed.version})`);
    return { data: { ...fallback(), ...parsed.data } };
  } catch (err) {
    await store.backup(name, text);
    return {
      data: fallback(),
      warning: `${name}.json could not be read (${(err as Error).message}). A backup copy was saved and a fresh file started.`,
    };
  }
}

/** True when the document has been saved before. */
export async function hasDocument(name: string): Promise<boolean> {
  return (await store.read(name)) !== null;
}

/** Deletes a document. */
export async function removeDocument(name: string): Promise<void> {
  await store.remove(name);
}

/** Saves a document (pretty-printed JSON in the versioned envelope). */
export async function saveDocument<T>(name: string, data: T): Promise<void> {
  const envelope: Envelope<T> = { version: SCHEMA_VERSION, data };
  await store.write(name, JSON.stringify(envelope, null, 2));
}
