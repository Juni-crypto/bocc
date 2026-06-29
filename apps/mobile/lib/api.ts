/**
 * BOCC typed API client.
 *
 * If a shared package "@bocc/shared" ever exists, prefer importing its types.
 * For now this file is the single source of truth for the mobile client and
 * mirrors apps/api (NestJS BFF) at base http://localhost:4000/api.
 *
 * Base URL comes from EXPO_PUBLIC_API_URL (default http://localhost:4000/api).
 */

export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ??
  'http://localhost:4000/api';

// ---- enums (mirror prisma schema) -----------------------------------------

export type EventType =
  | 'WEDDING'
  | 'BIRTHDAY'
  | 'CORPORATE'
  | 'SPORTS'
  | 'CONCERT'
  | 'TRAVEL'
  | 'OTHER';

export type EventStatus = 'DRAFT' | 'LIVE' | 'ENDED';
export type Visibility = 'PRIVATE' | 'UNLISTED' | 'PUBLIC';
export type UploadWindow = 'DURING_EVENT' | 'DAYS_AFTER' | 'ALWAYS';
export type DownloadPolicy = 'EVERYONE' | 'HOST_ONLY' | 'DISABLED';
export type MemberRole = 'HOST' | 'GUEST';
export type PhotoStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// ---- auth ------------------------------------------------------------------

export type UserRole = 'USER' | 'ADMIN';

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

/** localStorage / SecureStore key shared with apps/web (bocc_auth). */
export const AUTH_STORAGE_KEY = 'bocc_auth';

// ---- payloads --------------------------------------------------------------

export interface CreateEventInput {
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

export type UpdateEventInput = Partial<CreateEventInput> & {
  status?: EventStatus;
};

export interface JoinInput {
  name?: string;
  phone?: string;
  consentFaceMatch?: boolean;
}

export interface UploadMeta {
  memberId: string;
  takenAt?: string;
  lat?: number;
  lng?: number;
  isVideo?: boolean;
}

// ---- responses -------------------------------------------------------------

export interface BoccEvent {
  id: string;
  slug: string;
  name: string;
  type: EventType;
  status: EventStatus;
  venue?: string | null;
  startsAt?: string | null;
  coverUrl?: string | null;

  perGuestCap: number;
  allowVideo: boolean;
  maxVideoSec: number;
  geoEnabled: boolean;
  geofenceEnabled: boolean;
  geofenceRadiusM?: number | null;
  mapView: boolean;

  faceMatching: boolean;
  autoHighlights: boolean;
  semanticSearch: boolean;
  autoModeration: boolean;

  visibility: Visibility;
  requireName: boolean;
  requireSelfie: boolean;
  hostApproval: boolean;
  uploadToUnlock: boolean;
  downloadPolicy: DownloadPolicy;
  moderationQueue: boolean;

