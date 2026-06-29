import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Slot, router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Label } from '@/components/ui';
import { colors, fonts, radius } from '@/theme/tokens';
import { useAuth } from '@/lib/auth';

/**
 * Super-admin shell. Guards the whole /admin subtree to ADMIN role, and hangs a
 * three-way segment nav across Overview / Events / Users at the top. Each child
 * screen renders inside this Screen so they share the ink + mesh backdrop.
 */

const TABS = [
  { href: '/admin', label: 'Overview', icon: 'grid-outline' as const, match: /^\/admin$/ },
  { href: '/admin/events', label: 'Events', icon: 'calendar-outline' as const, match: /^\/admin\/events/ },
  { href: '/admin/users', label: 'Users', icon: 'people-outline' as const, match: /^\/admin\/users/ },
];

export default function AdminLayout() {
  const { isAdmin, ready } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !isAdmin) router.replace('/');
  }, [ready, isAdmin]);

  // Hold the shell blank until we know the role, so non-admins never flash the
  // console before the redirect lands.
  if (!ready || !isAdmin) {
    return <Screen><View style={{ flex: 1 }} /></Screen>;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Label color={colors.lime}>Super admin</Label>
        <View style={styles.nav}>
          {TABS.map((t) => {
            const active = t.match.test(pathname);
            return (
              <Pressable
                key={t.href}
                onPress={() => router.replace(t.href as never)}
                style={[styles.tab, active && styles.tabOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t.label}
              >
                <Ionicons
                  name={t.icon}
                  size={15}
                  color={active ? colors.ink : colors.textMuted}
                />
                <Text style={[styles.tabTxt, active && styles.tabTxtOn]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 12,
  },
  nav: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    padding: 4,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
  },
  tabOn: { backgroundColor: colors.lime },
  tabTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
  },
  tabTxtOn: { color: colors.ink, fontFamily: fonts.bodySemibold },
});
