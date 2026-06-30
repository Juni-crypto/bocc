import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { PhotoGrid } from '@/components/PhotoGrid';
import { Display, Label } from '@/components/ui';
import { colors, fonts } from '@/theme/tokens';
import { api, type BoccEvent, type Photo } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useEventSlug } from '@/lib/nav';

/** Photos of a single detected person, rendered through the tappable grid. */
export default function PersonPhotosScreen() {
  const { personId } = useLocalSearchParams<{
    personId: string;
  }>();
  const eventSlug = useEventSlug();
  const { token, user, isAdmin } = useAuth();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [event, setEvent] = useState<BoccEvent | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!eventSlug || !personId) return;
    let alive = true;

    api
      .getEvent(eventSlug)
      .then((e) => alive && setEvent(e))
      .catch(() => {});
    api
      .personPhotos(eventSlug, personId)
      .then((res) => {
        if (!alive) return;
        setPhotos(res.photos);
        setLoaded(true);
      })
      .catch(() => alive && setLoaded(true));

    return () => {
      alive = false;
    };
  }, [eventSlug, personId]);

  const canDelete =
    isAdmin || (!!event?.hostUserId && event.hostUserId === user?.id);

  const onDelete = async (photo: Photo) => {
    if (!event) return;
    await api.deletePhoto(event.id, photo.id, token ?? undefined);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Text style={styles.backGlyph}>{'‹'}</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Label>{photos.length} photos</Label>
          <Display size={20} style={{ marginTop: 2 }}>
            Photos of this person
          </Display>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {photos.length ? (
          <PhotoGrid photos={photos} canDelete={canDelete} onDelete={onDelete} />
        ) : (
          <Text style={styles.empty}>
            {loaded
              ? 'No photos of this person yet.'
              : 'Loading photos...'}
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineSoft,
    backgroundColor: colors.ink,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  backGlyph: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginTop: -2 },
  pressed: { opacity: 0.7 },
  headerText: { flex: 1 },
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
