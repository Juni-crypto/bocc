import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { PillButton } from '@/components/PillButton';
import { Segmented } from '@/components/Segmented';
import { Slider } from '@/components/Slider';
import { Display, Label, SettingRow } from '@/components/ui';
import { colors, fonts, radius } from '@/theme/tokens';
import {
  api,
  ApiError,
  type CreateEventInput,
  type DownloadPolicy,
  type EventType,
  type UploadWindow,
  type Visibility,
} from '@/lib/api';
import { EVENT_TYPES } from '@/lib/demo';
import { useAuth } from '@/lib/auth';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Per-guest photo presets (0 = unlimited).
const CAP_STEPS = [10, 20, 30, 50, 0];

const VISIBILITY_OPTIONS = [
  { key: 'PRIVATE' as Visibility, label: 'Private' },
  { key: 'UNLISTED' as Visibility, label: 'Unlisted' },
  { key: 'PUBLIC' as Visibility, label: 'Public' },
];

const UPLOAD_WINDOW_OPTIONS = [
  { key: 'DURING_EVENT' as UploadWindow, label: 'During' },
  { key: 'DAYS_AFTER' as UploadWindow, label: 'Days after' },
  { key: 'ALWAYS' as UploadWindow, label: 'Always' },
];

const DOWNLOAD_OPTIONS = [
  { key: 'EVERYONE' as DownloadPolicy, label: 'Everyone' },
  { key: 'HOST_ONLY' as DownloadPolicy, label: 'Host only' },
  { key: 'DISABLED' as DownloadPolicy, label: 'Off' },
];

