import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/theme/tokens';

export interface SegmentOption<T extends string> {
  key: T;
  label: string;
}

/** Pill segmented control matching .seg in the mockup. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={styles.seg}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            style={[styles.btn, active && styles.btnOn]}
            onPress={() => onChange(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.txt, active && styles.txtOn]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  seg: {
    flexDirection: 'row',
    gap: 3,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 999,
    padding: 3,
  },
  btn: {
    flex: 1,
    minHeight: 38,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOn: { backgroundColor: colors.lime },
  txt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textMuted,
  },
  txtOn: { color: colors.ink, fontFamily: fonts.bodySemibold },
});
