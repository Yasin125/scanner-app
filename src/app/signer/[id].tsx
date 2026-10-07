import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SignatureView } from '../../components/Signature';
import { Button, useUI } from '../../components/ui';
import { imageSize } from '../../lib/edit';
import { pageUri, replacePage, useDoc, useSettings } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function SignerScreen() {
  const params = useLocalSearchParams<{ id: string; index?: string }>();
  const doc = useDoc(params.id);
  const t = useTheme();
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const { signature, signatureBox } = useSettings();
  const [index, setIndex] = useState(Number(params.index) || 0);
  const [img, setImg] = useState<{ width: number; height: number } | null>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [pos, setPos] = useState({ x: 0, y: 0, w: 140 });
  const posRef = useRef(pos);
  posRef.current = pos;

  const uri = doc && doc.pages[index] ? pageUri(doc, doc.pages[index]) : null;

  useEffect(() => {
    setImg(null);
    if (uri) imageSize(uri).then(setImg).catch(() => setImg(null));
  }, [uri]);

  // Displayed page size, fitted into the available area.
  const disp = useMemo(() => {
    if (!img || !area.w) return null;
    const scale = Math.min(area.w / img.width, area.h / img.height);
    return { w: img.width * scale, h: img.height * scale };
  }, [img, area]);

  const ratio = signatureBox.h / signatureBox.w;

  // Start near the bottom right, where signatures usually go.
  useEffect(() => {
    if (disp) setPos({ w: disp.w * 0.32, x: disp.w * 0.6, y: disp.h * 0.8 - disp.w * 0.32 * ratio });
  }, [disp, ratio]);

  const drag = useMemo(() => {
    let start = { x: 0, y: 0 };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => (start = { x: posRef.current.x, y: posRef.current.y }),
      onPanResponderMove: (_, g) => setPos((p) => ({ ...p, x: start.x + g.dx, y: start.y + g.dy })),
    });
  }, []);

  if (!doc) return null;

  if (!signature.length) {
    return (
      <View style={[s.center, { flex: 1, backgroundColor: t.bg, gap: 14, padding: 24 }]}>
        <Ionicons name="pencil-outline" size={48} color={t.primary} />
        <Text style={{ color: t.txt, fontSize: 18, fontWeight: '700' }}>Aucune signature</Text>
        <Text style={{ color: t.mut, textAlign: 'center' }}>Créez d’abord votre signature, elle sera réutilisable pour tous vos documents.</Text>
        <Button label="Créer ma signature" icon="create-outline" onPress={() => router.push('/signature')} />
      </View>
    );
  }

  async function apply() {
    if (!uri || !img || !disp) return;
    const k = 1 / disp.w;
    const p = posRef.current;
    const out = await ui.busy('Signature en cours…', () =>
      ui.snapshot(uri, img.width, img.height, (W, H) => (
        <View style={{ position: 'absolute', left: p.x * k * W, top: p.y * k * W, width: p.w * k * W, height: p.w * ratio * k * W }}>
          <SignatureView paths={signature} box={signatureBox} />
        </View>
      )),
    );
    if (!out) return;
    await replacePage(doc!.id, index, out);
    ui.toast('Page signée');
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={s.stage} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width - 24, h: e.nativeEvent.layout.height - 24 })}>
        {uri && disp && (
          <View style={{ width: disp.w, height: disp.h }}>
            <Image source={{ uri }} style={{ width: disp.w, height: disp.h }} />
            <View {...drag.panHandlers} style={[s.sig, { left: pos.x, top: pos.y, width: pos.w, height: pos.w * ratio, borderColor: t.primary }]}>
              <SignatureView paths={signature} box={signatureBox} />
            </View>
          </View>
        )}
      </View>

      <View style={[s.panel, { backgroundColor: t.card, paddingBottom: insets.bottom + 12 }]}>
        <Text style={{ color: t.mut, textAlign: 'center', fontSize: 13 }}>Faites glisser la signature à l’endroit voulu</Text>
        <View style={s.row}>
          {doc.pages.length > 1 && (
            <Pressable hitSlop={10} disabled={index === 0} onPress={() => setIndex(index - 1)} style={{ opacity: index === 0 ? 0.3 : 1 }}>
              <Ionicons name="chevron-back" size={24} color={t.txt} />
            </Pressable>
          )}
          <Text style={{ color: t.txt, fontWeight: '600' }}>
            Page {index + 1}/{doc.pages.length}
          </Text>
          {doc.pages.length > 1 && (
            <Pressable hitSlop={10} disabled={index === doc.pages.length - 1} onPress={() => setIndex(index + 1)} style={{ opacity: index === doc.pages.length - 1 ? 0.3 : 1 }}>
              <Ionicons name="chevron-forward" size={24} color={t.txt} />
            </Pressable>
          )}
          <View style={{ flex: 1 }} />
          <Pressable hitSlop={10} onPress={() => setPos((p) => ({ ...p, w: Math.max(40, p.w * 0.85) }))} style={[s.size, { backgroundColor: t.card2 }]}>
            <Ionicons name="remove" size={20} color={t.txt} />
          </Pressable>
          <Pressable hitSlop={10} onPress={() => setPos((p) => ({ ...p, w: Math.min(disp?.w ?? 400, p.w * 1.18) }))} style={[s.size, { backgroundColor: t.card2 }]}>
            <Ionicons name="add" size={20} color={t.txt} />
          </Pressable>
        </View>
        <View style={s.row}>
          <Button label="Modifier ma signature" variant="ghost" style={{ flex: 1 }} onPress={() => router.push('/signature')} />
          <Button label="Appliquer" icon="checkmark" style={{ flex: 1 }} onPress={apply} disabled={!disp} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  sig: { position: 'absolute', borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 4 },
  panel: { padding: 16, gap: 12, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  size: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
