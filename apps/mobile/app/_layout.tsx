import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts as useSpaceGrotesk,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
} from '@expo-google-fonts/hanken-grotesk';
import { colors, radius } from '@/theme/tokens';
import { AuthProvider } from '@/lib/auth';
import { hasOnboarded } from '@/lib/store';
import { Onboarding } from '@/components/Onboarding';

export default function RootLayout() {
  const [loaded] = useSpaceGrotesk({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
  });

  useEffect(() => {
    // fonts gate render below; nothing else to do
  }, [loaded]);

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: colors.ink }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: colors.ink },
            }}
          />
          <OnboardingLayer />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Owns the guided-tour overlay: shows it once on first launch, and renders a
 * subtle floating "?" button so guests can replay the tour anytime. Sits above
 * the navigator so it spotlights the whole app.
 */
function OnboardingLayer() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [showTour, setShowTour] = useState(false);

  // Only show the floating help on the home screen so it never overlaps the
  // event tab bar or other screen controls.
  const onHome = pathname === '/' || pathname === '/index';

  // First-run check. hasOnboarded() resolves false the first time around.
  useEffect(() => {
    let alive = true;
    hasOnboarded().then((done) => {
      if (alive && !done) setShowTour(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      {onHome && (
        <Pressable
          onPress={() => setShowTour(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Replay the guided tour"
          style={({ pressed }) => [
            styles.help,
            { bottom: insets.bottom + 16 },
            pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
          ]}
        >
          <Ionicons name="help" size={20} color={colors.text} />
        </Pressable>
      )}

      <Onboarding visible={showTour} onClose={() => setShowTour(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  help: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
});
