import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { UIProvider } from '../components/ui';
import { initCloud } from '../lib/cloud';
import { loadAll } from '../lib/store';
import { useTheme } from '../lib/theme';

export default function RootLayout() {
  const t = useTheme();

  useEffect(() => {
    loadAll().then(initCloud);
  }, []);

  return (
    <SafeAreaProvider>
      <UIProvider>
        <StatusBar style={t.dark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: t.bg },
            headerTintColor: t.txt,
            headerTitleStyle: { fontWeight: '700' },
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: t.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="doc/[id]" options={{ title: 'Document' }} />
          <Stack.Screen name="folder/[id]" options={{ title: 'Dossier' }} />
          <Stack.Screen name="fusionner" options={{ title: 'Fusionner des documents', presentation: 'modal' }} />
          <Stack.Screen name="page/[id]" options={{ title: 'Page', presentation: 'fullScreenModal', headerShown: false }} />
          <Stack.Screen name="ocr/[id]" options={{ title: 'Texte extrait' }} />
          <Stack.Screen name="compte" options={{ title: '', presentation: 'modal' }} />
          <Stack.Screen name="mot-de-passe" options={{ title: 'Mot de passe' }} />
          <Stack.Screen name="profil" options={{ title: 'Mon compte' }} />
          <Stack.Screen name="premium" options={{ title: 'Premium', presentation: 'modal' }} />
          <Stack.Screen name="confidentialite" options={{ title: 'Confidentialité' }} />
          <Stack.Screen name="ouvrir" options={{ headerShown: false }} />
          <Stack.Screen name="signature" options={{ title: 'Ma signature', presentation: 'modal' }} />
          <Stack.Screen name="signer/[id]" options={{ title: 'Signer' }} />
          <Stack.Screen name="choisir" options={{ title: 'Choisir un document' }} />
          <Stack.Screen name="recadrer/[id]" options={{ headerShown: false, presentation: 'fullScreenModal', contentStyle: { backgroundColor: '#000' } }} />
          <Stack.Screen name="camera" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: '#000' } }} />
        </Stack>
      </UIProvider>
    </SafeAreaProvider>
  );
}
