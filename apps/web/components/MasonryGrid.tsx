"use client";

import { API_BASE } from "@/lib/api";
import type { Photo } from "@/lib/types";

export interface MasonryItem {
  id: string;
  /** Direct image src (placeholder or absolute). Wins over thumbUrl. */
  src?: string;
  /** Backend-relative thumb path (e.g. /api/events/.../thumb). */
  thumbUrl?: string;
  isVideo?: boolean;
  alt?: string;
}

/** Resolve a backend-relative thumbUrl against the API origin. */
export function resolveThumb(thumbUrl?: string): string | undefined {
  if (!thumbUrl) return undefined;
  if (/^https?:\/\//.test(thumbUrl)) return thumbUrl;
  // API_BASE ends with /api; thumbUrl already starts with /api -> use origin.
  try {
    const origin = new URL(API_BASE).origin;
    return `${origin}${thumbUrl}`;
  } catch {
    return thumbUrl;
  }
}

export function photosToItems(photos: Photo[]): MasonryItem[] {
  return photos.map((p) => ({
    id: p.id,
    thumbUrl: p.thumbUrl,
    isVideo: p.isVideo,
  }));
}

/**
 * CSS-columns masonry grid. Renders real thumbs when present, falling back to a
 * provided `src` (placeholder). Hover scales the image (motif from the mockup).
 */
export function MasonryGrid({ items }: { items: MasonryItem[] }) {
  return (
    <div className="masonry">
      {items.map((item) => {
        const src = item.src ?? resolveThumb(item.thumbUrl);
        return (
          <div key={item.id}>
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={item.alt ?? "Event photo"}
                loading="lazy"
              />
            ) : (
              <div className="aspect-[3/4] w-full bg-white/[0.04]" />
            )}
            {item.isVideo && (
              <span
                className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-ink/70 text-xs text-white"
                role="img"
                aria-label="Video"
              >
                <span aria-hidden="true">▶</span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
