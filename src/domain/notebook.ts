/**
 * @file The notebook model: nested folders, named pages, and the free-floating
 * text boxes on each page, plus pure tree helpers.
 */
import type { JSONContent } from '@tiptap/core';
import type { Id } from './ids';

/** A folder in the sidebar tree. parentId null = top level. */
export interface Folder {
  id: Id;
  name: string;
  parentId: Id | null;
  /** Position among the folders beside it, lowest first. Absent until the user arranges them (then they sort by name). */
  order?: number;
}

/** A text box placed on a page's canvas. Position and width are in canvas pixels. */
export interface TextBox {
  id: Id;
  x: number;
  y: number;
  width: number;
  /** Rich text as the editor's JSON document. */
  content: JSONContent;
}

/** A named note page. Its title is what other pages' text is matched against for links. */
export interface Page {
  id: Id;
  title: string;
  folderId: Id | null;
  boxes: TextBox[];
}

/** Everything that is saved. */
export interface Notebook {
  folders: Folder[];
  pages: Page[];
}

/** A fresh, empty notebook. */
export function emptyNotebook(): Notebook {
  return { folders: [], pages: [] };
}

/** Sidebar order: alphabetical, numbers compared as numbers ("Session 2" before "Session 10"). */
export function byName(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/** Sidebar order for folders: as the user arranged them, then any never arranged by name. */
export function byFolderOrder(a: Folder, b: Folder): number {
  const ao = a.order ?? Infinity;
  const bo = b.order ?? Infinity;
  return ao !== bo ? ao - bo : byName(a.name, b.name);
}

/**
 * Moves a folder into `parentId` at position `index` among the folders there
 * (counted without the moved one), and renumbers that level so the whole
 * arrangement sticks.
 */
export function placeFolder(folders: Folder[], id: Id, parentId: Id | null, index: number): Folder[] {
  const moved = folders.find((f) => f.id === id);
  if (!moved) return folders;
  const level = folders.filter((f) => f.parentId === parentId && f.id !== id).sort(byFolderOrder);
  level.splice(Math.max(0, Math.min(index, level.length)), 0, { ...moved, parentId });
  const placed = new Map(level.map((f, i) => [f.id, { ...f, order: i }]));
  return folders.map((f) => placed.get(f.id) ?? f);
}

/** Ids of every folder nested (at any depth) inside the given folder, not including it. */
export function descendantFolderIds(folders: Folder[], folderId: Id): Id[] {
  const result: Id[] = [];
  const queue = [folderId];
  while (queue.length) {
    const parent = queue.shift()!;
    for (const f of folders) {
      if (f.parentId === parent) {
        result.push(f.id);
        queue.push(f.id);
      }
    }
  }
  return result;
}

/** A folder can move to the top level or into any folder except itself and its own sub-folders. */
export function canMoveFolder(folders: Folder[], folderId: Id, newParentId: Id | null): boolean {
  if (newParentId === null) return true;
  return newParentId !== folderId && !descendantFolderIds(folders, folderId).includes(newParentId);
}

/** True when a box holds no text (such boxes are discarded when they lose focus). */
export function isEmptyContent(content: JSONContent): boolean {
  const hasText = (node: JSONContent): boolean =>
    (node.type === 'text' && !!node.text?.trim()) || (node.content ?? []).some(hasText);
  return !hasText(content);
}