  joinUrl?: string;
  hostUserId?: string;
  photoCount?: number;
  crew?: number;
}

export interface PersonRef {
  id: string;
  name?: string | null;
  thumbUrl?: string;
}

export interface EventPerson {
  id: string;
  name?: string | null;
  thumbUrl: string;
  photoCount: number;
}

export interface GuestEventPhotos {
  event: BoccEvent;
  memberName: string;
  photos: Photo[];
}

export interface GuestLookup {
  phone: string;
  events: GuestEventPhotos[];
}

export interface Member {
  id: string;
  eventId: string;
  name: string;
  role: MemberRole;
  consentFaceMatch: boolean;
  immichPersonId?: string | null;
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
  /** Absolute URL served by our backend (proxies Immich). Load directly. */
  thumbUrl: string;
  originalUrl?: string;
  uploaderName?: string | null;
  people?: PersonRef[];
}

export interface GalleryResult {
  photos: Photo[];
  nextCursor: string | null;
}

export interface EventStats {
  crew: number;
  photos: number;
  pending: number;
  faces: number;
}

export interface ModerationResult {
  pending: number;
  photos: Photo[];
}

export interface UploadResult {
  uploaded: number;
  photos: Photo[];
}

export interface FaceMatch {
  personId: string;
  score?: number;
  name?: string | null;
}

export type FindMeResult =
  | { status: 'ok'; match: FaceMatch | null; count: number; photos: Photo[] }
  | { status: 'no_match'; note: string; photos: Photo[] }
  | {
      status: 'not_implemented';
      note: string;
      memberId: string;
      eventId: string;
    };

/** A picked local file ready for multipart upload. */
export interface LocalFile {
  uri: string;
  name?: string;
  type?: string;
}

// ---- http core -------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Build a Bearer Authorization header from a token (omit when absent). */
function authHeader(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      (data as { message?: string | string[] })?.message != null
        ? String((data as { message: string | string[] }).message)
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * The backend returns photo.thumbUrl as an absolute URL, so clients load it
 * directly. This helper stays defensive: it passes absolute URLs through and
 * absolutizes a relative path against the API origin if one ever appears.
 */
export function thumbSrc(thumbUrl?: string | null): string | undefined {
  if (!thumbUrl) return undefined;
  if (/^https?:\/\//.test(thumbUrl)) return thumbUrl;
  const origin = API_BASE.replace(/\/api$/, '');
  return `${origin}${thumbUrl}`;
}

// ---- endpoints -------------------------------------------------------------

export const api = {
  // auth (token-free; they mint the token)
  signup: (body: { email: string; password: string; name: string }) =>
    request<AuthResult>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<AuthResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  me: (token: string) =>
    request<AuthUser>('/auth/me', { headers: authHeader(token) }),

  // host: create & manage (Bearer required; 401 without)
  createEvent: (input: CreateEventInput, token?: string) =>
    request<BoccEvent>('/events', {
      method: 'POST',
      body: JSON.stringify(input),
      headers: authHeader(token),
    }),

  getEvent: (idOrSlug: string) =>
    request<BoccEvent>(`/events/${encodeURIComponent(idOrSlug)}`),

  updateEvent: (id: string, input: UpdateEventInput, token?: string) =>
    request<BoccEvent>(`/events/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
      headers: authHeader(token),
    }),

  goLive: (id: string, token?: string) =>
    request<BoccEvent>(`/events/${encodeURIComponent(id)}/go-live`, {
      method: 'POST',
      headers: authHeader(token),
    }),

  endEvent: (id: string, token?: string) =>
    request<BoccEvent>(`/events/${encodeURIComponent(id)}/end`, {
      method: 'POST',
      headers: authHeader(token),
    }),

  deletePhoto: (eventId: string, photoId: string, token?: string) =>
    request<{ deleted: boolean; id: string }>(
      `/events/${encodeURIComponent(eventId)}/photos/${encodeURIComponent(photoId)}`,
      { method: 'DELETE', headers: authHeader(token) },
    ),

  people: (idOrSlug: string) =>
    request<{ people: EventPerson[] }>(
      `/events/${encodeURIComponent(idOrSlug)}/people`,
    ),

  personPhotos: (idOrSlug: string, personId: string) =>
    request<{ personId: string; count: number; photos: Photo[] }>(
      `/events/${encodeURIComponent(idOrSlug)}/people/${encodeURIComponent(
        personId,
      )}/photos`,
    ),

  guestLookup: (phone: string) =>
    request<GuestLookup>(
      `/events/guest/lookup?phone=${encodeURIComponent(phone)}`,
    ),

  stats: (id: string, token?: string) =>
    request<EventStats>(`/events/${encodeURIComponent(id)}/stats`, {
      headers: authHeader(token),
    }),

  moderation: (id: string, token?: string) =>
    request<ModerationResult>(`/events/${encodeURIComponent(id)}/moderation`, {
      headers: authHeader(token),
    }),

  moderate: (
    id: string,
    photoId: string,
    decision: 'approve' | 'reject',
    token?: string,
  ) =>
    request<Photo>(
      `/events/${encodeURIComponent(id)}/moderation/${encodeURIComponent(
        photoId,
      )}/${decision}`,
      { method: 'POST', headers: authHeader(token) },
    ),

  // guest
  join: (idOrSlug: string, input: JoinInput) =>
    request<JoinResult>(`/events/${encodeURIComponent(idOrSlug)}/join`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  gallery: (idOrSlug: string, opts?: { take?: number; cursor?: string }) => {
    const q = new URLSearchParams();
    if (opts?.take) q.set('take', String(opts.take));
    if (opts?.cursor) q.set('cursor', opts.cursor);
    const qs = q.toString();
    return request<GalleryResult>(
      `/events/${encodeURIComponent(idOrSlug)}/gallery${qs ? `?${qs}` : ''}`,
    );
  },

  search: (idOrSlug: string, q: string) =>
    request<{ query: string; count?: number; photos: Photo[]; note?: string }>(
      `/events/${encodeURIComponent(idOrSlug)}/search?q=${encodeURIComponent(q)}`,
    ),

  uploadPhotos: (idOrSlug: string, files: LocalFile[], meta: UploadMeta) => {
    const form = new FormData();
    files.forEach((f, i) => {
      form.append('files', {
        uri: f.uri,
        name: f.name ?? `photo-${i}.jpg`,
        type: f.type ?? 'image/jpeg',
        // RN FormData file shape; cast for TS DOM lib.
      } as unknown as Blob);
    });
    form.append('memberId', meta.memberId);
    if (meta.takenAt) form.append('takenAt', meta.takenAt);
    if (meta.lat != null) form.append('lat', String(meta.lat));
    if (meta.lng != null) form.append('lng', String(meta.lng));
    if (meta.isVideo != null) form.append('isVideo', String(meta.isVideo));

    return request<UploadResult>(
      `/events/${encodeURIComponent(idOrSlug)}/photos`,
      { method: 'POST', body: form },
    );
  },

  findMe: (idOrSlug: string, selfie: LocalFile, memberId: string) => {
    const form = new FormData();
    form.append('selfie', {
      uri: selfie.uri,
      name: selfie.name ?? 'selfie.jpg',
      type: selfie.type ?? 'image/jpeg',
    } as unknown as Blob);
    form.append('memberId', memberId);
    return request<FindMeResult>(
      `/events/${encodeURIComponent(idOrSlug)}/find-me`,
      { method: 'POST', body: form },
    );
  },
};
