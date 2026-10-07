import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';

export type PdfColor = 'color' | 'gray' | 'bw';

export type ScanDoc = {
  id: string;
  title: string;
  pages: string[]; // file names inside the doc folder
  createdAt: number;
  updatedAt: number;
  pdfColor: PdfColor;
  ocrText?: string;
};

const KEY = 'scanfacile.docs.v1';

let docs: ScanDoc[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

async function persist() {
  await AsyncStorage.setItem(KEY, JSON.stringify(docs));
}

export async function loadDocs() {
  if (loaded) return;
  const raw = await AsyncStorage.getItem(KEY);
  docs = raw ? (JSON.parse(raw) as ScanDoc[]) : [];
  loaded = true;
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useDocs() {
  return useSyncExternalStore(subscribe, () => docs);
}

export function useDoc(id: string | undefined) {
  const all = useDocs();
  return all.find((d) => d.id === id);
}

export function useLoaded() {
  return useSyncExternalStore(subscribe, () => loaded);
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
  return sources.map((src, i) => {
    const name = `${Date.now()}_${i}.jpg`;
    new File(toFileUri(src)).copySync(new File(dir, name));
    return name;
  });
}

function update(id: string, patch: (d: ScanDoc) => ScanDoc) {
  docs = docs.map((d) => (d.id === id ? { ...patch(d), updatedAt: Date.now() } : d));
  emit();
  return persist();
}

export function defaultTitle() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `Scan ${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}.${pad(d.getMinutes())}`;
}

export async function createDoc(sources: string[]) {
  const id = newId();
  const pages = importImages(id, sources);
  const now = Date.now();
  const doc: ScanDoc = { id, title: defaultTitle(), pages, createdAt: now, updatedAt: now, pdfColor: 'color' };
  docs = [doc, ...docs];
  emit();
  await persist();
  return doc;
}

export function addPages(id: string, sources: string[]) {
  const pages = importImages(id, sources);
  return update(id, (d) => ({ ...d, pages: [...d.pages, ...pages], ocrText: undefined }));
}

export function renameDoc(id: string, title: string) {
  return update(id, (d) => ({ ...d, title: title.trim() || d.title }));
}

export function setPdfColor(id: string, pdfColor: PdfColor) {
  return update(id, (d) => ({ ...d, pdfColor }));
}

export function setOcrText(id: string, ocrText: string) {
  return update(id, (d) => ({ ...d, ocrText }));
}

export function movePage(id: string, from: number, to: number) {
  return update(id, (d) => {
    if (to < 0 || to >= d.pages.length) return d;
    const pages = [...d.pages];
    const [p] = pages.splice(from, 1);
    pages.splice(to, 0, p);
    return { ...d, pages, ocrText: undefined };
  });
}

export function deletePage(id: string, index: number) {
  const doc = docs.find((d) => d.id === id);
  if (!doc) return;
  const f = new File(docDir(id), doc.pages[index]);
  if (f.exists) f.delete();
  return update(id, (d) => ({ ...d, pages: d.pages.filter((_, i) => i !== index), ocrText: undefined }));
}

export async function deleteDoc(id: string) {
  const dir = docDir(id);
  if (dir.exists) dir.delete();
  docs = docs.filter((d) => d.id !== id);
  emit();
  await persist();
}
