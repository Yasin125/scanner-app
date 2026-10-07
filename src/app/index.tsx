import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Busy, Prompt } from '../components/ui';
import { isExpoGo, pickImages, recognizeText, scanPages, sharePdf } from '../lib/actions';
import { createDoc, deleteDoc, pageUri, renameDoc, type ScanDoc, setOcrText, useDocs, useLoaded } from '../lib/store';
import { formatDate, type Theme, useTheme } from '../lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;
type Sort = 'recent' | 'name';
type ViewMode = 'list' | 'grid';

const MAX_W = 960;

export default function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const docs = useDocs();
  const loaded = useLoaded();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [mode, setMode] = useState<ViewMode>('list');
  const [busy, setBusy] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<ScanDoc | null>(null);

  // Light status bar over the gradient, back to auto on other screens.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('auto');
    }, []),
  );

  const contentW = Math.min(width, MAX_W) - 32;
  const cols = mode === 'list' ? 1 : contentW >= 700 ? 4 : contentW >= 480 ? 3 : 2;
  const gap = 12;
  const cellW = (contentW - gap * (cols - 1)) / cols;
  const side = Math.max(16, (width - MAX_W) / 2 + 16);

  const totalPages = useMemo(() => docs.reduce((n, d) => n + d.pages.length, 0), [docs]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? docs.filter((d) => d.title.toLowerCase().includes(needle) || d.ocrText?.toLowerCase().includes(needle))
      : docs;
    return [...filtered].sort((a, b) => (sort === 'name' ? a.title.localeCompare(b.title, 'fr') : b.updatedAt - a.updatedAt));
  }, [docs, q, sort]);

  async function start(getter: () => Promise<string[]>, after?: (doc: ScanDoc) => Promise<void>, title?: string) {
    try {
      const imgs = await getter();
      if (!imgs.length) return;
      setBusy('Enregistrement…');
      const doc = await createDoc(imgs, title);
      if (after) await after(doc);
      else router.push(`/doc/${doc.id}`);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const actions: { icon: IconName; label: string; color: string; onPress: () => void }[] = [
    { icon: 'scan', label: 'Scanner', color: '#1E5EFF', onPress: () => start(scanPages) },
    { icon: 'images', label: 'Importer', color: '#12B886', onPress: () => start(pickImages) },
    {
      icon: 'text',
      label: 'Extraire texte',
      color: '#F08C00',
      onPress: () =>
        start(scanPages, async (doc) => {
          setBusy('Reconnaissance du texte…');
          try {
            await setOcrText(doc.id, await recognizeText(doc));
            router.push(`/ocr/${doc.id}`);
          } catch (e) {
            router.push(`/doc/${doc.id}`);
            throw e;
          }
        }),
    },
    {
      icon: 'card',
      label: 'Carte ID',
      color: '#8B6EF6',
      onPress: () => start(() => scanPages({ max: 2 }), undefined, "Carte d'identité"),
    },
  ];

  function openMenu(d: ScanDoc) {
    Alert.alert(d.title, undefined, [
      {
        text: 'Partager en PDF',
        onPress: async () => {
          setBusy('Création du PDF…');
          try {
            await sharePdf(d);
          } catch (e) {
            Alert.alert('Erreur', String(e));
          } finally {
            setBusy(null);
          }
        },
      },
      { text: 'Renommer', onPress: () => setRenaming(d) },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Supprimer ce document ?', 'Cette action est irréversible.', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: () => deleteDoc(d.id) },
          ]),
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  const header = (
    <View>
      <LinearGradient
        colors={['#1E5EFF', '#5B3DF5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.hero, { paddingTop: insets.top + 16, paddingHorizontal: side }]}
      >
        <View style={s.heroTop}>
          <View style={s.logo}>
            <Ionicons name="document-text" size={20} color="#1E5EFF" />
          </View>
          <Text style={s.brand}>ScanFacile</Text>
        </View>
        <Text style={s.heroTitle}>Vos documents,{'\n'}toujours avec vous.</Text>
        <View style={s.stats}>
          <Stat value={docs.length} label={docs.length > 1 ? 'documents' : 'document'} />
          <View style={s.statSep} />
          <Stat value={totalPages} label={totalPages > 1 ? 'pages' : 'page'} />
        </View>
        <View style={s.search}>
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Rechercher (titre ou texte)…"
            placeholderTextColor="#9CA3AF"
            style={s.searchInput}
            returnKeyType="search"
          />
          {!!q && (
            <Pressable hitSlop={10} onPress={() => setQ('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: side }}>
        <View style={[s.actions, { backgroundColor: t.card, borderColor: t.line }]}>
          {actions.map((a) => (
            <Pressable key={a.label} onPress={a.onPress} style={({ pressed }) => [s.action, { opacity: pressed ? 0.6 : 1 }]}>
              <View style={[s.actionIcon, { backgroundColor: a.color + '1A' }]}>
                <Ionicons name={a.icon} size={24} color={a.color} />
              </View>
              <Text style={[s.actionLabel, { color: t.txt }]} numberOfLines={1}>
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {isExpoGo && (
          <View style={[s.notice, { backgroundColor: t.card, borderColor: t.line }]}>
            <Ionicons name="information-circle" size={18} color={t.primary} />
            <Text style={{ color: t.mut, fontSize: 12, flex: 1 }}>
              Mode aperçu : recadrage automatique et OCR disponibles dans l’application finale.
            </Text>
          </View>
        )}

        <View style={s.sectionHead}>
          <Text style={[s.sectionTitle, { color: t.txt }]}>{q ? 'Résultats' : 'Documents récents'}</Text>
          <View style={s.tools}>
            <ToolBtn
              t={t}
              icon={sort === 'recent' ? 'time-outline' : 'text-outline'}
              onPress={() => setSort(sort === 'recent' ? 'name' : 'recent')}
            />
            <ToolBtn
              t={t}
              icon={mode === 'list' ? 'grid-outline' : 'list-outline'}
              onPress={() => setMode(mode === 'list' ? 'grid' : 'list')}
            />
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <FlatList
        key={cols}
        data={list}
        numColumns={cols}
        keyExtractor={(d) => d.id}
        ListHeaderComponent={header}
        columnWrapperStyle={cols > 1 ? { gap, paddingHorizontal: side } : undefined}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120, gap: cols > 1 ? gap : 10 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={loaded ? <Empty t={t} searching={!!q} onScan={() => start(scanPages)} /> : null}
        renderItem={({ item }) =>
          mode === 'list' ? (
            <View style={{ paddingHorizontal: side }}>
              <Row t={t} doc={item} onMenu={() => openMenu(item)} />
            </View>
          ) : (
            <Card t={t} doc={item} width={cellW} onMenu={() => openMenu(item)} />
          )
        }
      />

      {docs.length > 0 && (
        <View pointerEvents="box-none" style={[s.fabWrap, { bottom: insets.bottom + 20 }]}>
          <Pressable
            onPress={() => start(scanPages)}
            style={({ pressed }) => [s.fab, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
          >
            <LinearGradient colors={['#1E5EFF', '#5B3DF5']} style={s.fabInner}>
              <Ionicons name="camera" size={30} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      )}

      <Prompt
        visible={!!renaming}
        title="Renommer"
        initial={renaming?.title ?? ''}
        onCancel={() => setRenaming(null)}
        onSubmit={(v) => {
          if (renaming) renameDoc(renaming.id, v);
          setRenaming(null);
        }}
      />
      <Busy label={busy} />
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function ToolBtn({ t, icon, onPress }: { t: Theme; icon: IconName; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={[s.toolBtn, { backgroundColor: t.card, borderColor: t.line }]}>
      <Ionicons name={icon} size={18} color={t.txt} />
    </Pressable>
  );
}

function pagesLabel(n: number) {
  return `${n} page${n > 1 ? 's' : ''}`;
}

function Row({ t, doc, onMenu }: { t: Theme; doc: ScanDoc; onMenu: () => void }) {
  return (
    <Pressable
      onPress={() => router.push(`/doc/${doc.id}`)}
      onLongPress={onMenu}
      style={({ pressed }) => [s.row, { backgroundColor: t.card, borderColor: t.line, opacity: pressed ? 0.85 : 1 }]}
    >
      <Thumb t={t} doc={doc} style={s.rowThumb} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text numberOfLines={1} style={[s.rowTitle, { color: t.txt }]}>
          {doc.title}
        </Text>
        <View style={s.meta}>
          <Badge t={t} icon="documents-outline" label={pagesLabel(doc.pages.length)} />
          {doc.ocrText ? <Badge t={t} icon="text-outline" label="OCR" /> : null}
        </View>
        <Text style={{ color: t.mut, fontSize: 12 }}>{formatDate(doc.updatedAt)}</Text>
      </View>
      <Pressable hitSlop={12} onPress={onMenu} style={{ padding: 4 }}>
        <Ionicons name="ellipsis-vertical" size={18} color={t.mut} />
      </Pressable>
    </Pressable>
  );
}

function Card({ t, doc, width, onMenu }: { t: Theme; doc: ScanDoc; width: number; onMenu: () => void }) {
  return (
    <Pressable
      onPress={() => router.push(`/doc/${doc.id}`)}
      onLongPress={onMenu}
      style={({ pressed }) => [s.card, { width, backgroundColor: t.card, borderColor: t.line, opacity: pressed ? 0.85 : 1 }]}
    >
      <Thumb t={t} doc={doc} style={{ width: '100%', height: width * 1.2, borderRadius: 10 }} />
      <View style={s.cardFoot}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[s.cardTitle, { color: t.txt }]}>
            {doc.title}
          </Text>
          <Text style={{ color: t.mut, fontSize: 11, marginTop: 2 }}>{pagesLabel(doc.pages.length)}</Text>
        </View>
        <Pressable hitSlop={10} onPress={onMenu}>
          <Ionicons name="ellipsis-vertical" size={16} color={t.mut} />
        </Pressable>
      </View>
    </Pressable>
  );
}

function Thumb({ t, doc, style }: { t: Theme; doc: ScanDoc; style: object }) {
  if (!doc.pages[0]) {
    return (
      <View style={[style, { backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="document-outline" size={22} color={t.mut} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: pageUri(doc, doc.pages[0]) }}
      style={[style, { backgroundColor: t.bg }]}
      contentFit="cover"
      transition={150}
    />
  );
}

function Badge({ t, icon, label }: { t: Theme; icon: IconName; label: string }) {
  return (
    <View style={[s.badge, { backgroundColor: t.bg }]}>
      <Ionicons name={icon} size={11} color={t.mut} />
      <Text style={{ color: t.mut, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function Empty({ t, searching, onScan }: { t: Theme; searching: boolean; onScan: () => void }) {
  return (
    <View style={s.empty}>
      <View style={[s.emptyIcon, { backgroundColor: t.primary + '14' }]}>
        <Ionicons name={searching ? 'search' : 'scan-outline'} size={44} color={t.primary} />
      </View>
      <Text style={[s.emptyTitle, { color: t.txt }]}>{searching ? 'Aucun résultat' : 'Aucun document pour le moment'}</Text>
      <Text style={{ color: t.mut, textAlign: 'center', lineHeight: 20 }}>
        {searching
          ? 'Essayez un autre mot-clé.'
          : 'Numérisez reçus, factures, contrats ou cartes d’identité et transformez-les en PDF en un instant.'}
      </Text>
      {!searching && (
        <Pressable onPress={onScan} style={[s.emptyBtn, { backgroundColor: t.primary }]}>
          <Ionicons name="camera" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700' }}>Scanner un document</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  hero: { paddingBottom: 56, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  brand: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 0.3 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '800', lineHeight: 32, marginTop: 22 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 16 },
  statSep: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.3)' },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginTop: 20,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 13, color: '#111827' },
  actions: {
    flexDirection: 'row',
    marginTop: -36,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 6,
    shadowColor: '#0B1020',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  action: { flex: 1, alignItems: 'center', gap: 8 },
  actionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '600' },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  tools: { flexDirection: 'row', gap: 8 },
  toolBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 16, borderWidth: 1 },
  rowThumb: { width: 58, height: 76, borderRadius: 10 },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  meta: { flexDirection: 'row', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  card: { borderRadius: 16, borderWidth: 1, padding: 8 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 2 },
  cardTitle: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 10, paddingHorizontal: 32, paddingTop: 30 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 10,
  },
  fabWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  fab: {
    borderRadius: 36,
    shadowColor: '#1E5EFF',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  fabInner: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
});
