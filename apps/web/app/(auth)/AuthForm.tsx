"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bezel } from "@/components/Bezel";
import { PillButton } from "@/components/PillButton";
import { Reveal } from "@/components/Reveal";
import { RecDot } from "@/components/RecDot";
import { useAuth } from "@/lib/auth";
import { ApiError, API_BASE } from "@/lib/api";

const inputCls =
  "w-full min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none transition focus:border-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

/** Only allow same-origin relative redirects from ?next, never an absolute URL. */
function safeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/dashboard";
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const search = useSearchParams();
  const { login, signup } = useAuth();
  const next = safeNext(search.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === "signup";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (isSignup) {
        await signup(email.trim(), password, name.trim());
      } else {
        await login(email.trim(), password);
      }
      router.push(next);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : `Could not reach the API at ${API_BASE}. Make sure the backend is running, then try again.`;
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center pb-24 pt-36">
      <Reveal>
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
          <RecDot tone="coral" size={6} />
          <span className="text-[11px] uppercase tracking-[0.22em] text-white/55">
            Host access
          </span>
        </div>
      </Reveal>
      <Reveal index={1}>
        <h1 className="mb-2 font-display text-[clamp(2rem,6vw,2.75rem)] font-bold leading-[1.05] tracking-tight">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
      </Reveal>
      <Reveal index={2}>
        <p className="mb-8 text-sm text-white/55">
          {isSignup
            ? "Hosts sign up to create and manage events. Guests never need an account."
            : "Log in to create events and watch your gallery fill up live."}
        </p>
      </Reveal>

      <Reveal index={3}>
        <Bezel viewfinder coreClassName="p-6 sm:p-8">
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            {isSignup && (
              <div>
                <label htmlFor="auth-name" className="mb-1.5 block text-sm text-white/55">
                  Name
                </label>
                <input
                  id="auth-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  placeholder="Aisha Khanna"
                />
              </div>
            )}
            <div>
              <label htmlFor="auth-email" className="mb-1.5 block text-sm text-white/55">
                Email
              </label>
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@host.com"
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="mb-1.5 block text-sm text-white/55">
                Password
              </label>
              <input
                id="auth-password"
                name="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder={isSignup ? "At least 8 characters" : "Your password"}
                aria-describedby={isSignup ? "auth-password-hint" : undefined}
              />
              {isSignup && (
                <p id="auth-password-hint" className="mt-1.5 text-xs text-white/40">
                  Minimum 8 characters.
                </p>
              )}
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral"
              >
                {error}
              </p>
            )}

            <PillButton
              type="submit"
              fullWidth
              className="py-3.5"
              arrow={submitting ? false : "↗"}
              disabled={submitting}
            >
              {submitting
                ? isSignup
                  ? "Creating account…"
                  : "Logging in…"
                : isSignup
                  ? "Create account"
                  : "Log in"}
            </PillButton>
          </form>
        </Bezel>
      </Reveal>

      <Reveal index={4}>
        <p className="mt-6 text-center text-sm text-white/55">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link
                href={`/login${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
                className="rounded font-medium text-lime underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              >
                Log in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link
                href={`/signup${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
                className="rounded font-medium text-lime underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              >
                Create an account
              </Link>
            </>
          )}
        </p>
      </Reveal>
    </section>
  );
}
