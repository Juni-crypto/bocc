import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { RecDot } from '@/components/RecDot';
import { PhotoGrid } from '@/components/PhotoGrid';
import { PeopleStrip } from '@/components/PeopleStrip';
import { Display, Label } from '@/components/ui';
import { colors, fonts } from '@/theme/tokens';
import { api, type BoccEvent, type Photo } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getMemberId } from '@/lib/store';
import { useEventSlug } from '@/lib/nav';

/** Step 4 - Pooled gallery, rendering real thumbUrl images from the live API. */
export default function GalleryScreen() {
  const { memberId: memberIdParam } = useLocalSearchParams<{
    memberId?: string;
  }>();
  const eventSlug = useEventSlug();
  const memberId = memberIdParam || getMemberId(eventSlug) || '';
  const { token, user, isAdmin } = useAuth();

  const [event, setEvent] = useState<BoccEvent | null>(null);
  const [eventName, setEventName] = useState('Live gallery');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!eventSlug) return;
    let alive = true;

    api
      .getEvent(eventSlug)
      .then((e) => {
        if (!alive) return;
        setEvent(e);
        setEventName(e.name);
      })
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
        <View style={styles.headerRow}>
          <View>
            <Label>Live - {count} photos</Label>
            <Display size={20} style={{ marginTop: 2 }}>
              {eventName}
            </Display>
          </View>
          <RecDot label="REC" />
        </View>

        <View style={styles.people}>
          <PeopleStrip slug={eventSlug} memberId={memberId} />
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
  people: { marginTop: 14 },
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
