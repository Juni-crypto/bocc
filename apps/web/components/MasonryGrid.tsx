"use client";

import { useState } from "react";
import { API_BASE } from "@/lib/api";
import type { Photo } from "@/lib/types";
import { Lightbox } from "@/components/Lightbox";

export interface MasonryItem {
  id: string;
  /** Direct image src (placeholder or absolute). Wins over thumbUrl. */
  src?: string;
  /** Backend-relative thumb path (e.g. /api/events/.../thumb). */
  thumbUrl?: string;
  /** Full-resolution path for the viewer (falls back to thumbUrl). */
  originalUrl?: string;
  isVideo?: boolean;
  alt?: string;
  uploaderName?: string | null;
  takenAt?: string | null;
  people?: { id: string; name?: string | null; thumbUrl?: string }[];
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
    originalUrl: p.originalUrl,
    isVideo: p.isVideo,
    uploaderName: p.uploaderName ?? null,
    takenAt: p.takenAt ?? null,
    people: p.people?.map((x) => ({
      id: x.id,
      name: x.name,
      thumbUrl: x.thumbUrl,
    })),
  }));
}

/**
 * CSS-columns masonry grid. Thumbnails are clickable and open a full-screen
 * viewer (prev/next, metadata, optional delete). Pass `canDelete` + `onDelete`
 * to expose host/admin photo removal from inside the viewer.
 */
export function MasonryGrid({
  items,
  canDelete = false,
  onDelete,
}: {
  items: MasonryItem[];
  canDelete?: boolean;
  onDelete?: (item: MasonryItem) => Promise<void> | void;
}) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <div className="masonry">
        {items.map((item, i) => {
          const src = item.src ?? resolveThumb(item.thumbUrl);
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => setOpen(i)}
              className="group relative block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
              aria-label={`Open photo ${i + 1}${
                item.uploaderName ? ` by ${item.uploaderName}` : ""
              }`}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={item.alt ?? "Event photo"} loading="lazy" />
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
            </button>
          );
        })}
      </div>

      {open !== null && items[open] && (
        <Lightbox
          items={items}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          canDelete={canDelete}
          onDelete={
            onDelete
              ? async (it) => {
                  await onDelete(it);
                  // close if the deleted one was last; else stay on same index
                  setOpen((cur) =>
                    cur === null
                      ? null
                      : items.length <= 1
                        ? null
                        : Math.min(cur, items.length - 2),
                  );
                }
              : undefined
          }
        />
      )}
    </>
  );
}
