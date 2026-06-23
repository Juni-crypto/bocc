// Public type contract for BOCC. Mirrors the Prisma models in apps/api/prisma/schema.prisma
// and the response shapes produced by apps/api/src/events/events.service.ts.
//
// Note on dates: these types describe the JSON wire format. Prisma DateTime fields are
// serialized to ISO-8601 strings by NestJS, so they are typed as `string` here.

import type {
  DownloadPolicy,
  EventStatus,
  EventType,
  MemberRole,
  PhotoStatus,
  UploadWindow,
  Visibility,
} from './enums.js';

// ---- core models -----------------------------------------------------------

/** An event. 1:1 with an Immich album. Mirrors the Prisma `Event` model. */
export interface Event {
  id: string;
  name: string;
  type: EventType;
  status: EventStatus;
  coverUrl: string | null;
  venue: string | null;
  startsAt: string | null;

  // join
  slug: string;
  joinCode: string | null;

  // Immich linkage
  immichAlbumId: string | null;

  // capture rules
  perGuestCap: number;
  totalCap: number | null;
  allowVideo: boolean;
  maxVideoSec: number;
  liveCaptureOnly: boolean;
  uploadWindow: UploadWindow;
  uploadDaysAfter: number;

  // location / geo
  geoEnabled: boolean;
  geofenceEnabled: boolean;
  geofenceLat: number | null;
  geofenceLng: number | null;
  geofenceRadiusM: number;
  mapView: boolean;

  // AI
  faceMatching: boolean;
  autoHighlights: boolean;
  semanticSearch: boolean;
  autoModeration: boolean;

  // access / privacy
  visibility: Visibility;
  requireName: boolean;
  requireSelfie: boolean;
  hostApproval: boolean;
  uploadToUnlock: boolean;
  downloadPolicy: DownloadPolicy;
  watermark: boolean;
  moderationQueue: boolean;

  // lifecycle
  expiryDays: number | null;
  createdAt: string;
  updatedAt: string;
}

/** An event member (host or guest). Mirrors the Prisma `Member` model. */
export interface Member {
  id: string;
  eventId: string;
  name: string;
  role: MemberRole;

  // consent (biometric / face matching) - GDPR / BIPA
  consentFaceMatch: boolean;
  consentAt: string | null;

  // resolved face cluster in Immich (after selfie match)
  immichPersonId: string | null;

  createdAt: string;
}

/** A photo or video record. Mirrors the Prisma `Photo` model. */
export interface Photo {
  id: string;
  eventId: string;
  memberId: string | null;
  immichAssetId: string;
  status: PhotoStatus;
  isVideo: boolean;
  takenAt: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: string;
}

// ---- derived response shapes -----------------------------------------------

/** An event enriched with its shareable join URL (service `withJoinUrl`). */
export interface EventWithJoinUrl extends Event {
  joinUrl: string;
}

/** Trimmed, gallery-safe view of a photo (service `publicPhoto`). */
export interface PublicPhoto {
  id: string;
  assetId: string;
  isVideo: boolean;
  takenAt: string | null;
  lat: number | null;
  lng: number | null;
  thumbUrl: string;
}

/** Aggregate counters for an event (service `stats`). */
export interface Stats {
  crew: number;
  photos: number;
  pending: number;
  faces: number;
}

// ---- request inputs --------------------------------------------------------

/** Body for POST /events. Mirrors `CreateEventDto`. */
export interface CreateEventInput {
  name: string;
  type?: EventType;
  venue?: string;
  startsAt?: string;
  coverUrl?: string;

  // capture rules
  perGuestCap?: number;
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

/** Body for PATCH /events/:id. Mirrors `UpdateEventDto` (partial create plus status). */
export interface UpdateEventInput extends Partial<CreateEventInput> {
  status?: EventStatus;
}

/** Body for POST /events/:idOrSlug/join. Mirrors `JoinEventDto`. */
export interface JoinInput {
  name?: string;
  consentFaceMatch?: boolean;
}

/** Multipart fields that ride alongside uploaded file(s). Mirrors `UploadPhotoDto`. */
export interface UploadMeta {
  memberId: string;
  takenAt?: string;
  lat?: number;
  lng?: number;
  isVideo?: boolean;
}

// ---- response payloads -----------------------------------------------------

/** Result of POST /events/:idOrSlug/join (service `join`). */
export interface JoinResult {
  member: Member;
  event: EventWithJoinUrl;
}

/** Result of POST /events/:idOrSlug/photos (service `uploadPhotos`). */
export interface UploadResult {
  uploaded: number;
  photos: Photo[];
}

/** A page of gallery photos (service `gallery`). */
export interface GalleryPage {
  photos: PublicPhoto[];
  nextCursor: string | null;
}

/** The moderation queue for an event (service `moderationQueue`). */
export interface ModerationQueue {
  pending: number;
  photos: PublicPhoto[];
}

/** Possible match returned by selfie ranking. Shape is intentionally open
 *  while the Immich spike (Path A vs Path B) is pending. */
export interface FindMeMatch {
  [key: string]: unknown;
}

/** Selfie-match succeeded: photos resolved for the member (service `findMe`). */
export interface FindMeOk {
  status: 'ok';
  match: FindMeMatch | null;
  photos: PublicPhoto[];
}

/** Selfie ranking is not yet wired up (service `findMe`). */
export interface FindMeNotImplemented {
  status: 'not_implemented';
  note: string;
  memberId: string;
  eventId: string;
}

/** Discriminated union for POST /events/:idOrSlug/find-me. */
export type FindMeResult = FindMeOk | FindMeNotImplemented;
