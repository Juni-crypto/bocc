import { StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/theme/tokens';

const ICONS: Record<string, string> = {
  gallery: '▦', // ▦
  search: '\u{1F50D}',
  add: '＋', // ＋
  me: '\u{1F642}',
};

/** Bottom tab bar for the pooled gallery flow, matching the mockup. */
export default function EventTabsLayout() {
  const insets = useSafeAreaInsets();
  // Lift the bar above the home indicator and give it a real 44pt+ tap row.
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.bar,
          { height: 60 + bottomPad, paddingBottom: bottomPad },
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
          tabBarIcon: tabIcon('gallery'),
          tabBarAccessibilityLabel: 'Gallery',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: tabIcon('search'),
          tabBarAccessibilityLabel: 'Search',
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: tabIcon('add'),
          tabBarAccessibilityLabel: 'Add photos',
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarIcon: tabIcon('me'),
          tabBarAccessibilityLabel: 'My photos',
        }}
      />
      {/* flow screen that lives under the event but is hidden from the tab bar */}
      <Tabs.Screen name="selfie" options={{ href: null }} />
    </Tabs>
  );
}

function tabIcon(key: string) {
  return ({ color }: { color: string }) => (
    <View style={styles.icon} accessible={false}>
      <Text style={{ color, fontSize: 16 }} accessibilityElementsHidden>
        {ICONS[key]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.hairlineStrong,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  item: { paddingVertical: 4 },
  barLabel: { fontFamily: fonts.body, fontSize: 11 },
  icon: { minWidth: 44, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
});
