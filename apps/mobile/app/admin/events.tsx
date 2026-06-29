import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Display } from '@/components/ui';
import { colors, fonts, radius } from '@/theme/tokens';
import { api, ApiError, type AdminEvent } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/** KB / MB / GB formatter. */
function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  const gb = mb / 1024;
  return `${gb < 10 ? gb.toFixed(2) : gb.toFixed(1)} GB`;
}

const statusTone: Record<string, string> = {
  LIVE: colors.coral,
  DRAFT: colors.text,
  ENDED: colors.textFaint,
};

/**
 * Super-admin event list. Every event across every host with photo / crew /
 * storage counts and a guarded delete. Pull-to-refresh.
 */
export default function AdminEventsScreen() {
  const { token } = useAuth();
  const [events, setEvents] = useState<AdminEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!token) return;
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setEvents(await api.admin.events(token));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not load events.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = (ev: AdminEvent) => {
    Alert.alert(
      'Delete event',
      `Delete "${ev.name}"? This removes its photos and members. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => doDelete(ev) },
      ],
    );
  };

  const doDelete = async (ev: AdminEvent) => {
    if (!token) return;
    setBusy(ev.id);
    try {
      await api.admin.deleteEvent(ev.id, token);
      setEvents((prev) => (prev ? prev.filter((x) => x.id !== ev.id) : prev));
    } catch (e) {
      Alert.alert(
        'Could not delete',
        e instanceof ApiError ? e.message : 'Something went wrong.',
      );
    } finally {
      setBusy(null);
    }
  };

  if (loading && !events) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.lime} />
        <Text style={styles.muted}>Loading events</Text>
      </View>
    );
  }

  if (error && !events) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorBig}>{error}</Text>
        <Pressable onPress={() => load()} style={styles.retry} hitSlop={8}>
          <Text style={styles.retryTxt}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={events ?? []}
      keyExtractor={(ev) => ev.id}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load('refresh')}
          tintColor={colors.lime}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Display size={26}>All events</Display>
          <Text style={styles.sub}>
            {events?.length ?? 0}{' '}
            {(events?.length ?? 0) === 1 ? 'event' : 'events'} across every host.
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={22} color={colors.textFaint} />
          <Text style={styles.muted}>No events yet.</Text>
        </View>
      }
      renderItem={({ item: ev }) => {
        const rowBusy = busy === ev.id;
        return (
          <View style={styles.row}>
            <View style={styles.rowTop}>
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>
                  {ev.name}
                </Text>
                <Text style={styles.email} numberOfLines={1}>
                  {ev.host?.email ?? 'no host'}
                </Text>
              </View>
              <Text style={[styles.status, { color: statusTone[ev.status] }]}>
                {ev.status}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Meta icon="image-outline" text={`${ev.photos}`} />
              <Meta icon="people-outline" text={`${ev.crew}`} />
              <Meta icon="server-outline" text={formatBytes(ev.storageBytes)} />
              <Pressable
                onPress={() => confirmDelete(ev)}
                disabled={rowBusy}
                style={[styles.delBtn, rowBusy && { opacity: 0.5 }]}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${ev.name}`}
                hitSlop={6}
              >
                {rowBusy ? (
                  <ActivityIndicator size="small" color={colors.coral} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={14} color={colors.coral} />
                    <Text style={styles.delTxt}>Delete</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        );
      }}
    />
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={13} color={colors.textFaint} />
      <Text style={styles.metaTxt}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 48, gap: 10 },
  header: { paddingBottom: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 60 },
  muted: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  errorBig: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.coral,
    textAlign: 'center',
  },
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
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 6,
  },
  row: {
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.lg,
    padding: 16,
    gap: 14,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowText: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.text },
  email: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint, marginTop: 3 },
  status: { fontFamily: fonts.bodySemibold, fontSize: 12 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  delBtn: {
    marginLeft: 'auto',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,107,94,0.4)',
    backgroundColor: 'rgba(255,107,94,0.1)',
  },
  delTxt: { fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.coral },
});
