import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { PhotoGrid } from '@/components/PhotoGrid';
import { PillButton } from '@/components/PillButton';
import { Display, Label } from '@/components/ui';
import { colors, fonts, radius } from '@/theme/tokens';
import { api, ApiError, type GuestLookup } from '@/lib/api';
import { loadGuestPhone, setGuestPhone } from '@/lib/store';

/**
 * Returning-guest self service. Enter the phone you joined with and get back
 * every event you joined plus the pics you added there. No account needed,
 * the phone number is the key. Mirrors apps/web/app/my.
 */
export default function MyPhotosScreen() {
  const [phone, setPhone] = useState('');
  const [data, setData] = useState<GuestLookup | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill the phone we remembered at join time.
  useEffect(() => {
    let alive = true;
    loadGuestPhone().then((p) => {
      if (alive && p) setPhone(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  const run = async () => {
    const p = phone.trim();
    if (!p || loading) return;
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      const res = await api.guestLookup(p);
      setData(res);
      setGuestPhone(p);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not reach the server. Check the API is running.',
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const totalPhotos =
    data?.events.reduce((n, ev) => n + ev.photos.length, 0) ?? 0;

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Label color={colors.lime}>Your photos</Label>
          <Display size={28} style={{ marginTop: 6 }}>
            Find your pics
          </Display>
          <Text style={styles.sub}>
            Enter the phone you joined with. We pull up every event you joined
            and the photos you added there.
          </Text>

          <TextInput
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              if (error) setError(null);
            }}
            style={styles.input}
            placeholder="e.g. +91 98765 43210"
            placeholderTextColor={colors.textFaint}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="telephoneNumber"
            returnKeyType="search"
            onSubmitEditing={run}
            accessibilityLabel="Your phone number"
          />
          <PillButton
            label={loading ? 'Looking' : 'Find my photos'}
            trailing={
              loading ? undefined : <Text style={{ color: colors.ink }}>{'↗'}</Text>
            }
            loading={loading}
            disabled={!phone.trim()}
            onPress={run}
            style={{ marginTop: 12 }}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {searched && !loading && !error && data ? (
            data.events.length === 0 ? (
              <View style={styles.empty}>
                <Display size={20}>Nothing found for that number</Display>
                <Text style={styles.emptyText}>
                  Make sure you joined with this phone. You can add it when you
                  join an event.
                </Text>
              </View>
            ) : (
              <View style={styles.results}>
                <Text style={styles.summary}>
                  {data.events.length}{' '}
                  {data.events.length === 1 ? 'event' : 'events'} -{' '}
                  {totalPhotos} {totalPhotos === 1 ? 'photo' : 'photos'} you
                  added
                </Text>

                {data.events.map(({ event, photos }) => (
                  <View key={event.id} style={styles.section}>
                    <View style={styles.sectionHead}>
                      <View style={styles.sectionText}>
                        <Display size={20}>{event.name}</Display>
                        <Text style={styles.sectionMeta}>
                          {photos.length}{' '}
                          {photos.length === 1 ? 'photo' : 'photos'} you added
                        </Text>
                      </View>
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: '/event/[slug]',
                            params: { slug: event.slug },
                          })
                        }
                        style={styles.openBtn}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${event.name} gallery`}
                      >
                        <Text style={styles.openBtnTxt}>Open gallery</Text>
                      </Pressable>
                    </View>

                    {photos.length ? (
                      <PhotoGrid photos={photos} />
                    ) : (
                      <Text style={styles.sectionEmpty}>
                        You joined this event but have not added photos yet.
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 48 },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    marginTop: 8,
    maxWidth: 340,
  },
  input: {
    marginTop: 22,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    minHeight: 48,
  },
  error: {
    color: colors.coral,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 14,
  },
  empty: {
    marginTop: 28,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.xl,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
  },
  results: { marginTop: 26 },
  summary: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  section: { marginTop: 26 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionText: { flex: 1 },
  sectionMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 4,
  },
  openBtn: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  openBtnTxt: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.text,
  },
  sectionEmpty: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textFaint,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
});
