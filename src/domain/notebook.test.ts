import { describe, expect, it } from 'vitest';
import {
  byFolderOrder,
  descendantPlaceIds,
  infoForType,
  pageType,
  parentPlace,
  placeFolder,
  placeParentOptions,
  type Folder,
  type Page,
} from './notebook';

/** Names of the folders in a level, in sidebar order. */
const level = (folders: Folder[], parentId: string | null) =>
  folders.filter((f) => f.parentId === parentId).sort(byFolderOrder).map((f) => f.name);

const folders: Folder[] = [
  { id: 'p', name: 'Places', parentId: null },
  { id: 'f', name: 'Factions', parentId: null },
  { id: 'c', name: 'Characters', parentId: null },
  { id: 'v', name: 'Vaultrock', parentId: 'p' },
];

describe('folder order', () => {
  it('is alphabetical until arranged', () => {
    expect(level(folders, null)).toEqual(['Characters', 'Factions', 'Places']);
  });

  it('puts arranged folders first, then the rest by name', () => {
    const mixed = folders.map((f) => (f.id === 'p' ? { ...f, order: 0 } : f));
    expect(level(mixed, null)).toEqual(['Places', 'Characters', 'Factions']);
  });
});

describe('placing a folder', () => {
  it('reorders within a level and keeps the whole arrangement', () => {
    const placed = placeFolder(folders, 'p', null, 0);
    expect(level(placed, null)).toEqual(['Places', 'Characters', 'Factions']);
    expect(placed.filter((f) => f.parentId === null).every((f) => f.order !== undefined)).toBe(true);
  });

  it('moves a folder to another level at the given position', () => {
    const placed = placeFolder(folders, 'v', null, 1);
    expect(level(placed, null)).toEqual(['Characters', 'Vaultrock', 'Factions', 'Places']);
    expect(level(placed, 'p')).toEqual([]);
  });

  it('clamps positions past the end', () => {
    expect(level(placeFolder(folders, 'c', null, 99), null)).toEqual(['Factions', 'Places', 'Characters']);
  });
});

/** A page with only what these tests need. */
const page = (id: string, info?: Page['info']): Page => ({ id, title: id, folderId: null, boxes: [], ...(info ? { info } : {}) });

describe('page types', () => {
  it('treats a page without info as a note', () => {
    expect(pageType(page('x'))).toBe('note');
    expect(pageType(page('x', { type: 'item' }))).toBe('item');
  });

  it('keeps fields when the type stays the same, and uses defaults when it changes', () => {
    const place = { type: 'place' as const, parentPlaceId: 'aurelane' };
    expect(infoForType('place', place)).toBe(place);
    expect(infoForType('character', place)).toEqual({ type: 'character', kind: 'npc' });
    expect(infoForType('note', place)).toBeUndefined();
  });
});

describe('places', () => {
  const pages = [
    page('Veilstrand', { type: 'place', parentPlaceId: null }),
    page('Aurelane', { type: 'place', parentPlaceId: 'Veilstrand' }),
    page('Fort Talbot', { type: 'place', parentPlaceId: 'Aurelane' }),
    page('Ashmere', { type: 'place', parentPlaceId: 'Veilstrand' }),
    page('Carian', { type: 'character', kind: 'npc' }),
  ];

  it('finds a place and everything inside it', () => {
    expect(parentPlace(pages, pages[2])?.id).toBe('Aurelane');
    expect(descendantPlaceIds(pages, 'Veilstrand').sort()).toEqual(['Ashmere', 'Aurelane', 'Fort Talbot']);
  });

  it('never offers a place, or anything inside it, as its own parent', () => {
    expect(placeParentOptions(pages, 'Aurelane').map((p) => p.id)).toEqual(['Ashmere', 'Veilstrand']);
  });

  it('ignores a parent that is no longer a place', () => {
    const orphan = page('Pit', { type: 'place', parentPlaceId: 'Carian' });
    expect(parentPlace([...pages, orphan], orphan)).toBeNull();
  });
});
