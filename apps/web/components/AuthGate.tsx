"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

/**
 * Client-side guard for host surfaces. Once auth has hydrated, redirects
 * unauthenticated visitors to /login?next=<redirectTo>. While hydrating (or
 * mid-redirect) it renders a quiet placeholder so protected content never
 * flashes for a logged-out user.
 */
export function AuthGate({
  redirectTo,
  children,
}: {
  redirectTo: string;
  children: React.ReactNode;
}) {
  const { token, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !token) {
      router.replace(`/login?next=${encodeURIComponent(redirectTo)}`);
    }
  }, [ready, token, redirectTo, router]);

  if (!ready || !token) {
    return (
      <section
        className="grid min-h-[100dvh] place-items-center pt-36"
        aria-busy="true"
      >
        <p className="text-sm text-white/40">Checking access…</p>
      </section>
    );
  }

  return <>{children}</>;
}
