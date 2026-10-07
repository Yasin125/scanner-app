import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type IconName, useUI } from '../../components/ui';
import { pickImages, recognizeText, scanPages } from '../../lib/actions';
import { printDoc } from '../../lib/edit';
import { useDocMenu } from '../../lib/flows';
import { authenticate, unlockedThisSession } from '../../lib/lock';
import { addPages, pageUri, type PdfColor, setOcrText, setPdfColor, useDoc } from '../../lib/store';
import { formatDate, useTheme } from '../../lib/theme';

const COLORS: { key: PdfColor; label: string }[] = [
  { key: 'color', label: 'Couleur' },
  { key: 'gray', label: 'Gris' },
  { key: 'bw', label: 'Noir & blanc' },
];

export default function DocScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const doc = useDoc(id);
  const t = useTheme();
  const ui = useUI();
  const menu = useDocMenu();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [open, setOpen] = useState(() => !doc?.locked || unlockedThisSession.has(id));

  // Locked documents ask for Face ID / passcode once per app session.
  useEffect(() => {
    if (open || !doc) return;
    authenticate(`Ouvrir « ${doc.title} »`).then((ok) => {
      if (!ok) return router.back();
      unlockedThisSession.add(id);
      setOpen(true);
    });
  }, [open, doc, id]);

  const cols = width >= 900 ? 5 : width >= 600 ? 4 : 3;
  const gap = 10;
  const cell = (width - 32 - gap * (cols - 1)) / cols;

  if (!doc) return <Stack.Screen options={{ title: 'Document' }} />;
  const d = doc;

  if (!open) {
    return (
      <View style={[s.center, { flex: 1, backgroundColor: t.bg, gap: 12 }]}>
        <Stack.Screen options={{ title: '' }} />
        <Ionicons name="lock-closed" size={48} color={t.primary} />
        <Text style={{ color: t.txt, fontSize: 17, fontWeight: '700' }}>Document verrouillé</Text>
      </View>
    );
  }

  if (d.pdf) {
    return (
      <View style={[s.center, { flex: 1, backgroundColor: t.bg, padding: 24, gap: 14 }]}>
        <Stack.Screen options={{ title: '' }} />
        <View style={[s.pdfIcon, { backgroundColor: '#FA525222' }]}>
          <Ionicons name="document" size={54} color="#FA5252" />
          <Text style={{ color: '#FA5252', fontWeight: '900', position: 'absolute', bottom: 30 }}>PDF</Text>
        </View>
        <Text style={{ color: t.txt, fontSize: 20, fontWeight: '700', textAlign: 'center' }}>{d.title}</Text>
        <Text style={{ color: t.mut }}>Importé le {formatDate(d.createdAt)}</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <Pressable onPress={() => ui.busy('Ouverture…', () => printDoc(d))} style={[s.pdfBtn, { backgroundColor: t.card }]}>
            <Ionicons name="eye-outline" size={22} color={t.txt} />
            <Text style={{ color: t.txt, fontWeight: '600' }}>Ouvrir / Imprimer</Text>
          </Pressable>
          <Pressable onPress={() => menu.share(d)} style={[s.pdfBtn, { backgroundColor: t.primary }]}>
            <Ionicons name="share-outline" size={22} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600' }}>Partager</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => menu.open(d)} style={{ marginTop: 6 }}>
          <Text style={{ color: t.mut }}>Plus d’options</Text>
        </Pressable>
      </View>
    );
  }

  async function add(getter: () => Promise<string[]>) {
    let imgs: string[] = [];
    try {
      imgs = await getter();
    } catch (e) {
      return ui.toast(e instanceof Error ? e.message : String(e));
    }
    if (imgs.length) await ui.busy('Ajout des pages…', () => addPages(d.id, imgs));
  }

  async function ocr() {
    if (d.ocrText !== undefined) return router.push(`/ocr/${d.id}`);
    const ok = await ui.busy('Reconnaissance du texte…', async () => {
      await setOcrText(d.id, await recognizeText(d));
      return true;
    });
    if (ok) router.push(`/ocr/${d.id}`);
  }

  const tools: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }[] = [
    { icon: 'share-outline', label: 'Partager', onPress: () => menu.share(d), disabled: !d.pages.length },
    {
      icon: 'color-filter-outline',
      label: COLORS.find((c) => c.key === d.pdfColor)?.label ?? 'Couleur',
      onPress: () =>
        ui.sheet({
          title: 'Couleurs du PDF',
          options: COLORS.map((c) => ({ label: (c.key === d.pdfColor ? '✓  ' : '') + c.label, onPress: () => setPdfColor(d.id, c.key) })),
        }),
    },
    { icon: 'text-outline', label: 'Texte', onPress: ocr, disabled: !d.pages.length },
    {
      icon: 'add-circle-outline',
      label: 'Ajouter',
      onPress: () =>
        ui.sheet({
          title: 'Ajouter des pages',
          options: [
            { label: 'Scanner', icon: 'camera-outline', onPress: () => add(scanPages) },
            { label: 'Importer des images', icon: 'images-outline', onPress: () => add(pickImages) },
          ],
        }),
    },
    { icon: 'ellipsis-horizontal', label: 'Plus', onPress: () => menu.open(d) },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable hitSlop={10} onPress={() => menu.rename(d)}>
              <Ionicons name="create-outline" size={22} color={t.txt} />
            </Pressable>
          ),
        }}
      />

      <FlatList
        key={cols}
        data={d.pages}
        numColumns={cols}
        keyExtractor={(p) => p}
        columnWrapperStyle={{ gap }}
        contentContainerStyle={{ paddingHorizontal: 16, gap, paddingBottom: insets.bottom + 110 }}
        ListHeaderComponent={
          <Pressable onPress={() => menu.rename(d)} style={{ paddingBottom: 12 }}>
            <Text style={{ color: t.txt, fontSize: 22, fontWeight: '700' }} numberOfLines={2}>
              {d.title}
            </Text>
            <Text style={{ color: t.mut, fontSize: 13, marginTop: 4 }}>
              {formatDate(d.updatedAt)} · {d.pages.length} page{d.pages.length > 1 ? 's' : ''}
            </Text>
          </Pressable>
        }
        ListEmptyComponent={<Text style={{ color: t.mut, textAlign: 'center', marginTop: 40 }}>Aucune page.</Text>}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => router.push({ pathname: '/page/[id]', params: { id: d.id, index: String(index) } })}>
            <Image
              source={{ uri: pageUri(d, item) }}
              style={{ width: cell, height: cell * 1.414, borderRadius: 8, backgroundColor: t.card }}
              contentFit="cover"
            />
            <View style={s.num}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{index + 1}</Text>
            </View>
          </Pressable>
        )}
      />

      <View style={[s.bar, { paddingBottom: insets.bottom + 8, backgroundColor: t.card, borderTopColor: t.line }]}>
        {tools.map((x) => (
          <Pressable key={x.label} onPress={x.onPress} disabled={x.disabled} style={({ pressed }) => [s.tool, { opacity: x.disabled ? 0.35 : pressed ? 0.6 : 1 }]}>
            <Ionicons name={x.icon} size={24} color={t.txt} />
            <Text style={{ color: t.txt, fontSize: 11, fontWeight: '500' }} numberOfLines={1}>
              {x.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  pdfIcon: { width: 120, height: 140, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14 },
  num: { position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  tool: { flex: 1, alignItems: 'center', gap: 4 },
});
