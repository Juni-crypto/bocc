import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { RecDot } from '@/components/RecDot';
import { PillButton } from '@/components/PillButton';
import { Display, Label } from '@/components/ui';
import { colors, fonts } from '@/theme/tokens';
import { Text } from 'react-native';

/**
 * Entry chooser. Guests scan/join; hosts create. Mirrors the two flow lanes
 * in the mockup (host create/manage and the guest journey).
 */
export default function Home() {
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <View style={styles.mark} accessible={false}>
            <View style={styles.markDot} accessible={false}>
              <RecDot label="" color={colors.ink} />
            </View>
          </View>
          <Display size={30}>BOCC</Display>
        </View>

        <Label style={{ marginTop: 18 }}>Be our camera crew</Label>
        <Text style={styles.tag}>
          Everyone at the event becomes the crew. Scan a QR, drop your shots,
          and AI finds every photo you are in.
        </Text>

        <View style={styles.actions}>
          <PillButton
            label="Join an event"
            trailing={<Arrow />}
            onPress={() =>
              router.push({
                pathname: '/join/[slug]',
                params: { slug: 'aisha-dev-sangeet' },
              })
            }
          />
          <PillButton
            label="Host an event"
            variant="ghost"
            onPress={() => router.push('/host/create')}
          />
        </View>

        <View style={styles.live}>
          <RecDot label="LIVE" />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Arrow() {
  return (
    <Text
      style={{ color: colors.ink, fontSize: 15 }}
      accessibilityElementsHidden
    >
      {'↗'}
    </Text>
  );
}

const styles = StyleSheet.create({
  body: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markDot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    marginTop: 10,
    maxWidth: 320,
  },
  actions: { marginTop: 32, gap: 12 },
  live: { marginTop: 28 },
});
