import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '@/theme/tokens';

type IconName = keyof typeof Ionicons.glyphMap;

/** Bottom tab bar for the pooled gallery flow: real icons + a raised lime camera. */
export default function EventTabsLayout() {
  const insets = useSafeAreaInsets();
  // Lift the bar above the home indicator and keep a real 44pt+ tap row.
  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.bar,
          { height: 64 + bottomPad, paddingBottom: bottomPad },
        ],
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: styles.barLabel,
        tabBarItemStyle: styles.item,
        sceneStyle: { backgroundColor: colors.ink },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Gallery',
          tabBarIcon: tabIcon('images-outline', 'images'),
          tabBarAccessibilityLabel: 'Gallery',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: tabIcon('search-outline', 'search'),
          tabBarAccessibilityLabel: 'Search',
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarIcon: cameraIcon,
          tabBarAccessibilityLabel: 'Add photos',
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'People',
          tabBarIcon: tabIcon('people-outline', 'people'),
          tabBarAccessibilityLabel: 'My photos',
        }}
      />
      {/* flow screens that live under the event but are hidden from the tab bar */}
      <Tabs.Screen name="selfie" options={{ href: null }} />
      <Tabs.Screen name="person/[personId]" options={{ href: null }} />
    </Tabs>
  );
}

/** Standard tab: outline when idle, filled when active. */
function tabIcon(idle: IconName, active: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <View style={styles.icon} accessible={false}>
      <Ionicons name={focused ? active : idle} size={24} color={color} />
    </View>
  );
}

/** Center action: a raised filled lime circle that pops above the bar. */
function cameraIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.cameraWrap} accessible={false}>
      <View style={[styles.cameraDisc, focused && styles.cameraDiscActive]}>
        <Ionicons name="camera" size={26} color={colors.ink} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.hairlineStrong,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    elevation: 0,
  },
  item: { paddingVertical: 4 },
  barLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  icon: {
    minWidth: 44,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraWrap: {
    minWidth: 56,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    // Raise the disc so it pops above the bar's top hairline.
    marginTop: -22,
  },
  cameraDisc: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lime,
    borderWidth: 4,
    borderColor: colors.ink,
    ...Platform.select({
      ios: {
        shadowColor: colors.lime,
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 8 },
    }),
  },
  cameraDiscActive: { transform: [{ scale: 1.04 }] },
});
