import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Field, PrimaryButton } from '../components/Form';
import { useUI } from '../components/ui';
import { deleteAccount, logout, updateProfile, useCloud } from '../lib/cloud';
import { formatSize, useTheme } from '../lib/theme';

/** Gestion du compte : nom, mot de passe, déconnexion, suppression. */
export default function Profil() {
  const t = useTheme();
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const { account } = useCloud();
  const [name, setName] = useState(account?.name ?? '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  if (!account) return null;

  async function run(key: string, fn: () => Promise<unknown>, done: string) {
    setError(undefined);
    setBusy(key);
    try {
      await fn();
      ui.toast(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  function confirmDelete() {
    ui.sheet({
      title: 'Supprimer le compte et tous les documents du cloud ? Les documents restent sur ce téléphone.',
      options: [
        {
          label: 'Supprimer définitivement',
          icon: 'trash-outline',
          destructive: true,
          onPress: async () => {
            const pwd = await ui.prompt('Confirmez avec votre mot de passe', '', 'Mot de passe');
            if (!pwd) return;
            await ui.busy('Suppression…', async () => {
              await deleteAccount(pwd);
              ui.toast('Compte supprimé');
              router.back();
            });
          },
        },
      ],
    });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 30, gap: 22 }} keyboardShouldPersistTaps="handled">
        <View style={[s.card, { backgroundColor: t.card, borderColor: t.line }]}>
          <Row t={t} label="E-mail" value={account.email} />
          <Row t={t} label="Abonnement" value={account.premium ? 'Premium' : 'Gratuit'} />
          <Row t={t} label="Cloud" value={`${formatSize(account.used)} / ${formatSize(account.quota)}`} />
          {account.created_at && <Row t={t} label="Membre depuis" value={new Date(account.created_at).toLocaleDateString('fr-FR')} last />}
        </View>

        <View style={{ gap: 12 }}>
          <Text style={[s.h, { color: t.txt }]}>Nom</Text>
          <Field label="Nom affiché" value={name} onChangeText={setName} />
          <PrimaryButton label="Enregistrer" loading={busy === 'name'} disabled={name.trim().length < 2 || name.trim() === account.name} onPress={() => run('name', () => updateProfile({ name: name.trim() }), 'Nom mis à jour')} />
        </View>

        <View style={{ gap: 12 }}>
          <Text style={[s.h, { color: t.txt }]}>Mot de passe</Text>
          <Field label="Mot de passe actuel" value={current} onChangeText={setCurrent} secure textContentType="password" />
          <Field label="Nouveau mot de passe" value={next} onChangeText={setNext} secure placeholder="8 caractères minimum" textContentType="newPassword" error={error} />
          <PrimaryButton
            label="Changer le mot de passe"
            loading={busy === 'pwd'}
            disabled={!current || next.length < 8}
            onPress={() => run('pwd', async () => (await updateProfile({ password: next, current_password: current }), setCurrent(''), setNext('')), 'Mot de passe modifié')}
          />
        </View>

        <View style={[s.card, { backgroundColor: t.card, borderColor: t.line }]}>
          <Pressable
            onPress={() => ui.busy('Déconnexion…', async () => (await logout(), router.back()))}
            style={({ pressed }) => [s.action, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="log-out-outline" size={20} color={t.txt} />
            <Text style={{ color: t.txt, fontSize: 16, fontWeight: '600' }}>Se déconnecter</Text>
          </Pressable>
          <Pressable onPress={confirmDelete} style={({ pressed }) => [s.action, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line, opacity: pressed ? 0.6 : 1 }]}>
            <Ionicons name="trash-outline" size={20} color={t.danger} />
            <Text style={{ color: t.danger, fontSize: 16, fontWeight: '600' }}>Supprimer mon compte</Text>
          </Pressable>
        </View>
        <Text style={{ color: t.mut, fontSize: 12, textAlign: 'center' }}>Vos documents restent sur ce téléphone après la déconnexion.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({ t, label, value, last }: { t: ReturnType<typeof useTheme>; label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line }]}>
      <Text style={{ color: t.mut }}>{label}</Text>
      <Text style={{ color: t.txt, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  h: { fontSize: 18, fontWeight: '700' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
});
