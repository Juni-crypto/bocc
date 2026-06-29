import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Bezel } from '@/components/Bezel';
import { RecDot } from '@/components/RecDot';
import { PillButton } from '@/components/PillButton';
import { Display, Label } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { ApiError, API_BASE } from '@/lib/api';
import { colors, fonts, radius } from '@/theme/tokens';

/** Only allow in-app relative redirects from ?next, never arbitrary deep links. */
function safeNext(raw?: string): string {
  if (!raw) return '/host/manage';
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return '/host/manage';
}

/**
 * Shared host login / signup form. Mirrors apps/web AuthForm: email + password
 * (+ name on signup), inline error from {message}, redirect to ?next on success.
 */
export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const { login, signup } = useAuth();
  const params = useLocalSearchParams<{ next?: string }>();
  const next = safeNext(params.next);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === 'signup';

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isSignup) {
        await signup(email.trim(), password, name.trim());
      } else {
        await login(email.trim(), password);
      }
      router.replace(next as never);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : `Could not reach the API at ${API_BASE}. Make sure the backend is running, then try again.`,
      );
      setSubmitting(false);
    }
  };

  const goOther = () => {
    const q = next !== '/host/manage' ? `?next=${encodeURIComponent(next)}` : '';
    router.replace((isSignup ? `/login${q}` : `/signup${q}`) as never);
  };

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
            <RecDot label="HOST ACCESS" />
          </View>

          <Display size={30} style={{ marginTop: 16 }}>
            {isSignup ? 'Create your account' : 'Welcome back'}
          </Display>
          <Text style={styles.sub}>
            {isSignup
              ? 'Hosts sign up to create and manage events. Guests never need an account.'
              : 'Log in to create events and watch your gallery fill up live.'}
          </Text>

          <Bezel style={{ marginTop: 24 }}>
            {isSignup ? (
              <View style={styles.field}>
                <Label>Name</Label>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  placeholder="Aisha Khanna"
                  placeholderTextColor={colors.textFaint}
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  accessibilityLabel="Name"
                />
              </View>
            ) : null}

            <View style={styles.field}>
              <Label>Email</Label>
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                placeholder="you@host.com"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                accessibilityLabel="Email"
              />
            </View>

            <View style={styles.field}>
              <Label>Password</Label>
              <TextInput
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
                placeholderTextColor={colors.textFaint}
                secureTextEntry
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                textContentType={isSignup ? 'newPassword' : 'password'}
                returnKeyType="go"
                onSubmitEditing={onSubmit}
                accessibilityLabel="Password"
              />
              {isSignup ? (
                <Text style={styles.hint}>Minimum 8 characters.</Text>
              ) : null}
            </View>

            {error ? (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <PillButton
              label={
                submitting
                  ? isSignup
                    ? 'Creating account'
                    : 'Logging in'
                  : isSignup
                    ? 'Create account'
                    : 'Log in'
              }
              trailing={
                submitting ? undefined : (
                  <Text style={{ color: colors.ink }}>{'↗'}</Text>
                )
              }
              loading={submitting}
              onPress={onSubmit}
              style={{ marginTop: 18 }}
            />
          </Bezel>

          <Pressable
            onPress={goOther}
            style={styles.switch}
            accessibilityRole="link"
            hitSlop={8}
          >
            <Text style={styles.switchText}>
              {isSignup ? 'Already have an account? ' : 'New here? '}
              <Text style={styles.switchLink}>
                {isSignup ? 'Log in' : 'Create an account'}
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 48, flexGrow: 1, justifyContent: 'center' },
  badge: { alignSelf: 'flex-start' },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    marginTop: 10,
    maxWidth: 340,
  },
  field: { marginBottom: 14, gap: 8 },
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
  hint: { fontFamily: fonts.body, fontSize: 11, color: colors.textFaint },
  errorBox: {
    borderWidth: 1,
    borderColor: 'rgba(255,107,94,0.30)',
    backgroundColor: 'rgba(255,107,94,0.10)',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  errorText: { color: colors.coral, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  switch: { marginTop: 22, alignItems: 'center' },
  switchText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  switchLink: { color: colors.lime, fontFamily: fonts.bodySemibold },
});
