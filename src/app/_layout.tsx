import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { loadDocs } from '../lib/store';
import { useTheme } from '../lib/theme';

export default function RootLayout() {
  const t = useTheme();

  useEffect(() => {
    loadDocs();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.card },
          headerTintColor: t.txt,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'ScanFacile', headerShown: false }} />
        <Stack.Screen name="doc/[id]" options={{ title: 'Document' }} />
        <Stack.Screen name="page/[id]" options={{ title: 'Page', presentation: 'fullScreenModal', headerShown: false }} />
        <Stack.Screen name="ocr/[id]" options={{ title: 'Texte extrait' }} />
      </Stack>
    </>
  );
}
