import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { PillButton } from '@/components/PillButton';
import { PhotoGrid } from '@/components/PhotoGrid';
import { Display, Label } from '@/components/ui';
import { colors, fonts } from '@/theme/tokens';
import { type Photo } from '@/lib/api';
import { getFindMeResult } from '@/lib/store';

/** Step 5 - "You're in N photos" result, rendered from the live find-me call. */
export default function MeScreen() {
  const { slug, selfie } = useLocalSearchParams<{
    slug?: string;
    selfie?: string;
  }>();
  const eventSlug = slug ?? '';
  const result = getFindMeResult(eventSlug);

  let photos: Photo[] = [];
  let headline = 'No match yet';
  let sub: string | null = null;
  let matchLabel: string | null = null;

  if (result?.status === 'ok') {
    photos = result.photos;
    headline = `You are in ${result.count} photos`;
    if (result.match?.score != null) {
      matchLabel = `${Math.round(result.match.score * 100)}% match`;
    } else {
      matchLabel = 'Match found';
    }
  } else if (result?.status === 'no_match') {
    headline = 'No photos found yet';
    sub = 'We could not find a face match. Try another selfie as more photos arrive.';
  } else if (result?.status === 'not_implemented') {
    headline = 'Face matching is warming up';
    sub = result.note;
  } else {
    headline = 'No match yet';
    sub = 'Take a selfie from the gallery to find your photos.';
  }

  return (
    <Screen edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          {selfie ? (
            <View style={styles.avatarRing}>
              <Image
                source={{ uri: selfie }}
                style={styles.avatar}
                contentFit="cover"
                accessible
                accessibilityRole="image"
                accessibilityLabel="Your selfie"
              />
            </View>
          ) : null}
          {matchLabel ? (
            <Label color={colors.lime} style={{ marginTop: 12 }}>
              {matchLabel}
            </Label>
          ) : null}
          <Display size={24} style={{ marginTop: 4 }}>
            {headline}
          </Display>
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
          {photos.length ? (
            <PillButton
              label="Download all"
              size="sm"
              trailing={<Text style={{ color: colors.ink }}>{'↓'}</Text>}
              onPress={() => {}}
              style={{ marginTop: 16, alignSelf: 'center', paddingHorizontal: 24 }}
            />
          ) : null}
        </View>

        {photos.length ? (
          <View style={styles.grid}>
            <PhotoGrid photos={photos} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 96 },
  head: { alignItems: 'center', paddingTop: 8 },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 6,
    backgroundColor: colors.fillStrong,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 42,
    borderWidth: 2,
    borderColor: colors.lime,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
    lineHeight: 19,
  },
  grid: { marginTop: 24 },
});
