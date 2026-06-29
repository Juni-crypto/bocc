/**
 * Join-link helpers. The host renders a QR encoding a bocc:// deep link; the
 * scanner accepts that deep link, an https web link, or a bare slug and pulls
 * the event slug back out.
 */

/** The deep link a host QR encodes, e.g. bocc://e/aisha-dev-sangeet. */
export function joinDeepLink(slug: string): string {
  return `bocc://e/${slug}`;
}

/** Human-readable share target shown under the QR. */
export function joinShareUrl(slug: string): string {
  return `bocc.app/e/${slug}`;
}

/**
 * Parse a scanned value into an event slug. Accepts:
 *   - bocc://e/<slug>
 *   - https://.../e/<slug>  (any host, optional query/hash)
 *   - a bare <slug>
 * Returns null if nothing slug-shaped is found.
 */
export function parseEventSlug(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  // Match ".../e/<slug>" in deep links and web URLs.
  const match = value.match(/(?:^|\/)e\/([^/?#\s]+)/i);
  if (match?.[1]) return decodeURIComponent(match[1]);

  // Bare slug: letters, numbers, dashes only (no scheme, no slashes).
  if (/^[a-z0-9][a-z0-9-]*$/i.test(value)) return value;

  return null;
}
