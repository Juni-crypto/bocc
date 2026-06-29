/**
 * Join-link helpers. The host QR encodes the WEB join URL so any phone camera
 * can open it (guests do not need the app installed). The in-app scanner still
 * accepts that web link, a bocc:// deep link, or a bare slug.
 */

const WEB_BASE = (
  process.env.EXPO_PUBLIC_WEB_URL ?? 'https://bocc-crew.netlify.app'
).replace(/\/$/, '');

/** Full web join URL the host QR encodes, e.g. https://bocc-crew.netlify.app/e/<slug>. */
export function joinWebUrl(slug: string): string {
  return `${WEB_BASE}/e/${slug}`;
}

/** Human-readable share target shown under the QR (no scheme). */
export function joinShareUrl(slug: string): string {
  return joinWebUrl(slug).replace(/^https?:\/\//, '');
}

/** App deep link (kept for app-to-app use). */
export function joinDeepLink(slug: string): string {
  return `bocc://e/${slug}`;
}

/**
 * Parse a scanned value into an event slug. Accepts:
 *   - https://.../e/<slug>  (any host, optional query/hash)
 *   - bocc://e/<slug>
 *   - a bare <slug>
 * Returns null if nothing slug-shaped is found.
 */
export function parseEventSlug(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  const match = value.match(/(?:^|\/)e\/([^/?#\s]+)/i);
  if (match?.[1]) return decodeURIComponent(match[1]);

  if (/^[a-z0-9][a-z0-9-]*$/i.test(value)) return value;

  return null;
}
