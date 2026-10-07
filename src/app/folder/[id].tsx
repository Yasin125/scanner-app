import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DocList } from '../../components/DocList';
import { useCapture } from '../../lib/flows';
import { useDocs, useFolders } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const cap = useCapture();
  const insets = useSafeAreaInsets();
  const folder = useFolders().find((f) => f.id === id);
  const docs = useDocs().filter((d) => d.folderId === id);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen options={{ title: folder?.name ?? 'Dossier' }} />
      <DocList docs={docs} title="Documents" bottomSpace={100} />
      <View style={[s.bar, { paddingBottom: insets.bottom + 12, backgroundColor: t.bg }]}>
        <Pressable onPress={() => cap.importImages(id)} style={[s.btn, { backgroundColor: t.card }]}>
          <Ionicons name="images-outline" size={20} color={t.txt} />
          <Text style={{ color: t.txt, fontWeight: '600' }}>Importer</Text>
        </Pressable>
        <Pressable onPress={() => cap.scan(id)} style={[s.btn, { backgroundColor: t.primary, flex: 1.6 }]}>
          <Ionicons name="camera" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700' }}>Scanner ici</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
});
