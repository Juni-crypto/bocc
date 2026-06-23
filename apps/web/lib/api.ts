// Typed client for the BOCC backend-for-frontend (NestJS).
//
// Base URL comes from NEXT_PUBLIC_API_URL, defaulting to the local BFF. The
// frontend never talks to Immich directly - everything is proxied here.

import type {
  BoccEvent,
  CreateEventDto,
  EventStats,
  FindMeResult,
  GalleryPage,
  JoinResult,
  ModerationQueue,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000/api";

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
  // ---- host: create & manage ----
  createEvent: (dto: CreateEventDto) =>
    request<BoccEvent>("/events", { method: "POST", json: dto }),

  getEvent: (idOrSlug: string) =>
    request<BoccEvent>(`/events/${encodeURIComponent(idOrSlug)}`),

  updateEvent: (id: string, dto: Partial<CreateEventDto>) =>
    request<BoccEvent>(`/events/${encodeURIComponent(id)}`, {
      method: "PATCH",
      json: dto,
    }),

  goLive: (id: string) =>
    request<BoccEvent>(`/events/${encodeURIComponent(id)}/go-live`, {
      method: "POST",
    }),

  stats: (id: string) =>
    request<EventStats>(`/events/${encodeURIComponent(id)}/stats`),

  moderation: (id: string) =>
    request<ModerationQueue>(`/events/${encodeURIComponent(id)}/moderation`),

  moderate: (id: string, photoId: string, decision: "approve" | "reject") =>
    request<unknown>(
      `/events/${encodeURIComponent(id)}/moderation/${encodeURIComponent(
        photoId,
      )}/${decision}`,
      { method: "POST" },
    ),

  // ---- guests ----
  join: (
    idOrSlug: string,
    body: { name?: string; consentFaceMatch?: boolean },
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
