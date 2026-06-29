import { useCallback, useState } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { PillButton } from '@/components/PillButton';
import { Slider } from '@/components/Slider';
import { Display, Label, SettingRow } from '@/components/ui';
import { colors, fonts, radius } from '@/theme/tokens';
import { api, ApiError, type CreateEventInput, type EventType } from '@/lib/api';
import { EVENT_TYPES } from '@/lib/demo';
import { useAuth } from '@/lib/auth';

const CAP_STEPS = [5, 10, 15, 20, 30, 0]; // 0 = unlimited

/** Smart defaults per event type (PLAN section 13). */
const PRESETS: Record<
  EventType,
  { cap: number; geo: boolean; video: boolean }
> = {
  WEDDING: { cap: 15, geo: false, video: true },
  BIRTHDAY: { cap: 10, geo: false, video: true },
  CORPORATE: { cap: 20, geo: true, video: true },
  SPORTS: { cap: 15, geo: true, video: true },
  CONCERT: { cap: 10, geo: true, video: true },
  TRAVEL: { cap: 0, geo: true, video: true },
  OTHER: { cap: 15, geo: false, video: true },
};

/** Host create wizard - basics + capture rules + key toggles (steps 1-2,4). */
export default function CreateEvent() {
  const { token, ready } = useAuth();

  // Gate: hosts must be logged in. Redirect to login (with return path) once
  // hydration settles, so we never flash the form for an unauthed user.
  useFocusEffect(
    useCallback(() => {
      if (ready && !token) {
        router.replace('/login?next=/host/create' as never);
      }
    }, [ready, token]),
  );

  const [name, setName] = useState('Aisha & Dev, Sangeet');
  const [type, setType] = useState<EventType>('WEDDING');
  const [cap, setCap] = useState(15);
  const [faceMatching, setFaceMatching] = useState(true);
  const [geofence, setGeofence] = useState(false);
  const [allowVideo, setAllowVideo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (t: EventType) => {
    setType(t);
    const p = PRESETS[t];
    setCap(p.cap);
    setGeofence(p.geo);
    setAllowVideo(p.video);
  };

  const next = async () => {
    setBusy(true);
    setError(null);
    const payload: CreateEventInput = {
      name: name.trim() || 'Untitled event',
      type,
      perGuestCap: cap,
      faceMatching,
      geofenceEnabled: geofence,
      geoEnabled: geofence,
      allowVideo,
    };
    try {
      const created = await api.createEvent(payload, token ?? undefined);
      const live = await api.goLive(created.id, token ?? undefined);
      router.push({
        pathname: '/host/manage',
        params: { id: live.id, slug: live.slug, name: live.name },
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
        <View style={styles.topbar}>
          <View>
            <Label>New event</Label>
            <Display size={24} style={{ marginTop: 6 }}>
              Set up shoot
            </Display>
          </View>
          <Text style={styles.step}>2 / 6</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Event name"
            placeholderTextColor={colors.textFaint}
            accessibilityLabel="Event name"
          />

          <View style={styles.chips}>
            {EVENT_TYPES.map((t) => {
              const active = t.key === type;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => applyPreset(t.key)}
                  style={[styles.chip, active && styles.chipOn]}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.label} event type`}
                  accessibilityState={{ selected: active }}
                  hitSlop={6}
                >
                  <Text style={[styles.chipTxt, active && styles.chipTxtOn]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.capRow}>
            <Text style={styles.capLabel}>Photos per guest</Text>
            <Text style={styles.capValue}>
              {cap === 0 ? 'Unlimited' : cap}
            </Text>
          </View>
          <Slider steps={CAP_STEPS} value={cap} onChange={setCap} />

          <View style={styles.toggles}>
            <SettingRow
              title="Face matching"
              hint="Selfie finds my photos"
              value={faceMatching}
              onChange={setFaceMatching}
            />
            <SettingRow
              title="Geofence to venue"
              hint="Only photos shot here"
              value={geofence}
              onChange={setGeofence}
            />
            <SettingRow
              title="Allow video"
              hint="Up to 30s"
              value={allowVideo}
              onChange={setAllowVideo}
              divider={false}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PillButton
            label="Next: Access"
            trailing={<Text style={{ color: colors.ink }}>{'↗'}</Text>}
            loading={busy}
            onPress={next}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  step: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
  body: { padding: 20, paddingTop: 18 },
  input: {
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  chipOn: { backgroundColor: colors.lime, borderColor: colors.lime },
  chipTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  chipTxtOn: { color: colors.ink, fontFamily: fonts.bodySemibold },
  capRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  capLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  capValue: {
    fontFamily: fonts.displaySemibold,
    fontSize: 15,
    color: colors.lime,
  },
  toggles: { marginTop: 18 },
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
