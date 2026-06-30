import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Viewfinder } from '@/components/Viewfinder';
import { Display, Label } from '@/components/ui';
import { colors, fonts } from '@/theme/tokens';
import { api, ApiError } from '@/lib/api';
import { getMemberId, setFindMeResult } from '@/lib/store';
import { useEventSlug } from '@/lib/nav';

/** Step 2 - Take one selfie -> find my photos via the live API. */
export default function SelfieScreen() {
  const { memberId: memberIdParam } = useLocalSearchParams<{
    memberId?: string;
  }>();
  const eventSlug = useEventSlug();
  const memberId = memberIdParam || getMemberId(eventSlug) || '';

  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = async () => {
    setBusy(true);
    setError(null);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      let picked: ImagePicker.ImagePickerResult;
      if (perm.granted) {
        picked = await ImagePicker.launchCameraAsync({
          cameraType: ImagePicker.CameraType.front,
          quality: 0.7,
        });
      } else {
        picked = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
      }
      if (picked.canceled || !picked.assets?.length) return;

      const selfie = picked.assets[0];
      setUri(selfie.uri);

      const result = await api.findMe(
        eventSlug,
        { uri: selfie.uri, name: 'selfie.jpg', type: 'image/jpeg' },
        memberId,
      );
      setFindMeResult(eventSlug, result);

      router.push({
        pathname: '/event/[slug]/me',
        params: { slug: eventSlug, selfie: selfie.uri, memberId },
      });
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not run the match. Check the API is running.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Label>Find me</Label>
        <Display size={26} style={{ marginTop: 6 }}>
          Take one selfie
        </Display>
        <Text style={styles.sub}>
          We will surface every photo you are in.
        </Text>

        <Viewfinder round style={styles.ring}>
          {uri ? (
            <Image
              source={{ uri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessible
              accessibilityRole="image"
              accessibilityLabel="Your selfie"
            />
          ) : (
            <Text style={styles.ringHint}>Tap the shutter</Text>
          )}
        </Viewfinder>

        <View style={styles.shutterWrap}>
          <Pressable
            style={[styles.shutter, busy && { opacity: 0.6 }]}
            onPress={capture}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Take selfie"
            accessibilityState={{ busy }}
            hitSlop={8}
          >
            <View style={styles.shutterInner} accessible={false} />
          </Pressable>
          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <Text style={styles.note}>
              Selfie is deleted right after matching
            </Text>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  ring: {
    marginTop: 24,
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.lime,
    shadowOpacity: 0.25,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  ringHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textFaint,
  },
  shutterWrap: { marginTop: 32, alignItems: 'center' },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.lime,
    shadowOpacity: 0.45,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: colors.ink,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 12,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.coral,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
