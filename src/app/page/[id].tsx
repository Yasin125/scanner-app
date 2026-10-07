import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type IconName, useUI } from '../../components/ui';
import { shareImage } from '../../lib/actions';
import { rotateImage } from '../../lib/edit';
import { deletePage, movePage, pageUri, replacePage, useDoc } from '../../lib/store';

export default function PageViewer() {
  const params = useLocalSearchParams<{ id: string; index: string }>();
  const doc = useDoc(params.id);
  const insets = useSafeAreaInsets();
  const ui = useUI();
  const [index, setIndex] = useState(Number(params.index) || 0);

  const count = doc?.pages.length ?? 0;
  useEffect(() => {
    if (doc && count === 0) router.back();
    else if (index >= count && count > 0) setIndex(count - 1);
  }, [count, index, doc]);

  if (!doc || !doc.pages[index]) return <View style={s.root} />;
  const uri = pageUri(doc, doc.pages[index]);

  function move(dir: -1 | 1) {
    const to = index + dir;
    if (to < 0 || to >= count) return;
    movePage(doc!.id, index, to);
    setIndex(to);
  }

  function remove() {
    Alert.alert('Supprimer cette page ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deletePage(doc!.id, index) },
    ]);
  }

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 8 }]}>
      <View style={s.top}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Text style={s.link}>Fermer</Text>
        </Pressable>
        <Text style={s.counter}>
          Page {index + 1} / {count}
        </Text>
        <Pressable hitSlop={12} onPress={() => shareImage(uri)}>
          <Text style={s.link}>Partager</Text>
        </Pressable>
      </View>

      <View style={s.stage}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
        {index > 0 && (
          <Pressable style={[s.nav, { left: 0 }]} onPress={() => setIndex(index - 1)}>
            <Text style={s.navTxt}>‹</Text>
          </Pressable>
        )}
        {index < count - 1 && (
          <Pressable style={[s.nav, { right: 0 }]} onPress={() => setIndex(index + 1)}>
            <Text style={s.navTxt}>›</Text>
          </Pressable>
        )}
      </View>

      <View style={s.tools}>
        <Tool icon="crop-outline" label="Recadrer" onPress={() => router.push({ pathname: '/recadrer/[id]', params: { id: doc.id, index: String(index) } })} />
        <Tool
          icon="refresh-outline"
          label="Pivoter"
          onPress={async () => {
            const out = await ui.busy('Rotation…', () => rotateImage(uri, 90));
            if (out) await replacePage(doc.id, index, out);
          }}
        />
        <Tool icon="pencil-outline" label="Signer" onPress={() => router.push({ pathname: '/signer/[id]', params: { id: doc.id, index: String(index) } })} />
        <Tool icon="chevron-back-circle-outline" label="Avant" onPress={() => move(-1)} disabled={index === 0} />
        <Tool icon="chevron-forward-circle-outline" label="Après" onPress={() => move(1)} disabled={index === count - 1} />
        <Tool icon="trash-outline" label="Supprimer" onPress={remove} danger />
      </View>
    </View>
  );
}

function Tool({ icon, label, onPress, disabled, danger }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [s.tool, { opacity: disabled ? 0.3 : pressed ? 0.7 : 1 }]}>
      <Ionicons name={icon} size={24} color={danger ? '#FF6369' : '#fff'} />
      <Text style={[s.toolTxt, danger && { color: '#FF6369' }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  link: { color: '#fff', fontSize: 16, fontWeight: '600' },
  counter: { color: '#bbb', fontSize: 14 },
  stage: { flex: 1, margin: 8 },
  nav: { position: 'absolute', top: 0, bottom: 0, width: 56, alignItems: 'center', justifyContent: 'center' },
  navTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 44 },
  tools: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8 },
  tool: { alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 4, flex: 1 },
  toolTxt: { color: '#fff', fontSize: 11, fontWeight: '500' },
});
