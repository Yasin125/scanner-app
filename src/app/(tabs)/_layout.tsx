import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { IconName } from '../../components/ui';
import { useCapture } from '../../lib/flows';
import { useTheme } from '../../lib/theme';

const TABS: Record<string, { label: string; icon: IconName; iconOn: IconName }> = {
  index: { label: 'Accueil', icon: 'home-outline', iconOn: 'home' },
  documents: { label: 'Fichiers', icon: 'folder-outline', iconOn: 'folder' },
  outils: { label: 'Outils', icon: 'apps-outline', iconOn: 'apps' },
  moi: { label: 'Compte', icon: 'person-circle-outline', iconOn: 'person-circle' },
};

/** Docked tab bar with a raised camera button in the middle. */
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
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        onPress={() => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!on && !e.defaultPrevented) navigation.navigate(route.name);
        }}
        style={s.tab}
      >
        <Ionicons name={on ? conf.iconOn : conf.icon} size={24} color={on ? t.primary : t.mut} />
        <Text style={[s.tabLabel, { color: on ? t.primary : t.mut, fontWeight: on ? '700' : '500' }]} numberOfLines={1}>
          {conf.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[s.bar, { backgroundColor: t.tabBar, borderTopColor: t.line, paddingBottom: Math.max(insets.bottom, 8) }]}>
      {item(0)}
      {item(1)}
      <View style={s.fabSlot}>
        <Pressable
          accessibilityLabel="Scanner un document"
          onPress={() => cap.scan()}
          style={({ pressed }) => [s.fab, { borderColor: t.tabBar, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
        >
          <LinearGradient colors={[t.primary, t.primary2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fabInner}>
            <Ionicons name="scan" size={28} color="#fff" />
          </LinearGradient>
        </Pressable>
      </View>
      {item(2)}
      {item(3)}
    </View>
  );
}

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="documents" />
      <Tabs.Screen name="outils" />
      <Tabs.Screen name="moi" />
    </Tabs>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingTop: 2 },
  tabLabel: { fontSize: 11 },
  fabSlot: { width: 76, alignItems: 'center' },
  fab: {
    marginTop: -30,
    borderRadius: 36,
    borderWidth: 5,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  fabInner: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
