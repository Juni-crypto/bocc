"use client";

// "My events" hub. Two stacks:
//   - Joined: events this browser joined, read from localStorage (no account).
//   - Hosting: events the signed-in host owns (GET /events/mine), hidden when
//     signed out or empty.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bezel } from "@/components/Bezel";
import { Reveal } from "@/components/Reveal";
import { RecDot } from "@/components/RecDot";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getJoinedEvents, type JoinedEvent } from "@/lib/joined";
import type { MineEvent } from "@/lib/types";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

const statusTone: Record<string, string> = {
  LIVE: "border-coral/40 bg-coral/10 text-coral",
  DRAFT: "border-white/15 bg-white/[0.05] text-white/60",
  ENDED: "border-white/15 bg-white/[0.05] text-white/45",
};

function formatJoined(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export function MyEventsView() {
  const { token, ready } = useAuth();

  const [joined, setJoined] = useState<JoinedEvent[] | null>(null);
  const [hosting, setHosting] = useState<MineEvent[] | null>(null);
  const [hostError, setHostError] = useState<string | null>(null);

  // Read joined events from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    setJoined(getJoinedEvents());
  }, []);

  // Load hosted events when signed in.
  useEffect(() => {
    if (!ready) return;
    if (!token) {
      setHosting([]);
      return;
    }
    let active = true;
    api
      .listMine(token)
      .then((list) => {
        if (active) setHosting(list);
      })
      .catch((e) => {
        if (active) setHostError(e?.message ?? "Could not load your events.");
      });
    return () => {
      active = false;
    };
  }, [ready, token]);

  const showHosting = !!token && hosting !== null && hosting.length > 0;

  return (
    <section className="mx-auto max-w-5xl pb-28 pt-36">
      <Reveal>
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-lime">
          Your crew
        </p>
      </Reveal>
      <Reveal index={1}>
        <h1 className="font-display text-[clamp(2rem,7vw,3rem)] font-bold leading-[1.05] tracking-tight">
          My events
        </h1>
        <p className="mt-2 max-w-md text-sm text-white/55">
          Every event you joined on this device, plus the ones you host when you
          are signed in.
        </p>
      </Reveal>

      {/* Joined */}
      <div className="mt-12">
        <Reveal>
          <h2 className="mb-5 font-display text-2xl font-semibold tracking-tight">
            Joined
          </h2>
        </Reveal>

        {joined === null ? (
          <p className="text-sm text-white/45" aria-busy="true">
            Loading your events…
          </p>
        ) : joined.length === 0 ? (
          <Reveal>
            <Bezel viewfinder coreClassName="p-10 text-center">
              <h3 className="font-display text-2xl font-semibold">
                No joined events yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
                Scan an event QR or open an event link to join the crew. Events
                you join will show up here so you can jump back in.
              </p>
              <Link
                href="/"
                className={`mt-6 inline-flex min-h-[44px] items-center rounded-full bg-lime px-5 py-3 text-sm font-semibold text-ink ${focusRing}`}
              >
                Back home
              </Link>
            </Bezel>
          </Reveal>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {joined.map((ev, i) => {
              const when = formatJoined(ev.joinedAt);
              return (
                <Reveal key={ev.slug} index={Math.min(i, 4)}>
                  <Link
                    href={`/e/${ev.slug}`}
                    className={`group block h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:bg-white/[0.07] ${focusRing}`}
                  >
                    <h3 className="truncate font-display text-xl font-semibold">
                      {ev.name}
                    </h3>
                    {when && (
                      <p className="mt-1 text-xs text-white/45">
                        Joined {when}
                      </p>
                    )}
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-lime">
                      Open gallery
                      <span aria-hidden="true">↗</span>
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>

      {/* Hosting (signed-in hosts only) */}
      {hostError && token && (
        <Reveal>
          <p
            role="alert"
            className="mt-12 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral"
          >
            {hostError}
          </p>
        </Reveal>
      )}

      {showHosting && (
        <div className="mt-14">
          <Reveal>
            <h2 className="mb-5 font-display text-2xl font-semibold tracking-tight">
              Hosting
            </h2>
          </Reveal>
          <div className="grid gap-4">
            {hosting!.map((ev, i) => {
              const live = ev.status === "LIVE";
              return (
                <Reveal key={ev.id} index={Math.min(i, 4)}>
                  <Bezel coreClassName="p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <span
                          className={`mb-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${
                            statusTone[ev.status] ?? statusTone.DRAFT
                          }`}
                        >
                          {live && <RecDot tone="coral" size={5} />}
                          {ev.status}
                        </span>
                        <h3 className="truncate font-display text-xl font-semibold">
                          {ev.name}
                        </h3>
                        <p className="mt-1 text-xs text-white/45">
                          {ev.stats?.photos ?? 0} photos ·{" "}
                          {ev.stats?.crew ?? 0} crew
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Link
                          href={`/host/${ev.slug}`}
                          className={`min-h-[44px] rounded-full bg-lime px-4 py-2.5 text-sm font-semibold text-ink ${focusRing}`}
                        >
                          Manage
                        </Link>
                        <Link
                          href={`/e/${ev.slug}`}
                          className={`min-h-[44px] rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/[0.07] ${focusRing}`}
                        >
                          Gallery
                        </Link>
                      </div>
                    </div>
                  </Bezel>
                </Reveal>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
