"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { RecLogo } from "./RecDot";
import { useAuth } from "@/lib/auth";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

/**
 * Floating island nav. Marketing links stay on the left; auth-aware actions sit
 * on the right. On narrow viewports the link row collapses to keep the pill
 * inside the viewport; the logo + primary action remain reachable.
 */
export function IslandNav() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { user, isAdmin, ready, logout } = useAuth();

  const loggedIn = ready && !!user;

  const navLinks: Array<{ href: string; label: string; match: (p: string) => boolean }> =
    loggedIn
      ? [
          { href: "/", label: "Home", match: (p) => p === "/" },
          { href: "/dashboard", label: "Dashboard", match: (p) => p.startsWith("/dashboard") },
          { href: "/my-events", label: "My events", match: (p) => p.startsWith("/my-events") },
          { href: "/create", label: "Create", match: (p) => p.startsWith("/create") },
        ]
      : [
          { href: "/", label: "Home", match: (p) => p === "/" },
          { href: "/my-events", label: "My events", match: (p) => p.startsWith("/my-events") },
          { href: "/my", label: "My photos", match: (p) => p === "/my" || p.startsWith("/my/") },
          { href: "/#how", label: "How it works", match: () => false },
        ];

  const onLogout = () => {
    logout();
    router.push("/");
  };

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
          {navLinks.map((l) => {
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
          {loggedIn && isAdmin && (
            <Link
              href="/admin"
              aria-current={pathname.startsWith("/admin") ? "page" : undefined}
              className={`rounded-full px-3.5 py-2 text-sm transition-all ${focusRing} ${
                pathname.startsWith("/admin")
                  ? "bg-lime font-medium text-ink"
                  : "text-lime hover:text-white"
              }`}
              style={{ transitionTimingFunction: "var(--ease)" }}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />

        {/* auth actions */}
        {loggedIn ? (
          <button
            type="button"
            onClick={onLogout}
            className={`ml-1 hidden min-h-[44px] items-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white/80 transition hover:bg-white/[0.07] sm:inline-flex ${focusRing}`}
          >
            Log out
          </button>
        ) : (
          <Link
            href="/login"
            className={`ml-1 hidden min-h-[44px] items-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white/80 transition hover:bg-white/[0.07] sm:inline-flex ${focusRing}`}
          >
            Log in
          </Link>
        )}

        {/* compact action on < sm (>=44px touch target) */}
        <Link
          href={loggedIn ? "/dashboard" : "/login"}
          className={`ml-1 grid h-11 place-items-center rounded-full bg-lime px-5 text-sm font-semibold text-ink sm:hidden ${focusRing}`}
        >
          {loggedIn ? "Dashboard" : "Log in"}
        </Link>
      </header>
    </div>
  );
}
