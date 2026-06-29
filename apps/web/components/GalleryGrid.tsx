"use client";

// Client-side gallery loader. We fetch the pooled photos from the browser
// (same path the search tab uses, which is reliable) instead of server
// rendering, so the grid always reflects the live API regardless of the
// hosting platform's SSR/runtime quirks.

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  MasonryGrid,
  photosToItems,
  type MasonryItem,
} from "@/components/MasonryGrid";
import { Reveal } from "@/components/Reveal";

export function GalleryGrid({
  slug,
  found,
}: {
  slug: string;
  found: boolean;
}) {
  // null = still loading; [] = loaded but empty
  const [items, setItems] = useState<MasonryItem[] | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [canDelete, setCanDelete] = useState(false);
  const { user, isAdmin, token } = useAuth();

  useEffect(() => {
    let alive = true;
    setItems(null);
    api
      .gallery(slug, { take: 60 })
      .then((page) => {
        if (alive) setItems(photosToItems(page.photos ?? []));
      })
      .catch(() => {
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  // resolve the event id once, and whether this viewer may delete (admin, or
  // the host who owns this event).
  useEffect(() => {
    let alive = true;
    api
      .getEvent(slug)
      .then((ev) => {
        if (!alive) return;
        setEventId(ev.id);
        setCanDelete(isAdmin || (!!user && ev.hostUserId === user.id));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [slug, isAdmin, user]);

  const handleDelete = async (item: MasonryItem) => {
    if (!eventId) return;
    await api.deletePhoto(eventId, item.id, token ?? undefined);
    setItems((prev) => prev?.filter((x) => x.id !== item.id) ?? prev);
  };

  if (items === null) return <GallerySkeleton />;

  if (items.length) {
    return (
      <Reveal>
        <MasonryGrid
          items={items}
          canDelete={canDelete}
          onDelete={canDelete ? handleDelete : undefined}
        />
      </Reveal>
    );
  }

  return (
    <Reveal>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-16 text-center">
        <p className="font-display text-2xl font-semibold">
          {found ? "No photos yet" : "Event not found"}
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
          {found
            ? "Be the first to add a shot. Join the crew, then upload from your camera roll."
            : "We could not find this event. Check the link or ask the host for a fresh QR."}
        </p>
        {found && (
          <Link
            href={`/e/${slug}/add`}
            className="mt-6 inline-flex min-h-[44px] items-center rounded-full bg-lime px-5 py-3 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            Add the first photos
          </Link>
        )}
      </div>
    </Reveal>
  );
}

function GallerySkeleton() {
  // mirror the masonry columns with pulsing placeholders
  const heights = [220, 300, 180, 260, 200, 320, 240, 190, 280, 210, 300, 230];
  return (
    <div
      className="[column-fill:_balance] gap-3 [column-count:2] sm:[column-count:3] lg:[column-count:4]"
      aria-busy="true"
      aria-label="Loading photos"
    >
      {heights.map((h, i) => (
        <div
          key={i}
          className="mb-3 w-full animate-pulse rounded-2xl bg-white/[0.06]"
          style={{ height: h }}
        />
      ))}
    </div>
  );
}
