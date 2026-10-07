import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Busy, Button, Prompt } from '../components/ui';
import { pickImages, scanPages, sharePdf } from '../lib/actions';
import { createDoc, deleteDoc, pageUri, renameDoc, type ScanDoc, useDocs, useLoaded } from '../lib/store';
import { formatDate, useTheme } from '../lib/theme';

export default function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const docs = useDocs();
  const loaded = useLoaded();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<ScanDoc | null>(null);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return docs;
    return docs.filter((d) => d.title.toLowerCase().includes(needle) || d.ocrText?.toLowerCase().includes(needle));
  }, [docs, q]);

  async function start(getter: () => Promise<string[]>) {
    try {
      const imgs = await getter();
      if (!imgs.length) return;
      setBusy('Enregistrement…');
      const doc = await createDoc(imgs);
      router.push(`/doc/${doc.id}`);
    } catch (e) {
      Alert.alert('Erreur', String(e));
    } finally {
      setBusy(null);
    }
  }

  function openMenu(d: ScanDoc) {
    Alert.alert(d.title, undefined, [
      {
        text: 'Partager en PDF',
        onPress: async () => {
          setBusy('Création du PDF…');
          try {
            await sharePdf(d);
          } catch (e) {
            Alert.alert('Erreur', String(e));
          } finally {
            setBusy(null);
          }
        },
      },
      { text: 'Renommer', onPress: () => setRenaming(d) },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Supprimer ce document ?', 'Cette action est irréversible.', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: () => deleteDoc(d.id) },
          ]),
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={[s.searchWrap, { backgroundColor: t.card, borderColor: t.line }]}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Rechercher un document…"
          placeholderTextColor={t.mut}
          style={[s.search, { color: t.txt }]}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={list}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 10 }}
        ListEmptyComponent={
          loaded ? (
            <View style={s.empty}>
              <Text style={[s.emptyTitle, { color: t.txt }]}>{q ? 'Aucun résultat' : 'Aucun document'}</Text>
              {!q && (
                <Text style={{ color: t.mut, textAlign: 'center' }}>
                  Appuyez sur « Scanner » pour numériser votre premier document.
                </Text>
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/doc/${item.id}`)}
            onLongPress={() => openMenu(item)}
            style={({ pressed }) => [s.item, { backgroundColor: t.card, borderColor: t.line, opacity: pressed ? 0.85 : 1 }]}
          >
            {item.pages[0] ? (
              <Image source={{ uri: pageUri(item, item.pages[0]) }} style={[s.thumb, { backgroundColor: t.bg }]} contentFit="cover" />
            ) : (
              <View style={[s.thumb, { backgroundColor: t.bg }]} />
            )}
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={[s.title, { color: t.txt }]}>
                {item.title}
              </Text>
              <Text style={{ color: t.mut, fontSize: 13, marginTop: 4 }}>
                {item.pages.length} page{item.pages.length > 1 ? 's' : ''} · {formatDate(item.updatedAt)}
              </Text>
            </View>
            <Pressable hitSlop={12} onPress={() => openMenu(item)} style={s.more}>
              <Text style={{ color: t.mut, fontSize: 22 }}>⋯</Text>
            </Pressable>
          </Pressable>
        )}
      />

      <View style={[s.bar, { paddingBottom: insets.bottom + 12, backgroundColor: t.card, borderColor: t.line }]}>
        <Button label="Importer" variant="ghost" onPress={() => start(pickImages)} style={{ flex: 1 }} />
        <Button label="📷  Scanner" onPress={() => start(scanPages)} style={{ flex: 2 }} />
      </View>

      <Prompt
        visible={!!renaming}
        title="Renommer"
        initial={renaming?.title ?? ''}
        onCancel={() => setRenaming(null)}
        onSubmit={(v) => {
          if (renaming) renameDoc(renaming.id, v);
          setRenaming(null);
        }}
      />
      <Busy label={busy} />
    </View>
  );
}

const s = StyleSheet.create({
  searchWrap: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12 },
  search: { fontSize: 16, paddingVertical: 11 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, borderWidth: 1 },
  thumb: { width: 56, height: 74, borderRadius: 8 },
  title: { fontSize: 16, fontWeight: '600' },
  more: { paddingHorizontal: 6 },
  empty: { alignItems: 'center', marginTop: 80, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
