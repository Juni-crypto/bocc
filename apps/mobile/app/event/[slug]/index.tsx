import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { RecDot } from '@/components/RecDot';
import { PhotoGrid } from '@/components/PhotoGrid';
import { Display, Label } from '@/components/ui';
import { colors, fonts } from '@/theme/tokens';
import { api, type Photo } from '@/lib/api';
import { getMemberId } from '@/lib/store';

/** Step 4 - Pooled gallery, rendering real thumbUrl images from the live API. */
export default function GalleryScreen() {
  const { slug, memberId: memberIdParam } = useLocalSearchParams<{
    slug: string;
    memberId?: string;
  }>();
  const eventSlug = slug ?? '';
  const memberId = memberIdParam || getMemberId(eventSlug) || '';

  const [eventName, setEventName] = useState('Live gallery');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!eventSlug) return;
    let alive = true;

    api
      .getEvent(eventSlug)
      .then((e) => alive && setEventName(e.name))
      .catch(() => {});
    api
      .gallery(eventSlug, { take: 60 })
      .then((res) => {
        if (!alive) return;
        setPhotos(res.photos);
        setLoaded(true);
      })
      .catch(() => alive && setLoaded(true));
    api
      .stats(eventSlug)
      .then((s) => alive && setCount(s.photos))
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [eventSlug]);

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Label>Live - {count} photos</Label>
            <Display size={20} style={{ marginTop: 2 }}>
              {eventName}
            </Display>
          </View>
          <RecDot label="REC" />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.peopleStrip}
        >
          <Pressable
            style={styles.findMe}
            accessibilityRole="button"
            accessibilityLabel="Find me, take a selfie to find your photos"
            hitSlop={8}
            onPress={() =>
              router.push({
                pathname: '/event/[slug]/selfie',
                params: { slug: eventSlug, memberId },
              })
            }
          >
            <Text style={styles.findMeText} accessibilityElementsHidden>
              Find{'\n'}me
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {photos.length ? (
          <PhotoGrid photos={photos} />
        ) : (
          <Text style={styles.empty}>
            {loaded
              ? 'No photos yet. Be the first to add a shot.'
              : 'Loading the gallery...'}
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineSoft,
    backgroundColor: colors.ink,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  peopleStrip: { gap: 8, paddingTop: 12, paddingRight: 8 },
  findMe: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findMeText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 9,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 11,
  },
  grid: { padding: 12, paddingBottom: 96 },
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: 30,
    lineHeight: 21,
  },
});
