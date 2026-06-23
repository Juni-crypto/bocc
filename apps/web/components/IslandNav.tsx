"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RecLogo } from "./RecDot";

const DEMO_SLUG = "aisha-dev";

const LINKS: Array<{ href: string; label: string; match: (p: string) => boolean }> = [
  { href: "/", label: "Home", match: (p) => p === "/" },
  { href: "/create", label: "Create", match: (p) => p.startsWith("/create") },
  { href: `/host/${DEMO_SLUG}`, label: "Live", match: (p) => p.startsWith("/host") },
  { href: `/e/${DEMO_SLUG}`, label: "Gallery", match: (p) => /^\/e\/[^/]+$/.test(p) },
  { href: `/e/${DEMO_SLUG}/search`, label: "Search", match: (p) => p.endsWith("/search") },
  { href: `/e/${DEMO_SLUG}/me`, label: "Me", match: (p) => p.endsWith("/me") },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

/**
 * Floating island nav. On narrow viewports the link row collapses to keep the pill
 * inside the viewport; the logo and a single Create action remain reachable.
 */
export function IslandNav() {
  const pathname = usePathname() || "/";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4">
      <header className="pointer-events-auto mt-5 flex max-w-[calc(100vw-2rem)] items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-2 shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        <Link href="/" aria-label="BOCC home" className={`flex items-center gap-2 rounded-full pl-3 pr-2 ${focusRing}`}>
          <RecLogo />
          <span className="font-display font-bold tracking-tight">BOCC</span>
        </Link>

        {/* full nav on >= sm */}
        <div className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
          {LINKS.map((l) => {
            const active = l.match(pathname);
            return (
              <Link
                key={l.label}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3.5 py-2 text-sm transition-all ${focusRing} ${
                  active ? "bg-lime font-medium text-ink" : "text-white/55 hover:text-white"
                }`}
                style={{ transitionTimingFunction: "var(--ease)" }}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* compact action on < sm (>=44px touch target) */}
        <Link
          href="/create"
          className={`ml-1 grid h-11 place-items-center rounded-full bg-lime px-5 text-sm font-semibold text-ink sm:hidden ${focusRing}`}
        >
          Create
        </Link>
      </header>
    </div>
  );
}
