import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { type BarcodeScanningResult, CameraView, type FlashMode, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Linking, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type IconName, useUI } from '../components/ui';
import { isExpoGo, pickImages, recognizeText, scanPages } from '../lib/actions';
import { cropToRatio, exportWord, imageSize, splitHalves } from '../lib/edit';
import { createDoc, defaultTitle, setOcrText } from '../lib/store';

export type CamMode = 'timestamp' | 'ocr' | 'id' | 'sign' | 'scan' | 'word' | 'book' | 'board' | 'idphoto' | 'qr';

const MODES: { key: CamMode; label: string; hint?: string }[] = [
  { key: 'timestamp', label: 'Horodatage', hint: 'La date et l’heure sont ajoutées sur chaque photo.' },
  { key: 'ocr', label: 'Texte', hint: 'Le texte est extrait automatiquement après la prise.' },
  { key: 'id', label: "Pièces d'identité", hint: 'Vos pièces restent uniquement sur votre téléphone.' },
  { key: 'sign', label: 'Signer', hint: 'Scannez, puis placez votre signature.' },
  { key: 'scan', label: 'Scan' },
  { key: 'word', label: 'Vers Word', hint: 'La photo devient un document Word modifiable.' },
  { key: 'book', label: 'Livre', hint: 'Livre ouvert à plat : les deux pages sont séparées.' },
  { key: 'board', label: 'Tableau blanc' },
  { key: 'idphoto', label: "Photo d'identité", hint: 'Format 35 × 45 mm, visage dans l’ovale.' },
  { key: 'qr', label: 'QR code', hint: 'Visez un QR code ou un code-barres.' },
];

type IdType = { key: string; label: string; sides: 1 | 2; ratio: number };
const ID_TYPES: IdType[] = [
  { key: 'cni', label: "Carte d'identité", sides: 2, ratio: 85.6 / 54 },
  { key: 'permis', label: 'Permis de conduire', sides: 2, ratio: 85.6 / 54 },
  { key: 'passeport', label: 'Passeport', sides: 1, ratio: 125 / 88 },
  { key: 'sejour', label: 'Titre de séjour', sides: 2, ratio: 85.6 / 54 },
  { key: 'bancaire', label: 'Carte bancaire', sides: 2, ratio: 85.6 / 54 },
  { key: 'general', label: 'Général', sides: 1, ratio: 1 / 1.414 },
  { key: 'certificat', label: 'Certificat', sides: 1, ratio: 1 / 1.414 },
];

const FLASH: { mode: FlashMode; icon: IconName }[] = [
  { mode: 'off', icon: 'flash-off-outline' },
  { mode: 'auto', icon: 'flash-outline' },
  { mode: 'on', icon: 'flash' },
];

const ACCENT = '#5B82FF';

type Shot = { uri: string; ts: number; w?: number; h?: number };

