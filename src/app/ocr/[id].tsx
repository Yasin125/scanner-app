import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Busy, Button } from '../../components/ui';
import { recognizeText } from '../../lib/actions';
import { setOcrText, useDoc } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function OcrScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const doc = useDoc(id);
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<string | null>(null);

  if (!doc) return null;
  const text = doc.ocrText ?? '';

  async function rerun() {
    setBusy('Reconnaissance du texte…');
    try {
      await setOcrText(doc!.id, await recognizeText(doc!));
    } catch (e) {
      Alert.alert('Erreur', String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View style={[s.box, { backgroundColor: t.card, borderColor: t.line }]}>
          <Text selectable style={{ color: text ? t.txt : t.mut, fontSize: 15, lineHeight: 22 }}>
            {text || 'Aucun texte détecté.'}
          </Text>
        </View>
        <Text style={{ color: t.mut, fontSize: 12, marginTop: 10 }}>
          Astuce : appuyez longuement sur le texte pour le sélectionner et le copier.
        </Text>
      </ScrollView>
      <View style={[s.bar, { paddingBottom: insets.bottom + 12, backgroundColor: t.card, borderColor: t.line }]}>
        <Button label="Relancer" variant="ghost" onPress={rerun} style={{ flex: 1 }} />
        <Button label="Partager le texte" disabled={!text} onPress={() => Share.share({ message: text, title: doc.title })} style={{ flex: 2 }} />
      </View>
      <Busy label={busy} />
    </View>
  );
}

const s = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 14, padding: 14 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
