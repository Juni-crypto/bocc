"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bezel } from "@/components/Bezel";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatBytes } from "@/lib/format";
import type { AdminOverview } from "@/lib/types";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

const statusTone: Record<string, string> = {
  LIVE: "text-coral",
  DRAFT: "text-white/70",
  ENDED: "text-white/45",
};

export function AdminOverviewView() {
  const { token } = useAuth();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    api
      .admin.overview(token)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e?.message ?? "Could not load overview."));
    return () => {
      active = false;
    };
  }, [token]);

  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
        {error}
      </p>
    );
  }

  if (!data) {
    return <p className="text-sm text-white/45" aria-busy="true">Loading overview…</p>;
  }

  const totals: Array<{ label: string; value: string | number }> = [
    { label: "Users", value: data.totals.users },
    { label: "Events", value: data.totals.events },
    { label: "Photos", value: data.totals.photos },
    { label: "Pending", value: data.totals.pendingPhotos },
    { label: "Members", value: data.totals.members },
    { label: "Faces", value: data.totals.faces },
    { label: "Storage", value: formatBytes(data.totals.storageBytes) },
  ];

  const byStatus: Array<{ label: string; value: number }> = [
    { label: "DRAFT", value: data.eventsByStatus.DRAFT },
    { label: "LIVE", value: data.eventsByStatus.LIVE },
    { label: "ENDED", value: data.eventsByStatus.ENDED },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 font-display text-2xl font-bold tracking-tight">Platform overview</h1>
        <p className="text-sm text-white/55">Everything across every host and event.</p>
      </div>

      {/* totals: dense definition grid, not hero cards */}
      <Bezel coreClassName="p-2">
        <dl className="grid grid-cols-2 divide-white/10 sm:grid-cols-4 lg:grid-cols-7">
          {totals.map((t) => (
            <div key={t.label} className="border-b border-r border-white/5 px-4 py-5 last:border-r-0">
              <dt className="text-[11px] uppercase tracking-[0.14em] text-white/45">{t.label}</dt>
              <dd className="mt-1 font-display text-2xl font-semibold tracking-tight">{t.value}</dd>
            </div>
          ))}
        </dl>
      </Bezel>

      {/* events by status */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-white/80">Events by status</h2>
        <Bezel coreClassName="divide-y divide-white/5">
          {byStatus.map((s) => (
            <div key={s.label} className="flex items-center justify-between px-5 py-3.5">
              <span className={`text-sm font-medium ${statusTone[s.label] ?? "text-white/70"}`}>
                {s.label}
              </span>
              <span className="font-display text-lg font-semibold">{s.value}</span>
            </div>
          ))}
        </Bezel>
      </section>

      {/* recent events */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/80">Recent events</h2>
          <Link href="/admin/events" className={`rounded text-sm text-lime underline-offset-4 hover:underline ${focusRing}`}>
            View all
          </Link>
        </div>
        {data.recentEvents.length === 0 ? (
          <p className="text-sm text-white/45">No events yet.</p>
        ) : (
          <Bezel coreClassName="divide-y divide-white/5">
            {data.recentEvents.map((ev) => (
              <div key={ev.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate font-medium">{ev.name}</p>
                  <p className="truncate text-xs text-white/45">
                    {ev.host?.email ?? "no host"} · {(ev.visibility ?? "PRIVATE").toLowerCase()}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-white/55">
                  <span className={statusTone[ev.status] ?? "text-white/55"}>{ev.status}</span>
                  <span>{ev.photos} photos</span>
                  <Link
                    href={`/e/${ev.slug}`}
                    className={`rounded text-lime underline-offset-4 hover:underline ${focusRing}`}
                  >
                    Gallery
                  </Link>
                </div>
              </div>
            ))}
          </Bezel>
        )}
      </section>
    </div>
  );
}
