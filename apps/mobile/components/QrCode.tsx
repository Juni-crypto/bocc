import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, radius } from '@/theme/tokens';

/**
 * Real, scannable QR. Encodes the given value (a bocc:// deep link) as an SVG
 * QR rendered in the BOCC palette: lime modules on the ink surface so it stays
 * on-brand while remaining high-contrast enough for any scanner to read.
 */
export function QrCode({ value, size = 170 }: { value: string; size?: number }) {
  // Quiet zone (margin) is required for reliable scanning.
  const pad = 14;
  return (
    <View
      style={[styles.frame, { width: size + pad * 2, padding: pad }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="QR code to join this event"
    >
      <QRCode
        value={value}
        size={size}
        color={colors.lime}
        backgroundColor={colors.ink}
        ecl="M"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
