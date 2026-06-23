import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/theme/tokens';
import { useReduceMotion } from '@/lib/useReduceMotion';

/**
 * Blinking live indicator. Coral is reserved ONLY for this dot.
 * Pass a label like "REC" or "RECORDING" / "SCANNING".
 */
export function RecDot({
  label = 'REC',
  color = colors.coral,
}: {
  label?: string;
  color?: string;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      opacity.stopAnimation();
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={label ? `${label}, live` : 'Live indicator'}
    >
      <Animated.View
        accessible={false}
        style={[styles.dot, { backgroundColor: color, opacity }]}
      />
      {label ? (
        <Text style={[styles.label, { color }]} accessibilityElementsHidden>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: {
    fontFamily: fonts.displayMedium,
    fontSize: 10,
    letterSpacing: 1.2,
  },
});
