import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '@/theme/tokens';
import { FRAME_VARIANTS, type FrameVariant } from './EventFrame';

const ICONS: Record<FrameVariant, keyof typeof Ionicons.glyphMap> = {
  None: 'ban-outline',
  Classic: 'square-outline',
  Viewfinder: 'scan-outline',
  Polaroid: 'image-outline',
  Badge: 'ribbon-outline',
};

/** Horizontal chip rail to switch the active branded frame variant. */
export function FramePicker({
  value,
  onChange,
}: {
  value: FrameVariant;
  onChange: (next: FrameVariant) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="radiogroup"
    >
      {FRAME_VARIANTS.map((variant) => {
        const active = variant === value;
        return (
          <Pressable
            key={variant}
            onPress={() => onChange(variant)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${variant} frame`}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && !active && styles.chipPressed,
            ]}
          >
            <Ionicons
              name={ICONS[variant]}
              size={16}
              color={active ? colors.ink : colors.textMuted}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {variant}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2, paddingRight: 8 },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  chipActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  chipPressed: { backgroundColor: colors.fillStrong, transform: [{ scale: 0.97 }] },
  label: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.text },
  labelActive: { color: colors.ink },
});
