import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  CameraView,
  type CameraType,
  type FlashMode,
  useCameraPermissions,
} from 'expo-camera';
import { captureRef } from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { PillButton } from '@/components/PillButton';
import { Display, Label } from '@/components/ui';
import {
  EventFrame,
  type FrameVariant,
} from '@/components/EventFrame';
import { FramePicker } from '@/components/FramePicker';
import { colors, fonts, radius } from '@/theme/tokens';
import { api, ApiError, type LocalFile } from '@/lib/api';
import { getMemberId, setMemberId, addJoinedEvent } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useEventSlug } from '@/lib/nav';

const CAP = 15;
type Mode = 'camera' | 'library';

/**
 * Step 3 - Capture studio. Shoot in-app or pull from the library, dress each
 * shot in an event-branded frame baked into the pixels, then upload to the
 * live event with the chosen frame applied.
 */
export default function AddScreen() {
  const { memberId: memberIdParam } = useLocalSearchParams<{
    memberId?: string;
  }>();
  const eventSlug = useEventSlug();
  const { user } = useAuth();
  const [memberId, setLocalMemberId] = useState<string | undefined>(
    memberIdParam || getMemberId(eventSlug),
  );

  const [mode, setMode] = useState<Mode>('camera');
  const [eventName, setEventName] = useState<string>(eventSlug);

  // capture / library state
  const [shots, setShots] = useState<string[]>([]); // raw photo URIs queued
  const [frame, setFrame] = useState<FrameVariant>('None');

  // camera control
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const cameraRef = useRef<CameraView>(null);
  const [shooting, setShooting] = useState(false);

  // upload lifecycle
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 baking progress
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // hidden offscreen frame used as the captureRef bake target
  const frameRef = useRef<View>(null);
  const [bakeUri, setBakeUri] = useState<string | null>(null);

  const count = shots.length;
  const full = count >= CAP;

  // Pull the real event name for the frames (fallback to slug).
  useEffect(() => {
    let alive = true;
    if (!eventSlug) return;
    api
      .getEvent(eventSlug)
      .then((e) => {
        if (alive && e?.name) setEventName(e.name);
      })
      .catch(() => {
        /* keep slug fallback */
      });
    return () => {
      alive = false;
    };
  }, [eventSlug]);

  // If camera permission is denied outright, nudge toward Library.
  useEffect(() => {
    if (mode === 'camera' && permission && !permission.granted && !permission.canAskAgain) {
      setMode('library');
    }
  }, [mode, permission]);

  const takeShot = async () => {
    if (!cameraRef.current || shooting || full) return;
    setShooting(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      if (photo?.uri) setShots((prev) => [...prev, photo.uri].slice(0, CAP));
    } catch {
      setError('Could not capture. Try again.');
    } finally {
      setShooting(false);
    }
  };

  const pickFromLibrary = async () => {
    if (full) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo library access is needed to pick shots.');
      return;
    }
    setError(null);
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: CAP - count,
      quality: 0.6,
    });
    if (res.canceled) return;
    setShots((prev) => [...prev, ...res.assets.map((a) => a.uri)].slice(0, CAP));
  };

  const removeShot = (uri: string) =>
    setShots((prev) => prev.filter((u) => u !== uri));

  // Bake one shot inside the chosen frame; returns the framed file URI.
  // "None" skips the offscreen capture entirely for speed.
  const bakeOne = (uri: string): Promise<string> => {
    if (frame === 'None') return Promise.resolve(uri);
    // Always resolves: if the offscreen frame capture stalls or fails, fall
    // back to the original photo so the upload can never hang on baking.
    return new Promise((resolve) => {
      let settled = false;
      const finish = (out: string) => {
        if (settled) return;
        settled = true;
        resolve(out);
      };
      const fallback = setTimeout(() => finish(uri), 4000);
      setBakeUri(uri);
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (!frameRef.current) {
            clearTimeout(fallback);
            finish(uri);
            return;
          }
          captureRef(frameRef, { format: 'jpg', quality: 0.9 })
            .then((out) => {
              clearTimeout(fallback);
              finish(out);
            })
            .catch(() => {
              clearTimeout(fallback);
              finish(uri);
            });
        }, 60);
      });
    });
  };

  const submit = async () => {
    if (!count) return;
    if (!eventSlug) {
      setError('Open the event again to add photos.');
      return;
    }
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      // Resolve membership on demand. A host (or anyone viewing the event) can
      // add photos without a separate join step: if we have no member yet, join
      // silently with the account name (or Guest), then upload.
      let mid = memberId;
      if (!mid) {
        const joined = await api.join(eventSlug, {
          name: user?.name || 'Guest',
          consentFaceMatch: true,
        });
        mid = joined.member.id;
        setLocalMemberId(mid);
        setMemberId(eventSlug, mid);
        addJoinedEvent({
          slug: eventSlug,
          name: joined.event?.name ?? eventName,
          memberId: mid,
        });
      }
      const files: LocalFile[] = [];
      for (let i = 0; i < shots.length; i++) {
        const framed = await bakeOne(shots[i]);
        files.push({ uri: framed, name: `shot-${i}.jpg`, type: 'image/jpeg' });
        setProgress((i + 1) / shots.length);
      }
      setBakeUri(null);
      await api.uploadPhotos(eventSlug, files, { memberId: mid });
      setDone(true);
      router.push({
        pathname: '/event/[slug]',
        params: { slug: eventSlug, memberId: mid },
      });
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Upload failed. Check the API is running.',
      );
    } finally {
      setBusy(false);
      setBakeUri(null);
    }
  };

  const previewUri = shots[shots.length - 1];
  const hasShots = count > 0;

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Label>Capture studio</Label>
          <Display size={24} style={{ marginTop: 6 }}>
            {eventName}
          </Display>
        </View>
        <View style={styles.counterChip}>
          <Text style={styles.counter}>
            {count}
            <Text style={styles.counterTotal}>/{CAP}</Text>
          </Text>
        </View>
      </View>

      {/* segmented control */}
      <View style={styles.segment}>
        {(['camera', 'library'] as Mode[]).map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.segBtn,
                active && styles.segBtnActive,
                pressed && !active && styles.segBtnPressed,
              ]}
            >
              <Ionicons
                name={m === 'camera' ? 'camera' : 'images'}
                size={16}
                color={active ? colors.ink : colors.textMuted}
              />
              <Text style={[styles.segText, active && styles.segTextActive]}>
                {m === 'camera' ? 'Camera' : 'Library'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- THE STAGE (hero) ---- */}
        {mode === 'camera' ? (
          <CameraStage
            permission={permission}
            requestPermission={requestPermission}
            onUseLibrary={() => setMode('library')}
            cameraRef={cameraRef}
            facing={facing}
            flash={flash}
            shooting={shooting}
            full={full}
            count={count}
            onFlip={() =>
              setFacing((f) => (f === 'back' ? 'front' : 'back'))
            }
            onFlash={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))}
            onShutter={takeShot}
          />
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.libDrop,
              pressed && !full && styles.libDropPressed,
            ]}
            onPress={pickFromLibrary}
            accessibilityRole="button"
            accessibilityLabel="Pick photos from your library"
          >
            <View style={styles.libIconWrap}>
              <Ionicons name="images-outline" size={28} color={colors.lime} />
            </View>
            <Text style={styles.libTitle}>
              {full ? 'Roll is full' : 'Pick from your library'}
            </Text>
            <Text style={styles.libHint}>
              {full
                ? `You have all ${CAP} shots queued`
                : `Add up to ${CAP - count} more`}
            </Text>
          </Pressable>
        )}

        {/* ---- REVIEW (secondary, after first shot) ---- */}
        {hasShots && previewUri ? (
          <View style={styles.review}>
            <View style={styles.reviewHead}>
              <Label>Review</Label>
              <Text style={styles.reviewMeta} numberOfLines={1}>
                {frame === 'None'
                  ? 'No frame'
                  : `${frame} frame baked in`}
              </Text>
            </View>

            <View style={styles.previewCard}>
              <EventFrame
                uri={previewUri}
                eventName={eventName}
                variant={frame}
              />
            </View>

            {/* frame chooser */}
            <FramePicker value={frame} onChange={setFrame} />

            {/* queued thumbnails */}
            <View style={styles.tray}>
              {shots.map((uri) => (
                <View key={uri} style={styles.thumbWrap}>
                  <Image
                    source={{ uri }}
                    style={styles.thumb}
                    contentFit="cover"
                  />
                  <Pressable
                    style={({ pressed }) => [
                      styles.thumbX,
                      pressed && styles.thumbXPressed,
                    ]}
                    onPress={() => removeShot(uri)}
                    accessibilityRole="button"
                    accessibilityLabel="Remove this shot"
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={13} color={colors.ink} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {busy ? (
          <View style={styles.bakeRow}>
            <ActivityIndicator color={colors.lime} />
            <Text style={styles.bakeText}>
              {frame !== 'None' && progress < 1
                ? `Preparing frames ${Math.round(progress * 100)}%`
                : 'Uploading to the event...'}
            </Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={15} color={colors.coral} />
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}
        <PillButton
          label={
            done
              ? 'Added to gallery'
              : count > 0
                ? `Add ${count} to the event`
                : 'Add to the event'
          }
          trailing={
            <Ionicons name="arrow-up" size={17} color={colors.ink} />
          }
          loading={busy}
          disabled={count === 0}
          onPress={submit}
        />
        {!hasShots && !busy ? (
          <Text style={styles.footerHint}>
            {mode === 'camera'
              ? 'Tap the shutter to queue your first shot.'
              : 'Pick a photo to get started.'}
          </Text>
        ) : null}
      </View>

      {/* Offscreen bake target: full-res frame rendered just before capture. */}
      {bakeUri ? (
        <View pointerEvents="none" style={styles.offscreen}>
          <View ref={frameRef} collapsable={false} style={styles.bakeCanvas}>
            <EventFrame uri={bakeUri} eventName={eventName} variant={frame} />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

/** The live camera stage with permission gating + graceful fallback. */
function CameraStage({
  permission,
  requestPermission,
  onUseLibrary,
  cameraRef,
  facing,
  flash,
  shooting,
  full,
  count,
  onFlip,
  onFlash,
  onShutter,
}: {
  permission: ReturnType<typeof useCameraPermissions>[0];
  requestPermission: ReturnType<typeof useCameraPermissions>[1];
  onUseLibrary: () => void;
  cameraRef: React.RefObject<CameraView>;
  facing: CameraType;
  flash: FlashMode;
  shooting: boolean;
  full: boolean;
  count: number;
  onFlip: () => void;
  onFlash: () => void;
  onShutter: () => void;
}) {
  // Permission still loading.
  if (!permission) {
    return (
      <View style={styles.cameraStage}>
        <ActivityIndicator color={colors.lime} />
      </View>
    );
  }

  // Not yet granted: ask, or fall back to library.
  if (!permission.granted) {
    return (
      <View style={[styles.cameraStage, styles.permWrap]}>
        <View style={styles.libIconWrap}>
          <Ionicons name="camera-outline" size={28} color={colors.lime} />
        </View>
        <Text style={styles.permTitle}>Camera access</Text>
        <Text style={styles.permHint}>
          Allow the camera to shoot in-app, or use your library instead.
        </Text>
        <View style={styles.permBtns}>
          {permission.canAskAgain ? (
            <PillButton
              label="Allow camera"
              size="sm"
              onPress={requestPermission}
            />
          ) : null}
          <PillButton
            label="Use library"
            size="sm"
            variant="ghost"
            onPress={onUseLibrary}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cameraStage}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
      />

      {/* viewfinder corner ticks to echo the app motif */}
      <View style={[styles.tick, styles.tickTL]} pointerEvents="none" />
      <View style={[styles.tick, styles.tickTR]} pointerEvents="none" />
      <View style={[styles.tick, styles.tickBL]} pointerEvents="none" />
      <View style={[styles.tick, styles.tickBR]} pointerEvents="none" />

      {/* REC pill, top-left */}
      <View style={styles.recPill} pointerEvents="none">
        <View style={styles.recDot} />
        <Text style={styles.recText}>REC</Text>
      </View>

      {/* top controls */}
      <View style={styles.camTop}>
        <Pressable
          style={({ pressed }) => [
            styles.camCtrl,
            pressed && styles.camCtrlPressed,
          ]}
          onPress={onFlash}
          accessibilityRole="button"
          accessibilityLabel={flash === 'on' ? 'Flash on' : 'Flash off'}
        >
          <Ionicons
            name={flash === 'on' ? 'flash' : 'flash-off'}
            size={19}
            color={flash === 'on' ? colors.lime : colors.text}
          />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.camCtrl,
            pressed && styles.camCtrlPressed,
          ]}
          onPress={onFlip}
          accessibilityRole="button"
          accessibilityLabel="Flip camera"
        >
          <Ionicons name="camera-reverse" size={19} color={colors.text} />
        </Pressable>
      </View>

      {/* shutter */}
      <View style={styles.shutterWrap}>
        <Pressable
          onPress={onShutter}
          disabled={shooting || full}
          accessibilityRole="button"
          accessibilityLabel="Take photo"
          style={({ pressed }) => [
            styles.shutter,
            (shooting || full) && styles.shutterInert,
            pressed && !(shooting || full) && styles.shutterPressed,
          ]}
        >
          <View style={styles.shutterInner}>
            {shooting ? <ActivityIndicator color={colors.ink} /> : null}
          </View>
        </Pressable>
        {full ? (
          <Text style={styles.fullHint}>Roll is full</Text>
        ) : count > 0 ? (
          <Text style={styles.fullHint}>{count} queued</Text>
        ) : null}
      </View>
    </View>
  );
}

const STAGE_RADIUS = radius.xl;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  counterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  counter: { fontFamily: fonts.display, fontSize: 20, color: colors.lime },
  counterTotal: { fontSize: 14, color: colors.textGhost },

  segment: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.fillStrong,
  },
  segBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: radius.pill,
  },
  segBtnActive: { backgroundColor: colors.lime },
  segBtnPressed: { backgroundColor: colors.fill },
  segText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.text },
  segTextActive: { color: colors.ink },

  body: { padding: 20, paddingBottom: 20, gap: 22 },

  cameraStage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: STAGE_RADIUS,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tick: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: 'rgba(215,255,62,0.85)',
    zIndex: 4,
  },
  tickTL: { top: 14, left: 14, borderTopWidth: 2, borderLeftWidth: 2 },
  tickTR: { top: 14, right: 14, borderTopWidth: 2, borderRightWidth: 2 },
  tickBL: { bottom: 14, left: 14, borderBottomWidth: 2, borderLeftWidth: 2 },
  tickBR: { bottom: 14, right: 14, borderBottomWidth: 2, borderRightWidth: 2 },

  recPill: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(5,5,5,0.55)',
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    zIndex: 5,
  },
  recDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.coral,
  },
  recText: {
    fontFamily: fonts.displayMedium,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.text,
  },

  camTop: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    gap: 10,
    zIndex: 5,
  },
  camCtrl: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5,5,5,0.55)',
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  camCtrlPressed: { transform: [{ scale: 0.92 }], opacity: 0.85 },
  shutterWrap: {
    position: 'absolute',
    bottom: 22,
    alignItems: 'center',
    zIndex: 5,
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(5,5,5,0.25)',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: { transform: [{ scale: 0.96 }] },
  shutterInert: { opacity: 0.5 },
  fullHint: {
    marginTop: 10,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.text,
    backgroundColor: 'rgba(5,5,5,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },

  permWrap: { padding: 24, gap: 6 },
  permTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text,
    marginTop: 10,
  },
  permHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 19,
  },
  permBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },

  libDrop: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: STAGE_RADIUS,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.hairlineDash,
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  libDropPressed: { backgroundColor: colors.fillStrong, transform: [{ scale: 0.99 }] },
  libIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(215,255,62,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(215,255,62,0.25)',
  },
  libTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text,
    marginTop: 8,
  },
  libHint: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },

  review: { gap: 16 },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  reviewMeta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    flexShrink: 1,
    textAlign: 'right',
  },
  previewCard: {
    width: '70%',
    alignSelf: 'center',
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },

  tray: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbWrap: { position: 'relative' },
  thumb: {
    width: 58,
    height: 58,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  thumbX: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.ink,
  },
  thumbXPressed: { transform: [{ scale: 0.9 }] },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.ink,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
  bakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  bakeText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
  },
  error: {
    color: colors.coral,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    flex: 1,
  },
  footerHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: 10,
  },

  offscreen: {
    position: 'absolute',
    left: -10000,
    top: 0,
    width: 1080,
    height: 1440,
  },
  bakeCanvas: { width: 1080, height: 1440 },
});
