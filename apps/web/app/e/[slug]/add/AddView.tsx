"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bezel } from "@/components/Bezel";
import { PillButton } from "@/components/PillButton";
import { Reveal } from "@/components/Reveal";
import { api, ApiError } from "@/lib/api";
import { getMember, type StoredMember } from "@/lib/member";

export function AddView({ slug }: { slug: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [member, setLocalMember] = useState<StoredMember | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  // Must be a crew member to upload. Bounce to join, returning here after.
  useEffect(() => {
    const m = getMember(slug);
    if (!m) {
      router.replace(`/e/${slug}/join?next=${encodeURIComponent(`/e/${slug}/add`)}`);
      return;
    }
    setLocalMember(m);
  }, [slug, router]);

  const upload = async () => {
    if (!member || !files.length) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      // Geofence-on events reject photos without coordinates; pass them when
      // available, but never block on a denied permission.
      const coords = await getCoords();
      const res = await api.uploadPhotos(slug, files, {
        memberId: member.id,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      setDone(res.uploaded);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Upload failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-lg pb-28 pt-36">
      <Reveal>
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-lime">
          Add to the pool
        </p>
      </Reveal>
      <Reveal index={1}>
        <h2 className="mb-8 font-display text-[clamp(2rem,7vw,3rem)] font-bold leading-[1.05] tracking-tight">
          Drop your shots
        </h2>
      </Reveal>

      <Reveal index={2}>
        <Bezel viewfinder coreClassName="p-6">
          <label
            className="grid min-h-[44px] cursor-pointer place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-14 text-center transition hover:border-lime/40 focus-within:border-lime focus-within:outline-none focus-within:ring-2 focus-within:ring-lime focus-within:ring-offset-2 focus-within:ring-offset-ink"
            htmlFor="bocc-files"
          >
            <span className="mb-2 text-3xl text-white/40" aria-hidden="true">
              ＋
            </span>
            <span className="text-sm text-white/70">
              {files.length
                ? `${files.length} selected`
                : "Tap to pick photos or video"}
            </span>
            <input
              id="bocc-files"
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="sr-only"
              onChange={(e) =>
                setFiles(e.target.files ? Array.from(e.target.files) : [])
              }
            />
          </label>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-xs text-coral"
            >
              {error}
            </p>
          )}
          {done != null && (
            <p
              role="status"
              className="mt-4 rounded-xl border border-lime/30 bg-lime/10 px-3 py-2 text-xs text-lime"
            >
              Uploaded {done} {done === 1 ? "photo" : "photos"}. They appear in
              the gallery once approved.
            </p>
          )}

          <PillButton
            fullWidth
            className="mt-6 py-3.5"
            arrow={busy ? null : "↗"}
            disabled={busy || !files.length}
            onClick={upload}
          >
            {busy ? "Uploading…" : "Upload"}
          </PillButton>
          <Link
            href={`/e/${slug}`}
            className="mt-4 flex min-h-[44px] items-center justify-center rounded-full text-center text-sm text-white/55 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            Back to gallery
          </Link>
        </Bezel>
      </Reveal>
    </section>
  );
}

function getCoords(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 4000 },
    );
  });
}
