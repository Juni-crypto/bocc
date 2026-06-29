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

const CHIPS = ["people dancing", "the cake", "golden hour", "candids", "toasts"];

export function SearchView({ slug }: { slug: string }) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // Real CLIP semantic search via the BFF (-> Immich), scoped to this event.
  useEffect(() => {
    const q = submitted.trim();
    if (!q) {
      setPhotos([]);
      setNote(null);
      return;
    }
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const res = await api.search(slug, q);
        if (!active) return;
        setPhotos(res.photos ?? []);
        setNote(res.note ?? null);
      } catch {
        if (active) {
          setPhotos([]);
          setNote("Search is unavailable right now.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, submitted]);

  const items: MasonryItem[] = useMemo(() => photosToItems(photos), [photos]);

  const runSearch = () => setSubmitted(query);

  return (
    <section className="pb-28 pt-36">
      <Reveal>
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-lime">
          Semantic search
        </p>
      </Reveal>
      <Reveal index={1}>
        <h2 className="mb-8 font-display text-[clamp(2rem,7vw,3rem)] font-bold leading-[1.05] tracking-tight">
          Find any moment in words
        </h2>
      </Reveal>

      <Reveal index={2}>
        <Bezel className="max-w-2xl" coreClassName="flex items-center gap-3 p-2">
          <span className="pl-4 text-lg text-lime" aria-hidden="true">
            &#8981;
          </span>
          <input
            className="min-h-[44px] min-w-0 flex-1 rounded-xl bg-transparent py-3 text-base outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink sm:text-lg"
            value={query}
            placeholder='Try "people near the cake"'
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            aria-label={`Search photos in ${slug}`}
          />
          <PillButton arrow className="mr-1" onClick={runSearch} disabled={!query.trim()}>
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
              onClick={() => {
                setQuery(c);
                setSubmitted(c);
              }}
              className="min-h-[44px] rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              {c}
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <p className="mb-5 mt-10 text-sm text-white/55" aria-live="polite">
          {!submitted
            ? "Search the pooled gallery in plain language."
            : loading
              ? "Searching..."
              : note
                ? note
                : `${photos.length} ${photos.length === 1 ? "match" : "matches"} for "${submitted}"`}
        </p>
      </Reveal>

      {items.length ? (
        <Reveal>
          <MasonryGrid items={items} />
        </Reveal>
      ) : (
        submitted &&
        !loading &&
        !note && (
          <Reveal>
            <p className="text-sm text-white/55">
              Nothing matched "{submitted}". Try different words.
            </p>
          </Reveal>
        )
      )}
    </section>
  );
}
