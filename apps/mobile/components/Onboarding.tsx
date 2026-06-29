import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme/tokens';
import { setOnboarded } from '@/lib/store';
import { useReduceMotion } from '@/lib/useReduceMotion';
import { RecDot } from './RecDot';
import { Viewfinder } from './Viewfinder';

/**
 * First-run guided tour. A native re-creation of the driver.js coachmark
 * feel: focused, full-screen steps with a bold motif, progress dots, swipe
 * navigation, and Back / Next / Skip. Dark theme, lime accents, no em dashes.
 *
 * Controlled via { visible, onClose }. On finishing the last step OR Skip it
 * calls setOnboarded(true) then onClose. The _layout host owns the visible
 * flag so the same overlay serves first-run AND the replay help button.
 */

type StepArt =
  | { kind: 'icon'; name: keyof typeof Ionicons.glyphMap }
  | { kind: 'rec' }
  | { kind: 'viewfinder'; name: keyof typeof Ionicons.glyphMap };

interface Step {
  art: StepArt;
  eyebrow: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    art: { kind: 'rec' },
    eyebrow: 'Welcome',
    title: 'Welcome to BOCC',
    description:
      'Be our camera crew. Everyone at the event helps capture the day, together.',
  },
  {
    art: { kind: 'icon', name: 'qr-code-outline' },
    eyebrow: 'Step one',
    title: 'Join in seconds',
    description: 'Scan the event QR code to hop in. No account, no sign up.',
  },
  {
    art: { kind: 'viewfinder', name: 'camera-outline' },
    eyebrow: 'Step two',
    title: 'Drop your shots',
    description:
      'Capture or import photos into the shared pool, dressed in event frames.',
  },
  {
    art: { kind: 'icon', name: 'happy-outline' },
    eyebrow: 'Step three',
    title: 'Find yourself',
    description: 'One selfie surfaces every photo you appear in across the event.',
  },
  {
    art: { kind: 'icon', name: 'sparkles-outline' },
    eyebrow: 'Step four',
    title: 'Host your own',
    description: 'Create an event, share the QR, and let the crew roll in.',
  },
];

export interface OnboardingProps {
  visible: boolean;
  onClose: () => void;
}

export function Onboarding({ visible, onClose }: OnboardingProps) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const [index, setIndex] = useState(0);
  // Horizontal track offset, in screen widths. We animate this and snap.
  const progress = useSharedValue(0);
  const last = STEPS.length - 1;

  // Reset to the first step every time the tour opens (covers replay).
  useEffect(() => {
    if (visible) {
      setIndex(0);
      progress.value = 0;
    }
  }, [visible, progress]);

  const announce = useCallback((step: number) => {
    const s = STEPS[step];
    AccessibilityInfo.announceForAccessibility?.(
      `Step ${step + 1} of ${STEPS.length}. ${s.title}. ${s.description}`,
    );
  }, []);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(last, next));
      setIndex(clamped);
      if (reduceMotion) {
        progress.value = clamped;
      } else {
        progress.value = withSpring(clamped, {
          damping: 18,
          stiffness: 160,
          mass: 0.7,
        });
      }
      announce(clamped);
    },
    [announce, last, progress, reduceMotion],
  );

  const finish = useCallback(() => {
    setOnboarded(true);
    onClose();
  }, [onClose]);

  const handleNext = useCallback(() => {
    if (index >= last) finish();
    else goTo(index + 1);
  }, [finish, goTo, index, last]);

  const handleBack = useCallback(() => {
    if (index > 0) goTo(index - 1);
  }, [goTo, index]);

  // Swipe between steps. We commit by changing `index`, then snap the track.
  const indexRef = useRef(index);
  indexRef.current = index;
  const swipe = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-16, 16])
    .onUpdate((e) => {
      const dragSteps = -e.translationX / width;
      const target = indexRef.current + dragSteps;
      // Resist dragging past the ends.
      progress.value = Math.max(-0.18, Math.min(last + 0.18, target));
    })
    .onEnd((e) => {
      const threshold = width * 0.22;
      let next = indexRef.current;
      if (e.translationX < -threshold || e.velocityX < -600) next += 1;
      else if (e.translationX > threshold || e.velocityX > 600) next -= 1;
      next = Math.max(0, Math.min(last, next));
      runOnJS(goTo)(next);
    });

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.value * width }],
    flexDirection: 'row',
    width: width * STEPS.length,
  }));

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={finish}
    >
      <View style={styles.backdrop}>
        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(220)} style={styles.fill}>
          {/* soft lime / coral mesh, matching the app shell */}
          <View pointerEvents="none" style={styles.mesh}>
            <View style={[styles.blob, styles.blobLime]} />
            <View style={[styles.blob, styles.blobCoral]} />
          </View>

          <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
            {/* Top bar: brand mark + Skip */}
            <View style={styles.topBar}>
              <View style={styles.brand}>
                <Text style={styles.brandMark}>BOCC</Text>
              </View>
              <Pressable
                onPress={finish}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Skip the tour"
                style={({ pressed }) => [styles.skip, pressed && styles.pressedDim]}
              >
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
            </View>

            {/* Swipeable step track */}
            <GestureDetector gesture={swipe}>
              <View style={styles.trackWrap}>
                <Animated.View style={trackStyle}>
                  {STEPS.map((step, i) => (
                    <Slide
                      key={i}
                      step={step}
                      i={i}
                      width={width}
                      progress={progress}
                      reduceMotion={reduceMotion}
                    />
                  ))}
                </Animated.View>
              </View>
            </GestureDetector>

            {/* Progress dots */}
            <View
              style={styles.dots}
              accessibilityRole="progressbar"
              accessibilityLabel={`Step ${index + 1} of ${STEPS.length}`}
            >
              {STEPS.map((_, i) => (
                <Dot key={i} i={i} progress={progress} />
              ))}
            </View>

            {/* Controls */}
            <View style={styles.controls}>
              <Pressable
                onPress={handleBack}
                disabled={index === 0}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Go back a step"
                accessibilityState={{ disabled: index === 0 }}
                style={({ pressed }) => [
                  styles.backBtn,
                  index === 0 && styles.backBtnHidden,
                  pressed && styles.pressedDim,
                ]}
              >
                <Ionicons name="chevron-back" size={20} color={colors.text} />
                <Text style={styles.backText}>Back</Text>
              </Pressable>

              <Pressable
                onPress={handleNext}
                accessibilityRole="button"
                accessibilityLabel={index >= last ? 'Finish the tour' : 'Next step'}
                style={({ pressed }) => [styles.nextBtn, pressed && styles.pressedScale]}
              >
                <Text style={styles.nextText}>
                  {index >= last ? 'Get started' : 'Next'}
                </Text>
                <Ionicons
                  name={index >= last ? 'checkmark' : 'arrow-forward'}
                  size={20}
                  color={colors.ink}
                />
              </Pressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** One step panel. Subtly parallax-scales as it moves through center. */
