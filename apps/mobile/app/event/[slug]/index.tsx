import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { RecDot } from '@/components/RecDot';
import { PhotoGrid } from '@/components/PhotoGrid';
import { PeopleStrip } from '@/components/PeopleStrip';
import { PillButton } from '@/components/PillButton';
import { Display, Label } from '@/components/ui';
import { colors, fonts, radius } from '@/theme/tokens';
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

  const openCamera = () =>
    router.push({
      pathname: '/event/[slug]/add',
      params: { slug: eventSlug, memberId },
    });

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Label>Live gallery</Label>
            <Display size={22} style={{ marginTop: 4 }}>
              {eventName}
            </Display>
          </View>
          <RecDot label="REC" />
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Ionicons name="images" size={13} color={colors.lime} />
            <Text style={styles.statusText}>
              {count} {count === 1 ? 'photo' : 'photos'}
            </Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <View style={styles.liveDot} />
            <Text style={styles.statusMuted}>Live now</Text>
          </View>
        </View>

        <View style={styles.people}>
          <PeopleStrip slug={eventSlug} memberId={memberId} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.grid,
          !photos.length && styles.gridEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {photos.length ? (
          <PhotoGrid photos={photos} canDelete={canDelete} onDelete={onDelete} />
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={loaded ? 'camera-outline' : 'sync-outline'}
                size={30}
                color={colors.lime}
              />
            </View>
            <Display size={20} style={styles.emptyTitle}>
              {loaded ? 'No photos yet' : 'Loading the gallery'}
            </Display>
            <Text style={styles.emptyCopy}>
              {loaded
                ? 'Be the first to add a shot. Everything you capture lands here for the whole event to see.'
                : 'Pulling the latest shots from the event...'}
            </Text>
            {loaded ? (
              <PillButton
                label="Open camera"
                size="sm"
                onPress={openCamera}
                trailing={
                  <Ionicons name="camera" size={16} color={colors.ink} />
                }
                style={styles.emptyCta}
              />
            ) : null}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineSoft,
    backgroundColor: colors.ink,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.text,
  },
  statusMuted: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  statusDivider: { width: 1, height: 12, backgroundColor: colors.hairlineStrong },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.lime,
  },
  people: { marginTop: 18 },

  grid: { padding: 12, paddingBottom: 96 },
  gridEmpty: { flexGrow: 1, justifyContent: 'center' },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(215,255,62,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(215,255,62,0.25)',
    marginBottom: 18,
  },
  emptyTitle: { textAlign: 'center' },
  emptyCopy: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 21,
  },
  emptyCta: { marginTop: 22, paddingHorizontal: 24 },
});
