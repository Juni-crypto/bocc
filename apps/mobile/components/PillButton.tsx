import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, radius } from '@/theme/tokens';

type Variant = 'primary' | 'ghost';

/** Pill CTA. Primary = lime fill, ghost = hairline outline. */
export function PillButton({
  label,
  onPress,
  variant = 'primary',
  trailing,
  loading = false,
  disabled = false,
  style,
  size = 'lg',
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  trailing?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  size?: 'sm' | 'lg';
}) {
  const isPrimary = variant === 'primary';
  const inert = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.lg,
        isPrimary ? styles.primary : styles.ghost,
        inert && styles.inert,
        pressed && !inert && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.ink : colors.text} />
      ) : (
        <>
          <Text
            style={[
              styles.label,
              size === 'sm' && styles.labelSm,
              isPrimary ? styles.labelPrimary : styles.labelGhost,
            ]}
          >
            {label}
          </Text>
          {trailing}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: radius.pill,
  },
  lg: { paddingVertical: 15 },
  sm: { paddingVertical: 11, paddingHorizontal: 18 },
  primary: { backgroundColor: colors.lime },
  ghost: {
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  inert: { opacity: 0.5 },
  pressed: { transform: [{ scale: 0.97 }] },
  label: { fontFamily: fonts.bodySemibold, fontSize: 15 },
  labelSm: { fontSize: 13 },
  labelPrimary: { color: colors.ink },
  labelGhost: { color: colors.text },
});
