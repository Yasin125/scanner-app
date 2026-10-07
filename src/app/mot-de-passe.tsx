import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Field, PrimaryButton } from '../components/Form';
import { useUI } from '../components/ui';
import { forgotPassword, resetPassword } from '../lib/cloud';
import { useTheme } from '../lib/theme';

/** Mot de passe oublié : envoi d'un code par e-mail puis choix d'un nouveau mot de passe. */
export default function MotDePasse() {
  const params = useLocalSearchParams<{ email?: string }>();
  const t = useTheme();
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState(params.email ?? '');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setError(undefined);
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24, gap: 18 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: t.txt, fontSize: 26, fontWeight: '800' }}>{sent ? 'Vérifiez vos e-mails' : 'Mot de passe oublié'}</Text>
        <Text style={{ color: t.mut, fontSize: 15, lineHeight: 21 }}>
          {sent ? `Si un compte existe pour ${email}, un code à 6 chiffres vient d’être envoyé (pensez aux spams).` : 'Indiquez votre e-mail : nous vous enverrons un code de réinitialisation.'}
        </Text>

        {!sent ? (
          <>
            <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={error} />
            <PrimaryButton label="Envoyer le code" loading={loading} disabled={!email.includes('@')} onPress={() => run(async () => (await forgotPassword(email.trim()), setSent(true)))} />
          </>
        ) : (
          <>
            <Field label="Code reçu" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="123456" autoComplete="one-time-code" textContentType="oneTimeCode" />
            <Field label="Nouveau mot de passe" value={password} onChangeText={setPassword} secure placeholder="8 caractères minimum" textContentType="newPassword" error={error} />
            <PrimaryButton
              label="Changer le mot de passe"
              loading={loading}
              disabled={code.length < 6 || password.length < 8}
              onPress={() =>
                run(async () => {
                  await resetPassword(email.trim(), code.trim(), password);
                  ui.toast('Mot de passe modifié, vous êtes connecté');
                  router.dismissAll();
                })
              }
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
