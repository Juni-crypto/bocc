// Per-event guest identity, kept in localStorage so a browser guest can upload
// and run find-me across visits without re-joining each time.

const KEY = (slug: string) => `bocc:member:${slug}`;

export interface StoredMember {
  id: string;
  name: string;
  consentFaceMatch: boolean;
}

export function getMember(slug: string): StoredMember | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY(slug));
    return raw ? (JSON.parse(raw) as StoredMember) : null;
  } catch {
    return null;
  }
}

export function setMember(slug: string, member: StoredMember): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY(slug), JSON.stringify(member));
  } catch {
    /* storage unavailable */
  }
}
