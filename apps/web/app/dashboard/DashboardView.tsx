"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bezel } from "@/components/Bezel";
import { Reveal } from "@/components/Reveal";
import { RecDot } from "@/components/RecDot";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatBytes } from "@/lib/format";
import type { MineEvent } from "@/lib/types";

const statusTone: Record<string, string> = {
  LIVE: "border-coral/40 bg-coral/10 text-coral",
  DRAFT: "border-white/15 bg-white/[0.05] text-white/60",
  ENDED: "border-white/15 bg-white/[0.05] text-white/45",
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="font-display text-lg font-semibold text-white">{value}</div>
      <div className="text-xs uppercase tracking-[0.12em] text-white/45">{label}</div>
    </div>
  );
}

export function DashboardView() {
  const { user, token } = useAuth();
  const [events, setEvents] = useState<MineEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    api
      .listMine(token)
      .then((list) => {
        if (active) setEvents(list);
      })
      .catch((e) => {
        if (active) setError(e?.message ?? "Could not load your events.");
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <section className="pb-28 pt-36">
      <Reveal>
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-lime">Host home</p>
      </Reveal>
      <Reveal index={1}>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-[clamp(2rem,7vw,3rem)] font-bold leading-[1.05] tracking-tight">
            {user?.name ? `Hi, ${user.name.split(" ")[0]}` : "Your events"}
          </h1>
          <Link
            href="/create"
            className={`cta group inline-flex min-h-[44px] items-center gap-3 rounded-full bg-lime py-2 pl-6 pr-2 font-semibold text-ink ${focusRing}`}
          >
            Create event
            <span aria-hidden className="ico grid h-9 w-9 place-items-center rounded-full bg-ink/10 text-lg">
              ↗
            </span>
          </Link>
        </div>
      </Reveal>

      {error && (
        <Reveal>
          <p
            role="alert"
            className="mb-6 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral"
          >
            {error}
          </p>
        </Reveal>
      )}

      {events === null && !error && (
        <p className="text-sm text-white/45" aria-busy="true">
          Loading your events…
        </p>
      )}

      {events !== null && events.length === 0 && (
        <Reveal>
          <Bezel viewfinder coreClassName="p-10 text-center">
            <h2 className="font-display text-2xl font-semibold">No events yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
              Spin up your first event in under a minute. Share the QR and your crew
              starts pooling shots live.
            </p>
            <Link
              href="/create"
              className={`mt-6 inline-flex min-h-[44px] items-center rounded-full bg-lime px-5 py-3 text-sm font-semibold text-ink ${focusRing}`}
            >
              Create an event
            </Link>
          </Bezel>
        </Reveal>
      )}

      {events && events.length > 0 && (
        <div className="grid gap-5">
          {events.map((ev, i) => {
            const live = ev.status === "LIVE";
            const shareLabel = ev.joinUrl?.replace(/^https?:\/\//, "") ?? "";
            return (
              <Reveal key={ev.id} index={Math.min(i, 4)}>
                <Bezel coreClassName="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${statusTone[ev.status] ?? statusTone.DRAFT}`}
                        >
                          {live && <RecDot tone="coral" size={5} />}
                          {ev.status}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/55">
                          {(ev.visibility ?? "PRIVATE").toLowerCase()}
                        </span>
                      </div>
                      <h3 className="truncate font-display text-xl font-semibold">{ev.name}</h3>
                      {shareLabel && (
                        <p className="mt-1 truncate font-mono text-xs text-white/45">{shareLabel}</p>
                      )}
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

                  <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5 sm:grid-cols-4">
                    <Stat label="Photos" value={ev.stats?.photos ?? 0} />
                    <Stat label="Crew" value={ev.stats?.crew ?? 0} />
                    <Stat label="Storage" value={formatBytes(ev.stats?.storageBytes)} />
                    <Stat label="Pending" value={ev.stats?.pending ?? 0} />
                  </div>
                </Bezel>
              </Reveal>
            );
          })}
        </div>
      )}
    </section>
  );
}
