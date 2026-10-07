import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ToolGrid, useTools } from '../../components/Tools';
import { TAB_SPACE, useTheme } from '../../lib/theme';

export default function Outils() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const x = useTools();

  const sections = [
    { title: 'Scanner', tools: [x.id, x.ocr, x.idPhoto, x.board, x.book, x.scan] },
    { title: 'Importer', tools: [x.images, x.files] },
    { title: 'Convertir', tools: [x.toPdf, x.toWord, x.toExcel] },
    { title: 'Modifier', tools: [x.sign, x.watermark, x.merge, x.reorder, x.lock, x.compress] },
    { title: 'Utilitaires', tools: [x.print, x.qr] },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={[s.top, { paddingTop: insets.top + 12 }]}>
        <Text style={[s.title, { color: t.txt }]}>Outils</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + TAB_SPACE }}>
        {sections.map((sec) => (
          <View key={sec.title} style={s.section}>
            <Text style={[s.secTitle, { color: t.txt }]}>{sec.title}</Text>
            <ToolGrid tools={sec.tools} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingBottom: 6 },
  title: { fontSize: 28, fontWeight: '800' },
  section: { paddingHorizontal: 8, paddingTop: 18, paddingBottom: 10 },
  secTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, marginLeft: 12 },
});
