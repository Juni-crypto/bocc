import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import { colors } from '@/theme/tokens';
import { AuthProvider } from '@/lib/auth';

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
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
