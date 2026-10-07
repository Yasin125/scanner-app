import { useColorScheme } from 'react-native';

import { useSettings } from './store';

const light = {
  dark: false,
  bg: '#F5F6FA',
  card: '#FFFFFF',
  card2: '#F0F2F7',
  line: '#E6E9F0',
  txt: '#0F172A',
  mut: '#64748B',
  primary: '#4F46E5',
  primary2: '#7C3AED',
  onPrimary: '#FFFFFF',
  danger: '#E5484D',
  success: '#16A34A',
  tabBar: '#FFFFFF',
  shadow: 'rgba(15,23,42,0.08)',
};

const dark: typeof light = {
  dark: true,
  bg: '#0B0D12',
  card: '#151821',
  card2: '#1E2230',
  line: '#262B3A',
  txt: '#F1F5F9',
  mut: '#94A3B8',
  primary: '#6366F1',
  primary2: '#8B5CF6',
  onPrimary: '#FFFFFF',
  danger: '#FF6369',
  success: '#22C55E',
  tabBar: '#12151D',
  shadow: 'rgba(0,0,0,0.4)',
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
export const TAB_SPACE = 24;
