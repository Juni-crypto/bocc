import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { PillButton } from '@/components/PillButton';
import { Display, Label } from '@/components/ui';
import { colors, fonts, radius } from '@/theme/tokens';
import { api, type MineEvent } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  getJoinedEventsSync,
  loadJoinedEvents,
  type JoinedEvent,
} from '@/lib/store';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  LIVE: 'Live',
  ENDED: 'Ended',
};

/** Events the guest joined plus, for signed-in hosts, the events they run. */
export default function MyEventsScreen() {
  const { token } = useAuth();
  const [joined, setJoined] = useState<JoinedEvent[]>(getJoinedEventsSync());
  const [hosting, setHosting] = useState<MineEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const j = await loadJoinedEvents();
    setJoined([...j]);
    if (token) {
      try {
        setHosting(await api.mine(token));
      } catch {
        /* leave previous hosting list in place */
      }
    } else {
      setHosting([]);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const openJoined = (slug: string) =>
    router.push({ pathname: '/event/[slug]', params: { slug } });

  const openHosting = (e: MineEvent) =>
    router.push({
      pathname: '/host/manage',
      params: { id: e.id, slug: e.slug, name: e.name },
    });

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={10}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View>
          <Label>Your crew</Label>
          <Display size={24} style={{ marginTop: 2 }}>
            My events
          </Display>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.lime}
            colors={[colors.lime]}
          />
        }
      >
        <Label style={styles.section}>Joined</Label>
        {joined.length ? (
          <View style={styles.list}>
            {joined.map((j) => (
              <Pressable
                key={j.slug}
                onPress={() => openJoined(j.slug)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Open ${j.name}`}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {j.name}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    Joined {formatDate(j.joinedAt)}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textFaint}
                />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              You have not joined any events yet
            </Text>
            <PillButton
              label="Scan a code"
              size="sm"
              onPress={() => router.push('/scan')}
              style={styles.emptyBtn}
            />
          </View>
        )}

        {hosting.length ? (
          <>
            <Label style={styles.section}>Hosting</Label>
            <View style={styles.list}>
              {hosting.map((e) => (
                <Pressable
                  key={e.id}
                  onPress={() => openHosting(e)}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Manage ${e.name}`}
                >
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {e.name}
                    </Text>
                    <View style={styles.metaRow}>
                      <StatusPill status={e.status} />
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {e.stats?.crew ?? e.crew ?? 0} crew {'·'}{' '}
                        {e.stats?.photos ?? e.photoCount ?? 0} photos
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textFaint}
                  />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function StatusPill({ status }: { status: string }) {
  const live = status === 'LIVE';
  const ended = status === 'ENDED';
  return (
    <View
      style={[
        styles.statusPill,
        live && styles.statusLive,
        ended && styles.statusEnded,
      ]}
    >
      <Text
        style={[
          styles.statusText,
          live && styles.statusTextLive,
          ended && styles.statusTextEnded,
        ]}
      >
        {STATUS_LABEL[status] ?? status}
      </Text>
    </View>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'recently';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineSoft,
  },
  back: {
    width: 44,
    height: 44,
    marginLeft: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 20, paddingBottom: 40 },
  section: { marginTop: 4, marginBottom: 12 },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.lg,
  },
  rowPressed: { backgroundColor: colors.fillStrong, transform: [{ scale: 0.99 }] },
  rowText: { flex: 1 },
  rowTitle: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.text },
  rowMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 2,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.fillStrong,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  statusLive: { backgroundColor: 'rgba(215,255,62,0.14)', borderColor: colors.lime },
  statusEnded: {
    backgroundColor: 'rgba(255,107,94,0.10)',
    borderColor: 'rgba(255,107,94,0.40)',
  },
  statusText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  statusTextLive: { color: colors.lime },
  statusTextEnded: { color: colors.coral },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.lg,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  emptyBtn: { marginTop: 16, alignSelf: 'stretch' },
});
