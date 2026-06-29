"use client";

// Auto-populating face strip: shows every person Immich detects across the
// event's photos (thumbnail + how many shots they appear in). Faces appear as
// the background ML pass finishes, so we show a "detecting" hint until then.
// The "Find me" selfie CTA stays alongside it.

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { resolveThumb } from "@/components/MasonryGrid";
import type { EventPerson } from "@/lib/types";

export function PeopleStrip({ slug }: { slug: string }) {
  const [people, setPeople] = useState<EventPerson[] | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .people(slug)
      .then((r) => alive && setPeople(r.people))
      .catch(() => alive && setPeople([]));
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
          People in this event
        </p>
        <Link
          href={`/e/${slug}/me`}
          className="flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border border-lime/30 bg-lime/[0.08] px-4 text-xs font-semibold text-lime hover:bg-lime/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
        >
          Find me with a selfie
        </Link>
      </div>

      {people === null ? (
        <div className="flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-white/[0.06]"
            />
          ))}
        </div>
      ) : people.length ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {people.map((p) => {
            const t = resolveThumb(p.thumbUrl);
            return (
              <div
                key={p.id}
                className="w-16 shrink-0 text-center"
                title={p.name ?? `Appears in ${p.photoCount} photos`}
              >
                {t ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t}
                    alt={p.name ?? "Detected person"}
                    className="h-14 w-14 rounded-full object-cover ring-1 ring-white/15"
                    loading="lazy"
                  />
                ) : (
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-white/10 text-xl">
                    🙂
                  </span>
                )}
                <span className="mt-1 block truncate text-[11px] text-white/55">
                  {p.name ?? `${p.photoCount}`}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-white/40">
          Detecting people… faces appear here automatically as photos are
          processed.
        </p>
      )}
    </div>
  );
}
