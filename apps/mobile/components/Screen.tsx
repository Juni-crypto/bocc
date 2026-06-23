import { type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/tokens';

/**
 * App shell: ink background + soft lime/coral mesh glow behind content,
 * echoing the .mesh motif from the mockup.
 */
export function Screen({
  children,
  edges = ['top', 'bottom'],
}: {
  children: ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  // Glow orbs scale with the viewport so the mesh reads the same on small
  // phones and tablets instead of staying a fixed 360pt blob.
  const { width } = useWindowDimensions();
  const blobSize = Math.round(Math.min(Math.max(width * 0.95, 300), 560));

  return (
    <View style={styles.root}>
      <View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={styles.mesh}
      >
        <View
          style={[
            styles.blob,
            styles.lime,
            { width: blobSize, height: blobSize, borderRadius: blobSize },
          ]}
        />
        <View
          style={[
            styles.blob,
            styles.coral,
            { width: blobSize, height: blobSize, borderRadius: blobSize },
          ]}
        />
      </View>
      <SafeAreaView style={styles.safe} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  safe: { flex: 1 },
  mesh: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  blob: { position: 'absolute' },
  lime: {
    backgroundColor: colors.lime,
    opacity: 0.1,
    top: -140,
    left: -110,
  },
  coral: {
    backgroundColor: colors.coral,
    opacity: 0.08,
    bottom: -150,
    right: -120,
  },
});
