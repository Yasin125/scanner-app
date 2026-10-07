import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Thumb } from '../components/DocRow';
import { Button, useUI } from '../components/ui';
import { defaultTitle, mergeDocs, useDocs } from '../lib/store';
import { formatDate, useTheme } from '../lib/theme';

export default function Fusionner() {
  const t = useTheme();
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const docs = useDocs();
  const [picked, setPicked] = useState<string[]>([]);
  const list = useMemo(() => [...docs].sort((a, b) => b.updatedAt - a.updatedAt), [docs]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function merge() {
    const title = await ui.prompt('Nom du nouveau document', defaultTitle('Fusion'));
    if (title === null) return;
    const doc = await ui.busy('Fusion en cours…', () => mergeDocs(picked, title));
    if (doc) router.replace(`/doc/${doc.id}`);
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Text style={{ color: t.mut, paddingHorizontal: 16, paddingTop: 12 }}>
        Sélectionnez les documents dans l’ordre voulu. Les originaux sont conservés.
      </Text>
      <FlatList
        data={list}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 110, gap: 8 }}
        ListEmptyComponent={<Text style={{ color: t.mut, textAlign: 'center', marginTop: 40 }}>Aucun document.</Text>}
        renderItem={({ item }) => {
          const n = picked.indexOf(item.id);
          return (
            <Pressable onPress={() => toggle(item.id)} style={[s.row, { backgroundColor: t.card, borderColor: n >= 0 ? t.primary : 'transparent' }]}>
              <Thumb doc={item} size={52} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: t.txt, fontWeight: '600', fontSize: 15 }}>
                  {item.title}
                </Text>
                <Text style={{ color: t.mut, fontSize: 12, marginTop: 4 }}>
                  {formatDate(item.updatedAt)} · {item.pages.length} p.
                </Text>
              </View>
              <View style={[s.check, { borderColor: n >= 0 ? t.primary : t.line, backgroundColor: n >= 0 ? t.primary : 'transparent' }]}>
                {n >= 0 ? <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{n + 1}</Text> : <Ionicons name="add" size={14} color={t.mut} />}
              </View>
            </Pressable>
          );
        }}
      />
      <View style={[s.bar, { paddingBottom: insets.bottom + 12, backgroundColor: t.bg }]}>
        <Button label={picked.length < 2 ? 'Choisissez au moins 2 documents' : `Fusionner ${picked.length} documents`} icon="git-merge-outline" disabled={picked.length < 2} onPress={merge} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, borderWidth: 2 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10 },
});
