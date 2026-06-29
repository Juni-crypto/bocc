import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Display, Label } from '@/components/ui';
import { Bezel } from '@/components/Bezel';
import { colors, fonts, radius } from '@/theme/tokens';
import { api, ApiError, type AdminOverview } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/** KB / MB / GB formatter shared across the admin screens. */
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
 * Super-admin overview. A dense totals grid, an events-by-status row, and a
 * recent-events list with quick links to the events + users consoles.
 * Mirrors apps/web/app/admin/AdminOverviewView.tsx.
 */
export default function AdminOverviewScreen() {
  const { token } = useAuth();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api.admin.overview(token));
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Could not load the overview.',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.lime} />
        <Text style={styles.muted}>Loading overview</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorBig}>{error}</Text>
        <Pressable onPress={load} style={styles.retry} hitSlop={8}>
          <Text style={styles.retryTxt}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!data) return null;

  const totals: Array<{ label: string; value: string | number; accent?: boolean }> = [
    { label: 'Users', value: data.totals.users },
    { label: 'Events', value: data.totals.events },
    { label: 'Photos', value: data.totals.photos },
    { label: 'Pending', value: data.totals.pendingPhotos, accent: data.totals.pendingPhotos > 0 },
    { label: 'Members', value: data.totals.members },
    { label: 'Faces', value: data.totals.faces },
    { label: 'Storage', value: formatBytes(data.totals.storageBytes) },
  ];

  const byStatus: Array<{ label: string; value: number }> = [
    { label: 'DRAFT', value: data.eventsByStatus.DRAFT ?? 0 },
    { label: 'LIVE', value: data.eventsByStatus.LIVE ?? 0 },
    { label: 'ENDED', value: data.eventsByStatus.ENDED ?? 0 },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Display size={26}>Platform overview</Display>
      <Text style={styles.sub}>Everything across every host and event.</Text>

      {/* totals grid */}
      <View style={styles.grid}>
        {totals.map((t) => (
          <View key={t.label} style={styles.statCard}>
            <Text style={styles.statLabel}>{t.label}</Text>
            <Text style={[styles.statValue, t.accent && { color: colors.lime }]}>
              {t.value}
            </Text>
          </View>
        ))}
      </View>

      {/* events by status */}
      <Label style={styles.section}>Events by status</Label>
      <Bezel padded={false} style={{ marginTop: 10 }}>
        {byStatus.map((s, i) => (
          <View
            key={s.label}
            style={[styles.statusRow, i > 0 && styles.rowDivider]}
          >
            <Text style={[styles.statusLabel, { color: statusTone[s.label] }]}>
              {s.label}
            </Text>
            <Text style={styles.statusValue}>{s.value}</Text>
          </View>
        ))}
      </Bezel>

      {/* recent events */}
      <View style={styles.sectionHead}>
        <Label>Recent events</Label>
        <Pressable
          onPress={() => router.replace('/admin/events')}
          hitSlop={8}
          accessibilityRole="link"
        >
          <Text style={styles.link}>View all</Text>
        </Pressable>
      </View>
      {data.recentEvents.length === 0 ? (
        <Text style={[styles.muted, { marginTop: 10 }]}>No events yet.</Text>
      ) : (
        <Bezel padded={false} style={{ marginTop: 10 }}>
          {data.recentEvents.map((ev, i) => (
            <View
              key={ev.id}
              style={[styles.evRow, i > 0 && styles.rowDivider]}
            >
              <View style={styles.evText}>
                <Text style={styles.evName} numberOfLines={1}>
                  {ev.name}
                </Text>
                <Text style={styles.evMeta} numberOfLines={1}>
                  {ev.host?.email ?? 'no host'}
                </Text>
              </View>
              <View style={styles.evRight}>
                <Text style={[styles.evStatus, { color: statusTone[ev.status] }]}>
                  {ev.status}
                </Text>
                <Text style={styles.evPhotos}>{ev.photos} photos</Text>
              </View>
            </View>
          ))}
        </Bezel>
      )}

      <View style={styles.linkCards}>
        <Pressable
          style={styles.linkCard}
          onPress={() => router.replace('/admin/events')}
          accessibilityRole="button"
          accessibilityLabel="Manage events"
        >
          <Ionicons name="calendar-outline" size={18} color={colors.lime} />
          <Text style={styles.linkCardTxt}>Manage events</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>
        <Pressable
          style={styles.linkCard}
          onPress={() => router.replace('/admin/users')}
          accessibilityRole="button"
          accessibilityLabel="Manage users"
        >
          <Ionicons name="people-outline" size={18} color={colors.lime} />
          <Text style={styles.linkCardTxt}>Manage users</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 100,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  statLabel: {
    fontFamily: fonts.displayMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.text,
    marginTop: 4,
  },
  section: { marginTop: 28 },
  sectionHead: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  link: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.lime },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.hairlineSoft },
  statusLabel: { fontFamily: fonts.bodySemibold, fontSize: 13 },
  statusValue: { fontFamily: fonts.display, fontSize: 17, color: colors.text },
  evRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  evText: { flex: 1, minWidth: 0 },
  evName: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.text },
  evMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint, marginTop: 2 },
  evRight: { alignItems: 'flex-end', gap: 2 },
  evStatus: { fontFamily: fonts.bodySemibold, fontSize: 12 },
  evPhotos: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  linkCards: { marginTop: 24, gap: 10 },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.lg,
  },
  linkCardTxt: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.text },
});
