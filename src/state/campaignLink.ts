/**
 * @file Lorekeeper's side of Campaign Link: links notebooks to Encounters
 * campaigns and keeps the shared folder up to date (see the campaign-link
 * package). Publishes the notebook list and, for each linked notebook, its
 * characters, places, factions and items; reads Encounters' campaign list and
 * the catalogue of each linked campaign.
 *
 * Link claims are per device (the folder is), so they live in their own
 * campaign-link.json, not in notebooks (which would carry them into exports).
 */
import {
  createLinkSync,
  makeLorekeeperCatalog,
  readEncountersCatalog,
  sameData,
  type AppIndex,
  type EncountersCatalog,
  type LinkClaim,
  type LinkResolution,
  type LinkSync,
  type LorePage,
} from 'campaign-link';
import { create } from 'zustand';
import { newId, type Id } from '../domain/ids';
import type { Page } from '../domain/notebook';
import { loadDocument, saveDocument } from '../storage/documents';
import { isMobile } from '../platform';
import { chooseLinkFolder, openLinkFolder, type LinkFolder, type LinkFolderAccess } from '../storage/linkFolder';
import { useLibrary } from './libraryStore';
import { useNotebook } from './notebookStore';
import { readNotebook } from './persistence';

/** How often to look at the other app's files while the window is visible. */
const POLL_MS = 3000;
/** Wait this long after a local change before publishing it. */
const CHANGE_DELAY_MS = 800;
/** This app's saved link claims. */
const CLAIMS_DOC = 'campaign-link';

/** Campaign Link state, for the UI. */
interface LinkState {
  /** Where the shared folder is (full path; on Android its name), when available. */
  location: string | null;
  /** Why linking can't work here, or the last error; null when all is well. */
  problem: string | null;
  /** Android: the user picks the shared folder (offer Choose folder… / Change). */
  canChooseFolder: boolean;
  /** Each notebook's link to an Encounters campaign, by notebook id. */
  claims: Record<Id, LinkClaim>;
  /** Each notebook's link status, by notebook id (absent until the first sync). */
  status: Record<Id, LinkResolution['status']>;
  /** Encounters' campaign list; null until Encounters has run on this device. */
  partner: AppIndex | null;
  /** Why Encounters' list couldn't be read, if it couldn't. */
  partnerProblem: string | null;
  /** The linked campaign's catalogue, by notebook id. */
  catalogs: Record<Id, EncountersCatalog>;
}

export const useCampaignLink = create<LinkState>(() => ({
  location: null,
  problem: null,
  canChooseFolder: false,
  claims: {},
  status: {},
  partner: null,
  partnerProblem: null,
  catalogs: {},
}));

/** Runs a sync pass soon (set once the folder is open). */
let requestSync: (delay?: number) => void = () => undefined;

/** Links a notebook to an Encounters campaign (Encounters confirms on its next look). */
export function linkNotebook(notebookId: Id, campaignId: Id) {
  setClaim(notebookId, { linkId: newId(), partnerId: campaignId, confirmed: false });
  requestSync(0);
}

/** Ends a notebook's link (Encounters ends its side on its next look). */
export function unlinkNotebook(notebookId: Id) {
  setClaim(notebookId, null);
  requestSync(0);
}

function setClaim(notebookId: Id, claim: LinkClaim | null) {
  useCampaignLink.setState((s) => {
    const { [notebookId]: _old, ...rest } = s.claims;
    return { claims: claim ? { ...rest, [notebookId]: claim } : rest };
  });
}

/** A page as published to Encounters: only typed pages (characters, places, factions, items), and characters' stat blocks. */
function toLorePage(p: Page): LorePage | null {
  if (!p.info) return null;
  const statBlock = p.info.type === 'character' ? p.statBlock : undefined;
  return { id: p.id, title: p.title, info: p.info, ...(statBlock ? { statBlock } : {}) };
}
const lorePages = (pages: Page[]) => pages.map(toLorePage).filter((p): p is LorePage => p !== null);

/** Starts linking. Never throws: problems show in useCampaignLink. */
export async function startCampaignLink(): Promise<void> {
  const saved = await loadDocument<{ claims: Record<Id, LinkClaim> }>(CLAIMS_DOC, () => ({ claims: {} }));
  useCampaignLink.setState({ claims: saved.data.claims, problem: saved.warning ?? null });
  useCampaignLink.subscribe((s, before) => {
    if (s.claims !== before.claims) saveDocument(CLAIMS_DOC, { claims: s.claims }).catch(() => undefined);
  });

  await connect();
}

/** The sync loop over the open folder; replaced when another folder is chosen (Android). */
let sync: LinkSync | null = null;

