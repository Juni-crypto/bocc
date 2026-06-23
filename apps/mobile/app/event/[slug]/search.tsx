import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { Display, Label } from '@/components/ui';
import { colors, fonts, radius } from '@/theme/tokens';

const SUGGESTIONS = ['the cake', 'dance floor', 'first dance', 'kids', 'sunset'];

/**
 * Semantic search tab (CLIP-style). The backend search endpoint is not wired
 * yet, so this shows a clean placeholder rather than faking results.
 */
export default function SearchScreen() {
  const [q, setQ] = useState('');

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
              onPress={() => setQ(s)}
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
        <Text style={styles.empty}>
          {q.trim()
            ? 'Semantic search is coming soon. Results will appear here once the backend search endpoint is live.'
            : 'Search the pooled gallery by what is in the photo. OCR and CLIP run on the backend.'}
        </Text>
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
