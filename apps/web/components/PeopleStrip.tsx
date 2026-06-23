import Link from "next/link";

/**
 * Entry point to the selfie "Find me" flow. There is no people-cluster endpoint
 * yet, so this is a single honest CTA rather than fabricated face thumbnails.
 */
export function PeopleStrip({ slug }: { slug: string }) {
  return (
    <div className="mb-8 flex gap-4 overflow-x-auto pb-5">
      <Link
        href={`/e/${slug}/me`}
        className="cta flex shrink-0 flex-col items-center gap-2 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
      >
        <div className="grid h-16 w-16 place-items-center rounded-full bg-lime text-center text-xs font-semibold leading-tight text-ink ring-2 ring-lime">
          Find
          <br />
          me
        </div>
        <span className="text-xs text-white/60">Selfie</span>
      </Link>
      <Link
        href={`/e/${slug}/add`}
        className="cta flex shrink-0 flex-col items-center gap-2 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
      >
        <div className="grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-2xl text-white/60">
          <span aria-hidden="true">+</span>
        </div>
        <span className="text-xs text-white/60">Add photos</span>
      </Link>
    </div>
  );
}
