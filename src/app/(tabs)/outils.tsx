import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ToolGrid, useTools } from '../../components/Tools';
import { TAB_SPACE, useTheme } from '../../lib/theme';

export default function Outils() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const x = useTools();

  const sections = [
    { title: 'Scanner', tools: [x.id, x.ocr, x.idPhoto, x.timestamp, x.book, x.board, x.scan] },
    { title: 'Importer', tools: [x.images, x.files] },
    { title: 'Convertir', tools: [x.toPdf, x.toWord, x.toExcel] },
    { title: 'Modifier', tools: [x.sign, x.watermark, x.crop, x.merge, x.reorder, x.lock, x.compress] },
    { title: 'Utilitaires', tools: [x.print, x.qr] },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: TAB_SPACE }}>
        <Text style={[s.title, { color: t.txt }]}>Outils</Text>
        <Text style={{ color: t.mut, paddingHorizontal: 20, marginTop: 4 }}>Tout ce qu’il faut pour vos documents.</Text>
        {sections.map((sec) => (
          <View key={sec.title} style={s.section}>
            <Text style={[s.secTitle, { color: t.mut }]}>{sec.title}</Text>
            <View style={[s.card, { backgroundColor: t.card, borderColor: t.line }]}>
              <ToolGrid tools={sec.tools} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, paddingHorizontal: 20 },
  section: { paddingHorizontal: 20, paddingTop: 22 },
  secTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 18, paddingHorizontal: 6 },
});
