# Lorekeeper

Hyperlinked campaign notes for tabletop RPGs, a companion to Encounters.
Pages sit in nested folders; each page is a free canvas where clicking anywhere starts a text box.
When text mentions another page's title, Lorekeeper underlines it and offers a small link button;
clicking a link opens that page in a peek panel without leaving the current one.

Built with Tauri 2 + React + TypeScript (same stack as Encounters); the rich text editor is TipTap.

## Develop

```sh
npm install
npm run dev        # browser-only UI at http://localhost:1430 (data in localStorage)
npm test           # domain logic tests (title matching)
npm run tauri dev  # desktop app (same one-time Rust setup as Encounters)
```

Lorekeeper's dev server uses port 1430 (Encounters uses 1420), so both can run at once.

**Android** (same one-time setup as Encounters' README describes):

```sh
npm run tauri android init     # once; generates src-tauri/gen/android (not committed)
npm run tauri android build -- --debug --apk --target aarch64 --target x86_64   # phones + emulator
```

The APK lands in `src-tauri/gen/android/app/build/outputs/apk/universal/debug/`. On a phone the page list and the page
take turns filling the screen, and pages read as one column. Notebooks come over with Import (an exported notebook)
through the system file picker. Linking with Encounters isn't available on Android yet.

## Using it

- **Notebooks**: the name next to "Lorekeeper" in the top bar is the open notebook; click it to switch notebooks.
  Rows there can be renamed (double-click or pencil), exported, or deleted. New notebook starts an empty one;
  Import adds an exported file as a new notebook (it never replaces one), and also accepts an old `notebook.json`.
- **Sidebar**: the header buttons create a top-level page or folder; hovering a folder shows buttons for a page or folder inside it.
  Rename a folder or page with the pencil button that appears on hover (or double-click its name); drag rows onto folders (or onto empty space for the top level) to move them.
  Drag a folder onto the top or bottom edge of another folder to place it above or below (a line shows where); folders keep the order you give them, pages stay alphabetical.
- **Page types**: under each title, pick what the page describes: Note, Character (PC or NPC), Place (and the place it is inside), Faction or Item.
  The sidebar shows each type's icon; a folder's shapes button sets the type of every page inside it at once.
- **Canvas**: click empty space to write. Drag a box by its top bar, resize it from its right edge. Empty boxes vanish when you click away.
- **Links**: mentions of other pages' titles (whole words, any case) get a dotted underline and a link button.
  Click a link to peek at its page; Ctrl+click opens it. The peek panel can open the page or remove the link.
  Links point at the page itself, so renaming a page keeps them working; links to a deleted page show dashed.
- **Encounters**: link the open notebook to an Encounters campaign from the notebook menu. Encounters then suggests
  this notebook's Character pages when naming characters. `lorekeeper://page/<notebook id>/<page id>` links (Encounters'
  Open in Lorekeeper) open the page in the running window, switching notebooks if needed.
  Once linked, **Link encounter** (under the page title) picks one of the campaign's encounters and puts a chip in the
  text where the caret was; the chip shows the encounter's current name and whether it's in combat, and opens it in
  Encounters. A Character page lists every encounter that character is in (through characters made from the page),
  with its combat state and how the character is doing.

## Data

Saved as JSON under `%APPDATA%\com.lorekeeper.app\data\`:

- `library.json`: every notebook's id and name, and which one is open.
- `notebook-<id>.json`: one notebook's folders, pages, and each page's boxes.
- `view.json`: which folders are collapsed in each notebook, so the sidebar reopens as you left it (not included in exports).

On first start, a `notebook.json` from before there were several notebooks is adopted as "My notebook" (the old file is left as a backup).
An unreadable file is backed up as `<name>.corrupt-<time>.json` before a fresh one is started.

Lorekeeper also publishes its notebook list to `%APPDATA%\CampaignLink\lorekeeper.json`, the folder it shares with Encounters
(format: the [campaign-link](https://github.com/ImDeadWeight/campaign-link) package). Not available in the browser or on Android yet.

Exports are single files: `{ "format": "lorekeeper-notebook", "version": 1, "name", "notebook": { folders, pages } }`.
Imports are checked before anything is saved; references to missing folders, and folder loops, move items to the top level.

## Layout

- `src/domain` — pure logic: the notebook model and tree helpers, the notebook library and export format, title matching.
- `src/state` — zustand stores, persistence, and the notebook actions (create, switch, delete, import, export).
- `src/storage` — Tauri file store / browser fallback (shared design with Encounters), import/export file dialogs.
- `src/ui` — notebook menu, sidebar, page canvas and text boxes, editor extensions (page links, link suggestions), peek panel.
- `src-tauri` — the native shell.
