"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "lime" | "ghost";

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Render the nested "button-in-button" arrow puck. */
  arrow?: ReactNode | boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

/**
 * Pill button with an optional nested "button-in-button" arrow puck, matching
 * the magnetic CTA in the mockup.
 */
export function PillButton({
  variant = "lime",
  arrow,
  fullWidth = false,
  className = "",
  children,
  ...rest
}: PillButtonProps) {
  const hasArrow = arrow !== undefined && arrow !== false;
  const arrowNode = arrow === true ? "↗" : arrow;

  const base =
    variant === "lime"
      ? "bg-lime text-ink font-semibold focus-visible:ring-white/80 disabled:opacity-60"
      : "bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] text-white/90 focus-visible:ring-lime disabled:opacity-60";

  const pad = hasArrow ? "pl-6 pr-2 py-2" : "px-6 py-3.5";

  return (
    <button
      {...rest}
      className={`cta group flex min-h-[44px] items-center justify-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${base} ${pad} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
    >
      {children}
      {hasArrow && (
        <span
          aria-hidden="true"
          className="ico grid h-9 w-9 place-items-center rounded-full bg-ink/10 text-lg"
        >
          {arrowNode}
        </span>
      )}
    </button>
  );
}
