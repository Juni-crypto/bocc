"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

const ArrowUR = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-[18px] w-[18px] fill-none stroke-ink [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.5]"
  >
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);

/**
 * Landing CTA. Hosts must be logged in to create, so route to /create when
 * authed and /login?next=/create otherwise. Public guest flows are untouched.
 */
export function StartEventCta({ className = "" }: { className?: string }) {
  const { user, ready } = useAuth();
  const href = ready && user ? "/create" : "/login?next=%2Fcreate";

  return (
    <Link
      href={href}
      className={`cta group inline-flex items-center gap-3 rounded-full bg-lime font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${className}`}
    >
      Start an event
      <span aria-hidden className="ico grid h-9 w-9 place-items-center rounded-full bg-ink/10">
        <ArrowUR />
      </span>
    </Link>
  );
}
