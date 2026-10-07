import { router } from 'expo-router';
import { useCallback } from 'react';

import { useUI } from '../components/ui';
import * as DocumentPicker from 'expo-document-picker';

import type { CamMode } from '../app/camera';
import { pickImages, recognizeText, sharePdf } from './actions';
import { exportExcel, exportWord, printDoc } from './edit';
import { authenticate, unlockedThisSession } from './lock';
import { createDoc, deleteDoc, importPdf, moveDoc, renameDoc, type ScanDoc, setLocked, setOcrText, useFolders } from './store';

/** Capture flows shared by the home screen, the tab bar camera button and the tools screen. */
export function useCapture() {
  const ui = useUI();

  const start = useCallback(
    async (getter: () => Promise<string[]>, opts: { title?: string; folderId?: string; ocr?: boolean } = {}) => {
      let imgs: string[];
      try {
        imgs = await getter();
      } catch (e) {
        ui.toast(e instanceof Error ? e.message : String(e));
        return;
      }
      if (!imgs.length) return;
      const doc = await ui.busy('Enregistrement…', () => createDoc(imgs, opts.title, opts.folderId));
      if (!doc) return;
      if (!opts.ocr) return router.push(`/doc/${doc.id}`);
      const ok = await ui.busy('Reconnaissance du texte…', async () => {
        await setOcrText(doc.id, await recognizeText(doc));
        return true;
      });
      router.push(ok ? `/ocr/${doc.id}` : `/doc/${doc.id}`);
    },
    [ui],
  );

  const camera = (mode: CamMode, folderId?: string) =>
    router.push({ pathname: '/camera', params: folderId ? { mode, folderId } : { mode } });

  /** Files app / Drive: images become a scanned document, each PDF is kept as is. */
  const importFiles = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: true, copyToCacheDirectory: true });
    if (res.canceled) return;
    const images = res.assets.filter((a) => !a.mimeType?.includes('pdf') && !a.name.toLowerCase().endsWith('.pdf'));
    const pdfs = res.assets.filter((a) => !images.includes(a));
    const last = await ui.busy('Importation…', async () => {
      let doc: ScanDoc | undefined;
      for (const p of pdfs) doc = await importPdf(p.uri, p.name);
      if (images.length) doc = await createDoc(images.map((a) => a.uri));
      return doc;
    });
    if (last) router.push(`/doc/${last.id}`);
  };

  return {
    importFiles,
    scan: (folderId?: string) => camera('scan', folderId),
    importImages: (folderId?: string) => start(pickImages, { folderId }),
    idCard: () => camera('id'),
    extractText: () => camera('ocr'),
    board: () => camera('board'),
    camera,
  };
}

export function useDocMenu() {
  const ui = useUI();
  const folders = useFolders();

  const rename = useCallback(
    async (d: ScanDoc) => {
      const v = await ui.prompt('Renommer le document', d.title);
      if (v !== null) await renameDoc(d.id, v);
    },
    [ui],
  );

  const share = useCallback((d: ScanDoc) => ui.busy('Création du PDF…', () => sharePdf(d)), [ui]);

  const move = useCallback(
    (d: ScanDoc) =>
      ui.sheet({
        title: 'Déplacer vers…',
        options: [
          ...(d.folderId ? [{ label: 'Tous les documents (racine)', icon: 'home-outline' as const, onPress: () => moveDoc(d.id, undefined) }] : []),
          ...folders
            .filter((f) => f.id !== d.folderId)
            .map((f) => ({ label: f.name, icon: 'folder-outline' as const, onPress: () => moveDoc(d.id, f.id) })),
        ],
      }),
    [ui, folders],
  );

  const remove = useCallback(
    (d: ScanDoc) =>
      ui.sheet({
        title: `Supprimer « ${d.title} » ? Action irréversible.`,
        options: [{ label: 'Supprimer définitivement', icon: 'trash-outline', destructive: true, onPress: () => deleteDoc(d.id) }],
      }),
    [ui],
  );

  const toggleLock = useCallback(
    async (d: ScanDoc) => {
      if (d.locked && !(await authenticate('Déverrouiller le document'))) return;
      await setLocked(d.id, !d.locked);
      if (!d.locked) unlockedThisSession.add(d.id);
      ui.toast(d.locked ? 'Document déverrouillé' : 'Document verrouillé : Face ID / code demandé à l’ouverture');
    },
    [ui],
  );

  const open = useCallback(
    (d: ScanDoc) =>
      ui.sheet({
        title: d.title,
        options: [
          { label: d.pdf ? 'Partager le PDF' : 'Partager en PDF', icon: 'share-outline', onPress: () => share(d) },
          { label: 'Renommer', icon: 'create-outline', onPress: () => rename(d) },
          ...(d.pages.length
            ? [
                { label: 'Signer', icon: 'pencil-outline' as const, onPress: () => router.push({ pathname: '/signer/[id]', params: { id: d.id, index: '0' } }) },
                { label: 'Exporter en Word', icon: 'document-text-outline' as const, onPress: () => ui.busy('Conversion en Word…', () => exportWord(d)) },
                { label: 'Exporter en Excel', icon: 'grid-outline' as const, onPress: () => ui.busy('Conversion en Excel…', () => exportExcel(d)) },
              ]
            : []),
          { label: 'Imprimer', icon: 'print-outline', onPress: () => ui.busy('Préparation…', () => printDoc(d)) },
          { label: d.locked ? 'Déverrouiller' : 'Verrouiller (Face ID)', icon: d.locked ? 'lock-open-outline' : 'lock-closed-outline', onPress: () => toggleLock(d) },
          ...(folders.length || d.folderId ? [{ label: 'Déplacer', icon: 'folder-open-outline' as const, onPress: () => move(d) }] : []),
          { label: 'Supprimer', icon: 'trash-outline', destructive: true, onPress: () => remove(d) },
        ],
      }),
    [ui, folders, share, rename, move, remove, toggleLock],
  );

  return { open, share, rename };
}
