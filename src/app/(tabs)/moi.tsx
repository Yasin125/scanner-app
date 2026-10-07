import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type IconName, useUI } from '../../components/ui';
import { setAutoSync, SUPPORT_EMAIL, sync, useCloud } from '../../lib/cloud';
import { storageUsed, type PdfColor, type ThemePref, updateSettings, useDocs, useSettings } from '../../lib/store';
import { formatSize, TAB_SPACE, useTheme } from '../../lib/theme';

const THEMES: { key: ThemePref; label: string }[] = [
  { key: 'auto', label: 'Automatique' },
  { key: 'light', label: 'Clair' },
  { key: 'dark', label: 'Sombre' },
];
const COLORS: { key: PdfColor; label: string }[] = [
  { key: 'color', label: 'Couleur' },
  { key: 'gray', label: 'Niveaux de gris' },
  { key: 'bw', label: 'Noir & blanc' },
];

function ago(ts: number | null) {
  if (!ts) return 'jamais';
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'à l’instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `il y a ${h} h` : `il y a ${Math.round(h / 24)} j`;
}

type Row = { icon: IconName; label: string; value?: string; onPress?: () => void; right?: React.ReactNode; color?: string };

export default function Compte() {
  const t = useTheme();
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const cloud = useCloud();
  const docs = useDocs();
  const local = useMemo(() => storageUsed(), [docs]);
  const acc = cloud.account;
  const pct = acc ? Math.min(1, acc.used / acc.quota) : 0;

  async function editWatermark() {
    const v = await ui.prompt('Filigrane des PDF (vide = aucun)', settings.watermark, 'Ex. : COPIE');
    if (v !== null) updateSettings({ watermark: v.trim() });
  }

  const pick = <K extends string>(title: string, list: { key: K; label: string }[], current: K, apply: (k: K) => void) =>
    ui.sheet({ title, options: list.map((o) => ({ label: (o.key === current ? '✓  ' : '') + o.label, onPress: () => apply(o.key) })) });

  const groups: { title: string; rows: Row[] }[] = [
    {
      title: 'Préférences',
      rows: [
        { icon: 'contrast-outline', label: 'Apparence', value: THEMES.find((x) => x.key === settings.theme)?.label, onPress: () => pick('Apparence', THEMES, settings.theme, (theme) => updateSettings({ theme })) },
        { icon: 'color-palette-outline', label: 'Couleurs PDF', value: COLORS.find((x) => x.key === settings.pdfColor)?.label, onPress: () => pick('Couleurs PDF par défaut', COLORS, settings.pdfColor, (pdfColor) => updateSettings({ pdfColor })) },
        { icon: 'water-outline', label: 'Filigrane', value: settings.watermark || 'Aucun', onPress: editWatermark },
        { icon: 'pencil-outline', label: 'Ma signature', value: settings.signature.length ? 'Enregistrée' : 'Créer', onPress: () => router.push('/signature') },
      ],
    },
    {
      title: 'Assistance',
      rows: [
        { icon: 'chatbubble-ellipses-outline', label: 'Nous contacter', onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=ScanFacile`) },
        { icon: 'shield-checkmark-outline', label: 'Confidentialité', onPress: () => router.push('/confidentialite') },
        { icon: 'information-circle-outline', label: 'Version', value: Constants.expoConfig?.version ?? '1.0.0' },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: TAB_SPACE, paddingHorizontal: 20, gap: 18 }}>
        <Text style={[s.title, { color: t.txt }]}>Compte</Text>

        {/* Account card */}
        {acc ? (
          <Pressable onPress={() => router.push('/profil')} style={[s.card, s.profile, { backgroundColor: t.card, borderColor: t.line }]}>
            <LinearGradient colors={[t.primary, t.primary2]} style={s.avatar}>
              <Text style={s.avatarTxt}>{acc.name.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: t.txt, fontSize: 18, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>
                  {acc.name}
                </Text>
                <View style={[s.badge, { backgroundColor: acc.premium ? '#F5B70026' : t.card2 }]}>
                  {acc.premium && <Ionicons name="diamond" size={11} color="#E0A100" />}
                  <Text style={{ color: acc.premium ? '#B98400' : t.mut, fontSize: 11, fontWeight: '800' }}>{acc.premium ? 'PREMIUM' : 'GRATUIT'}</Text>
                </View>
              </View>
              <Text style={{ color: t.mut, fontSize: 13, marginTop: 3 }} numberOfLines={1}>
                {acc.email}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.mut} />
          </Pressable>
        ) : (
          <View style={[s.card, { backgroundColor: t.card, borderColor: t.line, padding: 20, gap: 14 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={[s.avatar, { backgroundColor: t.card2 }]}>
                <Ionicons name="person-outline" size={26} color={t.mut} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.txt, fontSize: 17, fontWeight: '700' }}>Connectez-vous</Text>
                <Text style={{ color: t.mut, fontSize: 13, marginTop: 3 }}>Sauvegarde cloud et accès sur tous vos appareils.</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => router.push({ pathname: '/compte', params: { mode: 'register' } })} style={[s.btn, { backgroundColor: t.primary, flex: 1 }]}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Créer un compte</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/compte')} style={[s.btn, { backgroundColor: t.card2, flex: 1 }]}>
                <Text style={{ color: t.txt, fontWeight: '700' }}>Se connecter</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Premium */}
        <Pressable onPress={() => router.push('/premium')}>
          <LinearGradient colors={['#1E1B4B', '#4C1D95']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.premium}>
            <View style={s.premiumIc}>
              <Ionicons name="diamond" size={22} color="#FCD34D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>{acc?.premium ? 'Vous êtes Premium' : 'ScanFacile Premium'}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 3 }}>
                {acc?.premium ? '20 Go de cloud et toutes les fonctions.' : '20 Go de cloud, support prioritaire…'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </LinearGradient>
        </Pressable>

        {/* Storage & sync */}
        <View style={[s.card, { backgroundColor: t.card, borderColor: t.line, padding: 16, gap: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: t.txt, fontSize: 16, fontWeight: '700' }}>Stockage</Text>
            <Text style={{ color: t.mut, fontSize: 13 }}>{docs.length} document{docs.length > 1 ? 's' : ''}</Text>
          </View>
          <View style={s.storageRow}>
            <Ionicons name="phone-portrait-outline" size={18} color={t.mut} />
            <Text style={{ color: t.txt, flex: 1 }}>Sur ce téléphone</Text>
            <Text style={{ color: t.mut }}>{formatSize(local)}</Text>
          </View>
          {acc && (
            <>
              <View style={s.storageRow}>
                <Ionicons name="cloud-outline" size={18} color={t.mut} />
                <Text style={{ color: t.txt, flex: 1 }}>Cloud</Text>
                <Text style={{ color: t.mut }}>
                  {formatSize(acc.used)} / {formatSize(acc.quota)}
                </Text>
              </View>
              <View style={[s.track, { backgroundColor: t.card2 }]}>
                <View style={[s.fill, { width: `${Math.max(2, pct * 100)}%`, backgroundColor: pct > 0.9 ? t.danger : t.primary }]} />
              </View>
              <View style={[s.syncRow, { borderTopColor: t.line }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.txt, fontWeight: '600' }}>Synchronisation automatique</Text>
                  <Text style={{ color: cloud.error ? t.danger : t.mut, fontSize: 12, marginTop: 2 }}>
                    {cloud.syncing ? 'Synchronisation…' : cloud.error ? cloud.error : `Dernière : ${ago(cloud.lastSync)}`}
                  </Text>
                </View>
                <Switch value={cloud.autoSync} onValueChange={setAutoSync} trackColor={{ true: t.primary, false: t.line }} />
              </View>
              <Pressable
                disabled={cloud.syncing}
                onPress={() => sync().then(() => ui.toast('Documents synchronisés'), (e) => ui.toast(e instanceof Error ? e.message : String(e)))}
                style={[s.btn, { backgroundColor: t.card2, flexDirection: 'row', gap: 8, opacity: cloud.syncing ? 0.5 : 1 }]}
              >
                <Ionicons name="sync" size={16} color={t.txt} />
                <Text style={{ color: t.txt, fontWeight: '700' }}>{cloud.syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}</Text>
              </Pressable>
            </>
          )}
        </View>

        {groups.map((g) => (
          <View key={g.title} style={{ gap: 8 }}>
            <Text style={[s.groupTitle, { color: t.mut }]}>{g.title}</Text>
            <View style={[s.card, { backgroundColor: t.card, borderColor: t.line }]}>
              {g.rows.map((row, i) => (
                <Pressable
                  key={row.label}
                  disabled={!row.onPress}
                  onPress={row.onPress}
                  style={({ pressed }) => [s.row, { opacity: pressed ? 0.6 : 1 }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line }]}
                >
                  <View style={[s.rowIc, { backgroundColor: t.card2 }]}>
                    <Ionicons name={row.icon} size={18} color={row.color ?? t.txt} />
                  </View>
                  <Text style={{ color: t.txt, fontSize: 15.5, flex: 1 }}>{row.label}</Text>
                  {row.value ? (
                    <Text style={{ color: t.mut, fontSize: 14, maxWidth: 150 }} numberOfLines={1}>
                      {row.value}
                    </Text>
                  ) : null}
                  {row.onPress && <Ionicons name="chevron-forward" size={16} color={t.mut} />}
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 22, fontWeight: '800' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  btn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12 },
  premium: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, padding: 16 },
  premiumIc: { width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  storageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14 },
  groupTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
  rowIc: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
