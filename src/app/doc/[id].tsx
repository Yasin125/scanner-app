import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Busy, Button, Prompt } from '../../components/ui';
import { pickImages, recognizeText, scanPages, sharePdf } from '../../lib/actions';
import { addPages, deleteDoc, pageUri, type PdfColor, renameDoc, setOcrText, setPdfColor, useDoc } from '../../lib/store';
import { useTheme } from '../../lib/theme';

const COLORS: { key: PdfColor; label: string }[] = [
  { key: 'color', label: 'Couleur' },
  { key: 'gray', label: 'Gris' },
  { key: 'bw', label: 'Noir & blanc' },
];

export default function DocScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const doc = useDoc(id);
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [busy, setBusy] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);

  const cols = width >= 900 ? 5 : width >= 600 ? 4 : 2;
  const gap = 12;
  const cell = (width - 32 - gap * (cols - 1)) / cols;

  if (!doc) return <Stack.Screen options={{ title: 'Document' }} />;

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Erreur', String(e));
    } finally {
      setBusy(null);
    }
  }

  async function add(getter: () => Promise<string[]>) {
    try {
      const imgs = await getter();
      if (imgs.length) await run('Ajout des pages…', () => addPages(doc!.id, imgs));
    } catch (e) {
      Alert.alert('Erreur', String(e));
    }
  }

  function ocr() {
    if (doc!.ocrText !== undefined) return router.push(`/ocr/${doc!.id}`);
    run('Reconnaissance du texte…', async () => {
      await setOcrText(doc!.id, await recognizeText(doc!));
      router.push(`/ocr/${doc!.id}`);
    });
  }

  function remove() {
    Alert.alert('Supprimer ce document ?', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteDoc(doc!.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: doc.title,
          headerRight: () => (
            <Pressable hitSlop={10} onPress={() => setRenaming(true)}>
              <Text style={{ color: t.primary, fontSize: 16, fontWeight: '600' }}>Renommer</Text>
            </Pressable>
          ),
        }}
      />

      <FlatList
        key={cols}
        data={doc.pages}
        numColumns={cols}
        keyExtractor={(p) => p}
        columnWrapperStyle={cols > 1 ? { gap } : undefined}
        contentContainerStyle={{ padding: 16, gap, paddingBottom: 220 }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 4 }}>
            <Text style={{ color: t.mut, fontSize: 13 }}>Couleurs du PDF</Text>
            <View style={s.chips}>
              {COLORS.map((c) => {
                const on = doc.pdfColor === c.key;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => setPdfColor(doc.id, c.key)}
                    style={[s.chip, { borderColor: on ? t.primary : t.line, backgroundColor: on ? t.primary : t.card }]}
                  >
                    <Text style={{ color: on ? t.onPrimary : t.txt, fontWeight: '600' }}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={{ color: t.mut, textAlign: 'center', marginTop: 40 }}>Aucune page.</Text>}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => router.push({ pathname: '/page/[id]', params: { id: doc.id, index: String(index) } })}>
            <Image
              source={{ uri: pageUri(doc, item) }}
              style={{ width: cell, height: cell * 1.414, borderRadius: 10, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}
              contentFit="cover"
            />
            <Text style={[s.num, { color: t.mut }]}>{index + 1}</Text>
          </Pressable>
        )}
      />

      <View style={[s.bar, { paddingBottom: insets.bottom + 12, backgroundColor: t.card, borderColor: t.line }]}>
        <View style={s.row}>
          <Button label="+ Scanner" variant="ghost" onPress={() => add(scanPages)} style={{ flex: 1 }} />
          <Button label="+ Importer" variant="ghost" onPress={() => add(pickImages)} style={{ flex: 1 }} />
        </View>
        <View style={s.row}>
          <Button label="Texte (OCR)" variant="ghost" onPress={ocr} disabled={!doc.pages.length} style={{ flex: 1 }} />
          <Button label="Supprimer" variant="ghost" onPress={remove} style={{ flex: 1 }} />
        </View>
        <Button
          label="Partager en PDF"
          disabled={!doc.pages.length}
          onPress={() => run('Création du PDF…', () => sharePdf(doc))}
        />
      </View>

      <Prompt
        visible={renaming}
        title="Renommer"
        initial={doc.title}
        onCancel={() => setRenaming(false)}
        onSubmit={(v) => {
          renameDoc(doc.id, v);
          setRenaming(false);
        }}
      />
      <Busy label={busy} />
    </View>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  num: { textAlign: 'center', marginTop: 4, fontSize: 12 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 8, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  row: { flexDirection: 'row', gap: 8 },
});
