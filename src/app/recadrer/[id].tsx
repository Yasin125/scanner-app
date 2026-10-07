import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type IconName, useUI } from '../../components/ui';
import { cropImage, imageSize, rotateImage } from '../../lib/edit';
import { pageUri, replacePage, useDoc } from '../../lib/store';

type Box = { x: number; y: number; w: number; h: number };
type Corner = 'tl' | 'tr' | 'bl' | 'br';
const MIN = 40;
const ACCENT = '#5B82FF';

export default function CropScreen() {
  const params = useLocalSearchParams<{ id: string; index: string }>();
  const doc = useDoc(params.id);
  const index = Number(params.index) || 0;
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const original = doc && doc.pages[index] ? pageUri(doc, doc.pages[index]) : null;

  const [src, setSrc] = useState<string | null>(original);
  const [img, setImg] = useState<{ width: number; height: number } | null>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState<Box>({ x: 0, y: 0, w: 0, h: 0 });
  const boxRef = useRef(box);
  boxRef.current = box;

  useEffect(() => {
    if (src) imageSize(src).then(setImg);
  }, [src]);

  const disp = useMemo(() => {
    if (!img || !area.w) return null;
    const scale = Math.min(area.w / img.width, area.h / img.height);
    return { w: img.width * scale, h: img.height * scale, scale };
  }, [img, area]);
  const dispRef = useRef(disp);
  dispRef.current = disp;

  useEffect(() => {
    if (disp) setBox({ x: 0, y: 0, w: disp.w, h: disp.h });
  }, [disp]);

  const handles = useMemo(() => {
    const make = (c: Corner) => {
      let start = boxRef.current;
      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => (start = boxRef.current),
        onPanResponderMove: (_, g) => {
          const d = dispRef.current;
          if (!d) return;
          let { x, y, w, h } = start;
          const right = x + w;
          const bottom = y + h;
          if (c === 'tl' || c === 'bl') x = Math.min(Math.max(0, start.x + g.dx), right - MIN);
          if (c === 'tl' || c === 'tr') y = Math.min(Math.max(0, start.y + g.dy), bottom - MIN);
          const r = c === 'tr' || c === 'br' ? Math.max(Math.min(d.w, right + g.dx), x + MIN) : right;
          const b = c === 'bl' || c === 'br' ? Math.max(Math.min(d.h, bottom + g.dy), y + MIN) : bottom;
          setBox({ x, y, w: r - x, h: b - y });
        },
      });
    };
    return { tl: make('tl'), tr: make('tr'), bl: make('bl'), br: make('br') };
  }, []);

  if (!doc || !original) return <View style={s.root} />;

  async function rotate(deg: number) {
    if (!src) return;
    const out = await ui.busy('Rotation…', () => rotateImage(src, deg));
    if (out) setSrc(out);
  }

  async function apply() {
    if (!src || !img || !disp) return;
    const k = 1 / disp.scale;
    const rect = {
      originX: Math.round(box.x * k),
      originY: Math.round(box.y * k),
      width: Math.min(img.width, Math.round(box.w * k)),
      height: Math.min(img.height, Math.round(box.h * k)),
    };
    const full = rect.originX === 0 && rect.originY === 0 && rect.width >= img.width - 2 && rect.height >= img.height - 2;
    const out = full ? src : await ui.busy('Recadrage…', () => cropImage(src, rect));
    if (!out) return;
    if (out !== original) await replacePage(doc!.id, index, out);
    router.back();
  }

  function reset() {
    setSrc(original);
    if (disp) setBox({ x: 0, y: 0, w: disp.w, h: disp.h });
  }

  const corner = (c: Corner, style: object) => (
    <View {...handles[c].panHandlers} hitSlop={20} style={[s.handle, style]}>
      <View style={s.handleDot} />
    </View>
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.top}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Text style={s.link}>Annuler</Text>
        </Pressable>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Recadrer</Text>
        <Pressable hitSlop={12} onPress={apply}>
          <Text style={[s.link, { color: ACCENT, fontWeight: '800' }]}>OK</Text>
        </Pressable>
      </View>

      <View style={s.stage} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width - 48, h: e.nativeEvent.layout.height - 48 })}>
        {src && disp && (
          <View style={{ width: disp.w, height: disp.h }}>
            <Image source={{ uri: src }} style={{ width: disp.w, height: disp.h }} />
            {/* Dim outside the crop box */}
            <View pointerEvents="none" style={[s.dim, { left: 0, top: 0, right: 0, height: box.y }]} />
            <View pointerEvents="none" style={[s.dim, { left: 0, top: box.y + box.h, right: 0, bottom: 0 }]} />
            <View pointerEvents="none" style={[s.dim, { left: 0, top: box.y, width: box.x, height: box.h }]} />
            <View pointerEvents="none" style={[s.dim, { left: box.x + box.w, top: box.y, right: 0, height: box.h }]} />
            <View pointerEvents="none" style={[s.frame, { left: box.x, top: box.y, width: box.w, height: box.h }]} />
            {corner('tl', { left: box.x - 16, top: box.y - 16 })}
            {corner('tr', { left: box.x + box.w - 16, top: box.y - 16 })}
            {corner('bl', { left: box.x - 16, top: box.y + box.h - 16 })}
            {corner('br', { left: box.x + box.w - 16, top: box.y + box.h - 16 })}
          </View>
        )}
      </View>

      <View style={[s.tools, { paddingBottom: insets.bottom + 14 }]}>
        <Tool icon="refresh-outline" label="Gauche" flip onPress={() => rotate(-90)} />
        <Tool icon="scan-outline" label="Tout" onPress={() => disp && setBox({ x: 0, y: 0, w: disp.w, h: disp.h })} />
        <Tool icon="arrow-undo-outline" label="Annuler tout" onPress={reset} />
        <Tool icon="refresh-outline" label="Droite" onPress={() => rotate(90)} />
      </View>
    </View>
  );
}

function Tool({ icon, label, onPress, flip }: { icon: IconName; label: string; onPress: () => void; flip?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.tool, { opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name={icon} size={24} color="#fff" style={flip ? { transform: [{ scaleX: -1 }] } : undefined} />
      <Text style={{ color: '#fff', fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12 },
  link: { color: '#fff', fontSize: 16 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)' },
  frame: { position: 'absolute', borderWidth: 2, borderColor: ACCENT },
  handle: { position: 'absolute', width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  handleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', borderWidth: 3, borderColor: ACCENT },
  tools: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 14 },
  tool: { alignItems: 'center', gap: 6, paddingHorizontal: 8 },
});
