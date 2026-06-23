import { StyleSheet, View } from 'react-native';
import { colors, radius } from '@/theme/tokens';

/**
 * Deterministic faux-QR rendered from a string. A real build swaps this for an
 * SVG QR or expo-camera scanner; for the design pass it is a lime/ink module
 * grid with the classic finder squares, matching the mockup's pixel QR.
 */
export function QrPlaceholder({
  value,
  size = 150,
  modules = 11,
}: {
  value: string;
  size?: number;
  modules?: number;
}) {
  const cell = size / modules;
  const cells: { x: number; y: number; on: boolean }[] = [];

  // simple deterministic hash per cell from the value
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      const seed = hash(`${value}:${x}:${y}`);
      cells.push({ x, y, on: seed % 100 < 48 });
    }
  }

  const isFinder = (x: number, y: number) => {
    const inBox = (bx: number, by: number) =>
      x >= bx && x < bx + 3 && y >= by && y < by + 3;
    return (
      inBox(0, 0) || inBox(modules - 3, 0) || inBox(0, modules - 3)
    );
  };

  return (
    <View
      style={[styles.frame, { width: size, height: size }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {cells.map(({ x, y, on }) => {
        const finder = isFinder(x, y);
        const filled = finder ? finderOn(x, y, modules) : on;
        if (!filled) return null;
        return (
          <View
            key={`${x}-${y}`}
            style={{
              position: 'absolute',
              left: x * cell,
              top: y * cell,
              width: cell,
              height: cell,
              backgroundColor: colors.lime,
            }}
          />
        );
      })}
    </View>
  );
}

function finderOn(x: number, y: number, m: number): boolean {
  const local = (bx: number, by: number) => {
    const lx = x - bx;
    const ly = y - by;
    // ring pattern: outer filled, center filled, gap between
    const edge = lx === 0 || lx === 2 || ly === 0 || ly === 2;
    const center = lx === 1 && ly === 1;
    return edge || center;
  };
  if (x < 3 && y < 3) return local(0, 0);
  if (x >= m - 3 && y < 3) return local(m - 3, 0);
  if (x < 3 && y >= m - 3) return local(0, m - 3);
  return false;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
});
