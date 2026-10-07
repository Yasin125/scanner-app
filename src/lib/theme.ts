import { useColorScheme } from 'react-native';

const light = {
  bg: '#F4F6FB',
  card: '#FFFFFF',
  line: '#E3E7F0',
  txt: '#111827',
  mut: '#6B7280',
  primary: '#1E5EFF',
  onPrimary: '#FFFFFF',
  danger: '#E5484D',
};

const dark: typeof light = {
  bg: '#0B1020',
  card: '#151B2E',
  line: '#252D45',
  txt: '#F3F4F6',
  mut: '#9CA3AF',
  primary: '#4C7DFF',
  onPrimary: '#FFFFFF',
  danger: '#FF6369',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
