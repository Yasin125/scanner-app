import { useColorScheme } from 'react-native';

import { useSettings } from './store';

const light = {
  dark: false,
  bg: '#F2F3F7',
  card: '#FFFFFF',
  card2: '#ECEEF3',
  line: '#E3E6EE',
  txt: '#111827',
  mut: '#6B7280',
  primary: '#3D6BFF',
  primary2: '#7B4DFF',
  onPrimary: '#FFFFFF',
  danger: '#E5484D',
  tabBar: 'rgba(255,255,255,0.96)',
};

const dark: typeof light = {
  dark: true,
  bg: '#0E0E10',
  card: '#1C1C1F',
  card2: '#26262A',
  line: '#2E2E33',
  txt: '#F4F4F5',
  mut: '#9A9AA3',
  primary: '#5B82FF',
  primary2: '#8E66FF',
  onPrimary: '#FFFFFF',
  danger: '#FF6369',
  tabBar: 'rgba(30,30,34,0.97)',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  const system = useColorScheme();
  const { theme } = useSettings();
  const mode = theme === 'auto' ? system : theme;
  return mode === 'dark' ? dark : light;
}

export function formatDate(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(0, Math.round(bytes / 1024))} Ko`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} Mo`;
  return `${(bytes / 1024 ** 3).toFixed(2)} Go`;
}

/** Bottom space reserved for the floating tab bar. */
export const TAB_SPACE = 130;
