import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type IconName, useUI } from '../../components/ui';
import { storageUsed, type PdfColor, type ThemePref, updateSettings, useDocs, useFolders, useSettings } from '../../lib/store';
import { formatSize, TAB_SPACE, useTheme } from '../../lib/theme';

const THEMES: { key: ThemePref; label: string }[] = [
  { key: 'dark', label: 'Sombre' },
  { key: 'light', label: 'Clair' },
  { key: 'auto', label: 'Automatique (système)' },
];
const COLORS: { key: PdfColor; label: string }[] = [
  { key: 'color', label: 'Couleur' },
  { key: 'gray', label: 'Niveaux de gris' },
  { key: 'bw', label: 'Noir & blanc' },
];

const SITE = 'https://badrulbinafruz.fr';

export default function Moi() {
  const t = useTheme();
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const docs = useDocs();
  const folders = useFolders();
  const used = useMemo(() => storageUsed(), [docs]);
  const pages = docs.reduce((n, d) => n + d.pages.length, 0);
  const ocr = docs.filter((d) => d.ocrText).length;

  async function editName() {
    const v = await ui.prompt('Votre nom', settings.name, 'Prénom Nom');
    if (v !== null) updateSettings({ name: v.trim() });
  }

  async function editWatermark() {
    const v = await ui.prompt('Filigrane des PDF (vide = aucun)', settings.watermark, 'Ex. : COPIE');
    if (v !== null) updateSettings({ watermark: v.trim() });
  }

  const pick = <K extends string>(title: string, list: { key: K; label: string }[], current: K, apply: (k: K) => void) =>
    ui.sheet({ title, options: list.map((o) => ({ label: (o.key === current ? '✓  ' : '') + o.label, onPress: () => apply(o.key) })) });

  const groups: { icon: IconName; label: string; value?: string; onPress: () => void }[][] = [
    [
      { icon: 'person-outline', label: 'Profil', value: settings.name || 'Ajouter', onPress: editName },
      {
        icon: 'moon-outline',
        label: 'Thème',
        value: THEMES.find((x) => x.key === settings.theme)?.label,
        onPress: () => pick('Thème', THEMES, settings.theme, (theme) => updateSettings({ theme })),
      },
      {
        icon: 'color-palette-outline',
        label: 'Couleurs PDF par défaut',
        value: COLORS.find((x) => x.key === settings.pdfColor)?.label,
        onPress: () => pick('Couleurs PDF par défaut', COLORS, settings.pdfColor, (pdfColor) => updateSettings({ pdfColor })),
      },
      { icon: 'water-outline', label: 'Filigrane', value: settings.watermark || 'Aucun', onPress: editWatermark },
    ],
    [
      { icon: 'cloud-outline', label: 'Synchronisation cloud', value: 'Bientôt', onPress: () => ui.toast('La synchronisation cloud arrive bientôt') },
      { icon: 'apps-outline', label: 'Widgets', value: 'Bientôt', onPress: () => ui.toast('Les widgets arrivent bientôt') },
    ],
    [
      { icon: 'help-circle-outline', label: 'Aide', onPress: () => Linking.openURL(`${SITE}/contact`) },
      { icon: 'shield-checkmark-outline', label: 'Confidentialité', onPress: () => ui.toast('Vos documents restent sur votre téléphone : rien n’est envoyé sur Internet.') },
      { icon: 'information-circle-outline', label: 'À propos', value: `v${Constants.expoConfig?.version ?? '1.0.0'}`, onPress: () => ui.toast('ScanFacile — vos documents, toujours avec vous.') },
    ],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + TAB_SPACE, paddingHorizontal: 16, gap: 14 }}>
        <Pressable onPress={editName} style={s.profile}>
          <LinearGradient colors={[t.primary, t.primary2]} style={s.avatar}>
            <Text style={s.avatarTxt}>{(settings.name || 'S').trim().charAt(0).toUpperCase()}</Text>
          </LinearGradient>
          <View style={{ gap: 6 }}>
            <Text style={{ color: t.txt, fontSize: 22, fontWeight: '700' }}>{settings.name || 'Bienvenue'}</Text>
            <View style={[s.plan, { backgroundColor: t.card2 }]}>
              <Ionicons name="ribbon-outline" size={13} color={t.mut} />
              <Text style={{ color: t.mut, fontSize: 12, fontWeight: '600' }}>Gratuit</Text>
            </View>
          </View>
        </Pressable>

        <Pressable onPress={() => ui.toast('ScanFacile Premium arrive bientôt')}>
          <LinearGradient colors={t.dark ? ['#2B2F55', '#3C2E66'] : ['#E6ECFF', '#EFE6FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.premium}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: t.txt, fontSize: 19, fontWeight: '700' }}>ScanFacile Premium</Text>
              <Text style={{ color: t.mut, fontSize: 13 }}>Cloud, signature, conversion Word & Excel…</Text>
            </View>
            <View style={[s.premiumBtn, { backgroundColor: t.card }]}>
              <Text style={{ color: t.txt, fontWeight: '700' }}>Bientôt</Text>
            </View>
          </LinearGradient>
        </Pressable>

        <View style={[s.box, { backgroundColor: t.card }]}>
          <Text style={{ color: t.txt, fontSize: 17, fontWeight: '700', marginBottom: 14 }}>Mes statistiques</Text>
          <View style={s.stats}>
            <Stat icon="phone-portrait-outline" color="#5C7CFA" value={formatSize(used)} label="Stockage" />
            <Stat icon="documents-outline" color="#20C997" value={String(docs.length)} label="Documents" />
            <Stat icon="copy-outline" color="#F59F00" value={String(pages)} label="Pages" />
            <Stat icon="text-outline" color="#845EF7" value={String(ocr)} label="OCR" />
          </View>
          <Text style={{ color: t.mut, fontSize: 12, marginTop: 12, textAlign: 'center' }}>
            {folders.length} dossier{folders.length > 1 ? 's' : ''} · tout est stocké sur votre téléphone
          </Text>
        </View>

        {groups.map((g, gi) => (
          <View key={gi} style={[s.box, { backgroundColor: t.card, paddingVertical: 4 }]}>
            {g.map((row, i) => (
              <Pressable key={row.label} onPress={row.onPress} style={({ pressed }) => [s.row, { opacity: pressed ? 0.6 : 1 }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line }]}>
                <Ionicons name={row.icon} size={22} color={t.txt} />
                <Text style={{ color: t.txt, fontSize: 16, flex: 1 }}>{row.label}</Text>
                {row.value ? (
                  <Text style={{ color: t.mut, fontSize: 14, maxWidth: 150 }} numberOfLines={1}>
                    {row.value}
                  </Text>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={t.mut} />
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Stat({ icon, color, value, label }: { icon: IconName; color: string; value: string; label: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <View style={[s.statIcon, { backgroundColor: color + '26' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={{ color: t.txt, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
        {value}
      </Text>
      <Text style={{ color: t.mut, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 6 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 30, fontWeight: '800' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  premium: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 18 },
  premiumBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22 },
  box: { borderRadius: 16, padding: 16 },
  stats: { flexDirection: 'row' },
  statIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 },
});
