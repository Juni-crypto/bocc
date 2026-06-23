"use client";

/** Lime pill toggle, mirrors the `.tg`/`.tg.on` control in the mockup. */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange?.(!checked)}
      className="relative grid shrink-0 cursor-pointer place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
      style={{ width: 46, minHeight: 44 }}
    >
      <span
        className="relative block rounded-full transition-colors"
        style={{
          width: 46,
          height: 26,
          background: checked ? "var(--color-lime)" : "rgba(255,255,255,0.12)",
          transitionDuration: "0.3s",
          transitionTimingFunction: "var(--ease)",
        }}
      >
        <span
          className="absolute rounded-full"
          style={{
            top: 3,
            left: 3,
            width: 20,
            height: 20,
            background: checked ? "#050505" : "#fff",
            transform: checked ? "translateX(20px)" : "translateX(0)",
            transition: "transform 0.3s var(--ease)",
          }}
        />
      </span>
    </button>
  );
}

/** A labelled row wrapping a Toggle, the repeated pattern in the create wizard. */
export function ToggleRow({
  title,
  hint,
  checked,
  onChange,
}: {
  title: string;
  hint?: string;
  checked: boolean;
  onChange?: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm">{title}</p>
        {hint && <p className="text-xs text-white/55">{hint}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}
