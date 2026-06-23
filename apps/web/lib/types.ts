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
}

export interface EventStats {
  crew: number;
  photos: number;
  pending: number;
  faces: number;
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

export interface Photo {
  id: string;
  assetId: string;
  isVideo: boolean;
  takenAt?: string | null;
  lat?: number | null;
  lng?: number | null;
  thumbUrl: string;
  originalUrl?: string;
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
