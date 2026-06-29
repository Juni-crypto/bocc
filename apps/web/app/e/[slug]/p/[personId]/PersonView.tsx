"use client";

// Photos of a single detected person within an event. Reached by tapping a
// face in the people strip. Reuses the masonry grid + full-screen viewer.

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  MasonryGrid,
  photosToItems,
  resolveThumb,
  type MasonryItem,
} from "@/components/MasonryGrid";
import { Reveal } from "@/components/Reveal";
import type { EventPerson } from "@/lib/types";

export function PersonView({
  slug,
  personId,
}: {
  slug: string;
  personId: string;
}) {
  const [items, setItems] = useState<MasonryItem[] | null>(null);
  const [person, setPerson] = useState<EventPerson | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [canDelete, setCanDelete] = useState(false);
  const { user, isAdmin, token } = useAuth();

  useEffect(() => {
    let alive = true;
    setItems(null);
    api
      .personPhotos(slug, personId)
      .then((r) => alive && setItems(photosToItems(r.photos ?? [])))
      .catch(() => alive && setItems([]));
    // person meta (thumb/name) from the event people list
    api
      .people(slug)
      .then((r) => alive && setPerson(r.people.find((p) => p.id === personId) ?? null))
      .catch(() => undefined);
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
  }, [slug, personId, isAdmin, user]);

  const handleDelete = async (item: MasonryItem) => {
    if (!eventId) return;
    await api.deletePhoto(eventId, item.id, token ?? undefined);
    setItems((prev) => prev?.filter((x) => x.id !== item.id) ?? prev);
  };

  const thumb = resolveThumb(person?.thumbUrl);

  return (
    <section className="pb-28 pt-36">
      <Reveal className="mb-8 flex flex-wrap items-center gap-4">
        <Link
          href={`/e/${slug}`}
          className="flex min-h-[40px] items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white/70 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
        >
          ‹ All photos
        </Link>
        <div className="flex items-center gap-3">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt={person?.name ?? "Detected person"}
              className="h-12 w-12 rounded-full object-cover ring-1 ring-white/15"
            />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-lg">
              🙂
            </span>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-lime">
              Photos of this person
            </p>
            <h2 className="font-display text-2xl font-bold tracking-tight">
              {person?.name ?? "Detected person"}
            </h2>
          </div>
        </div>
      </Reveal>

      {items === null ? (
        <div
          className="[column-fill:_balance] gap-3 [column-count:2] sm:[column-count:3] lg:[column-count:4]"
          aria-busy="true"
        >
          {[240, 300, 200, 280, 220, 320].map((h, i) => (
            <div
              key={i}
              className="mb-3 w-full animate-pulse rounded-2xl bg-white/[0.06]"
              style={{ height: h }}
            />
          ))}
        </div>
      ) : items.length ? (
        <Reveal>
          <MasonryGrid
            items={items}
            canDelete={canDelete}
            onDelete={canDelete ? handleDelete : undefined}
          />
        </Reveal>
      ) : (
        <Reveal>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-16 text-center">
            <p className="font-display text-2xl font-semibold">
              No photos for this person yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
              Face detection runs in the background, so matches can keep growing
              as more photos are processed.
            </p>
          </div>
        </Reveal>
      )}
    </section>
  );
}
