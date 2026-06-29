"use client";

import { useEffect, useState } from "react";
import { Bezel } from "@/components/Bezel";
import { PillButton } from "@/components/PillButton";
import { QrCode } from "@/components/QrCode";
import { RecDot } from "@/components/RecDot";
import { Reveal } from "@/components/Reveal";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatBytes } from "@/lib/format";
import type { EventStats, Photo } from "@/lib/types";

interface HostDashboardProps {
  eventId: string | null;
  slug: string;
  title: string;
  joinUrl: string;
  shareLabel: string;
  live: boolean;
}

const EMPTY_STATS: EventStats = {
  crew: 0,
  photos: 0,
  pending: 0,
  faces: 0,
  storageBytes: 0,
};

export function HostDashboard({
  eventId,
  slug,
  title,
  joinUrl,
  shareLabel,
  live,
}: HostDashboardProps) {
  const { token } = useAuth();
  const [stats, setStats] = useState<EventStats>(EMPTY_STATS);
  const [pending, setPending] = useState<Photo[]>([]);
  const [recent, setRecent] = useState<Photo[]>([]);
  const [copied, setCopied] = useState(false);

  // Live-poll stats + moderation queue when we have a real event id + token.
  useEffect(() => {
    if (!eventId || !token) return;
    let active = true;
    const tick = async () => {
      try {
        const [next, queue, gallery] = await Promise.all([
          api.stats(eventId, token),
          api.moderation(eventId, token).catch(() => null),
          api.gallery(slug, { take: 8 }).catch(() => null),
        ]);
        if (!active) return;
        setStats(next);
        if (queue) setPending(queue.photos);
        if (gallery) setRecent(gallery.photos);
      } catch {
        /* keep last known data */
      }
    };
    tick();
    const interval = setInterval(tick, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [eventId, slug, token]);

  const approveAll = async () => {
    if (!eventId || !token || !pending.length) return;
    const ids = pending.map((p) => p.id);
    setPending([]);
    await Promise.all(
      ids.map((pid) => api.moderate(eventId, pid, "approve", token).catch(() => null)),
    );
    try {
      const [next, queue] = await Promise.all([
        api.stats(eventId, token),
        api.moderation(eventId, token),
      ]);
      setStats(next);
      setPending(queue.photos);
    } catch {
      /* keep optimistic state */
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section className="pb-28 pt-36">
      <Reveal>
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-lime">
          Host view
        </p>
      </Reveal>
      <Reveal index={1}>
        <h2 className="mb-12 font-display text-[clamp(2rem,7vw,3rem)] font-bold leading-[1.05] tracking-tight">
          Your event is live
        </h2>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        {/* QR / share card */}
        <Reveal>
          <Bezel viewfinder coreClassName="flex flex-col items-center p-8 text-center">
            <div className="mb-5 flex items-center gap-2 text-xs text-coral">
              <RecDot tone="coral" size={6} />{" "}
              {live ? "RECORDING · LIVE" : "DRAFT"}
            </div>
            <h3 className="font-display text-2xl font-semibold">{title}</h3>
            <p className="mb-7 text-sm text-white/55">
              Tap, scan, or share the link
            </p>
            <div className="rounded-2xl shadow-[0_0_50px_rgba(215,255,62,0.15)]">
              <QrCode
                value={typeof window !== "undefined" ? `${window.location.origin}/e/${slug}` : joinUrl}
                size={180}
              />
            </div>
            <div className="mt-6 max-w-full break-all rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-center font-mono text-sm text-white/70">
              {shareLabel}
            </div>
            <div className="mt-4 flex w-full gap-2">
              <PillButton
                fullWidth
                className="flex-1 py-3"
                arrow={copied ? false : "↗"}
                onClick={copyLink}
              >
                {copied ? "Copied!" : "Copy link"}
              </PillButton>
              <PillButton variant="ghost" className="flex-1 py-3 text-sm">
                Download QR
              </PillButton>
            </div>
          </Bezel>
        </Reveal>

        {/* live stats + feed */}
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
            <Reveal>
              <Bezel coreClassName="p-4 sm:p-6">
                <div className="font-display text-3xl font-bold text-lime sm:text-4xl">
                  {stats.crew}
                </div>
                <div className="mt-2 text-sm text-white/55">crew joined</div>
              </Bezel>
            </Reveal>
            <Reveal index={1}>
              <Bezel coreClassName="p-4 sm:p-6">
                <div className="font-display text-3xl font-bold sm:text-4xl">
                  {stats.photos}
                </div>
                <div className="mt-2 text-sm text-white/55">photos pooled</div>
              </Bezel>
            </Reveal>
            <Reveal index={2}>
              <Bezel coreClassName="p-4 sm:p-6">
                <div className="font-display text-3xl font-bold sm:text-4xl">
                  {stats.faces}
                </div>
                <div className="mt-2 text-sm text-white/55">faces found</div>
              </Bezel>
            </Reveal>
            <Reveal index={3}>
              <Bezel coreClassName="p-4 sm:p-6">
                <div className="font-display text-3xl font-bold sm:text-4xl">
                  {formatBytes(stats.storageBytes)}
                </div>
                <div className="mt-2 text-sm text-white/55">storage used</div>
              </Bezel>
            </Reveal>
          </div>

          <Reveal>
            <Bezel coreClassName="p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent uploads</h3>
                <span className="flex items-center gap-1.5 text-xs text-white/55">
                  <RecDot tone="lime" size={6} /> auto-updating
                </span>
              </div>
              {recent.length ? (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {recent.map((p) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={p.id}
                      src={p.thumbUrl}
                      alt="Recent upload"
                      loading="lazy"
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/55">
                  No photos yet. Share the link or QR and the crew&apos;s shots
                  land here live.
                </p>
              )}
            </Bezel>
          </Reveal>

          {/* moderation */}
          <Reveal>
            <Bezel coreClassName="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Moderation queue</h3>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/55">
                  {pending.length} pending
                </span>
              </div>
              {pending.length > 0 ? (
                <div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {pending.slice(0, 8).map((p) => (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={p.id}
                        src={p.thumbUrl}
                        alt="Pending photo"
                        loading="lazy"
                        className="h-14 w-14 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-white/55">
                      {pending.length} photo{pending.length === 1 ? "" : "s"}{" "}
                      awaiting your approval.
                    </p>
                    <div className="ml-auto flex gap-2">
                      <button
                        type="button"
                        onClick={approveAll}
                        className="min-h-[44px] rounded-full bg-lime px-4 py-2 text-xs font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                      >
                        Approve all
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/55">
                  Nothing waiting. New uploads appear here when host approval is
                  on.
                </p>
              )}
            </Bezel>
          </Reveal>

          {/* highlights */}
          <Reveal>
            <Bezel
              style={{
                background:
                  "linear-gradient(135deg,rgba(215,255,62,0.12),rgba(255,255,255,0.04))",
              }}
              coreClassName="flex items-start gap-4 p-6"
              coreStyle={{
                background:
                  "linear-gradient(135deg,rgba(215,255,62,0.06),#0E0E10)",
              }}
            >
              <div
                aria-hidden="true"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lime text-xl font-bold text-ink"
              >
                ✶
              </div>
              <div>
                <h3 className="text-lg font-semibold">Auto-highlights ready</h3>
                <p className="mt-1 text-sm text-white/60">
                  We picked the 24 sharpest, best-lit frames for a recap reel.
                </p>
              </div>
            </Bezel>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
