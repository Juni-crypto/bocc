import type { ReactNode } from "react";

/**
 * Viewfinder corner brackets. Wraps arbitrary content with the lime top-left and
 * bottom-right brackets from the mockup (the `.vf` motif), for cases that are not
 * already a Bezel.
 */
export function Viewfinder({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`vf ${className}`}>{children}</div>;
}
