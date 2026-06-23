"use client";

/** Segmented pill control, mirrors `.seg` from the mockup. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange?: (next: T) => void;
  /** Accessible group label (associates the visual label with the control). */
  label?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange?.(opt.value)}
            className={`min-h-[40px] flex-1 rounded-full px-2.5 py-2 text-[13px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${
              active
                ? "bg-lime font-semibold text-ink focus-visible:ring-white/80"
                : "text-white/60 hover:text-white focus-visible:ring-lime"
            }`}
            style={{ transitionTimingFunction: "var(--ease)" }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
