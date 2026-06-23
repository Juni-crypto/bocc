import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radius } from '@/theme/tokens';

/**
 * Viewfinder frame with lime corner brackets (top-left + bottom-right),
 * matching the .vf motif in the mockup.
 */
export function Viewfinder({
  children,
  style,
  round = false,
}: {
  children?: ReactNode;
  style?: ViewStyle;
  round?: boolean;
}) {
  return (
    <View
      style={[
        styles.frame,
        { borderRadius: round ? 999 : radius.xl },
        style,
      ]}
    >
      {children}
      {!round && (
        <>
          <View style={[styles.bracket, styles.tl]} />
          <View style={[styles.bracket, styles.br]} />
        </>
      )}
    </View>
  );
}

const BR = 26;

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  bracket: {
    position: 'absolute',
    width: BR,
    height: BR,
    borderColor: colors.lime,
    zIndex: 5,
  },
  tl: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  br: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
});
