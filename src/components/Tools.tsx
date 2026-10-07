import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCapture } from '../lib/flows';
import { getSettings, updateSettings } from '../lib/store';
import { useTheme } from '../lib/theme';
import { type IconName, useUI } from './ui';

export type Tool = { key: string; label: string; icon: IconName; color: string; onPress?: () => void };

export function useTools() {
  const ui = useUI();
  const cap = useCapture();

  const watermark = async () => {
    const v = await ui.prompt('Filigrane ajouté à tous les PDF (vide = aucun)', getSettings().watermark, 'Ex. : COPIE');
    if (v === null) return;
    await updateSettings({ watermark: v.trim() });
    ui.toast(v.trim() ? `Filigrane « ${v.trim()} » activé` : 'Filigrane désactivé');
  };

  const t: Record<string, Tool> = {
    scan: { key: 'scan', label: 'Scan intelligent', icon: 'scan-outline', color: '#3D6BFF', onPress: () => cap.scan() },
    id: { key: 'id', label: "Carte d'identité", icon: 'card-outline', color: '#12B886', onPress: cap.idCard },
    ocr: { key: 'ocr', label: 'Extraire le texte', icon: 'text-outline', color: '#F59F00', onPress: cap.extractText },
    idPhoto: { key: 'idPhoto', label: "Photo d'identité", icon: 'person-outline', color: '#4C6EF5' },
    book: { key: 'book', label: 'Livre', icon: 'book-outline', color: '#15AABF' },
    board: { key: 'board', label: 'Tableau blanc', icon: 'easel-outline', color: '#20C997', onPress: () => cap.scan() },
    images: { key: 'images', label: 'Importer images', icon: 'images-outline', color: '#4DABF7', onPress: () => cap.importImages() },
    files: { key: 'files', label: 'Importer fichiers', icon: 'folder-open-outline', color: '#5C7CFA' },
    merge: { key: 'merge', label: 'Fusionner', icon: 'git-merge-outline', color: '#7950F2', onPress: () => router.push('/fusionner') },
    reorder: {
      key: 'reorder',
      label: 'Réorganiser pages',
      icon: 'swap-vertical-outline',
      color: '#228BE6',
      onPress: () => {
        router.push('/documents');
        ui.toast('Ouvrez un document puis touchez une page pour la déplacer');
      },
    },
    watermark: { key: 'watermark', label: 'Filigrane', icon: 'water-outline', color: '#3BC9DB', onPress: watermark },
    sign: { key: 'sign', label: 'Signer', icon: 'pencil-outline', color: '#40C057' },
    lock: { key: 'lock', label: 'Verrouiller', icon: 'lock-closed-outline', color: '#51CF66' },
    compress: { key: 'compress', label: 'Compresser', icon: 'contract-outline', color: '#4263EB' },
    toPdf: { key: 'toPdf', label: 'Images en PDF', icon: 'document-attach-outline', color: '#FA5252', onPress: () => cap.importImages() },
    toWord: { key: 'toWord', label: 'Vers Word', icon: 'document-text-outline', color: '#1C7ED6' },
    toExcel: { key: 'toExcel', label: 'Vers Excel', icon: 'grid-outline', color: '#2F9E44' },
    qr: { key: 'qr', label: 'QR code', icon: 'qr-code-outline', color: '#ADB5BD' },
    print: { key: 'print', label: 'Imprimer', icon: 'print-outline', color: '#63E6BE' },
    pdfTools: { key: 'pdfTools', label: 'Outils PDF', icon: 'document-outline', color: '#FA5252', onPress: () => router.push('/outils') },
    all: { key: 'all', label: 'Tout', icon: 'apps-outline', color: '#845EF7', onPress: () => router.push('/outils') },
  };
  return t;
}

export function ToolGrid({ tools }: { tools: Tool[] }) {
  const th = useTheme();
  const ui = useUI();
  return (
    <View style={s.grid}>
      {tools.map((tool) => {
        const soon = !tool.onPress;
        return (
          <Pressable
            key={tool.key}
            onPress={tool.onPress ?? (() => ui.toast(`« ${tool.label} » arrive bientôt`))}
            style={({ pressed }) => [s.cell, { opacity: pressed ? 0.6 : 1 }]}
          >
            <View style={[s.circle, { backgroundColor: th.dark ? tool.color + '22' : tool.color + '18' }]}>
              <Ionicons name={tool.icon} size={26} color={tool.color} />
              {soon && (
                <View style={[s.soon, { backgroundColor: th.card2 }]}>
                  <Text style={{ color: th.mut, fontSize: 8, fontWeight: '800' }}>BIENTÔT</Text>
                </View>
              )}
            </View>
            <Text style={[s.label, { color: soon ? th.mut : th.txt }]} numberOfLines={2}>
              {tool.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 },
  cell: { width: '25%', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
  circle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  soon: { position: 'absolute', top: -6, right: -14, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  label: { fontSize: 12.5, textAlign: 'center', fontWeight: '500', lineHeight: 16 },
});
