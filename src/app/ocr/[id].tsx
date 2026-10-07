import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, useUI } from '../../components/ui';
import { recognizeText } from '../../lib/actions';
import { setOcrText, useDoc } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function OcrScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const doc = useDoc(id);
  const t = useTheme();
  const ui = useUI();
  const insets = useSafeAreaInsets();

  if (!doc) return null;
  const d = doc;
  const text = d.ocrText ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 110 }}>
        <View style={[s.box, { backgroundColor: t.card }]}>
          <Text selectable style={{ color: text ? t.txt : t.mut, fontSize: 15, lineHeight: 23 }}>
            {text || 'Aucun texte détecté.'}
          </Text>
        </View>
        <Text style={{ color: t.mut, fontSize: 12, marginTop: 10 }}>Astuce : appuyez longuement sur le texte pour le sélectionner et le copier.</Text>
      </ScrollView>
      <View style={[s.bar, { paddingBottom: insets.bottom + 12, backgroundColor: t.bg }]}>
        <Button
          label="Relancer"
          icon="refresh"
          variant="ghost"
          style={{ flex: 1 }}
          onPress={() => ui.busy('Reconnaissance du texte…', async () => setOcrText(d.id, await recognizeText(d)))}
        />
        <Button label="Partager" icon="share-outline" disabled={!text} style={{ flex: 1.6 }} onPress={() => Share.share({ message: text, title: d.title })} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: { borderRadius: 14, padding: 16 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10 },
});
