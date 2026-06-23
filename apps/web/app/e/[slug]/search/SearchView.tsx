"use client";

import { useEffect, useMemo, useState } from "react";
import { Bezel } from "@/components/Bezel";
import {
  MasonryGrid,
  photosToItems,
  type MasonryItem,
} from "@/components/MasonryGrid";
import { PillButton } from "@/components/PillButton";
import { Reveal } from "@/components/Reveal";
import { api } from "@/lib/api";
import type { Photo } from "@/lib/types";

const CHIPS = ["the cake", "dancing", "golden hour", "candids", "toasts"];

export function SearchView({ slug }: { slug: string }) {
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  // No CLIP endpoint on the BFF yet, so we load the real pooled gallery and let
  // the host see every approved photo. We never fabricate search results.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const page = await api.gallery(slug, { take: 60 });
        if (active) setPhotos(page.photos);
      } catch {
        if (active) setPhotos([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  const items: MasonryItem[] = useMemo(() => photosToItems(photos), [photos]);

  return (
    <section className="pb-28 pt-36">
      <Reveal>
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-lime">
          Browse the pool
        </p>
      </Reveal>
      <Reveal index={1}>
        <h2 className="mb-8 font-display text-[clamp(2rem,7vw,3rem)] font-bold leading-[1.05] tracking-tight">
          Every moment, pooled
        </h2>
      </Reveal>

      <Reveal index={2}>
        <Bezel className="max-w-2xl" coreClassName="flex items-center gap-3 p-2">
          <span className="pl-4 text-lg text-lime" aria-hidden="true">
            🔍
          </span>
          <input
            className="min-h-[44px] min-w-0 flex-1 rounded-xl bg-transparent py-3 text-base outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink sm:text-lg"
            value={query}
            placeholder="Semantic search is coming. Browse the full pool below."
            onChange={(e) => setQuery(e.target.value)}
            aria-label={`Search photos in ${slug}`}
          />
          <PillButton arrow className="mr-1" disabled>
            Search
          </PillButton>
        </Bezel>
      </Reveal>

      <Reveal index={3}>
        <div className="mt-5 flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setQuery(c)}
              className="min-h-[44px] rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              {c}
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <p className="mb-5 mt-10 text-sm text-white/55" aria-live="polite">
          {loading
            ? "Loading the pool…"
            : `${photos.length} ${photos.length === 1 ? "photo" : "photos"} in the gallery`}
        </p>
      </Reveal>

      {items.length ? (
        <Reveal>
          <MasonryGrid items={items} />
        </Reveal>
      ) : (
        !loading && (
          <Reveal>
            <p className="text-sm text-white/55">
              No photos yet. Add some from the gallery to fill the pool.
            </p>
          </Reveal>
        )
      )}
    </section>
  );
}
