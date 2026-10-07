import Constants, { ExecutionEnvironment } from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { pageUri, type PdfColor, type ScanDoc } from './store';

/** Expo Go has no scanner/OCR native modules: preview mode with a plain camera fallback. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Opens the native scanner (edge detection, crop, filters). Returns image paths, or [] if cancelled. */
export async function scanPages(opts: { max?: number } = {}): Promise<string[]> {
  if (isExpoGo) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return [];
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
    return res.canceled ? [] : res.assets.map((a) => a.uri);
  }
  // Loaded lazily: importing it in Expo Go would crash.
  const { default: DocumentScanner, ResponseType, ScanDocumentResponseStatus } =
    require('react-native-document-scanner-plugin') as typeof import('react-native-document-scanner-plugin');
  const res = await DocumentScanner.scanDocument({
    croppedImageQuality: 90,
    maxNumDocuments: opts.max,
    responseType: ResponseType.ImageFilePath,
  });
  if (res.status === ScanDocumentResponseStatus.Cancel) return [];
  return res.scannedImages ?? [];
}

export async function pickImages(): Promise<string[]> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 0.9,
  });
  if (res.canceled) return [];
  return res.assets.map((a) => a.uri);
}

const CSS_FILTER: Record<PdfColor, string> = {
  color: 'none',
  gray: 'grayscale(1)',
  bw: 'grayscale(1) contrast(2.2) brightness(1.15)',
};

function safeName(title: string) {
  return title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'document';
}

export async function exportPdf(doc: ScanDoc) {
  const imgs = await Promise.all(
    doc.pages.map(async (p) => `data:image/jpeg;base64,${await new File(pageUri(doc, p)).base64()}`),
  );
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { margin: 0; }
    html, body { margin: 0; padding: 0; }
    .page { width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center;
            page-break-after: always; overflow: hidden; }
    .page:last-child { page-break-after: auto; }
    img { max-width: 100%; max-height: 100%; object-fit: contain; filter: ${CSS_FILTER[doc.pdfColor]}; }
  </style></head><body>
  ${imgs.map((src) => `<div class="page"><img src="${src}" /></div>`).join('')}
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 }); // A4 in points
  const out = new File(Paths.cache, `${safeName(doc.title)}.pdf`);
  if (out.exists) out.delete();
  new File(uri).moveSync(out);
  return out.uri;
}

export async function sharePdf(doc: ScanDoc) {
  const uri = await exportPdf(doc);
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: doc.title });
}

export async function shareImage(uri: string) {
  await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg' });
}

export async function recognizeText(doc: ScanDoc) {
  if (isExpoGo) throw new Error('La reconnaissance du texte n’est pas disponible dans l’aperçu Expo Go.');
  const { default: TextRecognition } =
    require('@react-native-ml-kit/text-recognition') as typeof import('@react-native-ml-kit/text-recognition');
  const parts: string[] = [];
  for (const p of doc.pages) {
    const res = await TextRecognition.recognize(pageUri(doc, p));
    parts.push(res.text.trim());
  }
  return parts
    .map((t, i) => (doc.pages.length > 1 ? `— Page ${i + 1} —\n${t}` : t))
    .join('\n\n')
    .trim();
}
