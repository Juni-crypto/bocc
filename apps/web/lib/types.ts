// Shared API contract types for the BOCC web app.
//
// If packages/shared (`@bocc/shared`) ever ships these, prefer importing from
// there. For now they mirror the NestJS BFF DTOs in apps/api.

export type EventType =
  | "WEDDING"
  | "BIRTHDAY"
  | "CORPORATE"
  | "SPORTS"
  | "CONCERT"
  | "TRAVEL"
  | "OTHER";

export type EventStatus = "DRAFT" | "LIVE" | "ENDED";
export type Visibility = "PRIVATE" | "UNLISTED" | "PUBLIC";
export type UploadWindow = "DURING_EVENT" | "DAYS_AFTER" | "ALWAYS";
export type DownloadPolicy = "EVERYONE" | "HOST_ONLY" | "DISABLED";
export type MemberRole = "HOST" | "GUEST";
export type PhotoStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface CreateEventDto {
  name: string;
  type?: EventType;
  venue?: string;
  startsAt?: string;
  coverUrl?: string;

  // capture rules
  perGuestCap?: number; // 0 = unlimited
  totalCap?: number;
  allowVideo?: boolean;
  maxVideoSec?: number;
  liveCaptureOnly?: boolean;
  uploadWindow?: UploadWindow;
  uploadDaysAfter?: number;

  // location / geo
  geoEnabled?: boolean;
  geofenceEnabled?: boolean;
  geofenceLat?: number;
  geofenceLng?: number;
  geofenceRadiusM?: number;
  mapView?: boolean;

  // AI
  faceMatching?: boolean;
  autoHighlights?: boolean;
  semanticSearch?: boolean;
  autoModeration?: boolean;

  // access / privacy
  visibility?: Visibility;
  requireName?: boolean;
  requireSelfie?: boolean;
  hostApproval?: boolean;
  uploadToUnlock?: boolean;
  downloadPolicy?: DownloadPolicy;
  watermark?: boolean;
  moderationQueue?: boolean;

  // lifecycle
  expiryDays?: number;
}

export interface BoccEvent extends CreateEventDto {
  id: string;
  slug: string;
  status: EventStatus;
  immichAlbumId?: string | null;
  joinUrl: string;
  createdAt?: string;
  hostUserId?: string;
  photoCount?: number;
  crew?: number;
}

/** One returning-guest record: an event they joined + their pics there. */
export interface GuestEventPhotos {
  event: BoccEvent;
  memberName: string;
  photos: Photo[];
}

export interface GuestLookup {
  phone: string;
  events: GuestEventPhotos[];
}

export interface EventStats {
  crew: number;
  photos: number;
  pending: number;
  faces: number;
  storageBytes: number;
}

// ---- auth ----

export type UserRole = "USER" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: string;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

/** An event owned by the signed-in host (GET /events/mine), with inline stats. */
export interface MineEvent extends BoccEvent {
  stats: EventStats;
}

// ---- admin ----

export interface AdminOverview {
  totals: {
    users: number;
    events: number;
    photos: number;
    pendingPhotos: number;
    members: number;
    faces: number;
    storageBytes: number;
  };
  eventsByStatus: {
    DRAFT: number;
    LIVE: number;
    ENDED: number;
  };
  recentEvents: AdminEvent[];
}

export interface AdminEvent {
  id: string;
  name: string;
  slug: string;
  type?: EventType;
  status: EventStatus;
  visibility: Visibility;
  createdAt?: string;
  startsAt?: string;
  host: { id: string; email: string; name: string } | null;
  photos: number;
  crew: number;
  storageBytes: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: string;
  events: number;
}

export interface Member {
  id: string;
  eventId: string;
  name: string;
  role: MemberRole;
  consentFaceMatch: boolean;
}

export interface JoinResult {
  member: Member;
  event: BoccEvent;
}

export interface PersonRef {
  id: string;
  name?: string | null;
  thumbUrl?: string;
}

export interface Photo {
  id: string;
  assetId: string;
  isVideo: boolean;
  takenAt?: string | null;
  lat?: number | null;
  lng?: number | null;
  thumbUrl: string;
  originalUrl?: string;
  /** Display name of the guest who uploaded this shot (when known). */
  uploaderName?: string | null;
  /** Faces detected in this photo (populated as Immich finishes processing). */
  people?: PersonRef[];
}

export interface EventPerson {
  id: string;
  name?: string | null;
  thumbUrl: string;
  photoCount: number;
}

export interface GalleryPage {
  photos: Photo[];
  nextCursor: string | null;
}

export interface ModerationQueue {
  pending: number;
  photos: Photo[];
}

export interface FindMeResult {
  status: "ok" | "no_match" | "not_implemented" | string;
  match?: unknown;
  count?: number;
  photos?: Photo[];
  note?: string;
}
