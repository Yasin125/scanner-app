# ScanFacile

Scanner de documents (Android + iOS) — Expo / React Native / TypeScript.

## Fonctionnalités (v1)
- Scan avec détection automatique des bords, recadrage et filtres (ML Kit sur Android, VisionKit sur iOS)
- Import depuis la galerie
- Documents multi-pages : ajout, réorganisation, suppression de pages
- Export PDF A4 (couleur, gris, noir & blanc) et partage
- OCR hors ligne (reconnaissance du texte), recherche dans le texte
- Renommer / supprimer, mode sombre

## Démarrer
```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform android   # build de dev (Expo Go ne suffit pas : modules natifs)
npx expo start --dev-client
```

## Publier
```bash
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --platform android
npx eas-cli@latest submit --platform ios
```
