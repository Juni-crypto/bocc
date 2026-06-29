import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { RecDot } from '@/components/RecDot';
import { Bezel } from '@/components/Bezel';
import { QrCode } from '@/components/QrCode';
import { PhotoGrid } from '@/components/PhotoGrid';
import { PillButton } from '@/components/PillButton';
import { Segmented } from '@/components/Segmented';
import { Display, Label, SettingRow, StatCard } from '@/components/ui';
import { colors, fonts, radius } from '@/theme/tokens';
import {
  api,
  ApiError,
  type BoccEvent,
  type EventStats,
  type Photo,
  type UpdateEventInput,
  type Visibility,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { joinShareUrl, joinWebUrl } from '@/lib/links';

const EMPTY_STATS: EventStats = { crew: 0, photos: 0, pending: 0, faces: 0 };

const VISIBILITY_OPTIONS = [
  { key: 'PRIVATE' as Visibility, label: 'Private' },
  { key: 'UNLISTED' as Visibility, label: 'Unlisted' },
  { key: 'PUBLIC' as Visibility, label: 'Public' },
];

// Editable settings panel state, mirroring the create wizard's field set.
interface SettingsForm {
  name: string;
  visibility: Visibility;
  perGuestCap: number;
  requireName: boolean;
  faceMatching: boolean;
  semanticSearch: boolean;
  moderationQueue: boolean;
  hostApproval: boolean;
  geofenceEnabled: boolean;
}

function formFromEvent(ev: BoccEvent): SettingsForm {
  return {
    name: ev.name ?? '',
    visibility: ev.visibility ?? 'PRIVATE',
    perGuestCap: ev.perGuestCap ?? 0,
    requireName: ev.requireName ?? false,
    faceMatching: ev.faceMatching ?? false,
    semanticSearch: ev.semanticSearch ?? false,
    moderationQueue: ev.moderationQueue ?? false,
    hostApproval: ev.hostApproval ?? false,
    geofenceEnabled: ev.geofenceEnabled ?? false,
  };
}

const CAP_OPTIONS = [0, 5, 10, 15, 20, 30];

/** Host manage / live dashboard - polls real stats + moderation queue + share QR. */
export default function ManageEvent() {
  const { id, slug, name } = useLocalSearchParams<{
    id?: string;
    slug?: string;
    name?: string;
  }>();
  const eventId = id ?? '';
  const eventSlug = slug ?? '';
  const paramName = name ?? 'Your event';

  const { token, ready } = useAuth();

  const [stats, setStats] = useState<EventStats>(EMPTY_STATS);
  const [pending, setPending] = useState<Photo[]>([]);
  const [showQr, setShowQr] = useState(false);

  // Local copy of the event so status / settings changes reflect instantly.
  const [event, setEvent] = useState<BoccEvent | null>(null);
  const ended = event?.status === 'ENDED';
  const eventName = event?.name ?? paramName;

  // End event.
  const [ending, setEnding] = useState(false);

  // Edit settings panel.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Gate: host dashboard requires auth.
  useFocusEffect(
    useCallback(() => {
      if (ready && !token) {
        router.replace('/login?next=/host/manage' as never);
      }
    }, [ready, token]),
  );

  // Load the full event so we can drive status + the settings form.
  useEffect(() => {
    if (!eventId) return;
    let alive = true;
    api
      .getEvent(eventId)
      .then((e) => alive && setEvent(e))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [eventId]);

  useEffect(() => {
    if (!eventId || !token) return;
    let alive = true;

    const poll = () => {
      api
        .stats(eventId, token)
        .then((s) => alive && setStats(s))
        .catch(() => {});
      api
        .moderation(eventId, token)
        .then((m) => alive && setPending(m.photos))
        .catch(() => {});
    };

    poll();
    const timer = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [eventId, token]);

  const approveAll = async () => {
    const queue = pending;
    setPending([]);
    setStats((s) => ({ ...s, pending: 0 }));
    await Promise.all(
      queue.map((p) =>
        api.moderate(eventId, p.id, 'approve', token ?? undefined).catch(() => {}),
      ),
    );
  };

  const confirmEnd = () => {
    if (!eventId || !token || ending) return;
    Alert.alert(
      'End this event?',
      'Uploads close and the crew can no longer add photos. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End event', style: 'destructive', onPress: endEvent },
      ],
    );
  };

  const endEvent = async () => {
    setEnding(true);
    try {
      const next = await api.endEvent(eventId, token ?? undefined);
      setEvent(next);
    } catch (e) {
      Alert.alert(
        'Could not end the event',
        e instanceof ApiError ? e.message : 'Try again in a moment.',
      );
    } finally {
      setEnding(false);
    }
  };

  const openSettings = () => {
    if (!event) return;
    setForm(formFromEvent(event));
    setSaveError(null);
    setSaved(false);
    setSettingsOpen(true);
  };

  const setField = <K extends keyof SettingsForm>(
    key: K,
    value: SettingsForm[K],
  ) => setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const saveSettings = async () => {
    if (!eventId || !token || saving || !form) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    const dto: UpdateEventInput = {
      name: form.name.trim() || 'Untitled event',
      visibility: form.visibility,
      perGuestCap: form.perGuestCap,
      requireName: form.requireName,
      faceMatching: form.faceMatching,
      semanticSearch: form.semanticSearch,
      moderationQueue: form.moderationQueue,
      hostApproval: form.hostApproval,
      geofenceEnabled: form.geofenceEnabled,
      geoEnabled: form.geofenceEnabled,
    };
    try {
      const next = await api.updateEvent(eventId, dto, token);
      setEvent(next);
      setSaved(true);
      setSettingsOpen(false);
    } catch (e) {
      setSaveError(
        e instanceof ApiError ? e.message : 'Could not save settings. Try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.head}>
          <Label>{ended ? 'Event ended' : 'Live event'}</Label>
          {ended ? (
            <View style={styles.endedTag}>
              <RecDot label="ENDED" />
            </View>
          ) : (
            <RecDot label="RECORDING" />
          )}
        </View>
        <Display size={22} style={{ marginTop: 4 }}>
          {eventName}
        </Display>

        {ended ? (
          <View style={styles.endedBanner}>
            <Text style={styles.endedTitle}>Uploads closed</Text>
            <Text style={styles.endedText}>
              This event has ended. The crew can no longer add photos.
            </Text>
          </View>
        ) : null}

        <View style={styles.stats}>
          <StatCard value={stats.crew} caption="crew" accent />
          <StatCard value={stats.photos} caption="photos" />
          <StatCard value={stats.faces} caption="faces" />
        </View>

        {/* host controls: edit settings + end event */}
        <View style={styles.hostControls}>
          <PillButton
            label={settingsOpen ? 'Close settings' : 'Edit settings'}
            size="sm"
            variant="ghost"
            onPress={() =>
              settingsOpen ? setSettingsOpen(false) : openSettings()
            }
            style={{ flex: 1 }}
          />
          {!ended ? (
            <Pressable
              onPress={confirmEnd}
              disabled={ending}
              style={[styles.endBtn, ending && styles.endBtnInert]}
              accessibilityRole="button"
              accessibilityLabel="End event"
            >
              <Text style={styles.endBtnTxt}>
                {ending ? 'Ending' : 'End event'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {saved && !settingsOpen ? (
          <Text style={styles.savedNote}>Settings saved</Text>
        ) : null}

        {settingsOpen && form ? (
          <Bezel style={{ marginTop: 14 }}>
            <View style={styles.settings}>
              <Display size={16}>Edit settings</Display>
              <Text style={styles.settingsHint}>
                Changes apply live for the crew.
              </Text>

              <Label style={{ marginTop: 16 }}>Event name</Label>
              <TextInput
                value={form.name}
                onChangeText={(t) => setField('name', t)}
                style={styles.input}
                placeholder="Event name"
                placeholderTextColor={colors.textFaint}
                accessibilityLabel="Event name"
              />

              <Label style={{ marginTop: 16 }}>Visibility</Label>
              <View style={{ marginTop: 8 }}>
                <Segmented
                  options={VISIBILITY_OPTIONS}
                  value={form.visibility}
                  onChange={(v) => setField('visibility', v)}
                />
              </View>

              <Label style={{ marginTop: 16 }}>Photos per guest</Label>
              <View style={styles.caps}>
                {CAP_OPTIONS.map((c) => {
                  const active = c === form.perGuestCap;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setField('perGuestCap', c)}
                      style={[styles.cap, active && styles.capOn]}
                      hitSlop={4}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={
                        c === 0 ? 'Unlimited photos per guest' : `${c} per guest`
                      }
                    >
                      <Text style={[styles.capTxt, active && styles.capTxtOn]}>
                        {c === 0 ? '∞' : c}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.toggles}>
                <SettingRow
                  title="Require name to join"
                  value={form.requireName}
                  onChange={(v) => setField('requireName', v)}
                />
                <SettingRow
                  title="Face matching"
                  hint="Selfie finds a guest's photos"
                  value={form.faceMatching}
                  onChange={(v) => setField('faceMatching', v)}
                />
                <SettingRow
                  title="Semantic search"
                  hint="Search photos in plain words"
                  value={form.semanticSearch}
                  onChange={(v) => setField('semanticSearch', v)}
                />
                <SettingRow
                  title="Moderation queue"
                  hint="Hold uploads for review"
                  value={form.moderationQueue}
                  onChange={(v) => setField('moderationQueue', v)}
                />
                <SettingRow
                  title="Host approves uploads"
                  hint="Photos wait for your approval"
                  value={form.hostApproval}
                  onChange={(v) => setField('hostApproval', v)}
                />
                <SettingRow
                  title="Geofence to venue"
                  hint="Only photos shot here"
                  value={form.geofenceEnabled}
                  onChange={(v) => setField('geofenceEnabled', v)}
                  divider={false}
                />
              </View>

              {saveError ? (
                <Text style={styles.error}>{saveError}</Text>
              ) : null}

              <View style={styles.settingsActions}>
                <PillButton
                  label={saving ? 'Saving' : 'Save settings'}
                  size="sm"
                  loading={saving}
                  onPress={saveSettings}
                  style={{ flex: 1 }}
                />
                <PillButton
                  label="Cancel"
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  onPress={() => setSettingsOpen(false)}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </Bezel>
        ) : null}

        <Label style={{ marginTop: 22 }}>Needs review - {pending.length}</Label>
        <View style={styles.queue}>
          {pending.length ? (
            <PhotoGrid photos={pending} badge="pending" />
          ) : (
            <Text style={styles.clear}>Queue clear. Nothing to review.</Text>
          )}
        </View>

        <View style={styles.actions}>
          <PillButton
            label="Approve all"
            size="sm"
            onPress={approveAll}
            style={{ flex: 1 }}
          />
          <PillButton
            label={showQr ? 'Hide QR' : 'Share QR'}
            size="sm"
            variant="ghost"
            onPress={() => setShowQr((v) => !v)}
            style={{ flex: 1 }}
          />
        </View>

        {showQr && (
          <Bezel style={{ marginTop: 16 }}>
            <View style={styles.qrWrap}>
              <QrCode value={joinWebUrl(eventSlug)} size={170} />
              <Text style={styles.qrUrl}>{joinShareUrl(eventSlug)}</Text>
              <Label style={{ marginTop: 4 }}>Scan to join the crew</Label>
            </View>
          </Bezel>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 32 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  endedTag: { opacity: 0.9 },
  endedBanner: {
    marginTop: 14,
    backgroundColor: 'rgba(255,107,94,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,94,0.40)',
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  endedTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.coral,
  },
  endedText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    marginTop: 4,
  },
  stats: { flexDirection: 'row', gap: 8, marginTop: 16 },
  hostControls: { flexDirection: 'row', gap: 10, marginTop: 16 },
  endBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255,107,94,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,94,0.40)',
  },
  endBtnInert: { opacity: 0.5 },
  endBtnTxt: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.coral,
  },
  savedNote: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.lime,
    marginTop: 12,
  },
  settings: { paddingVertical: 4 },
  settingsHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  input: {
    marginTop: 8,
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
  caps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  cap: {
    minWidth: 48,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  capOn: { backgroundColor: colors.lime, borderColor: colors.lime },
  capTxt: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
  capTxtOn: { color: colors.ink, fontFamily: fonts.bodySemibold },
  toggles: { marginTop: 14 },
  settingsActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  error: {
    color: colors.coral,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 12,
  },
  queue: { marginTop: 10 },
  clear: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textFaint,
    paddingVertical: 24,
    textAlign: 'center',
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  qrWrap: { alignItems: 'center', paddingVertical: 8 },
  qrUrl: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text,
    marginTop: 14,
  },
});
