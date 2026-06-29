"use client";

// Returning-guest self service. Enter the phone you joined with and get back
// every event you joined plus the pics there. No account, the phone is the key.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { MasonryGrid, photosToItems } from "@/components/MasonryGrid";
import { api, ApiError } from "@/lib/api";
import type { GuestLookup } from "@/lib/types";

const inputCls =
  "w-full min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none transition focus:border-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

export function MyPhotosView() {
  const [phone, setPhone] = useState("");
  const [data, setData] = useState<GuestLookup | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // pre-fill the phone we remembered at join time
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("bocc_phone");
      if (saved) setPhone(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const run = async () => {
    const p = phone.trim();
    if (!p) return;
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      const res = await api.guestLookup(p);
      setData(res);
      try {
        window.localStorage.setItem("bocc_phone", p);
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not reach the API. Try again.",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const totalPhotos =
    data?.events.reduce((n, e) => n + e.photos.length, 0) ?? 0;

  return (
    <section className="mx-auto max-w-5xl pb-28 pt-36">
      <Reveal>
        <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-lime">
          Your photos
        </p>
        <h2 className="font-display text-[clamp(2rem,7vw,3rem)] font-bold leading-[1.05] tracking-tight">
          Find your pics
        </h2>
        <p className="mt-2 max-w-md text-sm text-white/55">
          Enter the phone you joined with. We will pull up every event you joined
          and the photos you uploaded there.
        </p>
      </Reveal>

      <Reveal index={1}>
        <div className="mt-6 flex max-w-md flex-wrap gap-2">
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={`${inputCls} flex-1`}
            value={phone}
            placeholder="e.g. +91 98765 43210"
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            aria-label="Your phone number"
          />
          <button
            type="button"
            onClick={run}
            disabled={loading || !phone.trim()}
            className="min-h-[44px] rounded-xl bg-lime px-6 text-sm font-semibold text-ink disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            {loading ? "Looking…" : "Find my photos"}
          </button>
        </div>
      </Reveal>

      {error && (
        <p
          role="alert"
          className="mt-5 max-w-md rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-xs text-coral"
        >
          {error}
        </p>
      )}

      {searched && !loading && !error && data && (
        <div className="mt-10 space-y-12">
          {data.events.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-16 text-center">
              <p className="font-display text-2xl font-semibold">
                Nothing found for that number
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
                Make sure you joined with this phone. You can add it when you
                join an event.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-white/55">
                {data.events.length} event{data.events.length === 1 ? "" : "s"} ·{" "}
                {totalPhotos} photo{totalPhotos === 1 ? "" : "s"} you added
              </p>
              {data.events.map(({ event, photos }) => (
                <div key={event.id}>
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h3 className="font-display text-2xl font-semibold tracking-tight">
                        {event.name}
                      </h3>
                      <p className="mt-1 text-xs text-white/45">
                        {photos.length} photo{photos.length === 1 ? "" : "s"} you
                        added
                      </p>
                    </div>
                    <Link
                      href={`/e/${event.slug}`}
                      className="min-h-[40px] rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/70 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                    >
                      Open event gallery
                    </Link>
                  </div>
                  {photos.length ? (
                    <MasonryGrid items={photosToItems(photos)} />
                  ) : (
                    <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/40">
                      You joined this event but have not added photos yet.
                    </p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}
