// Server-side helpers that fetch event + gallery data from the live API.
//
// These no longer fall back to demo content. When the event genuinely has no
// data we return real-but-empty values so pages can render an honest empty
// state; we never substitute fake events or photos.

import { api } from "./api";
import type { MasonryItem } from "@/components/MasonryGrid";
import { photosToItems } from "@/components/MasonryGrid";
import type { BoccEvent, EventStats } from "./types";

export interface EventHeader {
  title: string;
  photos: number;
  crew: number;
  live: boolean;
  slug: string;
  found: boolean;
}

/** Load the real event header. Returns found: false when the event is missing. */
export async function loadEventHeader(slug: string): Promise<EventHeader> {
  const event = await loadEvent(slug);
  if (!event) {
    return {
      title: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      photos: 0,
      crew: 0,
      live: false,
      slug,
      found: false,
    };
  }
  const stats = await loadStats(event.id);
  return {
    title: event.name,
    photos: stats?.photos ?? 0,
    crew: stats?.crew ?? 0,
    live: event.status === "LIVE",
    slug: event.slug,
    found: true,
  };
}

export async function loadStats(eventId: string): Promise<EventStats | null> {
  try {
    return await api.stats(eventId);
  } catch {
    return null;
  }
}

export async function loadEvent(slug: string): Promise<BoccEvent | null> {
  try {
    return await api.getEvent(slug);
  } catch {
    return null;
  }
}

/** Real gallery items from the API. Empty array when there are no photos. */
export async function loadGalleryItems(
  slug: string,
  count = 60,
): Promise<MasonryItem[]> {
  try {
    const page = await api.gallery(slug, { take: count });
    return photosToItems(page.photos);
  } catch {
    return [];
  }
}
