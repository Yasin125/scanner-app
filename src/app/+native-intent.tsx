/**
 * Files opened with ScanFacile from another app ("Ouvrir avec…", Files, Mail, WhatsApp…) arrive as
 * file:// or content:// URLs: send them to the import screen instead of treating them as routes.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (/^(file|content):\/\//i.test(path)) return `/ouvrir?uri=${encodeURIComponent(path)}`;
    return path;
  } catch {
    return '/';
  }
}
