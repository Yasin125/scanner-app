import { ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SUPPORT_EMAIL } from '../lib/cloud';
import { useTheme } from '../lib/theme';

const SECTIONS: [string, string][] = [
  ['Vos documents', 'Les documents que vous numérisez sont enregistrés sur votre téléphone. Sans compte, rien n’est envoyé sur Internet. La reconnaissance du texte (OCR) est effectuée sur l’appareil.'],
  ['Sauvegarde cloud', 'Si vous créez un compte, vos documents sont copiés sur nos serveurs situés en Europe afin de les synchroniser entre vos appareils. Ils ne sont ni consultés, ni analysés, ni revendus.'],
  ['Données de compte', 'Nous conservons votre nom, votre e-mail, un mot de passe chiffré et la date de dernière connexion. L’e-mail sert uniquement à la connexion et à la réinitialisation du mot de passe.'],
  ['Caméra, photos et Face ID', 'La caméra et la galerie servent uniquement à numériser ou importer vos documents. Face ID / le code de l’appareil protège les documents que vous verrouillez ; nous n’y avons jamais accès.'],
  ['Suppression', 'Vous pouvez supprimer votre compte à tout moment depuis Compte → votre profil → « Supprimer mon compte ». Toutes les données du cloud sont alors effacées immédiatement.'],
  ['Contact', `Pour toute question : ${SUPPORT_EMAIL}`],
];

export default function Confidentialite() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 30, gap: 18 }}>
      {SECTIONS.map(([h, p]) => (
        <Text key={h} style={{ color: t.mut, fontSize: 15, lineHeight: 22 }}>
          <Text style={{ color: t.txt, fontWeight: '700', fontSize: 16 }}>{h}{'\n'}</Text>
          {p}
        </Text>
      ))}
    </ScrollView>
  );
}
