import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';
import { useEffect, useState } from 'react';

import { useTheme } from '../lib/theme';

type BtnProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  style?: ViewStyle;
  disabled?: boolean;
};

export function Button({ label, onPress, variant = 'primary', style, disabled }: BtnProps) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.primary : variant === 'danger' ? t.danger : t.card;
  const fg = variant === 'ghost' ? t.txt : t.onPrimary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, borderColor: variant === 'ghost' ? t.line : bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Text style={[s.btnTxt, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Busy({ label }: { label: string | null }) {
  const t = useTheme();
  if (!label) return null;
  return (
    <View style={s.busy}>
      <View style={[s.busyBox, { backgroundColor: t.card }]}>
        <ActivityIndicator color={t.primary} />
        <Text style={{ color: t.txt, marginTop: 10 }}>{label}</Text>
      </View>
    </View>
  );
}

type PromptProps = {
  visible: boolean;
  title: string;
  initial: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
};

/** Cross-platform text prompt (Alert.prompt is iOS only). */
export function Prompt({ visible, title, initial, onCancel, onSubmit }: PromptProps) {
  const t = useTheme();
  const [value, setValue] = useState(initial);
  useEffect(() => {
    if (visible) setValue(initial);
  }, [visible, initial]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.busy}>
        <View style={[s.prompt, { backgroundColor: t.card }]}>
          <Text style={[s.promptTitle, { color: t.txt }]}>{title}</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            autoFocus
            selectTextOnFocus
            onSubmitEditing={() => onSubmit(value)}
            style={[s.input, { color: t.txt, borderColor: t.line, backgroundColor: t.bg }]}
          />
          <View style={s.row}>
            <Button label="Annuler" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
            <Button label="Enregistrer" onPress={() => onSubmit(value)} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  btn: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  btnTxt: { fontSize: 15, fontWeight: '600' },
  busy: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  busyBox: { padding: 24, borderRadius: 16, alignItems: 'center', minWidth: 180 },
  prompt: { width: '100%', maxWidth: 420, borderRadius: 16, padding: 20, gap: 14 },
  promptTitle: { fontSize: 17, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  row: { flexDirection: 'row', gap: 10 },
});
