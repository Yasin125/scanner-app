import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { type ReactElement, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDocMenu } from '../lib/flows';
import { deleteFolder, type Folder, renameFolder, type ScanDoc, useDocs } from '../lib/store';
import { TAB_SPACE, useTheme } from '../lib/theme';
import { DocCard, DocRow } from './DocRow';
import { useUI } from './ui';

type Sort = 'recent' | 'old' | 'az' | 'za';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'recent', label: 'Date de modification (récent)' },
  { key: 'old', label: 'Date de modification (ancien)' },
  { key: 'az', label: 'Nom (A → Z)' },
  { key: 'za', label: 'Nom (Z → A)' },
];

type Item = { kind: 'folder'; folder: Folder } | { kind: 'doc'; doc: ScanDoc };

type Props = {
  docs: ScanDoc[];
  folders?: Folder[];
  title: string;
  header?: ReactElement;
  bottomSpace?: number;
};

/** Folder + document list with sort and list/grid toggle (Documents tab and folder screen). */
export function DocList({ docs, folders = [], title, header, bottomSpace = TAB_SPACE }: Props) {
  const t = useTheme();
  const ui = useUI();
  const menu = useDocMenu();
  const allDocs = useDocs();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [sort, setSort] = useState<Sort>('recent');
  const [grid, setGrid] = useState(false);

  const cols = !grid ? 1 : width >= 900 ? 6 : width >= 600 ? 4 : 3;
  const gap = 12;
  const cellW = (Math.min(width, 1100) - 32 - gap * (cols - 1)) / cols;

  const items = useMemo<Item[]>(() => {
    const cmp = (a: ScanDoc, b: ScanDoc) =>
      sort === 'recent' ? b.updatedAt - a.updatedAt : sort === 'old' ? a.updatedAt - b.updatedAt : sort === 'az' ? a.title.localeCompare(b.title, 'fr') : b.title.localeCompare(a.title, 'fr');
    return [
      ...folders.map((folder) => ({ kind: 'folder' as const, folder })),
      ...[...docs].sort(cmp).map((doc) => ({ kind: 'doc' as const, doc })),
    ];
  }, [docs, folders, sort]);

  function folderMenu(f: Folder) {
    ui.sheet({
      title: f.name,
      options: [
        {
          label: 'Renommer',
          icon: 'create-outline',
          onPress: async () => {
            const v = await ui.prompt('Renommer le dossier', f.name);
            if (v !== null) renameFolder(f.id, v);
          },
        },
        {
          label: 'Supprimer le dossier (garder les documents)',
          icon: 'trash-outline',
          destructive: true,
          onPress: () => deleteFolder(f.id),
        },
      ],
    });
  }

  const head = (
    <View>
      {header}
      <View style={s.head}>
        <Pressable style={s.headTitle} onPress={() => ui.sheet({ title: 'Trier par', options: SORTS.map((o) => ({ label: (o.key === sort ? '✓  ' : '') + o.label, onPress: () => setSort(o.key) })) })}>
          <Text style={{ color: t.txt, fontSize: 22, fontWeight: '700' }}>{title}</Text>
          <Text style={{ color: t.mut, fontSize: 18 }}> ({docs.length})</Text>
        </Pressable>
        <View style={s.headTools}>
          <Pressable hitSlop={8} onPress={() => ui.sheet({ title: 'Trier par', options: SORTS.map((o) => ({ label: (o.key === sort ? '✓  ' : '') + o.label, onPress: () => setSort(o.key) })) })}>
            <Ionicons name="swap-vertical" size={22} color={t.txt} />
          </Pressable>
          <Pressable hitSlop={8} onPress={() => setGrid(!grid)}>
            <Ionicons name={grid ? 'list' : 'grid-outline'} size={22} color={t.txt} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <FlatList
      key={cols}
      data={items}
      numColumns={cols}
      keyExtractor={(i) => (i.kind === 'folder' ? 'f' + i.folder.id : i.doc.id)}
      ListHeaderComponent={head}
      columnWrapperStyle={cols > 1 ? { gap, paddingHorizontal: 16 } : undefined}
      contentContainerStyle={{ paddingBottom: insets.bottom + bottomSpace, rowGap: cols > 1 ? 16 : 0 }}
      ListEmptyComponent={
        <View style={s.empty}>
          <Ionicons name="documents-outline" size={46} color={t.mut} />
          <Text style={{ color: t.mut, textAlign: 'center' }}>Aucun document ici.</Text>
        </View>
      }
      renderItem={({ item }) => {
        if (item.kind === 'folder') {
          const n = allDocs.filter((d) => d.folderId === item.folder.id).length;
          const folderView = (
            <Pressable
              onPress={() => router.push(`/folder/${item.folder.id}`)}
              onLongPress={() => folderMenu(item.folder)}
              style={({ pressed }) => [
                cols > 1 ? [s.folderCard, { width: cellW, height: cellW * 1.3 + 28 }] : s.folderRow,
                { backgroundColor: t.card, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[s.folderIcon, { backgroundColor: '#20C99733' }]}>
                <Ionicons name="folder" size={28} color="#20C997" />
              </View>
              <View style={{ flex: cols > 1 ? 0 : 1, alignItems: cols > 1 ? 'center' : 'flex-start' }}>
                <Text numberOfLines={1} style={{ color: t.txt, fontSize: 16, fontWeight: '600' }}>
                  {item.folder.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Ionicons name="document-outline" size={12} color={t.mut} />
                  <Text style={{ color: t.mut, fontSize: 13 }}>{n}</Text>
                </View>
              </View>
              {cols === 1 && (
                <Pressable hitSlop={12} onPress={() => folderMenu(item.folder)}>
                  <Ionicons name="ellipsis-horizontal" size={20} color={t.mut} />
                </Pressable>
              )}
            </Pressable>
          );
          return cols > 1 ? folderView : <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>{folderView}</View>;
        }
        return cols > 1 ? (
          <DocCard doc={item.doc} width={cellW} onMenu={() => menu.open(item.doc)} />
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            <DocRow doc={item.doc} onMenu={() => menu.open(item.doc)} />
          </View>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12 },
  headTitle: { flexDirection: 'row', alignItems: 'baseline' },
  headTools: { flexDirection: 'row', gap: 20 },
  folderRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 12 },
  folderCard: { borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 8 },
  folderIcon: { width: 52, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 10, paddingTop: 50 },
});
