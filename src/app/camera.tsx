import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, type FlashMode, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type IconName, useUI } from '../components/ui';
import { isExpoGo, pickImages, recognizeText, scanPages } from '../lib/actions';
import { createDoc, defaultTitle, setOcrText } from '../lib/store';

type Mode = 'ocr' | 'id' | 'scan' | 'board';

const MODES: { key: Mode; label: string }[] = [
  { key: 'ocr', label: 'Texte' },
  { key: 'id', label: "Carte d'identité" },
  { key: 'scan', label: 'Scan' },
  { key: 'board', label: 'Tableau blanc' },
];

const FLASH: { mode: FlashMode; icon: IconName }[] = [
  { mode: 'off', icon: 'flash-off-outline' },
  { mode: 'auto', icon: 'flash-outline' },
  { mode: 'on', icon: 'flash' },
];

const ACCENT = '#5B82FF';

export default function CameraScreen() {
  const params = useLocalSearchParams<{ mode?: Mode; folderId?: string }>();
  const insets = useSafeAreaInsets();
  const ui = useUI();
  const cam = useRef<CameraView>(null);
  const [perm, requestPerm] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>(params.mode ?? 'scan');
  const [batch, setBatch] = useState(true);
  const [flash, setFlash] = useState(0);
  const [hd, setHd] = useState(true);
  const [grid, setGrid] = useState(false);
  const [shots, setShots] = useState<string[]>([]);
  const [taking, setTaking] = useState(false);
  const blink = useRef(new Animated.Value(0)).current;

  const isId = mode === 'id';
  const single = !isId && !batch;

  async function finish(pages: string[]) {
    if (!pages.length) return router.back();
    const title = mode === 'id' ? "Carte d'identité" : mode === 'ocr' ? defaultTitle('Texte') : mode === 'board' ? defaultTitle('Tableau') : undefined;
    const doc = await ui.busy('Enregistrement…', () => createDoc(pages, title, params.folderId));
    if (!doc) return;
    if (mode !== 'ocr') return router.replace(`/doc/${doc.id}`);
    const ok = await ui.busy('Reconnaissance du texte…', async () => {
      await setOcrText(doc.id, await recognizeText(doc));
      return true;
    });
    router.replace(ok ? `/ocr/${doc.id}` : `/doc/${doc.id}`);
  }

  function added(next: string[]) {
    setShots(next);
    if (single || (isId && next.length >= 2)) finish(next);
    else if (isId) ui.toast('Recto enregistré — retournez la carte pour le verso');
  }

  async function shoot() {
    if (!cam.current || taking) return;
    setTaking(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    blink.setValue(1);
    Animated.timing(blink, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    try {
      const pic = await cam.current.takePictureAsync({ quality: hd ? 0.95 : 0.6, shutterSound: false });
      if (pic?.uri) added([...shots, pic.uri]);
    } catch (e) {
      ui.toast(e instanceof Error ? e.message : String(e));
    } finally {
      setTaking(false);
    }
  }

  async function fromGallery() {
    const imgs = await pickImages();
    if (imgs.length) added([...shots, ...imgs]);
  }

  /** Native scanner with automatic edge detection and perspective correction (not in Expo Go). */
  async function autoScan() {
    try {
      const imgs = await scanPages({ max: isId ? 2 - shots.length : undefined });
      if (imgs.length) added([...shots, ...imgs]);
    } catch (e) {
      ui.toast(e instanceof Error ? e.message : String(e));
    }
  }

  function close() {
    if (!shots.length) return router.back();
    ui.sheet({
      title: `Abandonner ${shots.length} page${shots.length > 1 ? 's' : ''} ?`,
      options: [
        { label: 'Enregistrer et quitter', icon: 'checkmark-circle-outline', onPress: () => finish(shots) },
        { label: 'Abandonner', icon: 'trash-outline', destructive: true, onPress: () => router.back() },
      ],
    });
  }

  if (!perm) return <View style={s.root} />;
  if (!perm.granted) {
    return (
      <View style={[s.root, s.center, { padding: 32, gap: 16 }]}>
        <Ionicons name="camera-outline" size={56} color="#fff" />
        <Text style={s.permTitle}>Accès à l’appareil photo</Text>
        <Text style={s.permTxt}>ScanFacile a besoin de la caméra pour numériser vos documents.</Text>
        <Pressable onPress={requestPerm} style={s.permBtn}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Autoriser</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: '#aaa' }}>Annuler</Text>
        </Pressable>
      </View>
    );
  }

  const last = shots[shots.length - 1];

  return (
    <View style={s.root}>
      {/* Top bar */}
      <View style={[s.top, { paddingTop: insets.top + 6 }]}>
        <TopBtn icon="close" onPress={close} />
        <View style={{ flex: 1 }} />
        <TopBtn icon={FLASH[flash].icon} onPress={() => setFlash((flash + 1) % FLASH.length)} />
        <Pressable onPress={() => setHd(!hd)} hitSlop={8} style={[s.hd, { borderColor: hd ? '#fff' : '#777' }]}>
          <Text style={{ color: hd ? '#fff' : '#777', fontWeight: '900', fontSize: 11 }}>HD</Text>
        </Pressable>
        <TopBtn icon={grid ? 'grid' : 'grid-outline'} onPress={() => setGrid(!grid)} />
        {!isExpoGo && (
          <Pressable onPress={autoScan} style={s.auto}>
            <Ionicons name="scan" size={15} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>AUTO</Text>
          </Pressable>
        )}
      </View>

      {/* Preview */}
      <View style={s.preview}>
        <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="back" flash={FLASH[flash].mode} animateShutter={false} />
        {grid && <Grid />}
        {isId ? <IdGuide side={shots.length === 0 ? 'Recto' : 'Verso'} /> : <DocGuide />}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: blink }]} />
        {!isId && (
          <View style={s.toggle}>
            {(['Unique', 'Lot'] as const).map((l, i) => {
              const on = i === 0 ? !batch : batch;
              return (
                <Pressable key={l} onPress={() => setBatch(i === 1)} style={[s.toggleItem, on && s.toggleOn]}>
                  <Text style={{ color: '#fff', fontWeight: on ? '700' : '500', fontSize: 14 }}>{l}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Modes */}
      <View style={s.modes}>
        {MODES.map((m) => {
          const on = m.key === mode;
          return (
            <Pressable key={m.key} onPress={() => !shots.length && setMode(m.key)} hitSlop={6} style={s.mode}>
              <Text style={{ color: on ? ACCENT : shots.length ? '#666' : '#fff', fontSize: 15, fontWeight: on ? '700' : '500' }}>{m.label}</Text>
              <View style={[s.modeDot, { backgroundColor: on ? ACCENT : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>

      {/* Bottom controls */}
      <View style={[s.bottom, { paddingBottom: insets.bottom + 18 }]}>
        <Pressable onPress={fromGallery} style={s.side} hitSlop={10}>
          <Ionicons name="images-outline" size={28} color="#fff" />
          <Text style={s.sideTxt}>Importer</Text>
        </Pressable>

        <Pressable onPress={shoot} disabled={taking} style={({ pressed }) => [s.shutter, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
          <View style={s.shutterInner} />
        </Pressable>

        <View style={s.side}>
          {last ? (
            <Pressable onPress={() => finish(shots)} style={s.thumbWrap}>
              <Image source={{ uri: last }} style={s.thumb} contentFit="cover" />
              <View style={s.badge}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{shots.length}</Text>
              </View>
              <Text style={[s.sideTxt, { color: ACCENT, fontWeight: '700' }]}>Terminer</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function TopBtn({ icon, onPress }: { icon: IconName; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={s.topBtn}>
      <Ionicons name={icon} size={24} color="#fff" />
    </Pressable>
  );
}

function Grid() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {[1, 2].map((i) => (
        <View key={'v' + i} style={[s.gridLine, { left: `${(i * 100) / 3}%`, top: 0, bottom: 0, width: StyleSheet.hairlineWidth }]} />
      ))}
      {[1, 2].map((i) => (
        <View key={'h' + i} style={[s.gridLine, { top: `${(i * 100) / 3}%`, left: 0, right: 0, height: StyleSheet.hairlineWidth }]} />
      ))}
    </View>
  );
}

/** Corner brackets showing where to place a page. */
function DocGuide() {
  const c = (pos: object, rot: string) => <View style={[s.corner, pos, { transform: [{ rotate: rot }] }]} />;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.center]}>
      <View style={{ width: '82%', aspectRatio: 1 / 1.414, maxHeight: '86%' }}>
        {c({ left: 0, top: 0 }, '0deg')}
        {c({ right: 0, top: 0 }, '90deg')}
        {c({ right: 0, bottom: 0 }, '180deg')}
        {c({ left: 0, bottom: 0 }, '270deg')}
      </View>
    </View>
  );
}

/** ID card frame (ISO 7810, 85.6 × 54 mm) with a dimmed surrounding. */
function IdGuide({ side }: { side: string }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.center]}>
      <View style={s.idFrame} />
      <Text style={s.idTxt}>{side} — placez la carte dans le cadre</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 18, paddingBottom: 12 },
  topBtn: { padding: 2 },
  hd: { borderWidth: 2, borderRadius: 5, paddingHorizontal: 4, paddingVertical: 1 },
  auto: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  preview: { flex: 1, overflow: 'hidden', backgroundColor: '#111' },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.45)' },
  corner: { position: 'absolute', width: 34, height: 34, borderLeftWidth: 4, borderTopWidth: 4, borderColor: ACCENT, borderTopLeftRadius: 8 },
  idFrame: {
    width: '86%',
    aspectRatio: 85.6 / 54,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: ACCENT,
  },
  idTxt: { color: '#fff', marginTop: 16, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, overflow: 'hidden' },
  toggle: { position: 'absolute', bottom: 16, alignSelf: 'center', flexDirection: 'row', backgroundColor: 'rgba(30,30,30,0.85)', borderRadius: 22, padding: 4 },
  toggleItem: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18 },
  toggleOn: { backgroundColor: 'rgba(255,255,255,0.22)' },
  modes: { flexDirection: 'row', justifyContent: 'center', gap: 22, paddingTop: 14, paddingBottom: 6 },
  mode: { alignItems: 'center', gap: 5 },
  modeDot: { width: 5, height: 5, borderRadius: 3 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 34, paddingTop: 14 },
  side: { width: 70, alignItems: 'center', gap: 6 },
  sideTxt: { color: '#fff', fontSize: 11 },
  shutter: { width: 82, height: 82, borderRadius: 41, borderWidth: 5, borderColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
  thumbWrap: { alignItems: 'center', gap: 6 },
  thumb: { width: 48, height: 60, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  badge: { position: 'absolute', top: -8, right: -6, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  permTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  permTxt: { color: '#bbb', textAlign: 'center', lineHeight: 20 },
  permBtn: { backgroundColor: ACCENT, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
});