function stampText(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function CameraScreen() {
  const params = useLocalSearchParams<{ mode?: CamMode; folderId?: string }>();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const ui = useUI();
  const cam = useRef<CameraView>(null);
  const modeScroll = useRef<ScrollView>(null);
  const modeX = useRef<Record<string, { x: number; w: number }>>({});
  const lastCode = useRef({ data: '', at: 0 });
  const [perm, requestPerm] = useCameraPermissions();
  const [mode, setMode] = useState<CamMode>(params.mode ?? 'scan');
  const [idType, setIdType] = useState<IdType>(ID_TYPES[0]);
  const [batch, setBatch] = useState(true);
  const [flash, setFlash] = useState(0);
  const [front, setFront] = useState(false);
  const [hd, setHd] = useState(true);
  const [grid, setGrid] = useState(false);
  const [shots, setShots] = useState<Shot[]>([]);
  const [taking, setTaking] = useState(false);
  const blink = useRef(new Animated.Value(0)).current;

  const conf = MODES.find((m) => m.key === mode)!;
  const fixedCount = mode === 'id' ? idType.sides : mode === 'idphoto' ? 1 : 0;
  const single = fixedCount === 0 && !batch;
  const showToggle = !['id', 'idphoto', 'qr'].includes(mode);

  function selectMode(m: CamMode) {
    if (shots.length) return ui.toast('Terminez ou abandonnez les photos en cours pour changer de mode');
    setMode(m);
    setFront(false);
    const pos = modeX.current[m];
    if (pos) modeScroll.current?.scrollTo({ x: Math.max(0, pos.x + pos.w / 2 - screenW / 2), animated: true });
  }

  async function prepare(list: Shot[]) {
    const out: string[] = [];
    for (const shot of list) {
      if (mode === 'book') out.push(...(await splitHalves(shot.uri)));
      else if (mode === 'idphoto') out.push(await cropToRatio(shot.uri, 35 / 45));
      else if (mode === 'timestamp') {
        const size = shot.w && shot.h ? { width: shot.w, height: shot.h } : await imageSize(shot.uri);
        out.push(
          await ui.snapshot(shot.uri, size.width, size.height, (W) => (
            <Text style={[s.stamp, { right: W * 0.03, bottom: W * 0.03, fontSize: W * 0.042 }]}>{stampText(shot.ts)}</Text>
          )),
        );
      } else out.push(shot.uri);
    }
    return out;
  }

  function titleFor() {
    switch (mode) {
      case 'id':
        return idType.label;
      case 'idphoto':
        return "Photo d'identité";
      case 'ocr':
        return defaultTitle('Texte');
      case 'word':
        return defaultTitle('Word');
      case 'book':
        return defaultTitle('Livre');
      case 'board':
        return defaultTitle('Tableau');
      case 'timestamp':
        return defaultTitle('Horodatage');
      default:
        return undefined;
    }
  }

  async function finish(list: Shot[]) {
    if (!list.length) return router.back();
    const doc = await ui.busy('Enregistrement…', async () => createDoc(await prepare(list), titleFor(), params.folderId));
    if (!doc) return;
    if (mode === 'sign') return router.replace({ pathname: '/signer/[id]', params: { id: doc.id, index: '0' } });
    if (mode !== 'ocr' && mode !== 'word') return router.replace(`/doc/${doc.id}`);
    const text = await ui.busy('Reconnaissance du texte…', async () => {
      const t = await recognizeText(doc);
      await setOcrText(doc.id, t);
      return t;
    });
    if (mode === 'ocr') return router.replace(text !== undefined ? `/ocr/${doc.id}` : `/doc/${doc.id}`);
    router.replace(`/doc/${doc.id}`);
    if (text !== undefined) await ui.busy('Conversion en Word…', () => exportWord({ ...doc, ocrText: text }));
  }

  function added(next: Shot[]) {
    setShots(next);
    if (single || (fixedCount && next.length >= fixedCount)) finish(next);
    else if (mode === 'id' && next.length === 1) ui.toast('Recto enregistré — retournez la pièce pour le verso');
  }

  async function shoot() {
    if (!cam.current || taking) return;
    setTaking(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    blink.setValue(1);
    Animated.timing(blink, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    try {
      const pic = await cam.current.takePictureAsync({ quality: hd ? 0.95 : 0.6, shutterSound: false });
      if (pic?.uri) added([...shots, { uri: pic.uri, ts: Date.now(), w: pic.width, h: pic.height }]);
    } catch (e) {
      ui.toast(e instanceof Error ? e.message : String(e));
    } finally {
      setTaking(false);
    }
  }

  async function fromGallery() {
    const imgs = await pickImages();
    if (imgs.length) added([...shots, ...imgs.map((uri) => ({ uri, ts: Date.now() }))]);
  }

  /** Native scanner with automatic edge detection and perspective correction (not in Expo Go). */
  async function autoScan() {
    try {
      const imgs = await scanPages({ max: fixedCount ? fixedCount - shots.length : undefined });
      if (imgs.length) added([...shots, ...imgs.map((uri) => ({ uri, ts: Date.now() }))]);
    } catch (e) {
      ui.toast(e instanceof Error ? e.message : String(e));
    }
  }

  function onCode(r: BarcodeScanningResult) {
    const now = Date.now();
    if (r.data === lastCode.current.data && now - lastCode.current.at < 4000) return;
    lastCode.current = { data: r.data, at: now };
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const isUrl = /^https?:\/\//i.test(r.data);
    ui.sheet({
      title: r.data,
      options: [
        ...(isUrl ? [{ label: 'Ouvrir le lien', icon: 'open-outline' as const, onPress: () => Linking.openURL(r.data) }] : []),
        {
          label: 'Copier',
          icon: 'copy-outline',
          onPress: async () => {
            await Clipboard.setStringAsync(r.data);
            ui.toast('Copié');
          },
        },
        { label: 'Partager', icon: 'share-outline', onPress: () => Share.share({ message: r.data }) },
      ],
    });
  }

  function close() {
    if (!shots.length) return router.back();
    ui.sheet({
      title: `${shots.length} photo${shots.length > 1 ? 's' : ''} non enregistrée${shots.length > 1 ? 's' : ''}`,
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
        {mode === 'idphoto' && <TopBtn icon="camera-reverse-outline" onPress={() => setFront(!front)} />}
        {mode !== 'qr' && <TopBtn icon={FLASH[flash].icon} onPress={() => setFlash((flash + 1) % FLASH.length)} />}
        {mode !== 'qr' && (
          <Pressable onPress={() => setHd(!hd)} hitSlop={8} style={[s.hd, { borderColor: hd ? '#fff' : '#777' }]}>
            <Text style={{ color: hd ? '#fff' : '#777', fontWeight: '900', fontSize: 11 }}>HD</Text>
          </Pressable>
        )}
        <TopBtn icon={grid ? 'grid' : 'grid-outline'} onPress={() => setGrid(!grid)} />
        {!isExpoGo && !['qr', 'idphoto', 'book'].includes(mode) && (
          <Pressable onPress={autoScan} style={s.auto}>
            <Ionicons name="scan" size={15} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>AUTO</Text>
          </Pressable>
        )}
      </View>

      {/* Preview */}
      <View style={s.preview}>
        <CameraView
          ref={cam}
          style={StyleSheet.absoluteFill}
          facing={front ? 'front' : 'back'}
          flash={FLASH[flash].mode}
          animateShutter={false}
          barcodeScannerSettings={mode === 'qr' ? { barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'pdf417', 'datamatrix', 'aztec', 'upc_a', 'upc_e'] } : undefined}
          onBarcodeScanned={mode === 'qr' ? onCode : undefined}
        />
        {grid && <Grid />}
        <Guide mode={mode} idType={idType} side={shots.length} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: blink }]} />

        <View style={s.previewBottom} pointerEvents="box-none">
          {conf.hint && <Text style={s.hint}>{conf.hint}</Text>}
          {mode === 'id' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ alignSelf: 'stretch', flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {ID_TYPES.map((it) => {
                const on = it.key === idType.key;
                return (
                  <Pressable key={it.key} onPress={() => !shots.length && setIdType(it)} style={[s.chip, on && s.chipOn]}>
                    <Text style={{ color: on ? '#000' : '#fff', fontWeight: '600', fontSize: 13 }}>{it.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          {showToggle && (
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
      </View>

      {/* Modes */}
      <ScrollView ref={modeScroll} horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={s.modes}>
        {MODES.map((m) => {
          const on = m.key === mode;
          return (
            <Pressable
              key={m.key}
              onLayout={(e) => {
                const pos = { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width };
                modeX.current[m.key] = pos;
                // Center the initial mode once it is measured.
                if (m.key === mode) modeScroll.current?.scrollTo({ x: Math.max(0, pos.x + pos.w / 2 - screenW / 2), animated: false });
              }}
              onPress={() => selectMode(m.key)}
              hitSlop={6}
              style={s.mode}
            >
              <View style={[s.modeBar, { backgroundColor: on ? ACCENT : 'transparent' }]} />
              <Text style={{ color: on ? ACCENT : '#fff', fontSize: 15, fontWeight: on ? '700' : '500' }}>{m.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Bottom controls */}
      <View style={[s.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable onPress={fromGallery} style={s.side} hitSlop={10} disabled={mode === 'qr'}>
          {mode !== 'qr' && (
            <>
              <Ionicons name="images-outline" size={28} color="#fff" />
              <Text style={s.sideTxt}>Importer</Text>
            </>
          )}
        </Pressable>

        {mode === 'qr' ? (
          <View style={[s.shutter, { borderColor: '#444' }]}>
            <Ionicons name="qr-code-outline" size={34} color="#fff" />
          </View>
        ) : (
          <Pressable onPress={shoot} disabled={taking} style={({ pressed }) => [s.shutter, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
            <View style={s.shutterInner} />
          </Pressable>
        )}

        <View style={s.side}>
          {last ? (
            <Pressable onPress={() => finish(shots)} style={s.thumbWrap}>
              <Image source={{ uri: last.uri }} style={s.thumb} contentFit="cover" />
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

function Corners({ ratio, width = '82%' }: { ratio: number; width?: `${number}%` }) {
  const c = (pos: object, rot: string) => <View style={[s.corner, pos, { transform: [{ rotate: rot }] }]} />;
  return (
    <View style={{ width, aspectRatio: ratio, maxHeight: '78%' }}>
      {c({ left: 0, top: 0 }, '0deg')}
      {c({ right: 0, top: 0 }, '90deg')}
      {c({ right: 0, bottom: 0 }, '180deg')}
      {c({ left: 0, bottom: 0 }, '270deg')}
    </View>
  );
}

/** Framing guide for the current mode. */
function Guide({ mode, idType, side }: { mode: CamMode; idType: IdType; side: number }) {
  let inner: React.ReactNode;
  if (mode === 'id') {
    inner = (
      <>
        <View style={[s.idFrame, { aspectRatio: idType.ratio, width: idType.ratio < 1 ? '70%' : '86%' }]} />
        {idType.sides === 2 && <Text style={s.idTxt}>{side === 0 ? 'Recto' : 'Verso'}</Text>}
      </>
    );
  } else if (mode === 'idphoto') {
    inner = (
      <View style={[s.idFrame, { width: '62%', aspectRatio: 35 / 45, alignItems: 'center', justifyContent: 'center' }]}>
        <View style={s.oval} />
      </View>
    );
  } else if (mode === 'qr') {
    inner = <Corners ratio={1} width="64%" />;
  } else if (mode === 'book') {
    inner = (
      <View style={{ width: '92%', aspectRatio: 1.414 }}>
        <Corners ratio={1.414} width="100%" />
        <View style={s.spine} />
      </View>
    );
  } else if (mode === 'board') {
    inner = <Corners ratio={1.6} width="92%" />;
  } else {
    inner = <Corners ratio={1 / 1.414} />;
  }
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.center]}>
      {inner}
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
  previewBottom: { position: 'absolute', left: 0, right: 0, bottom: 14, alignItems: 'center', gap: 10 },
  hint: { color: '#fff', fontSize: 13, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, overflow: 'hidden', marginHorizontal: 20 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(60,60,60,0.85)' },
  chipOn: { backgroundColor: '#fff' },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.45)' },
  corner: { position: 'absolute', width: 34, height: 34, borderLeftWidth: 4, borderTopWidth: 4, borderColor: ACCENT, borderTopLeftRadius: 8 },
  idFrame: { borderRadius: 14, borderWidth: 3, borderColor: ACCENT },
  idTxt: { color: '#fff', marginTop: 12, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, overflow: 'hidden' },
  oval: { width: '68%', aspectRatio: 0.78, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)', borderStyle: 'dashed', marginTop: '-8%' },
  spine: { position: 'absolute', left: '50%', top: 8, bottom: 8, borderLeftWidth: 2, borderColor: ACCENT, borderStyle: 'dashed' },
  toggle: { flexDirection: 'row', backgroundColor: 'rgba(30,30,30,0.85)', borderRadius: 22, padding: 4 },
  toggleItem: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18 },
  toggleOn: { backgroundColor: 'rgba(255,255,255,0.22)' },
  modes: { gap: 24, paddingHorizontal: 24, paddingBottom: 4 },
  mode: { alignItems: 'center', gap: 8 },
  modeBar: { width: 28, height: 3, borderRadius: 2 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 34, paddingTop: 16 },
  side: { width: 70, alignItems: 'center', gap: 6 },
  sideTxt: { color: '#fff', fontSize: 11 },
  shutter: { width: 82, height: 82, borderRadius: 41, borderWidth: 5, borderColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
  thumbWrap: { alignItems: 'center', gap: 6 },
  thumb: { width: 48, height: 60, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  badge: { position: 'absolute', top: -8, right: -6, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  stamp: { position: 'absolute', color: '#FFB020', fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4, textShadowOffset: { width: 1, height: 1 } },
  permTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  permTxt: { color: '#bbb', textAlign: 'center', lineHeight: 20 },
  permBtn: { backgroundColor: ACCENT, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
});
