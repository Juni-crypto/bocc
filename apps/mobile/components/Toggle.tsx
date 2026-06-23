import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';
import { useReduceMotion } from '@/lib/useReduceMotion';

/** Lime pill toggle matching .tg in the mockup. */
export function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange?: (next: boolean) => void;
  label?: string;
}) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(value ? 1 : 0);
      return;
    }
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [value, anim, reduceMotion]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 21],
  });
  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.12)', colors.lime],
  });
  const knobColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ffffff', colors.ink],
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange?.(!value)}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={styles.tap}
    >
      <Animated.View style={[styles.track, { backgroundColor }]}>
        <Animated.View
          style={[
            styles.knob,
            { transform: [{ translateX }], backgroundColor: knobColor },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tap: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  track: { width: 42, height: 24, borderRadius: 999, justifyContent: 'center' },
  knob: {
    position: 'absolute',
    top: 3,
    width: 18,
    height: 18,
    borderRadius: 999,
  },
});
