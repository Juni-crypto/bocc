import { type ReactNode } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius } from '@/theme/tokens';
import { type Photo } from '@/lib/api';

/**
 * Masonry-ish photo grid. Column count adapts to the viewport (2 on phones,
 * 3 on large phones / tablets) so tiles never balloon on wide screens, and
 * each column flexes to an even share of the available width. Tile heights
 * vary to read like the .mcol layout in the mockup. Renders the API
 * photo.thumbUrl (absolute) directly via expo-image.
 */
export function PhotoGrid({
  photos,
  badge,
  footer,
  gap = 7,
}: {
  photos: Photo[];
  /** Optional per-tile badge text (e.g. "pending"). */
  badge?: string;
  /** Optional trailing node appended after the last column item. */
  footer?: ReactNode;
  gap?: number;
}) {
  const { width } = useWindowDimensions();
  const columnCount = width >= 700 ? 3 : 2;

  // Distribute photos round-robin across columns so each column flexes evenly.
  const columns: Photo[][] = Array.from({ length: columnCount }, () => []);
  photos.forEach((p, i) => columns[i % columnCount].push(p));

  return (
    <View style={[styles.row, { gap }]}>
      {columns.map((col, ci) => (
        <View key={ci} style={[styles.col, { gap }]}>
          {col.map((p, i) => (
            <Tile key={p.id} photo={p} tall={(i + ci) % 3 === 0} badge={badge} />
          ))}
          {ci === columnCount - 1 ? footer : null}
        </View>
      ))}
    </View>
  );
}

function Tile({
  photo,
  tall,
  badge,
}: {
  photo: Photo;
  tall: boolean;
  badge?: string;
}) {
  return (
    <View style={[styles.tile, { aspectRatio: tall ? 0.78 : 1 }]}>
      <Image
        source={{ uri: photo.thumbUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={250}
        accessible
        accessibilityRole="image"
        accessibilityLabel={
          photo.isVideo ? 'Event video thumbnail' : 'Event photo'
        }
      />
      {photo.isVideo && (
        <View style={styles.play} accessible={false}>
          <Text style={styles.playIcon} accessibilityElementsHidden>
            {'▶'}
          </Text>
        </View>
      )}
      {badge && (
        <View style={styles.badge} accessible={false}>
          <Text style={styles.badgeTxt} accessibilityElementsHidden>
            {badge}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  col: { flex: 1 },
  tile: {
    width: '100%',
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  play: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(5,5,5,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: '#fff', fontSize: 9 },
  badge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(5,5,5,0.8)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeTxt: { color: '#fff', fontSize: 9 },
});
