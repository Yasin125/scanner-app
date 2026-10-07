import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../lib/theme';

export type IconName = keyof typeof Ionicons.glyphMap;

type BtnProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  icon?: IconName;
  style?: ViewStyle;
  disabled?: boolean;
};

export function Button({ label, onPress, variant = 'primary', icon, style, disabled }: BtnProps) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.primary : variant === 'danger' ? t.danger : t.card2;
  const fg = variant === 'ghost' ? t.txt : t.onPrimary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }, style]}
    >
      {icon && <Ionicons name={icon} size={18} color={fg} />}
      <Text style={[s.btnTxt, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export type SheetOption = { label: string; icon?: IconName; destructive?: boolean; onPress: () => void };
type SheetReq = { title?: string; options: SheetOption[] };
type PromptReq = { title: string; initial: string; placeholder?: string; resolve: (v: string | null) => void };

type UI = {
  /** Runs `fn` with a blocking spinner and shows an alert-like sheet on error. */
  busy: <T>(label: string, fn: () => Promise<T>) => Promise<T | undefined>;
  prompt: (title: string, initial?: string, placeholder?: string) => Promise<string | null>;
  sheet: (req: SheetReq) => void;
  toast: (msg: string) => void;
  /**
   * Renders `overlay(layoutWidth, layoutHeight)` on top of the image off screen and returns a new JPEG
   * of `width` × `height` px (used for timestamps and signatures).
   */
  snapshot: (uri: string, width: number, height: number, overlay: (w: number, h: number) => ReactNode) => Promise<string>;
};

type SnapJob = {
  uri: string;
  width: number;
  height: number;
  overlay: (w: number, h: number) => ReactNode;
  resolve: (uri: string) => void;
  reject: (e: unknown) => void;
};

const SNAP_W = 600;

const Ctx = createContext<UI | null>(null);

export function useUI() {
  const ui = useContext(Ctx);
  if (!ui) throw new Error('useUI outside UIProvider');
  return ui;
}

export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [sheetReq, setSheetReq] = useState<SheetReq | null>(null);
  const [promptReq, setPromptReq] = useState<PromptReq | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snap, setSnap] = useState<SnapJob | null>(null);
  const snapQueue = useRef<Promise<unknown>>(Promise.resolve());

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3200);
  }, []);

  const ui = useMemo<UI>(
    () => ({
      async busy(label, fn) {
        setBusyLabel(label);
        try {
          return await fn();
        } catch (e) {
          toast(errorMessage(e));
          return undefined;
        } finally {
          setBusyLabel(null);
        }
      },
      prompt: (title, initial = '', placeholder) =>
        new Promise((resolve) => setPromptReq({ title, initial, placeholder, resolve })),
      sheet: setSheetReq,
      toast,
      snapshot(uri, width, height, overlay) {
        // One capture at a time: the off-screen host renders a single job.
        const run = () => new Promise<string>((resolve, reject) => setSnap({ uri, width, height, overlay, resolve, reject }));
        const p = snapQueue.current.then(run, run);
        snapQueue.current = p.catch(() => {});
        return p;
      },
    }),
    [toast],
  );

  return (
    <Ctx.Provider value={ui}>
      {children}
      <Sheet req={sheetReq} onClose={() => setSheetReq(null)} />
      <Prompt
        req={promptReq}
        onDone={(v) => {
          promptReq?.resolve(v);
          setPromptReq(null);
        }}
      />
      {snap && <SnapHost job={snap} onDone={() => setSnap(null)} />}
      {toastMsg && <Toast msg={toastMsg} />}
      {busyLabel && <Busy label={busyLabel} />}
    </Ctx.Provider>
  );
}

