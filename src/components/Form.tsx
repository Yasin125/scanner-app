import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { useTheme } from '../lib/theme';

type FieldProps = TextInputProps & { label: string; error?: string; secure?: boolean };

export function Field({ label, error, secure, style, ...input }: FieldProps) {
  const t = useTheme();
  const [hidden, setHidden] = useState(true);
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: t.txt, fontWeight: '600', fontSize: 14 }}>{label}</Text>
      <View style={[s.box, { backgroundColor: t.card, borderColor: error ? t.danger : focus ? t.primary : t.line }]}>
        <TextInput
          placeholderTextColor={t.mut}
          secureTextEntry={secure && hidden}
          autoCapitalize={secure ? 'none' : input.autoCapitalize}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={[s.input, { color: t.txt }, style]}
          {...input}
        />
        {secure && (
          <Pressable hitSlop={10} onPress={() => setHidden(!hidden)}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={t.mut} />
          </Pressable>
        )}
      </View>
      {error ? <Text style={{ color: t.danger, fontSize: 12.5 }}>{error}</Text> : null}
    </View>
  );
}

export function PrimaryButton({ label, onPress, loading, disabled, danger }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; danger?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [s.btn, { backgroundColor: danger ? t.danger : t.primary, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{label}</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 16, paddingVertical: 13 },
  btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
