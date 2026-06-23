import { useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import { colors } from '@/theme/tokens';

/**
 * Snapping track slider matching .track in the mockup. Selects from a list of
 * discrete steps (e.g. per-guest cap presets) and reports the chosen value.
 */
export function Slider({
  steps,
  value,
  onChange,
}: {
  steps: number[];
  value: number;
  onChange: (value: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, steps.indexOf(value));
  const lastIndex = steps.length - 1;
  const pct = lastIndex === 0 ? 0 : index / lastIndex;

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  const pick = (x: number) => {
    if (width <= 0) return;
    const ratio = Math.min(1, Math.max(0, x / width));
    const nearest = Math.round(ratio * lastIndex);
    const next = steps[nearest];
    if (next !== value) onChange(next);
  };

  const step = (dir: 1 | -1) => {
    const nextIndex = Math.min(lastIndex, Math.max(0, index + dir));
    const next = steps[nextIndex];
    if (next !== value) onChange(next);
  };

  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => pick(e.nativeEvent.locationX),
    onPanResponderMove: (e) => pick(e.nativeEvent.locationX),
  });

  return (
    <View
      style={styles.hit}
      onLayout={onLayout}
      {...responder.panHandlers}
      accessibilityRole="adjustable"
      accessibilityLabel="Photos per guest"
      accessibilityValue={{ text: value === 0 ? 'unlimited' : String(value) }}
      accessibilityActions={[
        { name: 'increment' },
        { name: 'decrement' },
      ]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') step(1);
        else if (e.nativeEvent.actionName === 'decrement') step(-1);
      }}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
        <View style={[styles.knob, { left: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { minHeight: 44, paddingVertical: 19, justifyContent: 'center' },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: colors.lime,
  },
  knob: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: '#fff',
    marginLeft: -8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
