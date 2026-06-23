import { customAlphabet } from 'nanoid';

// readable-ish, no ambiguous chars (no 0/O/1/l/I)
const nano = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 6);

/** "Aisha & Dev, Sangeet" -> "aisha-dev-sangeet-7gk2pq" */
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 32)
    .replace(/^-|-$/g, '');
  return `${base || 'event'}-${nano()}`;
}
