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
  const [frame, setFrame] = useState<FrameVariant>('Classic');

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
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
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
      quality: 0.85,
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
    return new Promise((resolve, reject) => {
      setBakeUri(uri);
      // Let the offscreen frame paint before snapshotting it.
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (!frameRef.current) {
            reject(new Error('frame not ready'));
            return;
          }
          captureRef(frameRef, { format: 'jpg', quality: 0.9 })
            .then(resolve)
            .catch(reject);
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

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Label>Capture studio</Label>
          <Display size={24} style={{ marginTop: 6 }}>
            {eventName}
          </Display>
        </View>
        <Text style={styles.counter}>
          {count}
          <Text style={styles.counterTotal}>/{CAP}</Text>
        </Text>
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
              style={[styles.segBtn, active && styles.segBtnActive]}
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
        {/* ---- CAMERA MODE ---- */}
        {mode === 'camera' && (
          <CameraStage
            permission={permission}
            requestPermission={requestPermission}
            onUseLibrary={() => setMode('library')}
            cameraRef={cameraRef}
            facing={facing}
            flash={flash}
            shooting={shooting}
            full={full}
            onFlip={() =>
              setFacing((f) => (f === 'back' ? 'front' : 'back'))
            }
            onFlash={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))}
            onShutter={takeShot}
          />
        )}

        {/* ---- LIBRARY MODE ---- */}
        {mode === 'library' && (
          <Pressable
            style={styles.libDrop}
            onPress={pickFromLibrary}
            accessibilityRole="button"
            accessibilityLabel="Pick photos from your library"
          >
            <Ionicons name="images-outline" size={34} color={colors.lime} />
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

        {/* ---- FRAME + PREVIEW ---- */}
        {count > 0 && previewUri ? (
          <View style={styles.previewBlock}>
            <Label style={{ marginBottom: 10 }}>Branded frame</Label>
            <View style={styles.previewCard}>
              <EventFrame
                uri={previewUri}
                eventName={eventName}
                variant={frame}
              />
            </View>
            <Text style={styles.frameHint}>
              {frame === 'None'
                ? 'No frame baked. Shots upload as-is.'
                : `${frame} frame baked into every shot.`}
            </Text>
          </View>
        ) : null}

        {/* queued thumbnails */}
        {count > 0 ? (
          <View style={styles.tray}>
            {shots.map((uri) => (
              <View key={uri} style={styles.thumbWrap}>
                <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
                <Pressable
                  style={styles.thumbX}
                  onPress={() => removeShot(uri)}
                  accessibilityRole="button"
                  accessibilityLabel="Remove this shot"
                  hitSlop={8}
                >
                  <Ionicons name="close" size={14} color={colors.ink} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* frame picker rail sits above the CTA so it is always reachable */}
      {count > 0 ? <FramePicker value={frame} onChange={setFrame} /> : null}

      <View style={styles.footer}>
        {busy && progress > 0 ? (
          <View style={styles.bakeRow}>
            <ActivityIndicator color={colors.lime} />
            <Text style={styles.bakeText}>
              Baking frames {Math.round(progress * 100)}%
            </Text>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PillButton
          label={
            done
              ? 'Added to gallery'
              : count > 0
                ? `Add ${count} to the event`
                : 'Add to the event'
          }
          trailing={<Text style={{ color: colors.ink }}>{'↗'}</Text>}
          loading={busy}
          disabled={count === 0}
          onPress={submit}
        />
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
        <Ionicons name="camera-outline" size={34} color={colors.lime} />
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
      <View style={[styles.tick, styles.tickBR]} pointerEvents="none" />

      {/* top controls */}
      <View style={styles.camTop}>
        <Pressable
          style={styles.camCtrl}
          onPress={onFlash}
          accessibilityRole="button"
          accessibilityLabel={flash === 'on' ? 'Flash on' : 'Flash off'}
        >
          <Ionicons
            name={flash === 'on' ? 'flash' : 'flash-off'}
            size={20}
            color={flash === 'on' ? colors.lime : colors.text}
          />
        </Pressable>
        <Pressable
          style={styles.camCtrl}
          onPress={onFlip}
          accessibilityRole="button"
          accessibilityLabel="Flip camera"
        >
          <Ionicons name="camera-reverse" size={20} color={colors.text} />
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
            pressed && styles.shutterPressed,
          ]}
        >
          <View style={styles.shutterInner}>
            {shooting ? <ActivityIndicator color={colors.ink} /> : null}
          </View>
        </Pressable>
        {full ? (
          <Text style={styles.fullHint}>Roll is full</Text>
        ) : null}
      </View>
    </View>
  );
}

const STAGE_RADIUS = radius.xl;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  counter: { fontFamily: fonts.display, fontSize: 30, color: colors.lime },
  counterTotal: { fontSize: 18, color: colors.textGhost },

  segment: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 20,
    marginTop: 14,
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
  segText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.text },
  segTextActive: { color: colors.ink },

  body: { padding: 20, paddingBottom: 16, gap: 18 },

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
    width: 28,
    height: 28,
    borderColor: colors.lime,
    zIndex: 4,
  },
  tickTL: { top: 14, left: 14, borderTopWidth: 2, borderLeftWidth: 2 },
  tickBR: { bottom: 14, right: 14, borderBottomWidth: 2, borderRightWidth: 2 },

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
  shutterWrap: {
    position: 'absolute',
    bottom: 22,
    alignItems: 'center',
    zIndex: 5,
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: { transform: [{ scale: 0.94 }] },
  shutterInert: { opacity: 0.5 },
  fullHint: {
    marginTop: 8,
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
    marginTop: 6,
  },
  permHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 6,
  },
  permBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },

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
  libTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text,
    marginTop: 6,
  },
  libHint: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },

  previewBlock: { marginTop: 2 },
  previewCard: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: STAGE_RADIUS,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  frameHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 10,
  },

  tray: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbWrap: { position: 'relative' },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
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
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: colors.ink,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
  bakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  bakeText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text },
  error: {
    color: colors.coral,
    fontFamily: fonts.body,
    fontSize: 12,
    marginBottom: 10,
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
