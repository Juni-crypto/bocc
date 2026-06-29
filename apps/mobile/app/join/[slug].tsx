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
import { setMemberId } from '@/lib/store';
import { joinDeepLink } from '@/lib/links';

/**
 * Guest join + biometric consent. Reached from a scanned QR or a share link.
 * Shows the event's real join QR and the consent gate before joining.
 */
export default function JoinScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const eventSlug = slug ?? '';

  const [event, setEvent] = useState<BoccEvent | null>(null);
  const [name, setName] = useState('');
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

  const onJoin = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.join(eventSlug, {
        name: name.trim() || 'Guest',
        consentFaceMatch: consent,
      });
      setMemberId(eventSlug, res.member.id);
      router.push({
        pathname: '/event/[slug]/selfie',
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
            <QrCode value={joinDeepLink(eventSlug)} size={140} />
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
              returnKeyType="done"
              accessibilityLabel="Your name"
            />

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
