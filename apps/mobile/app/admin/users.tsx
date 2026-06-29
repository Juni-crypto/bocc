import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Display, Label } from '@/components/ui';
import { Bezel } from '@/components/Bezel';
import { PillButton } from '@/components/PillButton';
import { Segmented } from '@/components/Segmented';
import { colors, fonts, radius } from '@/theme/tokens';
import { api, ApiError, type AdminUser, type UserRole } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const ROLE_OPTIONS = [
  { key: 'USER' as const, label: 'Host' },
  { key: 'ADMIN' as const, label: 'Admin' },
];

/**
 * Super-admin user console. Create hosts, flip roles, and remove accounts.
 * Mirrors apps/web/app/admin/users/AdminUsersView.tsx. You can never delete
 * your own row.
 */
export default function AdminUsersScreen() {
  const { token, user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // create-host form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('USER');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setUsers(await api.admin.users(token));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const createUser = async () => {
    if (!token || creating) return;
    setCreateError(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setCreateError('Enter a name.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
      setCreateError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setCreateError('Password must be at least 8 characters.');
      return;
    }
    setCreating(true);
    try {
      const created = await api.admin.createUser(
        { name: trimmedName, email: trimmedEmail, password, role },
        token,
      );
      setUsers((prev) => (prev ? [created, ...prev] : [created]));
      setName('');
      setEmail('');
      setPassword('');
      setRole('USER');
    } catch (e) {
      setCreateError(
        e instanceof ApiError ? e.message : 'Could not create host.',
      );
    } finally {
      setCreating(false);
    }
  };

  const toggleRole = async (u: AdminUser) => {
    if (!token) return;
    const next: UserRole = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
    setBusy(u.id);
    try {
      await api.admin.setRole(u.id, next, token);
      setUsers((prev) =>
        prev ? prev.map((x) => (x.id === u.id ? { ...x, role: next } : x)) : prev,
      );
    } catch (e) {
      Alert.alert(
        'Could not change role',
        e instanceof ApiError ? e.message : 'Something went wrong.',
      );
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = (u: AdminUser) => {
    Alert.alert(
      'Delete user',
      `Delete ${u.name} (${u.email})? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => doDelete(u) },
      ],
    );
  };

  const doDelete = async (u: AdminUser) => {
    if (!token) return;
    setBusy(u.id);
    try {
      await api.admin.deleteUser(u.id, token);
      setUsers((prev) => (prev ? prev.filter((x) => x.id !== u.id) : prev));
    } catch (e) {
      Alert.alert(
        'Could not delete',
        e instanceof ApiError ? e.message : 'Something went wrong.',
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Display size={26}>Users</Display>
        <Text style={styles.sub}>
          Add hosts, change roles, or remove accounts.
        </Text>

        {/* create host */}
        <Label style={styles.section}>Create host</Label>
        <Bezel style={{ marginTop: 10 }}>
          <Field
            label="Name"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (createError) setCreateError(null);
            }}
            placeholder="Casey Host"
            autoCapitalize="words"
          />
          <Field
            label="Email"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (createError) setCreateError(null);
            }}
            placeholder="casey@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (createError) setCreateError(null);
            }}
            placeholder="At least 8 characters"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={{ marginTop: 14 }}>
            <Text style={styles.fieldLabel}>Role</Text>
            <Segmented options={ROLE_OPTIONS} value={role} onChange={setRole} />
          </View>

          {createError ? (
            <Text style={styles.error}>{createError}</Text>
          ) : null}

          <PillButton
            label={creating ? 'Creating' : 'Create host'}
            loading={creating}
            onPress={createUser}
            style={{ marginTop: 16 }}
          />
        </Bezel>

        {/* user list */}
        <Label style={styles.section}>All users</Label>

        {loading && !users ? (
          <View style={styles.listState}>
            <ActivityIndicator color={colors.lime} />
            <Text style={styles.muted}>Loading users</Text>
          </View>
        ) : error && !users ? (
          <View style={styles.listState}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={load} style={styles.retry} hitSlop={8}>
              <Text style={styles.retryTxt}>Try again</Text>
            </Pressable>
          </View>
        ) : users && users.length === 0 ? (
          <Text style={[styles.muted, { marginTop: 12 }]}>No users yet.</Text>
        ) : (
          <View style={{ marginTop: 10, gap: 10 }}>
            {users?.map((u) => {
              const isMe = me?.id === u.id;
              const isAdmin = u.role === 'ADMIN';
              const rowBusy = busy === u.id;
              return (
                <View key={u.id} style={styles.userRow}>
                  <View style={styles.userTop}>
                    <View style={styles.userText}>
                      <View style={styles.nameLine}>
                        <Text style={styles.name} numberOfLines={1}>
                          {u.name}
                        </Text>
                        {isMe ? <Text style={styles.youTag}>you</Text> : null}
                      </View>
                      <Text style={styles.email} numberOfLines={1}>
                        {u.email}
                      </Text>
                    </View>
                    <View style={[styles.roleChip, isAdmin && styles.roleChipAdmin]}>
                      <Text style={[styles.roleChipTxt, isAdmin && styles.roleChipTxtAdmin]}>
                        {u.role}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.userMeta}>
                    {u.events} {u.events === 1 ? 'event' : 'events'} ·{' '}
                    {u.createdAt
                      ? `joined ${new Date(u.createdAt).toLocaleDateString()}`
                      : 'join date unknown'}
                  </Text>

                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => toggleRole(u)}
                      disabled={rowBusy}
                      style={[
                        styles.actBtn,
                        isAdmin ? styles.actNeutral : styles.actLime,
                        rowBusy && { opacity: 0.5 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isAdmin ? `Demote ${u.name} to host` : `Promote ${u.name} to admin`
                      }
                    >
                      {rowBusy ? (
                        <ActivityIndicator size="small" color={isAdmin ? colors.text : colors.lime} />
                      ) : (
                        <Text style={[styles.actTxt, isAdmin ? styles.actTxtNeutral : styles.actTxtLime]}>
                          {isAdmin ? 'Demote to host' : 'Promote to admin'}
                        </Text>
                      )}
                    </Pressable>

                    {!isMe ? (
                      <Pressable
                        onPress={() => confirmDelete(u)}
                        disabled={rowBusy}
                        style={[styles.delBtn, rowBusy && { opacity: 0.5 }]}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${u.name}`}
                        hitSlop={6}
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.coral} />
                        <Text style={styles.delTxt}>Delete</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        style={styles.input}
        placeholderTextColor={colors.textFaint}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 64 },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 6,
  },
  section: { marginTop: 28 },
  muted: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  field: { marginTop: 0, marginBottom: 4 },
  fieldLabel: {
    fontFamily: fonts.displayMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textFaint,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    minHeight: 46,
  },
  error: {
    color: colors.coral,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 12,
  },
  listState: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    backgroundColor: colors.fill,
  },
  retryTxt: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.text },
  userRow: {
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
  },
  userTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  userText: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.text, flexShrink: 1 },
  youTag: { fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.lime },
  email: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint, marginTop: 3 },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    backgroundColor: colors.fill,
  },
  roleChipAdmin: {
    borderColor: 'rgba(215,255,62,0.4)',
    backgroundColor: 'rgba(215,255,62,0.1)',
  },
  roleChipTxt: { fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.textMuted },
  roleChipTxtAdmin: { color: colors.lime },
  userMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  actLime: {
    borderColor: 'rgba(215,255,62,0.4)',
    backgroundColor: 'rgba(215,255,62,0.1)',
  },
  actNeutral: {
    borderColor: colors.hairlineStrong,
    backgroundColor: colors.fill,
  },
  actTxt: { fontFamily: fonts.bodySemibold, fontSize: 12 },
  actTxtLime: { color: colors.lime },
  actTxtNeutral: { color: colors.text },
  delBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,107,94,0.4)',
    backgroundColor: 'rgba(255,107,94,0.1)',
  },
  delTxt: { fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.coral },
});
