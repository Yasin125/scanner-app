import { File } from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useUI } from '../components/ui';
import { createDoc, importPdf, loadAll } from '../lib/store';
import { useTheme } from '../lib/theme';

function describe(uri: string) {
  try {
    const f = new File(uri);
    return { name: f.name || '', type: f.type || '' };
  } catch {
    return { name: '', type: '' };
  }
}

/** Imports a file received from another app, then opens it. */
export default function Ouvrir() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const t = useTheme();
  const ui = useUI();
  const done = useRef(false);

  useEffect(() => {
    if (!uri || done.current) return;
    done.current = true;
    (async () => {
      try {
        await loadAll();
        const { name, type } = describe(uri);
        const decodedName = decodeURIComponent(name || uri.split('/').pop() || '');
        const isImage = type.startsWith('image/') || /\.(jpe?g|png|heic|heif|webp)$/i.test(decodedName);
        const title = decodedName.replace(/\.[a-z0-9]+$/i, '') || 'Document importé';
        const doc = isImage ? await createDoc([uri], title) : await importPdf(uri, title);
        router.replace(`/doc/${doc.id}`);
      } catch {
        router.replace('/');
        ui.toast('Impossible d’ouvrir ce fichier');
      }
    })();
  }, [uri, ui]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: t.bg }}>
      <ActivityIndicator color={t.primary} size="large" />
      <Text style={{ color: t.txt, fontWeight: '600' }}>Ouverture du document…</Text>
    </View>
  );
}
