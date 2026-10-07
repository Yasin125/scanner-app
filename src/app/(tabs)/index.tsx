import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DocRow } from '../../components/DocRow';
import { ToolGrid, useTools } from '../../components/Tools';
import { isExpoGo } from '../../lib/actions';
import { useCloud } from '../../lib/cloud';
import { useCapture, useDocMenu } from '../../lib/flows';
import { useDocs, useLoaded, useSettings } from '../../lib/store';
import { TAB_SPACE, useTheme } from '../../lib/theme';

const RECENT = 5;

function greeting() {
  const h = new Date().getHours();
  return h < 5 || h >= 18 ? 'Bonsoir' : 'Bonjour';
}

export default function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const docs = useDocs();
  const loaded = useLoaded();
  const settings = useSettings();
  const cloud = useCloud();
  const tools = useTools();
  const menu = useDocMenu();
  const cap = useCapture();
  const [q, setQ] = useState('');

  const name = (cloud.account?.name || settings.name).split(' ')[0];
  const needle = q.trim().toLowerCase();
  const recents = useMemo(() => {
    const sorted = [...docs].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!needle) return sorted.slice(0, RECENT);
    return sorted.filter((d) => d.title.toLowerCase().includes(needle) || d.ocrText?.toLowerCase().includes(needle));
  }, [docs, needle]);

  const cloudIcon = !cloud.account ? 'cloud-offline-outline' : cloud.syncing ? 'sync' : cloud.error ? 'cloud-offline' : 'cloud-done';
  const cloudColor = !cloud.account ? t.mut : cloud.error ? t.danger : t.success;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: TAB_SPACE }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={[s.hello, { color: t.mut }]}>{greeting()}{name ? `, ${name}` : ''} 👋</Text>
            <Text style={[s.title, { color: t.txt }]}>Vos documents</Text>
          </View>
          <Pressable onPress={() => router.push('/moi')} hitSlop={8} style={[s.iconBtn, { backgroundColor: t.card, borderColor: t.line }]}>
            <Ionicons name={cloudIcon} size={20} color={cloudColor} />
          </Pressable>
          <Pressable onPress={() => router.push('/moi')} hitSlop={8}>
            <LinearGradient colors={[t.primary, t.primary2]} style={s.avatar}>
              {name ? <Text style={s.avatarTxt}>{name.charAt(0).toUpperCase()}</Text> : <Ionicons name="person" size={18} color="#fff" />}
            </LinearGradient>
          </Pressable>
        </View>

        {/* Search */}
        <View style={[s.search, { backgroundColor: t.card, borderColor: t.line }]}>
          <Ionicons name="search" size={18} color={t.mut} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Rechercher un document ou un mot…"
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

        {!needle && (
          <>
            {/* Hero */}
            <LinearGradient colors={[t.primary, t.primary2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
              <View style={s.heroDeco} />
              <Text style={s.heroTitle}>Numérisez en un instant</Text>
              <Text style={s.heroSub}>Recadrage, PDF, texte, signature — tout est sur votre téléphone.</Text>
              <View style={s.heroBtns}>
                <Pressable onPress={() => cap.scan()} style={({ pressed }) => [s.heroBtn, { backgroundColor: '#fff', opacity: pressed ? 0.85 : 1 }]}>
                  <Ionicons name="scan" size={18} color={t.primary} />
                  <Text style={{ color: t.primary, fontWeight: '700' }}>Scanner</Text>
                </Pressable>
                <Pressable onPress={() => cap.importImages()} style={({ pressed }) => [s.heroBtn, s.heroGhost, { opacity: pressed ? 0.85 : 1 }]}>
                  <Ionicons name="images-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Importer</Text>
                </Pressable>
              </View>
            </LinearGradient>

            {/* Quick tools */}
            <View style={s.sectionHead}>
              <Text style={[s.sectionTitle, { color: t.txt }]}>Outils rapides</Text>
              <Pressable hitSlop={8} onPress={() => router.push('/outils')}>
                <Text style={{ color: t.primary, fontWeight: '600' }}>Tout voir</Text>
              </Pressable>
            </View>
            <View style={[s.card, { backgroundColor: t.card, borderColor: t.line, paddingVertical: 18 }]}>
              <ToolGrid tools={[tools.id, tools.ocr, tools.sign, tools.files, tools.merge, tools.toWord, tools.compress, tools.qr]} />
            </View>

            {!cloud.account && cloud.ready && (
              <Pressable onPress={() => router.push('/compte')} style={[s.card, s.cloudCard, { backgroundColor: t.card, borderColor: t.line }]}>
                <View style={[s.cloudIc, { backgroundColor: t.primary + '1A' }]}>
                  <Ionicons name="cloud-upload-outline" size={22} color={t.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.txt, fontWeight: '700', fontSize: 15 }}>Sauvegarde cloud gratuite</Text>
                  <Text style={{ color: t.mut, fontSize: 13, marginTop: 2 }}>Créez un compte pour retrouver vos documents sur tous vos appareils.</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={t.mut} />
              </Pressable>
            )}

            {isExpoGo && (
              <View style={[s.notice, { backgroundColor: t.card2 }]}>
                <Ionicons name="information-circle-outline" size={16} color={t.mut} />
                <Text style={{ color: t.mut, fontSize: 12, flex: 1 }}>Aperçu : recadrage automatique et OCR disponibles dans l’application finale.</Text>
              </View>
            )}
          </>
        )}

        {/* Recents */}
        <View style={s.sectionHead}>
          <Text style={[s.sectionTitle, { color: t.txt }]}>{needle ? `Résultats (${recents.length})` : 'Récents'}</Text>
          {!needle && docs.length > RECENT && (
            <Pressable hitSlop={8} onPress={() => router.push('/documents')}>
              <Text style={{ color: t.primary, fontWeight: '600' }}>Tout voir</Text>
            </Pressable>
          )}
        </View>
        <View style={[s.card, { backgroundColor: t.card, borderColor: t.line, paddingVertical: recents.length ? 4 : 0 }]}>
          {recents.map((d, i) => (
            <View key={d.id}>
              {i > 0 && <View style={[s.divider, { backgroundColor: t.line }]} />}
              <DocRow doc={d} onMenu={() => menu.open(d)} />
            </View>
          ))}
          {loaded && recents.length === 0 && (
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: t.primary + '14' }]}>
                <Ionicons name={needle ? 'search' : 'document-text-outline'} size={34} color={t.primary} />
              </View>
              <Text style={[s.emptyTitle, { color: t.txt }]}>{needle ? 'Aucun résultat' : 'Aucun document'}</Text>
              <Text style={{ color: t.mut, textAlign: 'center', lineHeight: 20 }}>
                {needle ? 'Essayez un autre mot-clé.' : 'Vos documents numérisés apparaîtront ici.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  hello: { fontSize: 14, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 12 },
  hero: { marginHorizontal: 20, marginTop: 18, borderRadius: 22, padding: 20, overflow: 'hidden' },
  heroDeco: { position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroTitle: { color: '#fff', fontSize: 21, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13.5, marginTop: 6, lineHeight: 19, maxWidth: 280 },
  heroBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  heroBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 999 },
  heroGhost: { backgroundColor: 'rgba(255,255,255,0.18)' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 24, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  card: { marginHorizontal: 20, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  cloudCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, marginTop: 14 },
  cloudIc: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 12, padding: 10, marginHorizontal: 20, marginTop: 14 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 78 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 28, paddingHorizontal: 20 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
});
