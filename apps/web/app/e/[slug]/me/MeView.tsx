"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bezel } from "@/components/Bezel";
import { MasonryGrid, photosToItems } from "@/components/MasonryGrid";
import { PillButton } from "@/components/PillButton";
import { Reveal } from "@/components/Reveal";
import { api, ApiError } from "@/lib/api";
import { getMember, type StoredMember } from "@/lib/member";
import type { FindMeResult } from "@/lib/types";

export function MeView({ slug }: { slug: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [member, setMember] = useState<StoredMember | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FindMeResult | null>(null);

  // Need a member id to attach the match to. Bounce to join if needed.
  useEffect(() => {
    const m = getMember(slug);
    if (!m) {
      router.replace(`/e/${slug}/join?next=${encodeURIComponent(`/e/${slug}/me`)}`);
      return;
    }
    setMember(m);
  }, [slug, router]);

  const onPick = async (file: File) => {
    if (!member) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.findMe(slug, file, member.id);
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Find me failed. Try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const photos = result?.photos ?? [];
  const items = photosToItems(photos);

  return (
    <section className="pb-28 pt-36">
      <Reveal>
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-lime">
          Matched from your selfie
        </p>
      </Reveal>
      <Reveal index={1}>
        <h2 className="mb-8 font-display text-[clamp(2rem,7vw,3rem)] font-bold leading-[1.05] tracking-tight">
          Find every photo you&apos;re in
        </h2>
      </Reveal>

      <Reveal index={2}>
        <Bezel viewfinder className="max-w-lg" coreClassName="p-6">
          <label
            htmlFor="bocc-selfie"
            className="grid min-h-[44px] cursor-pointer place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center transition hover:border-lime/40 focus-within:border-lime focus-within:outline-none focus-within:ring-2 focus-within:ring-lime focus-within:ring-offset-2 focus-within:ring-offset-ink"
          >
            <span className="mb-2 text-3xl text-white/40" aria-hidden="true">
              ☺
            </span>
            <span className="text-sm text-white/70">
              Take or pick a selfie
            </span>
            <input
              id="bocc-selfie"
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPick(f);
              }}
            />
          </label>
          <PillButton
            fullWidth
            className="mt-5 py-3.5"
            arrow={busy ? null : "↗"}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Matching…" : "Find me"}
          </PillButton>
        </Bezel>
      </Reveal>

      {error && (
        <Reveal>
          <p
            role="alert"
            className="mt-6 max-w-lg rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral"
          >
            {error}
          </p>
        </Reveal>
      )}

      {result && <ResultBlock result={result} />}

      {result?.status === "ok" && photos.length > 0 && (
        <Reveal>
          <div className="mt-8">
            <MasonryGrid items={items} />
          </div>
        </Reveal>
      )}
    </section>
  );
}

function ResultBlock({ result }: { result: FindMeResult }) {
  if (result.status === "ok") {
    const n = result.count ?? result.photos?.length ?? 0;
    if (n === 0) {
      return (
        <Reveal>
          <p className="mt-8 text-sm text-white/55">
            We matched your face but found no approved photos of you yet. Check
            back as the crew uploads more.
          </p>
        </Reveal>
      );
    }
    return (
      <Reveal>
        <p className="mt-8 text-sm text-white/60">
          You&apos;re in {n} {n === 1 ? "photo" : "photos"}.
        </p>
      </Reveal>
    );
  }

  if (result.status === "no_match") {
    return (
      <Reveal>
        <p className="mt-8 text-sm text-white/55">
          {result.note ?? "No face detected in that selfie. Try another one."}
        </p>
      </Reveal>
    );
  }

  // not_implemented or any other backend status
  return (
    <Reveal>
      <p className="mt-8 max-w-lg text-sm text-white/55">
        {result.note ??
          "Face matching is not available for this event right now."}
      </p>
    </Reveal>
  );
}
