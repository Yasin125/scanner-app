import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../components/Form';
import type { IconName } from '../components/ui';
import { SUPPORT_EMAIL, useCloud } from '../lib/cloud';
import { useTheme } from '../lib/theme';

const FEATURES: { icon: IconName; title: string; free: string; premium: string }[] = [
  { icon: 'cloud-outline', title: 'Stockage cloud', free: '500 Mo', premium: '20 Go' },
  { icon: 'phone-portrait-outline', title: 'Synchronisation multi-appareils', free: 'Oui', premium: 'Oui' },
  { icon: 'scan-outline', title: 'Scans, PDF, OCR, signature', free: 'Illimités', premium: 'Illimités' },
  { icon: 'headset-outline', title: 'Support', free: 'Standard', premium: 'Prioritaire' },
];

export default function Premium() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { account } = useCloud();

  const request = () =>
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Demande ScanFacile Premium')}&body=${encodeURIComponent(
        `Bonjour,\n\nJe souhaite passer à ScanFacile Premium.\n\nCompte : ${account?.email ?? ''} (n° ${account?.id ?? ''})\n\nMerci !`,
      )}`,
    );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
      <LinearGradient colors={['#1E1B4B', '#4C1D95']} style={[s.hero, { paddingTop: 28 }]}>
        <View style={s.heroIc}>
          <Ionicons name="diamond" size={34} color="#FCD34D" />
        </View>
        <Text style={s.heroTitle}>ScanFacile Premium</Text>
        <Text style={s.heroSub}>Plus d’espace pour tous vos documents, sur tous vos appareils.</Text>
      </LinearGradient>

      <View style={{ padding: 20, gap: 18 }}>
        <View style={[s.table, { backgroundColor: t.card, borderColor: t.line }]}>
          <View style={[s.tr, { borderBottomColor: t.line }]}>
            <Text style={[s.th, { color: t.mut, flex: 1.6 }]}>Fonction</Text>
            <Text style={[s.th, { color: t.mut }]}>Gratuit</Text>
            <Text style={[s.th, { color: t.primary }]}>Premium</Text>
          </View>
          {FEATURES.map((f, i) => (
            <View key={f.title} style={[s.tr, i < FEATURES.length - 1 && { borderBottomColor: t.line }]}>
              <View style={{ flex: 1.6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name={f.icon} size={18} color={t.primary} />
                <Text style={{ color: t.txt, fontSize: 13.5, flexShrink: 1 }}>{f.title}</Text>
              </View>
              <Text style={[s.td, { color: t.mut }]}>{f.free}</Text>
              <Text style={[s.td, { color: t.txt, fontWeight: '700' }]}>{f.premium}</Text>
            </View>
          ))}
        </View>

        {account?.premium ? (
          <View style={[s.ok, { backgroundColor: t.success + '1A' }]}>
            <Ionicons name="checkmark-circle" size={22} color={t.success} />
            <Text style={{ color: t.txt, flex: 1 }}>
              Vous êtes Premium{account.premium_until ? ` jusqu’au ${new Date(account.premium_until).toLocaleDateString('fr-FR')}` : ''}. Merci !
            </Text>
          </View>
        ) : account ? (
          <>
            <PrimaryButton label="Demander l’accès Premium" onPress={request} />
            <Text style={{ color: t.mut, fontSize: 12.5, textAlign: 'center', lineHeight: 18 }}>
              Notre équipe active votre abonnement rapidement. Le paiement intégré à l’App Store et à Google Play sera disponible prochainement.
            </Text>
          </>
        ) : (
          <>
            <PrimaryButton label="Créer un compte gratuit" onPress={() => router.replace({ pathname: '/compte', params: { mode: 'register' } })} />
            <Text style={{ color: t.mut, fontSize: 12.5, textAlign: 'center' }}>Un compte est nécessaire pour la sauvegarde cloud et Premium.</Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 30, gap: 10 },
  heroIc: { width: 72, height: 72, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 15, textAlign: 'center', lineHeight: 21, maxWidth: 300 },
  table: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'transparent' },
  th: { flex: 1, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  td: { flex: 1, fontSize: 13, textAlign: 'center' },
  ok: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14 },
});
