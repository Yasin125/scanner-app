import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { pageUri, type ScanDoc } from '../lib/store';
import { formatDate, type Theme, useTheme } from '../lib/theme';

export function Thumb({ doc, size = 64 }: { doc: ScanDoc; size?: number }) {
  const t = useTheme();
  const style = { width: size, height: size, borderRadius: 6, backgroundColor: t.card2 };
  if (doc.locked || doc.pdf) {
    return (
      <View style={[style, s.center, doc.pdf && { backgroundColor: '#FA525222' }]}>
        <Ionicons name={doc.locked ? 'lock-closed' : 'document'} size={size / 2.6} color={doc.locked ? t.mut : '#FA5252'} />
        {doc.pdf && !doc.locked && <Text style={{ color: '#FA5252', fontSize: size / 7, fontWeight: '900' }}>PDF</Text>}
      </View>
    );
  }
  if (!doc.pages[0]) {
    return (
      <View style={[style, s.center]}>
        <Ionicons name="document-outline" size={size / 3} color={t.mut} />
      </View>
    );
  }
  return <Image source={{ uri: pageUri(doc, doc.pages[0]) }} style={style} contentFit="cover" transition={120} />;
}

type Props = {
  doc: ScanDoc;
  onMenu: () => void;
  /** Quick actions shown under the row (used for the latest document on the home screen). */
  actions?: { label: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void }[];
};

export function DocRow({ doc, onMenu, actions }: Props) {
  const t = useTheme();
  return (
    <View>
      <Pressable
        onPress={() => router.push(`/doc/${doc.id}`)}
        onLongPress={onMenu}
        style={({ pressed }) => [s.row, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Thumb doc={doc} />
        <View style={{ flex: 1, gap: 5 }}>
          <Text numberOfLines={1} style={[s.title, { color: t.txt }]}>
            {doc.title}
          </Text>
          <Meta t={t} doc={doc} />
        </View>
        <Pressable hitSlop={14} onPress={onMenu} style={s.more}>
          <Ionicons name="ellipsis-horizontal" size={20} color={t.mut} />
        </Pressable>
      </Pressable>
      {actions && (
        <View style={s.actions}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              onPress={a.onPress}
              style={({ pressed }) => [s.action, { backgroundColor: t.card2, opacity: pressed ? 0.7 : 1 }]}
            >
              {a.icon && <Ionicons name={a.icon} size={16} color={t.primary} />}
              <Text style={{ color: t.txt, fontWeight: '600', fontSize: 14 }}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function Meta({ t, doc }: { t: Theme; doc: ScanDoc }) {
  return (
    <View style={s.meta}>
      <Text style={{ color: t.mut, fontSize: 13 }}>{formatDate(doc.updatedAt)}</Text>
      <View style={[s.sep, { backgroundColor: t.line }]} />
      <Ionicons name="copy-outline" size={12} color={t.mut} />
      <Text style={{ color: t.mut, fontSize: 13 }}>{doc.pages.length}</Text>
      {doc.ocrText ? (
        <View style={[s.tag, { backgroundColor: t.primary + '22' }]}>
          <Text style={{ color: t.primary, fontSize: 10, fontWeight: '800' }}>OCR</Text>
        </View>
      ) : null}
    </View>
  );
}

export function DocCard({ doc, width, onMenu }: { doc: ScanDoc; width: number; onMenu: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={() => router.push(`/doc/${doc.id}`)} onLongPress={onMenu} style={({ pressed }) => [{ width, opacity: pressed ? 0.7 : 1 }]}>
      <View style={[s.cardImg, { height: width * 1.3, backgroundColor: t.card2 }]}>
        {doc.pages[0] && !doc.locked ? (
          <Image source={{ uri: pageUri(doc, doc.pages[0]) }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Ionicons name={doc.locked ? 'lock-closed' : doc.pdf ? 'document' : 'document-outline'} size={28} color={doc.pdf && !doc.locked ? '#FA5252' : t.mut} />
        )}
        <View style={s.count}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{doc.pages.length}</Text>
        </View>
      </View>
      <View style={s.cardFoot}>
        <Text numberOfLines={1} style={{ color: t.txt, fontSize: 13, fontWeight: '600', flex: 1 }}>
          {doc.title}
        </Text>
        <Pressable hitSlop={10} onPress={onMenu}>
          <Ionicons name="ellipsis-horizontal" size={16} color={t.mut} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sep: { width: 1, height: 12, marginHorizontal: 2 },
  tag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginLeft: 4 },
  more: { padding: 4 },
  actions: { flexDirection: 'row', gap: 8, paddingBottom: 12 },
  action: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 8 },
  cardImg: { borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  count: { position: 'absolute', right: 6, bottom: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
});
