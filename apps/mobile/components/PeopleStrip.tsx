import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { colors, fonts, label as labelStyle } from '@/theme/tokens';
import { api, type EventPerson } from '@/lib/api';

/**
 * Auto-populating face strip. Shows every person the backend detects across an
 * event's photos (avatar + appearance count). Faces arrive as the ML pass
 * finishes, so we show pulsing placeholders while loading and a subtle
 * "Detecting people..." line until any appear. A "Find me" pill routes to the
 * selfie screen.
 */
export function PeopleStrip({
  slug,
  memberId,
}: {
  slug: string;
  memberId?: string;
}) {
  const [people, setPeople] = useState<EventPerson[] | null>(null);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    api
      .people(slug)
      .then((r) => alive && setPeople(r.people))
      .catch(() => alive && setPeople([]));
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={labelStyle}>People in this event</Text>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/event/[slug]/selfie',
              params: { slug, memberId: memberId ?? '' },
            })
          }
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Find me with a selfie"
          style={({ pressed }) => [styles.findMe, pressed && styles.pressed]}
        >
          <Text style={styles.findMeText}>Find me</Text>
        </Pressable>
      </View>

      {people === null ? (
        <View style={styles.loadingRow}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Placeholder key={i} delay={i * 120} />
          ))}
        </View>
      ) : people.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.peopleRow}
        >
          {people.map((p) => (
            <Pressable
              key={p.id}
              onPress={() =>
                router.push({
                  pathname: '/event/[slug]/person/[personId]',
                  params: { slug, personId: p.id },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={
                p.name ?? `See ${p.photoCount} photos of this person`
              }
              style={({ pressed }) => [styles.person, pressed && styles.pressed]}
            >
              <View style={styles.avatarRing}>
                {p.thumbUrl ? (
                  <Image
                    source={{ uri: p.thumbUrl }}
                    style={styles.avatar}
                    contentFit="cover"
                    transition={200}
                    accessibilityElementsHidden
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarBlank]} />
                )}
              </View>
              <Text style={styles.caption} numberOfLines={1}>
                {p.name ?? `${p.photoCount}`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.detecting}>
          Detecting people... faces appear here automatically as photos are
          processed.
        </Text>
      )}
    </View>
  );
}

/** A softly pulsing circular placeholder shown while faces load. */
function Placeholder({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 700,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, delay]);
  return <Animated.View style={[styles.placeholder, { opacity }]} />;
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  findMe: {
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(215,255,62,0.3)',
    backgroundColor: 'rgba(215,255,62,0.08)',
  },
  findMeText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.lime },
  pressed: { opacity: 0.7 },
  loadingRow: { flexDirection: 'row', gap: 12 },
  placeholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  peopleRow: { gap: 16, paddingRight: 8 },
  person: { width: 64, alignItems: 'center' },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%', borderRadius: 28 },
  avatarBlank: { backgroundColor: 'rgba(255,255,255,0.1)' },
  caption: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
    maxWidth: 64,
    textAlign: 'center',
  },
  detecting: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textFaint,
    lineHeight: 18,
  },
});