/** Opens the shared folder and syncs with it; the first time, also starts watching for changes. */
async function connect() {
  let access: LinkFolderAccess;
  try {
    access = await openLinkFolder();
  } catch (err) {
    useCampaignLink.setState({ problem: `The shared folder couldn't be opened: ${(err as Error).message ?? err}` });
    return;
  }
  if (!access.available) {
    useCampaignLink.setState({ location: null, problem: access.reason, canChooseFolder: access.canChoose });
    return;
  }
  const first = sync === null;
  sync = syncOver(access.folder);
  useCampaignLink.setState({ location: access.folder.location, problem: null, canChooseFolder: isMobile() });
  if (first) await startWatching();
  else requestSync(0);
}

/** Android: lets the user pick (or change) the shared folder, then syncs with it. */
export async function chooseFolder(): Promise<void> {
  try {
    if (await chooseLinkFolder()) await connect();
  } catch (err) {
    useCampaignLink.setState({ problem: `Couldn't use that folder: ${(err as Error).message ?? err}` });
  }
}

/** A sync loop over one folder. */
function syncOver(folder: LinkFolder): LinkSync {
  /** Notebooks not open this session whose catalogue has been built from their file. */
  const builtFromFile = new Set<Id>();
  return createLinkSync(folder, {
    app: 'lorekeeper',
    campaigns: () => {
      const { claims } = useCampaignLink.getState();
      return useLibrary.getState().notebooks.map((n) => ({ id: n.id, name: n.name, link: claims[n.id] ?? null }));
    },
    setClaim,
    catalog: async (notebookId) => {
      const name = useLibrary.getState().notebooks.find((n) => n.id === notebookId)?.name ?? 'Notebook';
      // The open notebook is in memory; others only change while open, so their file is read once.
      if (notebookId === useLibrary.getState().activeId) {
        return makeLorekeeperCatalog(notebookId, name, lorePages(useNotebook.getState().pages));
      }
      if (builtFromFile.has(notebookId)) return null;
      builtFromFile.add(notebookId);
      return makeLorekeeperCatalog(notebookId, name, lorePages((await readNotebook(notebookId)).pages));
    },
  });
}

/** Syncs now, after local changes, when the app comes back to the front, and every few seconds while it's visible. */
async function startWatching() {
  /** One pass, then read the catalogue of every linked campaign. */
  async function pass() {
    if (!sync) return;
    const result = await sync.refresh();
    const catalogs: Record<Id, EncountersCatalog> = {};
    for (const [notebookId, claim] of Object.entries(useCampaignLink.getState().claims)) {
      if (result.status[notebookId] !== 'linked') continue;
      const text = await sync.readPartnerCatalog(claim.linkId).catch(() => null);
      if (!text) continue;
      try {
        // Keep the same object while nothing changed, so chips and panels don't redraw on every look.
        const fresh = readEncountersCatalog(text);
        const previous = useCampaignLink.getState().catalogs[notebookId];
        catalogs[notebookId] = previous && sameData(previous, fresh) ? previous : fresh;
      } catch {
        // A damaged catalogue is skipped; the previous one stays until a good one arrives.
        const previous = useCampaignLink.getState().catalogs[notebookId];
        if (previous) catalogs[notebookId] = previous;
      }
    }
    useCampaignLink.setState({ ...result, catalogs, problem: null });
  }

  // One pass at a time; requests during a pass run once it finishes.
  let running = false;
  let again = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = async () => {
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      await pass();
    } catch (err) {
      useCampaignLink.setState({ problem: `Could not update the Campaign Link folder: ${(err as Error).message}` });
    } finally {
      running = false;
      if (again) {
        again = false;
        run();
      }
    }
  };
  requestSync = (delay = CHANGE_DELAY_MS) => {
    clearTimeout(timer);
    timer = setTimeout(run, delay);
  };

  await run();
  // Local changes Encounters should see: notebook names, and the open notebook's pages.
  useLibrary.subscribe((s, before) => {
    if (s.notebooks !== before.notebooks || s.activeId !== before.activeId) requestSync();
  });
  useNotebook.subscribe((s, before) => {
    if (s.pages !== before.pages) requestSync();
  });
  // Changes Encounters made: look when the window (or, on Android, the app) comes back, and every few seconds while visible.
  window.addEventListener('focus', () => requestSync(0));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestSync(0);
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') run();
  }, POLL_MS);
}

/** The catalogue of the Encounters campaign linked to the open notebook, or null. */
export function useOpenNotebookCatalog(): EncountersCatalog | null {
  const activeId = useLibrary((s) => s.activeId);
  return useCampaignLink((s) => (activeId ? s.catalogs[activeId] ?? null : null));
}

/** The open notebook's link status with Encounters (unlinked until the first sync says otherwise). */
export function useOpenNotebookLinkStatus(): LinkResolution['status'] | 'unavailable' {
  const activeId = useLibrary((s) => s.activeId);
  return useCampaignLink((s) => (!s.location ? 'unavailable' : activeId ? s.status[activeId] ?? 'unlinked' : 'unlinked'));
}
