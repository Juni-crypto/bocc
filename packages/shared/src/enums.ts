// String-literal union types mirroring the Prisma enums in apps/api/prisma/schema.prisma.
// These are the single source of truth shared by the web and mobile apps.

export type EventStatus = 'DRAFT' | 'LIVE' | 'ENDED';

export type EventType =
  | 'WEDDING'
  | 'BIRTHDAY'
  | 'CORPORATE'
  | 'SPORTS'
  | 'CONCERT'
  | 'TRAVEL'
  | 'OTHER';

export type Visibility = 'PRIVATE' | 'UNLISTED' | 'PUBLIC';

export type UploadWindow = 'DURING_EVENT' | 'DAYS_AFTER' | 'ALWAYS';

export type DownloadPolicy = 'EVERYONE' | 'HOST_ONLY' | 'DISABLED';

export type MemberRole = 'HOST' | 'GUEST';

export type PhotoStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// Runtime-usable lists (handy for dropdowns / validation). Kept in sync with the unions above.
export const EVENT_STATUSES = ['DRAFT', 'LIVE', 'ENDED'] as const;

export const EVENT_TYPES = [
  'WEDDING',
  'BIRTHDAY',
  'CORPORATE',
  'SPORTS',
  'CONCERT',
  'TRAVEL',
  'OTHER',
] as const;

export const VISIBILITIES = ['PRIVATE', 'UNLISTED', 'PUBLIC'] as const;

export const UPLOAD_WINDOWS = ['DURING_EVENT', 'DAYS_AFTER', 'ALWAYS'] as const;

export const DOWNLOAD_POLICIES = ['EVERYONE', 'HOST_ONLY', 'DISABLED'] as const;

export const MEMBER_ROLES = ['HOST', 'GUEST'] as const;

export const PHOTO_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