function SnapHost({ job, onDone }: { job: SnapJob; onDone: () => void }) {
  const ref = useRef<View>(null);
  const w = SNAP_W;
  const h = Math.round((SNAP_W * job.height) / job.width);
  async function capture() {
    try {
      const uri = await captureRef(ref, { format: 'jpg', quality: 0.92, width: job.width, height: job.height, result: 'tmpfile' });
      job.resolve(uri);
    } catch (e) {
      job.reject(e);
    } finally {
      onDone();
    }
  }
  return (
    <View ref={ref} collapsable={false} pointerEvents="none" style={{ position: 'absolute', left: -w - 100, top: 0, width: w, height: h, backgroundColor: '#fff' }}>
      <Image source={{ uri: job.uri }} style={{ width: w, height: h }} onLoad={() => setTimeout(capture, 60)} onError={() => (job.reject(new Error('Image illisible')), onDone())} />
      <View style={StyleSheet.absoluteFill}>{job.overlay(w, h)}</View>
    </View>
  );
}

function Busy({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View style={s.overlay}>
      <View style={[s.busyBox, { backgroundColor: t.card }]}>
        <ActivityIndicator color={t.primary} size="large" />
        <Text style={{ color: t.txt, marginTop: 12, fontWeight: '600' }}>{label}</Text>
      </View>
    </View>
  );
}

function Toast({ msg }: { msg: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={[s.toast, { top: insets.top + 10 }]}>
      <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>{msg}</Text>
    </View>
  );
}

function Sheet({ req, onClose }: { req: SheetReq | null; onClose: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!req} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.sheetBackdrop} onPress={onClose} />
      <View style={[s.sheet, { backgroundColor: t.card, paddingBottom: insets.bottom + 12 }]}>
        <View style={[s.grabber, { backgroundColor: t.line }]} />
        {req?.title ? (
          <Text style={[s.sheetTitle, { color: t.mut }]} numberOfLines={1}>
            {req.title}
          </Text>
        ) : null}
        <ScrollView style={{ maxHeight: 460 }}>
          {req?.options.map((o) => (
            <Pressable
              key={o.label}
              onPress={() => {
                onClose();
                // Let the sheet close before opening another modal.
                setTimeout(o.onPress, 250);
              }}
              style={({ pressed }) => [s.sheetRow, { backgroundColor: pressed ? t.card2 : 'transparent' }]}
            >
              {o.icon && <Ionicons name={o.icon} size={22} color={o.destructive ? t.danger : t.txt} />}
              <Text style={{ color: o.destructive ? t.danger : t.txt, fontSize: 16, fontWeight: '500' }}>{o.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Button label="Annuler" variant="ghost" onPress={onClose} style={{ marginHorizontal: 16, marginTop: 8 }} />
      </View>
    </Modal>
  );
}

function Prompt({ req, onDone }: { req: PromptReq | null; onDone: (v: string | null) => void }) {
  const t = useTheme();
  const [value, setValue] = useState('');
  useEffect(() => {
    if (req) setValue(req.initial);
  }, [req]);
  return (
    <Modal visible={!!req} transparent animationType="fade" onRequestClose={() => onDone(null)} statusBarTranslucent>
      <View style={s.overlay}>
        <View style={[s.prompt, { backgroundColor: t.card }]}>
          <Text style={[s.promptTitle, { color: t.txt }]}>{req?.title}</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            autoFocus
            selectTextOnFocus
            placeholder={req?.placeholder}
            placeholderTextColor={t.mut}
            onSubmitEditing={() => onDone(value)}
            style={[s.input, { color: t.txt, borderColor: t.line, backgroundColor: t.bg }]}
          />
          <View style={s.row}>
            <Button label="Annuler" variant="ghost" onPress={() => onDone(null)} style={{ flex: 1 }} />
            <Button label="Valider" onPress={() => onDone(value)} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  btn: { flexDirection: 'row', gap: 8, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontSize: 15, fontWeight: '600' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  busyBox: { padding: 28, borderRadius: 18, alignItems: 'center', minWidth: 200 },
  toast: { position: 'absolute', left: 20, right: 20, backgroundColor: 'rgba(20,20,24,0.95)', borderRadius: 12, padding: 14 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 8, width: '100%', maxWidth: 640, alignSelf: 'center' },
  grabber: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 13, fontWeight: '600', paddingHorizontal: 20, paddingVertical: 8 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 15 },
  prompt: { width: '100%', maxWidth: 420, borderRadius: 18, padding: 20, gap: 14 },
  promptTitle: { fontSize: 17, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16 },
  row: { flexDirection: 'row', gap: 10 },
});
