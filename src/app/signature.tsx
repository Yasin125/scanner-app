import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pathsBox, SignaturePad, SignatureView } from '../components/Signature';
import { Button, useUI } from '../components/ui';
import { updateSettings, useSettings } from '../lib/store';
import { useTheme } from '../lib/theme';

export default function SignatureScreen() {
  const t = useTheme();
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const [paths, setPaths] = useState<string[]>([]);
  const [pad, setPad] = useState(0);

  async function save() {
    await updateSettings({ signature: paths, signatureBox: pathsBox(paths) });
    ui.toast('Signature enregistrée');
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, padding: 16, paddingBottom: insets.bottom + 16, gap: 14 }}>
      {settings.signature.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={{ color: t.mut }}>Signature actuelle</Text>
          <View style={[s.current, { backgroundColor: '#fff' }]}>
            <SignatureView paths={settings.signature} box={settings.signatureBox} />
          </View>
        </View>
      )}
      <Text style={{ color: t.mut }}>Signez avec le doigt dans le cadre blanc :</Text>
      <SignaturePad key={pad} onChange={setPaths} style={{ flex: 1, minHeight: 220 }} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button
          label="Effacer"
          icon="refresh"
          variant="ghost"
          style={{ flex: 1 }}
          onPress={() => {
            setPaths([]);
            setPad(pad + 1);
          }}
        />
        <Button label="Enregistrer" icon="checkmark" disabled={!paths.length} style={{ flex: 1.6 }} onPress={save} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  current: { height: 90, borderRadius: 12, padding: 8 },
});
