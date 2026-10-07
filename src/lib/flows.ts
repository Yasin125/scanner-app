import { router } from 'expo-router';
import { useCallback } from 'react';

import { useUI } from '../components/ui';
import { pickImages, recognizeText, sharePdf } from './actions';
import { createDoc, deleteDoc, moveDoc, renameDoc, type ScanDoc, setOcrText, useFolders } from './store';

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

  const camera = (mode: 'scan' | 'id' | 'ocr' | 'board', folderId?: string) =>
    router.push({ pathname: '/camera', params: folderId ? { mode, folderId } : { mode } });

  return {
    scan: (folderId?: string) => camera('scan', folderId),
    importImages: (folderId?: string) => start(pickImages, { folderId }),
    idCard: () => camera('id'),
    extractText: () => camera('ocr'),
    board: () => camera('board'),
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

  const open = useCallback(
    (d: ScanDoc) =>
      ui.sheet({
        title: d.title,
        options: [
          { label: 'Partager en PDF', icon: 'share-outline', onPress: () => share(d) },
          { label: 'Renommer', icon: 'create-outline', onPress: () => rename(d) },
          ...(folders.length || d.folderId ? [{ label: 'Déplacer', icon: 'folder-open-outline' as const, onPress: () => move(d) }] : []),
          { label: 'Supprimer', icon: 'trash-outline', destructive: true, onPress: () => remove(d) },
        ],
      }),
    [ui, folders, share, rename, move, remove],
  );

  return { open, share, rename };
}
