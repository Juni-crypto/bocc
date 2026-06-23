import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/Screen';
import { PillButton } from '@/components/PillButton';
import { Display, Label } from '@/components/ui';
import { colors, fonts, radius } from '@/theme/tokens';
import { api, ApiError, type LocalFile } from '@/lib/api';
import { getMemberId } from '@/lib/store';

const CAP = 15;

/** Step 3 - Add up to 15 shots with a cap meter, then upload to the live event. */
export default function AddScreen() {
  const { slug, memberId: memberIdParam } = useLocalSearchParams<{
    slug: string;
    memberId?: string;
  }>();
  const eventSlug = slug ?? '';
  const memberId = memberIdParam || getMemberId(eventSlug);
  const insets = useSafeAreaInsets();

  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = picked.length;
  const pct = Math.min(1, count / CAP);

  const addMore = async () => {
    if (count >= CAP) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: CAP - count,
      quality: 0.8,
    });
    if (res.canceled) return;
    setPicked((prev) => [...prev, ...res.assets.map((a) => a.uri)].slice(0, CAP));
  };

  const submit = async () => {
    if (!picked.length) return;
    if (!memberId) {
      setError('Join the event before adding photos.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const files: LocalFile[] = picked.map((uri, i) => ({
        uri,
        name: `shot-${i}.jpg`,
        type: 'image/jpeg',
      }));
      await api.uploadPhotos(eventSlug, files, { memberId });
      setDone(true);
      router.push({
        pathname: '/event/[slug]',
        params: { slug: eventSlug, memberId },
      });
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Upload failed. Check the API is running.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <View>
          <Label>Your roll</Label>
          <Display size={24} style={{ marginTop: 6 }}>
            Add up to {CAP}
          </Display>
        </View>
        <Text style={styles.counter}>
          {count}
          <Text style={styles.counterTotal}>/{CAP}</Text>
        </Text>
      </View>

      <View
        style={styles.meterTrack}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: CAP, now: count }}
        accessibilityLabel={`${count} of ${CAP} photos selected`}
      >
        <View style={[styles.meterFill, { width: `${pct * 100}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cols}>
          {[0, 1].map((col) => (
            <View key={col} style={styles.col}>
              {picked
                .filter((_, i) => i % 2 === col)
                .map((uri, i) => (
                  <Image
                    key={`${col}-${i}`}
                    source={{ uri }}
                    style={[styles.tile, { aspectRatio: i % 3 === 0 ? 0.8 : 1 }]}
                    contentFit="cover"
                    accessible
                    accessibilityRole="image"
                    accessibilityLabel="Selected photo"
                  />
                ))}
              {col === picked.length % 2 && count < CAP && (
                <Pressable
                  style={styles.addTile}
                  onPress={addMore}
                  accessibilityRole="button"
                  accessibilityLabel="Add photos from your library"
                >
                  <Text style={styles.plus} accessibilityElementsHidden>
                    ＋
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PillButton
          label={done ? 'Added to gallery' : 'Add to the gallery'}
          trailing={<Text style={{ color: colors.ink }}>{'↗'}</Text>}
          loading={busy}
          onPress={submit}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  counter: { fontFamily: fonts.display, fontSize: 30, color: colors.lime },
  counterTotal: { fontSize: 18, color: colors.textGhost },
  meterTrack: {
    height: 8,
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 999,
    backgroundColor: colors.fillStrong,
    overflow: 'hidden',
  },
  meterFill: { height: '100%', backgroundColor: colors.lime, borderRadius: 999 },
  grid: { padding: 20, paddingBottom: 20 },
  cols: { flexDirection: 'row', gap: 7 },
  col: { flex: 1, gap: 7 },
  tile: { width: '100%', borderRadius: radius.md, backgroundColor: colors.surface },
  addTile: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.hairlineDash,
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: { color: colors.lime, fontSize: 30 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: colors.ink,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
  error: {
    color: colors.coral,
    fontFamily: fonts.body,
    fontSize: 12,
    marginBottom: 10,
  },
});
