/**
 * The blinking REC dot. Coral is the ONLY place the recording semantic colour
 * is used; pass `tone="lime"` for the neutral "auto-updating" pulse.
 */
export function RecDot({
  tone = "coral",
  size = 6,
  className = "",
}: {
  tone?: "coral" | "lime" | "ink";
  size?: number;
  className?: string;
}) {
  const bg =
    tone === "coral"
      ? "var(--color-coral)"
      : tone === "lime"
        ? "var(--color-lime)"
        : "var(--color-ink)";
  return (
    <span
      className={`rec inline-block rounded-full ${className}`}
      style={{ width: size, height: size, background: bg }}
    />
  );
}

/** Lime puck logo with a blinking ink dot - the BOCC mark. */
export function RecLogo({ size = 28 }: { size?: number }) {
  return (
    <div
      className="rounded-full bg-lime grid place-items-center"
      style={{ width: size, height: size }}
    >
      <RecDot tone="ink" size={Math.round(size * 0.36)} />
    </div>
  );
}
