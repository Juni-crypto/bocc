"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { RecDot } from "@/components/RecDot";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Overview", match: (p: string) => p === "/admin" },
  { href: "/admin/events", label: "Events", match: (p: string) => p.startsWith("/admin/events") },
  { href: "/admin/users", label: "Users", match: (p: string) => p.startsWith("/admin/users") },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

/**
 * Admin shell. Distinct header + sidebar, clearly "Admin", still on-brand.
 * Guards: redirects to /login?next=/admin if signed out, shows a 403 panel if
 * signed in without the ADMIN role.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, ready, logout } = useAuth();
  const pathname = usePathname() || "/admin";
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) {
      router.replace("/login?next=%2Fadmin");
    }
  }, [ready, user, router]);

  // Hydrating, or mid-redirect for a signed-out visitor.
  if (!ready || !user) {
    return (
      <section className="grid min-h-[100dvh] place-items-center pt-36" aria-busy="true">
        <p className="text-sm text-white/40">Checking access…</p>
      </section>
    );
  }

  // Signed in but not an admin: explicit 403.
  if (!isAdmin) {
    return (
      <section className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center pb-24 pt-36 text-center">
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-coral">403 · Restricted</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Admins only</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-white/55">
          This area is for platform administrators. Your account does not have access.
        </p>
        <Link
          href="/dashboard"
          className={`mx-auto mt-6 inline-flex min-h-[44px] items-center rounded-full bg-lime px-5 py-3 text-sm font-semibold text-ink ${focusRing}`}
        >
          Back to dashboard
        </Link>
      </section>
    );
  }

  return (
    <div className="pt-28 pb-20">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime text-sm font-bold text-ink">
            A
          </span>
          <div>
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-lime">
              <RecDot tone="lime" size={5} /> Admin console
            </p>
            <p className="text-sm text-white/55">Signed in as {user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className={`min-h-[44px] rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/[0.07] ${focusRing}`}
          >
            Exit to site
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/");
            }}
            className={`min-h-[44px] rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/[0.07] ${focusRing}`}
          >
            Log out
          </button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Admin" className="flex gap-2 lg:flex-col">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`min-h-[44px] rounded-xl px-4 py-2.5 text-sm transition ${focusRing} ${
                  active
                    ? "bg-lime font-semibold text-ink"
                    : "border border-white/10 bg-white/[0.04] text-white/70 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
