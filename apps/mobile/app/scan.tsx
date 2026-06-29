import { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Viewfinder } from '@/components/Viewfinder';
import { RecDot } from '@/components/RecDot';
import { PillButton } from '@/components/PillButton';
import { Display, Label } from '@/components/ui';
import { colors, fonts, radius } from '@/theme/tokens';
import { parseEventSlug } from '@/lib/links';

/**
 * Guest QR scanner. Reads a bocc:// deep link (or web link / bare slug) and
 * routes to /join/<slug>. Gracefully handles denied permission and offers a
 * manual code entry fallback when the camera is unavailable.
 */
export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  const goToSlug = useCallback((slug: string) => {
    handled.current = true;
    router.push({ pathname: '/join/[slug]', params: { slug } });
  }, []);

  const onScan = useCallback(
    (result: BarcodeScanningResult) => {
      if (handled.current) return;
      const slug = parseEventSlug(result.data);
      if (!slug) {
        setError('That QR is not a BOCC event. Try again or enter the code.');
        return;
      }
      goToSlug(slug);
    },
    [goToSlug],
  );

  const onManual = () => {
    const slug = parseEventSlug(code);
    if (!slug) {
      setError('Enter a valid event code, e.g. aisha-dev-sangeet.');
      return;
    }
    goToSlug(slug);
  };

  const granted = permission?.granted === true;
  const canAsk = permission?.canAskAgain !== false;

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.badge}>
            <RecDot label="SCANNING" />
          </View>
          <Display size={26} style={{ marginTop: 14 }}>
            Scan to join
          </Display>
          <Text style={styles.sub}>
            Point your camera at the event QR. No account needed.
          </Text>

          <Viewfinder style={styles.vf}>
            {granted ? (
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handled.current ? undefined : onScan}
              />
            ) : (
              <View style={styles.permFill}>
                <Label style={{ textAlign: 'center' }}>
                  {permission == null
                    ? 'Camera'
                    : canAsk
                      ? 'Camera off'
                      : 'Camera blocked'}
                </Label>
                <Text style={styles.permText}>
                  {canAsk
                    ? 'Allow the camera to scan the event QR, or enter the code below.'
                    : 'Camera access is blocked in Settings. Enter the event code below to join.'}
                </Text>
                {canAsk ? (
                  <PillButton
                    label="Allow camera"
                    size="sm"
                    onPress={requestPermission}
                    style={{ marginTop: 14 }}
                  />
                ) : null}
              </View>
            )}
          </Viewfinder>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Label style={{ marginTop: 22 }}>Or enter the code</Label>
          <View style={styles.manualRow}>
            <TextInput
              value={code}
              onChangeText={(t) => {
                setCode(t);
                if (error) setError(null);
              }}
              style={styles.input}
              placeholder="aisha-dev-sangeet"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={onManual}
              accessibilityLabel="Event code"
            />
          </View>
          <PillButton
            label="Join"
            trailing={<Text style={{ color: colors.ink }}>{'↗'}</Text>}
            onPress={onManual}
            disabled={!code.trim()}
            style={{ marginTop: 12 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 48 },
  badge: { alignSelf: 'flex-start' },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    marginTop: 8,
    maxWidth: 320,
  },
  vf: {
    aspectRatio: 1,
    marginTop: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 260,
  },
  error: {
    color: colors.coral,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 14,
  },
  manualRow: { marginTop: 10 },
  input: {
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    minHeight: 48,
  },
});
