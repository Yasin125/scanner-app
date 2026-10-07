import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { UIProvider } from '../components/ui';
import { loadAll } from '../lib/store';
import { useTheme } from '../lib/theme';

export default function RootLayout() {
  const t = useTheme();

  useEffect(() => {
    loadAll();
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
        </Stack>
      </UIProvider>
    </SafeAreaProvider>
  );
}
