import { describe, expect, it } from 'vitest';
import { exportFileName, exportText, parseNotebookFile, uniqueName } from './library';
import type { Notebook } from './notebook';

const notebook: Notebook = {
  folders: [{ id: 'f1', name: 'Factions', parentId: null }],
  pages: [
    {
      id: 'p1',
      title: 'The Thalamar Imperium',
      folderId: 'f1',
      boxes: [{ id: 'b1', x: 40, y: 40, width: 560, content: { type: 'doc', content: [{ type: 'paragraph' }] } }],
    },
  ],
};

describe('unique notebook names', () => {
  it('keeps a free name', () => {
    expect(uniqueName(['Veilstrand'], 'New notebook')).toBe('New notebook');
  });

  it('numbers a taken name, ignoring case', () => {
    expect(uniqueName(['new notebook', 'New notebook (2)'], 'New notebook')).toBe('New notebook (3)');
  });
});

describe('export file names', () => {
  it('drops characters Windows forbids', () => {
    expect(exportFileName('Veil: "Storm"?')).toBe('Veil Storm.json');
  });

  it('never ends up empty', () => {
    expect(exportFileName('???')).toBe('notebook.json');
  });
});

describe('reading notebook files', () => {
  it('round-trips an export', () => {
    expect(parseNotebookFile(exportText('The Veilstrand and the Everstorm', notebook), 'file')).toEqual({
      name: 'The Veilstrand and the Everstorm',
      notebook,
    });
  });

  it('accepts a saved notebook file, named after the file', () => {
    const saved = JSON.stringify({ version: 1, data: notebook });
    expect(parseNotebookFile(saved, 'notebook')).toEqual({ name: 'notebook', notebook });
  });

  it('refuses files that are not notebooks', () => {
    expect(() => parseNotebookFile('not json', 'x')).toThrow('not valid JSON');
    expect(() => parseNotebookFile('{"hello": 1}', 'x')).toThrow('not a Lorekeeper notebook');
    expect(() => parseNotebookFile('{"format": "lorekeeper-notebook", "version": 99}', 'x')).toThrow('newer version');
  });

  it('refuses damaged pages', () => {
    const bad = { ...notebook, pages: [{ title: 'No id' }] };
    expect(() => parseNotebookFile(exportText('x', bad as unknown as Notebook), 'x')).toThrow('page 1 is damaged');
  });

  it('moves things in missing folders, and folder loops, to the top level', () => {
    const tangled: Notebook = {
      folders: [
        { id: 'a', name: 'A', parentId: 'b' },
        { id: 'b', name: 'B', parentId: 'a' },
      ],
      pages: [{ id: 'p', title: 'Lost', folderId: 'gone', boxes: [] }],
    };
    const { notebook: read } = parseNotebookFile(exportText('x', tangled), 'x');
    expect(read.pages[0].folderId).toBeNull();
    expect(read.folders.some((f) => f.parentId === null)).toBe(true);
  });
});
