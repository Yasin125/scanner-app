import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Field, PrimaryButton } from '../components/Form';
import { useUI } from '../components/ui';
import { login, register } from '../lib/cloud';
import { useTheme } from '../lib/theme';

/** Connexion / création de compte. */
export default function CompteScreen() {
  const params = useLocalSearchParams<{ mode?: 'login' | 'register' }>();
  const t = useTheme();
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'login' | 'register'>(params.mode ?? 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';
  const valid = email.includes('@') && password.length >= (isRegister ? 8 : 1) && (!isRegister || name.trim().length > 1);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const user = isRegister ? await register(name.trim(), email.trim(), password) : await login(email.trim(), password);
      ui.toast(isRegister ? `Bienvenue ${user.name} !` : `Bon retour, ${user.name}`);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24, gap: 18 }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={[t.primary, t.primary2]} style={s.logo}>
          <Ionicons name="scan" size={30} color="#fff" />
        </LinearGradient>
        <View style={{ gap: 6 }}>
          <Text style={[s.title, { color: t.txt }]}>{isRegister ? 'Créer votre compte' : 'Bon retour !'}</Text>
          <Text style={{ color: t.mut, fontSize: 15, lineHeight: 21 }}>
            {isRegister ? 'Sauvegardez vos documents dans le cloud et retrouvez-les partout.' : 'Connectez-vous pour synchroniser vos documents.'}
          </Text>
        </View>

        <View style={[s.segment, { backgroundColor: t.card2 }]}>
          {(['login', 'register'] as const).map((m) => (
            <Pressable key={m} onPress={() => (setMode(m), setError(null))} style={[s.segItem, mode === m && { backgroundColor: t.card }]}>
              <Text style={{ color: mode === m ? t.txt : t.mut, fontWeight: '700' }}>{m === 'login' ? 'Connexion' : 'Inscription'}</Text>
            </Pressable>
          ))}
        </View>

        {isRegister && <Field label="Nom complet" value={name} onChangeText={setName} placeholder="Prénom Nom" autoComplete="name" textContentType="name" />}
        <Field
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="vous@exemple.fr"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <Field
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          placeholder={isRegister ? '8 caractères minimum' : 'Votre mot de passe'}
          secure
          autoComplete={isRegister ? 'new-password' : 'password'}
          textContentType={isRegister ? 'newPassword' : 'password'}
          onSubmitEditing={() => valid && submit()}
        />

        {error && (
          <View style={[s.error, { backgroundColor: t.danger + '18' }]}>
            <Ionicons name="alert-circle" size={18} color={t.danger} />
            <Text style={{ color: t.danger, flex: 1 }}>{error}</Text>
          </View>
        )}

        <PrimaryButton label={isRegister ? 'Créer mon compte' : 'Se connecter'} onPress={submit} loading={loading} disabled={!valid} />

        {!isRegister && (
          <Pressable onPress={() => router.push({ pathname: '/mot-de-passe', params: { email } })} style={{ alignSelf: 'center' }}>
            <Text style={{ color: t.primary, fontWeight: '600' }}>Mot de passe oublié ?</Text>
          </Pressable>
        )}

        <Text style={{ color: t.mut, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
          En continuant, vous acceptez notre{' '}
          <Text style={{ color: t.primary }} onPress={() => router.push('/confidentialite')}>
            politique de confidentialité
          </Text>
          .
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  logo: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12 },
});
