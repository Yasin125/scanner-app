import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Thumb } from '../components/DocRow';
import { useUI } from '../components/ui';
import { authenticate } from '../lib/lock';
import { compressImage, docSize, exportExcel, exportWord, printDoc } from '../lib/edit';
import { createDoc, pageUri, type ScanDoc, setLocked, useDocs } from '../lib/store';
import { formatDate, formatSize, useTheme } from '../lib/theme';

export type PickAction = 'compress' | 'word' | 'excel' | 'print' | 'lock' | 'sign';

const TITLES: Record<PickAction, string> = {
  compress: 'Compresser',
  word: 'Convertir en Word',
  excel: 'Convertir en Excel',
  print: 'Imprimer',
  lock: 'Verrouiller / déverrouiller',
  sign: 'Signer un document',
};

/** Document picker used by the tools that act on an existing document. */
export default function Choisir() {
  const { action } = useLocalSearchParams<{ action: PickAction }>();
  const t = useTheme();
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const docs = useDocs();
  const needsPages = action !== 'print' && action !== 'lock';
  const list = useMemo(
    () => [...docs].filter((d) => !needsPages || d.pages.length > 0).sort((a, b) => b.updatedAt - a.updatedAt),
    [docs, needsPages],
  );

  async function run(d: ScanDoc) {
    switch (action) {
      case 'compress': {
        const before = docSize(d);
        const doc = await ui.busy('Compression…', async () => {
          const pages = [];
          for (const p of d.pages) pages.push(await compressImage(pageUri(d, p)));
          return createDoc(pages, `${d.title} (compressé)`, d.folderId);
        });
        if (!doc) return;
        ui.toast(`${formatSize(before)} → ${formatSize(docSize(doc))}`);
        return router.replace(`/doc/${doc.id}`);
      }
      case 'word':
        return ui.busy('Conversion en Word…', () => exportWord(d));
      case 'excel':
        return ui.busy('Conversion en Excel…', () => exportExcel(d));
      case 'print':
        return ui.busy('Préparation…', () => printDoc(d));
      case 'lock':
        if (d.locked && !(await authenticate('Déverrouiller le document'))) return;
        await setLocked(d.id, !d.locked);
        return ui.toast(d.locked ? 'Document déverrouillé' : 'Document verrouillé : Face ID / code demandé à l’ouverture');
      case 'sign':
        return router.replace({ pathname: '/signer/[id]', params: { id: d.id, index: '0' } });
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen options={{ title: TITLES[action] ?? 'Choisir' }} />
      <FlatList
        data={list}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20, gap: 8 }}
        ListHeaderComponent={<Text style={{ color: t.mut, marginBottom: 6 }}>Choisissez un document :</Text>}
        ListEmptyComponent={<Text style={{ color: t.mut, textAlign: 'center', marginTop: 40 }}>Aucun document.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => run(item)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, backgroundColor: t.card, opacity: pressed ? 0.7 : 1 }]}>
            <Thumb doc={item} size={52} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: t.txt, fontWeight: '600', fontSize: 15 }}>
                {item.title}
              </Text>
              <Text style={{ color: t.mut, fontSize: 12, marginTop: 4 }}>
                {formatDate(item.updatedAt)} · {item.pdf ? 'PDF' : `${item.pages.length} p.`}
              </Text>
            </View>
            {action === 'lock' && <Ionicons name={item.locked ? 'lock-closed' : 'lock-open-outline'} size={20} color={item.locked ? t.primary : t.mut} />}
            {action !== 'lock' && <Ionicons name="chevron-forward" size={18} color={t.mut} />}
          </Pressable>
        )}
      />
    </View>
  );
}
