import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type IconName, useUI } from '../../components/ui';
import { pickImages, recognizeText, scanPages } from '../../lib/actions';
import { useDocMenu } from '../../lib/flows';
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

  const cols = width >= 900 ? 5 : width >= 600 ? 4 : 3;
  const gap = 10;
  const cell = (width - 32 - gap * (cols - 1)) / cols;

  if (!doc) return <Stack.Screen options={{ title: 'Document' }} />;
  const d = doc;

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
  num: { position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  tool: { flex: 1, alignItems: 'center', gap: 4 },
});
