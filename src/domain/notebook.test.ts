import { describe, expect, it } from 'vitest';
import { byFolderOrder, placeFolder, type Folder } from './notebook';

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
