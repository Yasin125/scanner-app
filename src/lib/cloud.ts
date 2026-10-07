import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { File } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { useSyncExternalStore } from 'react';

import {
  docDeletedListeners,
  docDir,
  dropDoc,
  folderIdByName,
  getDocs,
  getFolders,
  putDoc,
  type ScanDoc,
  subscribeDocs,
} from './store';

export const API = 'https://badrulbinafruz.fr/api/scanfacile';
export const SUPPORT_EMAIL = 'contact@badrulbinafruz.fr';

export type Account = {
  id: number;
  name: string;
  email: string;
  premium: boolean;
  premium_until: string | null;
  used: number;
  quota: number;
  created_at: string | null;
};

type RemoteDoc = {
  uid: string;
  title: string;
  meta: Partial<RemoteMeta>;
  files: string[];
  size: number;
  updated: number;
};

type RemoteMeta = {
  pages: string[];
  pdf?: string;
  pdfColor: ScanDoc['pdfColor'];
  ocrText?: string;
  folderName?: string;
  locked?: boolean;
  createdAt: number;
};

export type CloudState = {
  account: Account | null;
  ready: boolean;
  syncing: boolean;
  lastSync: number | null;
  error: string | null;
  autoSync: boolean;
};

const TOKEN_KEY = 'scanfacile.token';
const STATE_KEY = 'scanfacile.cloud.v1';

let token: string | null = null;
let state: CloudState = { account: null, ready: false, syncing: false, lastSync: null, error: null, autoSync: true };
/** Ids known to exist in the cloud (lets us tell "deleted elsewhere" from "never uploaded"). */
let synced = new Set<string>();
let pendingDeletes = new Set<string>();
const listeners = new Set<() => void>();

function set(patch: Partial<CloudState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
  persist();
}

function persist() {
  AsyncStorage.setItem(
    STATE_KEY,
    JSON.stringify({ account: state.account, lastSync: state.lastSync, autoSync: state.autoSync, synced: [...synced], pendingDeletes: [...pendingDeletes] }),
  ).catch(() => {});
}

export function useCloud() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => state,
  );
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

async function api<T>(path: string, init: { method?: string; json?: unknown; form?: FormData } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.json !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(API + path, {
      method: init.method ?? (init.json !== undefined || init.form ? 'POST' : 'GET'),
      headers,
      body: init.form ?? (init.json !== undefined ? JSON.stringify(init.json) : undefined),
    });
  } catch {
    throw new ApiError('Pas de connexion Internet.', 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const first = body?.errors ? (Object.values(body.errors)[0] as string[] | undefined)?.[0] : undefined;
    if (res.status === 401 && token) await clearSession();
    throw new ApiError(first || body?.message || `Erreur serveur (${res.status})`, res.status, body?.code);
  }
  return body as T;
}

function deviceName() {
  return `${Device.modelName ?? Platform.OS} (${Platform.OS} ${Platform.Version})`;
}

async function clearSession() {
  token = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  synced = new Set();
  pendingDeletes = new Set();
  set({ account: null, lastSync: null, error: null });
}

async function startSession(res: { token: string; user: Account }) {
  token = res.token;
  await SecureStore.setItemAsync(TOKEN_KEY, res.token);
  set({ account: res.user, error: null });
  sync().catch(() => {});
  return res.user;
}

// ───────────── Account ─────────────

export function register(name: string, email: string, password: string) {
  return api<{ token: string; user: Account }>('/register', { json: { name, email, password, device: deviceName() } }).then(startSession);
}

export function login(email: string, password: string) {
  return api<{ token: string; user: Account }>('/login', { json: { email, password, device: deviceName() } }).then(startSession);
}

export function forgotPassword(email: string) {
  return api('/forgot', { json: { email } });
}

export function resetPassword(email: string, code: string, password: string) {
  return api<{ token: string; user: Account }>('/reset', { json: { email, code, password, device: deviceName() } }).then(startSession);
}

export async function logout() {
  await api('/logout', { method: 'POST' }).catch(() => {});
  await clearSession();
}

export async function updateProfile(patch: { name?: string; password?: string; current_password?: string }) {
  const res = await api<{ user: Account }>('/me', { method: 'PATCH', json: patch });
  set({ account: res.user });
}

export async function deleteAccount(password: string) {
  await api('/me', { method: 'DELETE', json: { password } });
  await clearSession();
}

export async function refreshAccount() {
  if (!token) return;
  const res = await api<{ user: Account }>('/me');
  set({ account: res.user });
}

// ───────────── Sync ─────────────

function filesOf(doc: ScanDoc) {
  return doc.pdf ? [doc.pdf] : doc.pages;
}

