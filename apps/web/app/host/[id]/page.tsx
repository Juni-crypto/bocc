import type { Metadata } from "next";
import Link from "next/link";
import { HostDashboard } from "./HostDashboard";
import { loadEvent, loadStats } from "@/lib/eventData";
import type { EventStats, Photo } from "@/lib/types";
import { api } from "@/lib/api";

export const metadata: Metadata = {
  title: "Host dashboard · BOCC",
};

export default async function HostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await loadEvent(id);

  if (!event) {
    return (
      <section className="pb-28 pt-36 text-center">
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-lime">
          Host view
        </p>
        <h2 className="mb-4 font-display text-4xl font-bold tracking-tight">
          Event not found
        </h2>
        <p className="mx-auto max-w-md text-sm text-white/55">
          We could not find an event for &quot;{id}&quot;. Create one to get a
          live host dashboard.
        </p>
        <Link
          href="/create"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-full bg-lime px-5 py-3 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          Create an event
        </Link>
      </section>
    );
  }

  const emptyStats: EventStats = { crew: 0, photos: 0, pending: 0, faces: 0 };
  const initialStats = (await loadStats(event.id)) ?? emptyStats;

  let initialPending: Photo[] = [];
  try {
    initialPending = (await api.moderation(event.id)).photos;
  } catch {
    /* no moderation data yet */
  }

  const shareLabel = event.joinUrl.replace(/^https?:\/\//, "");

  return (
    <HostDashboard
      eventId={event.id}
      slug={event.slug}
      title={event.name}
      joinUrl={event.joinUrl}
      shareLabel={shareLabel}
      initialStats={initialStats}
      initialPending={initialPending}
      live={event.status === "LIVE"}
    />
  );
}
