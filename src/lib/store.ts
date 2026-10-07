import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';

export type PdfColor = 'color' | 'gray' | 'bw';
export type ThemePref = 'auto' | 'light' | 'dark';

export type ScanDoc = {
  id: string;
  title: string;
  pages: string[]; // file names inside the doc folder
  createdAt: number;
  updatedAt: number;
  pdfColor: PdfColor;
  ocrText?: string;
  folderId?: string;
  /** Requires Face ID / device code to open. */
  locked?: boolean;
  /** Imported PDF file name (inside the doc folder); such documents have no pages. */
  pdf?: string;
};

export type Folder = { id: string; name: string; createdAt: number };

export type Settings = {
  name: string;
  theme: ThemePref;
  pdfColor: PdfColor;
  watermark: string;
  /** Saved signature: SVG path data, shown through the `signatureBox` viewBox. */
  signature: string[];
  signatureBox: { x: number; y: number; w: number; h: number };
};

const DEFAULT_SETTINGS: Settings = {
  name: '',
  theme: 'auto',
  pdfColor: 'color',
  watermark: '',
  signature: [],
  signatureBox: { x: 0, y: 0, w: 1, h: 1 },
};

/** Small AsyncStorage-backed store usable with useSyncExternalStore. */
function persisted<T>(key: string, initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    async load() {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        value = Array.isArray(initial) ? parsed : { ...initial, ...parsed };
      }
      listeners.forEach((l) => l());
    },
    set(next: T) {
      value = next;
      listeners.forEach((l) => l());
      return AsyncStorage.setItem(key, JSON.stringify(next));
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

const docsStore = persisted<ScanDoc[]>('scanfacile.docs.v1', []);
const foldersStore = persisted<Folder[]>('scanfacile.folders.v1', []);
const settingsStore = persisted<Settings>('scanfacile.settings.v1', DEFAULT_SETTINGS);

let loaded = false;
const loadedListeners = new Set<() => void>();

export async function loadAll() {
  if (loaded) return;
  await Promise.all([docsStore.load(), foldersStore.load(), settingsStore.load()]);
  loaded = true;
  loadedListeners.forEach((l) => l());
}

export function useLoaded() {
  return useSyncExternalStore(
    (l) => {
      loadedListeners.add(l);
      return () => {
        loadedListeners.delete(l);
      };
    },
    () => loaded,
  );
}

export function useDocs() {
  return useSyncExternalStore(docsStore.subscribe, docsStore.get);
}

export function useDoc(id: string | undefined) {
  return useDocs().find((d) => d.id === id);
}

export function useFolders() {
  return useSyncExternalStore(foldersStore.subscribe, foldersStore.get);
}

export function useSettings() {
  return useSyncExternalStore(settingsStore.subscribe, settingsStore.get);
}

export function getSettings() {
  return settingsStore.get();
}

export function updateSettings(patch: Partial<Settings>) {
  return settingsStore.set({ ...settingsStore.get(), ...patch });
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function docDir(id: string) {
  return new Directory(Paths.document, 'docs', id);
}

export function pageUri(doc: ScanDoc, page: string) {
  return new File(docDir(doc.id), page).uri;
}

function toFileUri(path: string) {
  return path.startsWith('file://') || path.startsWith('content://') ? path : `file://${path}`;
}

/** Copies source images into the doc folder and returns their new file names. */
function importImages(id: string, sources: string[]) {
  const dir = docDir(id);
  if (!dir.exists) dir.create({ intermediates: true });
  const stamp = Date.now();
  return sources.map((src, i) => {
    const name = `${stamp}_${i}.jpg`;
    new File(toFileUri(src)).copySync(new File(dir, name));
    return name;
  });
}

function updateDoc(id: string, patch: (d: ScanDoc) => ScanDoc) {
  return docsStore.set(docsStore.get().map((d) => (d.id === id ? { ...patch(d), updatedAt: Date.now() } : d)));
}

export function defaultTitle(prefix = 'Scan') {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${prefix} ${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}.${pad(d.getMinutes())}`;
}

export async function createDoc(sources: string[], title = defaultTitle(), folderId?: string) {
  const id = newId();
  const pages = importImages(id, sources);
  const now = Date.now();
  const doc: ScanDoc = { id, title, pages, createdAt: now, updatedAt: now, pdfColor: settingsStore.get().pdfColor, folderId };
  await docsStore.set([doc, ...docsStore.get()]);
  return doc;
}

export function addPages(id: string, sources: string[]) {
  const pages = importImages(id, sources);
  return updateDoc(id, (d) => ({ ...d, pages: [...d.pages, ...pages], ocrText: undefined }));
}

/** Replaces page `index` with a new image (crop, rotation, signature…). */
export function replacePage(id: string, index: number, source: string) {
  const [name] = importImages(id, [source]);
  const doc = docsStore.get().find((d) => d.id === id);
  const old = doc?.pages[index];
  if (old) {
    const f = new File(docDir(id), old);
    if (f.exists) f.delete();
  }
  return updateDoc(id, (d) => ({ ...d, pages: d.pages.map((p, i) => (i === index ? name : p)), ocrText: undefined }));
}

export function setLocked(id: string, locked: boolean) {
  return updateDoc(id, (d) => ({ ...d, locked }));
}

export async function importPdf(source: string, title: string) {
  const id = newId();
  const dir = docDir(id);
  dir.create({ intermediates: true });
  new File(toFileUri(source)).copySync(new File(dir, 'document.pdf'));
  const now = Date.now();
  const doc: ScanDoc = { id, title: title.replace(/\.pdf$/i, ''), pages: [], pdf: 'document.pdf', createdAt: now, updatedAt: now, pdfColor: 'color' };
  await docsStore.set([doc, ...docsStore.get()]);
  return doc;
}

export function renameDoc(id: string, title: string) {
  return updateDoc(id, (d) => ({ ...d, title: title.trim() || d.title }));
}

export function setPdfColor(id: string, pdfColor: PdfColor) {
  return updateDoc(id, (d) => ({ ...d, pdfColor }));
}

export function setOcrText(id: string, ocrText: string) {
  return updateDoc(id, (d) => ({ ...d, ocrText }));
}

export function moveDoc(id: string, folderId: string | undefined) {
  return updateDoc(id, (d) => ({ ...d, folderId }));
}

export function movePage(id: string, from: number, to: number) {
  return updateDoc(id, (d) => {
    if (to < 0 || to >= d.pages.length) return d;
    const pages = [...d.pages];
    const [p] = pages.splice(from, 1);
    pages.splice(to, 0, p);
    return { ...d, pages, ocrText: undefined };
  });
}

export function deletePage(id: string, index: number) {
  const doc = docsStore.get().find((d) => d.id === id);
  if (!doc) return;
  const f = new File(docDir(id), doc.pages[index]);
  if (f.exists) f.delete();
  return updateDoc(id, (d) => ({ ...d, pages: d.pages.filter((_, i) => i !== index), ocrText: undefined }));
}

/** Called with the id of every document deleted by the user (cloud sync removes it remotely). */
export const docDeletedListeners = new Set<(id: string) => void>();

export async function deleteDoc(id: string) {
  const dir = docDir(id);
  if (dir.exists) dir.delete();
  await docsStore.set(docsStore.get().filter((d) => d.id !== id));
  docDeletedListeners.forEach((l) => l(id));
}

/** Creates a new document containing the pages of `ids`, in order. Originals are kept. */
export function mergeDocs(ids: string[], title: string) {
  const all = docsStore.get();
  const sources = ids.flatMap((id) => {
    const d = all.find((x) => x.id === id);
    return d ? d.pages.map((p) => pageUri(d, p)) : [];
  });
  return createDoc(sources, title);
}

export async function createFolder(name: string) {
  const folder: Folder = { id: newId(), name: name.trim() || 'Nouveau dossier', createdAt: Date.now() };
  await foldersStore.set([...foldersStore.get(), folder]);
  return folder;
}

export function renameFolder(id: string, name: string) {
  return foldersStore.set(foldersStore.get().map((f) => (f.id === id && name.trim() ? { ...f, name: name.trim() } : f)));
}

/** Deletes the folder only; its documents go back to the root. */
export async function deleteFolder(id: string) {
  await docsStore.set(docsStore.get().map((d) => (d.folderId === id ? { ...d, folderId: undefined } : d)));
  await foldersStore.set(foldersStore.get().filter((f) => f.id !== id));
}

export function storageUsed() {
  try {
    const dir = new Directory(Paths.document, 'docs');
    return dir.exists ? (dir.size ?? 0) : 0;
  } catch {
    return 0;
  }
}

// ───────────── Cloud sync helpers ─────────────

export function getDocs() {
  return docsStore.get();
}

export function subscribeDocs(l: () => void) {
  return docsStore.subscribe(l);
}

export function getFolders() {
  return foldersStore.get();
}

/** Inserts or replaces a document as received from the cloud (keeps its own updatedAt). */
export function putDoc(doc: ScanDoc) {
  const all = docsStore.get();
  const exists = all.some((d) => d.id === doc.id);
  return docsStore.set(exists ? all.map((d) => (d.id === doc.id ? doc : d)) : [doc, ...all]);
}

/** Removes a document locally without notifying the cloud (it was deleted on another device). */
export async function dropDoc(id: string) {
  const dir = docDir(id);
  if (dir.exists) dir.delete();
  await docsStore.set(docsStore.get().filter((d) => d.id !== id));
}

export async function folderIdByName(name: string | undefined) {
  if (!name) return undefined;
  const found = foldersStore.get().find((f) => f.name === name);
  return found ? found.id : (await createFolder(name)).id;
}
