import Link from "next/link";
import type { Metadata } from "next";
import { MasonryGrid } from "@/components/MasonryGrid";
import { PeopleStrip } from "@/components/PeopleStrip";
import { Reveal } from "@/components/Reveal";
import { loadEventHeader, loadGalleryItems } from "@/lib/eventData";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const header = await loadEventHeader(slug);
  return { title: `${header.title} · Gallery · BOCC` };
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [header, items] = await Promise.all([
    loadEventHeader(slug),
    loadGalleryItems(slug),
  ]);

  return (
    <section className="pb-28 pt-36">
      <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-lime">
            Pooled gallery
          </p>
          <h2 className="font-display text-[clamp(2rem,7vw,3rem)] font-bold leading-[1.05] tracking-tight">
            {header.title}
          </h2>
          <p className="mt-2 text-sm text-white/55">
            {header.photos} photos · {header.crew} crew
            {header.live ? " · live" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/e/${slug}/add`}
            className="cta flex min-h-[44px] items-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            + Add photos
          </Link>
          <Link
            href={`/e/${slug}/search`}
            className="cta flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white/70 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            <span className="text-lime" aria-hidden="true">
              🔍
            </span>{" "}
            Search
          </Link>
        </div>
      </Reveal>

      <Reveal>
        <PeopleStrip slug={slug} />
      </Reveal>

      {items.length ? (
        <Reveal>
          <MasonryGrid items={items} />
        </Reveal>
      ) : (
        <Reveal>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-16 text-center">
            <p className="font-display text-2xl font-semibold">
              {header.found ? "No photos yet" : "Event not found"}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
              {header.found
                ? "Be the first to add a shot. Join the crew, then upload from your camera roll."
                : "We could not find this event. Check the link or ask the host for a fresh QR."}
            </p>
            {header.found && (
              <Link
                href={`/e/${slug}/add`}
                className="mt-6 inline-flex min-h-[44px] items-center rounded-full bg-lime px-5 py-3 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              >
                Add the first photos
              </Link>
            )}
          </div>
        </Reveal>
      )}
    </section>
  );
}
