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
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Viewfinder } from '@/components/Viewfinder';
import { QrCode } from '@/components/QrCode';
import { RecDot } from '@/components/RecDot';
import { PillButton } from '@/components/PillButton';
import { Display, Label } from '@/components/ui';
import { colors, fonts, radius } from '@/theme/tokens';
import { api, ApiError, type BoccEvent } from '@/lib/api';
import {
  setMemberId,
  getMemberId,
  addJoinedEvent,
  setGuestPhone,
  loadGuestPhone,
} from '@/lib/store';
import { joinWebUrl } from '@/lib/links';

/**
 * Guest join + biometric consent. Reached from a scanned QR or a share link.
 * Shows the event's real join QR and the consent gate before joining.
 */
export default function JoinScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const eventSlug = slug ?? '';

  // Already on the crew for this event? Skip straight to the gallery so we
  // never make a returning guest "join" twice.
  useEffect(() => {
    if (eventSlug && getMemberId(eventSlug)) {
      router.replace({ pathname: '/event/[slug]', params: { slug: eventSlug } });
    }
  }, [eventSlug]);

  const [event, setEvent] = useState<BoccEvent | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!eventSlug) return;
    api
      .getEvent(eventSlug)
      .then((e) => alive && setEvent(e))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [eventSlug]);

  // Pre-fill the phone they joined with before, if we have one.
  useEffect(() => {
    let alive = true;
    loadGuestPhone().then((p) => {
      if (alive && p) setPhone(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  const onJoin = async () => {
    setBusy(true);
    setError(null);
    try {
      const trimmedPhone = phone.trim();
      const res = await api.join(eventSlug, {
        name: name.trim() || 'Guest',
        phone: trimmedPhone || undefined,
        consentFaceMatch: consent,
      });
      setMemberId(eventSlug, res.member.id);
      addJoinedEvent({
        slug: eventSlug,
        name: event?.name ?? res.event?.name,
        memberId: res.member.id,
      });
      if (trimmedPhone) setGuestPhone(trimmedPhone);
      // Land in the live gallery (the home of the event). Finding yourself with
      // a selfie lives in the People tab, it is not forced on join.
      router.replace({
        pathname: '/event/[slug]',
        params: { slug: eventSlug, memberId: res.member.id },
      });
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not reach the server. Check the API is running.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Viewfinder style={styles.vf}>
            <View style={styles.scanTag}>
              <RecDot label="JOINING" />
            </View>
            <QrCode value={joinWebUrl(eventSlug)} size={140} />
          </Viewfinder>

          <View style={styles.copy}>
            <Display size={18} color={colors.textMuted}>
              You are invited to
            </Display>
            <Display size={28} color={colors.lime} style={{ marginTop: 4 }}>
              {event?.name ?? 'this event'}
            </Display>

            <TextInput
              placeholder="Your name"
              placeholderTextColor={colors.textFaint}
              value={name}
              onChangeText={setName}
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="next"
              accessibilityLabel="Your name"
            />

            <TextInput
              placeholder="Phone (optional)"
              placeholderTextColor={colors.textFaint}
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="telephoneNumber"
              returnKeyType="done"
              accessibilityLabel="Your phone number"
            />
            <Text style={styles.phoneHint}>
              Add your phone to find your pics later from any device.
            </Text>

            <Pressable
              style={styles.consent}
              onPress={() => setConsent((c) => !c)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consent }}
            >
              <View
                style={[styles.check, consent ? styles.checkOn : styles.checkOff]}
              >
                {consent && <Text style={styles.checkMark}>{'✓'}</Text>}
              </View>
              <Text style={styles.consentText}>
                I agree this event uses{' '}
                <Text style={styles.consentStrong}>face matching</Text> to help
                find my photos.{' '}
                <Text style={styles.consentLink}>Privacy</Text>
              </Text>
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PillButton
              label="Join the crew"
              trailing={<Text style={{ color: colors.ink }}>{'↗'}</Text>}
              loading={busy}
              onPress={onJoin}
              style={{ marginTop: 18 }}
            />
            <Label style={{ marginTop: 14, textAlign: 'center' }}>
              You scanned this event - tap join to continue
            </Label>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  vf: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  scanTag: { position: 'absolute', top: 12, left: 12 },
  copy: { marginTop: 20 },
  input: {
    marginTop: 20,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  phoneHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textFaint,
    marginTop: 8,
  },
  consent: { flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'flex-start' },
  check: {
    width: 20,
    height: 20,
    borderRadius: 6,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.lime },
  checkOff: { borderWidth: 1, borderColor: colors.hairlineStrong },
  checkMark: { color: colors.ink, fontSize: 11, fontFamily: fonts.bodySemibold },
  consentText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  consentStrong: { color: colors.text },
  consentLink: { color: colors.text, textDecorationLine: 'underline' },
  error: { color: colors.coral, fontSize: 12, marginTop: 12, fontFamily: fonts.body },
});