async function upload(doc: ScanDoc) {
  const folderName = getFolders().find((f) => f.id === doc.folderId)?.name;
  const meta: RemoteMeta = {
    pages: doc.pages,
    pdf: doc.pdf,
    pdfColor: doc.pdfColor,
    ocrText: doc.ocrText,
    folderName,
    locked: doc.locked,
    createdAt: doc.createdAt,
  };
  const saved = await api<{ document: RemoteDoc; user: Account }>(`/documents/${doc.id}`, {
    method: 'PUT',
    json: { title: doc.title, meta, files: filesOf(doc), updated: doc.updatedAt },
  });
  let present = new Set(saved.document.files);
  let account = saved.user;
  for (const name of filesOf(doc)) {
    if (present.has(name)) continue;
    const f = new File(docDir(doc.id), name);
    if (!f.exists) continue;
    const form = new FormData();
    form.append('name', name);
    // React Native FormData file part.
    form.append('file', { uri: f.uri, name, type: name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg' } as unknown as Blob);
    const res = await api<{ document: RemoteDoc; user: Account }>(`/documents/${doc.id}/files`, { form });
    present = new Set(res.document.files);
    account = res.user;
  }
  set({ account });
}

async function download(remote: RemoteDoc, local: ScanDoc | undefined) {
  const meta = remote.meta;
  const dir = docDir(remote.uid);
  if (!dir.exists) dir.create({ intermediates: true });
  for (const name of remote.files) {
    const target = new File(dir, name);
    if (target.exists) continue;
    await File.downloadFileAsync(`${API}/documents/${remote.uid}/files/${name}`, target, {
      headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
      idempotent: true,
    });
  }
  const pages = (meta.pages ?? []).filter((p) => remote.files.includes(p));
  await putDoc({
    id: remote.uid,
    title: remote.title,
    pages,
    pdf: meta.pdf && remote.files.includes(meta.pdf) ? meta.pdf : undefined,
    pdfColor: meta.pdfColor ?? 'color',
    ocrText: meta.ocrText,
    locked: meta.locked ?? local?.locked,
    folderId: await folderIdByName(meta.folderName),
    createdAt: meta.createdAt ?? remote.updated,
    updatedAt: remote.updated,
  });
}

let running: Promise<void> | null = null;

/** Two-way sync: newest version wins, deletions are propagated both ways. */
export function sync(): Promise<void> {
  if (!token) return Promise.resolve();
  if (running) return running;
  running = (async () => {
    set({ syncing: true, error: null });
    try {
      for (const uid of [...pendingDeletes]) {
        await api(`/documents/${uid}`, { method: 'DELETE' }).catch((e) => {
          if (!(e instanceof ApiError) || e.status === 0) throw e;
        });
        pendingDeletes.delete(uid);
        synced.delete(uid);
      }

      const res = await api<{ documents: RemoteDoc[]; user: Account }>('/documents');
      set({ account: res.user });
      const remote = new Map(res.documents.map((d) => [d.uid, d]));

      for (const doc of getDocs()) {
        const r = remote.get(doc.id);
        if (!r && synced.has(doc.id)) {
          await dropDoc(doc.id); // deleted on another device
          synced.delete(doc.id);
        } else if (!r || doc.updatedAt > r.updated) {
          await upload(doc);
          synced.add(doc.id);
        }
      }

      const locals = new Map(getDocs().map((d) => [d.id, d]));
      for (const r of res.documents) {
        const local = locals.get(r.uid);
        if (!local || r.updated > local.updatedAt) {
          await download(r, local);
        }
        synced.add(r.uid);
      }
      set({ syncing: false, lastSync: Date.now() });
    } catch (e) {
      set({ syncing: false, error: e instanceof Error ? e.message : String(e) });
      throw e;
    } finally {
      running = null;
      persist();
    }
  })();
  return running;
}

export function setAutoSync(autoSync: boolean) {
  set({ autoSync });
  if (autoSync) sync().catch(() => {});
}

let timer: ReturnType<typeof setTimeout> | null = null;
let applying = false;

function scheduleSync() {
  if (!token || !state.autoSync || applying) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => sync().catch(() => {}), 4000);
}

/** Loads the saved session and starts automatic sync. Call once at startup. */
export async function initCloud() {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      synced = new Set(saved.synced ?? []);
      pendingDeletes = new Set(saved.pendingDeletes ?? []);
      state = { ...state, account: saved.account ?? null, lastSync: saved.lastSync ?? null, autoSync: saved.autoSync ?? true };
    }
    token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) state = { ...state, account: null };
  } catch {
    token = null;
  }
  set({ ready: true });

  docDeletedListeners.add((id) => {
    if (!token || !synced.has(id)) return;
    pendingDeletes.add(id);
    persist();
    scheduleSync();
  });
  // Any local change (scan, rename, signature…) is pushed a few seconds later.
  subscribeDocs(() => {
    if (!running) scheduleSync();
  });

  if (token) {
    applying = true;
    sync()
      .catch(() => {})
      .finally(() => (applying = false));
  }
}
