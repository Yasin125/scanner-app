import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DocRow } from '../../components/DocRow';
import { ToolGrid, useTools } from '../../components/Tools';
import { isExpoGo } from '../../lib/actions';
import { useCapture, useDocMenu } from '../../lib/flows';
import { useDocs, useLoaded } from '../../lib/store';
import { TAB_SPACE, useTheme } from '../../lib/theme';

const RECENT = 6;

export default function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const docs = useDocs();
  const loaded = useLoaded();
  const tools = useTools();
  const menu = useDocMenu();
  const cap = useCapture();
  const [q, setQ] = useState('');

  const needle = q.trim().toLowerCase();
  const recents = useMemo(() => {
    const sorted = [...docs].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!needle) return sorted.slice(0, RECENT);
    return sorted.filter((d) => d.title.toLowerCase().includes(needle) || d.ocrText?.toLowerCase().includes(needle));
  }, [docs, needle]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={[s.top, { paddingTop: insets.top + 8 }]}>
        <View style={[s.search, { backgroundColor: t.card }]}>
          <Ionicons name="search" size={18} color={t.mut} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Rechercher dans vos documents"
            placeholderTextColor={t.mut}
            style={[s.searchInput, { color: t.txt }]}
            returnKeyType="search"
          />
          {!!q && (
            <Pressable hitSlop={10} onPress={() => setQ('')}>
              <Ionicons name="close-circle" size={18} color={t.mut} />
            </Pressable>
          )}
        </View>
        <Pressable hitSlop={10} onPress={() => router.push('/moi')}>
          <Ionicons name="diamond" size={24} color="#F5B700" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + TAB_SPACE }} keyboardShouldPersistTaps="handled">
        {!needle && (
          <View style={s.tools}>
            <ToolGrid tools={[tools.scan, tools.pdfTools, tools.images, tools.files, tools.id, tools.ocr, tools.merge, tools.all]} />
          </View>
        )}

        {isExpoGo && !needle && (
          <View style={[s.notice, { backgroundColor: t.card }]}>
            <Ionicons name="information-circle" size={18} color={t.primary} />
            <Text style={{ color: t.mut, fontSize: 12, flex: 1 }}>
              Mode aperçu : recadrage automatique et OCR disponibles dans l’application finale.
            </Text>
          </View>
        )}

        <View style={[s.panel, { backgroundColor: t.card }]}>
          <View style={s.panelHead}>
            <Text style={[s.panelTitle, { color: t.txt }]}>{needle ? `Résultats (${recents.length})` : 'Récents'}</Text>
            {!needle && docs.length > 0 && (
              <Pressable hitSlop={10} onPress={() => router.push('/documents')} style={s.viewAll}>
                <Text style={{ color: t.mut, fontSize: 14 }}>Voir tout</Text>
                <Ionicons name="chevron-forward" size={16} color={t.mut} />
              </Pressable>
            )}
          </View>

          {recents.map((d, i) => (
            <View key={d.id}>
              {i > 0 && <View style={[s.divider, { backgroundColor: t.line }]} />}
              <DocRow
                doc={d}
                onMenu={() => menu.open(d)}
                actions={
                  i === 0 && !needle
                    ? [
                        { label: 'Partager', icon: 'share-outline', onPress: () => menu.share(d) },
                        { label: 'Texte', icon: 'text-outline', onPress: () => router.push(d.ocrText !== undefined ? `/ocr/${d.id}` : `/doc/${d.id}`) },
                        { label: 'Voir', icon: 'eye-outline', onPress: () => router.push(`/doc/${d.id}`) },
                      ]
                    : undefined
                }
              />
            </View>
          ))}

          {loaded && recents.length === 0 && (
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: t.primary + '1F' }]}>
                <Ionicons name={needle ? 'search' : 'scan-outline'} size={40} color={t.primary} />
              </View>
              <Text style={[s.emptyTitle, { color: t.txt }]}>{needle ? 'Aucun résultat' : 'Aucun document pour le moment'}</Text>
              <Text style={{ color: t.mut, textAlign: 'center', lineHeight: 20 }}>
                {needle ? 'Essayez un autre mot-clé.' : 'Touchez l’appareil photo pour numériser votre premier document.'}
              </Text>
              {!needle && (
                <Pressable onPress={() => cap.scan()} style={[s.emptyBtn, { backgroundColor: t.primary }]}>
                  <Ionicons name="camera" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Scanner un document</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 12 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 22, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 10 },
  tools: { paddingHorizontal: 8, paddingTop: 14, paddingBottom: 22 },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 12, padding: 10, marginHorizontal: 16, marginBottom: 14 },
  panel: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 18, minHeight: 420 },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  panelTitle: { fontSize: 20, fontWeight: '700' },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  divider: { height: StyleSheet.hairlineWidth },
  empty: { alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 30 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 20, borderRadius: 14, marginTop: 8 },
});
