import { File } from 'expo-file-system';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useTheme } from '../lib/theme';

const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';

/** pdf.js page renderer for Android, whose WebView cannot display PDFs natively. */
function pdfJsHtml(base64: string, bg: string) {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes">
<style>html,body{margin:0;background:${bg}}canvas{display:block;width:calc(100% - 16px);margin:8px auto;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.4)}
#err{color:#f66;font:14px sans-serif;padding:20px;text-align:center}</style>
<script src="${PDFJS}/pdf.min.js"></script></head><body><div id="pages"></div><script>
(async function () {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '${PDFJS}/pdf.worker.min.js';
    const raw = atob('${base64}');
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const width = document.body.clientWidth - 16;
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: (width / base.width) * (window.devicePixelRatio || 2) });
      const c = document.createElement('canvas');
      c.width = vp.width; c.height = vp.height;
      document.getElementById('pages').appendChild(c);
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    }
  } catch (e) {
    document.body.innerHTML = '<div id="err">Impossible d’afficher ce PDF (connexion Internet requise pour la première ouverture).</div>';
  }
})();
</script></body></html>`;
}

export function PdfViewer({ uri }: { uri: string }) {
  const t = useTheme();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    new File(uri)
      .base64()
      .then((b64) => setHtml(pdfJsHtml(b64, t.bg)))
      .catch(() => setError(true));
  }, [uri, t.bg]);

  if (Platform.OS === 'ios') {
    // WKWebView renders PDFs natively (zoom, scroll, text selection).
    const dir = uri.slice(0, uri.lastIndexOf('/') + 1);
    return (
      <WebView
        source={{ uri }}
        originWhitelist={['*']}
        allowFileAccess
        allowingReadAccessToURL={dir}
        style={{ flex: 1, backgroundColor: t.bg }}
      />
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: t.mut }}>Impossible de lire ce PDF.</Text>
      </View>
    );
  }
  if (!html) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={t.primary} />
      </View>
    );
  }
  return <WebView source={{ html, baseUrl: 'https://localhost/' }} originWhitelist={['*']} javaScriptEnabled style={{ flex: 1, backgroundColor: t.bg }} />;
}
