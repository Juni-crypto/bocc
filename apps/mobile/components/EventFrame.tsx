import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts, radius } from '@/theme/tokens';

/** The five branded frame variants a captured/picked photo can wear. */
export type FrameVariant =
  | 'None'
  | 'Classic'
  | 'Viewfinder'
  | 'Polaroid'
  | 'Badge';

export const FRAME_VARIANTS: FrameVariant[] = [
  'None',
  'Classic',
  'Viewfinder',
  'Polaroid',
  'Badge',
];

/** Short, human date used by the Classic footer caption. */
function shortDate(): string {
  return new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Renders a photo inside an event-branded frame. The same component is used
 * both for the on-screen preview and as the capture target baked into the
 * uploaded image via react-native-view-shot captureRef.
 */
export function EventFrame({
  uri,
  eventName,
  variant,
}: {
  uri: string;
  eventName: string;
  variant: FrameVariant;
}) {
  const name = (eventName || 'Event').trim();

  if (variant === 'Polaroid') {
    return (
      <View style={styles.polaroid}>
        <View style={styles.polaroidWindow}>
          <Image source={{ uri }} style={styles.fill} contentFit="cover" />
        </View>
        <Text style={styles.polaroidCaption} numberOfLines={1}>
          {name}
        </Text>
      </View>
    );
  }

  // The remaining variants overlay on top of a full-bleed photo.
  return (
    <View style={styles.base}>
      <Image source={{ uri }} style={styles.fill} contentFit="cover" />

      {variant === 'Classic' && (
        <>
          <View style={styles.classicBorder} pointerEvents="none" />
          <View style={styles.classicFooter}>
            <Text style={styles.classicName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.classicDate}>{shortDate()}</Text>
          </View>
        </>
      )}

      {variant === 'Viewfinder' && (
        <>
          <View style={[styles.tick, styles.tickTL]} pointerEvents="none" />
          <View style={[styles.tick, styles.tickTR]} pointerEvents="none" />
          <View style={[styles.tick, styles.tickBL]} pointerEvents="none" />
          <View style={[styles.tick, styles.tickBR]} pointerEvents="none" />
          <View style={styles.recRow}>
            <View style={styles.recDot} />
            <Text style={styles.recText}>REC</Text>
          </View>
          <View style={styles.vfNameWrap}>
            <Text style={styles.vfName} numberOfLines={1}>
              {name}
            </Text>
          </View>
        </>
      )}

      {variant === 'Badge' && (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {name}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fill: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },

  // ---- Classic ----
  classicBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderColor: colors.lime,
  },
  classicFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(5,5,5,0.78)',
    borderTopWidth: 2,
    borderTopColor: colors.lime,
  },
  classicName: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.text,
    marginRight: 12,
  },
  classicDate: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.lime,
  },

  // ---- Viewfinder ----
  tick: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: colors.lime,
  },
  tickTL: { top: 14, left: 14, borderTopWidth: 3, borderLeftWidth: 3 },
  tickTR: { top: 14, right: 14, borderTopWidth: 3, borderRightWidth: 3 },
  tickBL: { bottom: 14, left: 14, borderBottomWidth: 3, borderLeftWidth: 3 },
  tickBR: { bottom: 14, right: 14, borderBottomWidth: 3, borderRightWidth: 3 },
  recRow: {
    position: 'absolute',
    top: 22,
    left: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  recDot: {
    width: 11,
    height: 11,
    borderRadius: 999,
    backgroundColor: colors.coral,
  },
  recText: {
    fontFamily: fonts.displayMedium,
    fontSize: 13,
    letterSpacing: 2,
    color: colors.text,
  },
  vfNameWrap: {
    position: 'absolute',
    bottom: 24,
    left: 56,
    right: 56,
  },
  vfName: {
    fontFamily: fonts.display,
    fontSize: 15,
    letterSpacing: 0.5,
    color: colors.lime,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ---- Badge ----
  badge: {
    position: 'absolute',
    top: 18,
    left: -34,
    width: 150,
    transform: [{ rotate: '-45deg' }],
    backgroundColor: colors.lime,
    paddingVertical: 7,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  badgeText: {
    fontFamily: fonts.displaySemibold,
    fontSize: 12,
    letterSpacing: 0.4,
    color: colors.ink,
  },

  // ---- Polaroid ----
  polaroid: {
    flex: 1,
    backgroundColor: '#F6F5EF',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 0,
    borderRadius: radius.sm,
  },
  polaroidWindow: {
    flex: 1,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  polaroidCaption: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: '#16160F',
    textAlign: 'center',
    paddingVertical: 22,
  },
});
