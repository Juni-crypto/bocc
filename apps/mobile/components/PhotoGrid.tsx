import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius } from '@/theme/tokens';
import { type Photo } from '@/lib/api';
import { PhotoViewer } from './PhotoViewer';

/**
 * Masonry-ish photo grid. Column count adapts to the viewport (2 on phones,
 * 3 on large phones / tablets) so tiles never balloon on wide screens, and
 * each column flexes to an even share of the available width. Tile heights
 * vary to read like the .mcol layout in the mockup. Renders the API
 * photo.thumbUrl (absolute) directly via expo-image.
 *
 * Each tile is tappable and opens a full-screen PhotoViewer at that index.
 * Viewer open/index state lives here so every screen using PhotoGrid gets the
 * viewer (with optional host delete) for free.
 */
export function PhotoGrid({
  photos,
  badge,
  footer,
  gap = 7,
  canDelete = false,
  onDelete,
}: {
  photos: Photo[];
  /** Optional per-tile badge text (e.g. "pending"). */
  badge?: string;
  /** Optional trailing node appended after the last column item. */
  footer?: ReactNode;
  gap?: number;
  /** Show a delete action in the viewer (hosts / admins). */
  canDelete?: boolean;
  /** Invoked when the viewer confirms a delete. */
  onDelete?: (photo: Photo) => Promise<void>;
}) {
  const { width } = useWindowDimensions();
  const columnCount = width >= 700 ? 3 : 2;

  // Flat index used by the viewer for prev/next paging across all photos.
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Distribute photos round-robin across columns so each column flexes evenly.
  const columns: { photo: Photo; index: number }[][] = Array.from(
    { length: columnCount },
    () => [],
  );
  photos.forEach((p, i) => columns[i % columnCount].push({ photo: p, index: i }));

  return (
    <>
      <View style={[styles.row, { gap }]}>
        {columns.map((col, ci) => (
          <View key={ci} style={[styles.col, { gap }]}>
            {col.map(({ photo, index }, i) => (
              <Tile
                key={photo.id}
                photo={photo}
                tall={(i + ci) % 3 === 0}
                badge={badge}
                onPress={() => setViewerIndex(index)}
              />
            ))}
            {ci === columnCount - 1 ? footer : null}
          </View>
        ))}
      </View>

      {viewerIndex != null ? (
        <PhotoViewer
          photos={photos}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
          canDelete={canDelete}
          onDelete={
            onDelete
              ? async (photo) => {
                  await onDelete(photo);
                  setViewerIndex(null);
                }
              : undefined
          }
        />
      ) : null}
    </>
  );
}

function Tile({
  photo,
  tall,
  badge,
  onPress,
}: {
  photo: Photo;
  tall: boolean;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="imagebutton"
      accessibilityLabel={
        photo.isVideo ? 'Open event video' : 'Open event photo'
      }
      style={({ pressed }) => [
        styles.tile,
        { aspectRatio: tall ? 0.78 : 1 },
        pressed && styles.pressed,
      ]}
    >
      <Image
        source={{ uri: photo.thumbUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={250}
        accessible={false}
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
    </Pressable>
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
  pressed: { opacity: 0.85 },
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
