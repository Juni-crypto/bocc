"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bezel } from "@/components/Bezel";
import { PillButton } from "@/components/PillButton";
import { Reveal } from "@/components/Reveal";
import { ToggleRow } from "@/components/Toggle";
import { api, ApiError } from "@/lib/api";
import { getMember, setMember } from "@/lib/member";

const inputCls =
  "w-full min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none transition focus:border-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

export function JoinView({ slug }: { slug: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || `/e/${slug}`;

  const [name, setName] = useState("");
  const [consent, setConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already a member? Skip straight ahead.
  useEffect(() => {
    if (getMember(slug)) router.replace(next);
  }, [slug, next, router]);

  const onJoin = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.join(slug, {
        name: name.trim() || undefined,
        consentFaceMatch: consent,
      });
      setMember(slug, {
        id: result.member.id,
        name: result.member.name,
        consentFaceMatch: result.member.consentFaceMatch,
      });
      router.replace(next);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Could not reach the API. Try again.",
      );
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-lg pb-28 pt-36">
      <Reveal>
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-lime">
          Join the crew
        </p>
      </Reveal>
      <Reveal index={1}>
        <h2 className="mb-8 font-display text-[clamp(2rem,7vw,3rem)] font-bold leading-[1.05] tracking-tight">
          You&apos;re on the crew
        </h2>
      </Reveal>

      <Reveal index={2}>
        <Bezel coreClassName="p-6">
          <label htmlFor="join-name" className="mb-1.5 block text-sm text-white/55">
            Your name
          </label>
          <input
            id="join-name"
            className={`${inputCls} mb-5`}
            value={name}
            placeholder="e.g. Riya"
            onChange={(e) => setName(e.target.value)}
          />
          <div className="divide-y divide-white/5">
            <ToggleRow
              title="Let my selfie find my photos"
              hint="Face matching. You can change this later."
              checked={consent}
              onChange={setConsent}
            />
          </div>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-xs text-coral"
            >
              {error}
            </p>
          )}
          <PillButton
            fullWidth
            className="mt-6 py-3.5"
            arrow={submitting ? null : "↗"}
            disabled={submitting}
            onClick={onJoin}
          >
            {submitting ? "Joining…" : "Join the crew"}
          </PillButton>
        </Bezel>
      </Reveal>
    </section>
  );
}
