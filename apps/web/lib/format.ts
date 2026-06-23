// Small presentation helpers shared across host + admin surfaces.

/**
 * Human-readable byte size, e.g. 187392 -> "183 KB", 1258291 -> "1.2 MB".
 * Uses binary units (1024) and trims trailing ".0".
 */
export function formatBytes(n: number | null | undefined): string {
  const bytes = typeof n === "number" && Number.isFinite(n) ? Math.max(0, n) : 0;
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB", "PB"] as const;
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  // Whole numbers and KB show no decimal; larger units keep one.
  const rounded = unit === 0 || value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${label} ${units[unit]}`;
}