function Slide({
  step,
  i,
  width,
  progress,
  reduceMotion,
}: {
  step: Step;
  i: number;
  width: number;
  progress: Animated.SharedValue<number>;
  reduceMotion: boolean;
}) {
  const animStyle = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    const d = progress.value - i;
    const scale = interpolate(d, [-1, 0, 1], [0.88, 1, 0.88], 'clamp');
    const opacity = interpolate(d, [-1, 0, 1], [0.3, 1, 0.3], 'clamp');
    const translateY = interpolate(d, [-1, 0, 1], [16, 0, 16], 'clamp');
    return { transform: [{ scale }, { translateY }], opacity };
  });

  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View style={[styles.slideInner, animStyle]}>
        <StepArtwork art={step.art} />
        <Text style={styles.eyebrow}>{step.eyebrow}</Text>
        <Text
          style={styles.title}
          accessibilityRole="header"
          accessibilityLabel={step.title}
        >
          {step.title}
        </Text>
        <Text style={styles.description}>{step.description}</Text>
      </Animated.View>
    </View>
  );
}

/** Big motif for a step: REC dot, Viewfinder, or a plain glyph badge. */
function StepArtwork({ art }: { art: StepArt }) {
  if (art.kind === 'rec') {
    return (
      <Badge>
        <View style={styles.recStack}>
          <Ionicons name="videocam" size={48} color={colors.lime} />
          <View style={styles.recPill}>
            <RecDot label="LIVE" />
          </View>
        </View>
      </Badge>
    );
  }
  if (art.kind === 'viewfinder') {
    return (
      <Viewfinder style={styles.vf}>
        <View style={styles.vfInner}>
          <Ionicons name={art.name} size={52} color={colors.lime} />
        </View>
      </Viewfinder>
    );
  }
  return (
    <Badge>
      <Ionicons name={art.name} size={56} color={colors.lime} />
    </Badge>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <View style={styles.badge}>{children}</View>;
}

/** A progress dot that grows into a lime pill when its step is active. */
function Dot({ i, progress }: { i: number; progress: Animated.SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(progress.value - i);
    const active = interpolate(d, [0, 1], [1, 0], 'clamp');
    return {
      width: withTiming(8 + active * 16, { duration: 160, easing: Easing.out(Easing.cubic) }),
      backgroundColor: active > 0.5 ? colors.lime : colors.hairlineStrong,
      opacity: 0.5 + active * 0.5,
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: colors.ink },
  mesh: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  blob: { position: 'absolute', width: 460, height: 460, borderRadius: 460 },
  blobLime: { backgroundColor: colors.lime, opacity: 0.1, top: -160, left: -120 },
  blobCoral: { backgroundColor: colors.coral, opacity: 0.08, bottom: -180, right: -140 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    height: 56,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 1,
    color: colors.text,
  },
  skip: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  skipText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted },

  trackWrap: { flex: 1, overflow: 'hidden' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  slideInner: { alignItems: 'center', maxWidth: 360 },

  badge: {
    width: 132,
    height: 132,
    borderRadius: radius.xl,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  recStack: { alignItems: 'center', gap: 12 },
  recPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  vf: { width: 132, height: 132, marginBottom: 36 },
  vfInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  eyebrow: {
    fontFamily: fonts.displayMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.lime,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 34,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
    textAlign: 'center',
  },

  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 24,
    marginBottom: 8,
  },
  dot: { height: 8, borderRadius: 4 },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
  },
  backBtnHidden: { opacity: 0 },
  backText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  nextBtn: {
    flex: 1,
    maxWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.lime,
  },
  nextText: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.ink },

  pressedDim: { opacity: 0.6 },
  pressedScale: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
