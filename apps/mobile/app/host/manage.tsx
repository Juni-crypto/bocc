import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { RecDot } from '@/components/RecDot';
import { Bezel } from '@/components/Bezel';
import { QrCode } from '@/components/QrCode';
import { PhotoGrid } from '@/components/PhotoGrid';
import { PillButton } from '@/components/PillButton';
import { Display, Label, StatCard } from '@/components/ui';
import { colors, fonts } from '@/theme/tokens';
import { api, type EventStats, type Photo } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { joinShareUrl, joinWebUrl } from '@/lib/links';

const EMPTY_STATS: EventStats = { crew: 0, photos: 0, pending: 0, faces: 0 };

/** Host manage / live dashboard - polls real stats + moderation queue + share QR. */
export default function ManageEvent() {
  const { id, slug, name } = useLocalSearchParams<{
    id?: string;
    slug?: string;
    name?: string;
  }>();
  const eventId = id ?? '';
  const eventSlug = slug ?? '';
  const eventName = name ?? 'Your event';

  const { token, ready } = useAuth();

  const [stats, setStats] = useState<EventStats>(EMPTY_STATS);
  const [pending, setPending] = useState<Photo[]>([]);
  const [showQr, setShowQr] = useState(false);

  // Gate: host dashboard requires auth.
  useFocusEffect(
    useCallback(() => {
      if (ready && !token) {
        router.replace('/login?next=/host/manage' as never);
      }
    }, [ready, token]),
  );

  useEffect(() => {
    if (!eventId || !token) return;
    let alive = true;

    const poll = () => {
      api
        .stats(eventId, token)
        .then((s) => alive && setStats(s))
        .catch(() => {});
      api
        .moderation(eventId, token)
        .then((m) => alive && setPending(m.photos))
        .catch(() => {});
    };

    poll();
    const timer = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [eventId, token]);

  const approveAll = async () => {
    const queue = pending;
    setPending([]);
    setStats((s) => ({ ...s, pending: 0 }));
    await Promise.all(
      queue.map((p) =>
        api.moderate(eventId, p.id, 'approve', token ?? undefined).catch(() => {}),
      ),
    );
  };

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.head}>
          <Label>Live event</Label>
          <RecDot label="RECORDING" />
        </View>
        <Display size={22} style={{ marginTop: 4 }}>
          {eventName}
        </Display>

        <View style={styles.stats}>
          <StatCard value={stats.crew} caption="crew" accent />
          <StatCard value={stats.photos} caption="photos" />
          <StatCard value={stats.faces} caption="faces" />
        </View>

        <Label style={{ marginTop: 22 }}>Needs review - {pending.length}</Label>
        <View style={styles.queue}>
          {pending.length ? (
            <PhotoGrid photos={pending} badge="pending" />
          ) : (
            <Text style={styles.clear}>Queue clear. Nothing to review.</Text>
          )}
        </View>

        <View style={styles.actions}>
          <PillButton
            label="Approve all"
            size="sm"
            onPress={approveAll}
            style={{ flex: 1 }}
          />
          <PillButton
            label={showQr ? 'Hide QR' : 'Share QR'}
            size="sm"
            variant="ghost"
            onPress={() => setShowQr((v) => !v)}
            style={{ flex: 1 }}
          />
        </View>

        {showQr && (
          <Bezel style={{ marginTop: 16 }}>
            <View style={styles.qrWrap}>
              <QrCode value={joinWebUrl(eventSlug)} size={170} />
              <Text style={styles.qrUrl}>{joinShareUrl(eventSlug)}</Text>
              <Label style={{ marginTop: 4 }}>Scan to join the crew</Label>
            </View>
          </Bezel>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 32 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stats: { flexDirection: 'row', gap: 8, marginTop: 16 },
  queue: { marginTop: 10 },
  clear: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textFaint,
    paddingVertical: 24,
    textAlign: 'center',
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  qrWrap: { alignItems: 'center', paddingVertical: 8 },
  qrUrl: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text,
    marginTop: 14,
  },
});
