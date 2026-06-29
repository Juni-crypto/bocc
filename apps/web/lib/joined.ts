// Events a guest has joined, kept in localStorage so the "My events" page can
// list them across visits without an account. Mirrors the mobile app's local
// "joined events" list. SSR-safe: every read/write guards `typeof window`.

const KEY = "bocc_joined_events";

export interface JoinedEvent {
  slug: string;
  name: string;
  /** ISO timestamp of when the guest joined. */
  joinedAt: string;
}

/** Read the joined events, newest first. Returns [] on the server or on error. */
export function getJoinedEvents(): JoinedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is JoinedEvent =>
        !!e &&
        typeof e === "object" &&
        typeof (e as JoinedEvent).slug === "string",
    );
  } catch {
    return [];
  }
}

/**
 * Record a joined event. Dedupes by slug (an existing entry is replaced) and
 * keeps the list newest first. No-op on the server or if storage is unavailable.
 */
export function addJoinedEvent({
  slug,
  name,
}: {
  slug: string;
  name: string;
}): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getJoinedEvents().filter((e) => e.slug !== slug);
    const next: JoinedEvent[] = [
      { slug, name, joinedAt: new Date().toISOString() },
      ...existing,
    ];
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}
