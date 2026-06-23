"use client";

import { useId } from "react";

/**
 * Track-and-knob slider, mirrors `.track`/`.fill`/`.knob` from the mockup.
 *
 * Supports a discrete `steps` array (e.g. the per-guest cap 5/10/15/20/30/inf)
 * or a plain continuous min/max range (e.g. the geofence radius). A native range
 * input sits transparently on top for real interaction + accessibility.
 */
export function Slider({
  steps,
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  ticks,
  label,
}: {
  /** Discrete option values; when set, the slider snaps to these. */
  steps?: number[];
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange?: (next: number) => void;
  /** Tick labels shown under the track. */
  ticks?: string[];
  label?: string;
}) {
  const id = useId();
  const discrete = steps && steps.length > 1;

  // Map value -> 0..1 position.
  let pct: number;
  if (discrete) {
    const idx = Math.max(0, steps.indexOf(value));
    pct = (idx / (steps.length - 1)) * 100;
  } else {
    pct = ((value - min) / (max - min)) * 100;
  }

  const handle = (raw: number) => {
    if (discrete) {
      onChange?.(steps[Math.round(raw)]);
    } else {
      onChange?.(raw);
    }
  };

  return (
    <div>
      <div className="track">
        <input
          id={id}
          aria-label={label}
          aria-valuetext={ticks ? ticks[Math.max(0, (steps ?? []).indexOf(value))] : undefined}
          type="range"
          min={discrete ? 0 : min}
          max={discrete ? steps!.length - 1 : max}
          step={discrete ? 1 : step}
          value={discrete ? Math.max(0, steps!.indexOf(value)) : value}
          onChange={(e) => handle(Number(e.target.value))}
          className="peer absolute inset-x-0 top-1/2 z-10 h-11 w-full -translate-y-1/2 cursor-pointer opacity-0"
        />
        <div className="fill" style={{ width: `${pct}%` }} />
        <div
          className="knob rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-lime peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-ink"
          style={{ left: `${pct}%` }}
        />
      </div>
      {ticks && (
        <div className="mt-2 flex justify-between text-[11px] text-white/55">
          {ticks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
