import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DocList } from '../../components/DocList';
import { type IconName, useUI } from '../../components/ui';
import { useCapture } from '../../lib/flows';
import { createFolder, storageUsed, useDocs, useFolders } from '../../lib/store';
import { formatSize, useTheme } from '../../lib/theme';

export default function Documents() {
  const t = useTheme();
  const ui = useUI();
  const cap = useCapture();
  const insets = useSafeAreaInsets();
  const docs = useDocs();
  const folders = useFolders();
  const [q, setQ] = useState('');

  const needle = q.trim().toLowerCase();
  const visibleDocs = useMemo(
    () => (needle ? docs.filter((d) => d.title.toLowerCase().includes(needle) || d.ocrText?.toLowerCase().includes(needle)) : docs.filter((d) => !d.folderId)),
    [docs, needle],
  );
  const visibleFolders = needle ? folders.filter((f) => f.name.toLowerCase().includes(needle)) : folders;
  const used = useMemo(() => storageUsed(), [docs]);

  async function newFolder() {
    const name = await ui.prompt('Nouveau dossier', '', 'Nom du dossier');
    if (name !== null) await createFolder(name);
  }

  const cards: { label: string; icon: IconName; color: string; onPress: () => void }[] = [
    { label: 'Importer fichiers', icon: 'document', color: '#5C7CFA', onPress: cap.importFiles },
    { label: 'Importer images', icon: 'image', color: '#4DABF7', onPress: () => cap.importImages() },
    { label: 'Créer un dossier', icon: 'folder', color: '#20C997', onPress: newFolder },
  ];

  const header = (
    <View>
      <View style={[s.titleRow, { paddingTop: insets.top + 10 }]}>
        <Text style={{ color: t.txt, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 }}>Fichiers</Text>
        <Text style={{ color: t.mut, fontSize: 13 }}>{formatSize(used)} sur l’appareil</Text>
      </View>
      <View style={s.top}>
        <View style={[s.search, { backgroundColor: t.card, borderColor: t.line }]}>
          <Ionicons name="search" size={18} color={t.mut} />
          <TextInput value={q} onChangeText={setQ} placeholder="Rechercher" placeholderTextColor={t.mut} style={[s.searchInput, { color: t.txt }]} />
        </View>
      </View>
      <View style={s.cards}>
        {cards.map((c) => (
          <Pressable key={c.label} onPress={c.onPress} style={({ pressed }) => [s.card, { backgroundColor: t.card, borderColor: t.line, opacity: pressed ? 0.7 : 1 }]}>
            <View style={[s.cardIc, { backgroundColor: c.color + (t.dark ? '26' : '14') }]}>
              <Ionicons name={c.icon} size={22} color={c.color} />
            </View>
            <Text style={{ color: t.txt, fontSize: 13, fontWeight: '500', textAlign: 'center' }} numberOfLines={2}>
              {c.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <DocList docs={visibleDocs} folders={visibleFolders} title={needle ? 'Résultats' : 'Tous'} header={header} />
    </View>
  );
}

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 14 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 10 },
  cards: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  card: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 6, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  cardIc: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
