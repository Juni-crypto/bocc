// Typed client for the BOCC backend-for-frontend (NestJS).
//
// Base URL comes from NEXT_PUBLIC_API_URL, defaulting to the local BFF. The
// frontend never talks to Immich directly - everything is proxied here.

import type {
  AdminEvent,
  AdminOverview,
  AdminUser,
  AuthResult,
  AuthUser,
  BoccEvent,
  CreateEventDto,
  EventPerson,
  EventStats,
  FindMeResult,
  GalleryPage,
  GuestLookup,
  JoinResult,
  MineEvent,
  ModerationQueue,
  Photo,
  UserRole,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000/api";

const AUTH_STORAGE_KEY = "bocc_auth";

/** Read the persisted bearer token from localStorage (browser only). */
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed?.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Build an Authorization header. Pass a token explicitly (server components,
 * tests) or omit it to read the stored token in the browser.
 */
function authHeader(token?: string): Record<string, string> {
  const t = token ?? getStoredToken();
  return t ? { authorization: `Bearer ${t}` } : {};
}

export { AUTH_STORAGE_KEY };

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, headers, ...rest } = init ?? {};
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "content-type": "application/json" } : {}),
      ...(headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.message) {
        message = Array.isArray(body.message)
          ? body.message.join(", ")
          : body.message;
      }
    } catch {
      /* non-JSON error body, keep status text */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  // ---- auth (token-free; they mint the token) ----
  signup: (body: { email: string; password: string; name: string }) =>
    request<AuthResult>("/auth/signup", { method: "POST", json: body }),

  login: (body: { email: string; password: string }) =>
    request<AuthResult>("/auth/login", { method: "POST", json: body }),

  me: (token?: string) =>
    request<AuthUser>("/auth/me", { headers: authHeader(token) }),

  // ---- host: create & manage (Bearer required) ----
  createEvent: (dto: CreateEventDto, token?: string) =>
    request<BoccEvent>("/events", {
      method: "POST",
      json: dto,
      headers: authHeader(token),
    }),

  // Public read of a single event (guest gallery + SSR headers). No token.
  getEvent: (idOrSlug: string) =>
    request<BoccEvent>(`/events/${encodeURIComponent(idOrSlug)}`),

  listMine: (token?: string) =>
    request<MineEvent[]>("/events/mine", { headers: authHeader(token) }),

  updateEvent: (id: string, dto: Partial<CreateEventDto>, token?: string) =>
    request<BoccEvent>(`/events/${encodeURIComponent(id)}`, {
      method: "PATCH",
      json: dto,
      headers: authHeader(token),
    }),

  goLive: (id: string, token?: string) =>
    request<BoccEvent>(`/events/${encodeURIComponent(id)}/go-live`, {
      method: "POST",
      headers: authHeader(token),
    }),

  endEvent: (id: string, token?: string) =>
    request<BoccEvent>(`/events/${encodeURIComponent(id)}/end`, {
      method: "POST",
      headers: authHeader(token),
    }),

  // host (owner) or admin removes one photo
  deletePhoto: (eventId: string, photoId: string, token?: string) =>
    request<{ deleted: boolean; id: string }>(
      `/events/${encodeURIComponent(eventId)}/photos/${encodeURIComponent(photoId)}`,
      { method: "DELETE", headers: authHeader(token) },
    ),

  // detected faces across the event (public)
  people: (idOrSlug: string) =>
    request<{ people: EventPerson[] }>(
      `/events/${encodeURIComponent(idOrSlug)}/people`,
    ),

  // returning-guest self service: events joined + their pics, keyed by phone
  guestLookup: (phone: string) =>
    request<GuestLookup>(
      `/events/guest/lookup?phone=${encodeURIComponent(phone)}`,
    ),

  stats: (id: string, token?: string) =>
    request<EventStats>(`/events/${encodeURIComponent(id)}/stats`, {
      headers: authHeader(token),
    }),

  moderation: (id: string, token?: string) =>
    request<ModerationQueue>(`/events/${encodeURIComponent(id)}/moderation`, {
      headers: authHeader(token),
    }),

  moderate: (
    id: string,
    photoId: string,
    decision: "approve" | "reject",
    token?: string,
  ) =>
    request<unknown>(
      `/events/${encodeURIComponent(id)}/moderation/${encodeURIComponent(
        photoId,
      )}/${decision}`,
      { method: "POST", headers: authHeader(token) },
    ),

  // ---- admin (Bearer + role ADMIN) ----
  admin: {
    overview: (token?: string) =>
      request<AdminOverview>("/admin/overview", { headers: authHeader(token) }),

    events: (token?: string) =>
      request<AdminEvent[]>("/admin/events", { headers: authHeader(token) }),

    eventDetail: (id: string, token?: string) =>
      request<AdminEvent>(`/admin/events/${encodeURIComponent(id)}`, {
        headers: authHeader(token),
      }),

    updateEvent: (id: string, dto: Partial<BoccEvent>, token?: string) =>
      request<AdminEvent>(`/admin/events/${encodeURIComponent(id)}`, {
        method: "PATCH",
        json: dto,
        headers: authHeader(token),
      }),

    deleteEvent: (id: string, token?: string) =>
      request<unknown>(`/admin/events/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: authHeader(token),
      }),

    users: (token?: string) =>
      request<AdminUser[]>("/admin/users", { headers: authHeader(token) }),

    createUser: (
      dto: { email: string; name: string; password: string; role?: UserRole },
      token?: string,
    ) =>
      request<AdminUser>("/admin/users", {
        method: "POST",
        json: dto,
        headers: authHeader(token),
      }),

    deleteUser: (id: string, token?: string) =>
      request<{ deleted: boolean; id: string }>(
        `/admin/users/${encodeURIComponent(id)}`,
        { method: "DELETE", headers: authHeader(token) },
      ),

    setRole: (id: string, role: UserRole, token?: string) =>
      request<AdminUser>(`/admin/users/${encodeURIComponent(id)}/role`, {
        method: "PATCH",
        json: { role },
        headers: authHeader(token),
      }),
  },

  // ---- guests ----
  join: (
    idOrSlug: string,
    body: { name?: string; phone?: string; consentFaceMatch?: boolean },
  ) =>
    request<JoinResult>(`/events/${encodeURIComponent(idOrSlug)}/join`, {
      method: "POST",
      json: body,
    }),

  gallery: (idOrSlug: string, opts?: { take?: number; cursor?: string }) => {
    const qs = new URLSearchParams();
    if (opts?.take) qs.set("take", String(opts.take));
    if (opts?.cursor) qs.set("cursor", opts.cursor);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<GalleryPage>(
      `/events/${encodeURIComponent(idOrSlug)}/gallery${suffix}`,
    );
  },

  search: (idOrSlug: string, q: string) =>
    request<{ query: string; count?: number; photos: Photo[]; note?: string }>(
      `/events/${encodeURIComponent(idOrSlug)}/search?q=${encodeURIComponent(q)}`,
    ),

  uploadPhotos: (
    idOrSlug: string,
    files: File[],
    meta: {
      memberId: string;
      lat?: number;
      lng?: number;
      takenAt?: string;
      isVideo?: boolean;
    },
  ) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    form.append("memberId", meta.memberId);
    if (meta.lat != null) form.append("lat", String(meta.lat));
    if (meta.lng != null) form.append("lng", String(meta.lng));
    if (meta.takenAt) form.append("takenAt", meta.takenAt);
    if (meta.isVideo != null) form.append("isVideo", String(meta.isVideo));
    return request<{ uploaded: number }>(
      `/events/${encodeURIComponent(idOrSlug)}/photos`,
      { method: "POST", body: form },
    );
  },

  findMe: (idOrSlug: string, selfie: File, memberId: string) => {
    const form = new FormData();
    form.append("selfie", selfie);
    form.append("memberId", memberId);
    return request<FindMeResult>(
      `/events/${encodeURIComponent(idOrSlug)}/find-me`,
      { method: "POST", body: form },
    );
  },
};

export { ApiError };
