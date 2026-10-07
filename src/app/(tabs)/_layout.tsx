import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { IconName } from '../../components/ui';
import { useCapture } from '../../lib/flows';
import { useTheme } from '../../lib/theme';

const TABS: Record<string, { label: string; icon: IconName; iconOn: IconName }> = {
  index: { label: 'Accueil', icon: 'home-outline', iconOn: 'home' },
  documents: { label: 'Documents', icon: 'document-text-outline', iconOn: 'document-text' },
  outils: { label: 'Outils', icon: 'grid-outline', iconOn: 'grid' },
  moi: { label: 'Moi', icon: 'person-outline', iconOn: 'person' },
};

/** Floating pill tab bar with a centered camera button. */
function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const t = useTheme();
  const cap = useCapture();

  const item = (index: number) => {
    const route = state.routes[index];
    const conf = TABS[route.name];
    if (!conf) return null;
    const on = state.index === index;
    return (
      <Pressable
        key={route.key}
        onPress={() => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!on && !e.defaultPrevented) navigation.navigate(route.name);
        }}
        style={[s.tab, on && { backgroundColor: t.card2 }]}
      >
        <Ionicons name={on ? conf.iconOn : conf.icon} size={22} color={on ? t.primary : t.txt} />
        <Text style={[s.tabLabel, { color: on ? t.primary : t.txt }]} numberOfLines={1}>
          {conf.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={[s.bar, { backgroundColor: t.tabBar, borderColor: t.line }]}>
        {item(0)}
        {item(1)}
        <View style={s.fabSlot} />
        {item(2)}
        {item(3)}
      </View>
      <Pressable
        onPress={() => cap.scan()}
        style={({ pressed }) => [s.fab, { bottom: Math.max(insets.bottom, 12) + 22, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
      >
        <LinearGradient colors={[t.primary, t.primary2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fabInner}>
          <Ionicons name="camera" size={30} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.bg } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="documents" />
      <Tabs.Screen name="outils" />
      <Tabs.Screen name="moi" />
    </Tabs>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 14 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 560,
    borderRadius: 34,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 7, borderRadius: 26 },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  fabSlot: { width: 72 },
  fab: {
    position: 'absolute',
    borderRadius: 34,
    shadowColor: '#3D6BFF',
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  fabInner: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
});