/**
 * Host create screen. Essentials only by default (name + a few simple
 * choices); everything advanced lives in a collapsed section with sensible
 * defaults so a host can create with just a name and go live.
 */
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

  // --- essentials -----------------------------------------------------------
  const [name, setName] = useState('');
  const [type, setType] = useState<EventType>('WEDDING');
  const [startsAt, setStartsAt] = useState('');
  const [venue, setVenue] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PRIVATE');
  const [cap, setCap] = useState(20);
  const [faceMatching, setFaceMatching] = useState(true);

  // --- advanced (sensible defaults; create with just a name works) ----------
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [totalCap, setTotalCap] = useState(0); // 0 = no total cap
  const [allowVideo, setAllowVideo] = useState(true);
  const [liveCaptureOnly, setLiveCaptureOnly] = useState(false);
  const [uploadWindow, setUploadWindow] = useState<UploadWindow>('ALWAYS');
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [geofenceEnabled, setGeofenceEnabled] = useState(false);
  const [geofenceRadiusM, setGeofenceRadiusM] = useState(300);
  const [mapView, setMapView] = useState(false);
  const [autoHighlights, setAutoHighlights] = useState(true);
  const [semanticSearch, setSemanticSearch] = useState(true);
  const [autoModeration, setAutoModeration] = useState(true);
  const [requireName, setRequireName] = useState(true);
  const [hostApproval, setHostApproval] = useState(false);
  const [uploadToUnlock, setUploadToUnlock] = useState(false);
  const [downloadPolicy, setDownloadPolicy] =
    useState<DownloadPolicy>('EVERYONE');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleAdvanced = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAdvancedOpen((o) => !o);
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    const payload: CreateEventInput = {
      name: name.trim() || 'Untitled event',
      type,
      venue: venue.trim() || undefined,
      startsAt: startsAt.trim() || undefined,
      visibility,
      // capture rules
      perGuestCap: cap,
      totalCap,
      allowVideo,
      liveCaptureOnly,
      uploadWindow,
      // location / geo
      geoEnabled,
      geofenceEnabled,
      geofenceRadiusM,
      mapView,
      // AI
      faceMatching,
      autoHighlights,
      semanticSearch,
      autoModeration,
      // access / privacy
      requireName,
      hostApproval,
      uploadToUnlock,
      downloadPolicy,
    };
    try {
      const created = await api.createEvent(payload, token ?? undefined);
      const live = await api.goLive(created.id, token ?? undefined);
      router.push({
        pathname: '/host/manage',
        params: { id: live.id, slug: live.slug, name: live.name },
      });
    } catch (e) {
      if (e instanceof ApiError) {
        setError(
          e.status === 401
            ? 'Your session expired. Please sign in again.'
            : e.message,
        );
      } else {
        setError('Could not reach the server. Check the API is running.');
      }
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
          <Label>New event</Label>
          <Display size={26} style={{ marginTop: 6 }}>
            Create event
          </Display>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          {/* Event name (required) */}
          <Label style={styles.fieldLabel}>Event name</Label>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="e.g. Aisha & Dev, Sangeet"
            placeholderTextColor={colors.textFaint}
            accessibilityLabel="Event name"
            autoFocus
          />

          {/* Event type */}
          <Label style={styles.fieldLabel}>Type</Label>
          <View style={styles.chips}>
            {EVENT_TYPES.map((t) => {
              const active = t.key === type;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setType(t.key)}
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

          {/* Starts (optional) */}
          <Label style={styles.fieldLabel}>Starts (optional)</Label>
          <TextInput
            value={startsAt}
            onChangeText={setStartsAt}
            style={styles.input}
            placeholder="2026-06-29T18:00"
            placeholderTextColor={colors.textFaint}
            accessibilityLabel="Start date and time"
            autoCapitalize="none"
          />

          {/* Venue (optional) */}
          <Label style={styles.fieldLabel}>Venue (optional)</Label>
          <TextInput
            value={venue}
            onChangeText={setVenue}
            style={styles.input}
            placeholder="Where is it?"
            placeholderTextColor={colors.textFaint}
            accessibilityLabel="Venue"
          />

          {/* Visibility */}
          <Label style={styles.fieldLabel}>Visibility</Label>
          <Segmented
            options={VISIBILITY_OPTIONS}
            value={visibility}
            onChange={setVisibility}
          />

          {/* Photos per guest */}
          <View style={styles.capRow}>
            <Text style={styles.capLabel}>Photos per guest</Text>
            <Text style={styles.capValue}>
              {cap === 0 ? 'Unlimited' : cap}
            </Text>
          </View>
          <Slider steps={CAP_STEPS} value={cap} onChange={setCap} />

          {/* Face matching */}
          <View style={styles.toggles}>
            <SettingRow
              title="Face matching"
              hint="Guests find their photos with a selfie"
              value={faceMatching}
              onChange={setFaceMatching}
              divider={false}
            />
          </View>

          {/* Advanced settings (collapsed) */}
          <Pressable
            onPress={toggleAdvanced}
            style={styles.advancedHeader}
            accessibilityRole="button"
            accessibilityState={{ expanded: advancedOpen }}
            accessibilityLabel="Advanced settings"
            hitSlop={8}
          >
            <Text style={styles.advancedTitle}>Advanced settings</Text>
            <View style={styles.advancedRight}>
              <Text style={styles.advancedHint}>Optional</Text>
              <Ionicons
                name={advancedOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
              />
            </View>
          </Pressable>

          {advancedOpen ? (
            <View style={styles.advancedBody}>
              <View style={styles.capRow}>
                <Text style={styles.capLabel}>Total photo cap</Text>
                <Text style={styles.capValue}>
                  {totalCap === 0 ? 'No cap' : totalCap}
                </Text>
              </View>
              <Slider
                steps={[0, 200, 500, 1000, 5000]}
                value={totalCap}
                onChange={setTotalCap}
              />

              <Label style={styles.fieldLabel}>Upload window</Label>
              <Segmented
                options={UPLOAD_WINDOW_OPTIONS}
                value={uploadWindow}
                onChange={setUploadWindow}
              />

              <Label style={styles.fieldLabel}>Downloads</Label>
              <Segmented
                options={DOWNLOAD_OPTIONS}
                value={downloadPolicy}
                onChange={setDownloadPolicy}
              />

              <View style={styles.advGroup}>
                <SettingRow
                  title="Allow video"
                  hint="Guests can post short clips"
                  value={allowVideo}
                  onChange={setAllowVideo}
                />
                <SettingRow
                  title="Live capture only"
                  hint="No uploads from camera roll"
                  value={liveCaptureOnly}
                  onChange={setLiveCaptureOnly}
                />
                <SettingRow
                  title="Geo-tagging"
                  hint="Tag photos with location"
                  value={geoEnabled}
                  onChange={setGeoEnabled}
                />
                <SettingRow
                  title="Geofence to venue"
                  hint="Only accept photos shot here"
                  value={geofenceEnabled}
                  onChange={setGeofenceEnabled}
                />
                {geofenceEnabled ? (
                  <>
                    <View style={styles.capRow}>
                      <Text style={styles.capLabel}>Geofence radius</Text>
                      <Text style={styles.capValue}>{geofenceRadiusM} m</Text>
                    </View>
                    <Slider
                      steps={[100, 200, 300, 500, 1000]}
                      value={geofenceRadiusM}
                      onChange={setGeofenceRadiusM}
                    />
                  </>
                ) : null}
                <SettingRow
                  title="Map view"
                  hint="Show photos on a map"
                  value={mapView}
                  onChange={setMapView}
                />
                <SettingRow
                  title="Auto highlights"
                  hint="AI picks the best shots"
                  value={autoHighlights}
                  onChange={setAutoHighlights}
                />
                <SettingRow
                  title="Semantic search"
                  hint="Search photos by description"
                  value={semanticSearch}
                  onChange={setSemanticSearch}
                />
                <SettingRow
                  title="Auto moderation"
                  hint="Flag inappropriate photos"
                  value={autoModeration}
                  onChange={setAutoModeration}
                />
                <SettingRow
                  title="Require name to join"
                  hint="Guests give a name first"
                  value={requireName}
                  onChange={setRequireName}
                />
                <SettingRow
                  title="Host approval"
                  hint="Review photos before they show"
                  value={hostApproval}
                  onChange={setHostApproval}
                />
                <SettingRow
                  title="Upload to unlock"
                  hint="Guests post before they browse"
                  value={uploadToUnlock}
                  onChange={setUploadToUnlock}
                  divider={false}
                />
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PillButton
            label="Create & go live"
            trailing={<Ionicons name="radio" size={16} color={colors.ink} />}
            loading={busy}
            onPress={create}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topbar: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  body: { padding: 20, paddingTop: 18, paddingBottom: 32 },
  fieldLabel: { marginTop: 18, marginBottom: 8 },
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
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
  toggles: { marginTop: 10 },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginTop: 24,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
  advancedTitle: {
    fontFamily: fonts.displaySemibold,
    fontSize: 15,
    color: colors.text,
  },
  advancedRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  advancedHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textFaint,
  },
  advancedBody: { marginTop: 4 },
  advGroup: { marginTop: 12 },
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
