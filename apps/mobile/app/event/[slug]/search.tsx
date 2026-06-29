import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Display, Label } from '@/components/ui';
import { PhotoGrid } from '@/components/PhotoGrid';
import { api, type Photo } from '@/lib/api';
import { colors, fonts, radius } from '@/theme/tokens';

const SUGGESTIONS = ['the cake', 'dance floor', 'first dance', 'kids', 'sunset'];

/**
 * Semantic search tab. Real CLIP search via the backend (-> Immich), scoped to
 * the event. Renders matched photos; no fabricated results.
 */
export default function SearchScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [q, setQ] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const run = async (term: string) => {
    const query = term.trim();
    if (!query || !slug) return;
    setLoading(true);
    setSearched(true);
    setNote(null);
    try {
      const res = await api.search(slug, query);
      setPhotos(res.photos ?? []);
      setNote(res.note ?? null);
    } catch {
      setPhotos([]);
      setNote('Search is unavailable right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.head}>
        <Label>Semantic search</Label>
        <Display size={22} style={{ marginTop: 4 }}>
          Find the moment
        </Display>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder='Try "the cake" or "first dance"'
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={() => run(q)}
          accessibilityLabel="Search the gallery"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled"
        >
          {SUGGESTIONS.map((s) => (
            <Pressable
              key={s}
              style={styles.chip}
              onPress={() => {
                setQ(s);
                run(s);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Search for ${s}`}
              hitSlop={8}
            >
              <Text style={styles.chipTxt}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.lime} style={{ marginTop: 40 }} />
        ) : !searched ? (
          <Text style={styles.empty}>
            Search the pooled gallery by what is in the photo. OCR and CLIP run on
            the backend.
          </Text>
        ) : note ? (
          <Text style={styles.empty}>{note}</Text>
        ) : photos.length ? (
          <PhotoGrid photos={photos} />
        ) : (
          <Text style={styles.empty}>
            Nothing matched "{q.trim()}". Try different words.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineSoft,
  },
  input: {
    marginTop: 14,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  chips: { gap: 8, paddingTop: 12, paddingRight: 8, alignItems: 'center' },
  chip: {
    minHeight: 36,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 999,
    paddingHorizontal: 14,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chipTxt: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  grid: { padding: 12, paddingBottom: 96 },
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 30,
    lineHeight: 21,
  },
});
