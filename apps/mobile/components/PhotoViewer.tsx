import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts, radius } from '@/theme/tokens';
import { type Photo, type PersonRef } from '@/lib/api';

/** Format an ISO date into a readable "Jun 29, 2026, 3:14 PM" style string. */
function fmtDate(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return null;
  }
}

/**
 * Full-screen photo viewer modal. Horizontal paging between photos via a
 * paged FlatList, a top bar (index, close, delete-when-host), and a bottom
 * metadata strip (uploader, date, detected people). Locked to dark theme.
 */
export function PhotoViewer({
  photos,
  index,
  onClose,
  onIndexChange,
  canDelete = false,
  onDelete,
}: {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onIndexChange?: (i: number) => void;
  canDelete?: boolean;
  onDelete?: (photo: Photo) => Promise<void>;
}) {
  const { width } = useWindowDimensions();
  const [current, setCurrent] = useState(index);
  const [deleting, setDeleting] = useState(false);
  const listRef = useRef<FlatList<Photo>>(null);

  // Keep internal index in sync if the caller changes the starting index.
  useEffect(() => {
    setCurrent(index);
  }, [index]);

  // Android hardware back closes the viewer.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const onViewableChanged = useRef(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      const first = viewableItems[0]?.index;
      if (first != null) {
        setCurrent(first);
        onIndexChange?.(first);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const photo = photos[current];

  const handleDelete = useCallback(() => {
    if (!onDelete || !photo || deleting) return;
    Alert.alert(
      'Delete this photo?',
      'This removes it for everyone and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await onDelete(photo);
            } catch {
              Alert.alert('Could not delete', 'Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [onDelete, photo, deleting]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Photo>) => (
      <Pressable style={[styles.stage, { width }]} onPress={onClose}>
        <Image
          source={{ uri: item.originalUrl ?? item.thumbUrl }}
          style={styles.image}
          contentFit="contain"
          transition={200}
          accessible
          accessibilityRole="image"
          accessibilityLabel={item.isVideo ? 'Event video' : 'Event photo'}
        />
      </Pressable>
    ),
    [width, onClose],
  );

  const date = fmtDate(photo?.takenAt);
  const people = photo?.people ?? [];
  const hasMeta = !!(photo?.uploaderName || date || people.length);

  return (
    <Modal
      visible
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {/* top bar */}
        <View style={styles.topBar}>
          <Text style={styles.counter} accessibilityElementsHidden>
            {photos.length ? `${current + 1} / ${photos.length}` : ''}
          </Text>
          <View style={styles.topActions}>
            {canDelete && onDelete ? (
              <Pressable
                onPress={handleDelete}
                disabled={deleting}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Delete photo"
                accessibilityState={{ disabled: deleting }}
                style={({ pressed }) => [
                  styles.iconBtn,
                  styles.deleteBtn,
                  pressed && styles.pressed,
                  deleting && styles.inert,
                ]}
              >
                <Text style={styles.deleteGlyph}>{'\u{1F5D1}'}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close viewer"
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.closeGlyph}>{'✕'}</Text>
            </Pressable>
          </View>
        </View>

        {/* paged image stage */}
        <FlatList
          ref={listRef}
          data={photos}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({
            length: width,
            offset: width * i,
            index: i,
          })}
          onViewableItemsChanged={onViewableChanged}
          viewabilityConfig={viewabilityConfig}
          style={styles.list}
        />

        {/* metadata strip */}
        {hasMeta ? (
          <View style={styles.meta}>
            <View style={styles.metaRow}>
              {photo?.uploaderName ? (
                <Text style={styles.metaText}>
                  <Text style={styles.metaFaint}>Added by </Text>
                  {photo.uploaderName}
                </Text>
              ) : null}
              {date ? (
                <Text style={styles.metaText}>
                  <Text style={styles.metaFaint}>Taken </Text>
                  {date}
                </Text>
              ) : null}
            </View>
            {people.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.peopleRow}
              >
                {people.slice(0, 12).map((p, i) => (
                  <FaceChip key={p.id ?? i} person={p} />
                ))}
              </ScrollView>
            ) : null}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function FaceChip({ person }: { person: PersonRef }) {
  return (
    <View style={styles.chip}>
      {person.thumbUrl ? (
        <Image
          source={{ uri: person.thumbUrl }}
          style={styles.chipAvatar}
          contentFit="cover"
          accessibilityElementsHidden
        />
      ) : (
        <View style={[styles.chipAvatar, styles.chipAvatarBlank]} />
      )}
      {person.name ? <Text style={styles.chipName}>{person.name}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 52,
    paddingBottom: 10,
  },
  counter: {
    fontFamily: fonts.displayMedium,
    fontSize: 13,
    letterSpacing: 1.6,
    color: colors.lime,
  },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  deleteBtn: {
    backgroundColor: 'rgba(255,107,94,0.12)',
    borderColor: 'rgba(255,107,94,0.4)',
  },
  closeGlyph: { color: colors.text, fontSize: 18 },
  deleteGlyph: { color: colors.coral, fontSize: 16 },
  pressed: { opacity: 0.7 },
  inert: { opacity: 0.5 },
  list: { flex: 1 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  meta: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    gap: 10,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  metaText: { fontFamily: fonts.body, fontSize: 13, color: colors.text },
  metaFaint: { color: colors.textFaint },
  peopleRow: { gap: 8, paddingRight: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingLeft: 3,
    paddingRight: 10,
  },
  chipAvatar: { width: 26, height: 26, borderRadius: 13 },
  chipAvatarBlank: { backgroundColor: 'rgba(255,255,255,0.1)' },
  chipName: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
});
