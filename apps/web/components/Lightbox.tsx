"use client";

// Full-screen photo viewer (Picasa/Lightroom style): keyboard + swipe nav,
// per-photo metadata (uploader, date, detected people), download, and an
// optional delete action for hosts/admins. Pure client component; it works on
// top of whatever items the grid already loaded.

import { useCallback, useEffect, useRef, useState } from "react";
import type { MasonryItem } from "@/components/MasonryGrid";
import { resolveThumb } from "@/components/MasonryGrid";

function fmtDate(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return null;
  }
}

export function Lightbox({
  items,
  index,
  onIndex,
  onClose,
  canDelete = false,
  onDelete,
}: {
  items: MasonryItem[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  canDelete?: boolean;
  onDelete?: (item: MasonryItem) => Promise<void> | void;
}) {
  const item = items[index];
  const [deleting, setDeleting] = useState(false);
  const touchX = useRef<number | null>(null);

  const prev = useCallback(() => {
    onIndex((index - 1 + items.length) % items.length);
  }, [index, items.length, onIndex]);
  const next = useCallback(() => {
    onIndex((index + 1) % items.length);
  }, [index, items.length, onIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    // lock background scroll while open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, prev, next]);

  if (!item) return null;

  const full = item.src ?? resolveThumb(item.originalUrl ?? item.thumbUrl);
  const date = fmtDate(item.takenAt);
  const people = item.people ?? [];

  const handleDelete = async () => {
    if (!onDelete || deleting) return;
    if (!window.confirm("Delete this photo for everyone? This cannot be undone."))
      return;
    setDeleting(true);
    try {
      await onDelete(item);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/92 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={onClose}
    >
      {/* top bar */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 text-white/80"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="font-mono text-xs tracking-widest text-lime">
          {index + 1} / {items.length}
        </span>
        <div className="flex items-center gap-2">
          {full && (
            <a
              href={full}
              download
              target="_blank"
              rel="noreferrer"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-sm hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
              aria-label="Download photo"
              title="Download"
            >
              ⤓
            </a>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="grid h-10 w-10 place-items-center rounded-full border border-coral/40 bg-coral/10 text-sm text-coral hover:bg-coral/20 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
              aria-label="Delete photo"
              title="Delete"
            >
              {deleting ? "…" : "🗑"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-lg hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
            aria-label="Close viewer"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* image stage */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden px-2"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
          if (Math.abs(dx) > 50) (dx > 0 ? prev : next)();
          touchX.current = null;
        }}
      >
        {items.length > 1 && (
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/40 text-2xl text-white hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
            aria-label="Previous photo"
          >
            ‹
          </button>
        )}
        {full ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={full}
            alt={item.alt ?? "Event photo"}
            className="max-h-full max-w-full select-none rounded-lg object-contain"
            draggable={false}
          />
        ) : (
          <div className="h-2/3 w-2/3 animate-pulse rounded-lg bg-white/[0.06]" />
        )}
        {items.length > 1 && (
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/40 text-2xl text-white hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
            aria-label="Next photo"
          >
            ›
          </button>
        )}
      </div>

      {/* metadata footer */}
      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 px-4 py-3 text-sm text-white/70"
        onClick={(e) => e.stopPropagation()}
      >
        {item.uploaderName && (
          <span>
            <span className="text-white/40">Added by </span>
            <span className="text-white">{item.uploaderName}</span>
          </span>
        )}
        {date && (
          <span>
            <span className="text-white/40">Taken </span>
            {date}
          </span>
        )}
        {people.length > 0 && (
          <span className="flex items-center gap-2">
            <span className="text-white/40">In this photo:</span>
            <span className="flex items-center gap-1.5">
              {people.slice(0, 8).map((p, i) => {
                const t = resolveThumb(p.thumbUrl);
                return (
                  <span
                    key={p.id ?? i}
                    className="flex items-center gap-1 rounded-full bg-white/[0.06] py-0.5 pl-0.5 pr-2"
                    title={p.name ?? "Person"}
                  >
                    {t ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t}
                        alt={p.name ?? "Person"}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-[10px]">
                        🙂
                      </span>
                    )}
                    {p.name && <span className="text-xs">{p.name}</span>}
                  </span>
                );
              })}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
